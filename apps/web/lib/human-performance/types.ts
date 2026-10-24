/**
 * Human Performance + Simulation Priors layer — shared types + the mandatory
 * disclosure contract.
 *
 * Design: reports/rd/black-label-2026/HUMAN_PERFORMANCE_SIMULATION_PRIORS_LAYER.md
 *
 * Non-negotiable posture (enforced here, not just intended):
 *  - This layer never claims a player's medical state. It only WIDENS
 *    uncertainty or downgrades to watchlist/no-bet. There is no code path that
 *    narrows a band from a human-performance or game-rating signal.
 *  - Every public output must satisfy the GSE Output Behavior contract below;
 *    a surface missing any field renders the honest empty/uncertain state, not
 *    a number.
 *  - Video-game ratings are priors, never truth (weight-capped, prior-only).
 */

export type ProvenanceTier = "official" | "licensed" | "modeled" | "inferred" | "illustrative";
export type Verdict = "play" | "watchlist" | "no-bet";

/** Tiers that may never raise confidence on their own. */
export const NON_CONFIDENCE_TIERS: readonly ProvenanceTier[] = ["inferred", "illustrative"];

// ─────────────── Simulation Prior (prior-only, weight-capped) ───────────────

export interface SimulationPrior {
  readonly source: string;
  readonly sourceTier: ProvenanceTier;
  readonly name: string;
  readonly playerId: string | null;
  readonly sport: string;
  readonly team: string | null;
  readonly position: string | null;
  readonly ratings: Readonly<{
    overall?: number;
    speed?: number;
    strength?: number;
    agility?: number;
    awareness?: number;
    durability?: number;
    potential?: number;
  }>;
  readonly archetype: string | null;
  readonly updatedAt: string;
  readonly licenseRiskNote: string;
  readonly confidence: "prior-only";
  readonly weightCap: number; // hard ceiling on any band move, e.g. 0.05
}

/** The absolute ceiling a simulation prior may ever contribute. */
export const SIM_PRIOR_WEIGHT_CAP = 0.05;

// ─────────────── Performance Environment Score ───────────────

export interface EnvironmentFactor {
  readonly value: number; // 0-100
  readonly source: string;
  readonly tier: ProvenanceTier;
  readonly asOf: string;
}

export interface PerformanceEnvironmentScore {
  readonly team: string;
  readonly sport: string;
  readonly asOf: string;
  readonly overall: number; // 0-100, re-normalized over present factors
  readonly factors: Readonly<Record<string, EnvironmentFactor>>;
  readonly presentFactorCount: number;
  readonly note: string;
}

// ─────────────── Human Availability Modifier ───────────────

export interface AvailabilityDriver {
  readonly key: string;
  readonly weight: number; // contribution to bandWidenPct
  readonly tier: ProvenanceTier;
  readonly note: string;
}

export interface HumanAvailabilityModifier {
  readonly playerId: string;
  readonly gameId: string | null;
  readonly asOf: string;
  readonly bandWidenPct: number; // >= 0, capped at MAX_BAND_WIDEN
  readonly recommendation: Verdict;
  readonly drivers: readonly AvailabilityDriver[];
  readonly confidence: number; // 0-1
  readonly tier: ProvenanceTier;
}

/** The band can never widen more than this, and never goes negative. */
export const MAX_BAND_WIDEN = 0.6;
export const WATCHLIST_THRESHOLD = 0.35;

// ─────────────── Biomechanics readiness (scaffold, no live claims) ───────────────

export type CapabilityStatus = "not-built" | "r&d" | "admin-only" | "live";

export interface BiomechCapability {
  readonly capability: string;
  readonly status: CapabilityStatus;
  readonly rightsCleared: boolean;
  readonly note: string;
}

// ─────────────── GSE Output Behavior — the mandatory contract ───────────────

export interface GseOutputBehavior {
  readonly whatChanged: string;
  readonly whyItMatters: string;
  readonly confidence: number; // 0-1
  readonly confidenceLabel: string;
  readonly whatCouldBreakTheRead: string;
  readonly provenanceTier: ProvenanceTier;
  readonly verdict: Verdict;
}

export function confidenceLabel(confidence: number): string {
  const c = Math.max(0, Math.min(1, confidence));
  if (c >= 0.8) return "High";
  if (c >= 0.6) return "Moderate";
  if (c >= 0.4) return "Low";
  return "Very low";
}

/**
 * Build the disclosure contract. Returns null when any required field is
 * missing/blank, so the caller renders the honest empty state instead of a
 * partial, misleading number. Confidence is clamped; the label is derived.
 */
export function buildOutputBehavior(input: {
  whatChanged: string;
  whyItMatters: string;
  confidence: number;
  whatCouldBreakTheRead: string;
  provenanceTier: ProvenanceTier;
  verdict: Verdict;
}): GseOutputBehavior | null {
  const required = [input.whatChanged, input.whyItMatters, input.whatCouldBreakTheRead];
  if (required.some((s) => !s || !s.trim())) return null;
  if (!Number.isFinite(input.confidence)) return null;
  let confidence = Math.max(0, Math.min(1, input.confidence));

  // THE NON-CONFIDENCE TIERS GATE. (Added 2026-10-20.)
  //
  // NON_CONFIDENCE_TIERS was declared and NEVER READ. The file's own
  // header says the posture is "enforced here, not just intended":
  //
  //   "Tiers that may never raise confidence on their own."
  //
  // and the two neighbours in the same file -- MAX_BAND_WIDEN and
  // WATCHLIST_THRESHOLD -- ARE compared at their call sites. This one
  // was not, so a signal carrying the "inferred" or "illustrative"
  // tier could publish a confidence of 0.95, which is exactly the
  // thing the constant exists to prevent.
  //
  // So the constant now GATES. A non-confidence tier may not raise
  // confidence above the cap, and a tier outside the list is
  // unaffected.
  //
  // The cap is SIM_PRIOR_WEIGHT_CAP -- the same 0.05 ceiling the
  // simulation-prior block names for "the absolute ceiling a
  // simulation prior may ever contribute". And THAT constant was
  // also declared and never read; it is read here, so it gates.
  if (NON_CONFIDENCE_TIERS.includes(input.provenanceTier)) {
    confidence = Math.min(confidence, SIM_PRIOR_WEIGHT_CAP);
  }
  return {
    whatChanged: input.whatChanged.trim(),
    whyItMatters: input.whyItMatters.trim(),
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    whatCouldBreakTheRead: input.whatCouldBreakTheRead.trim(),
    provenanceTier: input.provenanceTier,
    verdict: input.verdict,
  };
}
