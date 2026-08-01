export type ShopConfig = {
  /** myshopify.com domain (canonical key) */
  storeDomain: string;
  clientId: string;
  storefrontUrl: string;
  nativeAccountUrl: string;
  nativeAccountProfileUrl: string;
};

function stripSlash(value: string): string {
  return value.replace(/\/$/, "");
}

export function normalizeShopDomain(input: string): string {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.split("/")[0] || "";
  return value;
}

function fromLegacyEnv(): ShopConfig | null {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();
  if (!storeDomain || !clientId) return null;
  return {
    storeDomain: normalizeShopDomain(storeDomain),
    clientId,
    storefrontUrl: stripSlash(
      process.env.STOREFRONT_URL?.trim() || `https://${normalizeShopDomain(storeDomain)}`,
    ),
    nativeAccountUrl: stripSlash(process.env.NATIVE_ACCOUNT_URL?.trim() || ""),
    nativeAccountProfileUrl: stripSlash(
      process.env.NATIVE_ACCOUNT_PROFILE_URL?.trim() || "",
    ),
  };
}

function parseAccountShops(): ShopConfig[] {
  const raw = process.env.ACCOUNT_SHOPS?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Partial<ShopConfig>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        const storeDomain = normalizeShopDomain(row.storeDomain || "");
        const clientId = (row.clientId || "").trim();
        if (!storeDomain || !clientId) return null;
        return {
          storeDomain,
          clientId,
          storefrontUrl: stripSlash(
            row.storefrontUrl || `https://${storeDomain}`,
          ),
          nativeAccountUrl: stripSlash(row.nativeAccountUrl || ""),
          nativeAccountProfileUrl: stripSlash(
            row.nativeAccountProfileUrl || "",
          ),
        } satisfies ShopConfig;
      })
      .filter(Boolean) as ShopConfig[];
  } catch {
    throw new Error("ACCOUNT_SHOPS must be valid JSON array");
  }
}

let cachedShops: ShopConfig[] | null = null;

export function listShopConfigs(): ShopConfig[] {
  if (cachedShops) return cachedShops;
  const fromJson = parseAccountShops();
  const legacy = fromLegacyEnv();
  const byDomain = new Map<string, ShopConfig>();
  for (const shop of fromJson) byDomain.set(shop.storeDomain, shop);
  if (legacy && !byDomain.has(legacy.storeDomain)) {
    byDomain.set(legacy.storeDomain, legacy);
  }
  cachedShops = [...byDomain.values()];
  if (!cachedShops.length) {
    throw new Error(
      "No shops configured. Set ACCOUNT_SHOPS or SHOPIFY_STORE_DOMAIN + SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID",
    );
  }
  return cachedShops;
}

export function getDefaultShopConfig(): ShopConfig {
  return listShopConfigs()[0];
}

/**
 * Resolve shop from query/cookie/session hint.
 * Matches storeDomain or storefront host (e.g. viewbrush.com).
 */
export function resolveShopConfig(hint?: string | null): ShopConfig {
  const shops = listShopConfigs();
  if (!hint?.trim()) return shops[0];
  const normalized = normalizeShopDomain(hint);
  const exact = shops.find((s) => s.storeDomain === normalized);
  if (exact) return exact;
  const byStorefront = shops.find((s) => {
    const host = normalizeShopDomain(s.storefrontUrl);
    return host === normalized;
  });
  if (byStorefront) return byStorefront;
  throw new Error(`Unknown shop: ${normalized}`);
}

export function tryResolveShopConfig(hint?: string | null): ShopConfig {
  try {
    return resolveShopConfig(hint);
  } catch {
    return getDefaultShopConfig();
  }
}

export function publicConfigFor(shop: ShopConfig) {
  return {
    storefrontUrl: shop.storefrontUrl,
    nativeAccountUrl: shop.nativeAccountUrl,
    nativeAccountProfileUrl: shop.nativeAccountProfileUrl,
    createPath: "/products/custom-oil-painting",
    cartPath: "/cart",
    storeDomain: shop.storeDomain,
  };
}
