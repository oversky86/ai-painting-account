import { NextResponse } from "next/server";
import { getValidSession } from "@/lib/auth";
import { ensureCsrf } from "@/lib/session";
import { getPublicConfig } from "@/lib/env";
import { loadWorkspace } from "@/lib/orders";

export async function GET() {
  const session = await getValidSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const { customer, orders } = await loadWorkspace(session.accessToken);
    const csrf = await ensureCsrf();
    return NextResponse.json({
      ok: true,
      customer,
      orders,
      csrf,
      config: getPublicConfig(),
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
