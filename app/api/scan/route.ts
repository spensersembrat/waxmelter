import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, sessionCookieName } from "@/lib/auth";
import { runScan } from "@/lib/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const result = await runScan({
    parseEbay: userOk && !cronOk,
    watchId: cronOk ? undefined : watchId,
  });
  return NextResponse.json(result);
}
