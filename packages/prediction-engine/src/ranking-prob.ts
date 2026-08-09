/**
 * Ranking probability for PROVEN path — independent modelProb when SPEAK/LEAN.
 *
 * Law: confidence is mostly market-echo (RES≈0). When independent estimators
 * (Poisson / Elo / Kalshi) yield SPEAK or LEAN with a finite trueProb, use that
 * (or blend with confidence) as rankingP. Otherwise rankingP = confidence/100 —
 * no regression when independents are absent.
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
 * SPEAK/LEAN + finite trueProb → blend (default 0.5/0.5) or pure independent.
 * PASS / NONE / missing → confidence only.
 */
export function deriveRankingProbability(
  confidence: number,
  independentEdge: IndependentEdgeSummary | null | undefined,
  options?: {
    /** Weight on independent trueProb when blending (0–1). Default 0.5. */
    readonly independentWeight?: number;
    /** Prefer pure trueProb over blend when SPEAK. Default false (blend). */
    readonly pureOnSpeak?: boolean;
  },
): RankingProbResult {
  const confP = clamp01(
    Number.isFinite(confidence) ? confidence / 100 : 0.5,
  );

  const ie = independentEdge ?? null;
  const trueProb = ie?.trueProb;
  const decision = ie?.decision;
  const canPrice =
    ie != null &&
    (decision === "SPEAK" || decision === "LEAN") &&
    trueProb != null &&
    Number.isFinite(trueProb) &&
    trueProb > 0 &&
    trueProb < 1;

  if (!canPrice) {
    return {
      rankingP: confP,
      rankingScore: Math.round(confP * 100),
      source: "confidence",
      priced: false,
    };
  }

  const w = Math.min(1, Math.max(0, options?.independentWeight ?? 0.5));
  const pure = options?.pureOnSpeak === true && decision === "SPEAK";
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
