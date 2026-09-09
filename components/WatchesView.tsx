"use client";

import { FormEvent, useEffect, useState } from "react";
import { ListLoader } from "@/components/ListLoader";
import { itemVariants, listVariants, motion } from "@/components/motion";
import { relativeTime } from "@/lib/format";
import type { Watch } from "@/lib/types";

export function WatchesView() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const watchesRes = await fetch("/api/watches");
      const watchesJson = (await watchesRes.json()) as { watches: Watch[] };
      setWatches(watchesJson.watches);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/watches", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, query } : { query }),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Could not save watch.");
      return;
    }
    setQuery("");
    setEditingId(null);
    await load();
  }

  function edit(watch: Watch) {
    setEditingId(watch.id);
    setQuery(watch.name);
  }

  async function remove(id: string) {
    if (!confirm("Delete this watch and its alerts?")) return;
    await fetch(`/api/watches?id=${id}`, { method: "DELETE" });
    if (editingId === id) {
      setEditingId(null);
      setQuery("");
    }
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <h2 className="font-display text-4xl tracking-tight">Watches</h2>
        <p className="mt-2 text-sm text-mute">
          One eBay search phrase. Alerts when Card Ladder is 30% higher than a Buy It Now listing.
        </p>
        {loading ? (
          <ListLoader rows={2} />
        ) : watches.length === 0 ? (
          <p className="mt-8 text-sm text-mute">No watches yet.</p>
        ) : (
          <motion.ul variants={listVariants} initial="hidden" animate="show" className="mt-7 space-y-3">
            {watches.map((watch) => (
              <motion.li
                key={watch.id}
                variants={itemVariants}
                layout
                whileHover={{ y: -2 }}
                className="rounded-3xl border border-white/10 bg-panel/70 p-5 backdrop-blur-xl"
              >
                <p className="text-lg text-ink">{watch.name}</p>
                <p className="mt-2 text-xs text-mute">
                  {watch.hit_count} hits · last scan {relativeTime(watch.last_scanned_at)}
                </p>
                <div className="mt-4 flex gap-4 text-sm">
                  <button type="button" onClick={() => edit(watch)} className="text-wax">
                    Edit
                  </button>
                  <button type="button" onClick={() => void remove(watch.id)} className="text-mute">
                    Delete
                  </button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </section>

      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="h-fit rounded-3xl border border-white/10 bg-panel/70 p-6 backdrop-blur-xl"
      >
        <h3 className="font-display text-2xl tracking-tight">{editingId ? "Edit watch" : "New watch"}</h3>
        <label className="mt-5 block text-sm text-mute">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-bg/70 px-4 py-3 text-ink outline-none transition focus:border-wax/60"
            placeholder="Topps Chrome Update Orange"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-warn">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full bg-wax px-5 py-2.5 text-sm font-medium text-bg"
          >
            {editingId ? "Save" : "Add watch"}
          </motion.button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setQuery("");
              }}
              className="text-sm text-mute"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </motion.form>
    </div>
  );
}
