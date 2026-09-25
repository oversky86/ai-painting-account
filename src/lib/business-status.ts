export const BUSINESS_STATUSES = [
  "order_placed",
  "portrait_review",
  "supplier_modification",
  "prepare_shipment",
  "shipped",
] as const;

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const MAX_PORTRAIT_VERSIONS = 3;

export function isBusinessStatus(value: unknown): value is BusinessStatus {
  return (
    typeof value === "string" &&
    (BUSINESS_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeBusinessStatus(
  value: string | null | undefined,
): BusinessStatus {
  if (isBusinessStatus(value)) return value;
  return "order_placed";
}

/** Customer may request modifications only against versions 1 and 2. */
export function canRequestModification(versionCount: number): boolean {
  return versionCount > 0 && versionCount < MAX_PORTRAIT_VERSIONS;
}
