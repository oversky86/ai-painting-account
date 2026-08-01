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
    action?: "approve" | "modify";
    note?: string;
    orderName?: string;
  };

  if (!body.action) {
    return NextResponse.json(
      { ok: false, error: "action required" },
      { status: 400 },
    );
  }

  const res = await postSignedWrite("/api/account/order-write", {
    type: "review",
    orderId: decodeURIComponent(id),
    customerId: session.customerId,
    action: body.action,
    note: body.note || "",
    orderName: body.orderName || "",
  });
  const json = await res.json().catch(() => ({ ok: false }));
  return NextResponse.json(json, { status: res.status });
}
