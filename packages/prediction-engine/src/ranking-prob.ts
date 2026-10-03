/**
 * Ranking probability for PROVEN path — independent modelProb when available.
 *
 * Law (v5.2.1):
 *   When independent estimators yield a finite trueProb in (0,1), use that
 *   (or blend with confidence) as rankingP — including PASS. Edge SPEAK/LEAN
 *   is the glass-box claim; ranking needs P(side) even when we do not claim edge.
 *   Overpriced favorites (trueProb < conf) must demote ranking or RES stays ~0.
 *
 *   NEVER use rawEdge / shrunkEdge / edgeScore as ranking p.
 *
 * Does NOT lower floors, flip AUTO_PUBLISH, or apply calibration maps.
 */

import type { IndependentEdgeSummary } from "@sports/types";

export type RankingProbSource =
  | "confidence"
  | "independent_trueProb"
  | "blend_indep_conf";

export type RankingProbResult = {
  /** Probability in (0, 1) used for sort / selective / bake-off. */
  readonly rankingP: number;
  /** 0–100 scale of rankingP (generation sort key). */
  readonly rankingScore: number;
  readonly source: RankingProbSource;
  /** True when independents drove the ranking path (priced into ranking). */
  readonly priced: boolean;
};

function clamp01(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

/**
 * Derive ranking probability from heuristic confidence + optional independent edge.
 *
 * Finite trueProb → blend (default) or pure independent — even on PASS.
 * Missing / non-finite trueProb → confidence only.
 */
export function deriveRankingProbability(
  confidence: number,
  independentEdge: IndependentEdgeSummary | null | undefined,
  options?: {
    /** Weight on independent trueProb when blending (0–1). Default 0.7 (v5.2.1). */
    readonly independentWeight?: number;
    /** Prefer pure trueProb over blend when SPEAK. Default false. */
    readonly pureOnSpeak?: boolean;
    /**
     * When true (default), use trueProb for ranking even if decision is PASS.
     * SPEAK/LEAN still control glass-box edge claim; ranking needs the model P.
     */
    readonly rankOnAnyTrueProb?: boolean;
  },
): RankingProbResult {
  const confP = clamp01(
    Number.isFinite(confidence) ? confidence / 100 : 0.5,
  );

  const ie = independentEdge ?? null;
  const trueProb = ie?.trueProb;
  const decision = ie?.decision;
  const hasModelP =
    trueProb != null &&
    Number.isFinite(trueProb) &&
    trueProb > 0 &&
    trueProb < 1;

  // Legacy gate (rankOnAnyTrueProb === false): only SPEAK|LEAN.
  const rankOnAny = options?.rankOnAnyTrueProb !== false;
  const decisionOk =
    rankOnAny || decision === "SPEAK" || decision === "LEAN";
  const canPrice = ie != null && hasModelP && decisionOk;

  if (!canPrice) {
    return {
      rankingP: confP,
      rankingScore: Math.round(confP * 100),
      source: "confidence",
      priced: false,
    };
  }

  const w = Math.min(1, Math.max(0, options?.independentWeight ?? 0.7));
  const pure =
    options?.pureOnSpeak === true &&
    (decision === "SPEAK" || rankOnAny);
  let rankingP: number;
  let source: RankingProbSource;
  if (pure || w >= 1 - 1e-12) {
    rankingP = clamp01(trueProb as number);
    source = "independent_trueProb";
  } else if (w <= 1e-12) {
    rankingP = confP;
    source = "confidence";
  } else {
    rankingP = clamp01((1 - w) * confP + w * (trueProb as number));
    source = "blend_indep_conf";
  }

  return {
    rankingP,
    rankingScore: Math.round(rankingP * 100),
    source,
    priced: source !== "confidence",
  };
}
