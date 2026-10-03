/**
 * STaSy: Score-based Tabular data Synthesis
 *
 * arXiv:2210.04018v1 · lane:synthetic_data · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Synthetic-data fidelity checks: the two-sample Kolmogorov-Smirnov statistic between real and
 * synthetic empirical CDFs, a moment-parity report (means, standard deviations, standardized mean
 * shift), and range conformance of synthetic values to the observed min/max.
 *
 * Improvement (wiring record): Wrap the tabular diffusion with the STaSy training strategy: TabRep roots-of-unity encodings for
 * team/opponent/venue/weather/rest categoricals + quantile transforms for numerics, continuous
 * score-based SDE (VP/VE/sub-VP per Table 7), self-paced learning (SPL alpha0=0.2, beta0=0.9,
 * S=10,000) then probability-flow-ODE log-probability scoring with DSM fine-tuning on rows with log
 * p(x_i) < tau (median threshold); select on CatBoost ML-efficiency on a held-out season + rare-regime
 * coverage (playoff, extreme weather) — then initialize SPL record weights with a domain difficulty
 * prior (down-weight known high-variance games) instead of uniform, to test whether the curriculum
 * does real work on NFL structure rather than fitting noise.
 *
 * ACCEPTANCE GATE: ADOPT the SPL + fine-tuning wrapper iff: (a) real+synthetic log-loss beats the naive VP-SDE baseline
 * by >=0.003 on held-out 2024, (b) rare-regime coverage improves >=10% relative with no
 * column-fidelity regression (Omega_col within 0.02 of baseline), (c) median 2024 log-probability
 * under STaSy exceeds the naive model (the paper's fine-tuning signature 131.734 vs 129.293); REJECT
 * if SPL collapses to near-uniform weights (curriculum does nothing — check the weight histogram).
 *
 * Ingest role: synthetic data validation (distributional parity, range conformance).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2210.04018v1" as const;
export const LANE = "synthetic_data" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the SPL + fine-tuning wrapper iff: (a) real+synthetic log-loss beats the naive VP-SDE baseline by >=0.003 on held-out 2024, (b) rare-regime coverage improves >=10% relative with no column-fidelity regression (Omega_col within 0.02 of baseline), (c) median 2024 log-probability under STaSy exceeds the naive model (the paper's fine-tuning signature 131.734 vs 129.293); REJECT if SPL collapses to near-uniform weights (curriculum does nothing — check the weight histogram).`;

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
