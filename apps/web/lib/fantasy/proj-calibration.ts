/**
 * Projection calibration — learns our own bias and spread error, then corrects.
 *
 * WHY THIS EXISTS (wave4 intel, repos/nuke-dfs-hub — see
 * gse-competitive-intel waves/wave4-repos-* dossier). The competitive gap is not
 * more projection sources; it is that GSE simulates off raw projections and never
 * measures whether those projections are systematically biased or mis-scaled.
 * nuke-dfs-hub's `nuke_calibration.py` does the measuring: a mean-bias correction
 * plus a spread multiplier derived from the standardized-residual distribution,
 * clipped to [0.75, 2.50], applied to new simulation matrices.
 *
 * This module implements that MECHANIC on GSE's own terms. It is our
 * implementation, not their code (their repo carries no license, so nothing is
 * copied). What we borrowed is the idea that a projection is a claim to be graded.
 *
 * HONESTY RULES:
 *  1. Nothing is corrected until there is a sample. Below `minSample` the fit
 *     returns `insufficient: true` and `applyCalibration` returns the raw
 *     projection unchanged. A correction fitted on nine observations is noise
 *     wearing a lab coat.
 *  2. In-sample and out-of-sample error are reported SEPARATELY and labeled.
 *     In-sample improvement always flatters; the holdout number is the one that
 *     counts, and when the holdout says we did not improve, we say that too.
 *  3. The spread multiplier is clipped to a published band and the clip is
 *     reported whenever it binds — a fit that wants a 4x spread is a data
 *     problem, not a discovery.
 *  4. Every output carries the sample size, the basis, and the exact formula.
 */

/** Central-90% normal reference: z at p=0.95. The divisor for the spread fit. */
export const Z90 = 1.6448536269514722;

/** Published clip band for the spread multiplier. Source of the band: the
 * nuke_calibration mechanic described in the wave4 dossier. */
export const SPREAD_CLIP = { min: 0.75, max: 2.5 } as const;

/** Minimum settled observations before any correction is applied. */
export const MIN_SAMPLE = 30;

export type ProjectionOutcome = {
  readonly playerId?: string;
  readonly projected: number;
  readonly actual: number;
};

export type CalibrationFit = {
  /** Multiplicative bias: mean(actual)/mean(projected). 1 = unbiased. */
  readonly biasRatio: number;
  /** Spread multiplier from the standardized-residual p90 ÷ z90. */
  readonly spreadMultiplier: number;
  /** Mean of the raw projections — the pivot the spread scales around. */
  readonly pivot: number;
  readonly n: number;
  readonly insufficient: boolean;
  readonly clipped: boolean;
  readonly note: string;
};

export type CalibrationReport = {
  readonly fit: CalibrationFit;
  /** Mean absolute error using raw projections. */
  readonly maeRaw: number;
  /** MAE after correction, on the same rows. Flatters by construction. */
  readonly maeInSample: number;
  /** MAE on rows the fit never saw. The number that counts. */
  readonly maeHoldout: number | null;
  readonly holdoutN: number;
  readonly improvedOutOfSample: boolean | null;
  readonly basis: "settled-outcomes" | "no-sample";
  readonly note: string;
};

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

function mae(pairs: readonly ProjectionOutcome[], f: (p: number) => number): number {
  if (pairs.length === 0) return 0;
  return mean(pairs.map((p) => Math.abs(f(p.projected) - p.actual)));
}

/** Percentile of a value list (nearest-rank, no interpolation). */
function percentile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[idx]!;
}

/**
 * Fit bias + spread from settled (projected, actual) pairs.
 *
 * biasRatio        = mean(actual) / mean(projected)
 * standardized res = (actual − projected) / |projected|
 * spreadMultiplier = clipped( p90(|residual|) / Z90 )
 *
 * projected=0 rows are dropped from the residual pool (division undefined) and
 * the drop count is surfaced in the note.
 */
export function fitProjectionCalibration(
  rows: readonly ProjectionOutcome[],
  opts: { minSample?: number } = {},
): CalibrationFit {
  const minSample = opts.minSample ?? MIN_SAMPLE;
  const usable = rows.filter(
    (r) => Number.isFinite(r.projected) && Number.isFinite(r.actual),
  );
  const n = usable.length;

  if (n < minSample) {
    return {
      biasRatio: 1,
      spreadMultiplier: 1,
      pivot: mean(usable.map((r) => r.projected)),
      n,
      insufficient: true,
      clipped: false,
      note:
        `Insufficient sample: ${n} settled observations, ${minSample} required. ` +
        `Projections pass through uncorrected — we do not fit noise.`,
    };
  }

  const nonzero = usable.filter((r) => r.projected !== 0);
  const dropped = n - nonzero.length;
  const pivot = mean(usable.map((r) => r.projected));
  const meanProj = mean(nonzero.length > 0 ? nonzero.map((r) => r.projected) : [pivot]);
  const meanActual = mean(nonzero.length > 0 ? nonzero.map((r) => r.actual) : [pivot]);
  const biasRatio = meanProj === 0 ? 1 : meanActual / meanProj;

  const residuals = nonzero.map((r) => (r.actual - r.projected) / Math.abs(r.projected));
  const rawSpread = residuals.length === 0 ? 1 : percentile(residuals.map(Math.abs), 0.9) / Z90;
  const spreadMultiplier = Math.min(SPREAD_CLIP.max, Math.max(SPREAD_CLIP.min, rawSpread));
  const clipped = rawSpread < SPREAD_CLIP.min || rawSpread > SPREAD_CLIP.max;

  return {
    biasRatio,
    spreadMultiplier,
    pivot,
    n,
    insufficient: false,
    clipped,
    note:
      `biasRatio = mean(actual)/mean(projected) = ${biasRatio.toFixed(4)}; ` +
      `spreadMultiplier = clip(p90(|residual|)/${Z90.toFixed(4)}, ` +
      `${SPREAD_CLIP.min}–${SPREAD_CLIP.max}) = ${spreadMultiplier.toFixed(4)}` +
      (clipped ? ` (CLIPPED from ${rawSpread.toFixed(4)} — treat as a data warning)` : "") +
      (dropped > 0 ? `; ${dropped} row(s) dropped for projected=0` : "") +
      `.`,
  };
}

/**
 * Apply a fit. Corrected = bias × (pivot + spread × (raw − pivot)).
 * A pivot-centered spread means an average projection is bias-scaled but not
 * spread-scaled — the spread term only moves projections away from the mean.
 * Returns the raw value untouched when the fit is insufficient.
 */
export function applyCalibration(projected: number, fit: CalibrationFit): number {
  if (fit.insufficient || !Number.isFinite(projected)) return projected;
  const spread = fit.pivot + fit.spreadMultiplier * (projected - fit.pivot);
  return fit.biasRatio * spread;
}

/**
 * Fit on a train slice, then report in-sample AND holdout error honestly.
 * The holdout is the tail of the rows as given; callers should pass rows in
 * chronological order so the holdout is genuinely forward-looking.
 */
export function calibrationReport(
  rows: readonly ProjectionOutcome[],
  opts: { minSample?: number; holdoutFraction?: number } = {},
): CalibrationReport {
  const minSample = opts.minSample ?? MIN_SAMPLE;
  const frac = opts.holdoutFraction ?? 0.25;
  const n = rows.length;
  const holdoutN = Math.floor(n * frac);
  const train = holdoutN > 0 ? rows.slice(0, n - holdoutN) : rows;
  const holdout = holdoutN > 0 ? rows.slice(n - holdoutN) : [];

  const fit = fitProjectionCalibration(train, { minSample });

  if (fit.insufficient) {
    return {
      fit,
      maeRaw: mae(rows, (p) => p),
      maeInSample: mae(rows, (p) => p),
      maeHoldout: null,
      holdoutN,
      improvedOutOfSample: null,
      basis: "no-sample",
      note: fit.note,
    };
  }

  const maeRaw = mae(train, (p) => p);
  const maeInSample = mae(train, (p) => applyCalibration(p, fit));
  const maeHoldout = holdout.length > 0 ? mae(holdout, (p) => applyCalibration(p, fit)) : null;
  const rawHoldout = holdout.length > 0 ? mae(holdout, (p) => p) : null;
  const improvedOutOfSample =
    maeHoldout === null || rawHoldout === null ? null : maeHoldout < rawHoldout;

  const verdict =
    improvedOutOfSample === null
      ? "No holdout slice — out-of-sample improvement is unknown."
      : improvedOutOfSample
        ? `Holdout MAE fell ${rawHoldout!.toFixed(3)} → ${maeHoldout!.toFixed(3)}.`
        : `Holdout MAE did NOT improve (${rawHoldout!.toFixed(3)} → ${maeHoldout!.toFixed(3)}) — ` +
          `the correction does not generalise on this sample.`;

  return {
    fit,
    maeRaw,
    maeInSample,
    maeHoldout,
    holdoutN,
    improvedOutOfSample,
    basis: "settled-outcomes",
    note:
      `n=${fit.n} train / ${holdoutN} holdout. In-sample MAE ${maeRaw.toFixed(3)} → ` +
      `${maeInSample.toFixed(3)} (flatters by construction). ${verdict}`,
  };
}
