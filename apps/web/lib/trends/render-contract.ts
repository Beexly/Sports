/**
 * TREND RENDER CONTRACT — no streak renders without the context that makes it
 * honest.
 *
 * "Hit 36 of the last 37" is the single most effective tout device in sports
 * betting, and it is almost always meaningless: without the base rate you
 * cannot tell whether 36/37 beats chance, and without a regression-to-mean
 * caveat the reader assumes the streak predicts the next game. A statistically
 * "significant" trend discovered by scanning many cohorts is exactly the
 * finding most likely to be noise — which is why `trend-discovery.ts` computes
 * `pValue` and `significant`, and why significance ALONE is not enough to
 * publish.
 *
 * This is the gate every public trend surface must pass through. It mirrors
 * `apps/web/lib/ledger/display-guard.ts`: a trend missing any leg is refused
 * outright (null / throw), never rendered partially, because a streak shown
 * without its base rate is fabrication by omission in exactly the way the
 * display guard describes for performance numbers.
 *
 * The four required legs:
 *   (a) n >= minSampleSize          — a streak off 6 games is not a trend
 *   (b) base rate                   — what the cohort is measured AGAINST
 *   (c) regression-to-mean caveat   — stated, in the payload, not implied
 *   (d) calibrated probability      — what it implies for the NEXT event
 *
 * Legs (c) and (d) are not on `Trend` by design: discovery cannot produce
 * them. They must be supplied deliberately by whoever publishes, which is the
 * point — publishing a trend should require an affirmative act, not a default.
 */

import type { Trend } from "@sports/prediction-engine";

export type TrendRenderDefect =
  | "insufficient-sample"
  | "missing-base-rate"
  | "missing-regression-caveat"
  | "missing-calibrated-probability"
  | "not-significant";

export interface TrendRenderInput {
  readonly trend: Trend;
  /** Floor for leg (a). The discovery config's own minSampleSize should be passed. */
  readonly minSampleSize: number;
  /**
   * Leg (c): the explicit regression-to-mean warning shown beside the number.
   * Must be real prose — an empty or whitespace string is treated as absent,
   * so a caller cannot satisfy the contract with `""`.
   */
  readonly regressionCaveat?: string | null;
  /**
   * Leg (d): the calibrated probability this trend implies for the next event,
   * in [0, 1]. NOT the historical rate — the point of the leg is that a 36/37
   * streak does not imply a 97% forward probability.
   */
  readonly calibratedProbability?: number | null;
}

export interface RenderableTrend {
  readonly feature: string;
  readonly cohort: string;
  readonly n: number;
  readonly cohortMean: number;
  /** Leg (b) — the field the cohort is measured against. */
  readonly baselineMean: number;
  readonly baselineN: number;
  readonly relativeDelta: number;
  readonly pValue: number;
  /** Leg (c). */
  readonly regressionCaveat: string;
  /** Leg (d). */
  readonly calibratedProbability: number;
}

export class TrendRenderError extends Error {
  constructor(
    readonly defects: readonly TrendRenderDefect[],
    cohort: string,
  ) {
    super(
      `Refusing to render trend "${cohort}": [${defects.join(", ")}]. ` +
        "A streak without its base rate, sample floor, regression-to-mean caveat, and " +
        "calibrated forward probability is fabrication by omission.",
    );
    this.name = "TrendRenderError";
  }
}

/** Every defect that would make this trend dishonest to render. Pure; never throws. */
export function collectTrendDefects(input: TrendRenderInput): TrendRenderDefect[] {
  const defects: TrendRenderDefect[] = [];
  const t = input.trend;

  const floor = Number.isFinite(input.minSampleSize) ? input.minSampleSize : Infinity;
  if (!Number.isFinite(t.n) || t.n < floor) defects.push("insufficient-sample");

  // Leg (b): the baseline must be a real measured field, backed by its own
  // sample. A baselineN of 0 means "compared against nothing".
  if (
    !Number.isFinite(t.baselineMean) ||
    !Number.isFinite(t.baselineN) ||
    t.baselineN <= 0
  ) {
    defects.push("missing-base-rate");
  }

  if (typeof input.regressionCaveat !== "string" || input.regressionCaveat.trim().length === 0) {
    defects.push("missing-regression-caveat");
  }

  const p = input.calibratedProbability;
  if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) {
    defects.push("missing-calibrated-probability");
  }

  // Significance is necessary but NOT sufficient — it is listed last because
  // the legs above are the ones a tout omits.
  if (!t.significant) defects.push("not-significant");

  return defects;
}

/**
 * The render-path entry: the trend when every leg is present, null otherwise.
 * Callers MUST branch to an honest empty state on null.
 */
export function renderableTrendOrNull(input: TrendRenderInput): RenderableTrend | null {
  if (collectTrendDefects(input).length > 0) return null;
  const t = input.trend;
  return {
    feature: t.feature,
    cohort: t.cohort,
    n: t.n,
    cohortMean: t.cohortMean,
    baselineMean: t.baselineMean,
    baselineN: t.baselineN,
    relativeDelta: t.relativeDelta,
    pValue: t.pValue,
    regressionCaveat: input.regressionCaveat as string,
    calibratedProbability: input.calibratedProbability as number,
  };
}

/** The loud version, for tests/CI. Throws `TrendRenderError` on any defect. */
export function assertRenderableTrend(input: TrendRenderInput): void {
  const defects = collectTrendDefects(input);
  if (defects.length > 0) throw new TrendRenderError(defects, input.trend.cohort);
}
