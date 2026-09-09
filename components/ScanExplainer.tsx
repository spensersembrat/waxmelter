"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function ScanExplainer() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={root} className="relative ml-2 inline-flex align-middle">
      <button
        type="button"
        aria-label="How a scan works"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-xs text-mute transition hover:border-wax hover:text-ink"
      >
        ?
      </button>
      <AnimatePresence>
        {open ? (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-white/10 bg-panel-2 p-3 text-left text-xs font-normal leading-relaxed text-mute shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
          >
            <p className="text-ink">eBay first, then Card Ladder per listing. Not one CL for the whole search.</p>
            <p className="mt-2">
              Search the watch phrase on eBay (about 60 BIN results). For each match, search Card Ladder with that
              listing title. Up to 8 cards come back; one matching card is picked. Alert if CL is 30% higher than eBay
              plus shipping.
            </p>
            <p className="mt-2">
              Example: watch Topps Chrome Update Orange. eBay $105 shipped for an Elly orange /25. CL $140 on the
              matching card. That is an alert.
            </p>
            <p className="mt-2">
              Credits: 10 for eBay, plus 1 per new CL lookup (max 6). Cached CL for 24 hours is free.
            </p>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
