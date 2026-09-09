"use client";

import { motion } from "framer-motion";

export function ListLoader({
  rows = 3,
  label = "Loading",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div className="mt-7" aria-busy="true" aria-live="polite">
      <div className="mb-4 flex items-center gap-3 text-sm text-mute">
        <motion.span
          className="inline-block h-4 w-4 rounded-full border-2 border-white/20 border-t-wax"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
        />
        {label}
      </div>
      <div className="space-y-3">
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
    </div>
  );
}
