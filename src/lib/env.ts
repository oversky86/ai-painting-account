function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.replace(/\/$/, "");
}

function optional(name: string, fallback = ""): string {
  return (process.env[name]?.trim() || fallback).replace(/\/$/, "");
}

export function getEnv() {
  return {
    accountWebUrl: required("ACCOUNT_WEB_URL"),
    storeDomain: required("SHOPIFY_STORE_DOMAIN"),
    clientId: required("SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID"),
    sessionSecret: required("SESSION_SECRET"),
    hmacSecret: required("ACCOUNT_HMAC_SECRET"),
    appWriteApiUrl: required("APP_WRITE_API_URL"),
    storefrontUrl: optional("STOREFRONT_URL"),
    nativeAccountUrl: optional("NATIVE_ACCOUNT_URL"),
    nativeAccountProfileUrl: optional("NATIVE_ACCOUNT_PROFILE_URL"),
  };
}

export function getPublicConfig() {
  return {
    storefrontUrl: optional("STOREFRONT_URL"),
    nativeAccountUrl: optional("NATIVE_ACCOUNT_URL"),
    nativeAccountProfileUrl: optional("NATIVE_ACCOUNT_PROFILE_URL"),
    createPath: "/products/custom-oil-painting",
    cartPath: "/cart",
  };
}
