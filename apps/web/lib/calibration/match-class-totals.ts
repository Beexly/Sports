/**
 * Probabilistic match classification for low-scoring sports — arXiv 2601.09673v3
 * ("A probabilistic match classification model for low-scoring sports").
 *
 * ADDITIVE utility. Not wired into any totals-model path (wiring changes
 * published totals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: classify fixtures into latent classes — offensive-class
 * (high-kappa: scoring behavior deviates upward from baseline),
 * competitive-class (baseline), collusion-vulnerable (anomalous scoreline
 * clustering, e.g. final-round group-stage fixtures where a specific
 * scoreline advances both teams). Totals are then priced from
 * class-specific scoring distributions rather than season averages.
 * Serving-time math: kappa estimation, class assignment, class-conditional
 * total expectation, and a scoreline-clustering anomaly score.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff match class predicts
 * scoring behavior: high-kappa offensive-class fixtures show elevated
 * totals and collusion-vulnerable fixtures show anomalous scoreline
 * clustering vs competitive-class matches.
 */

export type MatchClass = "offensive" | "competitive" | "collusion-vulnerable";

export interface ClassScoringParams {
  /** Baseline expected goals/points for the class. */
  readonly mean: number;
  /** Dispersion (variance/mean ratio). */
  readonly dispersion: number;
}

/**
 * Kappa: offensive-class index = (observed scoring rate) / (baseline
 * scoring rate) for the fixture's context. kappa >> 1 flags
 * offensive-class; kappa ~= 1 is competitive.
 */
export function kappaIndex(observedRate: number, baselineRate: number): number {
  if (!(baselineRate > 0)) return 1;
  return observedRate / baselineRate;
}

/**
 * Classify a fixture: collusion-vulnerable when the fixture is flagged
 * (e.g. final-round group stage with mutually-advancing scorelines)
 * regardless of kappa; offensive when kappa >= offensiveThreshold;
 * competitive otherwise.
 */
export function classifyFixture(
  kappa: number,
  collusionFlagged: boolean,
  offensiveThreshold = 1.25,
): MatchClass {
  if (collusionFlagged) return "collusion-vulnerable";
  return kappa >= offensiveThreshold ? "offensive" : "competitive";
}

/**
 * Class-conditional expected total: baseline total scaled by the class
 * scoring multiplier (offensive classes inflate, collusion-vulnerable
 * fixtures get a clustering-adjusted expectation documented at fit time).
 */
export function classConditionalTotal(
  baselineTotal: number,
  matchClass: MatchClass,
  classParams: Readonly<Record<MatchClass, ClassScoringParams>>,
): number {
  const params = classParams[matchClass];
  return baselineTotal * (params.mean / classParams.competitive.mean);
}

/**
 * Scoreline-clustering anomaly: chi-square-style statistic comparing the
 * observed scoreline histogram to the class-expected multinomial. Large
 * values on collusion-vulnerable fixtures vs competitive ones is the
 * paper's diagnostic.
 */
export function scorelineClusteringAnomaly(
  observed: Readonly<Record<string, number>>,
  expected: Readonly<Record<string, number>>,
): number {
  let stat = 0;
  for (const key of Object.keys(observed)) {
    const e = expected[key] ?? 1e-9;
    const o = observed[key] ?? 0;
    stat += ((o - e) * (o - e)) / e;
  }
  return stat;
}

/** Degrees-of-freedom-normalized anomaly (stat / #scorelines). */
export function normalizedAnomaly(
  observed: Readonly<Record<string, number>>,
  expected: Readonly<Record<string, number>>,
): number {
  const k = Object.keys(observed).length;
  if (k === 0) return 0;
  return scorelineClusteringAnomaly(observed, expected) / k;
}
