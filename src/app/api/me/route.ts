import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/auth";
import { clearOrderLinkCookie, ensureCsrf, setShopHint } from "@/lib/session";
import { getPublicConfig } from "@/lib/env";
import { loadWorkspace } from "@/lib/orders";
import {
  normalizeShopDomain,
  publicShopKey,
  resolveRequestedShop,
} from "@/lib/shops";

export async function GET(request: NextRequest) {
  const session = await getValidSession();
  if (!session) {
    await clearOrderLinkCookie();
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const shop = resolveRequestedShop(request.nextUrl.searchParams.get("shop"));

  // Logged into a different shop than the URL asks for → force re-auth
  if (
    session.shopDomain &&
    normalizeShopDomain(session.shopDomain) !== shop.storeDomain
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "shop_mismatch",
        shop: publicShopKey(shop.storeDomain),
      },
      { status: 409 },
    );
  }

  try {
    await setShopHint(shop.storeDomain);
    const { customer, orders } = await loadWorkspace(
      session.accessToken,
      shop,
    );
    const csrf = await ensureCsrf();
    return NextResponse.json({
      ok: true,
      customer,
      orders,
      csrf,
      config: getPublicConfig(shop),
      shop: publicShopKey(shop.storeDomain),
      savedArtworkCount: 0,
    });
  } catch (err) {
    console.error("[api/me]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 },
    );
  }
}
