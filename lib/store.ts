import { randomUUID } from "crypto";
import { MOCK_ALERTS, MOCK_WATCHES } from "./mock";
import { hasSupabase, supabaseAdmin } from "./supabase";
import type { Alert, Watch, WatchComps, WatchInput } from "./types";

type MemoryState = {
  watches: Watch[];
  alerts: Alert[];
  comps: Map<string, WatchComps>;
};

const memory: MemoryState = {
  watches: structuredClone(MOCK_WATCHES),
  alerts: structuredClone(MOCK_ALERTS),
  comps: new Map(),
};

function watchName(watch: Watch): string {
  return watch.name;
}

export async function listWatches(): Promise<Watch[]> {
  if (!hasSupabase()) {
    return [...memory.watches].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const { data, error } = await supabaseAdmin()
    .from("watches")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Watch[];
}

export async function getWatch(id: string): Promise<Watch | null> {
  if (!hasSupabase()) return memory.watches.find((w) => w.id === id) ?? null;
  const { data, error } = await supabaseAdmin().from("watches").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Watch | null) ?? null;
}

export async function createWatch(input: WatchInput): Promise<Watch> {
  const row: Watch = {
    id: randomUUID(),
    name: input.name,
    must_include: input.must_include,
    must_exclude: input.must_exclude,
    year: input.year,
    max_price: input.max_price,
    alert_below_pct: input.alert_below_pct,
    buying: input.buying,
    enabled: input.enabled,
    last_median: null,
    last_comp_count: null,
    last_scanned_at: null,
    hit_count: 0,
    created_at: new Date().toISOString(),
  };

  if (!hasSupabase()) {
    memory.watches.unshift(row);
    return row;
  }

  const { data, error } = await supabaseAdmin().from("watches").insert(row).select("*").single();
  if (error) throw error;
  return data as Watch;
}

export async function updateWatch(id: string, patch: Partial<WatchInput & Pick<Watch, "last_median" | "last_comp_count" | "last_scanned_at" | "hit_count">>): Promise<Watch> {
  if (!hasSupabase()) {
    const index = memory.watches.findIndex((w) => w.id === id);
    if (index === -1) throw new Error("Watch not found");
    memory.watches[index] = { ...memory.watches[index], ...patch };
    return memory.watches[index];
  }

  const { data, error } = await supabaseAdmin().from("watches").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Watch;
}

export async function deleteWatch(id: string): Promise<void> {
  if (!hasSupabase()) {
    memory.watches = memory.watches.filter((w) => w.id !== id);
    memory.alerts = memory.alerts.filter((a) => a.watch_id !== id);
    memory.comps.delete(id);
    return;
  }

  const db = supabaseAdmin();
  await db.from("alerts").delete().eq("watch_id", id);
  await db.from("watch_comps").delete().eq("watch_id", id);
  const { error } = await db.from("watches").delete().eq("id", id);
  if (error) throw error;
}

export async function listAlerts(): Promise<Alert[]> {
  if (!hasSupabase()) {
    return [...memory.alerts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const db = supabaseAdmin();
  const { data, error } = await db.from("alerts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const alerts = (data ?? []) as Omit<Alert, "watch_name">[];
  const watches = await listWatches();
  const names = new Map(watches.map((w) => [w.id, w.name]));
  return alerts.map((alert) => ({
    ...alert,
    watch_name: names.get(alert.watch_id) ?? "Watch",
  }));
}

export async function markAlertSeen(id: string, seen: boolean): Promise<Alert> {
  if (!hasSupabase()) {
    const alert = memory.alerts.find((a) => a.id === id);
    if (!alert) throw new Error("Alert not found");
    alert.seen = seen;
    return alert;
  }

  const { data, error } = await supabaseAdmin().from("alerts").update({ seen }).eq("id", id).select("*").single();
  if (error) throw error;
  const watch = await getWatch(data.watch_id);
  return { ...(data as Omit<Alert, "watch_name">), watch_name: watch?.name ?? "Watch" };
}

export async function findAlertByItemId(itemId: string): Promise<Alert | null> {
  if (!hasSupabase()) return memory.alerts.find((a) => a.item_id === itemId) ?? null;
  const { data, error } = await supabaseAdmin().from("alerts").select("*").eq("item_id", itemId).maybeSingle();
  if (error) throw error;
  return (data as Alert | null) ?? null;
}

export async function insertAlert(alert: Omit<Alert, "id" | "watch_name" | "created_at"> & { id?: string; created_at?: string }): Promise<Alert | null> {
  const existing = await findAlertByItemId(alert.item_id);
  if (existing) return null;

  const watch = await getWatch(alert.watch_id);
  const row: Alert = {
    id: alert.id ?? randomUUID(),
    watch_name: watch ? watchName(watch) : "Watch",
    created_at: alert.created_at ?? new Date().toISOString(),
    ...alert,
  };

  if (!hasSupabase()) {
    memory.alerts.unshift(row);
    if (watch) {
      await updateWatch(watch.id, { hit_count: watch.hit_count + 1 });
    }
    return row;
  }

  const { watch_name: _ignored, ...dbRow } = row;
  void _ignored;
  const { data, error } = await supabaseAdmin().from("alerts").insert(dbRow).select("*").single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  if (watch) await updateWatch(watch.id, { hit_count: watch.hit_count + 1 });
  return { ...(data as Omit<Alert, "watch_name">), watch_name: watch?.name ?? "Watch" };
}

export async function getWatchComps(watchId: string): Promise<WatchComps | null> {
  if (!hasSupabase()) return memory.comps.get(watchId) ?? null;
  const { data, error } = await supabaseAdmin().from("watch_comps").select("*").eq("watch_id", watchId).maybeSingle();
  if (error) throw error;
  return (data as WatchComps | null) ?? null;
}

export async function upsertWatchComps(comps: WatchComps): Promise<void> {
  if (!hasSupabase()) {
    memory.comps.set(comps.watch_id, comps);
    return;
  }
  const { error } = await supabaseAdmin().from("watch_comps").upsert(comps);
  if (error) throw error;
}

export async function usingDatabase(): Promise<boolean> {
  return hasSupabase();
}

export async function seedMockData(): Promise<{ watches: number; alerts: number }> {
  if (!hasSupabase()) {
    memory.watches = structuredClone(MOCK_WATCHES);
    memory.alerts = structuredClone(MOCK_ALERTS);
    memory.comps = new Map();
    return { watches: MOCK_WATCHES.length, alerts: MOCK_ALERTS.length };
  }

  const existing = await listWatches();
  const idMap = new Map<string, string>();
  let watches = 0;
  let alerts = 0;

  for (const watch of MOCK_WATCHES) {
    const found = existing.find((row) => row.name === watch.name);
    if (found) {
      idMap.set(watch.id, found.id);
      continue;
    }

    const created = await createWatch({
      name: watch.name,
      must_include: watch.must_include,
      must_exclude: watch.must_exclude,
      year: watch.year,
      max_price: watch.max_price,
      alert_below_pct: watch.alert_below_pct,
      buying: watch.buying,
      enabled: watch.enabled,
    });
    await updateWatch(created.id, {
      last_median: watch.last_median,
      last_comp_count: watch.last_comp_count,
      last_scanned_at: watch.last_scanned_at,
    });
    idMap.set(watch.id, created.id);
    watches += 1;
  }

  for (const alert of MOCK_ALERTS) {
    const watchId = idMap.get(alert.watch_id);
    if (!watchId) continue;
    const created = await insertAlert({
      watch_id: watchId,
      item_id: alert.item_id,
      title: alert.title,
      image_url: alert.image_url,
      live_price: alert.live_price,
      shipping: alert.shipping,
      live_total: alert.live_total,
      median: alert.median,
      comp_count: alert.comp_count,
      pct_of_median: alert.pct_of_median,
      buying: alert.buying,
      ends_at: alert.ends_at,
      ebay_url: alert.ebay_url,
      point130_url: alert.point130_url,
      seller_feedback: alert.seller_feedback,
      seen: alert.seen,
      comp_status: alert.comp_status,
    });
    if (created) alerts += 1;
  }

  return { watches, alerts };
}
