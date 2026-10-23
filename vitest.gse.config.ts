import { defineConfig } from "vitest/config";
import path from "node:path";

const root = path.resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: {
      "@sports/data-ingestion": path.resolve(
        root,
        "apps/web/lib/intelligence-core/__stubs__/data-ingestion.ts",
      ),
    },
  },
  test: {
    include: [
      "packages/prediction-engine/src/__tests__/early-abort-regression.test.ts",
      "packages/prediction-engine/src/__tests__/bitmask-288.test.ts",
      "packages/prediction-engine/src/__tests__/tnf-postgame-learning-loop-10-22.test.ts",
      "packages/prediction-engine/src/__tests__/unified-autonomous-mind-pipeline.test.ts",
      "packages/prediction-engine/src/__tests__/chaos-fail-closed.test.ts",
      "packages/prediction-engine/src/__tests__/league-adapter.test.ts",
      "packages/prediction-engine/src/__tests__/historical-canary.test.ts",
      "packages/prediction-engine/src/__tests__/killed-claims.test.ts",
      "packages/prediction-engine/src/__tests__/cholesky-gls.test.ts",
      "packages/prediction-engine/src/__tests__/nightly-harness.test.ts",
      "apps/web/lib/intelligence-core/situational-trace.wire.test.ts",
    ],
    testTimeout: 180000,
    hookTimeout: 180000,
  },
});
