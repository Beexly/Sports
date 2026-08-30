/**
 * Information-edge gate — selective publication measured in BITS (shadow).
 *
 * ── WHY THERE IS NO NEURAL NETWORK HERE ───────────────────────────────────────
 * The research spec proposed a Variational Information Bottleneck (VIB): train an
 * encoder q(z|x), squeeze the features through a stochastic bottleneck Z, estimate
 * I(Z;Y) from the variational lower bound, and publish a pick only when the bound
 * clears a threshold expressed in bits. That needs a training loop, an amortised
 * encoder/decoder, a KL-annealing schedule and a held-out split — infrastructure
 * this repo does not have and would have to fabricate.
 *
 * But the quantity a VIB gate is *estimating* is available in CLOSED FORM the
 * moment we already hold a calibrated probability per pick. Our predictive
 * distribution IS the bottleneck output: Z is one-dimensional and already
 * sufficient, so the variational bound collapses onto the thing it was bounding
 * and I(P;Y) reduces to an entropy difference. This module implements THAT — the
 * exact closed-form counterpart of the VIB bit-threshold gate, with the
 * variational slack removed. No encoder to train, no ELBO to leave loose, no
 * seed-dependent optimum: the same number, computed rather than approximated.
 * Everything is base-2, so every figure below is literally in bits.
 *
 * ── TWO BASES. ONLY ONE OF THEM IS HONEST. THIS IS THE POINT OF THE MODULE. ───
 *
 *   prior basis    (GAMEABLE)  bits = H(baseRate) − mean_i H(p_i)
 *   realised basis (HONEST)    bits = H(baseRate) − mean_i CE(p_i, y_i)
 *
 * The prior basis never looks at an outcome. It measures CONFIDENCE, not accuracy.
 * A model that emits p ∈ {0,1} by coin flip — worth exactly nothing — scores a
 * perfect 1.000 bit on it, every time, by construction. It is therefore NOT
 * evidence of skill and must never be the publication gate.
 *
 * The realised basis swaps mean entropy for the mean cross-entropy actually paid
 * against realised y. It is the empirical mutual-information-style quantity, and
 * it cannot be gamed: overconfidence has unbounded downside there. The same
 * garbage model that scored 1.000 bit on the prior basis scores about −18.9 bits
 * on the realised basis (a confident miss costs −log2(probabilityFloor)), and a
 * model that is merely half-wrong scores about −9 bits. Negative realised bits
 * mean publishing the slate DESTROYS information relative to the base rate.
 *
 *   ⇒ GATE ON `realisedInformationGainBits` / basis "realised".
 *   ⇒ The prior basis is exported for exactly one legitimate use — sizing the
 *     headroom of a single pick that has not settled yet (`priorOnlyEdgeBits`) —
 *     and every symbol on that path is named `priorOnly*` so it can never be
 *     quietly mistaken for proof of edge.
 *
 * ── SCOPE ────────────────────────────────────────────────────────────────────
 * Pure functions. No database, no network, no env vars, no feature-flag reads.
 * This is a shadow / R&D module: it does not read or flip CALIBRATION_ADJUSTMENTS,
 * PERFORMANCE_STATS, RANKING_PAUSE_APPLY or AUTO_PUBLISH, and it does not write
 * eligibility anywhere. It returns advisory verdicts for an operator to read.
 * Fully deterministic — the only stochastic routine (`permutationNullBandBits`)
 * takes an explicit integer `seed` and uses the self-contained mulberry32 below,
 * so the same seed always reproduces the same output.
 */

import type { CalibrationSample } from "./probability-calibration.js";

/**
 * Input shape. `CalibrationSample` ({ p, y }) is assignable to this, so settled
 * calibration data flows in unchanged; `y` is optional only so that an unsettled
 * pick can still be scored on the (gameable) prior basis.
 */
export type EdgeCandidate = {
  /** Forecast probability in [0,1]. Entries outside [0,1] or non-finite are skipped. */
  readonly p: number;
  /** Realised binary outcome, when settled. 1 = win, 0 = loss. PUSH/VOID excluded upstream. */
  readonly y?: 0 | 1;
};

export type InformationEdgeBasis = "prior" | "realised";

export type InformationEdgeOptions = {
  /** No-information reference rate (default 0.5 — a two-way market coin flip). */
  readonly baseRate?: number;
  /** Cross-entropy clamp so a confident miss costs a large FINITE penalty (default 1e-6 ⇒ 19.93 bits). */
  readonly probabilityFloor?: number;
  /** Eligibility threshold in bits per prediction (default 0.02 — see the constant). */
  readonly thresholdBits?: number;
  /** "auto" (default) uses "realised" when every usable candidate has settled, else "prior". */
  readonly basis?: InformationEdgeBasis | "auto";
  /** Minimum usable predictions before eligibility can be granted (default 1). */
  readonly minSamples?: number;
};

export type InformationEdgeVerdict = {
  /** Information gain per prediction, in bits. Negative ⇒ worse than the base rate. */
  readonly bits: number;
  /** Threshold this verdict was judged against, in bits per prediction. */
  readonly threshold: number;
  readonly eligible: boolean;
  /** Usable predictions actually scored (invalid entries, and on the realised basis unsettled ones, are excluded). */
  readonly n: number;
  readonly basis: InformationEdgeBasis;
  readonly baseRate: number;
  readonly reason: string;
  readonly priced: false;
  readonly status: "shadow";
};

export type InformationEdgeNullBand = {
  readonly n: number;
  readonly permutations: number;
  readonly seed: number;
  /** Realised bits on the real (p, y) pairing. */
  readonly observedBits: number;
  /**
   * Mean realised bits across outcome-permuted replicas. Centred on
   * H(baseRate) − mean_i CE(p_i, ȳ) where ȳ is the EMPIRICAL outcome rate — which
   * is ≤ 0 only when `baseRate` equals ȳ (e.g. via `empiricalBaseRate`). Against
   * the default 0.5 on a skewed book it is routinely positive, so read it as the
   * reference the observed value must beat, never as a signed verdict.
   */
  readonly meanNullBits: number;
  /** 95th percentile of the permuted null distribution. */
  readonly p95NullBits: number;
  /** (1 + #{null ≥ observed}) / (permutations + 1). */
  readonly pValue: number;
  readonly exceedsNull: boolean;
  readonly priced: false;
  readonly status: "shadow";
};

/**
 * DEFAULT PUBLICATION THRESHOLD — 0.02 bits per prediction.
 *
 * Three anchors were weighed, and 0.02 is where they meet:
 *
 * 1. DETECTABILITY (the binding constraint). Twice the realised log-likelihood
 *    gain, in nats, is asymptotically χ²₁ under the null "this model carries no
 *    information about the outcome". So n settled picks reject that null at the
 *    5% level when
 *        2 · ln2 · n · bits ≥ 3.8415   ⇔   n · bits ≥ 2.77 total bits.
 *    At the platform's PROVEN gate of ~100 settled picks that is 0.028 bits/pick;
 *    at ~140 settled it is 0.020. Anything materially below 0.02 is a number we
 *    could not distinguish from zero at the sample sizes we actually have, so
 *    gating on it would be gating on noise.
 *
 * 2. WHAT IT COSTS IN PROBABILITY TERMS. Against a 0.5 base rate,
 *    H(0.5) − H(p) = 0.02 ⇒ p ≈ 0.583. A flat slate must therefore average ~58%,
 *    or get there by mixing (half at 0.65 and half at a coin flip ⇒ 0.033 bits).
 *
 * 3. WHAT IT DELIBERATELY EXCLUDES — read this before tuning. A perfectly
 *    calibrated flat 55% model earns only 0.0072 bits/pick. That model is
 *    profitable at −110 and it does NOT clear this gate. That is intentional:
 *    this is a SELECTIVE PUBLICATION gate on the slate we choose to put in front
 *    of subscribers, not a profitability test for the whole board. A slate is
 *    selected for conviction; if the selected slate cannot beat 0.02 bits it is
 *    not a slate, it is just the board. An operator running a wide, thin-edge
 *    book should lower this explicitly — and then honour anchor 1, because a
 *    lower threshold needs proportionally more settled picks to mean anything.
 */
export const DEFAULT_INFORMATION_EDGE_THRESHOLD_BITS = 0.02;

/** Cross-entropy clamp. A confident miss costs −log2(1e-6) ≈ 19.93 bits — huge, but finite. */
export const DEFAULT_PROBABILITY_FLOOR = 1e-6;

/** No-information reference: a two-way market with balanced sides. */
export const DEFAULT_BASE_RATE = 0.5;

/**
 * Total realised bits (bits × n) needed to reject "zero information" at 5%:
 * χ²₁(0.95) / (2 ln 2) ≈ 2.771. Surfaced in verdict reasons, never used to gate.
 */
export const DETECTABILITY_TOTAL_BITS = 3.841458820694124 / (2 * Math.LN2);

// ============================================================
// Core information-theoretic primitives (base 2 — all outputs in bits)
// ============================================================

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Binary (Shannon) entropy in bits: −p log2 p − (1−p) log2(1−p).
 *
 * Returns exactly 0 at p = 0 and p = 1 (the correct limits, since x log x → 0),
 * so the degenerate ends never produce NaN. Returns exactly 1 at p = 0.5.
 * Non-finite input returns NaN rather than silently pretending to be certain.
 */
export function binaryEntropyBits(p: number): number {
  if (!Number.isFinite(p)) return NaN;
  const q = clamp01(p);
  if (q <= 0 || q >= 1) return 0;
  return -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q));
}

/**
 * Binary cross-entropy in bits: −[ y log2 p + (1−y) log2(1−p) ].
 *
 * The probability actually charged (p when y=1, 1−p when y=0) is clamped into
 * [floor, 1−floor] so a confident miss is a large FINITE penalty instead of
 * Infinity — which is what makes the realised basis usable as a gate rather than
 * an on/off trap.
 *
 * The clamp is applied to the CHARGED probability, not to p, so both branches pay
 * exactly −log2(floor) for a fully confident miss. Clamping p and then taking
 * 1−p instead would round-trip through 1−(1−floor) and lose ~11 significant
 * digits, making CE(1,0) differ from CE(0,1) by ~4e-11 and breaking the
 * (p,y) ↔ (1−p,1−y) symmetry that the module's headline numbers assume.
 */
export function binaryCrossEntropyBits(
  p: number,
  y: 0 | 1,
  probabilityFloor: number = DEFAULT_PROBABILITY_FLOOR,
): number {
  if (!Number.isFinite(p)) return NaN;
  const floor = resolveFloor(probabilityFloor);
  const q = clamp01(p);
  const charged = y === 1 ? q : 1 - q;
  return -Math.log2(Math.min(Math.max(charged, floor), 1 - floor));
}

// ============================================================
// Option resolution
// ============================================================

function resolveBaseRate(baseRate: number | undefined): number {
  if (typeof baseRate !== "number" || !Number.isFinite(baseRate)) return DEFAULT_BASE_RATE;
  if (baseRate < 0 || baseRate > 1) return DEFAULT_BASE_RATE;
  return baseRate;
}

function resolveFloor(floor: number | undefined): number {
  if (typeof floor !== "number" || !Number.isFinite(floor)) return DEFAULT_PROBABILITY_FLOOR;
  if (floor <= 0 || floor >= 0.5) return DEFAULT_PROBABILITY_FLOOR;
  return floor;
}

function resolveThreshold(threshold: number | undefined): number {
  if (typeof threshold !== "number" || !Number.isFinite(threshold)) {
    return DEFAULT_INFORMATION_EDGE_THRESHOLD_BITS;
  }
  return threshold;
}

function resolveMinSamples(minSamples: number | undefined): number {
  if (typeof minSamples !== "number" || !Number.isFinite(minSamples)) return 1;
  return Math.max(1, Math.floor(minSamples));
}

function isUsableProbability(p: number): boolean {
  return Number.isFinite(p) && p >= 0 && p <= 1;
}

function isSettled(y: 0 | 1 | undefined): y is 0 | 1 {
  return y === 0 || y === 1;
}

// ============================================================
// Per-prediction edges
// ============================================================

/**
 * PRIOR-ONLY per-pick edge in bits: H(baseRate) − H(p).
 *
 * GAMEABLE. This rises monotonically with confidence and knows nothing about
 * whether the pick was right. Legitimate use: sizing the headroom of a single
 * unsettled pick. Illegitimate use: anything that looks like proving edge.
 *
 * Returns NaN for a `p` outside [0,1] or non-finite. This mirrors the set-level
 * functions, which SKIP such entries — the scalar form cannot skip, so it must
 * refuse. Silently clamping would be actively dangerous here: this platform's
 * native confidence scale is 0–100, and `priorOnlyEdgeBits(65)` under a clamp
 * returns 1.000 — the maximum achievable edge — for what is simply a
 * percent-vs-probability unit mixup.
 */
export function priorOnlyEdgeBits(p: number, options: InformationEdgeOptions = {}): number {
  if (!isUsableProbability(p)) return NaN;
  return binaryEntropyBits(resolveBaseRate(options.baseRate)) - binaryEntropyBits(p);
}

/**
 * REALISED per-pick edge in bits: H(baseRate) − CE(p, y).
 *
 * The honest single-pick quantity. Strongly negative for a confident miss.
 *
 * Returns NaN for a `p` outside [0,1] / non-finite, or a non-binary `y`, for the
 * same reason as `priorOnlyEdgeBits` — and the stakes are higher here, because a
 * clamp makes `realisedEdgeBits(65, 1)` score 0.99999 bits on the basis that is
 * supposed to be ungameable.
 */
export function realisedEdgeBits(
  p: number,
  y: 0 | 1,
  options: InformationEdgeOptions = {},
): number {
  if (!isUsableProbability(p) || !isSettled(y)) return NaN;
  return (
    binaryEntropyBits(resolveBaseRate(options.baseRate)) -
    binaryCrossEntropyBits(p, y, resolveFloor(options.probabilityFloor))
  );
}

// ============================================================
// Set-level information gain
// ============================================================

/**
 * PRIOR-ONLY expected information gain: H(baseRate) − mean_i H(p_i), in bits.
 *
 * GAMEABLE — see the module header. An overconfident model maximises this by
 * emitting probabilities near 0 or 1 regardless of accuracy. Returns 0 for an
 * empty / fully-unusable input (no predictions ⇒ no information delivered).
 */
export function priorOnlyInformationGainBits(
  candidates: readonly EdgeCandidate[],
  options: InformationEdgeOptions = {},
): number {
  const baseRate = resolveBaseRate(options.baseRate);
  let sum = 0;
  let n = 0;
  for (const candidate of candidates) {
    if (!isUsableProbability(candidate.p)) continue;
    sum += binaryEntropyBits(candidate.p);
    n += 1;
  }
  if (n === 0) return 0;
  return binaryEntropyBits(baseRate) - sum / n;
}

/**
 * REALISED (out-of-sample) information gain: H(baseRate) − mean_i CE(p_i, y_i).
 *
 * THE ONE TO GATE ON. Confidence only pays here if it was earned; a confident
 * miss subtracts −log2(probabilityFloor) bits. Returns 0 for an empty /
 * fully-unusable input. Unsettled entries are skipped, so `n` shrinks silently —
 * use `gateInformationEdge` when you need the count back.
 */
export function realisedInformationGainBits(
  samples: readonly EdgeCandidate[],
  options: InformationEdgeOptions = {},
): number {
  const baseRate = resolveBaseRate(options.baseRate);
  const floor = resolveFloor(options.probabilityFloor);
  let sum = 0;
  let n = 0;
  for (const sample of samples) {
    if (!isUsableProbability(sample.p)) continue;
    if (!isSettled(sample.y)) continue;
    sum += binaryCrossEntropyBits(sample.p, sample.y, floor);
    n += 1;
  }
  if (n === 0) return 0;
  return binaryEntropyBits(baseRate) - sum / n;
}

/**
 * Empirical outcome rate over settled samples — pass it as `baseRate` to get the
 * strict mutual-information form H(Y) − H(Y|P) instead of the coin-flip default.
 * Falls back to DEFAULT_BASE_RATE when nothing usable is settled.
 *
 * Applies BOTH filters (usable p AND settled y), exactly like the gain functions.
 * Counting a settled sample whose `p` is unusable would compute H(Y) over a
 * different sample set than the H(Y|P) it is subtracted from, which breaks the
 * mutual-information identity: a book that is exactly uninformative on its usable
 * subset would then score non-zero bits purely because of the entries that were
 * dropped from the other half of the subtraction.
 */
export function empiricalBaseRate(samples: readonly EdgeCandidate[]): number {
  let wins = 0;
  let n = 0;
  for (const sample of samples) {
    if (!isUsableProbability(sample.p)) continue;
    if (!isSettled(sample.y)) continue;
    wins += sample.y;
    n += 1;
  }
  return n === 0 ? DEFAULT_BASE_RATE : wins / n;
}

// ============================================================
// The gate
// ============================================================

/**
 * Selective-publication verdict in bits.
 *
 * Basis selection: "auto" (default) picks "realised" when every usable candidate
 * has settled, otherwise "prior". An explicit basis is honoured — asking for
 * "realised" on unsettled candidates yields n = 0 and ineligibility, which is the
 * correct answer rather than a silent downgrade to the gameable measure.
 *
 * Advisory only. Nothing here writes eligibility or touches a feature flag.
 */
export function gateInformationEdge(
  candidates: readonly EdgeCandidate[],
  options: InformationEdgeOptions = {},
): InformationEdgeVerdict {
  const baseRate = resolveBaseRate(options.baseRate);
  const floor = resolveFloor(options.probabilityFloor);
  const threshold = resolveThreshold(options.thresholdBits);
  const minSamples = resolveMinSamples(options.minSamples);

  const usable: EdgeCandidate[] = [];
  for (const candidate of candidates) {
    if (!isUsableProbability(candidate.p)) continue;
    usable.push(candidate);
  }
  const settled: EdgeCandidate[] = [];
  for (const candidate of usable) {
    if (!isSettled(candidate.y)) continue;
    settled.push(candidate);
  }

  const requested = options.basis ?? "auto";
  const basis: InformationEdgeBasis =
    requested === "prior"
      ? "prior"
      : requested === "realised"
        ? "realised"
        : usable.length > 0 && settled.length === usable.length
          ? "realised"
          : "prior";

  const resolved: InformationEdgeOptions = { baseRate, probabilityFloor: floor };
  const n = basis === "realised" ? settled.length : usable.length;
  const bits =
    basis === "realised"
      ? realisedInformationGainBits(settled, resolved)
      : priorOnlyInformationGainBits(usable, resolved);

  const eligible = n >= minSamples && Number.isFinite(bits) && bits >= threshold;
  const totalBits = Number.isFinite(bits) ? bits * n : NaN;
  const detectable = Number.isFinite(totalBits) && totalBits >= DETECTABILITY_TOTAL_BITS;

  let reason: string;
  if (n === 0) {
    reason =
      basis === "realised"
        ? "No settled predictions (n=0) — realised bits require outcomes. Nothing to gate; ineligible by construction."
        : "No usable predictions (n=0). Nothing to gate; ineligible by construction.";
  } else if (n < minSamples) {
    reason = `n=${n} is below minSamples=${minSamples}. Ineligible regardless of ${bits.toFixed(4)} bits/pick.`;
  } else if (!eligible) {
    reason =
      `${basis} information gain ${bits.toFixed(4)} bits/pick < threshold ${threshold.toFixed(4)} over n=${n}. ` +
      (bits < 0
        ? "NEGATIVE — this slate is worse than the base rate; publishing it destroys information. "
        : "") +
      "Do not publish.";
  } else if (basis === "prior") {
    reason =
      `PRIOR-ONLY gain ${bits.toFixed(4)} bits/pick ≥ ${threshold.toFixed(4)} over n=${n}. ` +
      "This measures CONFIDENCE, not accuracy — an overconfident model clears it by construction. " +
      'NOT evidence of edge; re-gate on basis "realised" once outcomes settle. Shadow only.';
  } else {
    reason =
      `Realised gain ${bits.toFixed(4)} bits/pick ≥ ${threshold.toFixed(4)} over n=${n} (total ${totalBits.toFixed(2)} bits). ` +
      (detectable
        ? `Total clears the ${DETECTABILITY_TOTAL_BITS.toFixed(2)}-bit χ²₁ floor — distinguishable from zero information at ~5%. `
        : `Total is below the ${DETECTABILITY_TOTAL_BITS.toFixed(2)}-bit χ²₁ floor — clears the threshold but is not yet statistically distinguishable from zero. Treat as provisional. `) +
      "Shadow only — advisory, writes no eligibility.";
  }

  return {
    bits,
    threshold,
    eligible,
    n,
    basis,
    baseRate,
    reason,
    priced: false,
    status: "shadow",
  };
}

// ============================================================
// Seeded permutation null band (determinism law: explicit integer seed)
// ============================================================

/** Self-contained mulberry32 — same seed ⇒ identical stream, no global state. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(values: (0 | 1)[], rng: () => number): void {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = values[i];
    const b = values[j];
    if (a === undefined || b === undefined) continue;
    values[i] = b;
    values[j] = a;
  }
}

/**
 * Margin required before `exceedsNull` may be true, in bits. Guards the tied case
 * (identical forecasts or identical outcomes) where observed and null are equal by
 * construction and only float summation order separates them.
 */
const NULL_BAND_TIE_EPSILON_BITS = 1e-12;

export type PermutationNullBandOptions = InformationEdgeOptions & {
  /** Permuted replicas (default 200). */
  readonly permutations?: number;
  /** Integer PRNG seed (default 1). Same seed ⇒ byte-identical output. */
  readonly seed?: number;
};

/**
 * Seeded permutation null band for the REALISED gain.
 *
 * Shuffles outcomes across forecasts, which destroys any p↔y association while
 * preserving both the forecast distribution and the base rate, and recomputes
 * realised bits on each replica. The null is centred on H(baseRate) − mean_i
 * CE(p_i, ȳ) — i.e. on what a book with this exact confidence profile earns when
 * its confidence is aimed at nothing — so `exceedsNull` is a much stronger
 * statement than merely clearing the threshold. That centre is below zero only
 * when `baseRate` is the empirical rate ȳ; see `meanNullBits`.
 *
 * NOTE the degenerate case this correctly refuses to call significant: if every
 * forecast is identical, or every outcome is identical, permutation cannot change
 * the (p, y) multiset, so the null collapses onto the observed value and
 * `exceedsNull` is false. Such a book carries no discrimination to detect.
 *
 * Deterministic: identical `seed` ⇒ identical band. Returns permutations = 0 and
 * NaN band statistics when fewer than two settled samples exist.
 */
export function permutationNullBandBits(
  samples: readonly EdgeCandidate[],
  options: PermutationNullBandOptions = {},
): InformationEdgeNullBand {
  const baseRate = resolveBaseRate(options.baseRate);
  const floor = resolveFloor(options.probabilityFloor);
  const seed = Number.isInteger(options.seed) ? Number(options.seed) : 1;
  const permutations =
    Number.isInteger(options.permutations) && Number(options.permutations) > 0
      ? Number(options.permutations)
      : 200;

  const forecasts: number[] = [];
  const outcomes: (0 | 1)[] = [];
  for (const sample of samples) {
    if (!isUsableProbability(sample.p)) continue;
    if (!isSettled(sample.y)) continue;
    forecasts.push(sample.p);
    outcomes.push(sample.y);
  }
  const n = forecasts.length;
  const observedBits = realisedInformationGainBits(samples, {
    baseRate,
    probabilityFloor: floor,
  });

  if (n < 2) {
    return {
      n,
      permutations: 0,
      seed,
      observedBits,
      meanNullBits: NaN,
      p95NullBits: NaN,
      pValue: NaN,
      exceedsNull: false,
      priced: false,
      status: "shadow",
    };
  }

  const baseEntropy = binaryEntropyBits(baseRate);
  const rng = mulberry32(seed);
  const shuffled: (0 | 1)[] = outcomes.slice();
  const nullBits: number[] = [];

  for (let k = 0; k < permutations; k++) {
    shuffleInPlace(shuffled, rng);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const p = forecasts[i];
      const y = shuffled[i];
      if (p === undefined || y === undefined) continue;
      sum += binaryCrossEntropyBits(p, y, floor);
    }
    nullBits.push(baseEntropy - sum / n);
  }

  let nullSum = 0;
  let atLeastObserved = 0;
  for (const value of nullBits) {
    nullSum += value;
    if (value >= observedBits) atLeastObserved += 1;
  }
  const meanNullBits = nullBits.length === 0 ? NaN : nullSum / nullBits.length;

  const sorted = [...nullBits].sort((x, y) => x - y);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.95 * sorted.length) - 1));
  const p95Candidate = sorted[idx];
  const p95NullBits = p95Candidate === undefined ? NaN : p95Candidate;

  const pValue = (1 + atLeastObserved) / (nullBits.length + 1);
  // Strict margin, not a bare `>`. In the degenerate books noted above the observed
  // value and every replica are ANALYTICALLY equal and differ only by summation
  // order (~1e-16), so a bare `>` would let floating-point noise decide a
  // significance verdict. Real separations are many orders of magnitude larger.
  const exceedsNull =
    Number.isFinite(observedBits) &&
    Number.isFinite(p95NullBits) &&
    observedBits > p95NullBits + NULL_BAND_TIE_EPSILON_BITS;

  return {
    n,
    permutations,
    seed,
    observedBits,
    meanNullBits,
    p95NullBits,
    pValue,
    exceedsNull,
    priced: false,
    status: "shadow",
  };
}

/** Re-export so callers can type their input against the canonical calibration shape. */
export type { CalibrationSample };
