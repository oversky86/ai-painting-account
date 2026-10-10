"use client";

import Image from "next/image";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";

type StorefrontChromeProps = {
  storefrontUrl: string;
  createUrl: string;
  cartUrl: string;
  cached?: boolean;
};

const navigation = [
  { label: "How It Works", path: "/pages/how-it-works" },
  { label: "Materials", path: "/pages/materials" },
  { label: "FAQ", path: "/pages/faq" },
  { label: "Contact Us", path: "/pages/contact" },
];

function storefrontHref(origin: string, path: string) {
  return `${origin}${path}` || "/";
}

export function StorefrontHeader({
  storefrontUrl,
  createUrl,
  cartUrl,
  cached = false,
}: StorefrontChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-[90] h-16 border-b border-[#D8CDBB] bg-[#F6F0E7]/[0.92] backdrop-blur-[12px] transition-colors">
      <nav
        aria-label="Primary"
        className="relative z-[100] mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10"
      >
        <div className="flex min-w-0 flex-1 items-center">
          <a
            href={storefrontUrl || "/"}
            aria-label="Go to ViewBrush home"
            className="inline-flex rounded-[2px] transition-opacity hover:opacity-95"
          >
            <span className="relative block h-6 w-[118px] sm:h-7 sm:w-[137px] lg:h-8 lg:w-[157px]">
              <Image
                src="/viewbrush-logo.png"
                alt="ViewBrush"
                fill
                priority
                sizes="(min-width: 1024px) 157px, (min-width: 640px) 137px, 118px"
                className="object-contain"
              />
            </span>
          </a>
        </div>

        <ul className="ml-auto hidden flex-none items-center justify-end gap-8 pr-8 lg:flex xl:pr-10">
          {navigation.map((item) => (
            <li key={item.label}>
              <a
                href={storefrontHref(storefrontUrl, item.path)}
                className="inline-flex min-h-11 items-center whitespace-nowrap text-base font-medium text-[#69523F] transition-colors hover:text-[#31271F]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex flex-none items-center justify-end gap-2 sm:gap-3 md:gap-4 lg:gap-5">
          <a
            href="/account"
            className="relative hidden h-[18px] w-[18px] items-center justify-center text-[#31271F] lg:inline-flex"
            aria-label="Account"
            aria-current="page"
          >
            <User size={18} strokeWidth={2} aria-hidden="true" />
          </a>
          <a
            href={cartUrl}
            className="relative hidden h-[18px] w-[18px] items-center justify-center text-[#69523F] transition-colors hover:text-[#31271F] lg:inline-flex"
            aria-label="Cart"
          >
            <ShoppingBag size={18} strokeWidth={2} aria-hidden="true" />
          </a>
          <a
            href={createUrl}
            className="storefront-header__cta inline-flex items-center justify-center whitespace-nowrap rounded-[8px] bg-[#31271F] font-normal text-[#FBF8F3] transition-colors hover:bg-[#241C16]"
          >
            {cached ? "Resume" : "Create Artwork"}
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded-[8px] border border-[#DCCFBC] bg-white/[0.78] p-0 text-[#5F564A] transition-colors hover:bg-white lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div className="absolute inset-x-0 top-16 z-[80] h-[calc(100dvh-64px)] overflow-hidden bg-[#F6F0E7] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 border-0 bg-[#F6F0E7] p-0"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu overlay"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="storefront-mobile-menu absolute inset-0 overflow-y-auto bg-transparent px-4 pb-10 pt-4 sm:px-6"
          >
            <div className="m-0 border-b border-[#E8DECF] p-4">
              <p className="text-xs font-bold uppercase text-[#8F816C]">Menu</p>
            </div>
            <div className="flex flex-col gap-1 py-3">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={storefrontHref(storefrontUrl, item.path)}
                  className="flex min-h-[52px] items-center justify-between rounded-[8px] px-4 py-3.5 text-base font-normal leading-6 text-[#2D241B] transition-colors hover:bg-[#F3EBDE]"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="grid gap-1 border-t border-[#E8DECF] py-3">
              <a href="/account" aria-current="page" className="flex min-h-[52px] items-center gap-3 rounded-[8px] px-4 py-3.5 text-base font-normal leading-6 text-[#2D241B] transition-colors hover:bg-[#F3EBDE]">
                <User size={16} aria-hidden="true" /> Account
              </a>
              <a href={cartUrl} className="flex min-h-[52px] items-center gap-3 rounded-[8px] px-4 py-3.5 text-base font-normal leading-6 text-[#2D241B] transition-colors hover:bg-[#F3EBDE]">
                <ShoppingBag size={16} aria-hidden="true" /> Cart
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function StorefrontFooter({ storefrontUrl }: { storefrontUrl: string }) {
  const contactAction = storefrontHref(storefrontUrl, "/contact#contact_form");
  return (
    <footer className="w-full border-t border-[#DCCFBC] bg-[#FBF8F3] px-6 py-12 text-[#2D241B] lg:px-0 lg:pb-12 lg:pt-16">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:px-10">
        <div className="lg:col-span-4">
          <a href={storefrontUrl || "/"} className="inline-flex rounded-[2px] transition-opacity hover:opacity-95" aria-label="Go to ViewBrush home">
            <span className="relative block h-[34px] w-[166px] md:h-10 md:w-[196px]">
              <Image src="/viewbrush-logo.png" alt="ViewBrush" fill sizes="(min-width: 768px) 196px, 166px" className="object-contain" />
            </span>
          </a>
          <p className="mt-4 max-w-96 text-sm leading-[1.625] text-[#6A6155]">
            A clear vision. A human touch. Preview the direction first, then bring it to life as a finished piece for the wall it lives on.
          </p>
        </div>

        <FooterLinks
          title="Company"
          links={[
            ["About Us", storefrontHref(storefrontUrl, "/pages/about")],
            ["How It Works", storefrontHref(storefrontUrl, "/pages/how-it-works")],
          ]}
        />
        <FooterLinks
          title="Support"
          links={[
            ["Contact Us", storefrontHref(storefrontUrl, "/pages/contact")],
            ["FAQ", storefrontHref(storefrontUrl, "/pages/faq")],
            ["Refund Policy", storefrontHref(storefrontUrl, "/pages/refund-policy")],
          ]}
        />

        <div className="min-w-0 lg:col-span-4">
          <h2 className="m-0 text-base font-semibold leading-6">$10 off your first order</h2>
          <p className="mb-6 mt-4 max-w-96 text-sm leading-[1.625] text-[#2D241B]/60">Join our family of pet lovers and get exclusive offers.</p>
          <iframe name="account-newsletter" title="Newsletter response" className="hidden" />
          <form action={contactAction} method="post" target="account-newsletter" className="flex w-full items-stretch gap-2">
            <input type="hidden" name="form_type" value="customer" />
            <input type="hidden" name="contact[tags]" value="newsletter" />
            <input
              type="email"
              name="contact[email]"
              placeholder="Email address"
              aria-label="Email address"
              autoComplete="email"
              required
              className="min-w-0 flex-1 rounded-[4px] border border-[#DCCFBC] bg-[#FFFDF9] px-4 py-3 text-base leading-6 text-[#2D241B] placeholder:text-[#9E9184]"
            />
            <button type="submit" className="min-w-11 flex-none whitespace-nowrap rounded-[8px] bg-[#31271F] px-6 py-3 text-base text-[#FBF8F3] hover:bg-[#241C16]">Join</button>
          </form>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-[1600px] border-t border-[#DCCFBC] px-0 pt-8 text-xs leading-4 opacity-50 lg:px-10">
        <p>© {new Date().getFullYear()} ViewBrush. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function AccountFooter({
  storefrontUrl,
  context,
}: {
  storefrontUrl: string;
  context: "orders" | "order-detail" | "account";
}) {
  const supportLinks: Array<[string, string]> = [
    ["Contact Us", storefrontHref(storefrontUrl, "/pages/contact")],
    ["FAQ", storefrontHref(storefrontUrl, "/pages/faq")],
    ["Refund Policy", storefrontHref(storefrontUrl, "/pages/refund-policy")],
  ];

  const supportPrompt = context === "order-detail"
    ? "Need help with this order?"
    : context === "account"
      ? "Need help with your account?"
      : "Need help with your orders?";

  return (
    <footer className="w-full border-t border-[#DCCFBC] bg-[#F8F3EC] text-[#2D241B]">
      <div className="mx-auto grid w-full max-w-[1280px] gap-1 px-4 py-3 sm:px-6 lg:min-h-[72px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-10 lg:py-2">
        <div className="min-w-0 lg:flex lg:items-center lg:gap-7">
          <p className="text-sm font-semibold">
            {supportPrompt}
          </p>
          <nav aria-label="Order support" className="flex flex-wrap items-center gap-x-6">
            {supportLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="account-orders-footer__support-link inline-flex min-h-11 items-center font-medium text-[#69523F] underline decoration-[#BDAE9B] underline-offset-4 transition-colors hover:text-[#241C16]"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#756A5F] lg:justify-end">
          <a href={storefrontHref(storefrontUrl, "/policies/privacy-policy")} className="account-orders-footer__legal-link inline-flex min-h-11 items-center hover:text-[#241C16]">
            Privacy
          </a>
          <span aria-hidden="true">·</span>
          <p>© {new Date().getFullYear()} ViewBrush</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="lg:col-span-2">
      <h2 className="m-0 text-base font-semibold leading-6">{title}</h2>
      <ul className="m-0 mt-6 list-none p-0 text-sm leading-5">
        {links.map(([label, href], index) => (
          <li key={label} className={index ? "mt-4" : ""}>
            <a href={href} className="text-[#69523F] transition-colors hover:text-[#31271F]">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
