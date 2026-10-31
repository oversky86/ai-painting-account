import { NextResponse } from "next/server";
import { clearSession, getSession, getShopHint } from "@/lib/session";
import { buildLogoutUrl } from "@/lib/shopify-ca";
import { logoutLandingUrl, tryResolveShopConfig } from "@/lib/shops";

export async function GET() {
  const session = await getSession();
  const idToken = session?.idToken;
  const shop = tryResolveShopConfig(session?.shopDomain || (await getShopHint()));
  const landing = logoutLandingUrl(shop);
  await clearSession();

  try {
    if (idToken) {
      return NextResponse.redirect(await buildLogoutUrl(shop, idToken));
    }
  } catch (err) {
    console.error("[auth/logout]", err);
  }

  return NextResponse.redirect(landing);
}
