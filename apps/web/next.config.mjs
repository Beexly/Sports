import path from "node:path";

// Content-Security-Policy (salvaged from branch magical-volta-tvJpG, hardened).
// Shipped as REPORT-ONLY first — it cannot break anything; it only reports
// violations — so we can verify the real Stripe-redirect + Next inline-hydration
// behaviour against production before promoting to an enforcing
// `Content-Security-Policy` header. See docs/BRANCH_RECONCILIATION_2026-06-03.md.
//   - script-src 'unsafe-inline': Next.js 14 App Router injects inline hydration
//     scripts (and we emit inline JSON-LD). Tighten to nonce-based when CSP moves
//     to enforcing via middleware.
//   - img/style/font: Google avatars (NextAuth) + Google Fonts (preconnect in layout).
//   - form-action/frame-src include Stripe Checkout (server-side redirect target).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
  "connect-src 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-src 'self' https://checkout.stripe.com",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@sports/db",
    "@sports/types",
    "@sports/prediction-engine",
    "@sports/data-ingestion",
    "@sports/ingestion-pipeline",
  ],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(process.cwd()),
    };

    // Resolve .js extension imports to .ts source files for transpiled workspace packages.
    // Workspace packages use ESM-style `.js` extension imports in TypeScript source,
    // which webpack can't find without this alias.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
  images: {
    // remotePatterns replaces the deprecated `domains` array (Next.js 13.4+).
    // https only; no hostname wildcards.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
