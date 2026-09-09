"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CardLadderLink } from "@/components/CardLadderLink";
import { cardLadderSearchUrl, isSampleComps, queryFromWatch } from "@/lib/match";
import { money, relativeTime } from "@/lib/format";
import type { Watch, WatchComps } from "@/lib/types";

type CompRow = {
  watch: Watch;
  comps: WatchComps | null;
};

export function CompsView() {
  const [rows, setRows] = useState<CompRow[]>([]);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/comps");
    const json = (await response.json()) as { rows?: CompRow[]; error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Could not load comps.");
      setRows([]);
      return;
    }
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function fetchComps(watchId: string) {
    setFetchingId(watchId);
    setMessage("");
    const response = await fetch("/api/comps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchId }),
    });
    const json = (await response.json()) as { error?: string; status?: string };
    setFetchingId(null);
    if (!response.ok) {
      setMessage(json.error ?? "Could not fetch Card Ladder.");
      return;
    }
    if (json.status === "unavailable") {
      setMessage("No matching Card Ladder card for that watch query.");
    }
    await load();
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Card Ladder</h2>
          <p className="mt-1 text-sm text-mute">
            CL value from Parse.bot. Each eBay BIN is compared to that listing's card, not one number for the whole search.
          </p>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-mute">{message}</p> : null}

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-xl">No watches</p>
          <p className="mt-2 text-sm text-mute">Add a watch first, then fetch Card Ladder comps.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map(({ watch, comps }) => {
            const sample = isSampleComps(comps?.source_url);
            const query = queryFromWatch(watch);
            const href = !sample && comps?.source_url ? comps.source_url : cardLadderSearchUrl(query);
            return (
              <li key={watch.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-ink">{watch.name}</p>
                    <p className="mt-1 text-sm text-mute">{query || "No query"}</p>
                    {sample ? (
                      <p className="mt-2 text-xs text-warn">Sample numbers — not from Card Ladder</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchComps(watch.id)}
                    disabled={fetchingId === watch.id}
                    className="rounded-lg border border-line px-3 py-2 text-sm text-ink disabled:opacity-50"
                  >
                    {fetchingId === watch.id ? "Fetching…" : "Fetch comps"}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Stat label="CL value" value={sample ? "—" : money(comps?.median)} />
                  <Stat label="Sales" value={sample ? "—" : String(comps?.sale_count ?? 0)} />
                  <Stat
                    label="Fetched"
                    value={sample ? "Not from Card Ladder" : relativeTime(comps?.fetched_at)}
                  />
                </div>

                <CardLadderLink href={href} />

                {!sample && comps?.samples?.length ? (
                  <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {comps.samples.map((row, index) => (
                      <li key={`${row.title}-${index}`} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
                        <span className="text-ink">{row.title}</span>
                        <span className="shrink-0 tabular-nums text-mute">{money(row.price)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-mute">
                    {sample ? "Fetch comps to pull the Card Ladder value." : "No sold samples stored yet."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel-2 px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-mute">{label}</p>
      <p className="mt-1 font-display text-xl text-ink">{value}</p>
    </div>
  );
}
