import { redirect } from "next/navigation";
import {
  clearSession,
  getSession,
  setSession,
} from "./session";
import { refreshTokens } from "./shopify-ca";
import type { SessionTokens } from "./types";

export async function requireSession(): Promise<SessionTokens> {
  const session = await getValidSession();
  if (!session) {
    redirect(`/api/auth/login?return_to=${encodeURIComponent("/orders")}`);
  }
  return session;
}

export async function getValidSession(): Promise<SessionTokens | null> {
  const session = await getSession();
  if (!session?.accessToken) return null;
  if (session.expiresAt > Date.now() + 60_000) return session;
  if (!session.refreshToken) {
    await clearSession();
    return null;
  }
  try {
    const next = await refreshTokens(session.refreshToken);
    await setSession({ ...next, customerId: session.customerId });
    return { ...next, customerId: session.customerId };
  } catch {
    await clearSession();
    return null;
  }
}
