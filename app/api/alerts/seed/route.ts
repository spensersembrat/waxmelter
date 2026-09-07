import { NextResponse } from "next/server";
import { seedMockData } from "@/lib/store";

export async function POST() {
  try {
    const result = await seedMockData();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Could not load sample data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
