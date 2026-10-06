/**
 * arXiv 1601.04302v6: Footballonomics: The Anatomy of American Football — Evidence from 7 Years of NFL Game Data
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * The paper's FPM bootstrap architecture: per-team season feature matrices
(recency-weighted), B = 1,000 bootstrap resamples of correlated performance
vectors per matchup, each pair pushed through the win-probability model. The
output is the bootstrap mean, a 95% CI, and the H0: Pbar_1 = Pbar_2
pick/no-pick test; stake sizes off the lower confidence bound (uncertainty
penalty), with the y=x quantized-bin calibration check as the accuracy
audit.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Replicate the paper's FPM bootstrap architecture on GSE's stack: per-team season feature matrices M_T (nflverse, recency-weighted), bootstrap B=1,000 correlated performance vectors per matchup, push pairs through GSE's win-probability model, output the mean, 95% CI, and the H_0: Pbar_1 = Pbar_2 test as the pick/no-pick gate -- sizing Kelly by the lower confidence bound or CI width as uncertainty penalty, with the paper's y=x quantized-bin calibration check as the probability-accuracy audit template.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT gate: (a) Test 2 calibration must hold on modern data -- bootstrap means must pass the y=x check; (b) the factor hierarchy must replicate directionally on 2020-2025 data (turnovers dominant, r-balance signal present); (c) any result depending on the dead nflgame data source is dropped.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: INFRA
 */
export const ENABLED = false; // Gate needs modern-data replication (Tests 2a/2b, dead-source drop).

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BootstrapResult {
  mean: number;
  ciLow: number;
  ciHigh: number;
  /** P(bootstrap Pbar_A <= Pbar_B): the H0: Pbar_1 = Pbar_2 pick/no-pick test. */
  h0PValue: number;
  B: number;
}

/**
 * FPM bootstrap: resample rows of each team's feature matrix B times, average
 * to correlated performance vectors, push each pair through winProb.
 */
export function fpmBootstrap(
  teamA: number[][],
  teamB: number[][],
  winProb: (a: number[], b: number[]) => number,
  B: number,
  seed: number,
): BootstrapResult {
  const rand = mulberry32(seed);
  const meanVec = (rows: number[][]) => {
    const d = rows[0]!.length;
    const m = new Array<number>(d).fill(0);
    for (const r of rows) for (let j = 0; j < d; j++) m[j]! += r[j]! / rows.length;
    return m;
  };
  const sample = (rows: number[][]) =>
    Array.from({ length: rows.length }, () => rows[Math.floor(rand() * rows.length)]!);
  const probs: number[] = [];
  for (let b = 0; b < B; b++) {
    probs.push(winProb(meanVec(sample(teamA)), meanVec(sample(teamB))));
  }
  probs.sort((x, y) => x - y);
  const mean = probs.reduce((a, c) => a + c, 0) / B;
  return {
    mean,
    ciLow: probs[Math.floor(0.025 * B)]!,
    ciHigh: probs[Math.min(B - 1, Math.ceil(0.975 * B) - 1)]!,
    h0PValue: probs.filter((p) => p <= 0.5).length / B,
    B,
  };
}

export interface CalibrationCheck {
  binCenters: number[];
  binEmpirical: number[];
  binCounts: number[];
  maxAbsDev: number;
  /** y=x check passes when every populated bin is within tolerance. */
  passes: boolean;
}

/** Quantized-bin y=x calibration check: mean predicted vs empirical per bin. */
export function quantizedBinCalibration(
  preds: number[],
  outcomes: (0 | 1)[],
  bins = 10,
  tolerance = 0.05,
): CalibrationCheck {
  const binCenters: number[] = [];
  const binEmpirical: number[] = [];
  const binCounts: number[] = [];
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let s = 0;
    let c = 0;
    for (let i = 0; i < preds.length; i++) {
      if (preds[i]! >= lo && (preds[i]! < hi || b === bins - 1)) {
        s += outcomes[i]!;
        c++;
      }
    }
    binCenters.push((lo + hi) / 2);
    binEmpirical.push(c === 0 ? NaN : s / c);
    binCounts.push(c);
  }
  let maxAbsDev = 0;
  for (let b = 0; b < bins; b++) {
    if (binCounts[b]! > 0) {
      maxAbsDev = Math.max(maxAbsDev, Math.abs(binEmpirical[b]! - binCenters[b]!));
    }
  }
  return { binCenters, binEmpirical, binCounts, maxAbsDev, passes: maxAbsDev <= tolerance };
}

/** Kelly fraction sized off the lower confidence bound (uncertainty penalty). */
export function kellyByLowerBound(pLow: number, decimalOdds: number): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  return Math.max((pLow * decimalOdds - 1) / b, 0);
}
