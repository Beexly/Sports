/**
 * SLOT `bh-fdr` + `ess` — the mining engine's statistical spine.
 *
 * Two functions live here because they answer the two questions that decide
 * whether a "discovered" edge is real:
 *
 *   1. `benjaminiHochberg` — of the many hypotheses in a pre-registered grid,
 *      which survive multiplicity control at a stated false-discovery rate?
 *   2. `effectiveSampleSize` — how much INDEPENDENT evidence do the surviving
 *      rows actually carry, once clustering (many rows from one player-season)
 *      is accounted for?
 *
 * ── 1. BENJAMINI–HOCHBERG (1995) STEP-UP ────────────────────────────────────
 *
 * Order the m p-values p_(1) <= … <= p_(m). The step-up rule finds
 *
 *     k = max { i : p_(i) <= alpha · i / m }
 *
 * and rejects H_(1) … H_(k) (nothing if no such i exists). Under independence
 * or PRDS this controls FDR at alpha · m0/m <= alpha.
 *
 * The adjusted q-values are the cumulative minimum taken from the LARGEST rank
 * downward:
 *
 *     q_(m) = min( 1, p_(m) · m / m )
 *     q_(i) = min( q_(i+1), p_(i) · m / i ),   clamped to <= 1
 *
 * The clamp to 1 is not cosmetic and is not a silent coercion: p_(i)·m/i is an
 * estimated false-discovery RATE, and a rate above 1 is meaningless — the
 * standard definition of the BH-adjusted p-value is min(1, ·). It is applied
 * only at the output, and because min-with-a-constant commutes with the running
 * minimum, clamping the output is identical to clamping every raw term.
 *
 * Two properties fall out of the step-down cumulative minimum and are asserted
 * in the tests rather than assumed:
 *   - q_(i) >= p_(i) always (every term in the minimum over j >= i satisfies
 *     p_(j)·m/j >= p_(i)·1);
 *   - { i : q_(i) <= alpha } is exactly { 1 … k }, so the q-value ordering and
 *     the step-up decision never disagree.
 * Tied p-values therefore receive identical q-values automatically (for
 * p_(i) = p_(i+1) the term at rank i is the larger of the two, so the running
 * minimum simply carries through).
 *
 * ALIGNMENT: `qValues` and `rejected` are returned in INPUT order. The ranking
 * is done over an index permutation and every write is indexed by the original
 * position — returning sorted-order output is the classic BH bug and the test
 * suite pins it with a deliberately unsorted input.
 *
 * FAIL-CLOSED: empty input throws EMPTY (BH over an empty grid is a caller bug —
 * a pre-registered grid always has at least one hypothesis, and silently
 * returning an empty result would let a mis-wired filter look like "nothing to
 * correct"). Non-finite alpha or p-value throws NOT_FINITE; alpha outside (0,1]
 * or a p-value outside [0,1] throws DOMAIN.
 *
 * ── 2. CLUSTER-ADJUSTED EFFECTIVE SAMPLE SIZE ───────────────────────────────
 *
 *     ess = n / (1 + (m̄ − 1) · ρ),      designEffect = n / ess
 *
 * with m̄ = n / k the mean cluster size and ρ the one-way ANOVA (unbalanced)
 * intraclass correlation over k clusters:
 *
 *     MSB = Σ_i n_i (ȳ_i − ȳ)² / (k − 1)
 *     MSW = Σ_i Σ_j (y_ij − ȳ_i)² / (n − k)
 *     m0  = ( n − Σ_i n_i² / n ) / (k − 1)          [unbalanced-design correction]
 *     ρ   = (MSB − MSW) / (MSB + (m0 − 1) · MSW),   clamped to [0, 1]
 *
 * The clamp is mandated by the contract: the ANOVA estimator is unbiased and so
 * takes negative values when the true ICC is near zero, and ρ < 0 would inflate
 * ess ABOVE n — i.e. claim more independent information than rows exist. ρ > 1
 * is likewise outside the parameter space. Clamping is the conservative,
 * fail-closed choice; the raw estimate is not exposed because no caller of a
 * minimum-sample gate should be able to use a negative one.
 *
 * DEGENERATE CASES (explicit policy, not accident):
 *   - k = 1 (a single cluster): between-cluster variation is unidentifiable —
 *     MSB has zero degrees of freedom. Policy: ρ = 1, giving
 *     ess = n / (1 + (n − 1)) = 1 and designEffect = n. One cluster supplies at
 *     most one independent unit; assuming independence here is exactly the error
 *     this function exists to prevent.
 *   - n = k (every cluster a singleton): MSW has zero degrees of freedom, but
 *     m̄ = 1 so (m̄ − 1) · ρ = 0 for any ρ and ess = n exactly. Policy: report
 *     ρ = 0 implicitly, ess = n, designEffect = 1. This is the genuinely
 *     independent case, not an approximation.
 *   - zero total variance (MSB = MSW = 0, every value identical): the ratio is
 *     0/0 and ρ is undefined — the limit is 1 approaching along MSW → 0 and 0
 *     approaching along MSB → 0. Policy: ρ = 1 (conservative; matches the
 *     MSW = 0 branch, where identical values within clusters do mean k
 *     independent units).
 *   - MSB = 0 with MSW > 0 and m0 = 1: the estimate is strictly negative, so the
 *     clamp applies and ρ = 0.
 *
 * Because ρ ∈ [0, 1] and m̄ >= 1, the denominator lies in [1, m̄] and therefore
 * ess ∈ [k, n] ⊂ (0, n] for every admissible input, as the contract requires.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  assertProbability,
  assertSameLength,
  type BenjaminiHochbergFn,
  type EffectiveSampleSize,
  type EffectiveSampleSizeFn,
  type FdrResult,
} from "../contract.js";

// ─────────────────────────────────────────────────────────────────────────────
// Benjamini–Hochberg
// ─────────────────────────────────────────────────────────────────────────────

export const benjaminiHochberg: BenjaminiHochbergFn = (pValues, alpha): FdrResult => {
  assertNonEmpty(pValues, "pValues");
  assertFinite(alpha, "alpha");
  if (alpha <= 0 || alpha > 1) {
    throw new KernelError("DOMAIN", `alpha must be in (0,1], received ${alpha}`);
  }

  const m = pValues.length;
  for (let i = 0; i < m; i += 1) {
    assertProbability(pValues[i] as number, `pValues[${i}]`);
  }

  // Rank by p-value; ties broken by input index so the permutation is stable
  // and the result is deterministic (the q-values of tied p-values coincide
  // regardless, see the header).
  const order: number[] = new Array<number>(m);
  for (let i = 0; i < m; i += 1) order[i] = i;
  order.sort((a, b) => {
    const pa = pValues[a] as number;
    const pb = pValues[b] as number;
    return pa === pb ? a - b : pa - pb;
  });

  // q-values: cumulative minimum of p_(i) · m / i walking from rank m down to 1,
  // written back at the ORIGINAL index.
  const qValues: number[] = new Array<number>(m);
  let running = Number.POSITIVE_INFINITY;
  for (let rank = m; rank >= 1; rank -= 1) {
    const idx = order[rank - 1] as number;
    const raw = ((pValues[idx] as number) * m) / rank;
    if (raw < running) running = raw;
    qValues[idx] = running < 1 ? running : 1;
  }

  // Step-up threshold: the largest rank whose p-value clears the BH line.
  let cut = 0;
  for (let rank = m; rank >= 1; rank -= 1) {
    const idx = order[rank - 1] as number;
    if ((pValues[idx] as number) <= (alpha * rank) / m) {
      cut = rank;
      break;
    }
  }

  const rejected: boolean[] = new Array<boolean>(m).fill(false);
  let threshold = 0;
  for (let rank = 1; rank <= cut; rank += 1) {
    const idx = order[rank - 1] as number;
    rejected[idx] = true;
    const p = pValues[idx] as number;
    if (p > threshold) threshold = p;
  }

  return { qValues, rejected, threshold };
};

// ─────────────────────────────────────────────────────────────────────────────
// Cluster-adjusted effective sample size
// ─────────────────────────────────────────────────────────────────────────────

/** Distinct key per cluster id that never collides across the number/string union. */
function clusterKey(id: string | number, label: string): string {
  if (typeof id === "number") {
    assertFinite(id, label);
    return `n:${id}`;
  }
  return `s:${id}`;
}

export const effectiveSampleSize: EffectiveSampleSizeFn = (
  values,
  clusterIds,
): EffectiveSampleSize => {
  assertSameLength(values, clusterIds, "values", "clusterIds");
  assertNonEmpty(values, "values");

  const n = values.length;

  // Pass 1 — group, count, and sum. Cluster means are formed from sums rather
  // than from sums of squares so the within-cluster sum of squares can be taken
  // in a numerically stable second pass.
  const keyToCluster = new Map<string, number>();
  const counts: number[] = [];
  const sums: number[] = [];
  const clusterOf: number[] = new Array<number>(n);
  let grandSum = 0;

  for (let i = 0; i < n; i += 1) {
    const v = values[i] as number;
    assertFinite(v, `values[${i}]`);
    const key = clusterKey(clusterIds[i] as string | number, `clusterIds[${i}]`);
    let c = keyToCluster.get(key);
    if (c === undefined) {
      c = counts.length;
      keyToCluster.set(key, c);
      counts.push(0);
      sums.push(0);
    }
    clusterOf[i] = c;
    counts[c] = (counts[c] as number) + 1;
    sums[c] = (sums[c] as number) + v;
    grandSum += v;
  }

  const k = counts.length;
  const mBar = n / k;
  const grandMean = grandSum / n;

  let rho: number;
  if (k === 1) {
    // Single cluster: ICC unidentifiable. Conservative policy (see header).
    rho = 1;
  } else if (n === k) {
    // All singleton clusters: (m̄ − 1) = 0, so ρ cannot affect ess. Report the
    // independent case exactly.
    rho = 0;
  } else {
    const means: number[] = new Array<number>(k);
    let ssBetween = 0;
    let sumSqSizes = 0;
    for (let c = 0; c < k; c += 1) {
      const nc = counts[c] as number;
      const mean = (sums[c] as number) / nc;
      means[c] = mean;
      const d = mean - grandMean;
      ssBetween += nc * d * d;
      sumSqSizes += nc * nc;
    }

    let ssWithin = 0;
    for (let i = 0; i < n; i += 1) {
      const d = (values[i] as number) - (means[clusterOf[i] as number] as number);
      ssWithin += d * d;
    }

    const msb = ssBetween / (k - 1);
    const msw = ssWithin / (n - k);
    const m0 = (n - sumSqSizes / n) / (k - 1);
    const denominator = msb + (m0 - 1) * msw;

    if (denominator > 0) {
      const raw = (msb - msw) / denominator;
      // Contract-mandated clamp to the parameter space [0, 1]; see header for
      // why a negative ANOVA estimate must not be passed through.
      rho = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    } else if (msw > 0) {
      // denominator = 0 with msw > 0 forces msb = 0 and m0 = 1, so the raw
      // estimate is −msw / 0⁻ → negative; the clamp gives 0.
      rho = 0;
    } else {
      // msb = msw = 0: no variance anywhere, ρ undefined. Conservative limit.
      rho = 1;
    }
  }

  const ess = n / (1 + (mBar - 1) * rho);

  // Defensive: unreachable for admissible input because ρ ∈ [0,1] and m̄ >= 1
  // bound the denominator in [1, m̄]. Kept so a future edit cannot leak an
  // out-of-range ess into a minimum-sample gate.
  if (!Number.isFinite(ess) || ess <= 0 || ess > n) {
    throw new KernelError("DOMAIN", `ess must lie in (0, ${n}], computed ${ess}`);
  }

  return { ess, designEffect: n / ess };
};
