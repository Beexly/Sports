import type { Metadata, Viewport } from "next";
import "./globals.css";
import {
  BRAND_META,
  BRAND_NAME,
  BRAND_TAGLINE,
  SOCIAL,
  SUPPORT_EMAIL,
} from "@/lib/brand";

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
 *
 * SEO foundation:
 *  - Per-page <title>/<description> override the defaults below via each
 *    page.tsx exporting its own `metadata`.
 *  - JSON-LD (Organization + WebSite) is rendered in <head> so search engines
 *    have a verified entity to attach signals to from day one.
 *  - X handle wired in twitter.site/creator so attribution survives reshares.
 */

const SITE_URL =
  process.env["NEXT_PUBLIC_APP_URL"] ?? "https://www.galaxysportsedge.com";

const ORG_HANDLE = "@GalaxySportsAI";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_META.defaultTitle,
    template: BRAND_META.titleTemplate,
  },
  description: BRAND_META.description,
  keywords: [
    "sports betting model",
    "sports analytics platform",
    "transparent sports picks",
    "audited sports picks",
    "calibrated betting confidence",
    "sports betting intelligence",
    "sports pick reasoning",
    "sharp sports analytics",
    "anti-tout sports model",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: BRAND_META.defaultTitle,
    description: BRAND_TAGLINE,
    siteName: BRAND_NAME,
    url: SITE_URL,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_META.defaultTitle,
    description: BRAND_TAGLINE,
    site: ORG_HANDLE,
    creator: ORG_HANDLE,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo-mark.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/logo-mark.svg" }],
  },
  manifest: "/site.webmanifest",
};

// ──────────────────────────────────────────────────────────────────────────
// JSON-LD — Organization + WebSite
// ──────────────────────────────────────────────────────────────────────────

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND_NAME,
  alternateName: "GSE",
  url: SITE_URL,
  logo: `${SITE_URL}/logo-mark.svg`,
  description: BRAND_META.description,
  sameAs: [
    SOCIAL.x,
    SOCIAL.instagram,
    SOCIAL.threads,
    SOCIAL.facebook,
  ].filter(Boolean),
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: SUPPORT_EMAIL,
    availableLanguage: ["en"],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: BRAND_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/picks?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
