import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "./env";
import type { SessionTokens } from "./types";

const SESSION_COOKIE = "vb_account_session";
const PKCE_COOKIE = "vb_account_pkce";
const CSRF_COOKIE = "vb_account_csrf";

function secretKey() {
  // A256GCM requires a 32-byte key
  return createHash("sha256").update(getEnv().sessionSecret).digest();
}

export type PkceState = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  shopDomain: string;
};

const SHOP_COOKIE = "vb_account_shop";

export async function setShopHint(shopDomain: string) {
  const jar = await cookies();
  jar.set(SHOP_COOKIE, shopDomain, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getShopHint(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SHOP_COOKIE)?.value || null;
}

export async function sealJson<T extends Record<string, unknown>>(
  payload: T,
  maxAgeSec: number,
): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .encrypt(secretKey());
}

export async function unsealJson<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtDecrypt(token, secretKey());
    return payload as T;
  } catch {
    return null;
  }
}

function cookieBase(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setSession(tokens: SessionTokens) {
  const jar = await cookies();
  const value = await sealJson({ ...tokens }, 60 * 60 * 24 * 30);
  jar.set(SESSION_COOKIE, value, cookieBase(60 * 60 * 24 * 30));
}

export async function getSession(): Promise<SessionTokens | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return unsealJson<SessionTokens>(raw);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function setPkce(state: PkceState) {
  const jar = await cookies();
  const value = await sealJson({ ...state }, 60 * 15);
  jar.set(PKCE_COOKIE, value, cookieBase(60 * 15));
}

export async function getPkce(): Promise<PkceState | null> {
  const jar = await cookies();
  const raw = jar.get(PKCE_COOKIE)?.value;
  if (!raw) return null;
  return unsealJson<PkceState>(raw);
}

export async function clearPkce() {
  const jar = await cookies();
  jar.delete(PKCE_COOKIE);
}

export async function ensureCsrf(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CSRF_COOKIE)?.value;
  if (existing) return existing;
  const token = crypto.randomUUID();
  jar.set(CSRF_COOKIE, token, {
    ...cookieBase(60 * 60 * 24 * 7),
    httpOnly: false,
  });
  return token;
}

export async function assertCsrf(request: Request) {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error("CSRF validation failed");
  }
}

export { SESSION_COOKIE };
