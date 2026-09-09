import { cardLadderCardUrl, cardLadderSearchUrl, cardMatchesListing, titleMatches } from "./match";
import type { CompSample, Watch } from "./types";

const COMP_TTL_MS = 24 * 60 * 60 * 1000;
const PARSE_BASE = "https://api.parse.bot/scraper/97d5f4bc-6c65-4546-8f71-76149a5533cb";

export type CompResult = {
  median: number | null;
  sale_count: number;
  samples: CompSample[];
  source_url: string;
  status: "ok" | "unavailable";
};

type LadderCard = {
  id: string;
  label: string;
  slug?: string;
  year?: string;
  condition?: string;
  current_value?: number | null;
  market_value?: number | null;
  num_sales?: number | null;
};

export function hasCardLadder(): boolean {
  return Boolean(process.env.PARSE_API_KEY?.trim());
}

export function compsAreFresh(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < COMP_TTL_MS;
}

function unwrap(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;
  if (root.data && typeof root.data === "object") return root.data as Record<string, unknown>;
  return root;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

async function parseGet(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const key = process.env.PARSE_API_KEY;
  if (!key) throw new Error("PARSE_API_KEY is not set. Add it from parse.bot.");

  const url = new URL(`${PARSE_BASE}/${endpoint}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

  const response = await fetch(url, {
    headers: { "X-API-Key": key, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Card Ladder ${endpoint} failed (${response.status}): ${text.slice(0, 200)}`);
  }
  try {
    return unwrap(JSON.parse(text));
  } catch {
    throw new Error(`Card Ladder ${endpoint} returned non-JSON.`);
  }
}

function pickCard(cards: LadderCard[], watch: Watch, forTitle?: string): LadderCard | null {
  const matched = cards.filter((card) =>
    forTitle
      ? cardMatchesListing(card.label, card.condition, forTitle, watch)
      : titleMatches(card.label, watch),
  );
  if (!matched.length) return null;

  const wantsPsa10 = watch.must_include.some((token) => token.toLowerCase().includes("psa 10"));
  if (wantsPsa10) {
    const psa10 = matched.find((card) => (card.condition ?? card.label).toLowerCase().includes("psa 10"));
    if (psa10) return psa10;
  }
  return matched[0];
}

function parseCards(payload: Record<string, unknown>): LadderCard[] {
  const raw = payload.cards;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const card = item as Record<string, unknown>;
    const id = String(card.id ?? "");
    const label = String(card.label ?? card.name ?? "");
    if (!id || !label) return [];
    return [
      {
        id,
        label,
        slug: typeof card.slug === "string" ? card.slug : undefined,
        year: card.year != null ? String(card.year) : undefined,
        condition: typeof card.condition === "string" ? card.condition : undefined,
        current_value: asNumber(card.current_value),
        market_value: asNumber(card.market_value),
        num_sales: asNumber(card.num_sales) ?? 0,
      },
    ];
  });
}

function parseSales(payload: Record<string, unknown>, fallbackTitle: string): CompSample[] {
  const lists = [payload.sales, payload.items, payload.results, payload.records];
  const samples: CompSample[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const sale = raw as Record<string, unknown>;
      const price = asNumber(sale.price ?? sale.soldPrice ?? sale.amount);
      if (price == null) continue;
      samples.push({
        title: String(
          sale.title ?? sale.listingTitle ?? sale.listing_title ?? sale.label ?? fallbackTitle,
        ),
        price,
        soldAt: typeof sale.date === "string" ? sale.date : typeof sale.soldAt === "string" ? sale.soldAt : null,
      });
    }
  }
  return samples.slice(0, 8);
}

export async function fetchCardLadderComps(
  watch: Watch,
  query: string,
  options: { includeSales?: boolean; forTitle?: string } = {},
): Promise<CompResult> {
  const searchUrl = cardLadderSearchUrl(query);
  if (!hasCardLadder()) {
    return { median: null, sale_count: 0, samples: [], source_url: searchUrl, status: "unavailable" };
  }

  try {
    const search = await parseGet("search_cards", {
      query,
      limit: "8",
      sort: "score",
      page: "0",
    });
    const card = pickCard(parseCards(search), watch, options.forTitle);
    if (!card) {
      return { median: null, sale_count: 0, samples: [], source_url: searchUrl, status: "unavailable" };
    }

    const median = card.current_value ?? card.market_value ?? null;
    const source_url = card.slug ? cardLadderCardUrl(card.slug) : searchUrl;
    let samples: CompSample[] = [];

    if (options.includeSales) {
      try {
        const sales = await parseGet("get_card_sales_detail", {
          card_id: card.id,
          limit: "8",
          page: "0",
        });
        samples = parseSales(sales, card.label);
      } catch {
        samples = [];
      }
    }

    if (!samples.length && median != null) {
      samples = [{ title: card.label, price: median, soldAt: null }];
    }

    return {
      median,
      sale_count: card.num_sales ?? samples.length,
      samples,
      source_url,
      status: median != null ? "ok" : "unavailable",
    };
  } catch (error) {
    if (options.includeSales) throw error;
    return { median: null, sale_count: 0, samples: [], source_url: searchUrl, status: "unavailable" };
  }
}
