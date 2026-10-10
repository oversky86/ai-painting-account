/** Dev store create path. The live store uses LIVE_STOREFRONT_CREATE_PATH. */
export const STOREFRONT_CREATE_PATH = "/products/custom-oil-painting";
export const LIVE_STOREFRONT_CREATE_PATH = "/products/custom-oil-portrait";
export const LIVE_SHOP_DOMAIN = "6hcr01-9t.myshopify.com";
export const DEV_SHOP_DOMAIN = "e-commerce-dev-v6yidmlw.myshopify.com";
/** Public account URL shop values. They never use the Shopify domain. */
export const PUBLIC_SHOP_PROD = "prod";
export const PUBLIC_SHOP_DEV = "dev";

/** Query flag: the previous page already found a saved studio session. */
export const FLOW_RESUME_PARAM = "vb_resume";

export function withFlowResumeFlag(url: string): string {
  try {
    const next = new URL(url, "https://viewbrush.local");
    next.searchParams.set(FLOW_RESUME_PARAM, "1");
    if (url.startsWith("http")) return next.toString();
    return `${next.pathname}${next.search}`;
  } catch {
    return url;
  }
}
