import { NextResponse } from "next/server";
import { expectedSessionToken, sessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "SITE_PASSWORD is not set." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { password?: string };
  if (body.password !== password) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const token = expectedSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), token ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
