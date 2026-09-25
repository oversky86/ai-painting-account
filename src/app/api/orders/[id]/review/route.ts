import { NextRequest, NextResponse } from "next/server";
import { getValidSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/session";
import { postSignedWrite } from "@/lib/hmac";
import type { ModificationNote } from "@/lib/types";

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
    notes?: ModificationNote[];
    orderName?: string;
  };

  if (!body.action) {
    return NextResponse.json(
      { ok: false, error: "action required" },
      { status: 400 },
    );
  }

  let notes = Array.isArray(body.notes) ? body.notes : [];
  if (!notes.length && body.note) {
    try {
      const parsed = JSON.parse(body.note) as { notes?: ModificationNote[] };
      if (Array.isArray(parsed.notes)) notes = parsed.notes;
    } catch {
      /* plain text note handled by pet app */
    }
  }

  const res = await postSignedWrite("/api/account/order-write", {
    type: "review",
    shop: session.shopDomain,
    orderId: decodeURIComponent(id),
    customerId: session.customerId,
    action: body.action,
    notes,
    note: body.note || "",
    orderName: body.orderName || "",
  });
  const json = await res.json().catch(() => ({ ok: false }));
  return NextResponse.json(json, { status: res.status });
}
