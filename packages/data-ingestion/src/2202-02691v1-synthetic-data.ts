/**
 * TTS-GAN: Transformer-based Time-Series GAN
 *
 * arXiv:2202.02691v1 · lane:synthetic_data · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Synthetic-data fidelity checks: the two-sample Kolmogorov-Smirnov statistic between real and
 * synthetic empirical CDFs, a moment-parity report (means, standard deviations, standardized mean
 * shift), and range conformance of synthetic values to the observed min/max.
 *
 * Improvement (wiring record): Adopt conditional TTS-GAN for bulk trajectory augmentation: 32-team x 18-week x K-metric panel
 * (nflverse 2015-2024), regime class-embedding (home favorite/dog, divisional, dome, altitude,
 * short-week) on noise + discriminator patches, 3-block transformer encoder G/D, LSGAN losses — single
 * conditional model instead of per-class models, TSTR-driven early stopping (checkpoint maximizing
 * synthetic-trained probe classifier's real-data accuracy), throughput >=100 trajectories/second/GPU.
 *
 * ACCEPTANCE GATE: ADOPT iff: (a) it matches/beats Time-GAN on >=7/10 of the paper's fidelity comparisons on NFL data,
 * (b) TSTR AUC >= 90% of real-trained AUC on held-out seasons, (c) real+synthetic spread log-loss
 * beats real-only by >=0.003, (d) throughput >=100 trajectories/sec on one GPU.
 *
 * Ingest role: synthetic data validation (distributional parity, range conformance).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2202.02691v1" as const;
export const LANE = "synthetic_data" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT iff: (a) it matches/beats Time-GAN on >=7/10 of the paper's fidelity comparisons on NFL data, (b) TSTR AUC >= 90% of real-trained AUC on held-out seasons, (c) real+synthetic spread log-loss beats real-only by >=0.003, (d) throughput >=100 trajectories/sec on one GPU.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "distributional parity checks (KS, moments, range)",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Population mean, or null on empty/malformed input. */
function mean(xs: readonly number[]): number | null {
  if (xs.length === 0 || !xs.every(isFiniteNumber)) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation, or null on empty/malformed input. */
function std(xs: readonly number[]): number | null {
  const m = mean(xs);
  if (m === null) return null;
  return Math.sqrt(xs.reduce((a, v) => a + (v - m) * (v - m), 0) / xs.length);
}

/** Sample variance (n-1), or null on <2 points/malformed input. */
function sampleVariance(xs: readonly number[]): number | null {
  if (xs.length < 2 || !xs.every(isFiniteNumber)) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, v) => a + (v - m) * (v - m), 0) / (xs.length - 1);
}

/** Two-sample Kolmogorov-Smirnov statistic between empirical CDFs. */
export function ksStatistic(a: readonly number[], b: readonly number[]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  if (!a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  let i = 0;
  let j = 0;
  let max = 0;
  while (i < sa.length || j < sb.length) {
    const nextA = i < sa.length ? (sa[i] ?? Infinity) : Infinity;
    const nextB = j < sb.length ? (sb[j] ?? Infinity) : Infinity;
    const v = Math.min(nextA, nextB);
    while (i < sa.length && (sa[i] ?? Infinity) <= v) i++;
    while (j < sb.length && (sb[j] ?? Infinity) <= v) j++;
    max = Math.max(max, Math.abs(i / sa.length - j / sb.length));
  }
  return max;
}

export interface ParityReport {
  meanReal: number;
  meanSynth: number;
  stdReal: number;
  stdSynth: number;
  ks: number;
  /** |meanReal - meanSynth| in units of the real std. */
  meanShiftStd: number;
}

/** Moment + KS parity report between a real column and its synthetic twin. */
export function columnParityReport(real: readonly number[], synth: readonly number[]): ParityReport | null {
  const ks = ksStatistic(real, synth);
  const mr = mean(real);
  const ms = mean(synth);
  const sr = std(real);
  const ss = std(synth);
  if (ks === null || mr === null || ms === null || sr === null || ss === null) return null;
  return {
    meanReal: mr,
    meanSynth: ms,
    stdReal: sr,
    stdSynth: ss,
    ks,
    meanShiftStd: sr > 0 ? Math.abs(mr - ms) / sr : 0,
  };
}

/** Fraction of synthetic values inside the observed [min, max] range. */
export function rangeConformance(synth: readonly number[], min: number, max: number): number | null {
  if (!isFiniteNumber(min) || !isFiniteNumber(max) || min > max) return null;
  if (synth.length === 0 || !synth.every(isFiniteNumber)) return null;
  return synth.filter((v) => v >= min && v <= max).length / synth.length;
}
