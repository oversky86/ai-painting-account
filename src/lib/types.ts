export type OrderStage =
  | "artwork"
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
  /** Current artwork: the latest studio version once one exists, else the AI preview. */
  paintingUrl?: string;
  /** AI preview generated at checkout; kept after studio versions replace `paintingUrl`. */
  aiPreviewUrl?: string;
  photoUrl?: string;
  style?: string;
  keywords?: string;
  size?: string;
  finishLabel?: string;
  frameLabel?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  conceptTitle?: string;
};

export type ModificationSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ModificationNote = {
  id: string;
  text: string;
  selection: ModificationSelection;
};

export type ArtworkVersion = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  approved?: boolean;
  notes: ModificationNote[];
};

export type TrackingDetails = {
  company: string;
  number: string;
  url: string;
  status: string;
  estimatedDeliveryAt: string | null;
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
  businessStatus: string | null;
  reviewStatus: string | null;
  versionCount: number;
  modificationCount: number;
  modificationNotes: ModificationNote[];
  artworkVersions: ArtworkVersion[];
  tracking: TrackingDetails | null;
  giftMessage: GiftMessage | null;
  shippingAddress: AddressRecord | null;
  media: OrderLineMedia;
  paymentStatusLabel: string;
  pastCharges: PaymentChargeRow[];
  upcomingCharges: UpcomingChargeRow[];
  canReview: boolean;
  canModify: boolean;
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
  /** Canonical myshopify.com domain for this session */
  shopDomain?: string;
};
