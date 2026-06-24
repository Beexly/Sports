import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)); // apps/web
const repoRoot = path.resolve(here, "../..");

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
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(process.cwd()),
      "@sports/galaxy-engine": path.resolve(repoRoot, "packages/galaxy-engine/src/index.ts"),
      "@sports/galaxy-spatial": path.resolve(repoRoot, "packages/galaxy-spatial/src/index.ts"),
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
