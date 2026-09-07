import { createHmac } from "crypto";

const COOKIE = "wax_session";

export function sessionCookieName(): string {
  return COOKIE;
}

export function expectedSessionToken(): string | null {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("wax-melter").digest("hex");
}

export function isValidSession(token: string | undefined): boolean {
  const expected = expectedSessionToken();
  if (!expected) return process.env.NODE_ENV !== "production";
  return Boolean(token && token === expected);
}
