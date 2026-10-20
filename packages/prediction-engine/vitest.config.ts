import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // `test/**` is included because the goal spec's section 6 puts the
    // PR-blocking gates there (do-calculus-verifiers.spec.ts and
    // causal-engine.mutation-v3.spec.ts). WITHOUT THIS THEY WOULD NEVER
    // RUN: the package's `npm test` is `vitest run`, and a `test/` root
    // outside the include pattern is not collected. A gate that is not
    // executed is not a gate, and this file would have sat in the
    // repository looking like one.
    include: ["src/**/*.test.ts", "test/**/*.spec.ts", "test/**/*.test.ts"],
  },
});
