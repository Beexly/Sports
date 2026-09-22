/**
 * NBA fatigue-feature priors — arXiv 2112.14649v1
 * ("Tired of Misattribution, Modeling Player Fatigue in the NBA").
 *
 * ADDITIVE utility. Not wired into any model path (wiring changes the NBA
 * game model and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: rest-differential, westward-travel-hours, and 3-in-4
 * indicators enter with the paper's coefficients (+0.35 / -1.740 / -1.290)
 * as wide-variance Bayesian priors, re-estimated leakage-free (pre-game
 * ratings, never end-of-season net rating). Kept only if they improve
 * rolling-origin log-loss/Brier on >= 2 held-out seasons; otherwise the
 * null result is retained as documentation ("schedule explains < 0.1%").
 * Any future fatigue claim (including tracking-based load) must beat this
 * null bar.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff the re-estimated
 * (leakage-free) fatigue features improve the NBA game model on
 * rolling-origin log-loss or Brier on at least two held-out seasons.
 */

export interface FatiguePrior {
  readonly feature: "restDifferential" | "westwardTravelHours" | "threeInFour";
  /** Paper point estimate (points of margin). */
  readonly priorMean: number;
  /** Wide prior SD: the paper value is a starting point, not a fact. */
  readonly priorSd: number;
}

/** Paper coefficients as wide-variance priors (short leash). */
export const FATIGUE_PRIORS: ReadonlyArray<FatiguePrior> = [
  { feature: "restDifferential", priorMean: 0.35, priorSd: 1.0 },
  { feature: "westwardTravelHours", priorMean: -1.74, priorSd: 1.5 },
  { feature: "threeInFour", priorMean: -1.29, priorSd: 1.5 },
];

/**
 * Normal-normal conjugate posterior for a fatigue coefficient:
 * prior (mean, sd) x leakage-free estimate (mean, se).
 * Wide prior + precise estimate -> posterior tracks the estimate.
 */
export function fatiguePosterior(
  priorMean: number,
  priorSd: number,
  estMean: number,
  estSe: number,
): { readonly mean: number; readonly sd: number } {
  const priorVar = Math.max(priorSd * priorSd, 1e-12);
  const likeVar = Math.max(estSe * estSe, 1e-12);
  const postVar = 1 / (1 / priorVar + 1 / likeVar);
  const postMean = postVar * (priorMean / priorVar + estMean / likeVar);
  return { mean: postMean, sd: Math.sqrt(postVar) };
}

/**
 * Retention rule: keep a fatigue feature only if it improves the
 * rolling-origin metric on at least two held-out seasons. `improved[i]` =
 * whether season i beat the no-fatigue baseline.
 */
export function retainFatigueFeature(improved: readonly boolean[]): boolean {
  return improved.filter(Boolean).length >= 2;
}

/**
 * Leakage contract: an estimate is leakage-free only if built from
 * pre-game information (pre-game ratings, schedule at tip). End-of-season
 * net rating or any post-game revision fails the check. The caller attests
 * the provenance; this function records the attestation.
 */
export function leakageFreeAttestation(
  usedPreGameRatings: boolean,
  usedPostGameRevisions: boolean,
): boolean {
  return usedPreGameRatings && !usedPostGameRevisions;
}

/** Null-result documentation when the features do not move out-of-sample. */
export function nullResultNote(explainedVariancePct: number): string {
  return (
    "Fatigue features retained as null result: schedule explains " +
    explainedVariancePct.toFixed(2) +
    "% of out-of-sample variance. Any future fatigue claim must beat this bar."
  );
}
