import { redirect } from "next/navigation";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  const rawShop = params.shop;
  next.set(
    "shop",
    typeof rawShop === "string" && rawShop.trim().toLowerCase() === "dev" ? "dev" : "prod",
  );
  for (const key of ["order", "token", "error"]) {
    const value = params[key];
    if (typeof value === "string" && value) next.set(key, value);
  }
  const query = next.toString();
  redirect(query ? `/orders?${query}` : "/orders");
}
