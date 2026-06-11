import type { Metadata, Viewport } from "next";
import {
  Big_Shoulders_Display,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Syne,
} from "next/font/google";
import "./globals.css";
import {
  BRAND_META,
  BRAND_NAME,
  BRAND_TAGLINE,
  SOCIAL,
  SUPPORT_EMAIL,
} from "@/lib/brand";
import { CommandPalette } from "@/components/ui/command-palette";
import { GalaxyCursor } from "@/components/ui/galaxy-cursor";

const archFont = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--f-arch",
  display: "swap",
});

const displayFont = Syne({
  subsets: ["latin"],
  variable: "--f-display",
  display: "swap",
});

// Next 14.2's Google font manifest does not expose Geist, so --f-body uses
// the doctrine stack's first available Google fallback while preserving the var.
const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--f-body",
  display: "swap",
});

const numeralsFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--f-numerals",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--f-mono",
  display: "swap",
});

const editorialFont = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--f-editorial",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#04060a",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout.
 *
 * Fonts are loaded through next/font and bound directly to the design-system
 * CSS variables consumed by `styles/design-tokens.css` and Tailwind:
 *   --f-arch, --f-display, --f-body, --f-mono, --f-numerals, --f-editorial.
 *
 * SEO foundation:
 *  - Per-page <title>/<description> override the defaults below via each
 *    page.tsx exporting its own `metadata`.
 *  - JSON-LD (Organization + WebSite) is rendered in <head> so search engines
 *    have a verified entity to attach signals to from day one.
 *  - X handle wired in twitter.site/creator so attribution survives reshares.
 */

// Apex host to match sitemap.ts / robots.ts — a mismatched fallback (www here,
// apex there) splits canonical signals when NEXT_PUBLIC_APP_URL is unset.
const SITE_URL =
  process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com";

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
  const fontVariables = [
    archFont.variable,
    displayFont.variable,
    bodyFont.variable,
    numeralsFont.variable,
    monoFont.variable,
    editorialFont.variable,
  ].join(" ");

  return (
    <html lang="en" className={`scroll-smooth ${fontVariables}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
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
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          Skip to content
        </a>
        {children}
        <CommandPalette />
        <GalaxyCursor />
      </body>
    </html>
  );
}
