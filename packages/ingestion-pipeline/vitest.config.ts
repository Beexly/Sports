import { defineConfig } from "vitest/config";
import { resolve } from "path";

const webRoot = resolve(__dirname, "../../apps/web").replace(/\\/g, "/");

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
  resolve: {
    alias: [
      // Array form with a regex find. A plain object key ending in "/" silently
      // misses once the replacement carries Windows backslashes, which is how
      // `@/lib/fantasy/dfs-exact` failed to load while tsc resolved it fine.
      { find: /^@\/(.*)$/, replacement: `${webRoot}/$1` },
      { find: /^@$/, replacement: webRoot },
      {
        find: /^@sports\/prediction-engine$/,
        replacement: resolve(__dirname, "../prediction-engine/src/index.ts"),
      },
      {
        find: /^@sports\/ingestion-pipeline$/,
        replacement: resolve(__dirname, "src/index.ts"),
      },
    ],
  },
});
