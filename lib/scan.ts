import { hasEbay, searchEbayListings } from "./ebay";
import { queryFromWatch, titleMatches } from "./match";
import { compsAreFresh, fetchPoint130Comps } from "./point130";
import {
  getWatchComps,
  insertAlert,
  listWatches,
  updateWatch,
  upsertWatchComps,
} from "./store";
import type { Watch } from "./types";

export type ScanResult = {
  scannedWatches: number;
  listingsChecked: number;
  newAlerts: number;
  ebayReady: boolean;
  errors: string[];
};

async function compsForWatch(watch: Watch, query: string) {
  const cached = await getWatchComps(watch.id);
  if (cached && compsAreFresh(cached.fetched_at) && cached.median != null) {
    return {
      median: cached.median,
      sale_count: cached.sale_count,
      source_url: cached.source_url,
      status: "ok" as const,
    };
  }

  const fresh = await fetchPoint130Comps(watch, query);
  await upsertWatchComps({
    watch_id: watch.id,
    median: fresh.median,
    sale_count: fresh.sale_count,
    samples: fresh.samples,
    source_url: fresh.source_url,
    fetched_at: new Date().toISOString(),
  });
  return fresh;
}

export async function runScan(): Promise<ScanResult> {
  const errors: string[] = [];
  const ebayReady = hasEbay();
  let listingsChecked = 0;
  let newAlerts = 0;

  const watches = (await listWatches()).filter((watch) => watch.enabled);
  if (!ebayReady) {
    return {
      scannedWatches: watches.length,
      listingsChecked: 0,
      newAlerts: 0,
      ebayReady: false,
      errors: ["eBay keys are not configured yet. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET after the developer account is approved."],
    };
  }

  for (const watch of watches) {
    const query = queryFromWatch(watch);
    if (!query) continue;

    try {
      const comps = await compsForWatch(watch, query);
      const listings = await searchEbayListings({
        query,
        maxPrice: watch.max_price,
        buying: watch.buying,
      });
      listingsChecked += listings.length;

      for (const listing of listings) {
        if (!titleMatches(listing.title, watch)) continue;
        if (watch.buying.length && !watch.buying.includes(listing.buying)) continue;

        const liveTotal = listing.price + listing.shipping;
        const threshold =
          comps.median != null ? comps.median * (watch.alert_below_pct / 100) : null;
        if (threshold == null) {
          const created = await insertAlert({
            watch_id: watch.id,
            item_id: listing.itemId,
            title: listing.title,
            image_url: listing.imageUrl,
            live_price: listing.price,
            shipping: listing.shipping,
            live_total: liveTotal,
            median: null,
            comp_count: comps.sale_count,
            pct_of_median: null,
            buying: listing.buying,
            ends_at: listing.endsAt,
            ebay_url: listing.url,
            point130_url: comps.source_url,
            seller_feedback: listing.sellerFeedback,
            seen: false,
            comp_status: "unavailable",
          });
          if (created) newAlerts += 1;
          continue;
        }

        if (liveTotal > threshold) continue;

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
          pct_of_median: comps.median ? (liveTotal / comps.median) * 100 : null,
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
        last_median: comps.median,
        last_comp_count: comps.sale_count,
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
    ebayReady,
    errors,
  };
}
