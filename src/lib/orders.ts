import {
  computeEditability,
  deriveOrderStage,
} from "./order-stage";
import type {
  AccountOrder,
  AddressRecord,
  CustomerSummary,
  GiftMessage,
  OrderLineMedia,
  PaymentChargeRow,
  UpcomingChargeRow,
} from "./types";
import { caGraphql } from "./shopify-ca";

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
        financialStatus
        fulfillments(first: 5) { nodes { status } }
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
        reviewStatus: metafield(namespace: "custom", key: "review_status") {
          value
        }
        giftMessage: metafield(namespace: "custom", key: "gift_message") {
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
  financialStatus?: string | null;
  fulfillments?: { nodes: Array<{ status?: string | null }> } | null;
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
  reviewStatus?: { value?: string | null } | null;
  giftMessage?: { value?: string | null } | null;
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
  return attrs?.find((a) => a.key === key)?.value || undefined;
}

function collectMedia(order: CaOrder): OrderLineMedia {
  const result: OrderLineMedia = {};
  for (const line of order.lineItems?.nodes || []) {
    const attrs = line.customAttributes || [];
    result.paintingUrl =
      result.paintingUrl || attr(attrs, "painting_url");
    result.photoUrl =
      result.photoUrl || attr(attrs, "original_photo_url");
    result.style = result.style || attr(attrs, "style");
    result.keywords = result.keywords || attr(attrs, "keywords");
    result.size = result.size || attr(attrs, "size");
    result.finishLabel = result.finishLabel || attr(attrs, "finish");
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
  const reviewStatus = order.reviewStatus?.value || null;
  const fulfillment = fulfillmentStatus(order);
  const orderStage = deriveOrderStage({
    reviewStatus,
    fulfillmentStatus: fulfillment,
    cancelledAt: null,
    closedAt: null,
  });
  const edit = computeEditability({
    fulfillmentStatus: fulfillment,
    cancelledAt: null,
    closedAt: null,
    orderStage,
  });
  const currency = order.totalPrice?.currencyCode || "USD";

  return {
    id: order.id,
    name: order.name,
    processedAt: order.processedAt || null,
    email: null,
    financialStatus: order.financialStatus || null,
    fulfillmentStatus: fulfillment,
    cancelledAt: null,
    closedAt: null,
    total: money(order.totalPrice?.amount, currency),
    currencyCode: currency,
    deliveryLabel: "Standard",
    orderStage,
    reviewStatus,
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
    canEditGift: edit.canEditGift,
    canEditShipping: edit.canEditShipping,
    editBlockedReason: edit.editBlockedReason,
  };
}

export async function loadWorkspace(accessToken: string): Promise<{
  customer: CustomerSummary;
  orders: AccountOrder[];
}> {
  const data = await caGraphql<{ customer: CaCustomer | null }>(
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

  const orders = (customer.orders?.nodes || []).map(mapOrder);
  return { customer: mappedCustomer, orders };
}
