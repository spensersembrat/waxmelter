import type { Watch } from "./types";

const STOP = new Set([
  "the",
  "of",
  "and",
  "or",
  "rc",
  "sp",
  "ssp",
  "card",
  "gem",
  "mint",
  "nm",
  "lp",
  "fs",
  "ft",
  "refractor",
  "parallel",
  "base",
  "variation",
  "auto",
  "autograph",
  "hobby",
  "retail",
  "baseball",
  "football",
  "basketball",
  "soccer",
  "numbered",
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function listingCacheKey(watchId: string, title: string): string {
  return `${watchId}:${normalize(title)}`;
}

export function gradeFromTitle(title: string): string | null {
  const match = normalize(title).match(/\b(psa|bgs|sgc|cgc)\s*(\d+(?:\.\d+)?)/);
  return match ? `${match[1]} ${match[2]}` : null;
}

function listingTokens(value: string): string[] {
  return normalize(value)
    .replace(/[#/]/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function isGradeToken(token: string): boolean {
  if (["psa", "bgs", "sgc", "cgc"].includes(token)) return true;
  const asNumber = Number(token);
  return token.length <= 3 && Number.isFinite(asNumber) && asNumber <= 10;
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

export function cardMatchesListing(
  label: string,
  condition: string | undefined,
  listingTitle: string,
  watch: Pick<Watch, "must_include" | "must_exclude" | "year">,
): boolean {
  if (!titleMatches(label, watch)) return false;

  const listingGrade = gradeFromTitle(listingTitle);
  const cardGrade = gradeFromTitle(`${condition ?? ""} ${label}`);
  if (listingGrade) {
    if (cardGrade !== listingGrade) return false;
  } else if (cardGrade) {
    return false;
  }

  const watchTokens = new Set([
    ...watch.must_include.flatMap((item) => listingTokens(item)),
    ...(watch.year ? [String(watch.year)] : []),
  ]);
  const extra = listingTokens(listingTitle).filter((token) => !watchTokens.has(token) && !isGradeToken(token));
  const nameLike = extra.filter((token) => !/^\d+$/.test(token));
  const needed = nameLike.length ? nameLike : extra;
  if (!needed.length) return true;

  const cardTokens = new Set(listingTokens(`${condition ?? ""} ${label}`));
  const hits = needed.filter((token) => cardTokens.has(token)).length;
  return hits / needed.length >= 0.5;
}

export function clBeatsEbay(clValue: number, liveTotal: number, higherPct: number): boolean {
  return clValue >= liveTotal * (1 + higherPct / 100);
}

export const CARD_LADDER_SEARCH_URL = "https://www.cardladder.com/search";

export function cardLadderSearchUrl(query: string): string {
  return `${CARD_LADDER_SEARCH_URL}?q=${encodeURIComponent(query)}`;
}

export function cardLadderCardUrl(slug: string): string {
  return `https://www.cardladder.com/cards/${encodeURIComponent(slug)}`;
}

export function isSampleComps(sourceUrl: string | null | undefined): boolean {
  if (!sourceUrl) return false;
  return (
    sourceUrl === "sample" ||
    sourceUrl.includes("130point.com") ||
    sourceUrl.includes("?search=")
  );
}
