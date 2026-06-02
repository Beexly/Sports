import path from "node:path";

// Content-Security-Policy for this app.
// Script-src requires 'unsafe-inline' because Next.js 14 App Router injects
// inline hydration scripts. Tighten to nonce-based once CSP middleware lands.
// font-src / style-src allow Google Fonts (preconnect in layout.tsx).
// img-src allows GitHub and Google avatar origins used by NextAuth providers.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
    // Only https is allowed; no hostname wildcards.
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
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
