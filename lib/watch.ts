import type { WatchInput } from "./types";

export const DEFAULT_WATCH_PHRASE = "Topps Chrome Update Orange";
export const ALERT_CL_HIGHER_PCT = 30;

export function phraseToTokens(phrase: string): string[] {
  return phrase
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function watchFromPhrase(phrase: string, enabled = true): WatchInput {
  const name = phrase.trim();
  return {
    name,
    must_include: phraseToTokens(name),
    must_exclude: [],
    year: null,
    max_price: null,
    alert_below_pct: ALERT_CL_HIGHER_PCT,
    buying: ["FIXED_PRICE"],
    enabled,
  };
}
