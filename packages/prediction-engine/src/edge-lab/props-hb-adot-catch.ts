/**
 * Catch rate stratified by aDOT, not one Beta over all targets.
 *
 * A 2-yard screen and an 18-yard go-route are not the same catch process.
 * Pooled catch|targets (#519) lets deep drops rewrite short-area reliability
 * and vice versa. nflverse already has air yards per target (aDOT).
 *
 * Closed-form, no MCMC, no market field:
 *   1. Bucket each (receptions, targets, airYards) row by aDOT = air/targets.
 *      short < 5, intermediate 5–15, deep > 15 (yards).
 *   2. Fit a Beta catch prior per bucket that has extra-binomial dispersion.
 *      Empty / Poisson-like buckets stay unused — do not invent φ.
 *   3. Next-game mix: P(rec > line) = Σ_b w_b P_BB(rec > line | n_b)
 *      where w_b is the player's historical target share in that bucket
 *      and n_b = round(targets * w_b). ZIP: targets=0 ⇒ 0.
 *
 * Independent p only. Do not put the book's receptions line into the prior.
 * Pure, deterministic, no I/O.
 */

import {
  fitCatchPrior,
  posteriorCatch,
  betaBinomialProbOver,
  type BetaPosterior,
  type BetaPrior,
  type CatchSample,
} from "./props-hb-catch.js";

export const ADOT_CATCH_METHOD_TAG = "props_hb_adot_catch_v1" as const;

export type AdotBucket = "short" | "intermediate" | "deep";

export const SHORT_ADOT_MAX = 5;
export const INTERMEDIATE_ADOT_MAX = 15;

export type AdotCatchSample = CatchSample & {
  readonly airYards: number;
};

export type BucketedCatchFit = {
  readonly bucket: AdotBucket;
  readonly prior: BetaPrior;
  readonly targetShare: number;
};

function assertSample(s: AdotCatchSample): void {
  if (!Number.isFinite(s.targets) || !Number.isFinite(s.receptions) || !Number.isFinite(s.airYards)) {
    throw new RangeError(
      `adot-catch sample must be finite (got t=${s.targets}, r=${s.receptions}, air=${s.airYards})`,
    );
  }
  if (s.targets <= 0) {
    throw new RangeError(`adot-catch targets must be > 0 (got ${s.targets})`);
  }
  if (s.receptions < 0 || s.receptions > s.targets) {
    throw new RangeError(`receptions must be in [0, targets]`);
  }
  if (s.airYards < 0) {
    throw new RangeError(`airYards must be ≥ 0 (got ${s.airYards})`);
  }
}

export function adotOf(s: AdotCatchSample): number {
  assertSample(s);
  return s.airYards / s.targets;
}

export function bucketAdot(adot: number): AdotBucket {
  if (!Number.isFinite(adot) || adot < 0) {
    throw new RangeError(`bucketAdot: adot must be finite and ≥ 0 (got ${adot})`);
  }
  if (adot < SHORT_ADOT_MAX) return "short";
  if (adot <= INTERMEDIATE_ADOT_MAX) return "intermediate";
  return "deep";
}

/**
 * Per-bucket Beta priors + historical target shares. Buckets with no
 * extra-binomial dispersion are dropped (honest — use the pooled catch
 * model for those, do not invent concentration).
 */
export function fitAdotCatchPriors(samples: readonly AdotCatchSample[]): BucketedCatchFit[] {
  if (samples.length === 0) return [];
  for (const s of samples) assertSample(s);

  const buckets: Record<AdotBucket, AdotCatchSample[]> = {
    short: [],
    intermediate: [],
    deep: [],
  };
  let totalTargets = 0;
  for (const s of samples) {
    buckets[bucketAdot(adotOf(s))].push(s);
    totalTargets += s.targets;
  }
  if (!(totalTargets > 0)) return [];

  const out: BucketedCatchFit[] = [];
  for (const bucket of ["short", "intermediate", "deep"] as const) {
    const rows = buckets[bucket];
    if (rows.length === 0) continue;
    const prior = fitCatchPrior(rows);
    if (!prior) continue;
    const share = rows.reduce((acc, s) => acc + s.targets, 0) / totalTargets;
    out.push({ bucket, prior, targetShare: share });
  }
  return out;
}

export function posteriorAdotCatch(
  fits: readonly BucketedCatchFit[],
  samples: readonly AdotCatchSample[],
): Array<{ bucket: AdotBucket; post: BetaPosterior; targetShare: number }> {
  const byBucket: Record<AdotBucket, CatchSample[]> = {
    short: [],
    intermediate: [],
    deep: [],
  };
  for (const s of samples) {
    assertSample(s);
    byBucket[bucketAdot(adotOf(s))].push(s);
  }
  return fits.map((f) => {
    const rows = byBucket[f.bucket];
    const rec = rows.reduce((a, s) => a + s.receptions, 0);
    const tgt = rows.reduce((a, s) => a + s.targets, 0);
    return { bucket: f.bucket, post: posteriorCatch(f.prior, rec, tgt), targetShare: f.targetShare };
  });
}

/**
 * Mix bucket Beta-Binomials over a next-game target count. targets=0 ⇒ 0
 * (ZIP hurdle). Integer targets split by historical share, remainder to
 * the largest share so Σ n_b = targets.
 */
export function probOverReceptionsByAdot(
  posts: readonly { post: BetaPosterior; targetShare: number }[],
  targets: number,
  line: number,
): number {
  if (!Number.isFinite(targets) || targets < 0) {
    throw new RangeError(`probOverReceptionsByAdot: targets must be finite and ≥ 0 (got ${targets})`);
  }
  if (!Number.isFinite(line)) {
    throw new RangeError(`probOverReceptionsByAdot: line must be finite (got ${line})`);
  }
  if (line < 0) return 1;
  if (targets === 0 || posts.length === 0) return 0;

  const raw = posts.map((p) => Math.max(0, p.targetShare));
  const sum = raw.reduce((a, x) => a + x, 0);
  if (!(sum > 0)) return 0;
  const weights = raw.map((x) => x / sum);

  const ns = weights.map((w) => Math.floor(targets * w));
  let used = ns.reduce((a, n) => a + n, 0);
  while (used < targets) {
    let best = 0;
    for (let i = 1; i < weights.length; i++) {
      if (weights[i]! > weights[best]!) best = i;
    }
    ns[best]! += 1;
    used += 1;
  }

  return convolveBucketSurvival(posts, ns, line);
}

function betaBinomialPmfLocal(k: number, n: number, post: BetaPosterior): number {
  if (k < 0 || k > n) return 0;
  const left = betaBinomialProbOver(post, k - 0.5, n);
  const right = betaBinomialProbOver(post, k + 0.5, n);
  return Math.max(0, left - right);
}

function convolveBucketSurvival(
  posts: readonly { post: BetaPosterior }[],
  ns: readonly number[],
  line: number,
): number {
  let dist = [1];
  for (let i = 0; i < posts.length; i++) {
    const n = ns[i]!;
    if (n <= 0) continue;
    const next: number[] = new Array(dist.length + n).fill(0);
    for (let a = 0; a < dist.length; a++) {
      if (dist[a] === 0) continue;
      for (let k = 0; k <= n; k++) {
        next[a + k]! += dist[a]! * betaBinomialPmfLocal(k, n, posts[i]!.post);
      }
    }
    dist = next;
  }
  const cap = Math.floor(line);
  let cdf = 0;
  for (let k = 0; k <= cap && k < dist.length; k++) cdf += dist[k]!;
  return Math.max(0, Math.min(1, 1 - cdf));
}
