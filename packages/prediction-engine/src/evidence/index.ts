/**
 * Evidence spine — the single contract every pregame number passes through.
 *
 * IMPORTANT: this barrel imports `node:crypto` (via manifest-hash). It must
 * NEVER be re-exported from `packages/prediction-engine/src/index.ts`, which is
 * pulled into client components. Consumers import the submodule path:
 *
 *   import { checkCompleteness } from "@sports/prediction-engine/src/evidence/index.js";
 */

export * from "./types.js";
export * from "./team-codes.js";
export * from "./completeness-gate.js";
export * from "./manifest-hash.js";
