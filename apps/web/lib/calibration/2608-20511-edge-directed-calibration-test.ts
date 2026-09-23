/**
 * arXiv 2608.20511: EDGE: a closed-form directed test for the calibration of probabilistic binary classifiers.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: EDGE: closed-form directed test for binary-classifier calibration (Algorithm 1). Weekly QC job over season-to-date published moneyline probabilities and outcomes: smooth monotone miscalibration triggers a recalibration map; rough misfit triggers a feature revisit.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Port the EDGE directed calibration test (Algorithm 1) into the GSE engine and run it as a weekly QC job over season-to-date published moneyline probabilities and outcomes, so smooth monotone miscalibration triggers a recalibration map and rough misfit triggers a feature revisit.
 *
 * ACCEPTANCE GATE:
 * ADOPT into the weekly QC pipeline if the distorted-copy test rejects at p<0.05 AND the directed test fires on the real engine at least once on a known-bad historical window; REJECT the port if it cannot distinguish the distorted copy from the original at 5% on >=500 games.
 *
 * ENABLED=false: the weekly QC auto-trigger is off; the test itself is a pure function usable offline.
 */


export const ENABLED = false;

export interface EdgeResult {
  /** Directed test statistic (max weighted cumulative residual). */
  readonly statistic: number;
  /** Permutation p-value. */
  readonly pValue: number;
  /** Fires when p < 0.05. */
  readonly fires: boolean;
}

function mulberryLocal(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * EDGE directed statistic given a precomputed probability ordering.
 * Sort by forecast p; C(k) = sum_{i<=k} (y_i - p_i); statistic = max_k |C(k)| / sqrt(n).
 * Monotone (smooth) miscalibration makes the partial sums drift; rough misfit cancels.
 */
export function edgeStatisticOrdered(
  probs: readonly number[],
  ys: readonly number[],
  order: readonly number[],
): number {
  const n = probs.length;
  if (n === 0) return 0;
  let cum = 0;
  let maxAbs = 0;
  for (const i of order) {
    cum += ys[i]! - probs[i]!;
    const a = Math.abs(cum);
    if (a > maxAbs) maxAbs = a;
  }
  return maxAbs / Math.sqrt(n);
}

/** Probability ordering used by the directed statistic (ascending forecast). */
export function probOrder(probs: readonly number[]): number[] {
  return probs.map((_, i) => i).sort((a, b) => probs[a]! - probs[b]!);
}

/**
 * EDGE directed statistic: sort by forecast p; compute the cumulative residual
 * process C(k) = sum_{i<=k} (y_i - p_i) weighted toward monotone miscalibration;
 * statistic = max_k |C(k)| / sqrt(n). Monotone (smooth) miscalibration makes the
 * partial sums drift; rough misfit cancels.
 */
export function edgeStatistic(
  probs: readonly number[],
  ys: readonly number[],
): number {
  return edgeStatisticOrdered(probs, ys, probOrder(probs));
}

/**
 * EDGE directed test with a parametric-bootstrap p-value (B redraws).
 * H0: calibrated, i.e. y_i ~ Bernoulli(p_i) independently. Each bootstrap
 * redraws outcomes from the forecasts themselves, so the null distribution is
 * exact for the observed probability profile.
 */
export function edgeTest(
  probs: readonly number[],
  ys: readonly number[],
  nPerm = 500,
  seed = 2026,
  alpha = 0.05,
): EdgeResult {
  const order = probOrder(probs);
  const stat = edgeStatisticOrdered(probs, ys, order);
  const rand = mulberryLocal(seed);
  let exceed = 0;
  for (let b = 0; b < nPerm; b++) {
    const yStar = probs.map((p) => (rand() < p ? 1 : 0));
    const s = edgeStatisticOrdered(probs, yStar, order);
    if (s >= stat) exceed++;
  }
  const pValue = (exceed + 1) / (nPerm + 1);
  return { statistic: stat, pValue, fires: pValue < alpha };
}

/** Distorted copy: apply a smooth monotone distortion (squared) to the probs. */
export function distortedCopy(probs: readonly number[]): number[] {
  return probs.map((p) => p * p);
}

/**
 * Weekly QC runner: returns the directed test result plus a triage recommendation
 * (smooth monotone miscalibration -> recalibration map; rough misfit -> feature revisit).
 */
export function weeklyQCRun(
  probs: readonly number[],
  ys: readonly number[],
): EdgeResult & { triage: "recalibrate-map" | "feature-revisit" | "pass" } {
  const res = edgeTest(probs, ys);
  if (!res.fires) return { ...res, triage: "pass" };
  // Direction check: monotone residual drift -> recalibration map.
  const n = probs.length;
  const order = probs.map((_, i) => i).sort((a, b) => probs[a]! - probs[b]!);
  const resids = order.map((i) => ys[i]! - probs[i]!);
  const first = resids.slice(0, Math.floor(n / 2)).reduce((a, b) => a + b, 0);
  const second = resids.slice(Math.floor(n / 2)).reduce((a, b) => a + b, 0);
  const monotone = Math.sign(first) !== Math.sign(second) && Math.abs(first) + Math.abs(second) > 0;
  return { ...res, triage: monotone ? "recalibrate-map" : "feature-revisit" };
}
