"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ScanExplainer() {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-panel/70 p-5 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h3 className="font-display text-xl tracking-tight">How a scan works</h3>
        <span className="text-sm text-mute">{open ? "Hide" : "Show"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-mute">
              <p>
                Scan looks up live eBay Buy It Now listings for your watch phrase, then checks Card Ladder for each
                listing. There is not one CL number for the whole search.
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  eBay search uses the watch phrase. Parse returns page 1 (about 60 listings). Auctions are skipped.
                  Keep listings whose titles include every word in the phrase.
                </li>
                <li>
                  For each matching BIN, Card Ladder is searched with that listing title. The API returns up to 8
                  cards. The scan picks the one that matches the title and grade, then uses that card CL value.
                </li>
                <li>
                  Alert if CL is at least 30% higher than eBay price plus shipping. Example: eBay $100 shipped, CL
                  $130 or more.
                </li>
              </ol>
              <div className="rounded-2xl bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-wax">Example</p>
                <p className="mt-2 text-ink">Watch: Topps Chrome Update Orange</p>
                <p className="mt-1">
                  eBay hit: 2024 Topps Chrome Update Elly De La Cruz Orange /25, $100 + $5 shipping.
                </p>
                <p className="mt-1">
                  Card Ladder search uses that full title, not just the watch phrase. Up to 8 cards come back. One
                  matching Elly orange is picked at CL $140.
                </p>
                <p className="mt-1 text-ink">
                  $140 is more than 30% above $105, so this listing becomes an alert.
                </p>
              </div>
              <p>
                Credits: 10 per eBay search, plus 1 per new Card Ladder lookup. Max 6 new CL lookups per watch. Cached
                CL values from the last 24 hours are free, so a repeat scan of the same titles is often just the eBay
                10.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
