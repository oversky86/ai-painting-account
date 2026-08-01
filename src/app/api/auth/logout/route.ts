import { NextResponse } from "next/server";
import { getEnv, getPublicConfig } from "@/lib/env";
import { clearSession, getSession } from "@/lib/session";
import { buildLogoutUrl } from "@/lib/shopify-ca";

export async function GET() {
  const session = await getSession();
  const idToken = session?.idToken;
  await clearSession();

  const { storefrontUrl } = getPublicConfig();
  const { accountWebUrl } = getEnv();

  try {
    if (idToken) {
      const caLogout = await buildLogoutUrl(idToken);
      // After CA logout, bounce to storefront account logout if configured
      if (storefrontUrl) {
        const bridge = new URL(caLogout);
        bridge.searchParams.set(
          "post_logout_redirect_uri",
          `${storefrontUrl}/account/logout`,
        );
        return NextResponse.redirect(bridge.toString());
      }
      return NextResponse.redirect(caLogout);
    }
  } catch (err) {
    console.error("[auth/logout]", err);
  }

  if (storefrontUrl) {
    return NextResponse.redirect(`${storefrontUrl}/account/logout`);
  }
  return NextResponse.redirect(`${accountWebUrl}/`);
}
