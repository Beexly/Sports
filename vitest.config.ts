import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: [
      "**/.worktrees/**",
      "**/.agents/**",
      "**/data/snapshots/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "apps/mobile/**",
    ],
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "apps/web"),
      ...Object.fromEntries(
        [
          "ai-council",
          "compliance",
          "crypto",
          "data-ingestion",
          "db",
          "dev-tools",
          "epistemic-twin",
          "feature-store",
          "genesis-kernel",
          "governed",
          "ingestion-pipeline",
          "ops",
          "partner-stack",
          "phase-c",
          "prediction-engine",
          "quote-plane",
          "stats-api",
          "types",
          "util",
          "verifier",
        ].map((name) => [`@sports/${name}`, resolve(__dirname, "packages", name)])
      ),
    },
  },
});
