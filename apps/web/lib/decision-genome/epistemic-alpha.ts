/**
 * EpistemicAlphaLedger — was the confidence DESERVED before the outcome was known?
 *
 * Decision Genome build step I. CLV is one proof signal; epistemic alpha is the full
 * operating system. It scores six dimensions of whether a decision earned its confidence
 * given only what was knowable at the time:
 *   timing · truth · uncertainty · restraint · availability · proof
 *
 * Each dimension is a normalized [0,1] score with an explicit basis, or null when it is
 * not yet computable (proof alpha needs settlement). The composite is the mean of the
 * computable dimensions — honest about what is and isn't gradeable yet. Pure, no I/O.
 */

import type { ApertureState } from "./aperture";
import type { DecisionGenome } from "./decision-genome";

export type AlphaDimension =
  | "timing"
  | "truth"
  | "uncertainty"
  | "restraint"
  | "availability"
  | "proof";

export interface AlphaScore {
  readonly dimension: AlphaDimension;
  /** Normalized [0,1], or null when not yet computable. */
  readonly score: number | null;
  readonly basis: string;
}

export interface EpistemicAlphaScore {
  readonly genomeId: string;
  readonly dimensions: readonly AlphaScore[];
  /** Mean of the computable dimensions, or null if none are computable. */
  readonly composite: number | null;
  /** True once proof alpha is gradeable (the decision has settled). */
  readonly settled: boolean;
}

const clamp01 = (x: number): number => (Number.isNaN(x) ? 0 : Math.max(0, Math.min(1, x)));

/** Score a decision genome across the six epistemic-alpha dimensions. */
export function scoreEpistemicAlpha(g: DecisionGenome): EpistemicAlphaScore {
  const dims: AlphaScore[] = [
    timingAlpha(g),
    truthAlpha(g),
    uncertaintyAlpha(g),
    restraintAlpha(g),
    availabilityAlpha(g),
    proofAlpha(g),
  ];
  const computable = dims.map((d) => d.score).filter((s): s is number => s != null);
  const composite = computable.length === 0 ? null : computable.reduce((a, b) => a + b, 0) / computable.length;
  return {
    genomeId: g.id,
    dimensions: dims,
    composite,
    settled: g.proof.clv != null || g.proof.brier != null,
  };
}

/** Did we know before the market moved? Reward positive modeled edge with a live half-life. */
function timingAlpha(g: DecisionGenome): AlphaScore {
  const fair = g.market.devigFairProb;
  if (fair == null) return { dimension: "timing", score: null, basis: "no devigged fair probability to measure timing edge" };
  const edge = g.model.probability - fair; // positive = we saw value before the close
  const halfLife = g.market.edgeHalfLifeMs;
  const edgeScore = clamp01(0.5 + edge * 5); // ±0.1 edge spans the range
  // A reachable half-life (edge survives long enough to act) earns a small bonus.
  const survivable = halfLife != null && halfLife > 0 ? Math.min(0.15, halfLife / (1000 * 60 * 60)) : 0;
  return { dimension: "timing", score: clamp01(edgeScore + survivable), basis: `edge ${(edge * 100).toFixed(1)}pp vs devigged close` };
}

/** Was the evidence cleaner, earlier, more independent, more official than consensus? */
function truthAlpha(g: DecisionGenome): AlphaScore {
  const e = g.evidence;
  const tierScore = e.sourceTier === "official" ? 1 : e.sourceTier === "tier1" ? 0.8 : e.sourceTier === "tier2" ? 0.5 : e.sourceTier === "rumor" ? 0.1 : 0.3;
  const indepScore = clamp01(e.independentSources / 3);
  const freshScore = e.freshnessAgeMinutes == null ? 0.5 : clamp01(1 - e.freshnessAgeMinutes / 240);
  const conflictPenalty = e.conflict ? 0.5 : 1;
  const score = clamp01(((tierScore + indepScore + freshScore) / 3) * conflictPenalty);
  return { dimension: "truth", score, basis: `tier=${e.sourceTier}, ${e.independentSources} independent, ${e.freshnessAgeMinutes ?? "?"}m old` };
}

/** Did we correctly widen, shrink, or refuse confidence? Calibration health + sane band. */
function uncertaintyAlpha(g: DecisionGenome): AlphaScore {
  const m = g.model;
  const bandWidth = m.uncertaintyBand.high - m.uncertaintyBand.low;
  // Well-calibrated, with a band that is neither absurdly tight nor uselessly wide.
  const calScore = clamp01(m.calibrationHealth);
  const bandScore = bandWidth <= 0 ? 0 : clamp01(1 - Math.abs(bandWidth - 0.2) / 0.4);
  // Refusing when calibration is poor is itself good epistemic behaviour.
  const refusalBonus = m.refused && m.calibrationHealth < 0.5 ? 0.2 : 0;
  return { dimension: "uncertainty", score: clamp01((calScore + bandScore) / 2 + refusalBonus), basis: `calHealth=${m.calibrationHealth.toFixed(2)}, band=${bandWidth.toFixed(2)}${m.refused ? ", refused" : ""}` };
}

/** Did we pass when action would have been seductive but unjustified? */
function restraintAlpha(g: DecisionGenome): AlphaScore {
  const restrainedTypes = new Set(["pass", "wait", "shadow", "suppress", "quarantine"]);
  const restrainedAperture: readonly ApertureState[] = ["pass", "wait", "shadow", "quarantine"];
  const isRestrained = restrainedTypes.has(g.decisionType) || restrainedAperture.includes(g.aperture);
  if (!isRestrained) {
    return { dimension: "restraint", score: 0.5, basis: "action taken, restraint not exercised (neutral)" };
  }
  // A graded saved-loss makes restraint provably valuable.
  if (g.proof.savedLoss != null) {
    return { dimension: "restraint", score: clamp01(0.6 + Math.sign(g.proof.savedLoss) * 0.4), basis: `restrained; savedLoss=${g.proof.savedLoss}` };
  }
  return { dimension: "restraint", score: 0.7, basis: "restrained (saved-loss not yet graded)" };
}

/** Could a real user actually get the number, or was the edge theatrical? */
function availabilityAlpha(g: DecisionGenome): AlphaScore {
  return {
    dimension: "availability",
    score: g.market.userAvailable ? 1 : 0,
    basis: g.market.userAvailable ? "number was user-reachable" : "edge was theatrical (not reachable)",
  };
}

/** Did the decision survive CLV/Brier after the fact? Null until settled. */
function proofAlpha(g: DecisionGenome): AlphaScore {
  const { clv, brier } = g.proof;
  if (clv == null && brier == null) {
    return { dimension: "proof", score: null, basis: "not settled: proof alpha pending" };
  }
  const clvScore = clv == null ? null : clamp01(0.5 + clv * 10); // ±5% CLV spans the range
  const brierScoreNorm = brier == null ? null : clamp01(1 - brier); // brier 0 → 1, 1 → 0
  const parts = [clvScore, brierScoreNorm].filter((x): x is number => x != null);
  const score = parts.length === 0 ? null : parts.reduce((a, b) => a + b, 0) / parts.length;
  return { dimension: "proof", score, basis: `clv=${clv ?? "?"}, brier=${brier ?? "?"}` };
}
