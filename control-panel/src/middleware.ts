import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "openclaw_session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

function getSecret(): string {
  return process.env.AUTH_SECRET || "openclaw-default-secret-change-me";
}

function hexEncode(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyToken(token: string): Promise<boolean> {
  const parts = token.split(":");
  if (parts.length !== 4) return false;
  const [username, expiresStr, nonce, sig] = parts;

  if (Date.now() > parseInt(expiresStr, 10)) return false;

  const payload = `${username}:${expiresStr}:${nonce}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expectedSig = hexEncode(signature);

  return expectedSig === sig;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token || !(await verifyToken(token))) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
