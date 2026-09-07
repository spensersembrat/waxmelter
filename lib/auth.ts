const COOKIE = "wax_session";

export function sessionCookieName(): string {
  return COOKIE;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function expectedSessionToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return hmacHex(password, "wax-melter");
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  const expected = await expectedSessionToken();
  if (!expected) return process.env.NODE_ENV !== "production";
  return Boolean(token && token === expected);
}
