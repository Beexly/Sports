/**
 * Edge Lab covariate binds — barrel re-exports.
 *
 * Each bind couples the covariate bus (covariate-bus.ts) to ONE model: it takes
 * leak-safe, week-t→t+1 covariates and produces a typed request/result pair with
 * `priced: false`. See each module header for the honesty contract
 * (fail-closed, never imputed, `priced: false`).
 *
 * Exports every bind function, its batch/convenience helper, its method-tag
 * constant, and its request/result/sample types so consumers can import the
 * whole family from a single path.
 */

// ── Context bind (schedule fact + pre-cutoff weather) ───────────────────────
export {
  bindTeamContext,
  bindTeamContextBatch,
  CONTEXT_BIND_METHOD_TAG,
} from "./props-context-bind.js";
export type {
  ContextField,
  ContextCell,
  ContextBindRequest,
  ContextRefuse,
  ContextBindResult,
} from "./props-context-bind.js";

// ── aDOT×SEP bind ───────────────────────────────────────────────────────────
export { bindSepSamples, boundSepSamples, SEP_BIND_METHOD_TAG } from "./props-hb-adot-sep-bind.js";
export type { SepBindRequest, SepBindResult } from "./props-hb-adot-sep-bind.js";

// ── Air YAC bind ────────────────────────────────────────────────────────────
export { bindYacSamples, boundYacSamples, YAC_BIND_METHOD_TAG } from "./props-hb-air-yac-bind.js";
export type {
  YacBindRequest,
  BoundAirYacSample,
  YacBindResult,
} from "./props-hb-air-yac-bind.js";

// ── CPOE completion bind (bus + GSE-CPOE) ───────────────────────────────────
export {
  bindCpoeCompSamples,
  boundCpoeCompSamples,
  CPOE_COMP_BIND_METHOD_TAG,
  GSE_CPOE_PROVENANCE,
} from "./props-hb-cpoe-comp-bind.js";
export type {
  CpoeCompBindRequest,
  BoundCompSample,
  CpoeCompBindResult,
} from "./props-hb-cpoe-comp-bind.js";

// ── Interception bind ───────────────────────────────────────────────────────
export { bindIntSamples, boundIntSamples, INT_BIND_METHOD_TAG } from "./props-hb-int-bind.js";
export type {
  IntBindRequest,
  BoundIntSample,
  IntBindResult,
} from "./props-hb-int-bind.js";

// ── Rush-yards bind ─────────────────────────────────────────────────────────
export {
  bindRushYardsSamples,
  boundRushYardsSamples,
  RUSH_YARDS_BIND_METHOD_TAG,
} from "./props-hb-rush-yards-bind.js";
export type {
  RushYardsBindRequest,
  BoundRushSample,
  RushYardsBindResult,
} from "./props-hb-rush-yards-bind.js";
