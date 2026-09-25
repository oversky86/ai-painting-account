"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeft,
  Gift,
  History,
  ImageIcon,
  Maximize2,
  Minus,
  PlayCircle,
  Plus,
  X,
} from "lucide-react";
import { getOrderStageCopy } from "@/lib/order-stage";
import { getInputClasses } from "@/lib/theme";
import type {
  AccountOrder,
  ArtworkVersion,
  CustomerSummary,
  GiftMessage,
  ModificationNote,
  ModificationSelection,
  OrderStage,
} from "@/lib/types";

type ReviewAction = "approve" | "modify";

type OrderWorkspaceProps = {
  orders: AccountOrder[];
  customer: CustomerSummary;
  onCreate: () => void;
  onReview: (
    order: AccountOrder,
    action: ReviewAction,
    note?: string,
    notes?: ModificationNote[],
  ) => Promise<void>;
  onSaveGift: (
    order: AccountOrder,
    gift: GiftMessage | null,
  ) => Promise<void>;
  onDetailChange?: (open: boolean) => void;
};

const stageLabels: Record<OrderStage, string> = {
  artwork: "Artwork in Progress",
  review: "Ready For Review",
  revision: "Revision In Progress",
  framing: "Preparing Shipment",
  shipping: "Shipped",
  complete: "Shipped",
};

const stageSteps: Record<OrderStage, number> = {
  artwork: 1,
  review: 2,
  revision: 2,
  framing: 3,
  shipping: 4,
  complete: 4,
};

const buttonPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-[8px] bg-[#31271F] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#241C16] disabled:cursor-not-allowed disabled:bg-[#BDB9B6]";
const buttonSecondary =
  "ui-outline-control inline-flex min-h-12 items-center justify-center rounded-[8px] border border-[#DCCFBC] bg-white px-5 text-[15px] font-medium text-[#31271F] transition-colors disabled:cursor-not-allowed disabled:text-[#AAA4A0]";

function displayOrderNumber(order: AccountOrder) {
  return order.name.replace(/^#/, "");
}

function stageBadgeClasses(stage: OrderStage) {
  const green = stage === "review" || stage === "shipping" || stage === "complete";
  return `inline-flex min-h-[34px] items-center justify-center rounded-[6px] border px-5 text-[13px] font-semibold ${
    green
      ? "border-[#97CDAA] bg-[#E9F6EE] text-[#2F7D46]"
      : "border-[#E1CCAC] bg-[#FAF4EA] text-[#63523A]"
  }`;
}

function artworkUrl(order: AccountOrder) {
  return order.media.paintingUrl || order.media.photoUrl || "";
}

function replaceOrderSearch(orderId: string | null) {
  const url = new URL(window.location.href);
  if (orderId) url.searchParams.set("order", orderId);
  else url.searchParams.delete("order");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export default function OrderWorkspace({
  orders,
  customer,
  onCreate,
  onReview,
  onSaveGift,
  onDetailChange,
}: OrderWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("order");
    if (requested && orders.some((order) => order.id === requested)) {
      setSelectedId(requested);
      onDetailChange?.(true);
    }
  }, [onDetailChange, orders]);

  const selectedOrder = orders.find((order) => order.id === selectedId) || null;

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        customer={customer}
        onBack={() => {
          setSelectedId(null);
          onDetailChange?.(false);
          replaceOrderSearch(null);
        }}
        onReview={onReview}
      />
    );
  }

  if (!orders.length) {
    return (
      <section className="rounded-[8px] border border-[#DCCFBC] bg-white/85 p-8 shadow-[0_18px_38px_rgba(43,31,21,0.05)]">
        <h2 className="text-[26px] font-semibold text-[#241C16]">No orders yet</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#5F564B]">
          Start your first ViewBrush portrait and track every studio step here.
        </p>
        <button type="button" onClick={onCreate} className={`${buttonPrimary} mt-7`}>
          Start Your Painting
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="sr-only">All Orders</h2>
      <p className="mb-4 text-[13px] leading-5 text-[#6C6054] lg:text-sm lg:leading-7">
        {orders.length} {orders.length === 1 ? "order is" : "orders are"} saved to this workspace. The newest order appears first.
      </p>
      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderListCard
            key={order.id}
            order={order}
            senderPlaceholder={`${customer.firstName} ${customer.lastName}`.trim() || "Your name"}
            onOpen={() => {
              setSelectedId(order.id);
              onDetailChange?.(true);
              replaceOrderSearch(order.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSaveGift={onSaveGift}
          />
        ))}
      </div>
    </section>
  );
}

function OrderListCard({
  order,
  senderPlaceholder,
  onOpen,
  onSaveGift,
}: {
  order: AccountOrder;
  senderPlaceholder: string;
  onOpen: () => void;
  onSaveGift: OrderWorkspaceProps["onSaveGift"];
}) {
  const [giftOpen, setGiftOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const image = artworkUrl(order);
  const primaryLabel = order.orderStage === "review" ? "Review Portrait" : "View Order";

  return (
    <>
      <article className="rounded-[8px] border border-[#DCCFBC] bg-white/85 p-4 shadow-[0_18px_38px_rgba(43,31,21,0.05)] lg:grid lg:min-h-[196px] lg:grid-cols-[148px_minmax(0,1fr)_260px] lg:items-center lg:gap-5 lg:p-6">
        <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-6 lg:block">
          <div className="h-[108px] w-[108px] overflow-hidden rounded-[6px] border border-[#DCCFBC] bg-[#F3EBDE] lg:h-[148px] lg:w-[148px] lg:rounded-[8px]">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={`${order.media.conceptTitle || "Custom"} portrait`} width={148} height={148} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-[#8F816C]"><ImageIcon aria-hidden="true" /></span>
            )}
          </div>
          <div className="min-w-0 lg:hidden">
            <h3 className="text-lg font-bold leading-6 text-[#241C16]">{order.media.conceptTitle || "Custom Portrait"}</h3>
            <p className="mt-1 break-all text-xs leading-[17px] text-[#241C16]">Order # {displayOrderNumber(order)}</p>
            <div className="mt-2 flex gap-4 text-xs font-semibold"><span>{order.deliveryLabel}</span><span>{order.total}</span></div>
            <span className={`${stageBadgeClasses(order.orderStage)} mt-3 w-full px-2 text-[11.5px]`}>{stageLabels[order.orderStage]}</span>
          </div>
        </div>

        <div className="hidden min-w-0 lg:block">
          <h3 className="text-2xl font-bold leading-8 text-[#211C19]">{order.media.conceptTitle || "Custom Portrait"}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-[#231D1A]">Order # {displayOrderNumber(order)}</p>
          <div className="mt-4 flex gap-7 text-xs">
            <p><span className="font-semibold text-[#806E5A]">Delivery</span> <strong className="ml-1 text-sm text-[#211C19]">{order.deliveryLabel}</strong></p>
            <p><span className="font-semibold text-[#806E5A]">Total</span> <strong className="ml-1 text-[15px] text-[#211C19]">{order.total}</strong></p>
          </div>
          <span className={`${stageBadgeClasses(order.orderStage)} mt-4`}>{stageLabels[order.orderStage]}</span>
        </div>

        <div className="mt-5 grid gap-3 border-t border-[#E5DCCF] pt-5 lg:mt-0 lg:border-0 lg:p-0">
          <button type="button" onClick={onOpen} className={buttonPrimary}>{primaryLabel}</button>
          <button type="button" onClick={() => setGiftOpen(true)} disabled={!order.canEditGift || busy} className={`${buttonSecondary} gap-2`}>
            <Gift size={16} aria-hidden="true" />
            {order.giftMessage ? "Edit Gift Message" : "Add Gift Message"}
          </button>
        </div>
      </article>

      {giftOpen ? (
        <GiftMessageDialog
          initialMessage={order.giftMessage}
          senderPlaceholder={senderPlaceholder}
          busy={busy}
          onClose={() => setGiftOpen(false)}
          onSave={async (message) => {
            setBusy(true);
            try {
              await onSaveGift(order, message);
              setGiftOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

function OrderDetail({
  order,
  customer,
  onBack,
  onReview,
}: {
  order: AccountOrder;
  customer: CustomerSummary;
  onBack: () => void;
  onReview: OrderWorkspaceProps["onReview"];
}) {
  const [mode, setMode] = useState<"detail" | "modify">("detail");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const image = artworkUrl(order);

  useEffect(() => {
    if (mode === "modify") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [mode]);

  if (mode === "modify") {
    return (
      <ModificationComposer
        image={image}
        initialNotes={[]}
        busy={busy}
        error={error}
        onCancel={() => setMode("detail")}
        onSubmit={async (notes) => {
          setBusy(true);
          setError("");
          try {
            await onReview(order, "modify", JSON.stringify({ notes }), notes);
            setMode("detail");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to submit modification request.");
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  return (
    <section aria-labelledby="order-detail-title" className="pb-10">
      <button type="button" onClick={onBack} className="relative -top-4 inline-flex min-h-11 items-center gap-1 text-[13px] text-[#66594E] hover:text-[#241C16] lg:top-0">
        <ArrowLeft size={15} aria-hidden="true" /> Back to all orders
      </button>
      <div className="-mt-3 lg:mt-0 lg:flex lg:items-center lg:gap-6">
        <div>
          <h2 id="order-detail-title" className="text-[30px] font-semibold leading-9 text-[#2B211C] lg:text-[34px] lg:leading-[49px]">
            <span className="lg:hidden">Order</span>
            <span className="hidden lg:inline">Order {displayOrderNumber(order)}</span>
          </h2>
          <p className="mt-1 text-[15px] font-medium text-[#6C6054] lg:hidden">{displayOrderNumber(order)}</p>
        </div>
        <span className={`${stageBadgeClasses(order.orderStage)} mt-5 lg:mt-0`}>{stageLabels[order.orderStage]}</span>
      </div>

      <OrderProgress stage={order.orderStage} />

      <div className="mt-4 grid gap-4">
        {order.orderStage === "artwork" ? <ArtworkProgressPanel order={order} /> : null}
        {order.orderStage === "review" ? (
          <ReviewPanel
            order={order}
            onApprove={() => setApprovalOpen(true)}
            onModify={() => setMode("modify")}
          />
        ) : null}
        {order.orderStage === "revision" ? <RevisionPanel order={order} /> : null}
        {order.orderStage === "framing" ? (
          <ApprovedPanel order={order} onHistory={() => setHistoryOpen(true)} />
        ) : null}
        {order.orderStage === "shipping" || order.orderStage === "complete" ? (
          <ShippedPanel order={order} />
        ) : null}
        <OrderSummary order={order} customer={customer} />
      </div>

      {approvalOpen ? (
        <ApprovalDialog
          busy={busy}
          error={error}
          onClose={() => setApprovalOpen(false)}
          onConfirm={async () => {
            setBusy(true);
            setError("");
            try {
              await onReview(order, "approve");
              setApprovalOpen(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Unable to approve portrait.");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
      {historyOpen ? <VersionHistoryDialog order={order} onClose={() => setHistoryOpen(false)} /> : null}
    </section>
  );
}

function OrderProgress({ stage }: { stage: OrderStage }) {
  const current = stageSteps[stage];
  const steps = ["Order placed", "Portrait Review", "Preparing Shipment", "Shipped"];
  return (
    <div className="mt-5 rounded-[8px] border border-[#D8CAB9] bg-white px-4 py-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)] lg:px-6">
      <div className="grid grid-cols-4 gap-2 lg:max-w-[730px]">
        {steps.map((label, index) => {
          const active = index + 1 <= current;
          return (
            <div key={label}>
              <div className={`h-1 rounded-full ${active ? "bg-[#35261E]" : "bg-[#E5DCCF]"}`} />
              <p className={`mt-2 text-[11px] font-semibold leading-4 lg:text-xs ${active ? "text-[#35261E]" : "text-[#938575]"}`}>
                <span className="lg:hidden">{["Placed", "Review", "Prepare", "Shipped"][index]}</span>
                <span className="hidden lg:inline">{label}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArtworkProgressPanel({ order }: { order: AccountOrder }) {
  const image = artworkUrl(order);
  return (
    <article className="rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:flex lg:min-h-[204px] lg:items-start lg:gap-4 lg:p-6">
      <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[6px] bg-[#F3EBDE]">
        {image ? <PreviewImage src={image} alt="Portrait being created" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="mt-4 lg:mt-0">
        <span className={stageBadgeClasses("artwork")}>Artwork in Progress</span>
        <p className="mt-4 text-sm leading-6 text-[#6C6054]">{getOrderStageCopy("artwork").currentDescription}</p>
      </div>
    </article>
  );
}

function ReviewPanel({ order, onApprove, onModify }: { order: AccountOrder; onApprove: () => void; onModify: () => void }) {
  const [asset, setAsset] = useState<"final" | "reference" | "video">("final");
  const [fullScreen, setFullScreen] = useState(false);
  const image = asset === "reference"
    ? order.media.photoUrl || artworkUrl(order)
    : asset === "video"
      ? order.media.videoPosterUrl || artworkUrl(order)
      : artworkUrl(order);
  const isVideo = asset === "video" && Boolean(order.media.videoUrl);

  return (
    <article className="rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:p-6">
      <h3 className="text-[22px] font-bold leading-7 text-[#231D1A] lg:text-xl">Review your portrait</h3>
      <p className="mt-2 text-sm leading-[22px] text-[#6C6054]">The artwork is ready. Review the preview, then approve it for shipment or request a modification.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,772px)_340px] lg:gap-10">
        <div>
          <PreviewSurface image={image} video={isVideo ? order.media.videoUrl : undefined} onExpand={() => setFullScreen(true)} />
        </div>
        <aside>
          <MediaTabs order={order} selected={asset} onSelect={setAsset} />
          <div className="mt-6 border-t border-[#E7DCCC] pt-6 lg:mt-6">
            <h4 className="text-base font-bold">Decision</h4>
            <p className="mt-3 text-sm leading-[22px] text-[#6C6054]">Approve the portrait for shipment, or open the modification page to mark requested changes.</p>
            <div className="mt-7 grid gap-3 lg:mt-[169px]">
              <button type="button" onClick={onApprove} className={buttonPrimary}>Approve Portrait</button>
              {order.canModify ? (
                <button type="button" onClick={onModify} className={buttonSecondary}>Ask for Modification</button>
              ) : (
                <p className="text-sm leading-[22px] text-[#6C6054]">
                  Modification requests are no longer available for this portrait. Please approve to continue.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
      {fullScreen && image ? <FullScreenPreview image={image} video={isVideo ? order.media.videoUrl : undefined} onClose={() => setFullScreen(false)} /> : null}
    </article>
  );
}

function ApprovedPanel({ order, onHistory }: { order: AccountOrder; onHistory: () => void }) {
  const image = artworkUrl(order);
  const hasVersionHistory =
    order.modificationNotes.length > 0 ||
    order.artworkVersions.length > 1 ||
    order.artworkVersions.some((version) => version.notes.length > 0);

  return (
    <>
      <article className="rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:p-6">
        <h3 className="text-xl font-bold">Preparing Shipment</h3>
        <p className="mt-3 text-sm leading-6 text-[#6C6054]">The portrait is approved. The studio is confirming packing and dispatch details.</p>
      </article>
      <article className="rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:p-6">
        <div><h3 className="text-[22px] font-bold">Your Portrait is Approved.</h3><p className="mt-2 text-sm text-[#6C6054]">Artwork changes are no longer available at this stage.</p></div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,772px)_340px] lg:gap-10">
          <PreviewSurface image={image} />
          <aside className="flex flex-col">
            <MediaTabs order={order} selected="final" onSelect={() => undefined} />
            <div className="mt-6 flex flex-1 flex-col border-t border-[#E7DCCC] pt-6">
              <div className="mt-auto grid gap-3">
                <button type="button" disabled className={`${buttonPrimary} w-full opacity-35`}>Approved</button>
                {hasVersionHistory ? (
                  <button type="button" onClick={onHistory} className={`${buttonSecondary} w-full gap-2`}>
                    <History size={18} aria-hidden="true" />
                    View Version History
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}

function RevisionPanel({ order }: { order: AccountOrder }) {
  const notes = order.modificationNotes;
  return (
    <article className="rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:p-6">
      <h3 className="text-xl font-bold">Submitted modification request</h3>
      <p className="mt-3 max-w-3xl text-sm leading-[22px] text-[#6C6054]">The artist is revising the portrait based on your notes. You will receive an email when the updated artwork is ready to review.</p>
      <div className="mt-5 grid gap-6 border-t border-[#E7DCCC] pt-5 lg:grid-cols-[404px_minmax(0,1fr)]">
        <AnnotatedImage src={artworkUrl(order)} notes={notes} />
        <div><h4 className="text-base font-bold">Modification Request</h4><ol className="mt-5 grid gap-3 text-sm text-[#6C6054]">{notes.map((note, index) => <li key={note.id}>#{index + 1} {note.text}</li>)}</ol></div>
      </div>
    </article>
  );
}

function ShippedPanel({ order }: { order: AccountOrder }) {
  const tracking = order.tracking;
  const estimate = tracking?.estimatedDeliveryAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(tracking.estimatedDeliveryAt))
    : "Pending";
  return (
    <>
      <article className="h-[110px] overflow-hidden rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:h-auto lg:p-6"><h3 className="text-lg font-bold lg:text-xl">Your portrait has shipped.</h3><p className="mt-2 text-[13px] leading-5 text-[#6C6054] lg:mt-3 lg:text-sm lg:leading-6">This approved portrait has shipped. Changes are no longer available for this order.</p></article>
      <article className="h-[324px] rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:h-auto lg:min-h-[220px] lg:p-6">
        <div className="flex items-center justify-between gap-4"><h3 className="text-lg font-bold lg:text-xl">Tracking details</h3><span className="rounded-[6px] border border-[#97CDAA] bg-[#E9F6EE] px-5 py-2 text-xs font-semibold text-[#2F7D46]">{tracking?.status || "In transit"}</span></div>
        <p className="mt-2 max-w-xl text-[13px] leading-5 text-[#6C6054] lg:mt-3 lg:text-sm lg:leading-6">The package has left the studio. Track shipment updates from the carrier until delivery is complete.</p>
        <div className="mt-4 grid gap-4 border-t border-[#E7DCCC] pt-4 text-sm lg:grid-cols-[280px_220px_180px] lg:items-center">
          <div><p className="text-xs text-[#6C6054]">Tracking #</p><strong className="mt-1 block break-all">{tracking?.number || "Not available"}</strong></div>
          <div><p className="text-xs text-[#6C6054]">Estimated delivery</p><strong className="mt-1 block">{estimate}</strong></div>
          {tracking?.url ? <a href={tracking.url} target="_blank" rel="noreferrer" className={`${buttonPrimary} w-full`}>Track</a> : null}
        </div>
      </article>
    </>
  );
}

function MediaTabs({ order, selected, onSelect }: { order: AccountOrder; selected: "final" | "reference" | "video"; onSelect: (value: "final" | "reference" | "video") => void }) {
  const rows = [
    { id: "final" as const, label: "Final Portrait", image: artworkUrl(order) },
    { id: "reference" as const, label: "AI Reference", image: order.media.photoUrl || artworkUrl(order) },
    { id: "video" as const, label: "Studio Video", image: order.media.videoPosterUrl || artworkUrl(order), video: true },
  ];
  return <div className="grid grid-cols-3 gap-2">{rows.map((row) => <button key={row.id} type="button" onClick={() => onSelect(row.id)} className={`media-tab overflow-hidden rounded-[6px] border bg-[#FCF8F4] text-left transition-colors hover:bg-[#FBF8F3] ${selected === row.id ? "border-[#31271F]" : "border-[#DCCFBC]"}`}><span className="relative block h-[72px] overflow-hidden">{row.image ? <PreviewImage src={row.image} alt={`${row.label} thumbnail`} className="h-full w-full object-cover transition-transform duration-200 ease-out" /> : null}{row.video ? <PlayCircle size={18} className="absolute right-2 top-2 rounded bg-[#35261E] p-0.5 text-white" /> : null}</span><span className="block truncate px-2 py-2.5 text-[13px] font-medium">{row.label}</span></button>)}</div>;
}

function PreviewSurface({ image, video, onExpand }: { image: string; video?: string; onExpand?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isZooming, setIsZooming] = useState(false);

  const updateZoomPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const supportsDesktopHover = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
    if (video || event.pointerType !== "mouse" || !supportsDesktopHover || !imageRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    imageRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  return (
    <div
      className={`relative flex aspect-square min-h-[326px] items-center justify-center overflow-hidden rounded-[8px] bg-[#EFE8DD] p-4 lg:aspect-auto lg:h-[506px] lg:p-5 ${video ? "" : "lg:cursor-crosshair"}`}
      onPointerEnter={(event) => {
        const supportsDesktopHover = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
        if (!video && event.pointerType === "mouse" && supportsDesktopHover) setIsZooming(true);
      }}
      onPointerLeave={() => setIsZooming(false)}
      onPointerMove={updateZoomPoint}
    >
      {video ? (
        <video ref={videoRef} src={video} poster={image} controls preload="metadata" playsInline className="h-full w-full object-contain" />
      ) : image ? (
        // Shopify media URLs are dynamic and cannot be enumerated in next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={image}
          alt="Finished custom portrait"
          width={799}
          height={1200}
          loading="eager"
          decoding="async"
          draggable="false"
          className="h-full w-full object-contain transition-transform duration-150 ease-out"
          style={{ transform: isZooming ? "scale(2)" : "scale(1)" }}
        />
      ) : (
        <ImageIcon size={36} className="text-[#8F816C]" />
      )}
      {onExpand && image ? (
        <button
          type="button"
          onClick={() => {videoRef.current?.pause();onExpand();}}
          aria-label={video ? "Open full-screen studio video" : "Open full-screen portrait"}
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#35261E]/65 text-white before:absolute before:-inset-1 before:content-[''] hover:bg-[#35261E]/80"
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function OrderSummary({ order, customer }: { order: AccountOrder; customer: CustomerSummary }) {
  const address = order.shippingAddress || customer.defaultAddress;
  const rows = [
    ["Order #", displayOrderNumber(order)],
    ["Artwork", order.media.style || order.media.conceptTitle || "—"],
    ["Size", order.media.size || "—"],
    ["Presentation", order.media.finishLabel || order.media.frameLabel || "—"],
    ["Number of Pets", "2"],
    ["Gift message", order.giftMessage ? "Added" : "Not added"],
    ["Delivery", order.deliveryLabel],
    ["Total", order.total],
  ];
  return <article className="min-h-[568px] rounded-[8px] border border-[#DAC9B2] bg-white p-4 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-6"><div><h3 className="text-lg font-bold">Order summary</h3><dl className="mt-5 grid gap-3 text-sm lg:grid-cols-4 lg:gap-x-8 lg:gap-y-6">{rows.map(([label,value]) => <div key={label} className="flex justify-between gap-5 lg:block"><dt className="text-[13px] text-[#6C6054]">{label}</dt><dd className={`text-right lg:mt-2 lg:text-left ${label === "Total" ? "font-bold" : "font-medium"}`}>{value}</dd></div>)}</dl></div><div className="mt-6 border-t border-[#E5DCCF] pt-6 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h3 className="text-lg font-bold">Shipping information</h3>{address ? <dl className="mt-5 grid gap-2 text-sm"><SummaryRow label="Name" value={address.fullName} /><SummaryRow label="Phone" value="+1 (415) 555-0138" /><SummaryRow label="Address" value={`${address.street}\n${address.city}${address.region ? `, ${address.region}` : ""} ${address.postalCode}`} /><SummaryRow label="Country" value={address.country} /></dl> : <p className="mt-4 text-sm text-[#6C6054]">No shipping address available.</p>}</div></article>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4"><dt className="text-[#6C6054]">{label}</dt><dd className="whitespace-pre-line text-right font-medium lg:text-left">{value}</dd></div>;
}

function ModificationComposer({ image, initialNotes, busy, error, onCancel, onSubmit }: { image: string; initialNotes: ModificationNote[]; busy: boolean; error: string; onCancel: () => void; onSubmit: (notes: ModificationNote[]) => Promise<void> }) {
  const [notes, setNotes] = useState<ModificationNote[]>(initialNotes);
  const [selecting, setSelecting] = useState(false);
  const [draft, setDraft] = useState<ModificationSelection | null>(null);
  const [pendingSelection, setPendingSelection] = useState<ModificationSelection | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draftRef = useRef<ModificationSelection | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selecting || pendingSelection) return;
    canvasRef.current?.focus();
  }, [pendingSelection, selecting]);

  const point = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    };
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selecting || pendingSelection || event.button !== 0) return;
    event.preventDefault();
    const next = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = next;
    const selection = { x: next.x, y: next.y, width: 0, height: 0 };
    draftRef.current = selection;
    setDraft(selection);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (!selecting || !start) return;
    const next = point(event);
    const selection = { x: Math.min(start.x, next.x), y: Math.min(start.y, next.y), width: Math.abs(next.x - start.x), height: Math.abs(next.y - start.y) };
    draftRef.current = selection;
    setDraft(selection);
  };
  const onPointerUp = () => {
    const selection = draftRef.current;
    if (selection && selection.width >= 3 && selection.height >= 3) {
      setPendingSelection(selection);
      setPendingText("");
    }
    startRef.current = null;
    draftRef.current = null;
    setDraft(null);
  };
  const onPointerCancel = () => {
    startRef.current = null;
    draftRef.current = null;
    setDraft(null);
  };
  const onCanvasKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selecting || pendingSelection) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setPendingSelection({ x: 25, y: 25, width: 50, height: 50 });
    setPendingText("");
  };
  const cancelPending = () => {
    setPendingSelection(null);
    setPendingText("");
  };
  const sendPending = () => {
    const text = pendingText.trim();
    if (!pendingSelection || !text) return;
    setNotes((current) => [
      ...current,
      { id: crypto.randomUUID(), text, selection: pendingSelection },
    ]);
    setPendingSelection(null);
    setPendingText("");
    setSelecting(false);
  };
  const complete = notes.length > 0 && notes.every((note) => note.text.trim());
  const activeSelection = draft || pendingSelection;
  const overlayNotes = activeSelection
    ? [...notes, { id: "draft", text: "", selection: activeSelection }]
    : notes;
  const pendingNumber = notes.length + 1;
  const composerStyle: CSSProperties | undefined = pendingSelection
    ? {
        left: pendingSelection.x + pendingSelection.width <= 42
          ? `clamp(0px, calc(${pendingSelection.x + pendingSelection.width}% + 16px), calc(100% - 292px))`
          : `clamp(0px, calc(${pendingSelection.x}% - 308px), calc(100% - 292px))`,
        top: `clamp(0px, ${pendingSelection.y}%, calc(100% - 180px))`,
      }
    : undefined;

  return (
    <div className="lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center lg:bg-black/50 lg:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modification-workspace-title"
        className="rounded-[8px] border border-[#DAC9B2] bg-white p-[15px] lg:relative lg:h-[min(868px,calc(100dvh-48px))] lg:w-full lg:max-w-[1110px] lg:overflow-y-auto lg:border-[#DCCFBC] lg:bg-[#FBF8F3] lg:p-0 lg:shadow-[0_30px_80px_rgba(20,14,10,0.35)]"
      >
        <header className="relative lg:h-[71px] lg:border-b lg:border-[#DCCFBC]">
          <h2
            id="modification-workspace-title"
            className="text-[24px] font-bold leading-[30px] text-[#231D1A] lg:absolute lg:left-[18px] lg:top-[24px] lg:text-[22px] lg:font-semibold lg:leading-[26px] lg:text-[#241C16]"
          >
            Tell the artist what to adjust.
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="hidden h-11 w-11 items-center justify-center text-[#241C16] lg:absolute lg:right-[22px] lg:top-[13px] lg:flex"
            aria-label="Close modification workspace"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </header>

        <div className="hidden h-[56px] items-center gap-[10px] rounded-[8px] border border-[#D8C8B6] bg-[#FBF8F3] pr-3 text-[14px] leading-[22px] text-[#4F443A] lg:mx-[31px] lg:mt-[25px] lg:flex">
          <button
            type="button"
            onClick={() => {
              if (pendingSelection) return;
              setSelecting((current) => !current);
            }}
            aria-pressed={selecting}
            className={`ml-[9px] inline-flex h-9 w-[120px] shrink-0 items-center justify-center rounded-[4px] border font-medium transition-colors ${selecting ? "border-[#D8563A] bg-[#D8563A] text-white" : "border-[#33251D] bg-[#33251D] text-white"}`}
          >
            Select area
          </button>
          Drag on the portrait to select an area. Add your modification note beside the selected area.
        </div>

        <div className="mt-5 grid gap-6 lg:mx-[30px] lg:mt-[23px] lg:grid-cols-[640px_374px] lg:gap-[33px]">
          <div className="relative aspect-[163/173] overflow-hidden rounded-[8px] bg-[#EFE8DD] lg:h-[658px] lg:w-[640px] lg:aspect-auto lg:px-[70px] lg:py-4">
            <div
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onKeyDown={onCanvasKeyDown}
              role="application"
              tabIndex={selecting ? 0 : -1}
              aria-label={selecting ? "Draw a rectangular modification area on the portrait" : "Select area to enable portrait annotation"}
              className={`relative h-full w-full touch-none overflow-hidden rounded-[8px] select-none lg:overflow-visible lg:rounded-none ${selecting && !pendingSelection ? "cursor-crosshair ring-2 ring-[#2F9E5F]/20" : "cursor-default"}`}
            >
              {image ? <PreviewImage src={image} alt="Portrait to annotate" className="h-full w-full rounded-[8px] object-cover lg:rounded-none" /> : null}
              <SelectionOverlays notes={overlayNotes} />
              {pendingSelection ? (
                <PendingModificationEditor
                  number={pendingNumber}
                  value={pendingText}
                  onChange={setPendingText}
                  onCancel={cancelPending}
                  onSend={sendPending}
                  className="absolute z-20 hidden w-[292px] lg:block"
                  style={composerStyle}
                />
              ) : null}
            </div>
          </div>

          {pendingSelection ? (
            <PendingModificationEditor
              number={pendingNumber}
              value={pendingText}
              onChange={setPendingText}
              onCancel={cancelPending}
              onSend={sendPending}
              className="lg:hidden"
            />
          ) : (
            <button
              type="button"
              onClick={() => setSelecting((current) => !current)}
              aria-pressed={selecting}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-[7px] border text-[15px] font-semibold lg:hidden ${selecting ? "border-[#D8563A] bg-[#D8563A] text-white" : "border-[#33251D] bg-[#33251D] text-white"}`}
            >
              Select area
            </button>
          )}

          <div className="border-t border-[#E5DCCF] pt-5 lg:border-0 lg:pt-0">
            <h3 className="flex items-center gap-2 text-[22px] font-bold leading-[30px] text-[#2A201C] lg:font-semibold lg:text-[#2B211B]">
              Modification notes
              {notes.length ? <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#C3AA87] px-1 text-[12px] font-bold leading-none text-white">{notes.length}</span> : null}
            </h3>
            <p className="mt-2 text-[13px] leading-[18px] text-[#6F6055] lg:text-[12px] lg:text-[#7B6B5C]">
              Each selected area creates one numbered note for the artist.
            </p>
            <div className="mt-[18px] hidden h-px bg-[#DCCFBC] lg:block" />
            <div className="mt-4 grid gap-3 lg:mt-6">
              {notes.length ? notes.map((note,index) => (
                <article key={note.id} className="relative min-h-[90px] rounded-[8px] border border-[#DCCFBC] bg-white/[0.86] px-[15px] py-[11px] pr-10">
                  <h4 className="text-[14px] font-semibold leading-5 text-[#241C16]">#{index + 1} Modification</h4>
                  <p className="mt-[6px] text-[13px] leading-5 text-[#5F5147]">{note.text}</p>
                  <button
                    type="button"
                    onClick={() => setNotes((current) => current.filter((row) => row.id !== note.id))}
                    className="absolute right-[10px] top-[7px] flex h-11 w-11 items-center justify-center text-[#9A3E32]"
                    aria-label={`Remove modification note ${index + 1}`}
                  >
                    <X size={18} strokeWidth={1.7} aria-hidden="true" />
                  </button>
                </article>
              )) : (
                <div className="min-h-[104px] rounded-[6px] border border-[#E1CCAC] bg-[#FCF8F4] px-[15px] py-[14px] text-left">
                  <p className="text-[16px] font-semibold leading-[21px] text-[#2A201C]">No area selected yet</p>
                  <p className="mt-2 text-[14px] leading-[19px] text-[#6F6055]">Drag on the portrait to select an area, then describe what should be adjusted.</p>
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!complete || busy}
              onClick={() => setConfirmOpen(true)}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[7px] bg-[#31271F] px-5 text-[15px] font-semibold leading-5 text-white transition-colors hover:bg-[#241C16] disabled:cursor-not-allowed disabled:bg-[#BDB9B6] lg:rounded-[8px] lg:text-[16px] lg:font-medium lg:leading-[22px]"
            >
              Submit Modification Request
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="ui-outline-control mt-[14px] inline-flex min-h-12 w-full items-center justify-center rounded-[7px] border border-[#E1CCAC] bg-white px-5 text-[15px] font-semibold leading-5 text-[#2A201C] transition-colors lg:mt-4 lg:min-h-[50px] lg:rounded-[8px] lg:border-[#DAC9B2] lg:text-[16px] lg:font-medium lg:leading-[22px] lg:text-[#231D1A]"
            >
              Back to Review
            </button>
            {error ? <p role="alert" className="mt-3 text-sm text-[#B42318]">{error}</p> : null}
          </div>
        </div>
      </section>
      {confirmOpen ? (
        <ModificationConfirmationDialog
          busy={busy}
          error={error}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void onSubmit(notes)}
        />
      ) : null}
    </div>
  );
}

function PendingModificationEditor({
  number,
  value,
  onChange,
  onCancel,
  onSend,
  className = "",
  style,
}: {
  number: number;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSend: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const canSend = Boolean(value.trim());

  return (
    <form
      className={`min-h-[180px] rounded-[8px] border border-[#D8C8B6] bg-white p-[17px] shadow-[0_10px_24px_-8px_rgba(43,33,27,0.18)] ${className}`}
      style={style}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <p className="text-[14px] font-semibold leading-5 text-[#2B211B]">#{number} Modification</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe the modification needed..."
        aria-label={`Modification note ${number}`}
        className="modification-composer__textarea mt-[10px] h-[70px] w-full resize-none rounded-[6px] border border-[#D8C8B6] bg-[#FFFDF9] px-[13px] py-2 text-[16px] leading-[22px] text-[#2B211B] outline-none placeholder:text-[#9A8B7B] lg:text-[13px] lg:leading-[19px]"
      />
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="modification-composer__action relative inline-flex h-9 min-h-9 w-20 items-center justify-center rounded-[6px] border border-[#DCCFBC] bg-white/[0.72] px-3 font-medium text-[#63523A] before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSend}
          className="modification-composer__action relative inline-flex h-9 min-h-9 w-20 items-center justify-center rounded-[6px] bg-[#33251D] px-3 font-semibold text-white before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] disabled:bg-[#BDB9B6]"
        >
          Send
        </button>
      </div>
    </form>
  );
}

function SelectionOverlays({ notes, activeId }: { notes: ModificationNote[]; activeId?: string }) {
  return <>{notes.map((note,index) => <span key={note.id} className={`pointer-events-none absolute border-2 ${activeId === note.id ? "border-[#D6534C] bg-[#D6534C]/12" : "border-[#3B9463] bg-[#3B9463]/10"}`} style={{ left:`${note.selection.x}%`, top:`${note.selection.y}%`, width:`${note.selection.width}%`, height:`${note.selection.height}%` }}><span className="absolute right-[-11px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center rounded-full border border-white bg-[#D6534C] text-[11px] font-bold text-white">{index+1}</span></span>)}</>;
}

function AnnotatedImage({ src, notes, activeId, className = "aspect-square" }: { src: string; notes: ModificationNote[]; activeId?: string; className?: string }) {
  return <div className={`relative overflow-hidden rounded-[6px] bg-[#EFE8DD] ${className}`}>{src ? <PreviewImage src={src} alt="Portrait with modification annotations" className="h-full w-full object-cover" /> : null}<SelectionOverlays notes={notes} activeId={activeId} /></div>;
}

function ApprovalDialog({ busy, error, onClose, onConfirm }: { busy: boolean; error: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-confirmation-title"
        aria-describedby="approval-confirmation-description"
        className="w-full max-w-[358px] rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3] px-[15px] pb-[23px] pt-[23px] shadow-[0_22px_54px_rgba(20,14,10,0.22)] lg:min-h-[382px] lg:max-w-[520px] lg:px-[31px] lg:pb-[32px] lg:pt-[28px]"
      >
        <p className="text-[12px] font-semibold leading-[15px] tracking-[1px] text-[#938575] lg:text-[11px] lg:leading-4">
          FINAL APPROVAL
        </p>
        <h2
          id="approval-confirmation-title"
          className="mt-4 text-[24px] font-semibold leading-[29px] text-[#2A201C] lg:mt-3 lg:text-[22px] lg:leading-8 lg:text-[#2B211C]"
        >
          Approve this portrait?
        </h2>
        <p
          id="approval-confirmation-description"
          className="mt-4 text-[15px] leading-[22px] text-[#6F6055] lg:mt-[18px] lg:min-h-[48px] lg:text-[14px] lg:leading-5 lg:text-[#66594E]"
        >
          Approval locks revision requests and moves this order to shipment preparation.
        </p>
        <div className="mt-6 min-h-[106px] rounded-[6px] border border-[#DCCFBC] bg-[rgba(243,235,222,0.52)] px-[15px] pt-[19px] lg:mt-[17px] lg:min-h-[90px] lg:rounded-[8px] lg:px-[17px] lg:pt-[15px]">
          <p className="text-[16px] font-semibold leading-[19px] text-[#2A201C] lg:text-[14px] lg:leading-5 lg:text-[#2B211C]">
            AFTER APPROVAL
          </p>
          <p className="mt-2 max-w-[250px] text-[14px] leading-5 text-[#6F6055] lg:mt-[6px] lg:max-w-none lg:text-[12px] lg:leading-[17px] lg:text-[#66594E]">
            <span className="lg:hidden">The studio will prepare the approved portrait for shipment.</span>
            <span className="hidden lg:inline">Revision requests will close The studio will prepare the approved portrait for shipment. Tracking details will be sent once it ships.</span>
          </p>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-[#B42318]">{error}</p> : null}
        <div className="mt-6 grid gap-[14px] lg:mt-[39px] lg:grid-cols-2 lg:gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="ui-outline-control order-2 inline-flex min-h-12 items-center justify-center rounded-[7px] border border-[#E1CCAC] bg-white px-5 text-[15px] font-medium leading-5 text-[#2A201C] transition-colors disabled:cursor-not-allowed disabled:text-[#AAA4A0] lg:order-1 lg:rounded-[8px] lg:border-[#DCCFBC] lg:bg-white/70 lg:text-[14px] lg:leading-[17px] lg:text-[#35261E]"
          >
            Back to Review
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className="order-1 inline-flex min-h-12 items-center justify-center rounded-[7px] bg-[#31271F] px-5 text-[15px] font-medium leading-5 text-white transition-colors hover:bg-[#241C16] disabled:cursor-not-allowed disabled:bg-[#BDB9B6] lg:order-2 lg:rounded-[8px] lg:text-[14px] lg:leading-[17px]"
            aria-busy={busy}
          >
            {busy ? "Submitting..." : "Confirm Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModificationConfirmationDialog({
  busy,
  error,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modification-confirmation-title"
        aria-describedby="modification-confirmation-description"
        className="w-full max-w-[358px] rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3] px-[15px] pb-[23px] pt-[23px] shadow-[0_22px_54px_rgba(20,14,10,0.22)] lg:min-h-[382px] lg:max-w-[520px] lg:px-[31px] lg:pb-[32px] lg:pt-[28px]"
      >
        <p className="text-[12px] font-semibold leading-[15px] tracking-[1px] text-[#938575] lg:text-[11px] lg:leading-4">
          FINAL CHECK
        </p>
        <h2
          id="modification-confirmation-title"
          className="mt-4 text-[24px] font-semibold leading-[29px] text-[#2A201C] lg:mt-3 lg:text-[22px] lg:leading-8 lg:text-[#2B211C]"
        >
          Submit modification request?
        </h2>
        <p
          id="modification-confirmation-description"
          className="mt-4 text-[15px] leading-[22px] text-[#6F6055] lg:mt-[18px] lg:min-h-[48px] lg:text-[14px] lg:leading-5 lg:text-[#66594E]"
        >
          Submitting locks these notes and sends them to the artist for revision.
        </p>
        <div className="mt-6 min-h-[106px] rounded-[6px] border border-[#DCCFBC] bg-[rgba(243,235,222,0.52)] px-[15px] pt-[19px] lg:mt-[17px] lg:min-h-[90px] lg:rounded-[8px] lg:px-[17px] lg:pt-[15px]">
          <p className="text-[16px] font-semibold leading-[19px] text-[#2A201C] lg:text-[14px] lg:leading-5 lg:text-[#2B211C]">
            Revision In Progress
          </p>
          <p className="mt-2 text-[14px] leading-5 text-[#6F6055] lg:mt-[6px] lg:text-[12px] lg:leading-[17px] lg:text-[#66594E]">
            After submission, the order returns to artist work and the review button is disabled until the revised portrait is ready.
          </p>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-[#B42318]">{error}</p> : null}
        <div className="mt-6 grid gap-[14px] lg:mt-[39px] lg:grid-cols-2 lg:gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="ui-outline-control order-2 inline-flex min-h-12 items-center justify-center rounded-[7px] border border-[#E1CCAC] bg-white px-5 text-[15px] font-medium leading-5 text-[#2A201C] transition-colors disabled:cursor-not-allowed disabled:text-[#AAA4A0] lg:order-1 lg:rounded-[8px] lg:border-[#DCCFBC] lg:bg-white/70 lg:text-[14px] lg:leading-[17px] lg:text-[#35261E]"
          >
            Back to Edit Notes
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="order-1 inline-flex min-h-12 items-center justify-center rounded-[7px] bg-[#31271F] px-5 text-[15px] font-medium leading-5 text-white transition-colors hover:bg-[#241C16] disabled:cursor-not-allowed disabled:bg-[#BDB9B6] lg:order-2 lg:rounded-[8px] lg:text-[14px] lg:leading-[17px]"
            aria-busy={busy}
          >
            {busy ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VersionHistoryDialog({ order, onClose }: { order: AccountOrder; onClose: () => void }) {
  const versions = order.artworkVersions.length ? order.artworkVersions : [{ id:"current", label:"FINAL PORTRAIT", title:"Final Portrait", subtitle:"Current artwork", imageUrl:artworkUrl(order), approved:true, notes:order.modificationNotes }];
  const initial = versions.find((version) => version.notes.length) || versions[0];
  const [selectedId, setSelectedId] = useState(initial.id);
  const [activeNote, setActiveNote] = useState<string | undefined>();
  const selected = versions.find((version) => version.id === selectedId) || initial;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#241C16]/55 px-4 py-10 lg:p-6"><section role="dialog" aria-modal="true" aria-labelledby="history-title" className="flex max-h-[calc(100dvh-80px)] w-full max-w-[1110px] flex-col overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#FFFDFB] shadow-[0_30px_80px_rgba(20,14,10,0.35)] lg:max-h-[calc(100dvh-48px)]"><header className="flex items-center justify-between border-b border-[#E7DCCC] px-4 py-4 lg:px-6"><div className="lg:flex lg:items-center lg:gap-12"><h2 id="history-title" className="text-[24px] font-bold lg:text-xl">Version history</h2><p className="hidden text-sm text-[#6C6054] lg:block">Review each artwork version, its marked areas, and the notes behind the final approval.</p></div><button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center" aria-label="Close version history"><X /></button></header><div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-4 lg:grid-cols-[minmax(0,640px)_374px] lg:p-6"><div><div className="rounded-[8px] bg-[#F3ECE2] p-4"><AnnotatedImage src={selected.imageUrl || artworkUrl(order)} notes={selected.notes} activeId={activeNote} className="aspect-[326/224] lg:aspect-square" /></div><p className="mt-3 hidden text-xs text-[#6C6054] lg:block">Click a note on the right to highlight its matching area on the portrait.</p></div><aside><h3 className="text-[22px] font-bold lg:text-xl">Versions</h3><div className="mt-4 grid gap-4">{versions.map((version) => <VersionCard key={version.id} version={version} expanded={selectedId === version.id} onToggle={() => {setSelectedId(version.id);setActiveNote(undefined);}} onNote={setActiveNote} />)}</div></aside></div><span className="mx-auto mb-3 h-1 w-[70px] rounded-full bg-[#E5DCCF] lg:hidden" /></section></div>;
}

function VersionCard({ version, expanded, onToggle, onNote }: { version: ArtworkVersion; expanded: boolean; onToggle: () => void; onNote: (id: string) => void }) {
  return <article className={`rounded-[6px] border bg-white p-4 ${expanded ? "border-[#31271F]" : "border-[#DCCFBC]"}`}><button type="button" onClick={onToggle} className="flex min-h-11 w-full items-center gap-3 text-left"><span className={`h-2 w-2 rounded-full ${version.approved ? "bg-[#2F8A55]" : "bg-[#31271F]"}`} /><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold text-[#806E5A]">{version.label}</span><strong className="mt-1 block text-base">{version.title}</strong><span className="mt-1 block text-xs text-[#6C6054]">{version.subtitle}</span></span>{expanded ? <Minus size={18} /> : <Plus size={18} />}</button>{expanded && version.notes.length ? <ol className="mt-4 grid gap-3 border-t border-[#E7DCCC] pt-4">{version.notes.map((note,index) => <li key={note.id}><button type="button" onClick={() => onNote(note.id)} className="flex min-h-11 w-full items-start gap-3 text-left text-sm leading-5 text-[#6C6054]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D6534C] text-[10px] font-bold text-white">{index+1}</span>{note.text}</button></li>)}</ol> : null}</article>;
}

function FullScreenPreview({ image, video, onClose }: { image: string; video?: string; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div role="dialog" aria-modal="true" aria-label={video ? "Full-screen studio video" : "Full-screen portrait"} className="fixed inset-0 z-[80] flex items-center justify-center bg-[#241C16]/95 p-5 lg:p-8"><button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-[8px] bg-white/10 text-white hover:bg-white/20" aria-label={video ? "Close full-screen studio video" : "Close full-screen portrait"}><X /></button>{video ? <video src={video} poster={image} controls autoPlay preload="metadata" playsInline className="max-h-full max-w-full object-contain" /> : <PreviewImage src={image} alt="Full-screen portrait" className="max-h-full max-w-full object-contain" />}</div>;
}

function GiftMessageDialog({
  initialMessage,
  senderPlaceholder,
  busy,
  onClose,
  onSave,
}: {
  initialMessage: GiftMessage | null;
  senderPlaceholder: string;
  busy: boolean;
  onClose: () => void;
  onSave: (message: GiftMessage) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialMessage?.title ?? "Your Title Here");
  const [sender, setSender] = useState(initialMessage?.sender ?? "");
  const [recipient, setRecipient] = useState(initialMessage?.recipient ?? "");
  const [message, setMessage] = useState(initialMessage?.message ?? "");
  const [previewNotice, setPreviewNotice] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const canSave = Boolean(title.trim() && sender.trim() && recipient.trim() && message.trim());

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    titleInputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#241C16]/[0.58] px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-message-title"
        className="mx-auto w-full max-w-[980px] overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3] shadow-[0_30px_80px_rgba(20,14,10,0.35)]"
      >
        <header className="flex items-center justify-between border-b border-[#DCCFBC] px-5 py-4">
          <h2 id="gift-message-title" className="text-xl font-semibold text-[#241C16]">Gift Message</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-[8px] p-2 text-[#31271F] transition-colors hover:bg-[#F3EBDE]"
            aria-label="Close gift message"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-6 p-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:p-8">
          <div className="rounded-[8px] border border-[#DCCFBC] bg-white p-6 shadow-[0_16px_34px_rgba(43,31,21,0.06)]">
            <div className="min-h-[430px] rounded-[8px] border border-[#EFE4D6] bg-[#FBF8F3] p-7 text-center">
              <div className="mx-auto h-16 w-28 rounded-full border-t-4 border-[#D7A77C]" aria-hidden="true" />
              <p className="mt-10 text-2xl font-semibold text-[#7A4A68]">{title || "Your Title Here"}</p>
              <div className="mt-5 space-y-1 text-sm font-semibold text-[#4F4437]">
                <p>To: {recipient || "Someone you love"}</p>
                <p>From: {sender || "Someone I love"}</p>
              </div>
              <p className="mx-auto mt-8 max-w-[24ch] whitespace-pre-line text-sm leading-7 text-[#5F564B]">
                {message || "This hand-painted portrait was created with love just for you."}
              </p>
              <p className="mt-10 text-lg font-semibold text-[#7A4A68]">ViewBrush</p>
            </div>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave || busy) return;
              void onSave({
                title: title.trim(),
                sender: sender.trim(),
                recipient: recipient.trim(),
                message: message.trim(),
              });
            }}
          >
            <label className="block text-sm font-semibold text-[#2D241B]">
              <span className="mb-2 block">Title *</span>
              <input ref={titleInputRef} required value={title} onChange={(event) => setTitle(event.target.value)} className={getInputClasses("min-h-[50px] bg-white text-base lg:text-sm")} />
            </label>
            <label className="block text-sm font-semibold text-[#2D241B]">
              <span className="mb-2 block">Your name *</span>
              <input required value={sender} onChange={(event) => setSender(event.target.value)} className={getInputClasses("min-h-[50px] bg-white text-base lg:text-sm")} placeholder={senderPlaceholder} />
            </label>
            <label className="block text-sm font-semibold text-[#2D241B]">
              <span className="mb-2 block">Recipient name *</span>
              <input required value={recipient} onChange={(event) => setRecipient(event.target.value)} className={getInputClasses("min-h-[50px] bg-white text-base lg:text-sm")} />
            </label>
            <label className="block text-sm font-semibold text-[#2D241B]">
              <span className="mb-2 block">Your message *</span>
              <textarea
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className={getInputClasses("min-h-[132px] resize-y bg-white text-base lg:text-sm")}
                placeholder="Write the note that will be printed with the portrait."
              />
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewNotice("Card preview is updated on the left.")}
                className="ui-outline-control min-h-12 rounded-[8px] border border-[#D8CBB8] bg-white/72 px-5 text-sm font-semibold text-[#31271F] transition-colors"
              >
                Card Preview
              </button>
              <button
                type="submit"
                disabled={!canSave || busy}
                className="min-h-12 rounded-[8px] bg-[#31271F] px-5 text-sm font-semibold text-[#FBF8F3] transition-colors hover:bg-[#241C16] disabled:bg-[#B9AB99]"
                aria-busy={busy}
              >
                {busy ? "Saving..." : "Add Gift Message"}
              </button>
            </div>
            <p aria-live="polite" className={`min-h-5 text-sm font-semibold text-[#5F564B] ${previewNotice ? "" : "sr-only"}`}>
              {previewNotice}
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

function PreviewImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  // Shopify media URLs are dynamic and cannot be enumerated in next.config.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={799} height={1200} loading="eager" decoding="async" className={className} />;
}
