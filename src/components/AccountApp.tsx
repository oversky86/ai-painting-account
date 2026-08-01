"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  Check,
  Gift,
  ImageIcon,
  LogOut,
  Maximize2,
  Paintbrush,
  PlayCircle,
  Truck,
  X,
  ZoomIn,
} from "lucide-react";
import { getButtonClasses, getInputClasses } from "@/lib/theme";
import {
  getOrderStageCopy,
  getOrderStatusBadgeClasses,
  isCompletedOrderStage,
} from "@/lib/order-stage";
import type {
  AccountOrder,
  AccountView,
  AddressRecord,
  CustomerSummary,
  GiftMessage,
  OrderStage,
  PaymentChargeRow,
  UpcomingChargeRow,
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
  savedArtworkCount?: number;
  error?: string;
};

function shopFromLocation(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("shop") || "";
}

function loginHref(returnPath?: string): string {
  const path = returnPath || window.location.pathname || "/orders";
  const params = new URLSearchParams({ return_to: path });
  const shop = shopFromLocation();
  if (shop) params.set("shop", shop);
  return `/api/auth/login?${params.toString()}`;
}

export default function AccountApp({ initialView = "orders" }: { initialView?: AccountView }) {
  const [activeView, setActiveView] = useState<AccountView>(initialView);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [csrf, setCsrf] = useState("");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [savedArtworkCount, setSavedArtworkCount] = useState(0);
  const viewSwitchRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const shop = shopFromLocation();
      const meUrl = shop
        ? `/api/me?shop=${encodeURIComponent(shop)}`
        : "/api/me";
      const res = await fetch(meUrl, { credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = loginHref(window.location.pathname);
        return;
      }
      if (res.status === 409) {
        const mismatch = (await res.json()) as MeResponse;
        const params = new URLSearchParams({
          return_to: window.location.pathname || "/orders",
        });
        const nextShop = mismatch.shop || shop;
        if (nextShop) params.set("shop", nextShop);
        window.location.href = `/api/auth/login?${params.toString()}`;
        return;
      }
      const json = (await res.json()) as MeResponse;
      if (!json.ok || !json.customer) {
        throw new Error(json.error || "Failed to load account");
      }
      setCustomer(json.customer);
      setOrders(json.orders || []);
      setCsrf(json.csrf || "");
      setConfig(json.config || null);
      setSavedArtworkCount(json.savedArtworkCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
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

  const scrollToViewSwitch = () => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    window.requestAnimationFrame(() => {
      if (!viewSwitchRef.current) return;
      const top =
        viewSwitchRef.current.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  };

  const openView = (view: AccountView, options?: { revealTabs?: boolean }) => {
    setActiveView(view);
    if (options?.revealTabs) scrollToViewSwitch();
    const path =
      view === "orders"
        ? "/orders"
        : view === "payment-status"
          ? "/payment-status"
          : "/account";
    window.history.replaceState(null, "", path);
  };

  const createUrl = config?.storefrontUrl
    ? `${config.storefrontUrl}${config.createPath}`
    : config?.createPath || "/products/custom-oil-painting";
  const cartUrl = config?.storefrontUrl
    ? `${config.storefrontUrl}${config.cartPath}`
    : "/cart";
  const profileUrl =
    config?.nativeAccountProfileUrl || config?.nativeAccountUrl || "#";

  const completedOrderCount = useMemo(
    () => orders.filter((o) => isCompletedOrderStage(o.orderStage)).length,
    [orders],
  );

  async function apiPost(path: string, body: unknown) {
    const res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Request failed");
    }
    return json;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] pt-16 text-[#2D241B]">
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-[120px] pt-8 sm:px-6 lg:px-10 lg:pt-12">
          <p className="text-sm text-[#5F564B]">Loading your workspace…</p>
        </main>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] pt-16 text-[#2D241B]">
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-[120px] pt-8">
          <p className="text-sm text-[#5F564B]">{error || "Unable to load account."}</p>
          <a href={loginHref("/orders")} className={getButtonClasses("primary", "mt-6 px-5 py-3 text-sm")}>
            Sign in
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F3] pt-16 text-[#2D241B]">
      <main className="mx-auto w-full max-w-[1280px] px-4 pb-[120px] pt-8 sm:px-6 lg:px-10 lg:pt-12">
        <AccountHero
          customer={customer}
          orderCount={orders.length}
          completedOrderCount={completedOrderCount}
          savedArtworkCount={savedArtworkCount}
          onCreate={() => {
            window.location.href = createUrl;
          }}
          onOpenCart={() => {
            window.location.href = cartUrl;
          }}
          onOpenOrders={() => openView("orders", { revealTabs: true })}
          onSignOut={() => {
            window.location.href = "/api/auth/logout";
          }}
        />

        <div ref={viewSwitchRef} className="mt-8">
          <AccountViewSwitch activeView={activeView} onSelect={(v) => openView(v)} />
          <section className="mt-8 min-w-0">
            {activeView === "account" && (
              <AccountOverview customer={customer} profileUrl={profileUrl} />
            )}
            {activeView === "orders" && (
              <Orders
                accountOrders={orders}
                customerEmail={customer.email}
                onCreate={() => {
                  window.location.href = createUrl;
                }}
                onRefresh={reload}
                onReview={async (order, action, note) => {
                  await apiPost(
                    `/api/orders/${encodeURIComponent(order.id)}/review`,
                    { action, note, orderName: order.name },
                  );
                  await reload();
                }}
                onSaveGift={async (order, giftMessage) => {
                  await apiPost(
                    `/api/orders/${encodeURIComponent(order.id)}/gift`,
                    { giftMessage },
                  );
                  await reload();
                }}
                onSaveShipping={async (order, address) => {
                  await apiPost(
                    `/api/orders/${encodeURIComponent(order.id)}/shipping`,
                    { address },
                  );
                  await reload();
                }}
              />
            )}
            {activeView === "payment-status" && (
              <PaymentStatusPanel
                accountOrders={orders}
                onCreate={() => {
                  window.location.href = createUrl;
                }}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function AccountHero({
  customer,
  orderCount,
  completedOrderCount,
  savedArtworkCount,
  onCreate,
  onOpenCart,
  onOpenOrders,
  onSignOut,
}: {
  customer: CustomerSummary;
  orderCount: number;
  completedOrderCount: number;
  savedArtworkCount: number;
  onCreate: () => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  onSignOut: () => void;
}) {
  const stats = [
    { label: "Saved Artwork", value: String(savedArtworkCount), onClick: onOpenCart },
    { label: "Orders", value: String(orderCount), onClick: onOpenOrders },
    {
      label: "Completed Orders",
      value: String(completedOrderCount),
      onClick: onOpenOrders,
    },
  ];
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();

  return (
    <section className="pb-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[42px] font-semibold leading-[1.08] text-[#241C16]">
            Welcome back, {customer.firstName || "friend"}
          </h1>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-base text-[#5F564B]">
            <span className="font-semibold text-[#241C16]">{fullName || customer.email}</span>
            <span>{customer.email}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onCreate} className={getButtonClasses("primary", "gap-2 px-5 py-3 text-sm")}>
            <Paintbrush size={16} />
            Create Artwork
          </button>
          <button type="button" onClick={onSignOut} className={getButtonClasses("outline", "gap-2 px-5 py-3 text-sm")}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className="rounded-[8px] border border-[#D8C7B8] bg-white/72 px-5 py-4 text-left transition enabled:hover:border-[#A58964] enabled:hover:bg-[#F7F0E6]"
          >
            <p className="text-xs font-semibold text-[#6E6254]">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#241C16]">{stat.value}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function AccountViewSwitch({
  activeView,
  onSelect,
}: {
  activeView: AccountView;
  onSelect: (view: AccountView) => void;
}) {
  const tabs: Array<{ view: AccountView; label: string }> = [
    { view: "orders", label: "My Orders" },
    { view: "payment-status", label: "Payment Status" },
    { view: "account", label: "My Account" },
  ];

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-[#DCCFBC] bg-[#FBF8F3]/96 px-4 pb-0 pt-5 backdrop-blur-sm md:static md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      <div className="flex gap-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.view}
            type="button"
            onClick={() => onSelect(tab.view)}
            style={{ fontWeight: activeView === tab.view ? 900 : 400 }}
            className={`relative min-w-max pb-4 text-left transition after:absolute after:bottom-[-1px] after:left-0 after:h-[4px] after:w-full after:transition ${
              activeView === tab.view
                ? "text-[18px] text-[#241C16] after:bg-[#31271F]"
                : "text-[17px] text-[#6B6155] after:bg-transparent hover:text-[#2D241B]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-[26px] font-semibold text-[#241C16] md:text-[30px]">{title}</h2>;
}

function AccountOverview({
  customer,
  profileUrl,
}: {
  customer: CustomerSummary;
  profileUrl: string;
}) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const shipping = customer.defaultAddress;
  const billing = customer.addresses[0] || customer.defaultAddress;

  return (
    <div className="space-y-14">
      <section>
        <SectionTitle title="Account Information" />
        <div className="grid gap-4 pt-6 lg:grid-cols-2">
          <div className="min-h-[184px] rounded-[8px] border border-[#DCCFBC] bg-white/82 p-5 shadow-[0_12px_28px_rgba(43,31,21,0.04)] md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Contact Information</p>
            <div className="mt-5 space-y-3 text-base font-semibold text-[#241C16]">
              <p>{fullName || "—"}</p>
              <p>{customer.email}</p>
            </div>
            <div className="mt-5 flex items-center gap-4 text-sm font-semibold">
              <a href={profileUrl} className="text-[#31271F] underline underline-offset-4 transition hover:text-[#6E6254]">
                Edit
              </a>
              <span className="h-4 w-px bg-[#DCCFBC]" />
              <a href={profileUrl} className="text-[#31271F] underline underline-offset-4 transition hover:text-[#6E6254]">
                Change Password
              </a>
            </div>
          </div>
          <div className="min-h-[184px] rounded-[8px] border border-[#DCCFBC] bg-white/82 p-5 shadow-[0_12px_28px_rgba(43,31,21,0.04)] md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Email Subscription</p>
            <p className="mt-5 text-base font-semibold text-[#241C16]">
              {customer.isSubscribed
                ? "You are subscribed to email updates."
                : "You aren't subscribed to email updates."}
            </p>
            <a
              href={profileUrl}
              className="mt-5 inline-block text-sm font-semibold text-[#31271F] underline underline-offset-4 transition hover:text-[#6E6254]"
            >
              Edit
            </a>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <SectionTitle title="Address Book" />
          <a href={profileUrl} className="text-sm font-semibold text-[#31271F] underline underline-offset-4">
            Manage Addresses
          </a>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <AddressCard
            label="Billing Address"
            address={billing}
            emptyText="No billing address on file."
            editUrl={profileUrl}
          />
          <AddressCard
            label="Shipping Address"
            address={shipping}
            emptyText="No shipping address on file."
            editUrl={profileUrl}
          />
        </div>
      </section>
    </div>
  );
}

function AddressCard({
  label,
  address,
  emptyText,
  editUrl,
}: {
  label: string;
  address: AddressRecord | null | undefined;
  emptyText: string;
  editUrl: string;
}) {
  return (
    <div className="min-h-[184px] rounded-[8px] border border-[#DCCFBC] bg-white/82 p-5 shadow-[0_12px_28px_rgba(43,31,21,0.04)] md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">{label}</p>
      {address ? (
        <div className="mt-5 space-y-1 text-sm leading-6 text-[#241C16]">
          <p className="font-semibold">{address.fullName}</p>
          <p>{address.street}</p>
          <p>
            {address.city}
            {address.region ? `, ${address.region}` : ""} {address.postalCode}
          </p>
          <p>{address.country}</p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-[#5F564B]">{emptyText}</p>
      )}
      <a href={editUrl} className="mt-5 inline-block text-sm font-semibold text-[#31271F] underline underline-offset-4">
        Edit
      </a>
    </div>
  );
}

function Orders({
  accountOrders,
  customerEmail,
  onCreate,
  onReview,
  onSaveGift,
  onSaveShipping,
}: {
  accountOrders: AccountOrder[];
  customerEmail: string;
  onCreate: () => void;
  onRefresh: () => Promise<void>;
  onReview: (
    order: AccountOrder,
    action: "approve" | "modify",
    note?: string,
  ) => Promise<void>;
  onSaveGift: (order: AccountOrder, gift: GiftMessage | null) => Promise<void>;
  onSaveShipping: (order: AccountOrder, address: AddressRecord) => Promise<void>;
}) {
  if (!accountOrders.length) {
    return (
      <section className="rounded-[8px] border border-[#DCCFBC] bg-white/82 p-8 shadow-[0_18px_38px_rgba(43,31,21,0.05)]">
        <div className="max-w-[560px]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">My Orders</p>
          <h2 className="mt-3 text-[26px] font-semibold leading-tight text-[#241C16] md:text-[30px]">
            No orders yet
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#5F564B]">
            Start your first ViewBrush portrait and track every studio step here.
          </p>
          <button type="button" onClick={onCreate} className={getButtonClasses("primary", "mt-7 px-5 py-3 text-sm")}>
            Start Your Painting
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">ViewBrush Orders</p>
        <h2 className="mt-2 text-[26px] font-semibold leading-tight text-[#241C16] md:text-[30px]">My Orders</h2>
        <p className="mt-3 text-sm leading-7 text-[#5F564B]">
          {accountOrders.length} {accountOrders.length === 1 ? "order is" : "orders are"} saved to this
          workspace. The newest order appears first.
        </p>
      </div>
      <div className="space-y-5">
        {accountOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            customerEmail={customerEmail}
            onReview={onReview}
            onSaveGift={onSaveGift}
            onSaveShipping={onSaveShipping}
          />
        ))}
      </div>
    </section>
  );
}

function OrderCard({
  order,
  customerEmail,
  onReview,
  onSaveGift,
  onSaveShipping,
}: {
  order: AccountOrder;
  customerEmail: string;
  onReview: (
    order: AccountOrder,
    action: "approve" | "modify",
    note?: string,
  ) => Promise<void>;
  onSaveGift: (order: AccountOrder, gift: GiftMessage | null) => Promise<void>;
  onSaveShipping: (order: AccountOrder, address: AddressRecord) => Promise<void>;
}) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isGiftOrder, setIsGiftOrder] = useState(Boolean(order.giftMessage));
  const [busy, setBusy] = useState(false);
  const stage = order.orderStage;
  const copy = getOrderStageCopy(stage);
  const artwork = order.media.paintingUrl || order.media.photoUrl;
  const presentation = [order.media.finishLabel, order.media.size, order.deliveryLabel]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <article className="grid gap-5 rounded-[8px] border border-[#DCCFBC] bg-white/86 p-5 shadow-[0_18px_38px_rgba(43,31,21,0.05)] xl:grid-cols-[148px_minmax(0,1fr)_260px] xl:p-6">
        <div className="overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#F3EBDE]">
          {artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork}
              alt={order.media.conceptTitle || order.name}
              className="aspect-square w-full object-cover"
              width={148}
              height={148}
            />
          ) : (
            <div className="flex aspect-square items-center justify-center text-[#8F816C]">
              <ImageIcon size={28} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">
            {presentation || "Custom oil painting"}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[#241C16]">
            {order.media.conceptTitle || order.name}
          </h3>
          <span className={getOrderStatusBadgeClasses(stage)}>{copy.current}</span>
          <OrderProgress orderStage={stage} />
          <div className="grid gap-4 border-t border-[#E5DCCF] pt-5 lg:grid-cols-2">
            <StatusBlock label="Current Status" value={copy.current} description={copy.currentDescription} />
            <StatusBlock label="Next Status" value={copy.next} description={copy.nextDescription} />
          </div>
          <div className="mt-5 grid gap-4 border-t border-[#E5DCCF] pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <OrderMeta label="Order #" value={order.name} />
            <OrderMeta label="Payment" value={String(order.paymentStatusLabel)} />
            <OrderMeta label="Delivery" value={order.deliveryLabel} />
            <OrderMeta label="Total" value={order.total} />
          </div>
          <div className="mt-4 rounded-[8px] border border-[#E5DCCF] bg-[#FBF8F3] px-4 py-3 text-sm leading-6 text-[#5F564B]">
            Order access is linked to{" "}
            <span className="font-semibold text-[#241C16]">
              {order.email || customerEmail || "your account email"}
            </span>
            .
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="rounded-[8px] bg-[#31271F] px-5 py-3 text-sm font-semibold text-[#FBF8F3] transition hover:bg-[#241C16]"
          >
            {stage === "review" || stage === "revision" ? "Review Portrait" : "View Portrait"}
          </button>
          <label className="mt-2 flex items-start gap-3 text-sm font-semibold text-[#4F4437]">
            <input
              type="checkbox"
              checked={isGiftOrder}
              disabled={!order.canEditGift || busy}
              onChange={(event) => {
                setIsGiftOrder(event.target.checked);
                if (event.target.checked) setIsGiftOpen(true);
                else {
                  void (async () => {
                    setBusy(true);
                    try {
                      await onSaveGift(order, null);
                    } finally {
                      setBusy(false);
                    }
                  })();
                }
              }}
              className="mt-0.5 h-4 w-4 rounded-[3px] border border-[#DCCFBC] accent-[#31271F]"
            />
            <span>This is a gift.</span>
          </label>
          <button
            type="button"
            disabled={!order.canEditGift || busy}
            onClick={() => {
              setIsGiftOrder(true);
              setIsGiftOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#D8CBB8] bg-white/72 px-5 py-3 text-sm font-semibold text-[#31271F] transition hover:bg-[#F3EBDE] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Gift size={16} />
            {order.giftMessage ? "Edit Gift Message" : "Add Gift Message"}
          </button>
          {!order.canEditGift && order.editBlockedReason && (
            <p className="text-xs text-[#8F816C]">{order.editBlockedReason}</p>
          )}
          {order.giftMessage && (
            <p className="text-xs font-semibold text-[#5F564B]">
              Gift message added for {order.giftMessage.recipient}.
            </p>
          )}
          {(stage === "shipping" || stage === "complete" || stage === "framing") && (
            <>
              <button
                type="button"
                disabled={!order.canEditShipping || busy}
                onClick={() => setIsShippingOpen(true)}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#31271F] underline underline-offset-4 transition hover:text-[#6E6254] disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
              >
                <Truck size={16} />
                View / Update Shipping
              </button>
              {order.shippingAddress && (
                <p className="text-xs leading-5 text-[#5F564B]">
                  Shipping to {order.shippingAddress.city}, {order.shippingAddress.region}.
                </p>
              )}
            </>
          )}
        </aside>
      </article>

      {isReviewOpen && (
        <ReviewPortraitModal
          order={order}
          canAct={order.canReview}
          busy={busy}
          onClose={() => setIsReviewOpen(false)}
          onApprove={async () => {
            setBusy(true);
            try {
              await onReview(order, "approve");
              setIsReviewOpen(false);
            } finally {
              setBusy(false);
            }
          }}
          onRequestModification={async (note) => {
            setBusy(true);
            try {
              await onReview(order, "modify", note);
              setIsReviewOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {isGiftOpen && (
        <GiftMessageModal
          initialMessage={order.giftMessage}
          onClose={() => {
            setIsGiftOpen(false);
            if (!order.giftMessage) setIsGiftOrder(false);
          }}
          onSave={async (message) => {
            setBusy(true);
            try {
              await onSaveGift(order, message);
              setIsGiftOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {isShippingOpen && (
        <ShippingAddressModal
          address={order.shippingAddress}
          disabled={!order.canEditShipping}
          blockedReason={order.editBlockedReason}
          onClose={() => setIsShippingOpen(false)}
          onSave={async (address) => {
            setBusy(true);
            try {
              await onSaveShipping(order, address);
              setIsShippingOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </>
  );
}

function OrderProgress({ orderStage }: { orderStage: OrderStage }) {
  const completedStepMap: Record<OrderStage, number> = {
    review: 2,
    revision: 2,
    framing: 3,
    shipping: 3,
    complete: 3,
  };
  const currentStepMap: Record<OrderStage, string> = {
    review: "Portrait Review",
    revision: "Portrait Review",
    framing: "Shipping",
    shipping: "Shipping",
    complete: "Shipping",
  };
  const steps = [
    { label: "Payment Complete", index: 1 },
    { label: "Portrait Review", index: 2 },
    { label: "Shipping", index: 3 },
  ];
  const completedStep = completedStepMap[orderStage];
  const currentStep = currentStepMap[orderStage];

  return (
    <div className="my-6 grid gap-2 sm:grid-cols-3">
      {steps.map((step) => (
        <div key={step.label}>
          <div
            className={`h-1 rounded-full ${
              step.index <= completedStep ? "bg-[#31271F]" : "bg-[#E5DCCF]"
            }`}
          />
          <p
            className={`mt-2 text-xs font-semibold ${
              step.label === currentStep ? "text-[#241C16]" : "text-[#8F816C]"
            }`}
          >
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusBlock({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#241C16]">{value}</p>
      <p className="mt-1 text-sm leading-6 text-[#5F564B]">{description}</p>
    </div>
  );
}

function OrderMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#8F816C]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#241C16]">{value}</p>
    </div>
  );
}

function ReviewPortraitModal({
  order,
  canAct,
  busy,
  onClose,
  onApprove,
  onRequestModification,
}: {
  order: AccountOrder;
  canAct: boolean;
  busy: boolean;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onRequestModification: (note: string) => Promise<void>;
}) {
  const artworkImage = order.media.paintingUrl || order.media.photoUrl || null;
  const detailImage = order.media.photoUrl || null;
  const videoSrc = order.media.videoUrl || null;
  const [previewMode, setPreviewMode] = useState<"artwork" | "detail" | "video">("artwork");
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth < 768 : false),
  );
  const [mobilePreviewAsset, setMobilePreviewAsset] = useState<{
    label: string;
    image: string | null;
    isVideo?: boolean;
  } | null>(null);
  const [showModify, setShowModify] = useState(false);
  const [note, setNote] = useState("");
  const previewImage = previewMode === "detail" ? detailImage : artworkImage;
  const presentation = [order.media.finishLabel, order.media.frameLabel]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#241C16]/58 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-h-[calc(100dvh-32px)] max-w-[1160px] flex-col overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3] shadow-[0_30px_80px_rgba(20,14,10,0.35)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#DCCFBC] px-5 py-4">
          <h2 className="text-xl font-semibold text-[#241C16]">Review Portrait</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-2 text-[#31271F] transition hover:bg-[#F3EBDE]"
            aria-label="Close review portrait"
          >
            <X size={24} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.25fr)_380px] lg:p-8">
            <div className="min-w-0">
              {!isMobileViewport && (
                <ZoomableReviewPreview
                  alt={order.media.conceptTitle || order.name}
                  image={previewImage}
                  isVideo={previewMode === "video"}
                  videoSrc={videoSrc}
                />
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                <ReviewThumb
                  label="Artwork Photo"
                  icon={<ZoomIn size={24} />}
                  image={artworkImage}
                  isSelected={!isMobileViewport && previewMode === "artwork"}
                  onSelect={() =>
                    isMobileViewport
                      ? setMobilePreviewAsset({ label: "Artwork Photo", image: artworkImage })
                      : setPreviewMode("artwork")
                  }
                />
                <ReviewThumb
                  label="Detail View"
                  icon={<ZoomIn size={24} />}
                  image={detailImage}
                  isSelected={!isMobileViewport && previewMode === "detail"}
                  onSelect={() =>
                    isMobileViewport
                      ? setMobilePreviewAsset({ label: "Detail View", image: detailImage })
                      : setPreviewMode("detail")
                  }
                />
                {videoSrc && (
                  <ReviewThumb
                    label="Studio Video"
                    icon={<PlayCircle size={28} />}
                    image={artworkImage}
                    isSelected={!isMobileViewport && previewMode === "video"}
                    mobileSpanFull
                    onSelect={() =>
                      isMobileViewport
                        ? setMobilePreviewAsset({
                            label: "Studio Video",
                            image: artworkImage,
                            isVideo: true,
                          })
                        : setPreviewMode("video")
                    }
                  />
                )}
              </div>
            </div>
            <aside className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">
                  Artwork Review
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-[#241C16]">Your portrait is ready.</h3>
                <p className="mt-4 text-sm leading-7 text-[#5F564B]">
                  Review the finished artwork and approve it for shipping, or ask the artist for a
                  modification before the studio moves forward. Your payment is recorded.
                </p>
              </div>
              <div className="space-y-3 border-y border-[#DCCFBC] py-5">
                <InfoRow label="Style" value={order.media.style || order.media.conceptTitle || "—"} />
                <InfoRow label="Size" value={order.media.size || "—"} />
                <InfoRow label="Presentation" value={presentation || "—"} />
              </div>
              {!showModify ? (
                <div className="hidden space-y-3 lg:block">
                  <button
                    type="button"
                    disabled={!canAct || busy}
                    onClick={() => void onApprove()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#31271F] px-5 py-3 text-sm font-semibold text-[#FBF8F3] transition hover:bg-[#241C16] disabled:opacity-50"
                  >
                    <Check size={17} />
                    Approve Portrait
                  </button>
                  <button
                    type="button"
                    disabled={!canAct || busy}
                    onClick={() => setShowModify(true)}
                    className="w-full rounded-[8px] border border-[#D8CBB8] bg-white/72 px-5 py-3 text-sm font-semibold text-[#31271F] transition hover:bg-[#F3EBDE] disabled:opacity-50"
                  >
                    Ask for Modification
                  </button>
                </div>
              ) : (
                <div className="hidden space-y-3 lg:block">
                  <textarea
                    className={getInputClasses("min-h-[120px]")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Describe the modification you need"
                  />
                  <button
                    type="button"
                    disabled={!note.trim() || busy}
                    onClick={() => void onRequestModification(note.trim())}
                    className="w-full rounded-[8px] bg-[#31271F] px-5 py-3 text-sm font-semibold text-[#FBF8F3] disabled:opacity-50"
                  >
                    Submit Modification
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModify(false)}
                    className="w-full rounded-[8px] border border-[#D8CBB8] px-5 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>

        <div className="shrink-0 border-t border-[#DCCFBC] bg-[#FBF8F3] p-4 lg:hidden">
          {!showModify ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!canAct || busy}
                onClick={() => void onApprove()}
                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-[8px] bg-[#31271F] px-4 py-3 text-sm font-semibold text-[#FBF8F3] disabled:opacity-50"
              >
                <Check size={17} />
                <span className="truncate">Approve Portrait</span>
              </button>
              <button
                type="button"
                disabled={!canAct || busy}
                onClick={() => setShowModify(true)}
                className="min-w-0 rounded-[8px] border border-[#D8CBB8] bg-white/72 px-4 py-3 text-sm font-semibold text-[#31271F] disabled:opacity-50"
              >
                <span className="truncate">Ask for Modification</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                className={getInputClasses("min-h-[96px]")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe the modification you need"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!note.trim() || busy}
                  onClick={() => void onRequestModification(note.trim())}
                  className="rounded-[8px] bg-[#31271F] px-4 py-3 text-sm font-semibold text-[#FBF8F3] disabled:opacity-50"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowModify(false)}
                  className="rounded-[8px] border border-[#D8CBB8] px-4 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobileViewport && mobilePreviewAsset?.image && (
        <div className="fixed inset-0 z-[60] bg-[#241C16]/92 backdrop-blur-sm">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 text-white">
              <p className="text-sm font-semibold">{mobilePreviewAsset.label}</p>
              <button
                type="button"
                onClick={() => setMobilePreviewAsset(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/12 bg-white/6 transition hover:bg-white/12"
                aria-label="Close image preview"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="flex min-h-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mobilePreviewAsset.image}
                  alt={mobilePreviewAsset.label}
                  className="block h-auto w-auto max-w-none rounded-[8px] shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomableReviewPreview({
  alt,
  image,
  isVideo,
  videoSrc,
}: {
  alt: string;
  image: string | null;
  isVideo: boolean;
  videoSrc: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [zoomPoint, setZoomPoint] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const updateZoomPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    setZoomPoint({ x, y });
  };

  const mediaStyle = {
    transform: isZooming ? "scale(2)" : "scale(1)",
    transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%`,
  };

  return (
    <div
      className="relative flex min-h-[360px] cursor-crosshair items-center justify-center overflow-hidden rounded-[8px] bg-[#EFE8DD] p-5"
      onPointerEnter={() => setIsZooming(true)}
      onPointerLeave={() => setIsZooming(false)}
      onPointerMove={updateZoomPoint}
    >
      {isVideo && videoSrc ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            poster={image ?? undefined}
            muted
            loop
            playsInline
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="max-h-[520px] w-full max-w-[520px] object-contain shadow-[0_20px_40px_rgba(43,31,21,0.12)] transition-transform duration-150 ease-out"
            style={mediaStyle}
          />
          <button
            type="button"
            onClick={async () => {
              const video = videoRef.current;
              if (!video) return;
              if (video.paused) {
                await video.play();
                setIsPlaying(true);
              } else {
                video.pause();
                setIsPlaying(false);
              }
            }}
            className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-[8px] bg-[#241C16]/88 px-4 py-2 text-xs font-semibold text-[#FBF8F3]"
          >
            <PlayCircle size={15} />
            {isPlaying ? "Pause" : "Play"}
          </button>
        </>
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={alt}
          className="max-h-[520px] w-full max-w-[520px] object-contain shadow-[0_20px_40px_rgba(43,31,21,0.12)] transition-transform duration-150 ease-out"
          style={mediaStyle}
        />
      ) : (
        <ImageIcon size={34} className="text-[#8F816C]" />
      )}
    </div>
  );
}

function ReviewThumb({
  label,
  icon,
  image,
  isSelected,
  onSelect,
  mobileSpanFull = false,
}: {
  label: string;
  icon: ReactNode;
  image: string | null;
  isSelected: boolean;
  onSelect: () => void;
  mobileSpanFull?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-[8px] border bg-[#F3EBDE] text-left transition ${
        mobileSpanFull ? "col-span-2 md:col-span-1" : ""
      } ${isSelected ? "border-[#31271F]" : "border-[#DCCFBC] hover:border-[#A58964]"}`}
    >
      {image ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={label}
            className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          <span className="pointer-events-none absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/28 bg-[#241C16]/48 text-white">
            <Maximize2 size={15} />
          </span>
        </div>
      ) : (
        <div className="relative flex aspect-[4/3] items-center justify-center text-[#8F816C]">
          <ImageIcon size={24} />
        </div>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-[#241C16]/18 text-white opacity-0 transition group-hover:opacity-100">
        {icon}
      </span>
      <span className="block px-3 py-2 text-xs font-semibold text-[#5F564B]">{label}</span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-[#8F816C]">{label}</span>
      <span className="text-right font-semibold text-[#241C16]">{value}</span>
    </div>
  );
}

function GiftMessageModal({
  initialMessage,
  onClose,
  onSave,
}: {
  initialMessage: GiftMessage | null;
  onClose: () => void;
  onSave: (message: GiftMessage) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialMessage?.title ?? "Your Title Here");
  const [sender, setSender] = useState(initialMessage?.sender ?? "");
  const [recipient, setRecipient] = useState(initialMessage?.recipient ?? "");
  const [message, setMessage] = useState(initialMessage?.message ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241C16]/58 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3] p-5 shadow-[0_30px_80px_rgba(20,14,10,0.35)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#241C16]">Gift Message</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <FieldInput label="Title" value={title} onChange={setTitle} />
          <FieldInput label="From" value={sender} onChange={setSender} />
          <FieldInput label="To" value={recipient} onChange={setRecipient} />
          <label className="block text-sm font-semibold text-[#5F564B]">
            Message
            <textarea
              className={getInputClasses("mt-2 min-h-[120px]")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={saving || !recipient.trim()}
            onClick={() => {
              void (async () => {
                setSaving(true);
                try {
                  await onSave({ title, sender, recipient, message });
                } finally {
                  setSaving(false);
                }
              })();
            }}
            className={getButtonClasses("primary", "px-5 py-3 text-sm")}
          >
            Save
          </button>
          <button type="button" onClick={onClose} className={getButtonClasses("outline", "px-5 py-3 text-sm")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ShippingAddressModal({
  address,
  disabled,
  blockedReason,
  onClose,
  onSave,
}: {
  address: AddressRecord | null;
  disabled: boolean;
  blockedReason: string | null;
  onClose: () => void;
  onSave: (address: AddressRecord) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(address?.fullName ?? "");
  const [street, setStreet] = useState(address?.street ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [region, setRegion] = useState(address?.region ?? "");
  const [postalCode, setPostalCode] = useState(address?.postalCode ?? "");
  const [country, setCountry] = useState(address?.country ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241C16]/58 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3] p-5 shadow-[0_30px_80px_rgba(20,14,10,0.35)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#241C16]">Shipping Address</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {disabled && blockedReason && (
          <p className="mt-4 rounded-[8px] border border-[#DCCFBC] bg-[#F7F0E6] px-4 py-3 text-sm text-[#5F564B]">
            {blockedReason}
          </p>
        )}
        <div className="mt-5 grid gap-4">
          <FieldInput label="Full name" value={fullName} onChange={setFullName} />
          <FieldInput label="Street" value={street} onChange={setStreet} />
          <FieldInput label="City" value={city} onChange={setCity} />
          <FieldInput label="Region" value={region} onChange={setRegion} />
          <FieldInput label="Postal code" value={postalCode} onChange={setPostalCode} />
          <FieldInput label="Country" value={country} onChange={setCountry} />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={disabled || saving || !street.trim() || !city.trim()}
            onClick={() => {
              void (async () => {
                setSaving(true);
                try {
                  await onSave({
                    fullName,
                    street,
                    city,
                    region,
                    postalCode,
                    country,
                  });
                } finally {
                  setSaving(false);
                }
              })();
            }}
            className={getButtonClasses("primary", "px-5 py-3 text-sm")}
          >
            Save
          </button>
          <button type="button" onClick={onClose} className={getButtonClasses("outline", "px-5 py-3 text-sm")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-[#5F564B]">
      {label}
      <input
        className={getInputClasses("mt-2")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function PaymentStatusPanel({
  accountOrders,
  onCreate,
}: {
  accountOrders: AccountOrder[];
  onCreate: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeSelectedIndex = Math.min(
    selectedIndex,
    Math.max(0, accountOrders.length - 1),
  );
  const selectedOrder = accountOrders[safeSelectedIndex] ?? null;

  useEffect(() => {
    if (selectedIndex > accountOrders.length - 1) setSelectedIndex(0);
  }, [accountOrders.length, selectedIndex]);

  if (!selectedOrder) {
    return (
      <section className="rounded-[8px] border border-[#DCCFBC] bg-white/82 p-8 shadow-[0_18px_38px_rgba(43,31,21,0.05)]">
        <div className="max-w-[560px]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Payment Status</p>
          <h2 className="mt-3 text-[26px] font-semibold leading-tight text-[#241C16] md:text-[30px]">
            No payment records yet
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#5F564B]">
            Payment details will appear here after your first ViewBrush order is placed.
          </p>
          <button type="button" onClick={onCreate} className={getButtonClasses("primary", "mt-7 px-5 py-3 text-sm")}>
            Start Your Painting
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">ViewBrush Billing</p>
        <h2 className="mt-2 text-[26px] font-semibold leading-tight text-[#241C16] md:text-[30px]">
          Payment Status
        </h2>
        <p className="mt-3 max-w-[72ch] text-sm leading-7 text-[#5F564B]">
          Review charges, remaining milestones, and payment timing for each order in your workspace.
        </p>
      </div>

      {accountOrders.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {accountOrders.map((accountOrder, index) => (
            <button
              key={accountOrder.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`min-w-max rounded-[8px] border px-4 py-2 text-sm font-semibold transition ${
                safeSelectedIndex === index
                  ? "border-[#31271F] bg-[#31271F] text-[#FBF8F3]"
                  : "border-[#D8CBB8] bg-white/72 text-[#5F564B] hover:bg-[#F3EBDE]"
              }`}
            >
              {accountOrder.name}
            </button>
          ))}
        </div>
      )}

      <article className="rounded-[8px] border border-[#DCCFBC] bg-white/86 p-4 shadow-[0_18px_38px_rgba(43,31,21,0.05)] md:p-5">
        <div className="border-b border-[#DCCFBC] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Order Number</p>
          <h3 className="mt-2 break-words text-2xl font-semibold text-[#241C16]">
            {selectedOrder.name}
          </h3>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <PaymentOrderDetails order={selectedOrder} />
          <div className="min-w-0 space-y-5">
            <PaymentChargeTable title="Past Charges" rows={selectedOrder.pastCharges} />
            {selectedOrder.upcomingCharges.length > 0 && (
              <PaymentUpcomingCharges rows={selectedOrder.upcomingCharges} />
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

function PaymentOrderDetails({ order }: { order: AccountOrder }) {
  const artwork = order.media.paintingUrl || order.media.photoUrl;
  return (
    <div className="overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3]">
      <div className="bg-[#BFA487] px-4 py-3">
        <p className="text-sm font-semibold text-white">Order Details</p>
      </div>
      <div className="p-5">
        <div className="mx-auto h-32 w-32 overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#EFE8DD]">
          {artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork}
              alt={order.media.conceptTitle || order.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#8F816C]">
              <ImageIcon size={28} />
            </div>
          )}
        </div>
        <div className="mt-6 divide-y divide-[#E5DCCF] text-sm">
          <PaymentDetailRow label="Artwork" value={order.media.conceptTitle || order.name} />
          <PaymentDetailRow
            label="Presentation"
            value={`${order.media.finishLabel || "Finish"} · ${order.media.size || "Size"}`}
          />
          <PaymentDetailRow label="Service" value={order.deliveryLabel} />
          <PaymentDetailRow label="Payment Status" value={String(order.paymentStatusLabel)} />
          <PaymentDetailRow label="Estimated Total" value={order.total} emphasize />
        </div>
      </div>
    </div>
  );
}

function PaymentDetailRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-[#8F816C]">{label}</span>
      <span
        className={`text-right ${
          emphasize ? "font-semibold text-[#241C16]" : "font-medium text-[#241C16]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentChargeTable({
  title,
  rows,
}: {
  title: string;
  rows: PaymentChargeRow[];
}) {
  return (
    <div className="rounded-[8px] border border-[#DCCFBC] bg-white/72">
      <div className="border-b border-[#DCCFBC] px-4 py-3">
        <p className="text-sm font-semibold text-[#241C16]">{title}</p>
      </div>
      {!rows.length ? (
        <p className="px-4 py-5 text-sm text-[#5F564B]">No charges recorded yet.</p>
      ) : (
        <ul className="divide-y divide-[#E5DCCF]">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="grid gap-1 px-4 py-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-[#241C16]">{row.label}</p>
                <p className="text-sm text-[#5F564B]">{row.description}</p>
                <p className="mt-1 text-xs text-[#8F816C]">{row.date}</p>
              </div>
              <p className="text-sm font-semibold text-[#241C16]">{row.amount}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentUpcomingCharges({ rows }: { rows: UpcomingChargeRow[] }) {
  return (
    <div className="rounded-[8px] border border-[#DCCFBC] bg-white/72">
      <div className="border-b border-[#DCCFBC] px-4 py-3">
        <p className="text-sm font-semibold text-[#241C16]">Upcoming Charges</p>
      </div>
      <ul className="divide-y divide-[#E5DCCF]">
        {rows.map((row, index) => (
          <li key={`${row.label}-${index}`} className="grid gap-1 px-4 py-4 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold text-[#241C16]">{row.label}</p>
              <p className="text-sm text-[#5F564B]">{row.description}</p>
            </div>
            <p className="text-sm font-semibold text-[#241C16]">{row.amount}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
