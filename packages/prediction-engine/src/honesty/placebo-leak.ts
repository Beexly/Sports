/**
 * Phase 0 lightweight placebo harness (honesty surface).
 *
 * HISTORY / FIX
 * The previous implementation shuffled a bare CLV number series and took
 * mean(|CLV|). Both mean and |mean| are permutation-invariant, so the
 * "shuffle" was a provable no-op — and the gate was inverted:
 *   real edge (|mean| large) → pass:false
 *   zero edge               → pass:true
 * That is the opposite of a leakage detector.
 *
 * CORRECT LIGHTWEIGHT SEMANTICS
 * Accept paired (modelSignal, realizedReturn) observations. Destroy the
 * pairing by shuffling realized returns across fixed signals, then measure
 * the residual association mean(signal * return) after demeaning. Under a
 * sound scramble the residual collapses to ~0. The gate PASSES when the
 * scrambled association is within threshold — i.e. the harness actually
 * destroyed structure. Observed (unscrambled) association is reported but
 * does NOT fail the gate: real edge is allowed; surviving structure after
 * scramble is the failure mode (broken harness or constant/degenerate input).
 *
 * THIS IS NOT a substitute for edge-lab `shuffledTimePlacebo`, which re-serves
 * features through the as-of store at random times and is the production
 * Phase-0 leakage gate. This module is the honesty-surface smoke that must
 * itself be non-vacuous.
 */

export interface PlaceboTrial {
  readonly clv: number;
}

/** One observation: decision-time signal paired with realized signed return/CLV. */
export interface PlaceboPair {
  /** Model-side score at decision time (edge, p−q, signed selection strength). */
  readonly modelSignal: number;
  /** Realized signed CLV / unit return for the same observation. */
  readonly realizedReturn: number;
}

export interface PlaceboReport {
  readonly n: number;
  readonly meanClv: number;
  readonly absMeanClv: number;
  readonly maxAbsClv: number;
  readonly pass: boolean;
  readonly threshold: number;
  readonly detail: string;
  /** Observed demeaned association mean(signal' * return') before scramble. */
  readonly observedAssociation: number;
  /** Median |association| across scramble runs (the quantity under test). */
  readonly placeboAbsAssociation: number;
  readonly runs: number;
}

/**
 * Fisher-Yates shuffle (seeded for reproducibility in tests).
 */
export function shuffleInPlace<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
  return arr;
}

function isPlaceboPairArray(
  input: readonly PlaceboPair[] | readonly number[],
): input is readonly PlaceboPair[] {
  if (input.length === 0) return false;
  const first = input[0];
  return typeof first === "object" && first !== null && "modelSignal" in first && "realizedReturn" in first;
}

function demeanedAssociation(signals: readonly number[], returns: readonly number[]): number {
  const n = signals.length;
  if (n === 0) return 0;
  let meanS = 0;
  let meanR = 0;
  for (let i = 0; i < n; i++) {
    meanS += signals[i]!;
    meanR += returns[i]!;
  }
  meanS /= n;
  meanR /= n;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += (signals[i]! - meanS) * (returns[i]! - meanR);
  }
  return acc / n;
}

/**
 * Label-permutation placebo on paired (signal, return) observations.
 *
 * - Bare `number[]` is rejected fail-closed (legacy no-op API).
 * - Pass when scrambled residual association collapses within threshold.
 * - Observed edge magnitude is reported, never used as a fail condition.
 */
export function runShuffledTimePlacebo(
  input: readonly PlaceboPair[] | readonly number[],
  opts: { threshold?: number; rng?: () => number; runs?: number } = {},
): PlaceboReport {
  const threshold = opts.threshold ?? 0.005;
  const runs = Math.max(1, Math.floor(opts.runs ?? 24));
  const rng = opts.rng ?? Math.random;

  if (!isPlaceboPairArray(input)) {
    const n = input.length;
    // Fail closed: bare CLV series made the prior gate inverted and vacuous.
    return {
      n,
      meanClv: n > 0 ? (input as readonly number[]).reduce((a, b) => a + b, 0) / n : 0,
      absMeanClv: 0,
      maxAbsClv: n > 0 ? Math.max(...(input as readonly number[]).map((x) => Math.abs(x))) : 0,
      pass: false,
      threshold,
      observedAssociation: 0,
      placeboAbsAssociation: 0,
      runs: 0,
      detail:
        "unsupported_input — bare CLV series is permutation-invariant under mean; " +
        "pass PlaceboPair[] { modelSignal, realizedReturn }. " +
        "Production Phase-0 leakage gate is edge-lab shuffledTimePlacebo (as-of store).",
    };
  }

  const n = input.length;
  if (n < 20) {
    return {
      n,
      meanClv: 0,
      absMeanClv: 0,
      maxAbsClv: 0,
      pass: false,
      threshold,
      observedAssociation: 0,
      placeboAbsAssociation: 0,
      runs: 0,
      detail: "sample_floor — need ≥20 paired (modelSignal, realizedReturn) observations",
    };
  }

  const signals = input.map((p) => p.modelSignal);
  const returns = input.map((p) => p.realizedReturn);
  const observedAssociation = demeanedAssociation(signals, returns);
  const meanClv = returns.reduce((a, b) => a + b, 0) / n;
  const absMeanClv = Math.abs(meanClv);
  const maxAbsClv = Math.max(...returns.map((x) => Math.abs(x)));

  // Degenerate signals (constant / FP-noise-only variance) make association
  // identically ~0 under any permutation — that would vacuously pass. Fail closed.
  const meanSignal = signals.reduce((a, s) => a + s, 0) / n;
  const signalVar = signals.reduce((a, s) => a + (s - meanSignal) ** 2, 0) / n;
  const SIGNAL_VAR_EPS = 1e-18;
  if (!(signalVar > SIGNAL_VAR_EPS)) {

    return {
      n,
      meanClv,
      absMeanClv,
      maxAbsClv,
      pass: false,
      threshold,
      observedAssociation,
      placeboAbsAssociation: 0,
      runs: 0,
      detail: "degenerate_signal — modelSignal has zero variance; cannot probe residual association",
    };
  }

  const absAssocs: number[] = [];
  for (let r = 0; r < runs; r++) {
    const scrambled = shuffleInPlace([...returns], rng);
    absAssocs.push(Math.abs(demeanedAssociation(signals, scrambled)));
  }
  absAssocs.sort((a, b) => a - b);
  const mid = Math.floor(absAssocs.length / 2);
  const placeboAbsAssociation =
    absAssocs.length % 2 === 1
      ? absAssocs[mid]!
      : (absAssocs[mid - 1]! + absAssocs[mid]!) / 2;

  // Sound harness: scramble must destroy association. Residual above threshold
  // means the shuffle did not break structure (implementation bug or non-iid junk).
  const pass = placeboAbsAssociation <= threshold;

  return {
    n,
    meanClv,
    absMeanClv,
    maxAbsClv,
    pass,
    threshold,
    observedAssociation,
    placeboAbsAssociation,
    runs,
    detail: pass
      ? `label-permutation residual |assoc|=${placeboAbsAssociation.toFixed(6)} ≤ ${threshold} ` +
        `(observed assoc=${observedAssociation.toFixed(6)}; real edge does not fail this gate)`
      : `label-permutation residual |assoc|=${placeboAbsAssociation.toFixed(6)} > ${threshold} — ` +
        `structure survived scramble; harness or input is unsound`,
  };
}

/** Mulberry32 PRNG for deterministic tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
