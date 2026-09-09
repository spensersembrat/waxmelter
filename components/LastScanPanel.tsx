"use client";

import { relativeTime } from "@/lib/format";
import type { ScanRun } from "@/lib/types";

export function LastScanPanel({ scans }: { scans: ScanRun[] }) {
  if (!scans.length) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-white/10 bg-panel/40 px-6 py-16 text-center backdrop-blur-xl">
        <p className="font-display text-2xl">No scans yet</p>
        <p className="mt-2 text-sm text-mute">Run Scan now. The result will show up here even if nothing beats Card Ladder.</p>
      </div>
    );
  }

  const [latest, ...older] = scans;

  return (
    <div className="mt-6 space-y-3">
      <article className="rounded-3xl border border-white/10 bg-panel/70 p-5 backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.16em] text-wax">
          {latest.ok ? "Scan finished" : "Scan did not finish"}
        </p>
        <p className="mt-2 font-display text-2xl tracking-tight text-ink">
          {latest.new_alerts === 0 ? "No deals this time" : `${latest.new_alerts} new alert${latest.new_alerts === 1 ? "" : "s"}`}
        </p>
        <p className="mt-2 text-sm text-mute">
          {relativeTime(latest.created_at)}
          {latest.watch_name ? ` · ${latest.watch_name}` : ""}
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Listings checked" value={String(latest.listings_checked)} />
          <Stat label="Watches" value={String(latest.scanned_watches)} />
          <Stat label="Parse credits" value={String(latest.parse_credits)} />
        </dl>
        {latest.new_alerts === 0 && latest.ok ? (
          <p className="mt-4 text-sm text-mute">
            eBay was searched and Card Ladder was compared. Nothing was 30% under CL.
          </p>
        ) : null}
        {latest.errors.length ? (
          <p className="mt-4 text-sm text-warn">{latest.errors.join(" ")}</p>
        ) : null}
      </article>
      {older.length ? (
        <ul className="space-y-2">
          {older.map((run) => (
            <li
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-panel/40 px-4 py-3 text-sm"
            >
              <span className="text-ink">{relativeTime(run.created_at)}</span>
              <span className="text-mute">
                {run.listings_checked} listings · {run.new_alerts} alerts · {run.parse_credits} credits
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-1 font-display text-xl tracking-tight text-ink">{value}</p>
    </div>
  );
}
