import { randomUUID } from "crypto";
import { queryFromWatch } from "./match";
import { DEFAULT_WATCH_PHRASE, watchFromPhrase } from "./watch";
import { fetchCardLadderComps, hasCardLadder } from "./cardladder";
import { hasSupabase, supabaseAdmin } from "./supabase";
import type { Alert, ClCacheRow, Watch, WatchComps, WatchInput } from "./types";

type MemoryState = {
  watches: Watch[];
  alerts: Alert[];
  comps: Map<string, WatchComps>;
  clCache: Map<string, ClCacheRow>;
};

const memory: MemoryState = {
  watches: [],
  alerts: [],
  comps: new Map(),
  clCache: new Map(),
};

const SEEDED_WATCH_NAMES = [
  "Mahomes Prizm PSA 10",
  "Elly De La Cruz Chrome 1st PSA 10",
  "Nabers Optic Rated Rookie PSA 10",
  "Wembanyama Prizm PSA 10",
  "Ohtani Topps Chrome PSA 10",
  "Lamar Downtown PSA 10",
];

let purgePromise: Promise<void> | null = null;

async function purgeSeededSampleData(): Promise<void> {
  if (!hasSupabase()) return;
  if (!purgePromise) {
    purgePromise = (async () => {
      const db = supabaseAdmin();
      const { data: seeded } = await db.from("watches").select("id").in("name", SEEDED_WATCH_NAMES);
      const ids = (seeded ?? []).map((row) => row.id as string);
      if (ids.length) {
        await db.from("alerts").delete().in("watch_id", ids);
        await db.from("watch_comps").delete().in("watch_id", ids);
        await db.from("watches").delete().in("id", ids);
      }
      await db.from("alerts").delete().eq("point130_url", "sample");
      await db.from("watch_comps").delete().eq("source_url", "sample");

      const { data: remaining } = await db.from("watches").select("id,name");
      const extras = (remaining ?? []).filter((row) => row.name !== DEFAULT_WATCH_PHRASE);
      if (extras.length) {
        const extraIds = extras.map((row) => row.id as string);
        await db.from("alerts").delete().in("watch_id", extraIds);
        await db.from("watch_comps").delete().in("watch_id", extraIds);
        await db.from("watches").delete().in("id", extraIds);
      }

      const { data: kept } = await db.from("watches").select("id").eq("name", DEFAULT_WATCH_PHRASE).maybeSingle();
      if (kept?.id) {
        await db.from("watches").update(watchFromPhrase(DEFAULT_WATCH_PHRASE, true)).eq("id", kept.id);
      } else {
        await db.from("watches").insert({
          ...watchFromPhrase(DEFAULT_WATCH_PHRASE, true),
          last_median: null,
          last_comp_count: null,
          last_scanned_at: null,
          hit_count: 0,
        });
      }
    })().catch(() => {
      purgePromise = Promise.resolve();
    });
  }
  await purgePromise;
}

function watchName(watch: Watch): string {
  return watch.name;
}

export async function listWatches(): Promise<Watch[]> {
  await purgeSeededSampleData();
  if (!hasSupabase()) {
    if (!memory.watches.length) {
      const row: Watch = {
        id: randomUUID(),
        ...watchFromPhrase(DEFAULT_WATCH_PHRASE, true),
        last_median: null,
        last_comp_count: null,
        last_scanned_at: null,
        hit_count: 0,
        created_at: new Date().toISOString(),
      };
      memory.watches = [row];
    }
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
    for (const key of [...memory.clCache.keys()]) {
      if (key.startsWith(`${id}:`)) memory.clCache.delete(key);
    }
    return;
  }

  const db = supabaseAdmin();
  await db.from("alerts").delete().eq("watch_id", id);
  await db.from("watch_comps").delete().eq("watch_id", id);
  const { error } = await db.from("watches").delete().eq("id", id);
  if (error) throw error;
}

export async function listAlerts(): Promise<Alert[]> {
  await purgeSeededSampleData();
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
  return data ? normalizeComps(data as WatchComps) : null;
}

export async function listWatchCompRows(): Promise<Array<{ watch: Watch; comps: WatchComps | null }>> {
  const watches = await listWatches();
  return Promise.all(
    watches.map(async (watch) => ({
      watch,
      comps: await getWatchComps(watch.id),
    })),
  );
}

export async function refreshWatchComps(watchId: string): Promise<{
  watch: Watch;
  comps: WatchComps;
  status: "ok" | "unavailable";
}> {
  const watch = await getWatch(watchId);
  if (!watch) throw new Error("Watch not found");
  const query = queryFromWatch(watch);
  if (!query) throw new Error("Watch has no search query.");

  if (!hasCardLadder()) {
    throw new Error("PARSE_API_KEY is not set. Add your parse.bot key, then fetch again.");
  }
  const fresh = await fetchCardLadderComps(watch, query, { includeSales: true });
  const comps: WatchComps = {
    watch_id: watch.id,
    median: fresh.median,
    sale_count: fresh.sale_count,
    samples: fresh.samples,
    source_url: fresh.source_url,
    fetched_at: new Date().toISOString(),
  };
  await upsertWatchComps(comps);
  const updated = await updateWatch(watch.id, {
    last_median: fresh.median,
    last_comp_count: fresh.sale_count,
  });
  return { watch: updated, comps, status: fresh.status };
}

function normalizeComps(row: WatchComps): WatchComps {
  return {
    ...row,
    median: row.median == null ? null : Number(row.median),
    sale_count: Number(row.sale_count ?? 0),
    samples: Array.isArray(row.samples) ? row.samples : [],
  };
}

export async function upsertWatchComps(comps: WatchComps): Promise<void> {
  if (!hasSupabase()) {
    memory.comps.set(comps.watch_id, comps);
    return;
  }
  const { error } = await supabaseAdmin().from("watch_comps").upsert(comps);
  if (error) throw error;
}

export async function getClCache(queryKey: string): Promise<ClCacheRow | null> {
  if (!hasSupabase()) return memory.clCache.get(queryKey) ?? null;
  const { data, error } = await supabaseAdmin().from("cl_cache").select("*").eq("query_key", queryKey).maybeSingle();
  if (error) {
    if (error.code === "42P01") return memory.clCache.get(queryKey) ?? null;
    throw error;
  }
  if (!data) return null;
  const row = data as ClCacheRow;
  return {
    ...row,
    median: row.median == null ? null : Number(row.median),
    sale_count: Number(row.sale_count ?? 0),
    samples: Array.isArray(row.samples) ? row.samples : [],
    status: row.status === "ok" ? "ok" : "unavailable",
  };
}

export async function upsertClCache(row: ClCacheRow): Promise<void> {
  memory.clCache.set(row.query_key, row);
  if (!hasSupabase()) return;
  const { error } = await supabaseAdmin().from("cl_cache").upsert(row);
  if (error && error.code !== "42P01") throw error;
}

export async function usingDatabase(): Promise<boolean> {
  return hasSupabase();
}
