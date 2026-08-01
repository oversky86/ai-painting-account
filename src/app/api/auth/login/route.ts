import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandomString,
} from "@/lib/pkce";
import { setPkce } from "@/lib/session";
import { getOpenIdConfig } from "@/lib/shopify-ca";

export async function GET(request: NextRequest) {
  const { clientId, accountWebUrl } = getEnv();
  const returnTo =
    request.nextUrl.searchParams.get("return_to") || "/orders";
  const state = generateRandomString(16);
  const nonce = generateRandomString(16);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  await setPkce({ state, nonce, codeVerifier, returnTo });

  const { authorization_endpoint } = await getOpenIdConfig();
  const url = new URL(authorization_endpoint);
  url.searchParams.set("scope", "openid email customer-account-api:full");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "redirect_uri",
    `${accountWebUrl}/api/auth/callback`,
  );
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(url.toString());
}
