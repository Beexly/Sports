// @ts-nocheck
/**
 * arXiv 1908.08980v1: Evaluating probabilistic forecasts of football matches: The case against the Ranked Probability Score.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Mean ignorance (log2) as the engine-variant selection metric: report Delta in bits and 2^Delta as the mean probability-on-the-outcome multiplier. Ship a challenger only if mean relative ignorance >= 0.05 bits with the 95% resampling interval of the pairwise difference excluding zero.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Replace/augment GSE's engine-variant selection metric with mean ignorance (log2) on held-out games: report Delta = mean(IGN_B - IGN_A) in bits and 2^Delta as the mean probability-on-outcome multiplier in model cards and versioning decisions.
 *
 * ACCEPTANCE GATE:
 * 0.05 bits -- adopt the ignorance score as GSE's primary engine-variant selection metric, and ship a challenger variant over the incumbent, only if the challenger achieves mean relative ignorance >= 0.05 bits (2^0.05 ~= 1.035x mean probability placed on the outcome) on held-out games with the 95% resampling interval of the pairwise difference excluding zero.
 *
 * No ENABLED flag: pure scoring metric used in offline model cards and versioning decisions.
 */


const EPS = 1e-12;

function clip(p: number): number {
  return Math.min(Math.max(p, EPS), 1 - EPS);
}

/** Per-game ignorance (log2 loss) of a probability forecast. */
export function ignorancePerGame(p: number, y: number): number {
  const q = clip(p);
  return -(y * Math.log2(q) + (1 - y) * Math.log2(1 - q));
}

/** Mean ignorance of a forecast set, in bits. Lower is better. */
export function meanIgnorance(probs: readonly number[], ys: readonly number[]): number {
  const n = probs.length;
  if (n === 0) return NaN;
  return probs.reduce((a, p, i) => a + ignorancePerGame(p, ys[i]), 0) / n;
}

/**
 * Mean relative ignorance (challenger vs incumbent) in bits:
 * Delta = mean(IGN_incumbent - IGN_challenger). Positive means the challenger
 * places more probability on the realized outcomes.
 */
export function relativeIgnoranceBits(
  probsIncumbent: readonly number[],
  probsChallenger: readonly number[],
  ys: readonly number[],
): number {
  return meanIgnorance(probsIncumbent, ys) - meanIgnorance(probsChallenger, ys);
}

/** Mean probability-on-the-outcome multiplier: 2^Delta. */
export function probabilityMultiplier(deltaBits: number): number {
  return Math.pow(2, deltaBits);
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 95% percentile resampling interval of the pairwise per-game ignorance
 * differences (incumbent - challenger). Excludes zero => significant.
 */
export function resamplingInterval(
  perGameDiff: readonly number[],
  nBoot = 2000,
  seed = 7,
): { lo: number; hi: number } {
  const rand = mulberry(seed);
  const n = perGameDiff.length;
  const means: number[] = [];
  for (let b = 0; b < nBoot; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += perGameDiff[Math.floor(rand() * n)];
    means.push(s / n);
  }
  means.sort((a, b2) => a - b2);
  return {
    lo: means[Math.floor(0.025 * nBoot)],
    hi: means[Math.ceil(0.975 * nBoot) - 1],
  };
}

/**
 * Adoption gate: mean relative ignorance >= 0.05 bits AND the 95% resampling
 * interval of the pairwise difference excludes zero.
 */
export function meetsAdoptionGate(
  probsIncumbent: readonly number[],
  probsChallenger: readonly number[],
  ys: readonly number[],
): { deltaBits: number; multiplier: number; lo: number; hi: number; adopt: boolean } {
  const deltaBits = relativeIgnoranceBits(probsIncumbent, probsChallenger, ys);
  const diff = probsIncumbent.map((p, i) => ignorancePerGame(p, ys[i]) - ignorancePerGame(probsChallenger[i], ys[i]));
  const { lo, hi } = resamplingInterval(diff);
  const adopt = deltaBits >= 0.05 && (lo > 0 || hi < 0);
  return { deltaBits, multiplier: probabilityMultiplier(deltaBits), lo, hi, adopt };
}
