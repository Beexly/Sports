/**
 * Model Promotion Gate — public API barrel.
 *
 * FROZEN CONTRACT: docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md
 *
 * DARK MODULE: this barrel is exported from the package root
 * (../index.ts) for discoverability only. Nothing else in the repo — no
 * cron job, no API route, no UI component — imports it, and nothing in
 * this module (or its sources) touches the live-model-selection constant.
 * The switch from champion to challenger remains a separate, founder-applied
 * step outside this package. See __tests__/founder-gate.test.ts.
 */

export { pairedBrierLcb } from "./empirical-bernstein.js";
export type { PairedBrierLcbResult } from "./empirical-bernstein.js";

export { standardNormalQuantile, zCritOneSided } from "./normal-quantile.js";

export { welchOneSidedNonInferiority } from "./clv-non-inferiority.js";
export type { ClvNonInferiorityOptions, ClvNonInferiorityResult } from "./clv-non-inferiority.js";

export { PromotionIntegrityError, validateWalkForwardIntegrity } from "./integrity.js";

export { computeWindowHash } from "./window-hash.js";

export { evaluatePromotion, recomputePromotionDecision } from "./evaluate.js";

export type {
  ClvRow,
  Leg1Result,
  Leg2Result,
  PairedBrierRow,
  PromotionDecision,
  PromotionInput,
  RegisteredWindow,
  Verdict,
} from "./types.js";
