"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { PageFade } from "@/components/motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<{
    database: boolean;
    ebay: boolean;
    ebayParse: boolean;
    cardladder: boolean;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/status")
      .then((response) => response.json())
      .then((json: { database: boolean; ebay: boolean; ebayParse: boolean; cardladder: boolean }) =>
        setStatus(json),
      )
      .catch(() => setStatus({ database: false, ebay: false, ebayParse: false, cardladder: false }));
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-5 pb-36 pt-7 sm:pb-32">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-lg tracking-[0.18em] text-ink uppercase"
        >
          Wax Melter
        </motion.p>
        <div className="flex min-h-6 flex-wrap justify-end gap-2 text-[11px] text-mute">
          {status ? (
            <>
              <StatusDot ok={status.database} label={status.database ? "Database" : "No database"} />
              <StatusDot
                ok={status.ebay || status.ebayParse}
                label={status.ebay ? "eBay connected" : status.ebayParse ? "eBay via Parse" : "eBay pending"}
              />
              <StatusDot
                ok={status.cardladder}
                label={status.cardladder ? "Card Ladder" : "Card Ladder key missing"}
              />
            </>
          ) : null}
        </div>
      </header>
      <div className="mt-8">
        <PageFade>{children}</PageFade>
      </div>
      <BottomNav />
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 backdrop-blur">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-gain" : "bg-warn"}`} />
      {label}
    </span>
  );
}
