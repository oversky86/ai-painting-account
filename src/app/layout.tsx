import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ViewBrush Account",
  description: "Your ViewBrush artwork workspace, orders, and payment status.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
