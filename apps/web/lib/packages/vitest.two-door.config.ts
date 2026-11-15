/**
 * Hermetic vitest config for the two-door storefront / Stage-5 / store-credit
 * logic suites (owner: packages storefront workstream).
 *
 * Why this exists: the shared apps/web/vitest.config.ts loads vitest.setup.ts,
 * which imports @testing-library/jest-dom — unresolvable in this worktree's
 * node_modules layout. These suites are logic-only (no DOM), so they run with
 * a node environment and NO setup file. The hermetic env guarantees that used
 * to live in vitest.setup.ts are applied here BEFORE any test module loads:
 *
 *   - DATABASE_URL=stub  => @sports/db returns its stub client; no test can
 *     touch a real database (mirrors vitest.setup.ts local-run behavior).
 *   - dummy STRIPE_SECRET_KEY => legacy checkout path is exercisable with the
 *     Stripe SDK mocked in the test itself.
 *
 * Run from apps/web:
 *   node ../../node_modules/vitest/vitest.mjs run --config lib/packages/vitest.two-door.config.ts
 */
import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url)); // apps/web/lib/packages
const webRoot = resolve(here, "..", "..");
const repoRoot = resolve(webRoot, "..", "..");

const nodeRequire = createRequire(import.meta.url);
const nextServerEntry = nodeRequire.resolve("next/server");

// Hermetic environment — set before test modules import @sports/db.
if (process.env.FORCE_REAL_PRISMA !== "true") {
  process.env.DATABASE_URL = "stub";
}
if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = "sk_tes...ests";
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "lib/billing/store-credit-ledger.test.ts",
      "lib/packages/stage5-gate.test.ts",
      "lib/packages/two-door-offers.test.ts",
      "app/packages/__tests__/packages-two-door-storefront.test.ts",
      // Pre-existing legacy suites that exercise the surfaces this workstream
      // touched — run here as backward-compatibility evidence (logic-only).
      "__tests__/packages-storefront.test.ts",
      "__tests__/wagertalk-storefront-checkout.test.ts",
    ],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": webRoot,
      // Workspace package roots (same convention as the shared config):
      // Vite resolves the package.json main -> src/index.ts of THIS worktree.
      "@sports/db": resolve(repoRoot, "packages", "db"),
      "@sports/types": resolve(repoRoot, "packages", "types"),
      "next/server": nextServerEntry,
    },
  },
});