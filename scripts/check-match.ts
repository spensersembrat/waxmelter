import { cardMatchesListing, clBeatsEbay, queryFromWatch, titleMatches } from "../lib/match";
import { looksLikeAuction, moneyAmounts } from "../lib/parse-ebay";
import type { Watch } from "../lib/types";

const orange: Pick<Watch, "name" | "must_include"> = {
  name: "Topps Chrome Update Orange",
  must_include: ["Topps", "Chrome", "Update", "Orange"],
};

const pass = titleMatches("2024 Topps Chrome Update Elly Orange Refractor", orange);
const failMissing = titleMatches("2024 Topps Chrome Update Elly Refractor", orange);
const query = queryFromWatch(orange);

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

if (!pass || failMissing || query !== "Topps Chrome Update Orange") {
  throw new Error(`match checks failed pass=${pass} failMissing=${failMissing} query=${query}`);
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
