/**
 * EINSTEIN LAYER — Regime Topology Engine (Invention 18).
 *
 * A regime is not a vibe ("steam day") — it is a region in distribution space. This classifies a
 * game's market state from the SHAPE of the surface (dispersion, line velocity, alt curvature,
 * liquidity, news density, attention, injury uncertainty, time-to-event, absorption speed) into
 * named regimes, deterministically. The interface is designed so a Wasserstein/HDBSCAN/ML
 * clustering classifier can be dropped in later behind the same signature.
 *
 * The decision-relevant question is "which regime are we in, and are edges historically real in
 * this regime?" Some regimes should SUPPRESS all action — that suppression is intelligence. Pure.
 */

export interface RegimeInputs {
  /** Cross-book dispersion of the main number (normalized 0..1). */
  readonly bookDispersion: number;
  /** Line velocity (recent move per unit time, normalized 0..1). */
  readonly lineVelocity: number;
  /** Alt-ladder curvature anomaly score 0..1. */
  readonly altCurvature: number;
  /** Liquidity proxy 0 (thin) → 1 (deep). */
  readonly liquidityProxy: number;
  /** News/event density 0..1. */
  readonly newsDensity: number;
  /** Public attention 0..1. */
  readonly publicAttention: number;
  /** Injury/role uncertainty 0..1. */
  readonly injuryUncertainty: number;
  /** Hours to event. */
  readonly hoursToEvent: number;
  /** Historical absorption speed in this context 0 (slow) → 1 (fast). */
  readonly absorptionSpeed: number;
}

export type Regime =
  | "CalmConsensus"
  | "ThinSalientShock"
  | "PublicOverreaction"
  | "SharpEarlyAbsorption"
  | "DerivativeStaleness"
  | "AltTailFracture"
  | "FalseRumorFog"
  | "BookCopycatCascade"
  | "LiquidityTrap"
  | "PreCloseCompression";

export interface RegimeVerdict {
  readonly regime: Regime;
  readonly confidence: number;
  readonly rationale: string;
  /** Whether this regime should suppress action (intelligence = knowing when to do nothing). */
  readonly suppressAction: boolean;
}

/**
 * Deterministic regime classifier. Returns the highest-scoring named regime. Swap the body for a
 * distribution-space clustering model later — the signature is the contract.
 */
export function classifyRegime(x: RegimeInputs): RegimeVerdict {
  const scores: Array<{ regime: Regime; score: number; why: string; suppress: boolean }> = [];
  const push = (regime: Regime, score: number, why: string, suppress = false) => scores.push({ regime, score, why, suppress });

  push("CalmConsensus", (1 - x.bookDispersion) * (1 - x.lineVelocity) * (1 - x.newsDensity), "low dispersion, low velocity, quiet news", false);
  push("ThinSalientShock", x.newsDensity * (1 - x.liquidityProxy) * x.lineVelocity, "fresh news into a thin market with velocity", false);
  push("PublicOverreaction", x.publicAttention * x.lineVelocity * (1 - x.newsDensity), "big move on attention without matching news", false);
  push("SharpEarlyAbsorption", x.absorptionSpeed * x.liquidityProxy * (x.hoursToEvent > 24 ? 1 : 0.4), "fast deep-market absorption, early", false);
  push("DerivativeStaleness", x.lineVelocity * (1 - x.absorptionSpeed) * 0.9, "main moved but derivatives slow to absorb", false);
  push("AltTailFracture", x.altCurvature, "alt-ladder geometry anomaly", false);
  push("FalseRumorFog", x.newsDensity * x.injuryUncertainty * (1 - x.liquidityProxy), "unconfirmed-news fog with high uncertainty", true);
  push("BookCopycatCascade", x.lineVelocity * (1 - x.liquidityProxy) * x.publicAttention * 0.8, "thin, attention-led, cascade-prone", false);
  push("LiquidityTrap", (1 - x.liquidityProxy) * x.lineVelocity * x.injuryUncertainty, "thin + moving + uncertain — artifact risk", true);
  push("PreCloseCompression", x.hoursToEvent <= 2 ? 0.8 + 0.2 * x.liquidityProxy : 0, "near close, dispersion compressing", false);

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0]!;
  const total = scores.reduce((s, r) => s + r.score, 0) || 1;
  return {
    regime: top.regime,
    confidence: Math.max(0, Math.min(1, top.score / total + 0.0)),
    rationale: top.why,
    suppressAction: top.suppress,
  };
}
