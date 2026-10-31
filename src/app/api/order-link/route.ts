import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/env";
import { postSignedWrite } from "@/lib/hmac";
import { guestCustomer, guestOrder } from "@/lib/guest-order";
import { clearOrderLinkCookie, ensureCsrf } from "@/lib/session";
import { resolveShopConfig } from "@/lib/shops";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    orderId?: string;
  };
  await clearOrderLinkCookie();
  const token = (body.token || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const res = await postSignedWrite("/api/account/order-link", {
    token,
    orderId: body.orderId || "",
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    shop?: string;
    shopKey?: string;
    exp?: number;
    order?: Parameters<typeof guestOrder>[0];
    orders?: Array<Parameters<typeof guestOrder>[0]>;
    error?: string;
  } | null;
  if (!res.ok || !json?.ok || !json.order || !json.shop) {
    return NextResponse.json(
      { ok: false, error: json?.error || "unauthorized" },
      { status: res.status || 401 },
    );
  }

  const remaining = Math.floor((json.exp || 0) - Date.now() / 1000);
  if (remaining <= 0) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const shop = resolveShopConfig(json.shopKey || json.shop);
  const csrf = await ensureCsrf();
  const snapshots = json.orders?.length ? json.orders : [json.order];
  return NextResponse.json({
    ok: true,
    guest: true,
    customer: guestCustomer(json.order),
    orders: snapshots.map((snapshot) => guestOrder(snapshot)),
    linkOrderId: json.order.id,
    csrf,
    config: getPublicConfig(shop),
    shop: json.shopKey || json.shop,
  });
}
