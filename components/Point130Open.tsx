"use client";

import { useState } from "react";
import { POINT130_SALES_URL } from "@/lib/match";

export function Point130Open({
  query,
  compact = false,
}: {
  query: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function openSales() {
    if (query) {
      try {
        await navigator.clipboard.writeText(query);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } catch {
        setCopied(false);
      }
    }
    window.open(POINT130_SALES_URL, "_blank", "noopener,noreferrer");
  }

  if (!query) return null;

  if (compact) {
    return (
      <button type="button" onClick={() => void openSales()} className="text-mute">
        {copied ? "Copied query" : "130point"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-mute">
        130point ignores search links and sends you home. This copies the query and opens their sales page — paste it in the box.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded-md bg-panel-2 px-2 py-1 text-xs text-ink">{query}</code>
        <button type="button" onClick={() => void openSales()} className="text-sm text-wax">
          {copied ? "Copied — paste on 130point" : "Open 130point"}
        </button>
      </div>
    </div>
  );
}
