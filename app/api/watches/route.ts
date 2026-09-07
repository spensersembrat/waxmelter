import { NextResponse } from "next/server";
import { createWatch, deleteWatch, listWatches, updateWatch } from "@/lib/store";
import type { BuyingOption, WatchInput } from "@/lib/types";

function parseWatch(body: Record<string, unknown>): WatchInput {
  const mustInclude = Array.isArray(body.must_include)
    ? body.must_include.map(String).map((value) => value.trim()).filter(Boolean)
    : [];
  const mustExclude = Array.isArray(body.must_exclude)
    ? body.must_exclude.map(String).map((value) => value.trim()).filter(Boolean)
    : [];
  const buying = (Array.isArray(body.buying) ? body.buying : ["AUCTION", "FIXED_PRICE"]) as BuyingOption[];

  return {
    name: String(body.name ?? "").trim() || mustInclude.join(" ") || "Untitled watch",
    must_include: mustInclude,
    must_exclude: mustExclude,
    year: body.year ? Number(body.year) : null,
    max_price: body.max_price == null || body.max_price === "" ? null : Number(body.max_price),
    alert_below_pct: body.alert_below_pct == null ? 100 : Number(body.alert_below_pct),
    buying: buying.length ? buying : ["AUCTION", "FIXED_PRICE"],
    enabled: body.enabled !== false,
  };
}

export async function GET() {
  const watches = await listWatches();
  return NextResponse.json({ watches });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const input = parseWatch(body);
  if (!input.must_include.length) {
    return NextResponse.json({ error: "Add at least one must-include word." }, { status: 400 });
  }
  const watch = await createWatch(input);
  return NextResponse.json({ watch });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown> & { id?: string };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { id, ...rest } = body;
  const watch = await updateWatch(id, parseWatch(rest as Record<string, unknown>));
  return NextResponse.json({ watch });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await deleteWatch(id);
  return NextResponse.json({ ok: true });
}
