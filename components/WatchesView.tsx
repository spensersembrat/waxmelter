"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChipInput } from "@/components/ChipInput";
import { FieldTip } from "@/components/FieldTip";
import { queryFromWatch } from "@/lib/match";
import { money, relativeTime } from "@/lib/format";
import type { BuyingOption, Watch, WatchInput } from "@/lib/types";

const emptyForm: WatchInput = {
  name: "",
  must_include: [],
  must_exclude: ["lot", "reprint", "digital"],
  year: null,
  max_price: 100,
  alert_below_pct: 30,
  buying: ["FIXED_PRICE"],
  enabled: true,
};

export function WatchesView() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [form, setForm] = useState<WatchInput>(emptyForm);
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

  const preview = useMemo(
    () => queryFromWatch({ must_include: form.must_include, year: form.year }),
    [form.must_include, form.year],
  );

  function toggleBuying(option: BuyingOption) {
    setForm((current) => {
      const has = current.buying.includes(option);
      const buying = has ? current.buying.filter((item) => item !== option) : [...current.buying, option];
      return { ...current, buying: buying.length ? buying : [option] };
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/watches", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Could not save watch.");
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    await load();
  }

  function edit(watch: Watch) {
    setEditingId(watch.id);
    setForm({
      name: watch.name,
      must_include: watch.must_include,
      must_exclude: watch.must_exclude,
      year: watch.year,
      max_price: watch.max_price,
      alert_below_pct: watch.alert_below_pct,
      buying: watch.buying,
      enabled: watch.enabled,
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this watch and its alerts?")) return;
    await fetch(`/api/watches?id=${id}`, { method: "DELETE" });
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    await load();
  }

  async function toggleEnabled(watch: Watch) {
    await fetch("/api/watches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...watch,
        enabled: !watch.enabled,
      }),
    });
    await load();
  }

  return (
    <AppShell>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h2 className="font-display text-2xl">Watches</h2>
          <p className="mt-1 text-sm text-mute">Title keywords for one eBay Buy It Now search.</p>
          <ul className="mt-6 space-y-3">
            {watches.map((watch) => (
              <li key={watch.id} className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-ink">{watch.name}</p>
                    <p className="mt-1 text-sm text-mute">
                      {queryFromWatch(watch) || "No query yet"}
                    </p>
                    <p className="mt-2 text-xs text-mute">
                      CL {money(watch.last_median)} · {watch.last_comp_count ?? 0} sales · fetched{" "}
                      {relativeTime(watch.last_scanned_at)} · {watch.hit_count} hits
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleEnabled(watch)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      watch.enabled ? "bg-gain/20 text-gain" : "bg-panel-2 text-mute"
                    }`}
                  >
                    {watch.enabled ? "On" : "Off"}
                  </button>
                </div>
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
        </section>

        <form onSubmit={onSubmit} className="h-fit rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-display text-xl">{editingId ? "Edit watch" : "New watch"}</h3>
          <label className="mt-4 block text-sm text-mute">
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink"
              placeholder="Topps Chrome Update Orange"
            />
          </label>
          <div className="mt-4">
            <ChipInput
              label="Must include"
              values={form.must_include}
              onChange={(must_include) => setForm({ ...form, must_include })}
              placeholder="Topps, Chrome, Update, Orange"
            />
          </div>
          <div className="mt-4">
            <ChipInput
              label="Must not include"
              values={form.must_exclude}
              onChange={(must_exclude) => setForm({ ...form, must_exclude })}
              placeholder="lot, optic"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm text-mute">
              Year
              <input
                type="number"
                value={form.year ?? ""}
                onChange={(event) =>
                  setForm({ ...form, year: event.target.value ? Number(event.target.value) : null })
                }
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink"
              />
            </label>
            <label className="text-sm text-mute">
              <span className="inline-flex items-center">
                Max price
                <FieldTip text="Highest eBay listing price to search. Shipping is not included, so the all-in total can still be higher." />
              </span>
              <input
                type="number"
                value={form.max_price ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    max_price: event.target.value ? Number(event.target.value) : null,
                  })
                }
                className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm text-mute">
            <span className="inline-flex items-center">
              CL higher by
              <FieldTip text="Alert when Card Ladder is this percent higher than the eBay Buy It Now total (price + shipping). 30 means CL is at least 30% above the listing. Example: eBay $100, CL $130." />
            </span>
            <span className="relative mt-2 block">
              <input
                type="number"
                value={form.alert_below_pct}
                onChange={(event) => setForm({ ...form, alert_below_pct: Number(event.target.value) })}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 pr-8 text-ink"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mute">%</span>
            </span>
          </label>
          <div className="mt-4 flex gap-3 text-sm">
            <label className="flex items-center gap-2 text-mute">
              <input
                type="checkbox"
                checked={form.buying.includes("FIXED_PRICE")}
                onChange={() => toggleBuying("FIXED_PRICE")}
              />
              Buy It Now
            </label>
            <label className="flex items-center gap-2 text-mute">
              <input
                type="checkbox"
                checked={form.buying.includes("AUCTION")}
                onChange={() => toggleBuying("AUCTION")}
              />
              Auction
            </label>
          </div>
          <p className="mt-4 rounded-lg bg-panel-2 px-3 py-2 text-sm text-mute">
            eBay will search: <span className="text-ink">{preview || "—"}</span>
          </p>
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
                  setForm(emptyForm);
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
