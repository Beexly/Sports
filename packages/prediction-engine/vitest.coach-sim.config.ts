import { defineConfig } from "vitest/config";

// The coach-sim cadence seal tests (locked-projection, weekly-cadence-orchestrator,
// sinkhorn-targets) guard the money path: a Tuesday v1.0 lock must advance through
// injury overlays with coachMindsetHash and tau byte-identical. The package's default
// vitest.config.ts include list omits src/coach-sim/**, so those tests never run under
// `npm test`. This config exists so the cadence gate can be executed on demand:
//   node ../../node_modules/vitest/vitest.mjs run --config vitest.coach-sim.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/coach-sim/**/*.test.ts"],
    isolate: false,
    pool: "forks",
  },
});