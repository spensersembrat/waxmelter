import { NextResponse } from "next/server";
import { listScanRuns } from "@/lib/store";

export async function GET() {
  const scans = await listScanRuns();
  return NextResponse.json({ scans });
}
