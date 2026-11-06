/**
 * SLOT `ess` — CLUSTER-ADJUSTED EFFECTIVE SAMPLE SIZE.
 *
 * ── WHY THIS SLOT EXISTS ─────────────────────────────────────────────────────
 *
 * The mining engine's minimum-sample gate asks exactly one question: "is there
 * enough INDEPENDENT evidence behind this cell to let it fire?" `rows.length`
 * answers a different question — how many rows there are — and on football data
 * the two answers diverge badly. Forty rows drawn from one receiver's one season
 * are close to one observation repeated forty times: the same offence, the same
 * quarterback, the same route tree, the same coordinator, the same pace. Every
 * variance, every standard error, and every p-value computed as though those
 * forty rows were forty draws is understated by the design effect, which on real
 * player-season panels routinely lands between 3x and 5x. A gate that trusts
 * `rows.length` there is not making an approximation; it is systematically
 * promoting noise, and it will do so most enthusiastically for exactly the
 * narrow, single-player cells that look most like an "edge".
 *
 * ── WHAT IT COMPUTES ─────────────────────────────────────────────────────────
 *
 *     ess = n / (1 + (m̄ − 1) · ρ)          designEffect = n / ess
 *
 * with n the row count, k the number of distinct clusters, m̄ = n / k the mean
 * cluster size, and ρ the intraclass correlation.
 *
 * The denominator is Kish's design effect. Under the exchangeable within-cluster
 * correlation model (every pair of rows in a cluster correlated ρ, rows in
 * different clusters independent), the variance of the overall mean is inflated
 * by exactly 1 + (m̄ − 1)·ρ relative to the i.i.d. case. `ess` is therefore the
 * number of genuinely independent observations whose mean would carry the same
 * variance — an information-equivalent count, which is precisely what a sample
 * gate needs and what a row count is not.
 *
 * ρ is estimated by the ONE-WAY ANOVA (unbalanced) estimator over the k clusters:
 *
 *     MSB = Σ_i m_i (ȳ_i − ȳ)² / (k − 1)
 *     MSW = Σ_i Σ_j (y_ij − ȳ_i)² / (n − k)
 *     m₀  = ( n − Σ_i m_i² / n ) / (k − 1)
 *     ρ   = (MSB − MSW) / (MSB + (m₀ − 1) · MSW),   clamped to [0, 1]
 *
 * ── m₀ IS NOT m̄, AND THE DIFFERENCE IS A ONE-DIRECTIONAL BIAS ────────────────
 *
 * The single most common way to get this function wrong is to substitute the
 * mean cluster size m̄ for m₀ in the ICC denominator. They coincide only when
 * the design is balanced, and the error is not symmetric:
 *
 *   - Cauchy–Schwarz gives Σ_i m_i² >= n²/k with equality iff every m_i is
 *     equal, hence
 *         m₀ <= (n − n/k) / (k − 1) = n/k = m̄,
 *     strictly whenever the cluster sizes differ.
 *   - A smaller m₀ shrinks the ICC denominator, so the CORRECT m₀ yields a
 *     LARGER ρ̂ than the naive m̄ substitution, which in turn yields a SMALLER
 *     ess.
 *
 * So the naive estimator always errs in the one direction a minimum-sample gate
 * cannot tolerate: it reports more independent evidence than the data carry, and
 * it does so silently, most severely on the most lopsided panels (one starter
 * with 200 snaps plus a tail of one-game backups). On the 10/1/1 panel pinned in
 * the tests, m₀ = 1.75 against m̄ = 4, and the naive answer overstates ess by
 * 2.4%; on wider panels the gap grows. This is the exact class of silent bias
 * the kernel exists to prevent, so the correction is mandatory, not optional.
 *
 * The same inequality argument also bounds m₀ from below. Writing
 * n² − Σ_i m_i² = Σ_i m_i (n − m_i) and noting n − m_i >= k − 1 (the other k − 1
 * clusters hold at least one row each) gives n² − Σ_i m_i² >= n(k − 1), i.e.
 * m₀ >= 1, with equality only when every cluster is a singleton. For n > k we
 * therefore have m₀ > 1 STRICTLY, which is what guarantees the ICC denominator
 * MSB + (m₀ − 1)·MSW is strictly positive unless the data have no variance at
 * all.
 *
 * ── WHY CLAMPING ρ TO [0, 1] IS NOT A FABRICATION OF INFORMATION ─────────────
 *
 * The ANOVA estimator is unbiased for σ²_between / (σ²_between + σ²_within), a
 * ratio that lives in [0, 1]. Precisely because it is unbiased and the parameter
 * sits ON the boundary when clusters carry no signal, roughly half of all
 * samples drawn from a genuinely independent population return a NEGATIVE
 * estimate. That is sampling noise around ρ = 0, not evidence of anti-correlation.
 *
 * Passing a negative ρ̂ through would make (m̄ − 1)·ρ negative, the design effect
 * less than 1, and ess GREATER THAN n — the function would claim more
 * independent observations than it was handed rows. That output is not merely
 * unusual, it is impossible, and it is the direction that opens the gate.
 * Clamping to 0 pins ess at exactly n: it grants the data the most information
 * they could conceivably carry (perfect independence) and not one row more. It
 * invents nothing; it declines to overshoot.
 *
 * The upper clamp is defensive only. With MSW > 0 and m₀ > 1 the raw ratio is
 * algebraically < 1, and with MSW = 0 it is exactly 1, so ρ̂ > 1 can only arise
 * from floating-point noise — and if it does, the clamp lands on the
 * conservative end (ess = k).
 *
 * The raw, possibly-negative estimate is deliberately NOT exposed on the return
 * type. No caller of a sample-size gate should be able to reach for a negative
 * ICC, and `EffectiveSampleSize` is frozen by the contract at { ess, designEffect }.
 *
 * ── DEGENERATE CASES: EXPLICIT POLICY, NOT ACCIDENT ──────────────────────────
 *
 * k = 1 — every row from one cluster.
 *   MSB has k − 1 = 0 degrees of freedom. With a single cluster there is no
 *   between-cluster contrast to measure the within-cluster spread against, so ρ
 *   is not merely imprecise, it is UNIDENTIFIABLE. Throwing would be defensible,
 *   but it is the wrong failure mode: "all rows come from one player-season" is
 *   a routine, expected shape for a mining query, not a caller bug, and a throw
 *   would push every call site into inventing its own fallback — which is how
 *   the fallback ends up being `rows.length`. The fail-closed VALUE is ρ = 1:
 *   one cluster supplies at most one independent unit, so
 *   ess = n / (1 + (n − 1)·1) = 1 and designEffect = n. The alternative default,
 *   ρ = 0, would return ess = n, the single most dangerous answer this function
 *   can give — because "all forty rows are one player" is exactly the situation
 *   the caller invoked it to detect.
 *
 * k = n — every row its own cluster.
 *   MSW has n − k = 0 degrees of freedom, so the ANOVA estimator is 0/0. It does
 *   not matter: m̄ = 1 makes (m̄ − 1)·ρ = 0 for EVERY ρ in [0, 1], so ess = n
 *   under any convention. Policy: report ρ = 0 explicitly rather than let a 0/0
 *   propagate a NaN through the multiplication. This is the genuinely i.i.d.
 *   design and ess = n is exact here, not a clamp artefact.
 *   (n = 1 satisfies both k = 1 and k = n. Both policies return ess = 1, so the
 *   branch ordering below is immaterial — one row is one independent unit.)
 *
 * MSW = 0 with k < n — exact duplication inside clusters, real spread across them.
 *   There is deliberately NO special case here, and a reader looking for one
 *   should know why: the formula already returns ρ = (MSB − 0)/(MSB + 0) = 1
 *   EXACTLY, a positive quantity divided by itself. ess = n / m̄ = k, which is
 *   the right answer for the right reason — rows inside a cluster are literal
 *   duplicates, so each cluster contributes exactly one distinct observation.
 *
 * MSB = MSW = 0 — every value in the input identical.
 *   0/0; ρ is undefined and the two one-sided limits disagree. Approaching along
 *   MSW → 0 with MSB > 0 the limit is 1; approaching along MSB → 0 with MSW > 0
 *   it is negative and clamps to 0. Policy: ρ = 1, giving ess = k. Two reasons.
 *   (a) Continuity with the branch above: a constant column is the extreme case
 *   of within-cluster duplication. (b) A constant column carries no information
 *   about anything downstream, so the smaller ess costs nothing real, whereas
 *   ρ = 0 would let a degenerate all-identical feature clear a sample gate at
 *   full nominal strength.
 *
 * Denominator <= 0 with MSW > 0.
 *   Algebraically unreachable for n > k, since m₀ > 1 strictly and MSB >= 0. It
 *   is retained because it CAN be reached by floating point if MSB is exactly 0
 *   and (m₀ − 1)·MSW underflows. The numerator is then −MSW < 0, so the clamp
 *   direction is unambiguous: ρ = 0.
 *
 * ── THE (0, n] RANGE INVARIANT ───────────────────────────────────────────────
 *
 * ρ ∈ [0, 1] and m̄ >= 1 bound the denominator in [1, m̄], so ess ∈ [k, n] and
 * k >= 1 > 0. The upper bound holds BIT-EXACTLY: (m̄ − 1)·ρ is a product of two
 * non-negative doubles, and IEEE addition of a non-negative to 1 never returns
 * less than 1, so n / denominator can never exceed n. The lower bound can lose a
 * final ulp to rounding but never approaches 0. The explicit guard at the end is
 * kept anyway, so that a future edit to the ρ branches cannot leak an
 * out-of-range ess into a minimum-sample gate.
 *
 * SEE ALSO: `./bh-fdr.ts` carries a sibling implementation under the contract's
 * combined "`bh-fdr` + `ess`" section header; this file is the dedicated `ess`
 * slot required by the one-slot-per-file rule. Both satisfy the same frozen
 * `EffectiveSampleSizeFn` type and the same documented policies.
 */

import {
  KernelError,
  assertFinite,
  assertNonEmpty,
  assertSameLength,
  type EffectiveSampleSize,
  type EffectiveSampleSizeFn,
} from "../contract.js";

/**
 * Cluster membership plus the first-order sums needed by the ANOVA estimator.
 * Sums (not sums of squares) are collected here so the within-cluster sum of
 * squares can be taken in a numerically stable second pass; see
 * `anovaIntraclassCorrelation`.
 */
interface ClusterSummary {
  /** m_i, cluster sizes indexed by dense cluster index. */
  readonly sizes: readonly number[];
  /** Σ_j y_ij per cluster, indexed by dense cluster index. */
  readonly sums: readonly number[];
  /** Dense cluster index for each input row, aligned to `values`. */
  readonly clusterOf: readonly number[];
  /** Σ_ij y_ij over every row. */
  readonly grandSum: number;
}

/**
 * Assign a dense cluster index to every row and accumulate per-cluster sums.
 *
 * FAILURE MODES THIS GUARDS:
 *  - A non-finite VALUE would poison every downstream sum and surface as a NaN
 *    ess, which the contract forbids (rule 3: never return NaN). Throws NOT_FINITE.
 *  - A non-finite numeric cluster ID is a missing or corrupt key, not a cluster.
 *    `Map` compares keys with SameValueZero, under which NaN IS equal to NaN, so
 *    silently accepting them would merge every row with an unknown id into one
 *    giant pseudo-cluster — fabricating dependence between rows that may well be
 *    independent, and doing it invisibly. Throws NOT_FINITE instead.
 *
 * The map is keyed on the raw `string | number` union rather than on
 * `String(id)`. This is load-bearing: SameValueZero keeps the number 12 and the
 * string "12" distinct, which is required, because a numeric player id and a
 * string team code that happen to share digits are different entities and
 * merging them would understate k and therefore understate ess. (SameValueZero
 * does treat -0 and 0 as one key, which is the desired behaviour — they denote
 * the same cluster.)
 */
function groupByCluster(
  values: readonly number[],
  clusterIds: readonly (string | number)[],
): ClusterSummary {
  const n = values.length;
  const indexOfId = new Map<string | number, number>();
  const sizes: number[] = [];
  const sums: number[] = [];
  const clusterOf: number[] = new Array<number>(n);
  let grandSum = 0;

  for (let i = 0; i < n; i += 1) {
    const value = values[i] as number;
    assertFinite(value, `values[${i}]`);

    const id = clusterIds[i] as string | number;
    if (typeof id === "number") {
      assertFinite(id, `clusterIds[${i}]`);
    }

    let c = indexOfId.get(id);
    if (c === undefined) {
      c = sizes.length;
      indexOfId.set(id, c);
      sizes.push(0);
      sums.push(0);
    }
    clusterOf[i] = c;
    sizes[c] = (sizes[c] as number) + 1;
    sums[c] = (sums[c] as number) + value;
    grandSum += value;
  }

  return { sizes, sums, clusterOf, grandSum };
}

/**
 * One-way ANOVA (unbalanced) intraclass correlation, clamped to [0, 1].
 *
 * PRECONDITION: 1 < k < n. The two boundary designs are decided by the caller,
 * because at those boundaries one of the two mean squares has zero degrees of
 * freedom and the answer is a documented policy rather than an estimate (see the
 * file header).
 *
 * FAILURE MODES THIS HANDLES:
 *  - Catastrophic cancellation in the within-cluster sum of squares. SSW is taken
 *    in a second pass against the already-computed cluster means, never as
 *    Σy² − (Σy)²/m_i. The one-pass form cancels catastrophically whenever the
 *    cluster mean is large relative to the within-cluster spread — the normal
 *    regime for season-total or per-snap yardage columns — and can return a
 *    NEGATIVE sum of squares, which would flip the sign of ρ̂ and silently
 *    inflate ess.
 *  - Zero total variance (MSB = MSW = 0): 0/0. Resolved to ρ = 1 by policy.
 *  - A negative raw estimate, which is expected roughly half the time under true
 *    independence and would otherwise push ess above n. Clamped to 0.
 */
function anovaIntraclassCorrelation(
  values: readonly number[],
  summary: ClusterSummary,
): number {
  const n = values.length;
  const k = summary.sizes.length;
  const grandMean = summary.grandSum / n;

  const clusterMeans: number[] = new Array<number>(k);
  let ssBetween = 0;
  let sumOfSquaredSizes = 0;
  for (let c = 0; c < k; c += 1) {
    const size = summary.sizes[c] as number;
    const mean = (summary.sums[c] as number) / size;
    clusterMeans[c] = mean;
    const deviation = mean - grandMean;
    ssBetween += size * deviation * deviation;
    sumOfSquaredSizes += size * size;
  }

  let ssWithin = 0;
  for (let i = 0; i < n; i += 1) {
    const deviation =
      (values[i] as number) - (clusterMeans[summary.clusterOf[i] as number] as number);
    ssWithin += deviation * deviation;
  }

  const msb = ssBetween / (k - 1);
  const msw = ssWithin / (n - k);

  // The unbalanced-design correction. NOT the mean cluster size: m0 <= m̄ with
  // equality only for a balanced design, and substituting m̄ biases ess upward
  // every time (see the header). Under the precondition 1 < k < n this is
  // strictly greater than 1.
  const m0 = (n - sumOfSquaredSizes / n) / (k - 1);

  const denominator = msb + (m0 - 1) * msw;

  if (denominator > 0) {
    const raw = (msb - msw) / denominator;
    return raw < 0 ? 0 : raw > 1 ? 1 : raw;
  }
  if (msw > 0) {
    // Floating-point-only branch: msb must be 0 and (m0 − 1)·msw must have
    // underflowed. The numerator is then −msw < 0, so the clamp gives 0.
    return 0;
  }
  // msb = msw = 0: no variance anywhere. Conservative limit, matching the
  // MSW = 0 branch that this case is the boundary of.
  return 1;
}

/**
 * Cluster-adjusted effective sample size.
 *
 * `ess` is the information-equivalent independent row count in (0, n];
 * `designEffect` is n / ess and is >= 1. The mining engine's minimum-sample gate
 * must consume THIS, never `rows.length`.
 *
 * FAILURE MODES:
 *  - `values` and `clusterIds` of different lengths — a row/key misalignment
 *    would silently reassign observations to the wrong clusters and produce a
 *    plausible-looking but meaningless ess. Throws MISMATCHED_LENGTH.
 *  - Empty input — "how much evidence is in nothing" has no defensible answer,
 *    and returning ess = 0 would violate the contract's (0, n] range while
 *    letting a mis-wired filter look like a legitimately tiny sample. Throws EMPTY.
 *  - Non-finite values or numeric cluster ids. Throws NOT_FINITE.
 *  - An ess outside (0, n] — unreachable by construction, retained as a
 *    structural guard. Throws DOMAIN.
 *
 * Does not mutate either input.
 */
export const effectiveSampleSize: EffectiveSampleSizeFn = (
  values,
  clusterIds,
): EffectiveSampleSize => {
  assertSameLength(values, clusterIds, "values", "clusterIds");
  assertNonEmpty(values, "values");

  const n = values.length;
  const summary = groupByCluster(values, clusterIds);
  const k = summary.sizes.length;
  const meanClusterSize = n / k;

  let rho: number;
  if (k === n) {
    // All singleton clusters: MSW has no degrees of freedom, but m̄ = 1 makes ρ
    // irrelevant to ess. The i.i.d. design, reported exactly.
    rho = 0;
  } else if (k === 1) {
    // One cluster: MSB has no degrees of freedom and ρ is unidentifiable.
    // Documented fail-closed policy — maximal dependence, one independent unit.
    rho = 1;
  } else {
    rho = anovaIntraclassCorrelation(values, summary);
  }

  // ρ = 0 gives a denominator of exactly 1, so ess === n and designEffect === 1
  // bit-exactly rather than to within a rounding error. Callers comparing ess
  // against an integer gate depend on that.
  const ess = n / (1 + (meanClusterSize - 1) * rho);

  if (!Number.isFinite(ess) || ess <= 0 || ess > n) {
    throw new KernelError("DOMAIN", `ess must lie in (0, ${n}], computed ${ess}`);
  }

  return { ess, designEffect: n / ess };
};
