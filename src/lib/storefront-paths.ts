/** Homepage header "Create Artwork" href. Matches theme/piktura sections/header.liquid. */
export const STOREFRONT_CREATE_PATH = "/products/custom-oil-painting";

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
