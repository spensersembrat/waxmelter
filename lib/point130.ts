import { point130SearchUrl, titleMatches } from "./match";
import type { CompSample, Watch } from "./types";

const COMP_TTL_MS = 8 * 60 * 60 * 1000;

export type CompResult = {
  median: number | null;
  sale_count: number;
  samples: CompSample[];
  source_url: string;
  status: "ok" | "unavailable";
};

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function trimOutliers(values: number[]): number[] {
  if (values.length < 6) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const drop = Math.max(1, Math.floor(sorted.length * 0.1));
  return sorted.slice(drop, sorted.length - drop);
}

function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function extractFromHtml(html: string, watch: Watch): CompSample[] {
  const samples: CompSample[] = [];
  const rowRe =
    /<tr[\s\S]*?<\/tr>|<div[^>]*class="[^"]*(?:sale|result|item)[^"]*"[\s\S]*?<\/div>/gi;
  const chunks = html.match(rowRe) ?? [html];

  for (const chunk of chunks) {
    const titleMatch =
      chunk.match(/<a[^>]*>([^<]{12,180})<\/a>/i) ||
      chunk.match(/title="([^"]{12,180})"/i);
    const priceMatch =
      chunk.match(/best\s*offer[^$]*\$[\s]*([0-9,]+\.?[0-9]*)/i) ||
      chunk.match(/sold[^$]*\$[\s]*([0-9,]+\.?[0-9]*)/i) ||
      chunk.match(/\$[\s]*([0-9,]+\.?[0-9]*)/);
    if (!titleMatch || !priceMatch) continue;
    const title = decodeEntities(titleMatch[1]).trim();
    const price = parseMoney(priceMatch[1]);
    if (!price || !titleMatches(title, watch)) continue;
    samples.push({ title, price, soldAt: null });
  }

  if (samples.length) return samples;

  const globalPrice = [...html.matchAll(/\$[\s]*([0-9,]+\.[0-9]{2})/g)]
    .map((match) => parseMoney(match[1]))
    .filter((value): value is number => value != null && value >= 5 && value <= 5000);
  return globalPrice.slice(0, 30).map((price) => ({
    title: queryLabel(watch),
    price,
    soldAt: null,
  }));
}

function queryLabel(watch: Watch): string {
  return [watch.year, ...watch.must_include].filter(Boolean).join(" ");
}

function extractFromJson(payload: unknown, watch: Watch): CompSample[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const lists = [root.items, root.results, root.sales, root.data, payload];
  const samples: CompSample[] = [];

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const title = String(item.title ?? item.name ?? item.itemTitle ?? "");
      const priceRaw = item.soldPrice ?? item.price ?? item.bestOffer ?? item.amount;
      const price = typeof priceRaw === "number" ? priceRaw : parseMoney(String(priceRaw ?? ""));
      if (!title || price == null || !titleMatches(title, watch)) continue;
      samples.push({
        title,
        price,
        soldAt: typeof item.date === "string" ? item.date : typeof item.soldDate === "string" ? item.soldDate : null,
      });
    }
  }
  return samples;
}

export function compsAreFresh(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < COMP_TTL_MS;
}

export async function fetchPoint130Comps(watch: Watch, query: string): Promise<CompResult> {
  const source_url = point130SearchUrl(query);
  try {
    const body = new URLSearchParams({
      search: query,
      q: query,
      query,
    });

    const response = await fetch("https://130point.com/sales/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body,
      redirect: "follow",
    });

    if (!response.ok) {
      return { median: null, sale_count: 0, samples: [], source_url, status: "unavailable" };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    if (text.includes("Just a moment") || text.includes("cf-browser-verification")) {
      return { median: null, sale_count: 0, samples: [], source_url, status: "unavailable" };
    }

    let samples: CompSample[] = [];
    if (contentType.includes("json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      try {
        samples = extractFromJson(JSON.parse(text), watch);
      } catch {
        samples = extractFromHtml(text, watch);
      }
    } else {
      samples = extractFromHtml(text, watch);
    }

    const priced = trimOutliers(samples.map((sample) => sample.price));
    return {
      median: median(priced),
      sale_count: priced.length,
      samples: samples.slice(0, 8),
      source_url,
      status: priced.length ? "ok" : "unavailable",
    };
  } catch {
    return { median: null, sale_count: 0, samples: [], source_url, status: "unavailable" };
  }
}
