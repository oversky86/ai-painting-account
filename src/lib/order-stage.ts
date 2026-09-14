import type { OrderStage } from "./types";

/** Exact copy from ViewBrush Account.tsx getOrderStageCopy */
export function getOrderStageCopy(stage: OrderStage) {
  const copy: Record<
    OrderStage,
    {
      current: string;
      next: string;
      currentDescription: string;
      nextDescription: string;
    }
    > = {
    artwork: {
      current: "Artwork in Progress",
      next: "Portrait Review",
      currentDescription:
        "Your artist is creating the portrait. We will email you when the finished artwork is ready for review.",
      nextDescription: "The finished portrait will be available here for approval.",
    },
    review: {
      current: "Ready For Review",
      next: "Preparing Shipment",
      currentDescription:
        "Payment is complete. Review the finished portrait before the studio prepares shipment.",
      nextDescription: "Approve the portrait or request a modification.",
    },
    revision: {
      current: "Revision In Progress",
      next: "Ready For Review",
      currentDescription:
        "Your artist has the modification request and will prepare an updated review.",
      nextDescription: "You will be notified when the revised artwork is ready.",
    },
    framing: {
      current: "Preparing Shipment",
      next: "Shipped",
      currentDescription:
        "The artwork is approved. The selected presentation was confirmed during checkout.",
      nextDescription: "The studio will prepare shipping details next.",
    },
    shipping: {
      current: "Shipped",
      next: "Delivered",
      currentDescription:
        "The portrait is approved and the studio is preparing shipment.",
      nextDescription: "Shipping details will be confirmed before dispatch.",
    },
    complete: {
      current: "Shipped",
      next: "Delivered",
      currentDescription:
        "The portrait, presentation, payment, and shipping details are confirmed.",
      nextDescription:
        "The studio will send tracking as soon as the package ships.",
    },
  };
  return copy[stage];
}

export function isCompletedOrderStage(orderStage?: OrderStage) {
  return orderStage === "shipping" || orderStage === "complete";
}

export function getOrderStatusBadgeClasses(orderStage: OrderStage) {
  const baseClasses =
    "inline-flex min-h-[34px] items-center justify-center rounded-[6px] border px-5 text-[13px] font-semibold";
  if (
    orderStage === "framing" ||
    orderStage === "shipping" ||
    orderStage === "complete"
  ) {
    return `${baseClasses} border-[#9AC6A7] bg-[#EAF6ED] text-[#2F6B3B]`;
  }
  return `${baseClasses} border-[#DCCFBC] bg-[#F7F0E6] text-[#5F564B]`;
}

export function deriveOrderStage(input: {
  reviewStatus: string | null;
  fulfillmentStatus: string | null;
  cancelledAt: string | null;
  closedAt: string | null;
}): OrderStage {
  const fulfillment = (input.fulfillmentStatus || "").toUpperCase();
  if (input.cancelledAt || input.closedAt || fulfillment === "FULFILLED") {
    if (fulfillment === "FULFILLED" || input.closedAt) {
      return fulfillment === "FULFILLED" && !input.closedAt
        ? "shipping"
        : "complete";
    }
  }
  if (fulfillment.includes("DELIVERED") || fulfillment === "COMPLETE") {
    return "complete";
  }
  if (
    fulfillment === "IN_TRANSIT" ||
    fulfillment === "OUT_FOR_DELIVERY" ||
    fulfillment === "PARTIALLY_FULFILLED"
  ) {
    return "shipping";
  }
  if (input.reviewStatus === "modify_requested") return "revision";
  if (
    input.reviewStatus === "ready_for_review" ||
    input.reviewStatus === "ready" ||
    input.reviewStatus === "review"
  ) {
    return "review";
  }
  if (input.reviewStatus === "approved") {
    if (fulfillment && fulfillment !== "UNFULFILLED") return "shipping";
    return "framing";
  }
  return "artwork";
}

export function computeEditability(input: {
  fulfillmentStatus: string | null;
  cancelledAt: string | null;
  closedAt: string | null;
  orderStage: OrderStage;
}) {
  const fulfillment = (input.fulfillmentStatus || "").toUpperCase();
  const locked =
    Boolean(input.cancelledAt) ||
    Boolean(input.closedAt) ||
    fulfillment === "FULFILLED" ||
    fulfillment.includes("DELIVERED") ||
    fulfillment === "IN_TRANSIT" ||
    fulfillment === "OUT_FOR_DELIVERY";

  let reason: string | null = null;
  if (input.cancelledAt) reason = "This order was cancelled.";
  else if (input.closedAt) reason = "This order is closed.";
  else if (fulfillment === "FULFILLED" || fulfillment.includes("DELIVERED"))
    reason = "Shipping has already started for this order.";
  else if (fulfillment === "IN_TRANSIT" || fulfillment === "OUT_FOR_DELIVERY")
    reason = "This order is already in transit.";

  const canReview =
    input.orderStage === "review" &&
    !input.cancelledAt &&
    !input.closedAt;

  return {
    canReview,
    canEditGift: !locked,
    canEditShipping: !locked && (input.orderStage === "shipping" || input.orderStage === "complete" || input.orderStage === "framing"),
    editBlockedReason: reason,
  };
}
