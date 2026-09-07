import { NextResponse } from "next/server";
import { listWatchCompRows, refreshWatchComps } from "@/lib/store";

export async function GET() {
  try {
    const rows = await listWatchCompRows();
    return NextResponse.json({ rows });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Could not load comps.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { watchId?: string };
  if (!body.watchId) {
    return NextResponse.json({ error: "watchId is required" }, { status: 400 });
  }
  try {
    const result = await refreshWatchComps(body.watchId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Could not fetch 130point comps.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
