import { redirect } from "next/navigation";
import {
  clearSession,
  getSession,
  setSession,
} from "./session";
import { refreshTokens } from "./shopify-ca";
import { tryResolveShopConfig } from "./shops";
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
  const shop = tryResolveShopConfig(session.shopDomain);
  if (session.expiresAt > Date.now() + 60_000) {
    if (!session.shopDomain) {
      await setSession({ ...session, shopDomain: shop.storeDomain });
      return { ...session, shopDomain: shop.storeDomain };
    }
    return session;
  }
  if (!session.refreshToken) {
    await clearSession();
    return null;
  }
  try {
    const next = await refreshTokens(shop, session.refreshToken);
    const merged = {
      ...next,
      customerId: session.customerId,
      shopDomain: shop.storeDomain,
    };
    await setSession(merged);
    return merged;
  } catch {
    await clearSession();
    return null;
  }
}
