import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// The coach-sim cadence seal tests (locked-projection, weekly-cadence-orchestrator,
// sinkhorn-targets) guard the money path: a Tuesday v1.0 lock must advance through
// injury overlays with coachMindsetHash and tau byte-identical. This config runs
// the cadence gate cleanly in both main checkout and worktrees.
export default defineConfig({
  resolve: {
    alias: {
      "@sports/types": resolve(__dirname, "../types/src/index.ts"),
      "@sports/db": resolve(__dirname, "../db/src/index.ts"),
      "@sports/governed": resolve(__dirname, "../governed/src/index.ts"),
      "@sports/util": resolve(__dirname, "../util/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/coach-sim/**/*.test.ts"],
    isolate: false,
    pool: "forks",
  },
});