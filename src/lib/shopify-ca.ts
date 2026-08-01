import { getEnv } from "./env";
import type { SessionTokens } from "./types";

type OpenIdConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
};

type CustomerApiConfig = {
  graphql_api: string;
};

let openIdCache: { at: number; value: OpenIdConfig } | null = null;
let apiCache: { at: number; value: CustomerApiConfig } | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Discovery failed: ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function getOpenIdConfig(): Promise<OpenIdConfig> {
  if (openIdCache && Date.now() - openIdCache.at < 3600_000) {
    return openIdCache.value;
  }
  const { storeDomain } = getEnv();
  const value = await fetchJson<OpenIdConfig>(
    `https://${storeDomain}/.well-known/openid-configuration`,
  );
  openIdCache = { at: Date.now(), value };
  return value;
}

export async function getCustomerApiConfig(): Promise<CustomerApiConfig> {
  if (apiCache && Date.now() - apiCache.at < 3600_000) {
    return apiCache.value;
  }
  const { storeDomain } = getEnv();
  const value = await fetchJson<CustomerApiConfig>(
    `https://${storeDomain}/.well-known/customer-account-api`,
  );
  apiCache = { at: Date.now(), value };
  return value;
}

export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<SessionTokens> {
  const { clientId } = getEnv();
  const { token_endpoint } = await getOpenIdConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier,
  });
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    idToken: json.id_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function refreshTokens(
  refreshToken: string,
): Promise<SessionTokens> {
  const { clientId } = getEnv();
  const { token_endpoint } = await getOpenIdConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    idToken: json.id_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function caGraphql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const { graphql_api } = await getCustomerApiConfig();
  const res = await fetch(graphql_api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken.startsWith("Bearer ")
        ? accessToken
        : `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CA GraphQL HTTP ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("CA GraphQL empty data");
  return json.data;
}

export async function buildLogoutUrl(idToken?: string): Promise<string> {
  const { accountWebUrl } = getEnv();
  const { end_session_endpoint } = await getOpenIdConfig();
  const url = new URL(end_session_endpoint);
  if (idToken) url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", `${accountWebUrl}/`);
  return url.toString();
}
