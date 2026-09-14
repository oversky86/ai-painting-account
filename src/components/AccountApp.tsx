"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import OrderWorkspace from "@/components/OrderWorkspace";
import {
  AccountFooter,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/StorefrontChrome";
import {
  AccountOverview,
  PaymentStatusPanel,
} from "@/components/LegacyAccountPanels";
import { createDesignPreviewOrder, designPreviewCustomer } from "@/lib/design-preview";
import type {
  AccountOrder,
  AccountView,
  CustomerSummary,
  GiftMessage,
  ModificationNote,
  OrderStage,
} from "@/lib/types";

type PublicConfig = {
  storefrontUrl: string;
  nativeAccountUrl: string;
  nativeAccountProfileUrl: string;
  createPath: string;
  cartPath: string;
  storeDomain?: string;
};

type MeResponse = {
  ok: boolean;
  customer?: CustomerSummary;
  orders?: AccountOrder[];
  csrf?: string;
  config?: PublicConfig;
  shop?: string;
  error?: string;
};

const previewStages = new Set<OrderStage>([
  "artwork",
  "review",
  "revision",
  "framing",
  "shipping",
  "complete",
]);

function shopFromLocation() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("shop") || "";
}

function previewStageFromLocation(): OrderStage | null {
  if (typeof window === "undefined") return null;
  const previewEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_DESIGN_PREVIEW === "true";
  if (!previewEnabled) return null;
  const value = new URLSearchParams(window.location.search).get("preview") as OrderStage | null;
  return value && previewStages.has(value) ? value : null;
}

function loginHref(returnPath?: string) {
  const path = returnPath || window.location.pathname || "/orders";
  const params = new URLSearchParams({ return_to: path });
  const shop = shopFromLocation();
  if (shop) params.set("shop", shop);
  return `/api/auth/login?${params.toString()}`;
}

function parsedNotes(note?: string): ModificationNote[] {
  if (!note) return [];
  try {
    const parsed = JSON.parse(note) as { notes?: ModificationNote[] };
    return Array.isArray(parsed.notes) ? parsed.notes : [];
  } catch {
    return [];
  }
}

export default function AccountApp({ initialView = "orders" }: { initialView?: AccountView }) {
  const [activeView, setActiveView] = useState<AccountView>(initialView);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [csrf, setCsrf] = useState("");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [designPreview, setDesignPreview] = useState(false);

  const reload = useCallback(async () => {
    const previewStage = previewStageFromLocation();
    if (previewStage) {
      const hasVersionHistory = new URLSearchParams(window.location.search).get("history") === "1";
      setCustomer(designPreviewCustomer);
      setOrders([createDesignPreviewOrder(previewStage, hasVersionHistory)]);
      setCsrf("design-preview");
      setConfig({
        storefrontUrl: "http://127.0.0.1:9292",
        nativeAccountUrl: "/account",
        nativeAccountProfileUrl: "/account/profile",
        createPath: "/products/custom-realism-oil-portrait?view=new-flow",
        cartPath: "/cart",
      });
      setDesignPreview(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const shop = shopFromLocation();
      const meUrl = shop ? `/api/me?shop=${encodeURIComponent(shop)}` : "/api/me";
      const response = await fetch(meUrl, { credentials: "same-origin" });
      if (response.status === 401) {
        window.location.href = loginHref(window.location.pathname);
        return;
      }
      if (response.status === 409) {
        const mismatch = (await response.json()) as MeResponse;
        const params = new URLSearchParams({ return_to: window.location.pathname || "/orders" });
        const nextShop = mismatch.shop || shop;
        if (nextShop) params.set("shop", nextShop);
        window.location.href = `/api/auth/login?${params.toString()}`;
        return;
      }
      const json = (await response.json()) as MeResponse;
      if (!json.ok || !json.customer) throw new Error(json.error || "Failed to load account");
      setCustomer(json.customer);
      setOrders(json.orders || []);
      setCsrf(json.csrf || "");
      setConfig(json.config || null);
      setDesignPreview(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const storefrontUrl = config?.storefrontUrl || "";
  const createUrl = storefrontUrl
    ? `${storefrontUrl}${config?.createPath || "/products/custom-realism-oil-portrait?view=new-flow"}`
    : config?.createPath || "/";
  const cartUrl = storefrontUrl ? `${storefrontUrl}${config?.cartPath || "/cart"}` : "/cart";

  const openView = (view: AccountView) => {
    setActiveView(view);
    setDetailOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("order");
    const path = view === "orders" ? "/orders" : view === "payment-status" ? "/payment-status" : "/account";
    window.history.replaceState(null, "", `${path}${url.search}`);
  };

  async function apiPost(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({ ok: false }));
    if (!response.ok || !json.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  const handleReview = async (order: AccountOrder, action: "approve" | "modify", note?: string) => {
    if (designPreview) {
      setOrders((current) => current.map((row) => row.id === order.id ? {
        ...row,
        orderStage: action === "approve" ? "framing" : "revision",
        reviewStatus: action === "approve" ? "approved" : "modify_requested",
        modificationNotes: action === "modify" ? parsedNotes(note) : row.modificationNotes,
        canReview: false,
      } : row));
      return;
    }
    await apiPost(`/api/orders/${encodeURIComponent(order.id)}/review`, {
      action,
      note: note || "",
      orderName: order.name,
    });
    await reload();
  };

  const handleSaveGift = async (order: AccountOrder, giftMessage: GiftMessage | null) => {
    if (designPreview) {
      setOrders((current) => current.map((row) => row.id === order.id ? { ...row, giftMessage } : row));
      return;
    }
    await apiPost(`/api/orders/${encodeURIComponent(order.id)}/gift`, { giftMessage });
    await reload();
  };

  const usesAccountFooter = !loading && Boolean(customer);
  const footerContext = detailOpen
    ? "order-detail"
    : activeView === "account"
      ? "account"
      : "orders";

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF8F3] text-[#2D241B]">
      <StorefrontHeader storefrontUrl={storefrontUrl} createUrl={createUrl} cartUrl={cartUrl} />
      <main className={`mx-auto w-full max-w-[1280px] flex-1 px-4 pt-[88px] sm:px-6 lg:px-10 ${usesAccountFooter ? "pb-12" : "pb-[120px]"} ${detailOpen ? "lg:pt-[84px]" : "lg:pt-[112px]"}`}>
        {loading ? <p className="min-h-[240px] text-sm text-[#5F564B]" aria-live="polite">Loading your workspace…</p> : null}
        {!loading && (error || !customer) ? (
          <section className="min-h-[240px] rounded-[8px] border border-[#DCCFBC] bg-white p-6">
            <h1 className="text-2xl font-semibold">Unable to load account</h1>
            <p className="mt-3 text-sm text-[#5F564B]">{error || "Please sign in again."}</p>
            <a href={loginHref("/orders")} className="mt-6 inline-flex min-h-12 items-center rounded-[8px] bg-[#31271F] px-6 text-white">Sign in</a>
          </section>
        ) : null}
        {!loading && customer ? (
          <>
            {!detailOpen ? <AccountHero customer={customer} onSignOut={() => { window.location.href = "/api/auth/logout"; }} /> : null}
            {!detailOpen ? <AccountTabs activeView={activeView} onSelect={openView} /> : null}
            <section className={detailOpen ? "" : "mt-5"}>
              {activeView === "orders" ? (
                <OrderWorkspace
                  orders={orders}
                  customer={customer}
                  onCreate={() => { window.location.href = createUrl; }}
                  onReview={handleReview}
                  onSaveGift={handleSaveGift}
                  onDetailChange={setDetailOpen}
                />
              ) : null}
              {activeView === "payment-status" ? <PaymentStatusPanel accountOrders={orders} onCreate={() => { window.location.href = createUrl; }} /> : null}
              {activeView === "account" ? <AccountOverview customer={customer} profileUrl={config?.nativeAccountProfileUrl || config?.nativeAccountUrl || "#"} /> : null}
            </section>
          </>
        ) : null}
      </main>
      {usesAccountFooter ? (
        <AccountFooter storefrontUrl={storefrontUrl} context={footerContext} />
      ) : (
        <StorefrontFooter storefrontUrl={storefrontUrl} />
      )}
    </div>
  );
}

function AccountHero({ customer, onSignOut }: { customer: CustomerSummary; onSignOut: () => void }) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  return <section className="lg:flex lg:items-end lg:justify-between"><div><h1 className="text-[28px] font-semibold leading-8 text-[#241C16] lg:text-[42px] lg:leading-[45px]">Welcome back, {customer.firstName || "friend"}</h1><p className="mt-2 text-sm text-[#5F564B] lg:mt-4 lg:text-base"><strong className="font-semibold text-[#241C16]">{fullName || customer.email}</strong><span className="mx-2 lg:mx-4">·</span>{customer.email}</p></div><button type="button" onClick={onSignOut} className="ui-outline-control hidden min-h-[50px] items-center gap-2 rounded-[8px] border border-[#DCCFBC] bg-white/70 px-5 text-base lg:inline-flex"><LogOut size={16} /> Sign Out</button></section>;
}

function AccountTabs({ activeView, onSelect }: { activeView: AccountView; onSelect: (view: AccountView) => void }) {
  const tabs: Array<[AccountView,string]> = [["orders","All Orders"],["payment-status","Payment Status"],["account","My Account"]];
  return <div className="mt-7 border-b border-[#DCCFBC] lg:mt-12"><div role="tablist" aria-label="Account views" className="flex justify-between gap-3 lg:justify-start lg:gap-7">{tabs.map(([view,label]) => <button key={view} type="button" role="tab" aria-selected={activeView === view} onClick={() => onSelect(view)} className={`relative min-h-11 pb-3 text-[15px] lg:text-base ${activeView === view ? "font-semibold text-[#241C16] after:absolute after:bottom-[-1px] after:left-0 after:h-1 after:w-full after:rounded-full after:bg-[#35261E]" : "text-[#5F564B]"}`}>{label}</button>)}</div></div>;
}
