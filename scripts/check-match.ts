import { cardMatchesListing, clBeatsEbay, queryFromWatch, titleMatches } from "../lib/match";
import { looksLikeAuction, moneyAmounts } from "../lib/parse-ebay";
import type { Watch } from "../lib/types";

const watch: Pick<Watch, "must_include" | "must_exclude" | "year"> = {
  must_include: ["Mahomes", "Prizm", "PSA 10"],
  must_exclude: ["lot", "optic"],
  year: 2023,
};

const pass = titleMatches("2023 Panini Prizm Patrick Mahomes PSA 10", watch);
const failLot = titleMatches("2023 Prizm Mahomes PSA 10 lot of 3", watch);
const failYear = titleMatches("2022 Prizm Mahomes PSA 10", watch);
const query = queryFromWatch(watch);

const orange: Pick<Watch, "must_include" | "must_exclude" | "year"> = {
  must_include: ["Topps", "Chrome", "Update", "Orange"],
  must_exclude: ["lot", "reprint", "digital"],
  year: null,
};

const samePlayer = cardMatchesListing(
  "2024 Topps Chrome Update Elly De La Cruz Orange Refractor #1 PSA 10",
  "PSA 10",
  "2024 Topps Chrome Update Elly De La Cruz Orange Refractor PSA 10",
  orange,
);
const wrongPlayer = cardMatchesListing(
  "2024 Topps Chrome Update Elly De La Cruz Orange Refractor #1 PSA 10",
  "PSA 10",
  "2024 Topps Chrome Update Shohei Ohtani Orange Refractor PSA 10",
  orange,
);
const rawVsPsa = cardMatchesListing(
  "2024 Topps Chrome Update Elly De La Cruz Orange Refractor #1 PSA 10",
  "PSA 10",
  "2024 Topps Chrome Update Elly De La Cruz Orange Refractor raw",
  orange,
);
const deal = clBeatsEbay(130, 100, 30);
const noDeal = clBeatsEbay(129, 100, 30);

if (!pass || failLot || failYear || query !== "2023 Mahomes Prizm PSA 10") {
  throw new Error(
    `match checks failed pass=${pass} failLot=${failLot} failYear=${failYear} query=${query}`,
  );
}

if (!samePlayer || wrongPlayer || rawVsPsa || !deal || noDeal) {
  throw new Error(
    `listing/CL checks failed samePlayer=${samePlayer} wrongPlayer=${wrongPlayer} rawVsPsa=${rawVsPsa} deal=${deal} noDeal=${noDeal}`,
  );
}

if (moneyAmounts("$12.50")[0] !== 12.5) throw new Error("moneyAmounts price");
if (looksLikeAuction({ buying_format: "auction" }) !== true) throw new Error("auction detect");
if (looksLikeAuction({ buying_format: "Buy It Now" }) !== false) throw new Error("bin detect");

console.log("match checks ok");
