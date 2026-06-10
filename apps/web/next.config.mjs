import path from "node:path";

// Security headers below are mirrored in the repo-root vercel.json edge
// headers (which also cover non-Next-served responses). The two sources
// MUST stay byte-identical — __tests__/security-header-parity.test.ts
// pins both and fails CI on any drift. Change them together.

// Locks camera/microphone/geolocation everywhere; payment is restricted
// to self + Stripe.js (the checkout flow loads https://js.stripe.com).
const permissionsPolicy =
  'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")';

// Content-Security-Policy in REPORT-ONLY mode (R-11): browsers log
// would-be violations to the console, nothing is ever blocked. Moving to
// an enforcing CSP (nonce-based, without 'unsafe-inline'/'unsafe-eval')
// is a deliberate follow-up once report noise is zero — never flip this
// to the enforcing header name in a routine pass.
// 'unsafe-inline'/'unsafe-eval' cover Next.js inline bootstrap scripts
// and dev-mode eval; fonts.googleapis/gstatic cover Google Fonts.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-src 'self' https://js.stripe.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@sports/db",
    "@sports/types",
    "@sports/prediction-engine",
    "@sports/data-ingestion",
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
    domains: ["avatars.githubusercontent.com", "lh3.googleusercontent.com"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: permissionsPolicy,
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
          // HSTS — force HTTPS for two years incl. subdomains. Only takes
          // effect over HTTPS (Vercel serves HTTPS), so it is inert in local
          // http dev. `preload` is intentionally omitted (that is an
          // irreversible registry commitment and a founder decision).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
