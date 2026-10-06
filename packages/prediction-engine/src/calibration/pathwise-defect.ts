/**
 * Equal-width calibration error can look calm while a path segment, a
 * stratum, or a thin upper tail is biased. Those three cancel or dilute
 * inside one pooled bin. This screen reports each slice on its own and
 * raises a flag only when the pooled error stays under the ceiling.
 *
 * The fit reader reports R^2 and the slope's two-sided t probability
 * together. Either number alone can call the same line useful or empty.
 */

import type { CalibrationHistoryRow } from "@sports/types";

export type BinaryRow = CalibrationHistoryRow;

export interface ScreenThresholds {
  /** Pooled equal-width ECE at or under this counts as calm. */
  readonly eceCeiling: number;
  /** |mean(p) - mean(y)| inside a stratum that counts as a break. */
  readonly stratumGap: number;
  /** |mean(p) - mean(y)| inside a path segment that counts as a break. */
  readonly pathGap: number;
  /** |mean(p) - mean(y)| inside the upper tail that counts as a break. */
  readonly tailGap: number;
  /** Predictions at or above this probability form the upper tail. */
  readonly tailProbabilityFloor: number;
  readonly pathSegments: number;
  /** A slice smaller than this cannot raise a flag. */
  readonly minSliceN: number;
}

export const DEFAULT_THRESHOLDS: ScreenThresholds = {
  eceCeiling: 0.03,
  stratumGap: 0.05,
  pathGap: 0.1,
  tailGap: 0.05,
  tailProbabilityFloor: 0.8,
  pathSegments: 2,
  minSliceN: 20,
};

export type BlindFlag =
  | "AGGREGATE_ECE_BLIND_TO_STRATUM"
  | "AGGREGATE_ECE_BLIND_TO_PATH"
  | "TAIL_EXCESS_HIDDEN_BY_ECE";

export interface SliceGap {
  readonly id: string;
  readonly n: number;
  /** mean(p) - mean(y). Positive means the forecasts sit above the outcomes. */
  readonly gap: number;
}

export interface CalibrationBlindSpot {
  readonly n: number;
  readonly ece: number;
  readonly pooledGap: number;
  readonly strata: readonly SliceGap[];
  readonly path: readonly SliceGap[];
  readonly tail: SliceGap | null;
  readonly flags: readonly BlindFlag[];
}

export interface FitRead {
  readonly n: number;
  readonly slope: number;
  readonly rSquared: number;
  /** Two-sided p for H0: slope = 0. Degrees of freedom are n - 2. */
  readonly pValue: number;
  /** True when significance and R^2 disagree about whether the line is useful. */
  readonly split: boolean;
}

export interface FitThresholds {
  readonly alpha: number;
  readonly r2Floor: number;
}

export const DEFAULT_FIT_THRESHOLDS: FitThresholds = {
  alpha: 0.05,
  r2Floor: 0.2,
};

function fail(message: string): never {
  throw new Error(`pathwise-defect: ${message}`);
}

function mean(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Square each residual, then sum. Summing first collapses a real residual to zero. */
export function residualSumOfSquares(ys: readonly number[], fitted: readonly number[]): number {
  if (ys.length !== fitted.length || ys.length === 0) fail("residual arrays must align and be non-empty");
  let ss = 0;
  for (let i = 0; i < ys.length; i++) {
    const e = (ys[i] as number) - (fitted[i] as number);
    ss += e * e;
  }
  return ss;
}

export function equalWidthEce(probs: readonly number[], outcomes: readonly number[], bins = 10): number {
  if (probs.length !== outcomes.length || probs.length === 0) fail("ece inputs must align and be non-empty");
  if (!Number.isInteger(bins) || bins < 1) fail("bins must be a positive integer");
  const n = probs.length;
  let total = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let count = 0;
    let sumP = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      const p = probs[i] as number;
      const inBin = p >= lo && (b === bins - 1 ? p <= hi : p < hi);
      if (!inBin) continue;
      count += 1;
      sumP += p;
      sumY += outcomes[i] as number;
    }
    if (count === 0) continue;
    total += (count / n) * Math.abs(sumP / count - sumY / count);
  }
  return total;
}

function gapOf(rows: readonly BinaryRow[]): number {
  let sumP = 0;
  let sumY = 0;
  for (const row of rows) {
    sumP += row.p;
    sumY += row.y;
  }
  return sumP / rows.length - sumY / rows.length;
}

function assertRows(rows: readonly BinaryRow[]): void {
  if (rows.length === 0) fail("empty sample");
  for (const row of rows) {
    if (!(row.p >= 0 && row.p <= 1) || Number.isNaN(row.p)) fail("p must be in [0,1]");
    if (row.y !== 0 && row.y !== 1) fail("y must be 0 or 1");
    if (!Number.isFinite(row.path)) fail("path must be finite");
    if (row.stratum.length === 0) fail("stratum must be named");
  }
}

function stratumSlices(rows: readonly BinaryRow[]): SliceGap[] {
  const groups = new Map<string, BinaryRow[]>();
  for (const row of rows) {
    const bucket = groups.get(row.stratum);
    if (bucket) bucket.push(row);
    else groups.set(row.stratum, [row]);
  }
  return [...groups.entries()]
    .map(([id, bucket]) => ({ id, n: bucket.length, gap: gapOf(bucket) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function pathSlices(rows: readonly BinaryRow[], segments: number): SliceGap[] {
  if (!Number.isInteger(segments) || segments < 2) fail("pathSegments must be an integer >= 2");
  const ordered = [...rows].sort((a, b) => a.path - b.path || a.stratum.localeCompare(b.stratum));
  const n = ordered.length;
  const out: SliceGap[] = [];
  for (let s = 0; s < segments; s++) {
    const start = Math.floor((s * n) / segments);
    const end = Math.floor(((s + 1) * n) / segments);
    const bucket = ordered.slice(start, end);
    if (bucket.length === 0) continue;
    out.push({ id: String(s), n: bucket.length, gap: gapOf(bucket) });
  }
  return out;
}

function tailSlice(rows: readonly BinaryRow[], floor: number): SliceGap | null {
  if (!(floor > 0 && floor < 1)) fail("tail floor must be in (0,1)");
  const bucket = rows.filter((row) => row.p >= floor);
  if (bucket.length === 0) return null;
  return { id: `p>=${floor}`, n: bucket.length, gap: gapOf(bucket) };
}

function worst(slices: readonly SliceGap[], minN: number): number {
  let worstAbs = 0;
  for (const slice of slices) {
    if (slice.n < minN) continue;
    worstAbs = Math.max(worstAbs, Math.abs(slice.gap));
  }
  return worstAbs;
}

/**
 * Mint-time veto for a supplied calibration history.
 *
 * Undefined or empty: no vote. The caller did not bring a history, and absence
 * is not evidence of a defect.
 * A history the screen rejects: withhold. An attachment that cannot be read
 * must not count as a pass.
 * Any blind-spot flag: withhold. The pooled score looked calm and a slice did not.
 */
export function calibrationHistoryWithholds(rows: readonly BinaryRow[] | undefined): boolean {
  if (!rows || rows.length === 0) return false;
  try {
    return screenCalibrationBlindSpots(rows).flags.length > 0;
  } catch {
    return true;
  }
}

export function screenCalibrationBlindSpots(
  rows: readonly BinaryRow[],
  thresholds: ScreenThresholds = DEFAULT_THRESHOLDS,
): CalibrationBlindSpot {
  assertRows(rows);
  const probs = rows.map((row) => row.p);
  const outcomes = rows.map((row) => row.y);
  const ece = equalWidthEce(probs, outcomes);
  const pooledGap = gapOf(rows);
  const strata = stratumSlices(rows);
  const path = pathSlices(rows, thresholds.pathSegments);
  const tail = tailSlice(rows, thresholds.tailProbabilityFloor);
  const calm = ece <= thresholds.eceCeiling;
  const flags: BlindFlag[] = [];
  const sizedStrata = strata.filter((slice) => slice.n >= thresholds.minSliceN).length;
  if (calm && sizedStrata >= 2 && worst(strata, thresholds.minSliceN) >= thresholds.stratumGap) {
    flags.push("AGGREGATE_ECE_BLIND_TO_STRATUM");
  }
  if (calm && worst(path, thresholds.minSliceN) >= thresholds.pathGap) {
    flags.push("AGGREGATE_ECE_BLIND_TO_PATH");
  }
  if (calm && tail !== null && tail.n >= thresholds.minSliceN && Math.abs(tail.gap) >= thresholds.tailGap) {
    flags.push("TAIL_EXCESS_HIDDEN_BY_ECE");
  }
  return { n: rows.length, ece, pooledGap, strata, path, tail, flags };
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843696540789e-6, 1.5056327351493117e-7,
] as const;

function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  let x = LANCZOS[0];
  const shifted = z - 1;
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] as number / (shifted + i);
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnBeta = logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const front = Math.exp(lnBeta);
  if (x < (a + 1) / (a + b + 2)) return (front * betacf(a, b, x)) / a;
  return 1 - (front * betacf(b, a, 1 - x)) / b;
}

/** Two-sided Student-t tail. df is n - 2 for a simple slope test. */
export function studentTTwoSidedP(t: number, df: number): number {
  if (!(df > 0) || !Number.isFinite(df)) fail("df must be positive");
  if (!Number.isFinite(t)) fail("t must be finite");
  if (t === 0) return 1;
  const x = df / (df + t * t);
  const p = regularizedIncompleteBeta(df / 2, 0.5, x);
  if (p < 0) return 0;
  if (p > 1) return 1;
  return p;
}

export function readFit(
  xs: readonly number[],
  ys: readonly number[],
  thresholds: FitThresholds = DEFAULT_FIT_THRESHOLDS,
): FitRead {
  if (xs.length !== ys.length || xs.length < 3) fail("fit needs at least 3 aligned pairs");
  for (const value of xs) if (!Number.isFinite(value)) fail("x must be finite");
  for (const value of ys) if (!Number.isFinite(value)) fail("y must be finite");
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let ssx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    ssx += dx * dx;
    sxy += dx * ((ys[i] as number) - my);
  }
  if (ssx === 0) {
    return { n, slope: 0, rSquared: 0, pValue: 1, split: false };
  }
  const slope = sxy / ssx;
  const fitted = xs.map((x) => my + slope * (x - mx));
  const ssRes = residualSumOfSquares(ys, fitted);
  let ssTot = 0;
  for (const y of ys) ssTot += (y - my) * (y - my);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const df = n - 2;
  let pValue = 1;
  if (ssRes === 0) {
    pValue = slope === 0 ? 1 : 0;
  } else {
    const sigma2 = ssRes / df;
    const se = Math.sqrt(sigma2 / ssx);
    pValue = se === 0 ? 0 : studentTTwoSidedP(slope / se, df);
  }
  const significant = pValue < thresholds.alpha;
  const usefulFit = rSquared >= thresholds.r2Floor;
  return { n, slope, rSquared, pValue, split: significant !== usefulFit };
}
