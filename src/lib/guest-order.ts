import { applyPortraitHistory } from "./orders";
import { computeEditability, deriveOrderStage } from "./order-stage";
import type { AccountOrder, CustomerSummary } from "./types";

type GuestSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  email: string | null;
  customerId: string;
  firstName: string | null;
  lastName: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  cancelledAt: string | null;
  total: { amount: string; currencyCode: string } | null;
  shippingAddress: {
    firstName?: string | null;
    lastName?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    country?: string | null;
  } | null;
  tracking: { company: string | null; number: string | null } | null;
  originalPhotoUrl: string | null;
  paintingUrl: string | null;
  paintingStyle: string | null;
  businessStatus: string;
  history: {
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
      notes: AccountOrder["modificationNotes"];
    }>;
  };
};

function money(amount?: string | null, currency = "USD") {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function guestCustomer(snapshot: GuestSnapshot): CustomerSummary {
  return {
    id: snapshot.customerId,
    firstName: snapshot.firstName || "",
    lastName: snapshot.lastName || "",
    email: snapshot.email || "",
    isSubscribed: false,
    defaultAddress: null,
    addresses: [],
  };
}

export function guestOrder(snapshot: GuestSnapshot): AccountOrder {
  const fulfillment = snapshot.fulfillmentStatus || "UNFULFILLED";
  const businessStatus = snapshot.businessStatus || "order_placed";
  const orderStage = deriveOrderStage({
    businessStatus,
    reviewStatus: null,
    fulfillmentStatus: fulfillment,
    cancelledAt: snapshot.cancelledAt,
    closedAt: null,
  });
  const edit = computeEditability({
    fulfillmentStatus: fulfillment,
    financialStatus: snapshot.financialStatus,
    cancelledAt: snapshot.cancelledAt,
    closedAt: null,
    orderStage,
    businessStatus,
    versionCount: snapshot.history.versionCount ?? 0,
  });
  const address = snapshot.shippingAddress;
  const fullName = [address?.firstName, address?.lastName].filter(Boolean).join(" ");
  const street = [address?.address1, address?.address2].filter(Boolean).join(", ");
  const currency = snapshot.total?.currencyCode || "USD";
  const base: AccountOrder = {
    id: snapshot.id,
    name: snapshot.name,
    processedAt: snapshot.createdAt || null,
    email: snapshot.email,
    financialStatus: snapshot.financialStatus,
    fulfillmentStatus: fulfillment,
    cancelledAt: snapshot.cancelledAt,
    closedAt: null,
    total: money(snapshot.total?.amount, currency),
    currencyCode: currency,
    deliveryLabel: "Standard",
    orderStage,
    businessStatus,
    reviewStatus: null,
    versionCount: snapshot.history.versionCount ?? 0,
    modificationCount: snapshot.history.modificationCount ?? 0,
    modificationNotes: [],
    artworkVersions: [],
    tracking: snapshot.tracking?.number
      ? {
          company: snapshot.tracking.company || "",
          number: snapshot.tracking.number,
          url: "",
          status: fulfillment,
          estimatedDeliveryAt: null,
        }
      : null,
    giftMessage: null,
    shippingAddress: address
      ? {
          fullName,
          street,
          city: address.city || "",
          region: address.province || "",
          postalCode: address.zip || "",
          country: address.country || "",
        }
      : null,
    media: {
      paintingUrl: snapshot.paintingUrl || undefined,
      aiPreviewUrl: snapshot.paintingUrl || undefined,
      photoUrl: snapshot.originalPhotoUrl || undefined,
      style: snapshot.paintingStyle || undefined,
    },
    paymentStatusLabel: snapshot.financialStatus || "PENDING",
    pastCharges: [],
    upcomingCharges: [],
    canReview: edit.canReview,
    canModify: edit.canModify,
    canEditGift: false,
    canEditShipping: false,
    editBlockedReason: edit.editBlockedReason,
  };
  const withHistory = applyPortraitHistory(base, snapshot.history);
  return { ...withHistory, canEditGift: false, canEditShipping: false };
}
