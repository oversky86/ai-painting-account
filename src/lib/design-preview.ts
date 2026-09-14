import { computeEditability } from "./order-stage";
import type {
  AccountOrder,
  CustomerSummary,
  ModificationNote,
  OrderStage,
} from "./types";

export const designPreviewCustomer: CustomerSummary = {
  id: "design-preview-customer",
  firstName: "Ryan",
  lastName: "Liu",
  email: "liu yuan@gmail.com",
  isSubscribed: true,
  defaultAddress: {
    fullName: "Ryan Liu",
    street: "123 Market Street",
    city: "San Francisco",
    region: "CA",
    postalCode: "94103",
    country: "United States",
  },
  addresses: [],
};

const previewNotes: ModificationNote[] = [
  {
    id: "1",
    text: "Soften the background plant shadow.",
    selection: { x: 10, y: 8, width: 25, height: 24 },
  },
  {
    id: "2",
    text: "Keep the dog face unchanged.",
    selection: { x: 11, y: 46, width: 27, height: 23 },
  },
  {
    id: "3",
    text: "Make the head a little more vertical.",
    selection: { x: 53, y: 42, width: 26, height: 29 },
  },
  {
    id: "4",
    text: "Preserve the original expression.",
    selection: { x: 82, y: 58, width: 16, height: 25 },
  },
];

const stageReviewStatus: Record<OrderStage, string> = {
  artwork: "artwork_in_progress",
  review: "ready_for_review",
  revision: "modify_requested",
  framing: "approved",
  shipping: "approved",
  complete: "approved",
};

export function createDesignPreviewOrder(stage: OrderStage, hasVersionHistory = false): AccountOrder {
  const fulfillmentStatus =
    stage === "shipping" || stage === "complete" ? "FULFILLED" : "UNFULFILLED";
  const editability = computeEditability({
    fulfillmentStatus,
    cancelledAt: null,
    closedAt: null,
    orderStage: stage,
  });

  return {
    id: "gid://shopify/Order/design-preview",
    name: "VB-RE2791620057344",
    processedAt: "2026-08-18T10:00:00.000Z",
    email: designPreviewCustomer.email,
    financialStatus: "PAID",
    fulfillmentStatus,
    cancelledAt: null,
    closedAt: null,
    total: "$279",
    currencyCode: "USD",
    deliveryLabel: "Standard",
    orderStage: stage,
    reviewStatus: stageReviewStatus[stage],
    modificationNotes: stage === "revision" ? previewNotes.slice(0, 3) : [],
    artworkVersions: hasVersionHistory ? [
      {
        id: "final",
        label: "FINAL APPROVED",
        title: "Final Portrait",
        subtitle: "Approved · Ready for shipment",
        imageUrl: "/viewbrush-order-preview.webp",
        approved: true,
        notes: [],
      },
      {
        id: "revision-02",
        label: "REVISION 02",
        title: "Second preview",
        subtitle: "4 modification notes",
        imageUrl: "/viewbrush-order-preview.webp",
        notes: previewNotes,
      },
      {
        id: "revision-01",
        label: "REVISION 01",
        title: "First preview",
        subtitle: "2 modification notes",
        imageUrl: "/viewbrush-order-preview.webp",
        notes: previewNotes.slice(0, 2),
      },
    ] : [{
      id: "final",
      label: "FINAL APPROVED",
      title: "Final Portrait",
      subtitle: "Approved · Ready for shipment",
      imageUrl: "/viewbrush-order-preview.webp",
      approved: true,
      notes: [],
    }],
    tracking:
      stage === "shipping" || stage === "complete"
        ? {
            company: "UPS",
            number: "1Z999AA10123456784",
            url: "https://www.ups.com/track",
            status: "In transit",
            estimatedDeliveryAt: "2026-08-28T12:00:00.000Z",
          }
        : null,
    giftMessage: null,
    shippingAddress: designPreviewCustomer.defaultAddress,
    media: {
      paintingUrl: "/viewbrush-order-preview.webp",
      photoUrl: "/viewbrush-order-reference.webp",
      videoUrl: "/viewbrush-studio-preview.mp4",
      videoPosterUrl: "/viewbrush-studio-video-poster.webp",
      style: "Realism",
      size: "16×16 in",
      finishLabel: "Gallery Wrap",
      frameLabel: "Gallery Wrap",
      conceptTitle: "Realism",
    },
    paymentStatusLabel: "Paid",
    pastCharges: [],
    upcomingCharges: [],
    ...editability,
  };
}
