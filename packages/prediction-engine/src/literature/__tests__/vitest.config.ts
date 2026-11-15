/**
 * Scoped vitest config for the literature lane. The package-level config's
 * include list does not cover src/literature/__tests__, so run these with:
 *   node ../../node_modules/vitest/vitest.mjs run \
 *     --config src/literature/__tests__/vitest.config.ts [files...]
 * from packages/prediction-engine. Does not affect the package's `npm test`.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/literature/__tests__/**/*.test.ts"],
    isolate: false,
    pool: "forks",
  },
});