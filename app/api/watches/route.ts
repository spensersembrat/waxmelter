import { NextResponse } from "next/server";
import { createWatch, deleteWatch, listWatches, updateWatch } from "@/lib/store";
import { watchFromPhrase } from "@/lib/watch";

function parseWatch(body: Record<string, unknown>) {
  const phrase = String(body.query ?? body.name ?? "").trim();
  return watchFromPhrase(phrase, body.enabled !== false);
}

export async function GET() {
  const watches = await listWatches();
  return NextResponse.json({ watches });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const input = parseWatch(body);
  if (!input.name) {
    return NextResponse.json({ error: "Add a search phrase." }, { status: 400 });
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
