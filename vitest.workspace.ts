import { defineWorkspace } from "vitest/config";

/**
 * Root vitest workspace — lets `npx vitest run` (or `vitest watch`) work
 * correctly from the monorepo root.  Each package delegates to its own
 * vitest.config.ts so alias resolution, environment, and setup files are
 * applied per-package rather than guessed from CWD.
 */
export default defineWorkspace([
  "apps/web/vitest.config.ts",
  "packages/types/vitest.config.ts",
  "packages/prediction-engine/vitest.config.ts",
  "packages/data-ingestion/vitest.config.ts",
]);
