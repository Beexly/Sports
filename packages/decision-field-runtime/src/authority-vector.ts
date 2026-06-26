/**
 * THE AUTHORITY VECTOR — the single canonical authority composition (PROJECT PARALLAX).
 *
 * The audit (docs/frontier/00_REPOSITORY_REALITY.md) found the Law of Conserved Authority enforced as
 * a 4-term meet that folds the owner's eight conceptual layers together (GAP-1), with gate composition
 * fragmented across three systems and no single recorded order (GAP-2). This module closes both — as an
 * ADDITIVE superset that does NOT modify the production `authorityCeiling` (unfolding that is
 * owner-gated). It names all eight layers in one fixed order, composes them by the lattice meet, and
 * returns the ceiling, the BINDING layer(s) (why the answer is only this strong), and a full trace.
 *
 * Consistency is guaranteed by the contraction lemma (see `authorityVectorFromContext` + the test):
 * with Rights/Evidence/LocalExpression/OwnerAction at their top and Temporal carrying the readiness
 * cap, `composeAuthority` equals the existing `authorityCeiling` for every context. So the new object
 * can never over-permit relative to today's gate; it only makes Rights and Evidence first-class.
 *
 * Pure + deterministic. No I/O, no clock, no network.
 */

import { type MaxPermittedStrength, rankOf, strengthMin } from "./decision-state-stat-contract.js";
import {
  type AuthorityContext,
  type DataMode,
  type ModelAuthority,
  type PublicationAuthority,
  authorityCeiling,
} from "./decision-authority-gate.js";

/** The eight canonical authority layers, in composition order (1..8). No lower layer overrides a higher. */
export type AuthorityLayer =
  | "RIGHTS" // L1 — legal clearance to use the fact at this audience
  | "TEMPORAL" // L2 — freshness / pre-vs-post-cutoff knowability (carries the readiness cap)
  | "SOURCE_REALITY" // L3 — FIXTURE / SHADOW_REAL / LIVE_REAL
  | "EVIDENCE" // L4 — is the required evidence sufficient
  | "LOCAL_EXPRESSION" // L5 — the decision-state's own permission gradient
  | "MODEL_MATURITY" // L6 — unpriced → public-allowed
  | "ENTITLEMENT" // L7 — user tier / publication audience
  | "OWNER_ACTION"; // L8 — owner armed vs held (priced/publish/live)

export const AUTHORITY_LAYER_ORDER: readonly AuthorityLayer[] = [
  "RIGHTS",
  "TEMPORAL",
  "SOURCE_REALITY",
  "EVIDENCE",
  "LOCAL_EXPRESSION",
  "MODEL_MATURITY",
  "ENTITLEMENT",
  "OWNER_ACTION",
] as const;

export type RightsLevel = "PUBLIC" | "PERSONALIZED" | "INTERNAL" | "BLOCKED";
export type TemporalLevel = "FRESH_POST_LOCK" | "PRE_LOCK" | "STALE";
export type EvidenceLevel = "SUFFICIENT" | "THIN" | "INSUFFICIENT";
export type EntitlementLevel = "PUBLIC" | "PERSONALIZED" | "INTERNAL";
export type OwnerActionLevel = "ARMED" | "HELD";

/** The full eight-layer input. Each field is the operational reality of one layer. */
export interface AuthorityVectorInput {
  readonly rights: RightsLevel;
  readonly temporal: TemporalLevel;
  readonly sourceReality: DataMode;
  readonly evidence: EvidenceLevel;
  /** The decision-state's own ceiling (from the permission gradient / required-stat audit). */
  readonly localExpression: MaxPermittedStrength;
  readonly modelMaturity: ModelAuthority;
  readonly entitlement: EntitlementLevel;
  readonly ownerAction: OwnerActionLevel;
}

// ── Per-layer ceilings (each maps its level to the strongest expression it permits) ──
function rightsCeiling(r: RightsLevel): MaxPermittedStrength {
  return r === "PUBLIC" ? "PUBLIC_ACTION" : r === "PERSONALIZED" ? "PERSONALIZED" : r === "INTERNAL" ? "WATCH" : "INFO_ONLY";
}
function temporalCeiling(t: TemporalLevel): MaxPermittedStrength {
  return t === "FRESH_POST_LOCK" ? "PUBLIC_ACTION" : t === "PRE_LOCK" ? "WATCH" : "INFO_ONLY";
}
function sourceRealityCeiling(m: DataMode): MaxPermittedStrength {
  return m === "LIVE_REAL" ? "PUBLIC_ACTION" : m === "SHADOW_REAL" ? "WATCH" : "INFO_ONLY";
}
function evidenceCeiling(e: EvidenceLevel): MaxPermittedStrength {
  return e === "SUFFICIENT" ? "PUBLIC_ACTION" : e === "THIN" ? "WATCH" : "INFO_ONLY";
}
function modelMaturityCeiling(a: ModelAuthority): MaxPermittedStrength {
  return a === "PUBLIC_ALLOWED" ? "PUBLIC_ACTION" : a === "PERSONALIZED_ALLOWED" ? "PERSONALIZED" : "WATCH";
}
function entitlementCeiling(e: EntitlementLevel): MaxPermittedStrength {
  return e === "PUBLIC" ? "PUBLIC_ACTION" : e === "PERSONALIZED" ? "PERSONALIZED" : "WATCH";
}
function ownerActionCeiling(o: OwnerActionLevel): MaxPermittedStrength {
  return o === "ARMED" ? "PUBLIC_ACTION" : "WATCH";
}

/** The ceiling each layer emits for a given input — the operands of the meet. */
export function layerCeilings(v: AuthorityVectorInput): Readonly<Record<AuthorityLayer, MaxPermittedStrength>> {
  return {
    RIGHTS: rightsCeiling(v.rights),
    TEMPORAL: temporalCeiling(v.temporal),
    SOURCE_REALITY: sourceRealityCeiling(v.sourceReality),
    EVIDENCE: evidenceCeiling(v.evidence),
    LOCAL_EXPRESSION: v.localExpression,
    MODEL_MATURITY: modelMaturityCeiling(v.modelMaturity),
    ENTITLEMENT: entitlementCeiling(v.entitlement),
    OWNER_ACTION: ownerActionCeiling(v.ownerAction),
  };
}

export interface AuthorityComposition {
  /** The permitted expression: the meet of all eight layer ceilings. */
  readonly ceiling: MaxPermittedStrength;
  /** The layer(s) whose ceiling equals the meet — i.e. WHY the answer is only this strong. */
  readonly bindingLayers: readonly AuthorityLayer[];
  /** Full ordered trace: every layer and its emitted ceiling. */
  readonly trace: ReadonlyArray<{ readonly layer: AuthorityLayer; readonly ceiling: MaxPermittedStrength }>;
}

/**
 * Compose the eight layers into one ceiling + the binding layer + a trace. This is THE authority
 * object PARALLAX surfaces consume; `bindingLayers` is the Authority Autopsy ("why not stronger").
 */
export function composeAuthority(v: AuthorityVectorInput): AuthorityComposition {
  const ceilings = layerCeilings(v);
  const trace = AUTHORITY_LAYER_ORDER.map((layer) => ({ layer, ceiling: ceilings[layer] }));
  const ceiling = trace.reduce<MaxPermittedStrength>((acc, t) => strengthMin(acc, t.ceiling), "PUBLIC_ACTION");
  const bindingLayers = trace.filter((t) => rankOf(t.ceiling) === rankOf(ceiling)).map((t) => t.layer);
  return { ceiling, bindingLayers, trace };
}

/**
 * The contraction bridge: build the eight-layer vector from a legacy 4-term `AuthorityContext`, with
 * Rights/Evidence/LocalExpression/OwnerAction at their top and Temporal carrying the readiness cap.
 * `composeAuthority(authorityVectorFromContext(ctx)).ceiling === authorityCeiling(ctx)` for every ctx —
 * proven exhaustively in the test. This is what lets PARALLAX adopt the 8-layer object WITHOUT changing
 * the production gate.
 */
export function authorityVectorFromContext(ctx: AuthorityContext): AuthorityVectorInput {
  const entitlement: EntitlementLevel =
    ctx.publicationAuthority === "PUBLIC" ? "PUBLIC" : ctx.publicationAuthority === "PERSONALIZED" ? "PERSONALIZED" : "INTERNAL";
  return {
    rights: "PUBLIC", // top — legacy ctx tracks rights as a separate boolean, not in the ceiling
    temporal: ctx.readinessAuthorized ? "FRESH_POST_LOCK" : "PRE_LOCK", // carries the readiness cap
    sourceReality: ctx.dataMode,
    evidence: "SUFFICIENT", // top — legacy ctx folds evidence into the stat audit, not the ceiling
    localExpression: "PUBLIC_ACTION", // top
    modelMaturity: ctx.modelAuthority,
    entitlement,
    ownerAction: "ARMED", // top
  };
}

/** Convenience: does this composition clear the public bar? (Fixtures/shadow never do — A1+A4.) */
export function vectorIsPublicSafe(v: AuthorityVectorInput): boolean {
  const { ceiling } = composeAuthority(v);
  return (
    rankOf(ceiling) > rankOf("INFO_ONLY") &&
    v.sourceReality === "LIVE_REAL" &&
    v.rights === "PUBLIC" &&
    v.temporal === "FRESH_POST_LOCK" &&
    v.evidence === "SUFFICIENT" &&
    v.modelMaturity === "PUBLIC_ALLOWED" &&
    v.entitlement === "PUBLIC"
  );
}

// Note: `authorityCeiling`, `AuthorityContext`, `DataMode`, `ModelAuthority`, `PublicationAuthority`
// are intentionally NOT re-exported here — they are the canonical exports of `decision-authority-gate.ts`
// (avoids an export collision under the package barrel). Import them from there directly.
