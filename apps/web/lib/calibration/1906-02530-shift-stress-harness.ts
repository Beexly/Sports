/**
 * arXiv 1906.02530: Can You Trust Your Model's Uncertainty? Evaluating Predictive Uncertainty Under Dataset Shift.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Shift-stress acceptance harness from 'Can You Trust Your Model's Uncertainty?': calibrate on early weeks (1-12), evaluate under temporal shift (weeks 13-18 + playoffs) on Brier/NLL/ECE across shift intensities. Any post-hoc calibrator scoring worse-than-vanilla Brier under shift is retired.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Adopt the paper's shift-stress harness (calibrate weeks 1-12, evaluate weeks 13-18 + playoffs, Brier/NLL/ECE across shift intensities) as the mandatory acceptance test for every calibrator in apps/web/lib/calibration/, and retire any post-hoc calibrator that scores worse-than-vanilla Brier under the playoff-shift evaluation.
 *
 * ACCEPTANCE GATE:
 * ADOPT the harness if it reproduces the paper's signature pattern on GSE data (post-hoc calibrators lose their i.i.d. edge under temporal shift; ensembles most robust).
 *
 * No ENABLED flag: this is an offline acceptance harness for other calibrators, not a publish path.
 */


export interface GameRow {
  readonly week: number;
  readonly p: number;
  readonly y: 0 | 1;
}

export interface Calibrator {
  readonly name: string;
  /** Fit on train games; return a map from raw engine prob to calibrated prob. */
  readonly fit: (train: readonly GameRow[]) => (p: number) => number;
}

/** Vanilla: the identity calibrator (raw engine probabilities). */
export const VANILLA: Calibrator = { name: "vanilla", fit: () => (p: number) => p };

function clip(p: number, eps = 1e-9): number {
  return Math.min(Math.max(p, eps), 1 - eps);
}

export function brierScore(probs: readonly number[], ys: readonly number[]): number {
  const n = probs.length;
  if (n === 0) return NaN;
  return probs.reduce((a, p, i) => a + (p - ys[i]) * (p - ys[i]), 0) / n;
}

export function negativeLogLikelihood(
  probs: readonly number[],
  ys: readonly number[],
): number {
  const n = probs.length;
  if (n === 0) return NaN;
  return (
    -probs.reduce(
      (a, p, i) => a + ys[i] * Math.log(clip(p)) + (1 - ys[i]) * Math.log(clip(1 - p)),
      0,
    ) / n
  );
}

export function expectedCalibrationError(
  probs: readonly number[],
  ys: readonly number[],
  nBins = 10,
): number {
  const n = probs.length;
  if (n === 0) return NaN;
  let ece = 0;
  for (let b = 0; b < nBins; b++) {
    const lo = b / nBins;
    const hi = (b + 1) / nBins;
    const idx = probs
      .map((p, i) => (p > lo && (p <= hi || (b === nBins - 1 && p === 1)) ? i : -1))
      .filter((i) => i >= 0);
    if (idx.length === 0) continue;
    const acc = idx.reduce((a, i) => a + ys[i], 0) / idx.length;
    const conf = idx.reduce((a, i) => a + probs[i], 0) / idx.length;
    ece += (idx.length / n) * Math.abs(acc - conf);
  }
  return ece;
}

export interface ShiftStressRow {
  readonly name: string;
  readonly brier: number;
  readonly nll: number;
  readonly ece: number;
  readonly worseThanVanillaBrier: boolean;
}

/**
 * Mandatory acceptance test for every calibrator: fit on weeks <= calibrateThroughWeek,
 * evaluate on weeks >= evalFromWeek (the temporal-shift block).
 */
export function runShiftStressHarness(
  calibrators: readonly Calibrator[],
  games: readonly GameRow[],
  calibrateThroughWeek: number,
  evalFromWeek: number,
): ShiftStressRow[] {
  const train = games.filter((g) => g.week <= calibrateThroughWeek);
  const evalGames = games.filter((g) => g.week >= evalFromWeek);
  const rows = calibrators.map((c) => {
    const map = c.fit(train);
    const probs = evalGames.map((g) => clip(map(g.p)));
    const ys = evalGames.map((g) => g.y);
    return {
      name: c.name,
      brier: brierScore(probs, ys),
      nll: negativeLogLikelihood(probs, ys),
      ece: expectedCalibrationError(probs, ys),
      worseThanVanillaBrier: false,
    };
  });
  const vanilla = rows.find((r) => r.name === VANILLA.name);
  if (vanilla) {
    for (const r of rows) {
      (r as { worseThanVanillaBrier: boolean }).worseThanVanillaBrier =
        r.name !== VANILLA.name && r.brier > vanilla.brier;
    }
  }
  return rows;
}

/** Retire (filter out) calibrators that lose their edge under shift. */
export function retireShiftLosers(rows: readonly ShiftStressRow[]): ShiftStressRow[] {
  return rows.filter((r) => !r.worseThanVanillaBrier);
}
