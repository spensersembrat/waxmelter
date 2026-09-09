import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, sessionCookieName } from "@/lib/auth";
import { runScan } from "@/lib/scan";
import { getWatch, insertScanRun } from "@/lib/store";
import type { ScanResult } from "@/lib/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function recordScan(result: ScanResult, watchId: string | undefined, ok: boolean) {
  try {
    const watch = watchId ? await getWatch(watchId) : null;
    await insertScanRun({
      watch_id: watch?.id ?? null,
      watch_name: watch?.name ?? (result.scannedWatches > 1 ? "All watches" : null),
      scanned_watches: result.scannedWatches,
      listings_checked: result.listingsChecked,
      new_alerts: result.newAlerts,
      ebay_source: result.ebaySource,
      parse_credits: result.parseCredits.estimated,
      errors: result.errors ?? [],
      ok,
    });
  } catch {
    // A missing scan_runs table should not fail the scan itself.
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const cronOk = Boolean(secret && auth === `Bearer ${secret}`);
  const jar = await cookies();
  const userOk = await isValidSession(jar.get(sessionCookieName())?.value);

  if (!cronOk && !userOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let watchId: string | undefined;
  try {
    const body = (await request.json()) as { watchId?: string };
    watchId = typeof body.watchId === "string" && body.watchId ? body.watchId : undefined;
  } catch {
    watchId = undefined;
  }

  try {
    const result = await runScan({
      parseEbay: userOk && !cronOk,
      watchId: cronOk ? undefined : watchId,
    });
    await recordScan(result, cronOk ? undefined : watchId, true);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed.";
    const result = {
      scannedWatches: 0,
      listingsChecked: 0,
      newAlerts: 0,
      ebayReady: false,
      ebaySource: "none" as const,
      parseCredits: { ebaySearches: 0, clLookups: 0, estimated: 0 },
      errors: [message],
      error: message,
    };
    await recordScan(result, watchId, false);
    return NextResponse.json(result, { status: 500 });
  }
}
