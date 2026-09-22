/**
 * Calibration horse-race harness: BNN vs ex-post calibration (arXiv 2209.14594).
 *
 * Compares two predictive-uncertainty approaches on time-ordered
 * backtests with log-loss + Brier + ECE (expected calibration error),
 * and tests the difference with a paired Diebold-Mariano-style test at
 * 5% — the paper's own standard, which the paper itself did not meet.
 * Also covers the stacking the paper never tries: ex-post (beta /
 * isotonic-style) recalibration of the BNN's own predictive mean.
 * The VI-BNN estimator itself (Pyro/PyMC) is out of scope for this
 * small module; this is the decision machinery that consumes
 * predictive means from any two pipelines.
 *
 * ACCEPTANCE GATE: ADOPT the BNN head only iff it beats the best
 * ex-post calibrator with statistical significance on time-ordered
 * data (paired DM-style test at 5%); otherwise REJECT and keep the
 * cheaper post-hoc calibration stack ("calibration is usually enough").
 *
 * Research-only module. Not wired into any live calibration path.
 */

export interface ForecastSet {
  name: string;
  /** Predictive mean probabilities. */
  probs: number[];
  outcomes: number[];
}

function clampP(p: number): number {
  return Math.min(1 - 1e-9, Math.max(1e-9, p));
}

export function logLoss(probs: readonly number[], outcomes: readonly number[]): number {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("logLoss: length mismatch / empty");
  }
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = clampP(probs[i] as number);
    const y = outcomes[i] as number;
    s += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  return s / probs.length;
}

export function brier(probs: readonly number[], outcomes: readonly number[]): number {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("brier: length mismatch / empty");
  }
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    s += ((probs[i] as number) - (outcomes[i] as number)) ** 2;
  }
  return s / probs.length;
}

/** Expected calibration error with equal-width bins. */
export function ece(
  probs: readonly number[],
  outcomes: readonly number[],
  bins = 10,
): number {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("ece: length mismatch / empty");
  }
  let err = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let sp = 0;
    let sy = 0;
    let n = 0;
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i] as number;
      if (p >= lo && (p < hi || b === bins - 1)) {
        sp += p;
        sy += outcomes[i] as number;
        n++;
      }
    }
    if (n > 0) err += (n / probs.length) * Math.abs(sp / n - sy / n);
  }
  return err;
}

/**
 * Platt-style recalibration: fit p' = logistic(a + b * logit(p)) by a
 * coarse grid search on log-loss (avoids an optimizer dependency).
 */
export function plattRecalibrate(
  probs: readonly number[],
  outcomes: readonly number[],
): (p: number) => number {
  if (probs.length !== outcomes.length || probs.length === 0) {
    throw new Error("plattRecalibrate: length mismatch / empty");
  }
  const logit = (p: number): number => Math.log(clampP(p) / (1 - clampP(p) + 1e-12));
  const sig = (x: number): number => 1 / (1 + Math.exp(-x));
  let bestA = 0;
  let bestB = 1;
  let bestLl = Infinity;
  for (const a of [-1, -0.5, 0, 0.5, 1]) {
    for (const b of [0.5, 0.75, 1, 1.5, 2]) {
      let s = 0;
      for (let i = 0; i < probs.length; i++) {
        const pc = clampP(sig(a + b * logit(probs[i] as number)));
        const y = outcomes[i] as number;
        s += -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
      }
      if (s < bestLl) {
        bestLl = s;
        bestA = a;
        bestB = b;
      }
    }
  }
  return (p: number) => clampP(sig(bestA + bestB * logit(p)));
}

export interface HorseraceResult {
  a: { name: string; logLoss: number; brier: number; ece: number };
  b: { name: string; logLoss: number; brier: number; ece: number };
  /** Paired DM-style z-statistic on log-loss differences (a - b). */
  dmZ: number;
  /** Two-sided p-value (normal approx). */
  pValue: number;
  /** "a" | "b" | null at the 5% level. */
  winner: "a" | "b" | null;
}

/**
 * Horse-race two forecast sets on identical outcomes: metrics plus a
 * paired Diebold-Mariano-style test on log-loss differences.
 */
export function horserace(a: ForecastSet, b: ForecastSet): HorseraceResult {
  if (a.probs.length !== b.probs.length || a.probs.length === 0) {
    throw new Error("horserace: length mismatch / empty");
  }
  if (!a.outcomes.every((y, i) => y === b.outcomes[i])) {
    throw new Error("horserace: outcome mismatch");
  }
  const diffs: number[] = [];
  for (let i = 0; i < a.probs.length; i++) {
    const pa = clampP(a.probs[i] as number);
    const pb = clampP(b.probs[i] as number);
    const y = a.outcomes[i] as number;
    const lla = -(y * Math.log(pa) + (1 - y) * Math.log(1 - pa));
    const llb = -(y * Math.log(pb) + (1 - y) * Math.log(1 - pb));
    diffs.push(lla - llb);
  }
  const n = diffs.length;
  const mean = diffs.reduce((s, d) => s + d, 0) / n;
  const sd = Math.sqrt(diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / Math.max(1, n - 1));
  const dmZ = mean / Math.max(1e-12, sd / Math.sqrt(n));
  const pValue = 2 * 0.5 * (1 - erf(Math.abs(dmZ) / Math.SQRT2));
  const summarize = (f: ForecastSet): { name: string; logLoss: number; brier: number; ece: number } => ({
    name: f.name,
    logLoss: logLoss(f.probs, f.outcomes),
    brier: brier(f.probs, f.outcomes),
    ece: ece(f.probs, f.outcomes),
  });
  return {
    a: summarize(a),
    b: summarize(b),
    dmZ,
    pValue,
    winner: pValue < 0.05 ? (dmZ < 0 ? "a" : "b") : null,
  };
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
