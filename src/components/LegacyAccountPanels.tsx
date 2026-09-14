"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { getButtonClasses } from "@/lib/theme";
import type {
  AccountOrder,
  AddressRecord,
  CustomerSummary,
  PaymentChargeRow,
  UpcomingChargeRow,
} from "@/lib/types";

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-[26px] font-semibold text-[#241C16] md:text-[30px]">{title}</h2>;
}
export function AccountOverview({
  customer,
  profileUrl,
}: {
  customer: CustomerSummary;
  profileUrl: string;
}) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const shipping = customer.defaultAddress;
  const billing = customer.addresses[0] || customer.defaultAddress;

  return (
    <div className="space-y-14">
      <section>
        <SectionTitle title="Account Information" />
        <div className="grid gap-4 pt-6 lg:grid-cols-2">
          <div className="min-h-[184px] rounded-[8px] border border-[#DCCFBC] bg-white/82 p-5 shadow-[0_12px_28px_rgba(43,31,21,0.04)] md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Contact Information</p>
            <div className="mt-5 space-y-3 text-base font-semibold text-[#241C16]">
              <p>{fullName || "—"}</p>
              <p>{customer.email}</p>
            </div>
            <div className="mt-5 flex items-center gap-4 text-sm font-semibold">
              <a href={profileUrl} className="text-[#31271F] underline underline-offset-4 transition hover:text-[#6E6254]">
                Edit
              </a>
              <span className="h-4 w-px bg-[#DCCFBC]" />
              <a href={profileUrl} className="text-[#31271F] underline underline-offset-4 transition hover:text-[#6E6254]">
                Change Password
              </a>
            </div>
          </div>
          <div className="min-h-[184px] rounded-[8px] border border-[#DCCFBC] bg-white/82 p-5 shadow-[0_12px_28px_rgba(43,31,21,0.04)] md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Email Subscription</p>
            <p className="mt-5 text-base font-semibold text-[#241C16]">
              {customer.isSubscribed
                ? "You are subscribed to email updates."
                : "You aren't subscribed to email updates."}
            </p>
            <a
              href={profileUrl}
              className="mt-5 inline-block text-sm font-semibold text-[#31271F] underline underline-offset-4 transition hover:text-[#6E6254]"
            >
              Edit
            </a>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <SectionTitle title="Address Book" />
          <a href={profileUrl} className="text-sm font-semibold text-[#31271F] underline underline-offset-4">
            Manage Addresses
          </a>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <AddressCard
            label="Billing Address"
            address={billing}
            emptyText="No billing address on file."
            editUrl={profileUrl}
          />
          <AddressCard
            label="Shipping Address"
            address={shipping}
            emptyText="No shipping address on file."
            editUrl={profileUrl}
          />
        </div>
      </section>
    </div>
  );
}

function AddressCard({
  label,
  address,
  emptyText,
  editUrl,
}: {
  label: string;
  address: AddressRecord | null | undefined;
  emptyText: string;
  editUrl: string;
}) {
  return (
    <div className="min-h-[184px] rounded-[8px] border border-[#DCCFBC] bg-white/82 p-5 shadow-[0_12px_28px_rgba(43,31,21,0.04)] md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">{label}</p>
      {address ? (
        <div className="mt-5 space-y-1 text-sm leading-6 text-[#241C16]">
          <p className="font-semibold">{address.fullName}</p>
          <p>{address.street}</p>
          <p>
            {address.city}
            {address.region ? `, ${address.region}` : ""} {address.postalCode}
          </p>
          <p>{address.country}</p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-[#5F564B]">{emptyText}</p>
      )}
      <a href={editUrl} className="mt-5 inline-block text-sm font-semibold text-[#31271F] underline underline-offset-4">
        Edit
      </a>
    </div>
  );
}

export function PaymentStatusPanel({
  accountOrders,
  onCreate,
}: {
  accountOrders: AccountOrder[];
  onCreate: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeSelectedIndex = Math.min(
    selectedIndex,
    Math.max(0, accountOrders.length - 1),
  );
  const selectedOrder = accountOrders[safeSelectedIndex] ?? null;

  useEffect(() => {
    if (selectedIndex > accountOrders.length - 1) setSelectedIndex(0);
  }, [accountOrders.length, selectedIndex]);

  if (!selectedOrder) {
    return (
      <section className="rounded-[8px] border border-[#DCCFBC] bg-white/82 p-8 shadow-[0_18px_38px_rgba(43,31,21,0.05)]">
        <div className="max-w-[560px]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Payment Status</p>
          <h2 className="mt-3 text-[26px] font-semibold leading-tight text-[#241C16] md:text-[30px]">
            No payment records yet
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#5F564B]">
            Payment details will appear here after your first ViewBrush order is placed.
          </p>
          <button type="button" onClick={onCreate} className={getButtonClasses("primary", "mt-7 px-5 py-3 text-sm")}>
            Start Your Painting
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">ViewBrush Billing</p>
        <h2 className="mt-2 text-[26px] font-semibold leading-tight text-[#241C16] md:text-[30px]">
          Payment Status
        </h2>
        <p className="mt-3 max-w-[72ch] text-sm leading-7 text-[#5F564B]">
          Review charges, remaining milestones, and payment timing for each order in your workspace.
        </p>
      </div>

      {accountOrders.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {accountOrders.map((accountOrder, index) => (
            <button
              key={accountOrder.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`min-w-max rounded-[8px] border px-4 py-2 text-sm font-semibold transition ${
                safeSelectedIndex === index
                  ? "border-[#31271F] bg-[#31271F] text-[#FBF8F3]"
                  : "border-[#D8CBB8] bg-white/72 text-[#5F564B] hover:bg-[#F3EBDE]"
              }`}
            >
              {accountOrder.name}
            </button>
          ))}
        </div>
      )}

      <article className="rounded-[8px] border border-[#DCCFBC] bg-white/86 p-4 shadow-[0_18px_38px_rgba(43,31,21,0.05)] md:p-5">
        <div className="border-b border-[#DCCFBC] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8F816C]">Order Number</p>
          <h3 className="mt-2 break-words text-2xl font-semibold text-[#241C16]">
            {selectedOrder.name}
          </h3>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <PaymentOrderDetails order={selectedOrder} />
          <div className="min-w-0 space-y-5">
            <PaymentChargeTable title="Past Charges" rows={selectedOrder.pastCharges} />
            {selectedOrder.upcomingCharges.length > 0 && (
              <PaymentUpcomingCharges rows={selectedOrder.upcomingCharges} />
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

function PaymentOrderDetails({ order }: { order: AccountOrder }) {
  const artwork = order.media.paintingUrl || order.media.photoUrl;
  return (
    <div className="overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#FBF8F3]">
      <div className="bg-[#BFA487] px-4 py-3">
        <p className="text-sm font-semibold text-white">Order Details</p>
      </div>
      <div className="p-5">
        <div className="mx-auto h-32 w-32 overflow-hidden rounded-[8px] border border-[#DCCFBC] bg-[#EFE8DD]">
          {artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork}
              alt={order.media.conceptTitle || order.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#8F816C]">
              <ImageIcon size={28} />
            </div>
          )}
        </div>
        <div className="mt-6 divide-y divide-[#E5DCCF] text-sm">
          <PaymentDetailRow label="Artwork" value={order.media.conceptTitle || order.name} />
          <PaymentDetailRow
            label="Presentation"
            value={`${order.media.finishLabel || "Finish"} · ${order.media.size || "Size"}`}
          />
          <PaymentDetailRow label="Service" value={order.deliveryLabel} />
          <PaymentDetailRow label="Payment Status" value={String(order.paymentStatusLabel)} />
          <PaymentDetailRow label="Estimated Total" value={order.total} emphasize />
        </div>
      </div>
    </div>
  );
}

function PaymentDetailRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-[#8F816C]">{label}</span>
      <span
        className={`text-right ${
          emphasize ? "font-semibold text-[#241C16]" : "font-medium text-[#241C16]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentChargeTable({
  title,
  rows,
}: {
  title: string;
  rows: PaymentChargeRow[];
}) {
  return (
    <div className="rounded-[8px] border border-[#DCCFBC] bg-white/72">
      <div className="border-b border-[#DCCFBC] px-4 py-3">
        <p className="text-sm font-semibold text-[#241C16]">{title}</p>
      </div>
      {!rows.length ? (
        <p className="px-4 py-5 text-sm text-[#5F564B]">No charges recorded yet.</p>
      ) : (
        <ul className="divide-y divide-[#E5DCCF]">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="grid gap-1 px-4 py-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-[#241C16]">{row.label}</p>
                <p className="text-sm text-[#5F564B]">{row.description}</p>
                <p className="mt-1 text-xs text-[#8F816C]">{row.date}</p>
              </div>
              <p className="text-sm font-semibold text-[#241C16]">{row.amount}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PaymentUpcomingCharges({ rows }: { rows: UpcomingChargeRow[] }) {
  return (
    <div className="rounded-[8px] border border-[#DCCFBC] bg-white/72">
      <div className="border-b border-[#DCCFBC] px-4 py-3">
        <p className="text-sm font-semibold text-[#241C16]">Upcoming Charges</p>
      </div>
      <ul className="divide-y divide-[#E5DCCF]">
        {rows.map((row, index) => (
          <li key={`${row.label}-${index}`} className="grid gap-1 px-4 py-4 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold text-[#241C16]">{row.label}</p>
              <p className="text-sm text-[#5F564B]">{row.description}</p>
            </div>
            <p className="text-sm font-semibold text-[#241C16]">{row.amount}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
