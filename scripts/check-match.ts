import { titleMatches, queryFromWatch } from "../lib/match";
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

if (!pass || failLot || failYear || query !== "2023 Mahomes Prizm PSA 10") {
  throw new Error(
    `match checks failed pass=${pass} failLot=${failLot} failYear=${failYear} query=${query}`,
  );
}

console.log("match checks ok");
