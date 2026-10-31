import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import {
  clearPkce,
  ensureCsrf,
  getPkce,
  setSession,
  setShopHint,
} from "@/lib/session";
import { caGraphql, exchangeCode } from "@/lib/shopify-ca";
import { publicShopKey, resolveShopConfig } from "@/lib/shops";

export async function GET(request: NextRequest) {
  const { accountWebUrl } = getEnv();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  const pkce = await getPkce();
  const errorUrl = (code: string, shopDomain?: string) => {
    const dest = new URL(accountWebUrl);
    dest.searchParams.set("error", code);
    if (shopDomain) {
      try {
        dest.searchParams.set("shop", publicShopKey(shopDomain));
      } catch {
        /* keep the error redirect without a shop */
      }
    }
    return NextResponse.redirect(dest.toString());
  };

  if (error) return errorUrl(error, pkce?.shopDomain);

  if (!code || !state || !pkce || pkce.state !== state) {
    return errorUrl("invalid_state", pkce?.shopDomain);
  }

  let shop;
  try {
    shop = resolveShopConfig(pkce.shopDomain);
  } catch {
    await clearPkce();
    return errorUrl("unknown_shop", pkce.shopDomain);
  }

  try {
    const tokens = await exchangeCode(shop, {
      code,
      codeVerifier: pkce.codeVerifier,
      redirectUri: `${accountWebUrl}/api/auth/callback`,
    });

    let customerId: string | undefined;
    try {
      const data = await caGraphql<{ customer: { id: string } | null }>(
        shop,
        tokens.accessToken,
        `query { customer { id } }`,
      );
      customerId = data.customer?.id;
    } catch {
      // non-fatal
    }

    await setSession({
      ...tokens,
      customerId,
      shopDomain: shop.storeDomain,
    });
    await setShopHint(shop.storeDomain);
    await clearPkce();
    await ensureCsrf();

    const returnTo = pkce.returnTo.startsWith("/")
      ? pkce.returnTo
      : "/orders";
    const dest = new URL(`${accountWebUrl}${returnTo}`);
    dest.searchParams.set("shop", publicShopKey(shop.storeDomain));
    return NextResponse.redirect(dest.toString());
  } catch (err) {
    console.error("[auth/callback]", err);
    await clearPkce();
    return errorUrl("token_exchange", pkce.shopDomain);
  }
}
