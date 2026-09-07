import { NextResponse } from "next/server";
import { listAlerts, markAlertSeen } from "@/lib/store";

export async function GET() {
  const alerts = await listAlerts();
  return NextResponse.json({ alerts });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; seen?: boolean };
  if (!body.id || typeof body.seen !== "boolean") {
    return NextResponse.json({ error: "id and seen are required" }, { status: 400 });
  }
  const alert = await markAlertSeen(body.id, body.seen);
  return NextResponse.json({ alert });
}
