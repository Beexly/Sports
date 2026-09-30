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
      "@sports/data-ingestion": resolve(
        __dirname,
        "../../packages/data-ingestion",
      ),
      "next/server": nextServerEntry,
    },
  },
});
