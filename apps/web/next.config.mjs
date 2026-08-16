import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)); // apps/web
const repoRoot = path.resolve(here, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Typecheck is enforced in CI (`npm run typecheck`); full monorepo tsc inside
  // `next build` OOMs on constrained builders. Keep eslint on for ship blockers.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: false },
  transpilePackages: [
    "@sports/db",
    "@sports/types",
    "@sports/prediction-engine",
    "@sports/data-ingestion",
    "@sports/ingestion-pipeline",
    "@sports/epistemic-twin",
    "@sports/quote-plane",
    "@sports/util",
  ],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
    // Next 14.x: instrumentation.ts (server-startup hook that founder-gates the
    // live graded projections provider) requires this flag. Stable in Next 15.
    instrumentationHook: true,
    // The StatKing surfaces read JSON snapshots from the repo-root `data/` tree
    // via fs at request time. On Vercel's serverless bundle those files are not
    // included unless traced explicitly. Root is the monorepo root so the
    // `../../data` globs resolve; includes cover every route whose server code
    // calls the StatKing loaders (lib/statking/product.ts).
    outputFileTracingRoot: repoRoot,
    outputFileTracingIncludes: {
      "/stats/**": ["../../data/statking/**/*", "../../data/source-atlas/**/*"],
      "/admin/statking/**": ["../../data/statking/**/*", "../../data/source-atlas/**/*"],
      "/fable": ["../../docs/fable/**/*"],
    },
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
    formats: ["image/avif", "image/webp"],
    domains: ["avatars.githubusercontent.com", "lh3.googleusercontent.com"],
  },
  async redirects() {
    // Common auth aliases → NextAuth sign-in (preserves ?callbackUrl when present)
    // Money path UX: /checkout is not a page — Stripe Checkout is created from
    // /pricing SubscribeButton → POST /api/subscriptions/checkout. Soft alias so
    // capability graph + human muscle-memory never 404 the revenue entry.
    return [
      { source: "/signup", destination: "/auth/signin", permanent: false },
      { source: "/register", destination: "/auth/signin", permanent: false },
      { source: "/login", destination: "/auth/signin", permanent: false },
      { source: "/checkout", destination: "/pricing", permanent: false },
      { source: "/subscribe", destination: "/pricing", permanent: false },
    ];
  },
  async headers() {
    // CSP is strict in production (HTTPS expected, upgrade-insecure-requests
    // forces all mixed traffic to TLS). In dev the server runs on plain HTTP
    // (localhost:3000) and upgrade-insecure-requests would rewrite every
    // /_next/* chunk + img src to https://localhost:3000, which has no TLS —
    // the JS chunks 404, React never hydrates, and client event handlers
    // (e.g. SubscribeButton) are silently dead. We drop the directive in dev
    // so the e2e browser can load the bundle over HTTP.
    const isDev = process.env["NODE_ENV"] !== "production";
    const baseCsp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms https://scripts.clarity.ms https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https://www.clarity.ms https://*.clarity.ms https://*.vercel-insights.com https://api.stripe.com",
      "frame-src https://js.stripe.com",
      "worker-src 'self' blob:",
    ];
    const cspValue = isDev
      ? [...baseCsp].join("; ")
      : [...baseCsp, "upgrade-insecure-requests"].join("; ");
    return [
      // Free embed widgets (DEC-017) — iframe distribution. Framing is allowed
      // here via CSP frame-ancestors; the X-Frame-Options entry below is scoped
      // to exclude /embed so the two never land on the same response.
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
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
        ],
      },
      // X-Frame-Options: DENY on every route EXCEPT /embed. Next applies every
      // matching source, so a broad "/(.*)" would re-add DENY to the embed
      // response — shipping DENY alongside "frame-ancestors *". Browsers that
      // implement CSP2 ignore XFO when frame-ancestors is present, so the embed
      // still framed, but anything honouring XFO (older WebViews, scanners,
      // proxies) would refuse it. Excluding /embed here is what actually makes
      // the free Edge Index badge embeddable.
      {
        source: "/((?!embed$|embed/).*)",
        headers: [
          { key: "Content-Security-Policy", value: cspValue },
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
        ],
      },
    ];
  },
};

export default nextConfig;
