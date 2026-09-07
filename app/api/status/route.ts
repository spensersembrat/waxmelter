import { NextResponse } from "next/server";
import { usingDatabase } from "@/lib/store";
import { hasEbay } from "@/lib/ebay";

export async function GET() {
  return NextResponse.json({
    database: await usingDatabase(),
    ebay: hasEbay(),
  });
}
