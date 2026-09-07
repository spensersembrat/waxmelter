import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, sessionCookieName } from "@/lib/auth";
import { runScan } from "@/lib/scan";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const cronOk = Boolean(secret && auth === `Bearer ${secret}`);
  const jar = await cookies();
  const userOk = isValidSession(jar.get(sessionCookieName())?.value);

  if (!cronOk && !userOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScan();
  return NextResponse.json(result);
}
