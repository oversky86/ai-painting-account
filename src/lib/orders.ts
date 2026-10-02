import {
  computeEditability,
  deriveOrderStage,
} from "./order-stage";
import type {
  AccountOrder,
  AddressRecord,
  CustomerSummary,
  GiftMessage,
  ArtworkVersion,
  ModificationNote,
  OrderLineMedia,
  PaymentChargeRow,
  TrackingDetails,
  UpcomingChargeRow,
} from "./types";
import { caGraphql } from "./shopify-ca";
import type { ShopConfig } from "./shops";
import { postSignedWrite } from "./hmac";
import { normalizeBusinessStatus } from "./business-status";

const CUSTOMER_ORDERS_QUERY = `
query AccountWorkspace {
  customer {
    id
    firstName
    lastName
    emailAddress { emailAddress marketingState }
    defaultAddress {
      firstName lastName address1 address2 city province zip country
    }
    addresses(first: 10) {
      nodes {
        firstName lastName address1 address2 city province zip country
      }
    }
    orders(first: 25, sortKey: PROCESSED_AT, reverse: true) {
      nodes {
        id
        name
        processedAt
        cancelledAt
        financialStatus
        fulfillments(first: 5) {
          nodes {
            status
            latestShipmentStatus
            estimatedDeliveryAt
            trackingInformation { company number url }
          }
        }
        totalPrice { amount currencyCode }
        shippingAddress {
          firstName lastName address1 address2 city province zip country
        }
        paymentInformation {
          paymentStatus
          totalPaidAmount { amount currencyCode }
          totalOutstandingAmount { amount currencyCode }
        }
        transactions {
          createdAt
          processedAt
          kind
          status
          transactionAmount {
            presentmentMoney { amount currencyCode }
          }
        }
        lineItems(first: 10) {
          nodes {
            title
            customAttributes { key value }
          }
        }
        businessStatus: metafield(namespace: "custom", key: "business_status") {
          value
        }
        reviewStatus: metafield(namespace: "custom", key: "review_status") {
          value
        }
        giftMessage: metafield(namespace: "custom", key: "gift_message") {
          value
        }
        modificationRequest: metafield(namespace: "custom", key: "modification_request") {
          value
        }
        artworkVersions: metafield(namespace: "custom", key: "artwork_versions") {
          value
        }
      }
    }
  }
}
`;

type CaCustomer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: {
    emailAddress?: string | null;
    marketingState?: string | null;
  } | null;
  defaultAddress?: CaAddress | null;
  addresses?: { nodes: CaAddress[] } | null;
  orders?: { nodes: CaOrder[] } | null;
};

type CaAddress = {
  firstName?: string | null;
  lastName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  country?: string | null;
};

type CaOrder = {
  id: string;
  name: string;
  processedAt?: string | null;
  cancelledAt?: string | null;
  financialStatus?: string | null;
  fulfillments?: {
    nodes: Array<{
      status?: string | null;
      latestShipmentStatus?: string | null;
      estimatedDeliveryAt?: string | null;
      trackingInformation?: Array<{
        company?: string | null;
        number?: string | null;
        url?: string | null;
      }> | null;
    }>;
  } | null;
  totalPrice?: { amount: string; currencyCode: string } | null;
  shippingAddress?: CaAddress | null;
  paymentInformation?: {
    paymentStatus?: string | null;
    totalPaidAmount?: { amount: string; currencyCode: string } | null;
    totalOutstandingAmount?: { amount: string; currencyCode: string } | null;
  } | null;
  transactions?: Array<{
    createdAt?: string | null;
    processedAt?: string | null;
    kind?: string | null;
    status?: string | null;
    transactionAmount?: {
      presentmentMoney?: { amount: string; currencyCode: string } | null;
    } | null;
  }> | null;
  lineItems?: {
    nodes: Array<{
      title?: string | null;
      customAttributes?: Array<{ key: string; value?: string | null }> | null;
    }>;
  } | null;
  businessStatus?: { value?: string | null } | null;
  reviewStatus?: { value?: string | null } | null;
  giftMessage?: { value?: string | null } | null;
  modificationRequest?: { value?: string | null } | null;
  artworkVersions?: { value?: string | null } | null;
};

function mapAddress(address?: CaAddress | null): AddressRecord | null {
  if (!address) return null;
  const fullName = [address.firstName, address.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const street = [address.address1, address.address2]
    .filter(Boolean)
    .join(", ");
  if (!street && !address.city) return null;
  return {
    fullName: fullName || "Customer",
    street,
    city: address.city || "",
    region: address.province || "",
    postalCode: address.zip || "",
    country: address.country || "",
  };
}

function attr(
  attrs: Array<{ key: string; value?: string | null }> | null | undefined,
  key: string,
) {
  // Prefer hidden `_key` (checkout-hidden), fall back to legacy visible key.
  const hidden = `_${key}`;
  return (
    attrs?.find((a) => a.key === hidden)?.value ||
    attrs?.find((a) => a.key === key)?.value ||
    undefined
  );
}

function collectMedia(order: CaOrder): OrderLineMedia {
  const result: OrderLineMedia = {};
  for (const line of order.lineItems?.nodes || []) {
    const attrs = line.customAttributes || [];
    result.paintingUrl =
      result.paintingUrl || attr(attrs, "painting_url");
    result.aiPreviewUrl = result.aiPreviewUrl || attr(attrs, "painting_url");
    result.photoUrl =
      result.photoUrl || attr(attrs, "original_photo_url");
    result.style = result.style || attr(attrs, "style");
    result.keywords = result.keywords || attr(attrs, "keywords");
    result.size = result.size || attr(attrs, "size");
    result.finishLabel =
      result.finishLabel ||
      attr(attrs, "presentation") ||
      attr(attrs, "finish_type") ||
      attr(attrs, "finish");
    result.frameLabel = result.frameLabel || attr(attrs, "frame");
    result.videoUrl = result.videoUrl || attr(attrs, "studio_video_url");
    result.conceptTitle =
      result.conceptTitle || result.style || line.title || undefined;
  }
  return result;
}

function parseGift(raw: string | null): GiftMessage | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GiftMessage;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: parsed.title || "",
      sender: parsed.sender || "",
      recipient: parsed.recipient || "",
      message: parsed.message || "",
    };
  } catch {
    return {
      title: "Gift message",
      sender: "",
      recipient: "",
      message: raw,
    };
  }
}

function clampPercentage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

function parseModificationNotes(raw: string | null): ModificationNote[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "notes" in parsed
        ? (parsed as { notes?: unknown }).notes
        : [];
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row, index) => {
      if (!row || typeof row !== "object") return [];
      const item = row as Record<string, unknown>;
      const selection =
        item.selection && typeof item.selection === "object"
          ? (item.selection as Record<string, unknown>)
          : {};
      const text = String(item.text || item.note || "").trim();
      if (!text) return [];
      return [{
        id: String(item.id || index + 1),
        text,
        selection: {
          x: clampPercentage(selection.x, 12 + index * 8),
          y: clampPercentage(selection.y, 12 + index * 12),
          width: clampPercentage(selection.width, 24),
          height: clampPercentage(selection.height, 22),
        },
      }];
    });
  } catch {
    return [{
      id: "1",
      text: raw,
      selection: { x: 12, y: 12, width: 24, height: 22 },
    }];
  }
}

function parseArtworkVersions(
  raw: string | null,
  fallbackImage: string | undefined,
): ArtworkVersion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row, index) => {
      if (!row || typeof row !== "object") return [];
      const item = row as Record<string, unknown>;
      const notes = parseModificationNotes(JSON.stringify(item.notes || []));
      return [{
        id: String(item.id || `version-${index + 1}`),
        label: String(item.label || `Revision ${String(index + 1).padStart(2, "0")}`),
        title: String(item.title || `Artwork version ${index + 1}`),
        subtitle: String(item.subtitle || `${notes.length} modification notes`),
        imageUrl: String(item.imageUrl || item.image_url || fallbackImage || "") || undefined,
        approved: Boolean(item.approved),
        notes,
      }];
    });
  } catch {
    return [];
  }
}

function collectTracking(order: CaOrder): TrackingDetails | null {
  for (const fulfillment of order.fulfillments?.nodes || []) {
    const tracking = fulfillment.trackingInformation?.find(
      (item) => item.number || item.url,
    );
    if (!tracking) continue;
    return {
      company: tracking.company || "Carrier",
      number: tracking.number || "",
      url: tracking.url || "",
      status: fulfillment.latestShipmentStatus || fulfillment.status || "In transit",
      estimatedDeliveryAt: fulfillment.estimatedDeliveryAt || null,
    };
  }
  return null;
}

function money(amount?: string | null, currency = "USD") {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function mapPastCharges(order: CaOrder): PaymentChargeRow[] {
  const currency = order.totalPrice?.currencyCode || "USD";
  return (order.transactions || [])
    .filter((t) => {
      const kind = (t.kind || "").toUpperCase();
      const status = (t.status || "").toUpperCase();
      return (
        (kind === "SALE" || kind === "CAPTURE" || kind === "AUTHORIZATION") &&
        status !== "FAILURE" &&
        status !== "ERROR"
      );
    })
    .map((t) => {
      const amount = t.transactionAmount?.presentmentMoney;
      return {
        label: t.kind || "Payment",
        description: `Transaction ${t.kind || ""}`.trim(),
        date: formatDate(t.processedAt || t.createdAt),
        amount: money(amount?.amount, amount?.currencyCode || currency),
      };
    });
}

function mapUpcoming(order: CaOrder): UpcomingChargeRow[] {
  const outstanding = order.paymentInformation?.totalOutstandingAmount;
  const amount = Number(outstanding?.amount || 0);
  if (!amount || amount <= 0) return [];
  return [
    {
      label: "Outstanding balance",
      description: "Remaining amount due on this order.",
      amount: money(outstanding?.amount, outstanding?.currencyCode || "USD"),
    },
  ];
}

function fulfillmentStatus(order: CaOrder): string | null {
  const statuses = (order.fulfillments?.nodes || [])
    .map((f) => f.status)
    .filter(Boolean) as string[];
  if (!statuses.length) return "UNFULFILLED";
  if (statuses.some((s) => s === "SUCCESS")) return "FULFILLED";
  return statuses[0] || null;
}

function mapOrder(order: CaOrder): AccountOrder {
  const media = collectMedia(order);
  const businessStatus = order.businessStatus?.value || null;
  const reviewStatus = order.reviewStatus?.value || null;
  const fulfillment = fulfillmentStatus(order);
  const cancelledAt = order.cancelledAt || null;
  const orderStage = deriveOrderStage({
    businessStatus,
    reviewStatus,
    fulfillmentStatus: fulfillment,
    cancelledAt,
    closedAt: null,
  });
  const edit = computeEditability({
    fulfillmentStatus: fulfillment,
    financialStatus: order.financialStatus || null,
    cancelledAt,
    closedAt: null,
    orderStage,
    businessStatus,
    versionCount: 0,
  });
  const currency = order.totalPrice?.currencyCode || "USD";
  const modificationNotes = parseModificationNotes(
    order.modificationRequest?.value || null,
  );
  const artworkVersions = parseArtworkVersions(
    order.artworkVersions?.value || null,
    media.paintingUrl || media.photoUrl,
  );

  return {
    id: order.id,
    name: order.name,
    processedAt: order.processedAt || null,
    email: null,
    financialStatus: order.financialStatus || null,
    fulfillmentStatus: fulfillment,
    cancelledAt,
    closedAt: null,
    total: money(order.totalPrice?.amount, currency),
    currencyCode: currency,
    deliveryLabel: "Standard",
    orderStage,
    businessStatus,
    reviewStatus,
    versionCount: 0,
    modificationCount: 0,
    modificationNotes,
    artworkVersions,
    tracking: collectTracking(order),
    giftMessage: parseGift(order.giftMessage?.value || null),
    shippingAddress: mapAddress(order.shippingAddress),
    media,
    paymentStatusLabel:
      order.paymentInformation?.paymentStatus ||
      order.financialStatus ||
      "PENDING",
    pastCharges: mapPastCharges(order),
    upcomingCharges: mapUpcoming(order),
    canReview: edit.canReview,
    canModify: edit.canModify,
    canEditGift: edit.canEditGift,
    canEditShipping: edit.canEditShipping,
    editBlockedReason: edit.editBlockedReason,
  };
}

type PortraitHistory = {
  businessStatus?: string;
  versionCount?: number;
  modificationCount?: number;
  versions?: Array<{
    versionNumber: number;
    imageUrl?: string | null;
    videoUrl?: string | null;
    createdAt?: string;
  }>;
  modificationRequests?: Array<{
    againstVersion: number;
    createdAt?: string;
    notes: ModificationNote[];
  }>;
};

const APPROVED_STATUSES = new Set(["prepare_shipment", "shipped"]);

/** One signed request for all orders instead of one per order. */
async function fetchPortraitHistories(
  orders: AccountOrder[],
  shop: ShopConfig,
  customerId: string,
): Promise<Record<string, PortraitHistory>> {
  if (!orders.length) return {};
  try {
    const res = await postSignedWrite("/api/account/order-write", {
      type: "portrait_history_batch",
      shop: shop.storeDomain,
      orderIds: orders.map((order) => order.id),
      customerId,
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      orders?: Record<string, PortraitHistory>;
    } | null;
    if (!res.ok || !json?.ok) return {};
    return json.orders || {};
  } catch (err) {
    console.error("[orders] fetchPortraitHistories failed", err);
    return {};
  }
}

function applyPortraitHistory(
  order: AccountOrder,
  history: PortraitHistory | undefined,
): AccountOrder {
  if (!history) return order;

  const businessStatus =
    history.businessStatus || order.businessStatus || "order_placed";
  const versionCount = history.versionCount ?? 0;
  const versions = history.versions || [];
  const requests = history.modificationRequests || [];
  const latestVersion = versions[versions.length - 1];
  const latestRequest = requests[requests.length - 1];
  const approved = APPROVED_STATUSES.has(businessStatus);

  const artworkVersions: ArtworkVersion[] = versions
    .map((v) => {
      const matching = requests.find((r) => r.againstVersion === v.versionNumber);
      const isFinal = approved && v.versionNumber === latestVersion?.versionNumber;
      return {
        id: `v${v.versionNumber}`,
        label: isFinal
          ? "FINAL APPROVED"
          : `VERSION ${String(v.versionNumber).padStart(2, "0")}`,
        title: isFinal ? "Final Portrait" : `Portrait version ${v.versionNumber}`,
        subtitle: isFinal
          ? "Approved · Ready for shipment"
          : matching
            ? `${matching.notes.length} modification notes`
            : "Studio delivery",
        imageUrl: v.imageUrl || undefined,
        approved: isFinal,
        notes: matching?.notes || [],
      };
    })
    .reverse();

  const media = {
    ...order.media,
    paintingUrl: latestVersion?.imageUrl || order.media.paintingUrl,
    videoUrl: latestVersion?.videoUrl || order.media.videoUrl,
    videoPosterUrl: latestVersion?.imageUrl || order.media.videoPosterUrl,
  };

  const orderStage = deriveOrderStage({
    businessStatus,
    reviewStatus: order.reviewStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    cancelledAt: order.cancelledAt,
    closedAt: order.closedAt,
  });
  const edit = computeEditability({
    fulfillmentStatus: order.fulfillmentStatus,
    financialStatus: order.financialStatus,
    cancelledAt: order.cancelledAt,
    closedAt: order.closedAt,
    orderStage,
    businessStatus: normalizeBusinessStatus(businessStatus),
    versionCount,
  });

  return {
    ...order,
    businessStatus,
    versionCount,
    modificationCount: history.modificationCount ?? 0,
    orderStage,
    media,
    artworkVersions: artworkVersions.length
      ? artworkVersions
      : order.artworkVersions,
    modificationNotes: latestRequest?.notes?.length
      ? latestRequest.notes
      : order.modificationNotes,
    canReview: edit.canReview,
    canModify: edit.canModify,
    canEditGift: edit.canEditGift,
    canEditShipping: edit.canEditShipping,
    editBlockedReason: edit.editBlockedReason,
  };
}

export async function loadWorkspace(
  accessToken: string,
  shop: ShopConfig,
): Promise<{
  customer: CustomerSummary;
  orders: AccountOrder[];
}> {
  const data = await caGraphql<{ customer: CaCustomer | null }>(
    shop,
    accessToken,
    CUSTOMER_ORDERS_QUERY,
  );
  const customer = data.customer;
  if (!customer) throw new Error("Customer not found");

  const mappedCustomer: CustomerSummary = {
    id: customer.id,
    firstName: customer.firstName || "",
    lastName: customer.lastName || "",
    email: customer.emailAddress?.emailAddress || "",
    isSubscribed:
      (customer.emailAddress?.marketingState || "").toUpperCase() ===
      "SUBSCRIBED",
    defaultAddress: mapAddress(customer.defaultAddress),
    addresses: (customer.addresses?.nodes || [])
      .map(mapAddress)
      .filter(Boolean) as AddressRecord[],
  };

  const baseOrders = (customer.orders?.nodes || []).map(mapOrder);
  const histories = await fetchPortraitHistories(
    baseOrders,
    shop,
    mappedCustomer.id,
  );
  const orders = baseOrders.map((order) =>
    applyPortraitHistory(order, histories[order.id]),
  );
  return { customer: mappedCustomer, orders };
}
