import { NextResponse } from "next/server";
import { usingDatabase } from "@/lib/store";
import { hasOfficialEbay } from "@/lib/ebay";
import { hasCardLadder } from "@/lib/cardladder";
import { hasParseEbay } from "@/lib/parse-ebay";

export async function GET() {
  return NextResponse.json({
    database: await usingDatabase(),
    ebay: hasOfficialEbay(),
    ebayParse: hasParseEbay(),
    cardladder: hasCardLadder(),
  });
}
