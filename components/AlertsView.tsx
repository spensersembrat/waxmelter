"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CardLadderLink } from "@/components/CardLadderLink";
import { ListLoader } from "@/components/ListLoader";
import { itemVariants, listVariants, motion } from "@/components/motion";
import { ScanExplainer } from "@/components/ScanExplainer";
import { cardLadderSearchUrl, isSampleComps, queryFromWatch } from "@/lib/match";
import { money, relativeTime, timeLeft } from "@/lib/format";
import type { Alert, Watch } from "@/lib/types";

type Filter = "all" | "unread" | "bin" | "auction";

export function AlertsView() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [watchId, setWatchId] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  async function load() {
    const [alertsRes, watchesRes] = await Promise.all([
      fetch("/api/alerts"),
      fetch("/api/watches"),
    ]);
    const alertsJson = (await alertsRes.json()) as { alerts?: Alert[]; error?: string };
    const watchesJson = (await watchesRes.json()) as { watches?: Watch[] };
    if (!alertsRes.ok || !Array.isArray(alertsJson.alerts)) {
      setScanMessage(alertsJson.error ?? "Could not load alerts.");
      setAlerts((current) => current ?? []);
      return;
    }
    setAlerts(alertsJson.alerts);
    setWatches(Array.isArray(watchesJson.watches) ? watchesJson.watches : []);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (!alerts) return [];
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

  async function scanNow() {
    const enabled = watches.filter((watch) => watch.enabled);
    const count = watchId === "all" ? enabled.length : 1;
    if (count === 0) {
      setScanMessage("Turn on a watch first, or pick one in the list.");
      return;
    }
    const ebayCredits = count * 10;
    const ok = window.confirm(
      count === 1
        ? `Scan this watch? That uses about ${ebayCredits} Parse credits for eBay, plus 1 per new Card Ladder lookup.`
        : `Scan ${count} watches? That uses about ${ebayCredits} Parse credits for eBay (10 per watch), plus 1 per new Card Ladder lookup.`,
    );
    if (!ok) return;
    setScanning(true);
    setScanMessage("");
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(watchId === "all" ? {} : { watchId }),
    });
    const raw = await response.text();
    let json: {
      newAlerts?: number;
      listingsChecked?: number;
      scannedWatches?: number;
      parseCredits?: { estimated?: number };
      errors?: string[];
      error?: string;
    } = {};
    if (raw) {
      try {
        json = JSON.parse(raw) as typeof json;
      } catch {
        json = {};
      }
    }
    setScanning(false);
    if (!response.ok) {
      setScanMessage(
        json.error ??
          json.errors?.[0] ??
          "Scan failed after talking to Parse. Credits may still have been used. Try again in a minute.",
      );
      return;
    }
    const credits = json.parseCredits?.estimated ?? 0;
    const extra = json.errors?.length ? ` ${json.errors.join(" ")}` : "";
    setScanMessage(
      `Checked ${json.listingsChecked ?? 0} listings across ${json.scannedWatches ?? 0} watch${
        (json.scannedWatches ?? 0) === 1 ? "" : "es"
      }. ${json.newAlerts ?? 0} new alert${(json.newAlerts ?? 0) === 1 ? "" : "s"}. About ${credits} Parse credit${
        credits === 1 ? "" : "s"
      }.${extra}`,
    );
    await load();
  }

  const unread = (alerts ?? []).filter((alert) => !alert.seen).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center font-display text-4xl tracking-tight">
            Alerts
            <ScanExplainer />
          </h2>
          <p className="mt-2 text-sm text-mute">
            {alerts === null ? "Loading alerts" : `${unread} unread · BIN vs Card Ladder for each listing`}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => void scanNow()}
          disabled={scanning || alerts === null}
          whileHover={{ scale: scanning || alerts === null ? 1 : 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full bg-wax px-5 py-2.5 text-sm font-medium text-bg disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan now"}
        </motion.button>
      </div>
      {scanMessage ? <p className="mt-3 text-sm text-mute">{scanMessage}</p> : null}

      <div className="mt-7 flex flex-wrap items-center gap-2">
        {(["all", "unread", "bin", "auction"] as Filter[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-3.5 py-1.5 text-sm capitalize transition ${
              filter === item ? "bg-white/10 text-ink" : "text-mute hover:text-ink"
            }`}
          >
            {item === "bin" ? "BIN" : item}
          </button>
        ))}
        <select
          value={watchId}
          onChange={(event) => setWatchId(event.target.value)}
          className="rounded-full border border-white/10 bg-panel/80 px-3 py-1.5 text-sm text-ink outline-none"
        >
          <option value="all">All watches</option>
          {watches.map((watch) => (
            <option key={watch.id} value={watch.id}>
              {watch.name}
            </option>
          ))}
        </select>
      </div>

      {alerts === null ? (
        <ListLoader rows={3} label="Loading alerts" />
      ) : visible.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-3xl border border-dashed border-white/10 bg-panel/40 px-6 py-16 text-center backdrop-blur-xl"
        >
          <p className="font-display text-2xl">No alerts</p>
          <p className="mt-2 text-sm text-mute">Pick a watch, then Scan now. Parse eBay search is about 10 credits per watch.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <motion.button
              type="button"
              onClick={() => void scanNow()}
              disabled={scanning}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-wax px-5 py-2.5 text-sm font-medium text-bg disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Scan now"}
            </motion.button>
            <Link
              href="/watches"
              className="inline-block rounded-full border border-white/10 px-5 py-2.5 text-sm text-ink"
            >
              Add a watch
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.ul variants={listVariants} initial="hidden" animate="show" className="mt-6 space-y-3">
          {visible.map((alert) => {
            const clHigher =
              alert.median && alert.live_total > 0
                ? Math.round(((alert.median - alert.live_total) / alert.live_total) * 100)
                : null;
            return (
              <motion.li
                key={alert.id}
                variants={itemVariants}
                layout
                className={`grid gap-4 rounded-3xl border border-white/10 bg-panel/70 p-4 backdrop-blur-xl md:grid-cols-[88px_1fr_auto] ${
                  alert.seen ? "opacity-55" : ""
                }`}
              >
                <CardThumb title={alert.title} imageUrl={alert.image_url} />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{alert.watch_name}</p>
                  <a
                    href={alert.ebay_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-base text-ink transition hover:text-wax"
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
                    <CardLadderLink
                      compact
                      href={
                        alert.point130_url && !isSampleComps(alert.point130_url)
                          ? alert.point130_url
                          : cardLadderSearchUrl(
                              queryFromWatch(
                                watches.find((watch) => watch.id === alert.watch_id) ?? {
                                  name: "",
                                  must_include: [],
                                },
                              ),
                            )
                      }
                    />
                    <button type="button" onClick={() => void toggleSeen(alert)} className="text-mute">
                      {alert.seen ? "Mark unread" : "Mark seen"}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl tabular-nums tracking-tight">{money(alert.live_total)}</p>
                  <p className="text-xs text-mute">
                    {money(alert.live_price)} + {money(alert.shipping)} ship
                  </p>
                  <p className="mt-2 text-sm text-mute">CL {money(alert.median)}</p>
                  {clHigher != null ? (
                    <p className={`mt-1 text-sm ${clHigher >= 0 ? "text-gain" : "text-warn"}`}>
                      {clHigher >= 0 ? `CL ${clHigher}% higher` : `CL ${Math.abs(clHigher)}% lower`}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-mute">{relativeTime(alert.created_at)}</p>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}

function CardThumb({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="h-24 w-[88px] rounded-2xl object-cover" />
    );
  }
  return (
    <div className="flex h-24 w-[88px] items-end rounded-2xl bg-panel-2 p-2 text-[10px] leading-tight text-mute">
      {title.slice(0, 28)}
    </div>
  );
}
