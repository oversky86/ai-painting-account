import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/session";
import { postSignedWrite } from "@/lib/hmac";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getValidSession();
  if (!session?.customerId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    await assertCsrf(request);
  } catch {
    return NextResponse.json({ ok: false, error: "csrf" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    giftMessage?: {
      title: string;
      sender: string;
      recipient: string;
      message: string;
    } | null;
  };

  const res = await postSignedWrite("/api/account/order-write", {
    type: "gift",
    shop: session.shopDomain,
    orderId: decodeURIComponent(id),
    customerId: session.customerId,
    giftMessage: body.giftMessage,
  });
  const json = await res.json().catch(() => ({ ok: false }));
  return NextResponse.json(json, { status: res.status });
}
