import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND_META, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const viewport: Viewport = {
  themeColor: "#04060a",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout.
 *
 * Fonts (Syne, Big Shoulders Display, Geist, Geist Mono, Instrument Serif,
 * JetBrains Mono, Space Grotesk) are loaded via the @import at the top of
 * `styles/design-tokens.css` to keep one source of truth with the standalone
 * design-system CSS. If we ever swap to `next/font` for layout-shift wins,
 * remove the @import there and mirror the variables here.
 */

export const metadata: Metadata = {
  title: {
    default: BRAND_META.defaultTitle,
    template: BRAND_META.titleTemplate,
  },
  description: BRAND_META.description,
  keywords: [
    "sports picks",
    "sports analysis",
    "NFL picks",
    "NBA picks",
    "MLB picks",
    "NHL picks",
    "transparent sports model",
    "sports intelligence",
  ],
  openGraph: {
    type: "website",
    title: BRAND_META.defaultTitle,
    description: BRAND_TAGLINE,
    siteName: BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_META.defaultTitle,
    description: BRAND_TAGLINE,
  },
  metadataBase: process.env["NEXT_PUBLIC_APP_URL"]
    ? new URL(process.env["NEXT_PUBLIC_APP_URL"])
    : undefined,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo-mark.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/logo-mark.svg" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
