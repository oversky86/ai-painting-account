import {
  getDefaultShopConfig,
  publicConfigFor,
  type ShopConfig,
} from "./shops";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.replace(/\/$/, "");
}

export function getEnv() {
  const defaultShop = getDefaultShopConfig();
  return {
    accountWebUrl: required("ACCOUNT_WEB_URL"),
    sessionSecret: required("SESSION_SECRET"),
    hmacSecret: required("ACCOUNT_HMAC_SECRET"),
    appWriteApiUrl: required("APP_WRITE_API_URL"),
    /** @deprecated Prefer resolveShopConfig — kept for callers that need a default */
    storeDomain: defaultShop.storeDomain,
    clientId: defaultShop.clientId,
    storefrontUrl: defaultShop.storefrontUrl,
    nativeAccountUrl: defaultShop.nativeAccountUrl,
    nativeAccountProfileUrl: defaultShop.nativeAccountProfileUrl,
  };
}

export function getPublicConfig(shop?: ShopConfig) {
  return publicConfigFor(shop || getDefaultShopConfig());
}
