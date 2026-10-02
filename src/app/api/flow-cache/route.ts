import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/auth";
import { postSignedWrite } from "@/lib/hmac";
import { resolveShopConfig, tryResolveShopConfig } from "@/lib/shops";

export async function GET(request: NextRequest) {
  const session = await getValidSession();
  if (!session?.customerId) {
    return NextResponse.json({ ok: true, cached: false });
  }

  const shopParam = request.nextUrl.searchParams.get("shop");
  let shop;
  try {
    shop = resolveShopConfig(shopParam || session.shopDomain);
  } catch {
    shop = tryResolveShopConfig(session.shopDomain);
  }

  try {
    const res = await postSignedWrite("/api/account/flow-cache", {
      shop: shop.storeDomain,
      customerId: session.customerId,
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; cached?: boolean } | null;
    return NextResponse.json({ ok: true, cached: !!json?.cached });
  } catch (error) {
    console.error("[flow-cache]", error);
    return NextResponse.json({ ok: true, cached: false });
  }
}
