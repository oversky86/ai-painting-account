import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/auth";
import { ensureCsrf, getShopHint, setShopHint } from "@/lib/session";
import { getPublicConfig } from "@/lib/env";
import { loadWorkspace } from "@/lib/orders";
import {
  normalizeShopDomain,
  resolveShopConfig,
  tryResolveShopConfig,
} from "@/lib/shops";

export async function GET(request: NextRequest) {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const shopParam = request.nextUrl.searchParams.get("shop");
  const hint = shopParam || (await getShopHint()) || session.shopDomain;
  let shop;
  try {
    shop = resolveShopConfig(hint);
  } catch {
    shop = tryResolveShopConfig(session.shopDomain);
  }

  // Logged into a different shop than the URL asks for → force re-auth
  if (
    session.shopDomain &&
    normalizeShopDomain(session.shopDomain) !== shop.storeDomain
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "shop_mismatch",
        shop: shop.storeDomain,
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
      shop: shop.storeDomain,
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
