export type OrderStage =
  | "review"
  | "revision"
  | "framing"
  | "shipping"
  | "complete";

export type AccountView = "orders" | "account" | "payment-status";

export type GiftMessage = {
  title: string;
  sender: string;
  recipient: string;
  message: string;
};

export type AddressRecord = {
  fullName: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSubscribed: boolean;
  defaultAddress: AddressRecord | null;
  addresses: AddressRecord[];
};

export type OrderLineMedia = {
  paintingUrl?: string;
  photoUrl?: string;
  style?: string;
  keywords?: string;
  size?: string;
  finishLabel?: string;
  frameLabel?: string;
  videoUrl?: string;
  conceptTitle?: string;
};

export type PaymentChargeRow = {
  label: string;
  description: string;
  date: string;
  amount: string;
};

export type UpcomingChargeRow = {
  label: string;
  description: string;
  amount: string;
};

export type AccountOrder = {
  id: string;
  name: string;
  processedAt: string | null;
  email: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  cancelledAt: string | null;
  closedAt: string | null;
  total: string;
  currencyCode: string;
  deliveryLabel: string;
  orderStage: OrderStage;
  reviewStatus: string | null;
  giftMessage: GiftMessage | null;
  shippingAddress: AddressRecord | null;
  media: OrderLineMedia;
  paymentStatusLabel: string;
  pastCharges: PaymentChargeRow[];
  upcomingCharges: UpcomingChargeRow[];
  canReview: boolean;
  canEditGift: boolean;
  canEditShipping: boolean;
  editBlockedReason: string | null;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  customerId?: string;
};
