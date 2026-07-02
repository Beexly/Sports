import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { jsonLdScript } from "@/lib/seo/json-ld";
import {
  Exo_2,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
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
import { SentryClientInit } from "@/components/observability/SentryClientInit";
import { SentientShell } from "@/components/motion/sentient-shell";
import { PageExplainerAuto } from "@/components/explainers/page-explainer";

// Exo 2 — the official Galaxy Sports Edge display face (Brand Bible §3):
// geometric, futuristic, uppercase for impact. Loaded ONCE (weights 500-900);
// it drives the standard headlines (--f-display) directly, and the heavy
// archetype slams via the `--f-arch: var(--f-display)` alias in
// styles/design-tokens.css — same font, no duplicate Google Fonts load.
const displayFont = Exo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
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

// JetBrains Mono — loaded ONCE for the numerals role; the mono role rides the
// `--f-mono: var(--f-numerals)` alias in styles/design-tokens.css.
const numeralsFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--f-numerals",
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
  themeColor: "#05070B",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout.
 *
 * Fonts are loaded through next/font and bound directly to the design-system
 * CSS variables consumed by `styles/design-tokens.css` and Tailwind:
 *   --f-display, --f-body, --f-numerals, --f-editorial (loaded here);
 *   --f-arch and --f-mono are aliases in design-tokens.css so each family is
 *   fetched exactly once.
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
        alt: `${BRAND_NAME} · ${BRAND_TAGLINE}`,
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
    // Official chrome emblem (Brand Bible v1.0) is the primary app/tab icon;
    // the SVG fallback keeps a vector tab icon for browsers that prefer it.
    icon: [
      { url: "/brand/gse-emblem-64.png", type: "image/png", sizes: "64x64" },
      { url: "/brand/gse-emblem.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/gse-emblem-180.png", sizes: "180x180" }],
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
  logo: `${SITE_URL}/brand/gse-emblem.png`,
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
    displayFont.variable,
    bodyFont.variable,
    numeralsFont.variable,
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
            __html: jsonLdScript(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(websiteJsonLd),
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
        <SentientShell />
        <PageExplainerAuto />
        <SentryClientInit />

        {/* ── Free analytics (prod-only, cookieless / consent-free) ────────── */}
        {process.env["NEXT_PUBLIC_ANALYTICS_ENABLED"] === "true" && (
          <>
            {/* Cloudflare Web Analytics — beacon, no cookies */}
            <Script
              id="cf-beacon"
              src="https://static.cloudflareinsights.com/beacon.min.js"
              data-cf-beacon={`{"token":"${process.env["NEXT_PUBLIC_CF_BEACON_TOKEN"]}"}`}
              strategy="afterInteractive"
            />

            {/* Microsoft Clarity — heatmaps + session recordings */}
            <Script id="ms-clarity" strategy="afterInteractive">
              {`(function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script","${process.env["NEXT_PUBLIC_CLARITY_PROJECT_ID"]}");`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
