"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { money, relativeTime, scanCountdown, timeLeft } from "@/lib/format";
import type { Alert, Watch } from "@/lib/types";

type Filter = "all" | "unread" | "bin" | "auction";

export function AlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [watchId, setWatchId] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [nextScan, setNextScan] = useState(() => scanCountdown());

  async function load() {
    const [alertsRes, watchesRes] = await Promise.all([
      fetch("/api/alerts"),
      fetch("/api/watches"),
    ]);
    const alertsJson = (await alertsRes.json()) as { alerts: Alert[] };
    const watchesJson = (await watchesRes.json()) as { watches: Watch[] };
    setAlerts(alertsJson.alerts);
    setWatches(watchesJson.watches);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const tick = () => setNextScan(scanCountdown());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const visible = useMemo(() => {
    return alerts.filter((alert) => {
      if (watchId !== "all" && alert.watch_id !== watchId) return false;
      if (filter === "unread") return !alert.seen;
      if (filter === "bin") return alert.buying === "FIXED_PRICE";
      if (filter === "auction") return alert.buying === "AUCTION";
      return true;
    });
  }, [alerts, filter, watchId]);

  async function toggleSeen(alert: Alert) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: alert.id, seen: !alert.seen }),
    });
    await load();
  }

  async function fillMockData() {
    setSeeding(true);
    setScanMessage("");
    const response = await fetch("/api/alerts/seed", { method: "POST" });
    const json = (await response.json()) as { watches?: number; alerts?: number; error?: string };
    setSeeding(false);
    if (!response.ok) {
      setScanMessage(json.error ?? "Could not load sample data.");
      return;
    }
    const added = json.alerts ?? 0;
    setScanMessage(
      added > 0 ? `Loaded ${added} sample alert${added === 1 ? "" : "s"}.` : "Sample data is already loaded.",
    );
    await load();
  }

  const unread = alerts.filter((alert) => !alert.seen).length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Alerts</h2>
          <p className="mt-1 text-sm text-mute">
            {unread} unread · live total vs 130point median
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-mute">Next scan in {nextScan}</p>
          <button
            type="button"
            onClick={() => void fillMockData()}
            disabled={seeding}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            {seeding ? "Loading…" : "Fill mock data"}
          </button>
        </div>
      </div>
      {scanMessage ? <p className="mt-3 text-sm text-mute">{scanMessage}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", "unread", "bin", "auction"] as Filter[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              filter === item ? "bg-panel-2 text-ink" : "text-mute"
            }`}
          >
            {item === "bin" ? "BIN" : item}
          </button>
        ))}
        <select
          value={watchId}
          onChange={(event) => setWatchId(event.target.value)}
          className="rounded-full border border-line bg-transparent px-3 py-1 text-sm text-ink"
        >
          <option value="all">All watches</option>
          {watches.map((watch) => (
            <option key={watch.id} value={watch.id}>
              {watch.name}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-xl">No alerts</p>
          <p className="mt-2 text-sm text-mute">Add a watch to start scanning eBay, or load sample alerts.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void fillMockData()}
              disabled={seeding}
              className="rounded-lg bg-wax px-4 py-2 text-sm text-bg disabled:opacity-50"
            >
              {seeding ? "Loading…" : "Fill mock data"}
            </button>
            <Link href="/watches" className="inline-block rounded-lg border border-line px-4 py-2 text-sm text-ink">
              Add a watch
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {visible.map((alert) => {
            const below =
              alert.median && alert.median > 0
                ? Math.round(((alert.median - alert.live_total) / alert.median) * 100)
                : null;
            return (
              <li key={alert.id} className={`grid gap-4 p-4 md:grid-cols-[88px_1fr_auto] ${alert.seen ? "opacity-60" : ""}`}>
                <CardThumb title={alert.title} imageUrl={alert.image_url} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-mute">{alert.watch_name}</p>
                  <a
                    href={alert.ebay_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-base text-ink hover:text-wax"
                  >
                    {alert.title}
                  </a>
                  <p className="mt-2 text-sm text-mute">
                    {alert.buying === "AUCTION" ? "Auction" : "Buy It Now"} · {timeLeft(alert.ends_at)}
                    {alert.seller_feedback != null ? ` · seller ${alert.seller_feedback}` : ""}
                    {alert.comp_status === "unavailable" ? " · comps unavailable" : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <a href={alert.ebay_url} target="_blank" rel="noreferrer" className="text-wax">
                      eBay
                    </a>
                    <a href={alert.point130_url} target="_blank" rel="noreferrer" className="text-mute">
                      130point
                    </a>
                    <button type="button" onClick={() => void toggleSeen(alert)} className="text-mute">
                      {alert.seen ? "Mark unread" : "Mark seen"}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl tabular-nums">{money(alert.live_total)}</p>
                  <p className="text-xs text-mute">
                    {money(alert.live_price)} + {money(alert.shipping)} ship
                  </p>
                  <p className="mt-2 text-sm text-mute">Median {money(alert.median)}</p>
                  {below != null ? (
                    <p className={`mt-1 text-sm ${below >= 0 ? "text-gain" : "text-warn"}`}>
                      {below >= 0 ? `${below}% under` : `${Math.abs(below)}% over`}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-mute">{relativeTime(alert.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function CardThumb({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="h-24 w-[88px] rounded-lg object-cover" />
    );
  }
  return (
    <div className="flex h-24 w-[88px] items-end rounded-lg bg-panel-2 p-2 text-[10px] leading-tight text-mute">
      {title.slice(0, 28)}
    </div>
  );
}
