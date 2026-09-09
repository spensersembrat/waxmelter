import type { EbayListing } from "./ebay";
import { hasCardLadder } from "./cardladder";

const PARSE_EBAY_BASE = "https://api.parse.bot/scraper/caa8e1ad-f5a8-41c1-9bd2-54a8e19b6c35";
const CATEGORY_SINGLES = "261328";

export function hasParseEbay(): boolean {
  return hasCardLadder();
}

function unwrap(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;
  if (root.data && typeof root.data === "object") return root.data as Record<string, unknown>;
  return root;
}

export function moneyAmounts(value: unknown): number[] {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return [value];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.value != null) return moneyAmounts(record.value);
    if (record.amount != null) return moneyAmounts(record.amount);
  }
  if (typeof value !== "string") return [];
  const matches = value.match(/[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?/g) ?? [];
  return matches
    .map((item) => Number(item.replace(/,/g, "")))
    .filter((item) => Number.isFinite(item) && item >= 0);
}

export function looksLikeAuction(raw: Record<string, unknown>): boolean {
  const blob = [
    raw.buying,
    raw.buying_format,
    raw.listing_format,
    raw.listingType,
    raw.type,
    raw.format,
    raw.condition,
    raw.shipping,
    raw.bids,
    raw.bid_count,
  ]
    .map((item) => String(item ?? "").toLowerCase())
    .join(" ");
  if (/\bbuy[\s_-]*it[\s_-]*now\b|\bbin\b|\bfixed[\s_-]*price\b/.test(blob)) return false;
  if (typeof raw.bids === "number" && raw.bids > 0) return true;
  if (typeof raw.bid_count === "number" && raw.bid_count > 0) return true;
  return /\b(auction|bids?|bidding|current bid)\b/.test(blob);
}

function listingFromRaw(raw: Record<string, unknown>, maxPrice: number): EbayListing | null {
  const title = String(raw.title ?? raw.name ?? "").trim();
  const itemId = String(raw.item_id ?? raw.itemId ?? raw.id ?? "").trim();
  const url = String(raw.url ?? raw.itemWebUrl ?? raw.link ?? "").trim();
  if (!title || !itemId) return null;

  const price = moneyAmounts(raw.price)[0];
  if (price == null || price <= 0) return null;
  if (price > maxPrice) return null;

  const shippingAmounts = moneyAmounts(raw.shipping);
  const shippingText = String(raw.shipping ?? "").toLowerCase();
  let shipping = 0;
  if (/free/.test(shippingText)) shipping = 0;
  else if (shippingAmounts[0] != null && shippingAmounts[0] !== price) shipping = shippingAmounts[0];

  const hasAuction = looksLikeAuction(raw);
  const image = raw.image ?? raw.image_url ?? raw.thumbnail;
  const imageUrl =
    typeof image === "string"
      ? image
      : image && typeof image === "object" && "imageUrl" in image
        ? String((image as { imageUrl?: string }).imageUrl ?? "")
        : "";

  return {
    itemId,
    title,
    price,
    shipping,
    buying: hasAuction ? "AUCTION" : "FIXED_PRICE",
    hasAuction,
    endsAt: typeof raw.ends_at === "string" ? raw.ends_at : typeof raw.end_date === "string" ? raw.end_date : null,
    imageUrl: imageUrl || null,
    url: url || `https://www.ebay.com/itm/${itemId}`,
    sellerFeedback: moneyAmounts(raw.seller_feedback ?? raw.feedback)[0] ?? null,
  };
}

export async function searchParseEbayListings(options: {
  query: string;
  maxPrice?: number | null;
}): Promise<EbayListing[]> {
  const key = process.env.PARSE_API_KEY;
  if (!key) throw new Error("PARSE_API_KEY is not set. Add it from parse.bot.");

  const max = options.maxPrice && options.maxPrice > 0 ? options.maxPrice : 100;
  const url = new URL(`${PARSE_EBAY_BASE}/search_listings`);
  url.searchParams.set("query", options.query);
  url.searchParams.set("category_id", CATEGORY_SINGLES);
  url.searchParams.set("sold", "false");
  url.searchParams.set("complete", "false");
  url.searchParams.set("graded", "false");
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: { "X-API-Key": key, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Parse eBay search failed (${response.status}): ${text.slice(0, 200)}`);
  }

  let payload: Record<string, unknown>;
  try {
    payload = unwrap(JSON.parse(text));
  } catch {
    throw new Error("Parse eBay search returned non-JSON.");
  }

  const rawList = [payload.listings, payload.items, payload.results].find(Array.isArray) ?? [];
  return rawList.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const listing = listingFromRaw(item as Record<string, unknown>, max);
    return listing ? [listing] : [];
  });
}
