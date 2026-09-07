import type { Watch } from "./types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function queryFromWatch(watch: Pick<Watch, "must_include" | "year">): string {
  const parts = [...watch.must_include];
  if (watch.year) parts.unshift(String(watch.year));
  return parts.join(" ").trim();
}

export function titleMatches(
  title: string,
  watch: Pick<Watch, "must_include" | "must_exclude" | "year">,
): boolean {
  const haystack = normalize(title);
  if (watch.year && !haystack.includes(String(watch.year))) return false;

  for (const token of watch.must_include) {
    if (!haystack.includes(normalize(token))) return false;
  }

  for (const token of watch.must_exclude) {
    if (token.trim() && haystack.includes(normalize(token))) return false;
  }

  return true;
}

export const POINT130_SALES_URL = "https://130point.com/sales/";

export function point130SearchUrl(_query: string): string {
  return POINT130_SALES_URL;
}

export function isSampleComps(sourceUrl: string | null | undefined): boolean {
  if (!sourceUrl) return false;
  return sourceUrl === "sample" || sourceUrl.includes("?search=") || sourceUrl.includes("?q=");
}
