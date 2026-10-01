import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { createRequire } from "module";

// next-auth (v5 beta) imports the bare specifier `next/server`. Next 14 ships no
// `exports` map, so Vitest's ESM resolver can't append `.js` for a node_modules
// dependency and route tests that transitively pull in next-auth fail to resolve.
// Pin `next/server` to its real entry file so resolution is deterministic.
const nodeRequire = createRequire(import.meta.url);
const nextServerEntry = nodeRequire.resolve("next/server");

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    // 60s, not 30s: the first test to import a heavy shared package (e.g.
    // @sports/prediction-engine) pays a one-time cold Vite transform that alone
    // is ~12s, and under full-suite CPU contention (the guardrail subprocess
    // tests saturate cores) that can tip a trivial import past a 30s ceiling and
    // flake. 60s clears the cold-transform edge without masking a real hang.
    testTimeout: 60_000,
    server: {
      deps: {
        // Inline next-auth so Vite transforms it and resolves its internal bare
        // `next/server` import (see the resolve.alias note above). Left external,
        // Node's ESM loader can't resolve it and route tests that pull in auth fail.
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      // Workspace packages resolve their own internal imports with the
      // TypeScript ESM `.js` extension convention (88 specifiers in
      // packages/data-ingestion/src/index.ts). Vitest's resolver cannot map a
      // `.js` specifier to the `.ts` source, so `@sports/data-ingestion`
      // loaded as `undefined` and every test importing `calibratedWinProb`
      // died with "calibratedWinProb is not a function". Map the package
      // ROOT, not `src/index.ts`: callers deep-import it too (e.g.
      // `@sports/data-ingestion/src/source-registry`), and a file-exact
      // alias silently breaks those.
      "@sports/ingestion-pipeline": resolve(
        __dirname,
        "../../packages/ingestion-pipeline/src/index.ts",
      ),
      // Deep `.js` specifiers INTO a workspace package must resolve to `.ts`.
      // Same class of bug as #969: a specifier like
      // `@sports/prediction-engine/src/hierarchical-pool.js` resolves to nothing
      // because no such `.js` exists on disk. Aliasing the package ROOT (rather
      // than a bare specifier) lets Vite map `.js` to `.ts` inside a package it
      // transforms. Each root needs its own entry; the previous attempt used a
      // regex alias, which this config's alias type rejects.
      "@sports/prediction-engine": resolve(
        __dirname,
        "../../packages/prediction-engine",
      ),
      "@sports/data-ingestion": resolve(
        __dirname,
        "../../packages/data-ingestion",
      ),
      "next/server": nextServerEntry,
      // Every remaining workspace package root, for the same reason as the three
      // above. Without this, `@sports/db` and friends resolve through the root
      // `node_modules`, where they are symlinks into a SEPARATE checkout of the
      // packages that is not this worktree's HEAD — so a test that asserts on
      // package behaviour silently reads stale sources, and a green run certifies
      // code the PR never touched. Roots, not `src/index.ts`: callers deep-import
      // (`@sports/db/src/...`) and a file-exact alias breaks those.
      ...Object.fromEntries(
        [
          "ai-council",
          "compliance",
          "crypto",
          "db",
          "epistemic-twin",
          "feature-store",
          "genesis-kernel",
          "governed",
          "ops",
          "partner-stack",
          "phase-c",
          "quote-plane",
          "stats-api",
          "types",
          "util",
        ].map((name) => [`@sports/${name}`, resolve(__dirname, "../../packages", name)]),
      ),
      "@sports/worker-pick-generation": resolve(
        __dirname,
        "../../workers/pick-generation",
      ),
      "@sports/worker-data-refresh": resolve(__dirname, "../../workers/data-refresh"),
      "@sports/worker-content-publishing": resolve(
        __dirname,
        "../../workers/content-publishing",
      ),
      "@sports/worker-airwave-listener": resolve(
        __dirname,
        "../../workers/airwave-listener",
      ),
    },
  },
});
