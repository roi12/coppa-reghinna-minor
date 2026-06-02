import type { Metadata } from "next";

import { BRAND } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: BRAND.appName,
  description: BRAND.tagline,
  icons: {
    icon: BRAND.logoPath,
    apple: BRAND.logoPath,
    shortcut: BRAND.logoPath,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
