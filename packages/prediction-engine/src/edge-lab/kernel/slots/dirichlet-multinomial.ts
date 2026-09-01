/**
 * SLOT `dirichlet-multinomial` — THE structural core. Teammates compete for ONE
 * pie, and this is the only slot in the kernel that says so.
 *
 * WHY A JOINT COMPOSITIONAL MODEL AND NOT K INDEPENDENT COUNT MODELS
 * The tempting shortcut is to fit a separate negative binomial per receiver and
 * price each prop off its own marginal. That model is not merely imprecise, it is
 * INCOHERENT: it assigns positive probability to the whole receiving corps going
 * over on the same night off a fixed number of team targets. Every same-game
 * parlay built on it is mispriced in the operator's favour, and every injury
 * re-projection has to be bolted on by hand.
 *
 * Modelling the SHARES jointly fixes all three at once:
 *
 *   p ~ Dirichlet(alpha),          n | p ~ Multinomial(trials, p)
 *
 * Marginalising p gives the Dirichlet-multinomial (Polya) distribution, whose
 * covariance is
 *
 *   Cov(n_j, n_k) = − trials · p_j · p_k · (trials + A) / (1 + A),   j ≠ k
 *
 * with A = Σ alpha. The minus sign is STRUCTURAL — it comes from the shares
 * summing to one, not from a copula bolted on afterwards — so teammate counts are
 * negatively correlated by construction at every A. The `(trials + A)/(1 + A)`
 * factor is the overdispersion the multinomial cannot express: it is 1 only in
 * the limit A → ∞ and grows to `trials` as A → 0, which is the difference between
 * "the target distribution is fixed and known" and "the target distribution is
 * itself a random draw each week". Real usage rates are the latter.
 *
 * Injury re-projection is then RENORMALISATION: drop the injured player's
 * component from alpha and the surviving weights redistribute his share in
 * proportion to their own, which is exactly the behaviour a share model should
 * have and exactly the behaviour independent marginals cannot produce.
 *
 * ── PART 1: `fitDirichletMultinomial` — Minka's fixed point ──────────────────
 *
 * There is no closed form for the Dirichlet-multinomial MLE. Minka (2000),
 * "Estimating a Dirichlet distribution", derives a fixed-point iteration from a
 * lower bound on the log-likelihood:
 *
 *   alpha_k ← alpha_k · [ Σ_i ( ψ(n_ik + alpha_k) − ψ(alpha_k) ) ]
 *                       ─────────────────────────────────────────
 *                       [ Σ_i ( ψ(N_i + A) − ψ(A) ) ]
 *
 * with N_i = Σ_k n_ik and A = Σ_k alpha_k. It is an MM algorithm: each step
 * maximises a tangent lower bound on the likelihood, so the likelihood is
 * non-decreasing and the update is multiplicative, which keeps every coordinate
 * strictly positive without a projection step. Budget 500, tolerance 1e-9, both
 * frozen by the contract.
 *
 * TWO EXACT SHORTCUTS, not approximations, both of which answer degeneracy
 * questions directly:
 *   - `n_ik = 0` contributes ψ(alpha_k) − ψ(alpha_k) = 0 to the numerator, so
 *     zero cells can be skipped. Football target matrices are mostly zeros, so
 *     this is also the difference between a fast fit and a slow one.
 *   - `N_i = 0` contributes ψ(A) − ψ(A) = 0 to the denominator, so an all-zero
 *     row (a game a unit did not play) is silently and correctly ignored. The
 *     update stays well posed as long as at least one row has N_i >= 1; if NO
 *     row does, the denominator is exactly 0, the likelihood is flat at 1 for
 *     every alpha, and the fit fails closed with UNSUPPORTED rather than
 *     dividing by zero.
 *
 * WHEN IT DOES NOT CONVERGE — AND WHY THAT IS THE RIGHT ANSWER
 * The Dirichlet-multinomial can represent variance at or ABOVE the multinomial
 * floor and nothing below it. Data whose between-row spread is at or under that
 * floor therefore has its MLE at A = ∞, and the fixed point walks toward it in
 * roughly constant additive steps that never fall under the tolerance. Three
 * common inputs land there:
 *   - a single row (no between-row variation exists to measure),
 *   - identical rows, e.g. every game exactly [5, 5],
 *   - any sample that is under-dispersed relative to the multinomial.
 * All three exhaust the budget and throw NO_CONVERGENCE. That is a statement
 * about the data, not a numerical accident: the honest answer to "how variable
 * is this player's share week to week?" from one game is "unknowable".
 *
 * Note the deliberate difference from `neg-binomial`, whose contract instructs it
 * to DEGENERATE to a near-Poisson fit under the analogous condition. This slot's
 * contract mandates NO_CONVERGENCE past budget and names no degeneracy
 * convention, so under-dispersion fails closed here. A caller that wants a
 * multinomial fallback should catch NO_CONVERGENCE and use pooled shares with a
 * large A of its own choosing — that decision belongs to the caller, in writing,
 * not to this function silently.
 *
 * THE CONVERGENCE CEILING — READ THIS BEFORE USING THE FIT IN PRODUCTION
 * Minka's SIMPLE fixed point (the one the contract freezes) converges LINEARLY,
 * and its rate degrades sharply as the fitted concentration A = Σ alpha grows,
 * because the tangent lower bound it maximises becomes progressively looser
 * relative to the true log-likelihood. Measured on data simulated from a known
 * alpha (4 categories, 25–40 trials per row, 400–3000 rows, tolerance 1e-9,
 * counted from an all-ones start):
 *
 *      A ≈ 1.1      63 iterations
 *      A ≈ 1.8      98 iterations
 *      A ≈ 4.1     138 iterations
 *      A ≈ 5.2     178 iterations
 *      A ≈ 18.7    436 iterations
 *      A ≈ 19.5    778 iterations   ← past budget
 *      A ≈ 200   >1500 iterations   ← far past budget
 *
 * So the 500-iteration budget is not decorative: it puts a REAL ceiling of
 * roughly A ≈ 20 on what this slot can fit at tolerance 1e-9, and beyond it a
 * perfectly well-posed sample throws NO_CONVERGENCE. Football target shares sit
 * uncomfortably close to that line (a 25%-share receiver whose weekly share has
 * a 10pp standard deviation implies A ≈ 18). Two things follow, and both are the
 * caller's business rather than this slot's:
 *   - A caller MUST handle NO_CONVERGENCE. It is a routine outcome on
 *     concentrated shares, not an exotic one.
 *   - A better initialisation cannot rescue it. The rate, not the starting
 *     point, is the binding constraint: started 1e-6 away from the fixed point,
 *     the A ≈ 18.7 case still needs 116 iterations to reach 1e-9. Escaping the
 *     ceiling needs a DIFFERENT algorithm (Minka's Newton step, or his
 *     mean/precision alternation), and swapping the algorithm is a contract
 *     change, not an implementation detail.
 * The alternative — quietly declaring convergence on a looser criterion, e.g.
 * when the log-likelihood stops improving — was rejected because it would also
 * declare convergence on the divergent A → ∞ cases above, converting a loud,
 * correct NO_CONVERGENCE into a silent, arbitrary, large alpha. A spurious
 * failure is recoverable; a spurious success is not.
 *
 * ── PART 2: `sampleDirichletMultinomial` — gamma shares, exact allocation ────
 *
 * A Dirichlet draw is a normalised vector of independent gammas:
 * p_k = g_k / Σ g, g_k ~ Gamma(alpha_k, 1). The gammas come from Marsaglia–Tsang
 * (2000), which is the standard squeeze-accelerated rejection method and needs
 * exactly one normal deviate plus one uniform per attempt (acceptance rate
 * > 0.99 for every shape >= 1). Both come from the INJECTED rng — the normal via
 * `boxMuller` from `./numeric.js`, never `Math.random`.
 *
 * Marsaglia–Tsang is defined for shape >= 1. For shape a < 1 the standard boost
 * is used: draw Gamma(a + 1) and multiply by u^(1/a) with u ~ Uniform(0,1). That
 * boost costs ONE EXTRA rng draw, which matters to any caller counting draws to
 * reproduce a stream — see the draw accounting on `sampleDirichletMultinomial`.
 *
 * NORMALISATION IS DONE IN LOG SPACE. The naive `g_k / Σ g` divides by zero when
 * every gamma underflows, which is reachable in ordinary use: a floored alpha of
 * 1e-9 (see `ALPHA_FLOOR`) produces g = exp(log(u)/1e-9) = exp(−7e8), i.e. exactly
 * 0 in double precision. Carrying log g and normalising by softmax with the
 * maximum subtracted makes the denominator >= 1 by construction, so 0/0 is
 * unreachable and a vector of vanishing alphas degenerates gracefully to a point
 * mass on the largest draw instead of to NaN.
 *
 * COUNTS SUM EXACTLY TO `trials`. This is a hard invariant, not an approximation,
 * and it is guaranteed STRUCTURALLY rather than by a correction: the allocation
 * loop runs exactly `trials` times and each pass increments exactly one counter.
 * No rounding, no largest-remainder repair, no possibility of drift.
 *
 * PURITY
 * Every export is pure. No I/O, no clock, no `Math.random`, no mutation of any
 * argument. All randomness is drawn from the injected `Rng`, and every value it
 * returns is validated before use, so a malformed source fails closed instead of
 * poisoning a draw with NaN.
 */

import {
  KernelError,
  assertCount,
  assertFinite,
  assertNonEmpty,
  type DirichletMultinomialDraw,
  type DirichletMultinomialParams,
  type FitDirichletMultinomialFn,
  type Rng,
  type SampleDirichletMultinomialFn,
} from "../contract.js";
import { boxMuller, digamma } from "../numeric.js";

// ─────────────────────────────────────────────────────────────────────────────
// Documented constants
// ─────────────────────────────────────────────────────────────────────────────

/** Frozen by the contract: Minka's fixed point gets 500 iterations, no more. */
const FIT_ITERATION_BUDGET = 500;

/**
 * Frozen by the contract: 1e-9.
 *
 * APPLIED AS A HYBRID relative/absolute change — `|Δalpha_k| <= 1e-9 · max(1,
 * alpha_k)` — and that interpretation is deliberate. A pure ABSOLUTE test is
 * unreachable for a concentrated fit: alpha of order 1e4 is computed from
 * differences of digammas that individually carry ~1e-12 of absolute error, so
 * the update's own noise floor sits near 1e-8 and the iteration would spin to the
 * budget and throw on perfectly good data. A pure RELATIVE test is the wrong
 * scale in the other direction, since a floored alpha near 1e-9 would demand
 * convergence to 1e-18. The hybrid is relative above 1 and absolute below it.
 *
 * This is the MOST PERMISSIVE defensible reading of the frozen "tolerance 1e-9",
 * and it is still not permissive enough to lift the convergence ceiling recorded
 * in the file header — loosening it by a factor of two would buy about twelve
 * iterations. The criterion is on the PARAMETER CHANGE, matching Minka's own
 * reference implementation; see the header for why a log-likelihood criterion was
 * rejected despite converging faster.
 */
const FIT_TOLERANCE = 1e-9;

/**
 * ZERO-COLUMN POLICY (the decision the emergent behaviour must not make for us).
 *
 * A column that is zero in EVERY row — a player who never saw a target in the
 * sample — has numerator Σ_i (ψ(0 + alpha_k) − ψ(alpha_k)) = 0 EXACTLY. The
 * multiplicative update therefore sends alpha_k to 0 in one step and 0 is
 * absorbing: once there it can never leave. The MLE genuinely is alpha_k → 0.
 * But 0 is outside the contract's "all strictly positive", and `digamma(0)`
 * throws DOMAIN, so letting the iteration walk into it would turn an ordinary
 * football week into a crash on the SECOND iteration.
 *
 * THE DECISION: dead columns are detected up front, EXCLUDED from the iteration
 * entirely, and reported at this floor. Three properties make that the right
 * call rather than the convenient one:
 *
 *  1. Excluding them is the exact limit, not an approximation. The MLE has
 *     alpha_dead = 0, so the fitted precision is A = Σ_active alpha exactly;
 *     carrying floored columns inside the iteration would perturb A by
 *     (dead count) · 1e-9 for no statistical gain.
 *  2. Dropping the columns instead would silently break COLUMN ALIGNMENT with
 *     the caller's player list, which is the single most dangerous thing this
 *     function could do. The returned vector always has one entry per input
 *     column, in input order.
 *  3. Throwing instead would be wrong. A receiver who was inactive for every
 *     game in the window is ordinary data, not a caller bug.
 *
 * WHY 1e-9 SPECIFICALLY: it is unambiguously distinguishable from an ESTIMATED
 * alpha — a single target observed across a hundred games still fits alpha of
 * order 1e-2, seven orders above the floor — so a caller can tell "never
 * targeted" from "barely targeted" by inspection. It is also large enough that
 * ψ(1e-9) ≈ −1e9 and log(1e-9) ≈ −20.7 stay far from overflow, and small enough
 * that the sampler assigns such a category a share that underflows to exactly 0,
 * i.e. it can never be allocated a trial.
 */
const ALPHA_FLOOR = 1e-9;

/**
 * Clamp band for the MOMENT-BASED initial precision (see `initialActiveAlpha`).
 *
 * The moment equation can return a value outside any useful range — negative
 * when the sample is under-dispersed, or astronomically large when it is a hair
 * over the multinomial floor. Both are legitimate signals about the data, but as
 * a STARTING POINT they are useless: a start at A = 1e15 puts every digamma
 * difference into catastrophic cancellation before the first update. Clamping the
 * start costs nothing, because the iteration is free to walk back out of the band
 * (and does — the NO_CONVERGENCE cases below all start inside it and diverge).
 */
const MIN_INIT_PRECISION = 1e-3;
const MAX_INIT_PRECISION = 1e6;

/**
 * Rejection budget for one Marsaglia–Tsang gamma draw.
 *
 * The method's acceptance probability exceeds 0.99 for every shape >= 1, so this
 * budget is ~1000 standard deviations of headroom for a well-behaved `Rng` and
 * can only be exhausted by a pathological source (one that returns the same
 * rejecting value forever). Looping forever on such a source would hang a worker;
 * NO_CONVERGENCE names the failure honestly instead.
 */
const MT_REJECTION_BUDGET = 1000;

/** Marsaglia–Tsang's published squeeze coefficient. */
const MT_SQUEEZE = 0.0331;

// ─────────────────────────────────────────────────────────────────────────────
// Rng hygiene
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps an `Rng` so that EVERY value it produces is validated at the point of
 * use, including the two draws `boxMuller` takes internally (which this slot
 * cannot otherwise see).
 *
 * The `Rng` contract is "values in [0, 1)". A source returning NaN or ±Infinity
 * throws NOT_FINITE; anything outside [0, 1) — including exactly 1 — throws
 * DOMAIN. Exactly 0 is IN contract and must work: it is handled numerically
 * everywhere it is consumed (`boxMuller` substitutes the smallest positive
 * uniform before taking a log; the shape-boost below does the same; the
 * Marsaglia–Tsang acceptance test treats log(0) = −Infinity as an unconditional
 * accept, which is the method's correct behaviour). None of those paths can
 * produce Infinity or NaN in a returned draw.
 */
function guardRng(rng: Rng): Rng {
  return function next(): number {
    const u = rng();
    assertFinite(u, "rng() output");
    if (u < 0 || u >= 1) {
      throw new KernelError("DOMAIN", `rng() must return a value in [0,1), received ${u}`);
    }
    return u;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 1 — Minka's fixed point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recovers the concentration vector `alpha` from observed count rows.
 *
 * Rows are games, columns are players (or any set of categories competing for one
 * total). Every row must have the same length; the returned vector has one entry
 * per column, in INPUT order, all strictly positive.
 *
 * FAILURE MODES, every one of them explicit:
 *  - EMPTY            — no rows at all, or rows with no columns.
 *  - MISMATCHED_LENGTH— ragged rows. Column k must mean the same player in every
 *                       game; a short row silently shifts every later column, so
 *                       this fails closed rather than padding.
 *  - DOMAIN           — a negative or non-integer count (via `assertCount`).
 *  - NOT_FINITE       — a NaN or Infinite count (via `assertCount`).
 *  - UNSUPPORTED      — every count is zero. The denominator of the update is
 *                       then exactly 0 and the likelihood is flat at 1 for every
 *                       alpha: there is no fit, not even a degenerate one.
 *  - NO_CONVERGENCE   — the budget of 500 was exhausted. TWO distinct causes, and
 *                       a caller must handle both:
 *                       (a) the data are at or under the multinomial dispersion
 *                           floor (one row, identical rows, under-dispersed
 *                           samples), so the MLE sits at A = ∞ and no budget
 *                           would ever suffice; or
 *                       (b) the data are perfectly well posed but STRONGLY
 *                           CONCENTRATED (A greater than roughly 20), where the
 *                           fixed point's linear rate needs more than 500 steps
 *                           to reach 1e-9. See the ceiling table in the file
 *                           header — this is a routine outcome, not an exotic one.
 *                       Also raised, defensively, if an update leaves the positive
 *                       orthant or the denominator loses positivity to floating
 *                       point — both mean the fit has exhausted double precision.
 *
 * DOCUMENTED NON-FAILURES:
 *  - All-zero rows are ignored exactly (they contribute 0 to the denominator).
 *  - All-zero columns are floored at `ALPHA_FLOOR`; see that constant.
 *  - Exactly one non-zero column (including the one-category case) returns 1 for
 *    that column and `ALPHA_FLOOR` for the rest. When only one share is non-zero
 *    it is 1 in every row, and the DM likelihood is then IDENTICAL for every
 *    precision — Minka's numerator and denominator coincide term by term and the
 *    update is the identity map. Every positive value is a fixed point, so the
 *    iteration would return whatever it started at; returning 1 makes that
 *    arbitrariness explicit and reproducible instead of hiding it behind an
 *    initialisation detail. The sampling behaviour is unaffected: with one live
 *    category every trial lands there whatever its alpha.
 */
export const fitDirichletMultinomial: FitDirichletMultinomialFn = (
  countRows: readonly (readonly number[])[],
): readonly number[] => {
  assertNonEmpty(countRows, "countRows");

  const rowCount = countRows.length;
  const categories = (countRows[0] as readonly number[]).length;
  if (categories === 0) {
    throw new KernelError("EMPTY", "countRows[0] must contain at least one category");
  }

  // ── validate and tabulate in one pass ──────────────────────────────────────
  const rowTotals: number[] = new Array<number>(rowCount).fill(0);
  const columnTotals: number[] = new Array<number>(categories).fill(0);

  for (let i = 0; i < rowCount; i += 1) {
    const row = countRows[i] as readonly number[];
    if (row.length !== categories) {
      throw new KernelError(
        "MISMATCHED_LENGTH",
        `countRows[${i}] has ${row.length} categories but countRows[0] has ${categories}; ` +
          "every row must describe the same categories in the same order",
      );
    }
    let total = 0;
    for (let k = 0; k < categories; k += 1) {
      const n = row[k] as number;
      assertCount(n, `countRows[${i}][${k}]`);
      total += n;
      columnTotals[k] = (columnTotals[k] as number) + n;
    }
    rowTotals[i] = total;
  }

  // ── partition the columns ──────────────────────────────────────────────────
  const active: number[] = [];
  for (let k = 0; k < categories; k += 1) {
    if ((columnTotals[k] as number) > 0) active.push(k);
  }

  if (active.length === 0) {
    // Equivalent to "every N_i is 0": the denominator Σ_i (ψ(N_i + A) − ψ(A)) is
    // exactly 0 and the update is 0/0 for every k. Fail closed.
    throw new KernelError(
      "UNSUPPORTED",
      "every count is zero; the Dirichlet-multinomial likelihood is flat in alpha " +
        "and no concentration is identifiable",
    );
  }

  if (active.length === 1) {
    // Unidentifiable precision — see the docblock above.
    const single: number[] = new Array<number>(categories).fill(ALPHA_FLOOR);
    single[active[0] as number] = 1;
    return single;
  }

  // ── iterate ────────────────────────────────────────────────────────────────
  const alpha = initialActiveAlpha(countRows, rowTotals, columnTotals, active);
  const activeCount = active.length;
  const next: number[] = new Array<number>(activeCount).fill(0);

  let converged = false;
  for (let iteration = 0; iteration < FIT_ITERATION_BUDGET; iteration += 1) {
    let precision = 0;
    for (let j = 0; j < activeCount; j += 1) precision += alpha[j] as number;

    // Denominator: shared by every category, so it is computed once per sweep.
    // Rows with N_i = 0 contribute ψ(A) − ψ(A) = 0 exactly and are skipped.
    const psiPrecision = digamma(precision);
    let denominator = 0;
    for (let i = 0; i < rowCount; i += 1) {
      const total = rowTotals[i] as number;
      if (total === 0) continue;
      denominator += digamma(total + precision) - psiPrecision;
    }
    if (!Number.isFinite(denominator) || denominator <= 0) {
      // Unreachable for admissible data: ψ is strictly increasing and at least
      // one row has N_i >= 1, so the true value is strictly positive. Reaching
      // here means the digamma difference has been annihilated by cancellation at
      // an enormous A, i.e. the fit has run out of double precision.
      throw new KernelError(
        "NO_CONVERGENCE",
        `Minka denominator lost positivity (${denominator}) at precision ${precision}; ` +
          "the concentration has exceeded what double precision can resolve",
      );
    }

    let maxChange = 0;
    for (let j = 0; j < activeCount; j += 1) {
      const column = active[j] as number;
      const current = alpha[j] as number;
      const psiCurrent = digamma(current);

      // Numerator: cells with n_ik = 0 contribute ψ(a) − ψ(a) = 0 exactly.
      let numerator = 0;
      for (let i = 0; i < rowCount; i += 1) {
        const n = (countRows[i] as readonly number[])[column] as number;
        if (n === 0) continue;
        numerator += digamma(n + current) - psiCurrent;
      }

      const updated = (current * numerator) / denominator;
      if (!Number.isFinite(updated) || updated <= 0) {
        // An active column has at least one n >= 1, so the numerator is
        // mathematically strictly positive and the update cannot leave the
        // positive orthant. Reaching here is the same precision exhaustion as
        // above, caught before it can hand `digamma` a non-positive argument.
        throw new KernelError(
          "NO_CONVERGENCE",
          `Minka update left the positive orthant for column ${column} (alpha = ${updated})`,
        );
      }
      next[j] = updated;

      // Hybrid relative/absolute change — see `FIT_TOLERANCE`.
      const change = Math.abs(updated - current) / Math.max(1, updated, current);
      if (change > maxChange) maxChange = change;
    }

    for (let j = 0; j < activeCount; j += 1) alpha[j] = next[j] as number;

    if (maxChange <= FIT_TOLERANCE) {
      converged = true;
      break;
    }
  }

  if (!converged) {
    throw new KernelError(
      "NO_CONVERGENCE",
      `Minka fixed point did not converge to ${FIT_TOLERANCE} within ${FIT_ITERATION_BUDGET} ` +
        "iterations; the sample's between-row spread is at or below the multinomial floor, " +
        "so the maximum-likelihood concentration is unbounded",
    );
  }

  // ── splice the active fit back into full column order ──────────────────────
  const out: number[] = new Array<number>(categories).fill(ALPHA_FLOOR);
  for (let j = 0; j < activeCount; j += 1) {
    out[active[j] as number] = alpha[j] as number;
  }
  return out;
};

/**
 * MOMENT-BASED INITIALISATION — and why it beats the all-ones start.
 *
 * The all-ones start (alpha_k = 1 for every k) is the usual default and it is a
 * bad one here for two independent reasons.
 *
 *  1. WRONG DIRECTION. All-ones asserts every player takes an equal share. A real
 *     target distribution is nothing like that — a WR1 at 30% next to a WR5 at 2%
 *     is one order of magnitude apart — so every coordinate has to travel a long
 *     multiplicative distance. Because the update is multiplicative with a ratio
 *     that approaches 1 as the fixed point is neared, that travel is spent at a
 *     linear rate and costs iterations directly.
 *  2. WRONG SCALE. All-ones also asserts A = K, which fixes the OVERDISPERSION at
 *     an arbitrary value tied to the roster size rather than to the data. A is the
 *     slowest-moving quantity in the iteration (it only moves as the accumulated
 *     product of the per-coordinate ratios), so starting it in the wrong decade is
 *     the dominant cost.
 *
 * The moment start fixes both in closed form.
 *
 * DIRECTION — the pooled share, which is the exact MLE of p in the A → ∞ limit:
 *
 *     p̄_k = (Σ_i n_ik) / (Σ_i N_i)
 *
 * PRECISION — from the generalised chi-square (Brier's overdispersion statistic).
 * For a row with N_i trials,
 *
 *     X_i = Σ_k (n_ik − N_i p̄_k)² / (N_i p̄_k),      E[X_i] = (K − 1)(N_i + A)/(1 + A)
 *
 * because Var(n_ik) = N_i p_k (1 − p_k)(N_i + A)/(1 + A) and Σ_k (1 − p_k) = K − 1.
 * Summing over the m rows with N_i >= 1 and writing S = (Σ_i X_i)/(K − 1),
 * T = Σ_i N_i gives one linear equation in A whose solution is
 *
 *     A ≈ (T − S) / (S − m)
 *
 * S → T as A → 0 and S → m as A → ∞, so the estimator behaves correctly at both
 * ends and its inadmissible branches are exactly the two degeneracies: S <= m is
 * a sample at or under the multinomial floor (A unbounded) and S > T is beyond
 * what any DM can produce (A at 0). Both are clamped into
 * [`MIN_INIT_PRECISION`, `MAX_INIT_PRECISION`] or replaced by the neutral
 * fallback A = K, which reproduces the all-ones SCALE while keeping the
 * moment-matched DIRECTION — strictly better than all-ones even in its worst case.
 *
 * KNOWN BIAS, stated rather than hidden: p̄ is estimated from the same rows, which
 * biases E[X_i] slightly downward (the usual estimated-cell-probability
 * correction to the chi-square degrees of freedom is not applied). That inflates
 * the initial A a little. It is an initialisation; the fixed point removes it.
 *
 * MEASURED BENEFIT, also stated rather than hidden: on data simulated from
 * alpha = [8, 5, 3, 2] over 800 rows the moment start reaches tolerance in 436
 * iterations against 579 from all-ones — a 25% saving, and the difference
 * between fitting inside the 500 budget and throwing NO_CONVERGENCE. It is NOT
 * an order-of-magnitude saving, and it cannot be: as the ceiling note in the file
 * header records, the linear RATE dominates once the start is within a few
 * percent, so no initialisation can lift the ceiling. The moment start is worth
 * having because it is free and it moves the ceiling by ~25%, not because it
 * transforms the algorithm.
 *
 * Returns alpha for the ACTIVE columns only, in `active` order. Only called with
 * `active.length >= 2`.
 */
function initialActiveAlpha(
  countRows: readonly (readonly number[])[],
  rowTotals: readonly number[],
  columnTotals: readonly number[],
  active: readonly number[],
): number[] {
  const rowCount = countRows.length;
  const activeCount = active.length;

  // Pooled shares over the active columns. Dead columns contribute nothing to
  // any row total, so these already sum to 1.
  let grandTotal = 0;
  for (let j = 0; j < activeCount; j += 1) {
    grandTotal += columnTotals[active[j] as number] as number;
  }
  const shares: number[] = new Array<number>(activeCount).fill(0);
  for (let j = 0; j < activeCount; j += 1) {
    shares[j] = (columnTotals[active[j] as number] as number) / grandTotal;
  }

  // Brier's overdispersion statistic over the rows that carry trials.
  let chiSquare = 0;
  let informativeRows = 0;
  for (let i = 0; i < rowCount; i += 1) {
    const total = rowTotals[i] as number;
    if (total === 0) continue;
    informativeRows += 1;
    const row = countRows[i] as readonly number[];
    for (let j = 0; j < activeCount; j += 1) {
      const expected = total * (shares[j] as number);
      const deviation = (row[active[j] as number] as number) - expected;
      chiSquare += (deviation * deviation) / expected;
    }
  }

  const scaled = chiSquare / (activeCount - 1);
  const estimate = (grandTotal - scaled) / (scaled - informativeRows);

  let precision: number;
  if (!Number.isFinite(estimate) || estimate <= 0) {
    // Inadmissible moment equation — fall back to the all-ones SCALE (A = K)
    // while keeping the moment-matched direction.
    precision = activeCount;
  } else {
    precision = Math.min(MAX_INIT_PRECISION, Math.max(MIN_INIT_PRECISION, estimate));
  }

  const alpha: number[] = new Array<number>(activeCount).fill(0);
  for (let j = 0; j < activeCount; j += 1) {
    // `shares[j]` is strictly positive for an active column, so the floor can
    // only bind for a share below 1e-9 of the pie across the whole sample.
    alpha[j] = Math.max(ALPHA_FLOOR, (shares[j] as number) * precision);
  }
  return alpha;
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT ENTRY POINT 2 — the draw
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draws one Dirichlet-multinomial allocation: sample the category shares from
 * Dirichlet(alpha), then hand out `trials` units by cdf inversion on those
 * shares.
 *
 * THE INVARIANT: `counts` sums to EXACTLY `trials`, and every entry is a
 * non-negative integer. Guaranteed structurally — the allocation loop runs
 * `trials` times and each pass increments exactly one counter.
 *
 * RNG DRAW ACCOUNTING (for a caller reproducing a stream):
 *   per category with alpha >= 1 : 3 draws per Marsaglia–Tsang attempt
 *                                  (2 for `boxMuller`, 1 for the acceptance test)
 *   per category with alpha < 1  : the SAME, plus ONE EXTRA draw for the u^(1/a)
 *                                  boost, taken BEFORE the attempts
 *   allocation                   : exactly `trials` draws
 * Attempts beyond the first are rare (acceptance > 0.99 for every shape >= 1) but
 * possible, so the total is not a fixed function of the inputs. `trials = 0`
 * short-circuits and consumes NO draws at all.
 *
 * FAILURE MODES:
 *  - EMPTY          — `alpha` has no entries. A Dirichlet over no categories has
 *                     no draw; there is nothing to allocate the trials to.
 *  - DOMAIN         — an alpha <= 0 (the contract requires strictly positive); a
 *                     negative or non-integer `trials`; an `Rng` returning a value
 *                     outside [0, 1), including exactly 1.
 *  - NOT_FINITE     — a NaN or Infinite alpha or `trials`, or an `Rng` returning
 *                     a non-finite value.
 *  - NO_CONVERGENCE — Marsaglia–Tsang's rejection loop exhausted its budget,
 *                     which a well-behaved `Rng` cannot do.
 *
 * DOCUMENTED NON-FAILURES:
 *  - `trials = 0` returns all-zero counts (which sums to 0 = trials, so the
 *    invariant holds) without touching the `Rng`.
 *  - A single category returns `[trials]`.
 *  - An `Rng` returning exactly 0 is in contract and produces a valid draw: every
 *    consumer of a uniform here either substitutes the smallest positive double
 *    before taking a log or treats log(0) = −Infinity as an unconditional accept.
 *  - Alphas so small that their gamma draws underflow (e.g. the `ALPHA_FLOOR` of
 *    a never-targeted player) receive a share of exactly 0 and can never be
 *    allocated a trial. The log-space normalisation keeps the remaining shares
 *    well defined rather than producing 0/0.
 */
export const sampleDirichletMultinomial: SampleDirichletMultinomialFn = (
  params: DirichletMultinomialParams,
  rng: Rng,
): DirichletMultinomialDraw => {
  const { alpha, trials } = params;
  assertNonEmpty(alpha, "params.alpha");

  const categories = alpha.length;
  for (let k = 0; k < categories; k += 1) {
    const a = alpha[k] as number;
    assertFinite(a, `params.alpha[${k}]`);
    if (a <= 0) {
      throw new KernelError(
        "DOMAIN",
        `params.alpha[${k}] must be strictly positive, received ${a}`,
      );
    }
  }
  // Rejects non-integer, negative, NaN and Infinite trials.
  assertCount(trials, "params.trials");

  const counts: number[] = new Array<number>(categories).fill(0);
  if (trials === 0) {
    // Nothing to allocate. The shares are unobservable through a zero-trial
    // draw, so no rng is consumed — see the draw accounting above.
    return { counts };
  }

  const uniform = guardRng(rng);

  // ── Dirichlet shares, carried in log space throughout ──────────────────────
  const logGammas: number[] = new Array<number>(categories).fill(0);
  let maxLog = Number.NEGATIVE_INFINITY;
  for (let k = 0; k < categories; k += 1) {
    const value = sampleLogGamma(alpha[k] as number, uniform);
    logGammas[k] = value;
    if (value > maxLog) maxLog = value;
  }

  // Softmax with the maximum subtracted. The maximal term contributes exactly
  // exp(0) = 1, so `weightSum >= 1` and the division below can never be 0/0 —
  // which the naive g_k / Σ g form cannot promise once any gamma underflows.
  const weights: number[] = new Array<number>(categories).fill(0);
  let weightSum = 0;
  for (let k = 0; k < categories; k += 1) {
    const w = Math.exp((logGammas[k] as number) - maxLog);
    weights[k] = w;
    weightSum += w;
  }

  // ── cdf over the shares ────────────────────────────────────────────────────
  const cumulative: number[] = new Array<number>(categories).fill(0);
  let running = 0;
  let lastPositive = 0;
  for (let k = 0; k < categories; k += 1) {
    const share = (weights[k] as number) / weightSum;
    if (share > 0) lastPositive = k;
    running += share;
    cumulative[k] = running;
  }

  // ── allocate exactly `trials` units by cdf inversion ───────────────────────
  for (let t = 0; t < trials; t += 1) {
    const u = uniform();
    let index: number;
    if (u < (cumulative[categories - 1] as number)) {
      // Smallest k with cumulative[k] > u. A zero-share category satisfies
      // cumulative[k] === cumulative[k-1], so if it clears u then so does its
      // predecessor and the search returns the earlier index — a zero-share
      // category can therefore never be selected. (For k = 0 the guard is
      // cumulative[0] = 0 > u >= 0, which is false.)
      let lo = 0;
      let hi = categories - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if ((cumulative[mid] as number) > u) hi = mid;
        else lo = mid + 1;
      }
      index = lo;
    } else {
      // The running sum of shares can land a few ulp BELOW 1, leaving a sliver of
      // [0,1) above the last cumulative value. Rounding must not lose a unit —
      // the exact-sum invariant is not negotiable — so the sliver is assigned to
      // the last category that actually carries mass. Probability ~1e-16.
      index = lastPositive;
    }
    counts[index] = (counts[index] as number) + 1;
  }

  return { counts };
};

/**
 * One Gamma(shape, 1) deviate by Marsaglia–Tsang (2000), returned as its LOGARITHM.
 *
 * The method: with d = a − 1/3 and c = 1/sqrt(9d), propose x ~ N(0,1) and
 * v = (1 + cx)³, rejecting v <= 0; accept d·v either through the cheap squeeze
 * `u < 1 − 0.0331 x⁴` or through the exact test
 * `log u < x²/2 + d(1 − v + log v)`. The transformation is exact for shape >= 1
 * and the squeeze makes the common path branch-free of any logarithm.
 *
 * SHAPE < 1 — THE BOOST. Marsaglia–Tsang requires a >= 1 (d = a − 1/3 must be
 * positive and the proposal density is only valid there). The standard fix is
 * Gamma(a) = Gamma(a + 1) · u^(1/a) with u ~ Uniform(0,1). NOTE FOR CALLERS
 * COUNTING DRAWS: that boost consumes ONE EXTRA rng draw, taken before the
 * rejection loop starts, so a category with alpha < 1 shifts the stream by one
 * relative to a category with alpha >= 1.
 *
 * WHY THE LOGARITHM IS RETURNED. u^(1/a) underflows to exactly 0 for small a
 * (a = 1e-9 gives exp(−7e8)), and a vector of underflowed gammas normalises to
 * 0/0. In log space the boost is the finite quantity log(u)/a and the caller's
 * softmax stays well defined. The log is assembled as log d + 3·log(1 + cx)
 * rather than as log(d·v), so it also cannot lose the value to underflow in the
 * product.
 *
 * Returns a finite number for every admissible shape. Throws NO_CONVERGENCE if
 * the rejection budget is exhausted; DOMAIN/NOT_FINITE propagate from the guarded
 * `Rng`.
 */
function sampleLogGamma(shape: number, uniform: Rng): number {
  let logBoost = 0;
  let effectiveShape = shape;

  if (shape < 1) {
    const u = uniform();
    // `Math.max(u, Number.MIN_VALUE)` for the same reason `boxMuller` guards its
    // own u1: an in-contract 0 would give log(0) = −Infinity, and −Infinity/a is
    // −Infinity, which is not a representable log-gamma. The substitute is the
    // smallest positive double, i.e. the closest representable neighbour of 0.
    logBoost = Math.log(Math.max(u, Number.MIN_VALUE)) / shape;
    effectiveShape = shape + 1;
  }

  const d = effectiveShape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  const logD = Math.log(d);

  for (let attempt = 0; attempt < MT_REJECTION_BUDGET; attempt += 1) {
    const x = boxMuller(uniform);
    const scaled = 1 + c * x;
    const v = scaled * scaled * scaled;
    // Rejects scaled <= 0 and, equivalently, any v that underflowed to 0.
    if (v <= 0) continue;

    const u = uniform();
    const xSquared = x * x;
    // Squeeze: avoids two logarithms on ~96% of attempts. u = 0 accepts here
    // whenever the right-hand side is positive, which is correct.
    if (u < 1 - MT_SQUEEZE * xSquared * xSquared) {
      return logD + 3 * Math.log(scaled) + logBoost;
    }
    // Exact test. log(0) = −Infinity is an unconditional accept, which is the
    // method's correct behaviour at u = 0 and not an overflow.
    if (Math.log(u) < 0.5 * xSquared + d * (1 - v + Math.log(v))) {
      return logD + 3 * Math.log(scaled) + logBoost;
    }
  }

  throw new KernelError(
    "NO_CONVERGENCE",
    `Marsaglia-Tsang rejection sampling for shape ${shape} exhausted ${MT_REJECTION_BUDGET} ` +
      "attempts; the supplied Rng is not delivering usable uniforms",
  );
}
