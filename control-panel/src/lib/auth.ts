import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "openclaw_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return process.env.AUTH_SECRET || "openclaw-default-secret-change-me";
}

function sign(payload: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(payload);
  return hmac.digest("hex");
}

export function createSessionToken(username: string): string {
  const nonce = randomBytes(16).toString("hex");
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${username}:${expires}:${nonce}`;
  const signature = sign(payload);
  return `${payload}:${signature}`;
}

export function verifySessionToken(token: string): boolean {
  const parts = token.split(":");
  if (parts.length !== 4) return false;
  const [username, expiresStr, nonce] = parts;
  const payload = `${username}:${expiresStr}:${nonce}`;
  const expectedSig = sign(payload);
  if (expectedSig !== parts[3]) return false;
  if (Date.now() > parseInt(expiresStr, 10)) return false;
  return true;
}

export function validateCredentials(username: string, password: string): boolean {
  const validUser = process.env.AUTH_USERNAME;
  const validPass = process.env.AUTH_PASSWORD;
  if (!validUser || !validPass) return false;
  return username === validUser && password === validPass;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE };
