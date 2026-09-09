"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { relativeTime } from "@/lib/format";
import type { Watch } from "@/lib/types";

export function WatchesView() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const watchesRes = await fetch("/api/watches");
    const watchesJson = (await watchesRes.json()) as { watches: Watch[] };
    setWatches(watchesJson.watches);
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
    <AppShell>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h2 className="font-display text-2xl">Watches</h2>
          <p className="mt-1 text-sm text-mute">
            One eBay search phrase. Alerts when Card Ladder is 30% higher than a Buy It Now listing.
          </p>
          {watches.length === 0 ? (
            <p className="mt-6 text-sm text-mute">No watches yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {watches.map((watch) => (
                <li key={watch.id} className="rounded-2xl border border-line bg-panel p-4">
                  <p className="text-ink">{watch.name}</p>
                  <p className="mt-2 text-xs text-mute">
                    {watch.hit_count} hits · last scan {relativeTime(watch.last_scanned_at)}
                  </p>
                  <div className="mt-3 flex gap-3 text-sm">
                    <button type="button" onClick={() => edit(watch)} className="text-wax">
                      Edit
                    </button>
                    <button type="button" onClick={() => void remove(watch.id)} className="text-mute">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={onSubmit} className="h-fit rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display text-xl">{editingId ? "Edit watch" : "New watch"}</h3>
          <label className="mt-4 block text-sm text-mute">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink"
              placeholder="Topps Chrome Update Orange"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-warn">{error}</p> : null}
          <div className="mt-5 flex gap-3">
            <button type="submit" className="rounded-lg bg-wax px-4 py-2 text-sm text-bg">
              {editingId ? "Save" : "Add watch"}
            </button>
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
        </form>
      </div>
    </AppShell>
  );
}
