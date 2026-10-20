import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/env";
import { postSignedWrite } from "@/lib/hmac";
import { guestCustomer, guestOrder } from "@/lib/guest-order";
import {
  clearOrderLinkCookie,
  ensureCsrf,
  getOrderLinkCookie,
  setOrderLinkCookie,
} from "@/lib/session";
import { resolveShopConfig } from "@/lib/shops";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    orderId?: string;
  };
  const token = (body.token || (await getOrderLinkCookie()) || "").trim();
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
    error?: string;
  } | null;
  if (!res.ok || !json?.ok || !json.order || !json.shop) {
    await clearOrderLinkCookie();
    return NextResponse.json(
      { ok: false, error: json?.error || "unauthorized" },
      { status: res.status || 401 },
    );
  }

  const remaining = Math.floor((json.exp || 0) - Date.now() / 1000);
  if (remaining <= 0) {
    await clearOrderLinkCookie();
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await setOrderLinkCookie(token, remaining);
  const shop = resolveShopConfig(json.shopKey || json.shop);
  const csrf = await ensureCsrf();
  return NextResponse.json({
    ok: true,
    guest: true,
    customer: guestCustomer(json.order),
    orders: [guestOrder(json.order)],
    csrf,
    config: getPublicConfig(shop),
    shop: json.shopKey || json.shop,
  });
}
