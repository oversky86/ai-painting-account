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
    review: {
      current: "Painting Ready For Review",
      next: "Shipping",
      currentDescription:
        "Payment is complete. Review the finished portrait before the studio prepares shipment.",
      nextDescription: "Approve the portrait or request a modification.",
    },
    revision: {
      current: "Modifications Requested",
      next: "Portrait Review",
      currentDescription:
        "Your artist has the modification request and will prepare an updated review.",
      nextDescription: "You will be notified when the revised artwork is ready.",
    },
    framing: {
      current: "Painting Approved",
      next: "Shipping",
      currentDescription:
        "The artwork is approved. The selected presentation was confirmed during checkout.",
      nextDescription: "The studio will prepare shipping details next.",
    },
    shipping: {
      current: "Ready For Shipping",
      next: "Shipping Details",
      currentDescription:
        "The portrait is approved and the studio is preparing shipment.",
      nextDescription: "Shipping details will be confirmed before dispatch.",
    },
    complete: {
      current: "Order Complete",
      next: "Shipment In Progress",
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
    "mt-4 inline-flex rounded-[8px] border px-3 py-2 text-xs font-semibold";
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
  if (input.reviewStatus === "approved") {
    if (fulfillment && fulfillment !== "UNFULFILLED") return "shipping";
    return "framing";
  }
  return "review";
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
    (input.orderStage === "review" || input.orderStage === "revision") &&
    !input.cancelledAt &&
    !input.closedAt;

  return {
    canReview,
    canEditGift: !locked,
    canEditShipping: !locked && (input.orderStage === "shipping" || input.orderStage === "complete" || input.orderStage === "framing"),
    editBlockedReason: reason,
  };
}
