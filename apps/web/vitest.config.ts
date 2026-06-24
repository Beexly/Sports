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
    testTimeout: 30_000,
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
      "next/server": nextServerEntry,
    },
  },
});
