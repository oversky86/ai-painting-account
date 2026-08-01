import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { clearSession, getSession } from "@/lib/session";
import { buildLogoutUrl } from "@/lib/shopify-ca";
import { tryResolveShopConfig } from "@/lib/shops";

export async function GET() {
  const session = await getSession();
  const idToken = session?.idToken;
  const shop = tryResolveShopConfig(session?.shopDomain);
  await clearSession();

  const { accountWebUrl } = getEnv();

  try {
    if (idToken) {
      const caLogout = await buildLogoutUrl(shop, idToken);
      if (shop.storefrontUrl) {
        const bridge = new URL(caLogout);
        bridge.searchParams.set(
          "post_logout_redirect_uri",
          `${shop.storefrontUrl}/account/logout`,
        );
        return NextResponse.redirect(bridge.toString());
      }
      return NextResponse.redirect(caLogout);
    }
  } catch (err) {
    console.error("[auth/logout]", err);
  }

  if (shop.storefrontUrl) {
    return NextResponse.redirect(`${shop.storefrontUrl}/account/logout`);
  }
  return NextResponse.redirect(`${accountWebUrl}/`);
}
