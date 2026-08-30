/**
 * Shin's method for removing bookmaker margin (de-vig).
 *
 * Naive de-vig splits the over-round proportionally. Shin's method instead models
 * a proportion `z` of informed ("insider") money and recovers fair outcome
 * probabilities that correct the favourite–longshot bias proportional de-vig
 * leaves behind — often a sharper fair-value estimate, which sharpens the edge
 * engine's benchmark (edge = independent estimate − market-fair price).
 *
 * Reference: H.S. Shin (1992/1993); cf. mberk/shin, goto_conversion. Pure, no I/O.
 *
 * Input: raw implied probabilities (e.g. 1/decimalOdds) for the mutually-exclusive
 * outcomes of ONE market. Their sum (the "booksum") is > 1 when there is margin.
 * Output: fair probabilities summing to 1, plus the estimated insider share z.
 */

/** Convert decimal odds to raw implied probabilities (1/odds). */
export function impliedFromDecimalOdds(decimalOdds: readonly number[]): number[] {
  return decimalOdds.map((o) => (o > 0 ? 1 / o : 0));
}

export interface ShinResult {
  readonly probabilities: number[];
  /** Estimated insider-trading proportion z in [0, 0.5). */
  readonly z: number;
  /** Booksum (sum of raw implied probs); 1 = a perfectly balanced, margin-free book. */
  readonly booksum: number;
}

function shinProbsForZ(raw: readonly number[], booksum: number, z: number): number[] {
  const denom = 2 * (1 - z);
  return raw.map((pi) => {
    const term = Math.sqrt(z * z + (4 * (1 - z) * (pi * pi)) / booksum);
    return (term - z) / denom;
  });
}

/**
 * De-vig a single market's raw implied probabilities with Shin's method.
 * Solves for z by bisection so the recovered probabilities sum to 1. A balanced
 * book (booksum ≤ 1) is returned unchanged with z = 0.
 */
export function shinDevig(rawImplied: readonly number[]): ShinResult {
  const booksum = rawImplied.reduce((acc, p) => acc + p, 0);

  if (rawImplied.length === 0 || booksum <= 0) {
    return { probabilities: rawImplied.map(() => 0), z: 0, booksum: round6(Math.max(0, booksum)) };
  }
  if (booksum <= 1 + 1e-9) {
    return { probabilities: rawImplied.map(round6), z: 0, booksum: round6(booksum) };
  }

  // At z=0 the recovered sum is sqrt(booksum) > 1; it falls below 1 as z rises.
  let lo = 0;
  let hi = 0.5;
  let z = 0;
  for (let i = 0; i < 80; i++) {
    z = (lo + hi) / 2;
    const sum = shinProbsForZ(rawImplied, booksum, z).reduce((acc, p) => acc + p, 0);
    if (sum > 1) lo = z;
    else hi = z;
  }

  const probs = shinProbsForZ(rawImplied, booksum, z);
  const total = probs.reduce((acc, p) => acc + p, 0);
  const normalized = total > 0 ? probs.map((p) => p / total) : probs;

  return {
    probabilities: normalized.map(round6),
    z: round6(z),
    booksum: round6(booksum),
  };
}

/**
 * goto_conversion — de-vig by reducing each implied probability by an EQUAL number
 * of standard-error units until they sum to 1. A fast closed-form alternative to
 * Shin that also corrects favourite–longshot bias. Reference: gotoConversion/goto_conversion.
 */
export function gotoConversion(rawImplied: readonly number[]): number[] {
  const booksum = rawImplied.reduce((a, b) => a + b, 0);
  if (rawImplied.length === 0 || booksum <= 0) return rawImplied.map(() => 0);
  if (booksum <= 1 + 1e-9) return rawImplied.map(round6);
  const se = rawImplied.map((p) => Math.sqrt(Math.max(0, p - p * p)));
  const seSum = se.reduce((a, b) => a + b, 0);
  if (seSum <= 0) return rawImplied.map((p) => round6(p / booksum));
  const k = (booksum - 1) / seSum;
  const fair = rawImplied.map((p, i) => Math.max(0, p - k * (se[i] ?? 0)));
  const total = fair.reduce((a, b) => a + b, 0);
  const normalized = total > 0 ? fair.map((p) => p / total) : fair;
  return normalized.map(round6);
}

export interface PowerDevigResult {
  readonly probabilities: number[];
  /**
   * Power k such that Σ p_i^k = 1. Overround books need k > 1 (longshots
   * shrink faster than favourites). Underround books need 0 < k < 1.
   */
  readonly k: number;
  readonly booksum: number;
}

/**
 * Power de-vig: find k > 0 with Σ p_i^k = 1, then renormalise.
 *
 * This is the vendor "POWER" method (SharpAPI documents it as their default).
 * GSE owns a first-party implementation so a paid SharpAPI key is not required
 * to *compare* power vs Shin vs multiplicative — see Hegarty & Whelan 2025:
 * multiplicative invents longshot value; power and Shin do not in the same way.
 *
 * Balanced books (booksum ≤ 1 + ε and ≥ 1 − ε) return k = 1 unchanged.
 * Degenerate / empty input returns zeros. Pure, no I/O.
 */
export function powerDevig(rawImplied: readonly number[]): PowerDevigResult {
  const booksum = rawImplied.reduce((acc, p) => acc + p, 0);
  if (rawImplied.length === 0 || booksum <= 0 || rawImplied.some((p) => !Number.isFinite(p) || p < 0)) {
    return { probabilities: rawImplied.map(() => 0), k: 0, booksum: round6(Math.max(0, booksum)) };
  }
  if (Math.abs(booksum - 1) <= 1e-9) {
    return { probabilities: rawImplied.map(round6), k: 1, booksum: round6(booksum) };
  }

  const positives = rawImplied.map((p) => Math.max(0, p));
  const powerSum = (k: number): number =>
    positives.reduce((acc, p) => acc + (p === 0 ? 0 : p ** k), 0);

  // Σ p^k is decreasing in k for p ∈ (0, 1). Bracket a root of Σ p^k − 1 = 0.
  let lo = 1e-6;
  let hi = 32;
  if (booksum > 1) {
    lo = 1;
    while (powerSum(hi) > 1 && hi < 256) hi *= 2;
  } else {
    hi = 1;
    while (powerSum(lo) < 1 && lo > 1e-8) lo /= 2;
  }

  let k = 1;
  for (let i = 0; i < 80; i++) {
    k = (lo + hi) / 2;
    if (powerSum(k) > 1) lo = k;
    else hi = k;
  }

  const powered = positives.map((p) => (p === 0 ? 0 : p ** k));
  const total = powered.reduce((a, b) => a + b, 0);
  const normalized = total > 0 ? powered.map((p) => p / total) : powered;
  return {
    probabilities: normalized.map(round6),
    k: round6(k),
    booksum: round6(booksum),
  };
}

function round6(x: number): number {
  return Number(x.toFixed(6));
}
