import { hasOfficialEbay, searchOfficialEbayListings } from "./ebay";
import { hasParseEbay, searchParseEbayListings } from "./parse-ebay";
import { clBeatsEbay, listingCacheKey, queryFromWatch, titleMatches } from "./match";
import { compsAreFresh, fetchCardLadderComps } from "./cardladder";
import {
  getClCache,
  getWatch,
  insertAlert,
  listWatches,
  updateWatch,
  upsertClCache,
} from "./store";
import type { ClCacheRow, Watch } from "./types";

const MAX_NEW_CL_LOOKUPS = 6;
const PARSE_EBAY_CREDITS = 10;

export type ScanResult = {
  scannedWatches: number;
  listingsChecked: number;
  newAlerts: number;
  ebayReady: boolean;
  ebaySource: "official" | "parse" | "none";
  parseCredits: { ebaySearches: number; clLookups: number; estimated: number };
  errors: string[];
};

async function compsForListing(
  watch: Watch,
  listingTitle: string,
  budget: { left: number },
  credits: { clLookups: number },
): Promise<ClCacheRow | null> {
  const query_key = listingCacheKey(watch.id, listingTitle);
  const cached = await getClCache(query_key);
  if (cached && compsAreFresh(cached.fetched_at)) return cached;
  if (budget.left <= 0) return cached ?? null;

  budget.left -= 1;
  credits.clLookups += 1;
  const fresh = await fetchCardLadderComps(watch, listingTitle, { forTitle: listingTitle });
  const row: ClCacheRow = {
    query_key,
    median: fresh.median,
    sale_count: fresh.sale_count,
    samples: fresh.samples,
    source_url: fresh.source_url,
    fetched_at: new Date().toISOString(),
    status: fresh.status,
  };
  await upsertClCache(row);
  return row;
}

export async function runScan(options: { parseEbay?: boolean; watchId?: string } = {}): Promise<ScanResult> {
  const errors: string[] = [];
  const official = hasOfficialEbay();
  const parseEbay = Boolean(options.parseEbay) && hasParseEbay();
  const ebaySource = official ? "official" : parseEbay ? "parse" : "none";
  const parseCredits = { ebaySearches: 0, clLookups: 0 };
  let listingsChecked = 0;
  let newAlerts = 0;

  const watches = options.watchId
    ? [await getWatch(options.watchId)].filter((watch): watch is Watch => Boolean(watch))
    : (await listWatches()).filter((watch) => watch.enabled);

  if (options.watchId && watches.length === 0) {
    errors.push("Watch not found.");
  }

  if (ebaySource === "none") {
    return {
      scannedWatches: watches.length,
      listingsChecked: 0,
      newAlerts: 0,
      ebayReady: false,
      ebaySource,
      parseCredits: { ebaySearches: 0, clLookups: 0, estimated: 0 },
      errors: [
        official || parseEbay
          ? "eBay search is not available."
          : "Add PARSE_API_KEY for a manual Parse eBay scan, or official eBay keys when you have them.",
      ],
    };
  }

  for (const watch of watches) {
    const query = queryFromWatch(watch);
    if (!query) continue;

    try {
      const listings = official
        ? await searchOfficialEbayListings({
            query,
            maxPrice: watch.max_price,
            buying: watch.buying,
          })
        : await searchParseEbayListings({
            query,
            maxPrice: watch.max_price,
          });
      if (!official) parseCredits.ebaySearches += 1;
      listingsChecked += listings.length;
      const budget = { left: MAX_NEW_CL_LOOKUPS };
      let lastCl: number | null = null;
      let lastCount: number | null = null;

      for (const listing of listings) {
        if (!titleMatches(listing.title, watch)) continue;
        if (watch.buying.length && !watch.buying.includes(listing.buying)) continue;
        if (!watch.buying.includes("AUCTION") && listing.hasAuction) continue;

        const comps = await compsForListing(watch, listing.title, budget, parseCredits);
        if (comps?.median == null) continue;

        lastCl = comps.median;
        lastCount = comps.sale_count;

        const liveTotal = listing.price + listing.shipping;
        if (!clBeatsEbay(comps.median, liveTotal, watch.alert_below_pct)) continue;

        const created = await insertAlert({
          watch_id: watch.id,
          item_id: listing.itemId,
          title: listing.title,
          image_url: listing.imageUrl,
          live_price: listing.price,
          shipping: listing.shipping,
          live_total: liveTotal,
          median: comps.median,
          comp_count: comps.sale_count,
          pct_of_median: (liveTotal / comps.median) * 100,
          buying: listing.buying,
          ends_at: listing.endsAt,
          ebay_url: listing.url,
          point130_url: comps.source_url,
          seller_feedback: listing.sellerFeedback,
          seen: false,
          comp_status: comps.status,
        });
        if (created) newAlerts += 1;
      }

      await updateWatch(watch.id, {
        last_median: lastCl,
        last_comp_count: lastCount,
        last_scanned_at: new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`${watch.name}: ${error instanceof Error ? error.message : "scan failed"}`);
    }
  }

  return {
    scannedWatches: watches.length,
    listingsChecked,
    newAlerts,
    ebayReady: true,
    ebaySource,
    parseCredits: {
      ebaySearches: parseCredits.ebaySearches,
      clLookups: parseCredits.clLookups,
      estimated: parseCreditEstimate(ebaySource === "parse" ? parseCredits.ebaySearches : 0, parseCredits.clLookups),
    },
    errors,
  };
}

export function parseCreditEstimate(ebaySearches: number, clLookups: number): number {
  return ebaySearches * PARSE_EBAY_CREDITS + clLookups;
}
