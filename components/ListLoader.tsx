"use client";

import { motion } from "framer-motion";

export function ListLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-7 space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-panel/70"
        >
          <div className="h-28" />
          <motion.div
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-wax/20 to-transparent"
            initial={{ x: "-120%" }}
            animate={{ x: "420%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.14,
            }}
          />
        </div>
      ))}
    </div>
  );
}
