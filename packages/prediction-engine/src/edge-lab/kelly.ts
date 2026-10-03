/**
 * Portfolio Kelly layer — "size for survival" (handoff §2 Phase 1). Once the
 * pipeline has produced an edge, this module answers the only question that
 * still matters commercially: how much of the bankroll, if any, should be on
 * it. Every routine here is deliberately conservative-by-construction, on
 * the theory that a system that occasionally under-bets a real edge is
 * survivable and a system that over-bets a phantom one is not.
 *
 * Four defenses, composed in `portfolioKellyStakes`:
 *
 *  1. FRACTIONAL KELLY (`fractionalKellyStake`) — full Kelly f* = (p*d-1)/(d-1)
 *     is never staked directly; it is scaled by lambda in the handoff's
 *     documented λ≈0.25–0.35 band. Full Kelly is the growth-optimal fraction
 *     ONLY under a known-exact p; any real p is an estimate, and Kelly's
 *     variance blows up fast on overstated edges, so a hard fraction of it
 *     is the cheap insurance.
 *
 *  2. THE EDGE HAIRCUT (`jamesSteinShrink`) — positive-part James-Stein
 *     shrinkage of the measured edges toward zero. The skeptical prior:
 *     across a slate of "edges," most of the dispersion is noise, not skill,
 *     and the ones that look biggest are, on average, the most
 *     noise-inflated (regression to the mean). Stakes in this module are
 *     ALWAYS sized on the shrunken edge, never the raw one.
 *
 *  3. THE CORRELATION PENALTY (`ledoitWolfShrinkCovariance`, used inside
 *     `portfolioKellyStakes`) — a well-conditioned covariance estimate
 *     (Ledoit & Wolf 2004, shrinkage toward the scaled-identity target)
 *     feeding a simple, deliberately non-Markowitz correlation haircut.
 *     Per the handoff (§5), Σ⁻¹μ portfolio optimization is itself a
 *     dangerous estimation-error amplifier at small sample sizes — the cure
 *     is worse than the disease. This module never inverts a covariance
 *     matrix; it only uses it to discount stakes that are co-linear with the
 *     rest of the book.
 *
 *  4. THE SELF-DISARM (`clvDeflator`) — until realized closing-line-value
 *     correlation is established over a real sample (~50-100 settled bets,
 *     the handoff's floor), the deflator is exactly 0 and every stake it
 *     touches is exactly 0. The system does not get to bet on the strength
 *     of its own backtest; it has to earn the right with live, graded
 *     results first.
 *
 * SIZING REPORTING RULE (handoff §2 Phase 1, last line): callers report
 * these sizing outputs in Sharpe-ratio / drawdown terms. They are NEVER
 * reported as CLV — CLV is a pick-quality signal (see clv.ts /
 * closing-line-value elsewhere in this package), not a sizing-performance
 * metric, and conflating the two is exactly the kind of falsely-precise
 * claim this package's house style (see stats.ts) exists to prevent.
 *
 * Pure, deterministic, no I/O.
 */

/** Default Kelly fraction lambda — the middle of the handoff's λ≈0.25–0.35
 * band. A single play's stake can never exceed this fraction of bankroll. */
const DEFAULT_LAMBDA = 0.3;

/** Default minimum settled-bet count before clvDeflator stops returning 0 —
 * the handoff's "~50-100 settled bets" floor for trusting a realized CLV
 * correlation, taken at the conservative (lower) end. */
const DEFAULT_MIN_SETTLED = 50;

/** Tiny margin used to keep an adjusted probability strictly inside (0, 1)
 * before it reaches fractionalKellyStake's guard. This is a numerical safety
 * clamp only, not a calibration correction — callers remain responsible for
 * passing calibrated probabilities. */
const PROB_EPSILON = 1e-9;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function assertLambda(lambda: number): void {
  if (!(Number.isFinite(lambda) && lambda > 0)) {
    throw new RangeError(`lambda must be a finite number > 0 (got lambda=${lambda})`);
  }
}

function assertProbability(p: number, label: string): void {
  if (!(Number.isFinite(p) && p > 0 && p < 1)) {
    throw new RangeError(`${label} must be in the open interval (0, 1) (got ${label}=${p})`);
  }
}

function assertDecimalOdds(d: number, label: string): void {
  if (!(Number.isFinite(d) && d > 1)) {
    throw new RangeError(`${label} must be finite and > 1 (got ${label}=${d})`);
  }
}

/**
 * Fractional Kelly stake for a single play. Full Kelly is
 *
 *   f* = (p * decimalOdds - 1) / (decimalOdds - 1)
 *
 * which is then scaled by `lambda` (default 0.3, the handoff's λ≈0.25–0.35
 * band) rather than staked directly — see the module header for why. The
 * result is floored at 0 (a negative edge is never a short/lay position
 * here, it is simply "no bet") and capped at `lambda` itself (a single play,
 * however strong, can never exceed the fraction lambda represents; this is
 * mostly a numerical backstop since f* < 1 is guaranteed for p in (0, 1),
 * so f* * lambda < lambda already — but it is asserted explicitly rather
 * than assumed).
 *
 * Guards: p must be in the open interval (0, 1); decimalOdds must be finite
 * and > 1; lambda must be finite and > 0. Throws RangeError otherwise,
 * matching this package's stats.ts guard philosophy — a caller passing a
 * degenerate probability or price has a bug worth surfacing, not a stake
 * worth silently computing.
 */
export function fractionalKellyStake(p: number, decimalOdds: number, lambda: number = DEFAULT_LAMBDA): number {
  assertProbability(p, "p");
  assertDecimalOdds(decimalOdds, "decimalOdds");
  assertLambda(lambda);

  const fStar = (p * decimalOdds - 1) / (decimalOdds - 1);
  const scaled = Math.max(0, fStar) * lambda;
  return Math.min(lambda, scaled);
}

/**
 * Positive-part James-Stein shrinkage of a slate of measured edges toward
 * zero — the "edge haircut" documented in the module header. Stakes in this
 * module are sized on these shrunken edges, never on the raw ones.
 *
 * Shrinkage factor (applied uniformly to every edge in the slate):
 *
 *   c = max(0, 1 - (k - 2) * mean(se^2) / sum(edge^2))
 *
 * where k = edges.length. Per the classical James-Stein result, shrinkage
 * only has a well-defined, edge-reducing form for k >= 3; by convention (and
 * per this module's spec) c = 0 for k <= 2 — with too few plays to estimate
 * a shared noise level against, the skeptical prior wins outright and every
 * edge is shrunk fully to 0. When sum(edge^2) is 0 (a degenerate all-zero
 * slate) c is likewise 0 rather than NaN/Infinity from a 0/0 or x/0 divide.
 *
 * Guard: edges and se must be the same length, or this throws RangeError.
 */
export function jamesSteinShrink(edges: readonly number[], se: readonly number[]): number[] {
  if (edges.length !== se.length) {
    throw new RangeError(`edges and se must be the same length (got edges.length=${edges.length}, se.length=${se.length})`);
  }
  const k = edges.length;
  if (k === 0) return [];
  if (k <= 2) return edges.map(() => 0);

  let sumSeSq = 0;
  let sumEdgeSq = 0;
  for (let i = 0; i < k; i++) {
    const seI = se[i]!;
    const edgeI = edges[i]!;
    sumSeSq += seI * seI;
    sumEdgeSq += edgeI * edgeI;
  }
  const meanSeSq = sumSeSq / k;
  const c = sumEdgeSq > 0 ? Math.max(0, 1 - ((k - 2) * meanSeSq) / sumEdgeSq) : 0;

  return edges.map((edge) => c * edge);
}

export interface LedoitWolfResult {
  /** The shrunk covariance matrix (1 - delta) * S + delta * mu * I. */
  readonly cov: number[][];
  /** Shrinkage intensity actually applied, clamped to [0, 1]. */
  readonly delta: number;
}

/**
 * Ledoit-Wolf (2004) shrinkage of a sample covariance matrix toward the
 * scaled-identity target mu * I — the "well-conditioned estimator" from
 * "Honey, I Shrunk the Sample Covariance Matrix" / "A Well-Conditioned
 * Estimator for Large-Dimensional Covariance Matrices". Used here purely to
 * feed the conservative correlation penalty in `portfolioKellyStakes`; see
 * the module header for why this package deliberately stops short of full
 * Sigma^-1 mu Markowitz optimization.
 *
 * Orientation: `returns` is ASSET-MAJOR — returns[i] is the full return time
 * series for asset (play) i, so returns.length = N (number of assets) and
 * every returns[i].length must equal the same n (number of aligned
 * observations).
 *
 * Method (standard LW04 formulas, matching the widely-used
 * sklearn.covariance.ledoit_wolf_shrinkage reference implementation):
 *
 *  - Demean each series, compute the sample covariance S with population
 *    (1/n) scaling: S_ij = (1/n) * sum_t x_i,t * x_j,t.
 *  - mu = trace(S) / N (the target's common diagonal value).
 *  - gammaHat = || S - mu*I ||_F^2 / N — the squared Frobenius distance from
 *    S to the target, normalized by N (how far the sample already is from
 *    the target, i.e. how much shrinkage COULD help).
 *  - piHat = (1/(N*n)) * sum_{i,j} [ (1/n) sum_t (x_i,t * x_j,t)^2 - S_ij^2 ]
 *    — the average estimation-noise variance of each entry of S (how much
 *    shrinkage SHOULD help, given how noisy S itself is).
 *  - delta = clamp(min(piHat, gammaHat) / gammaHat, 0, 1), and delta = 0
 *    when gammaHat = 0 (S already equals the target exactly, so there is
 *    nothing to shrink and no division to perform).
 *  - cov = (1 - delta) * S + delta * mu * I.
 *
 * Guards: throws RangeError when N = 0 (no asset series) or when any series
 * has fewer than 2 observations (n < 2 — a sample covariance is undefined
 * with fewer than 2 points), or when the series are not all the same length
 * (unaligned observations).
 */
export function ledoitWolfShrinkCovariance(returns: readonly (readonly number[])[]): LedoitWolfResult {
  const N = returns.length;
  if (N === 0) {
    throw new RangeError("returns must contain at least one asset series (got N=0)");
  }
  const n = returns[0]!.length;
  if (n < 2) {
    throw new RangeError(`each return series needs at least 2 aligned observations (got n=${n})`);
  }
  for (const series of returns) {
    if (series.length !== n) {
      throw new RangeError("all return series must be the same length (aligned observations)");
    }
  }

  // Demean each asset's series.
  const means: number[] = returns.map((series) => series.reduce((sum, x) => sum + x, 0) / n);
  const x: number[][] = returns.map((series, i) => series.map((v) => v - means[i]!));

  // Sample covariance S (population scaling, 1/n), symmetric by construction.
  const S: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += x[i]![t]! * x[j]![t]!;
      s /= n;
      S[i]![j] = s;
      S[j]![i] = s;
    }
  }

  let traceS = 0;
  for (let i = 0; i < N; i++) traceS += S[i]![i]!;
  const mu = traceS / N;

  // gammaHat: squared Frobenius distance from S to the target mu*I, per asset.
  let gammaHat = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const target = i === j ? mu : 0;
      const diff = S[i]![j]! - target;
      gammaHat += diff * diff;
    }
  }
  gammaHat /= N;

  // piHat: average per-entry estimation-noise variance of S.
  let piHat = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let sumSqProd = 0;
      for (let t = 0; t < n; t++) {
        const prod = x[i]![t]! * x[j]![t]!;
        sumSqProd += prod * prod;
      }
      const sij = S[i]![j]!;
      piHat += sumSqProd / n - sij * sij;
    }
  }
  piHat /= N * n;

  const piHatNonNeg = Math.max(0, piHat);
  const betaHat = Math.min(piHatNonNeg, gammaHat);
  const delta = gammaHat > 0 ? clamp01(betaHat / gammaHat) : 0;

  const cov: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const target = i === j ? mu : 0;
      cov[i]![j] = (1 - delta) * S[i]![j]! + delta * target;
    }
  }

  return { cov, delta };
}

/**
 * The self-disarming multiplier mu_used. Until realized closing-line-value
 * correlation is established over a real, graded sample, this returns
 * exactly 0 — and because every stake in `portfolioKellyStakes` is
 * multiplied by this value, the system stakes ~NOTHING until that trust is
 * earned. This is the handoff's self-disarm requirement, implemented as
 * arithmetic rather than a policy note.
 *
 * Returns 0 when rhoClv is null (no CLV correlation has been measured yet)
 * or NaN (a corrupted/unset measurement, treated the same as "no
 * measurement" rather than silently propagating NaN through every stake),
 * or when settledCount < minSettled (default 50, the handoff's "~50-100
 * settled bets" floor). Otherwise returns rhoClv clamped to [0, 1] — a
 * negative realized correlation disarms just as hard as no measurement at
 * all (clamped to 0), and a correlation above 1 (numerically impossible for
 * a real correlation coefficient, but guarded anyway) is capped at 1.
 */
export function clvDeflator(rhoClv: number | null, settledCount: number, minSettled: number = DEFAULT_MIN_SETTLED): number {
  if (rhoClv === null || Number.isNaN(rhoClv)) return 0;
  if (settledCount < minSettled) return 0;
  return clamp01(rhoClv);
}

export interface PortfolioKellyArgs {
  /** Measured edges (p - breakeven), one per play. */
  readonly edges: readonly number[];
  /** Standard error of each measured edge, aligned with `edges`. */
  readonly se: readonly number[];
  /** Decimal odds offered for each play, aligned with `edges`. */
  readonly decimalOdds: readonly number[];
  /** Caller-calibrated win probability for each play, aligned with `edges`. */
  readonly probs: readonly number[];
  /** Optional per-play historical return series (asset-major, see
   * ledoitWolfShrinkCovariance) used to apply the correlation penalty. When
   * omitted, no correlation penalty is applied. */
  readonly returnsHistory?: readonly (readonly number[])[];
  /** Kelly fraction; defaults to DEFAULT_LAMBDA (0.3). */
  readonly lambda?: number;
  /** Realized CLV correlation, or null if not yet measured. */
  readonly rhoClv: number | null;
  /** Number of settled bets behind `rhoClv`. */
  readonly settledCount: number;
}

export interface PortfolioKellyDiagnostics {
  /** Edges after the James-Stein haircut (see jamesSteinShrink). */
  readonly shrunkEdges: number[];
  /** The clvDeflator multiplier actually applied to every stake. */
  readonly deflator: number;
  /** Ledoit-Wolf shrinkage intensity from the correlation penalty step, or
   * null when returnsHistory was not supplied. */
  readonly lwDelta: number | null;
}

export interface PortfolioKellyResult {
  readonly stakes: number[];
  readonly diagnostics: PortfolioKellyDiagnostics;
}

/**
 * The full portfolio Kelly pipeline (handoff §2 Phase 1). Composes all four
 * defenses described in the module header, in order:
 *
 *  1. James-Stein shrink the raw `edges` (the edge haircut).
 *  2. Recompute each play's implied probability from the CALIBRATED prob the
 *     caller supplied, adjusted by exactly the shrinkage haircut:
 *     p'_i = probs_i - (edges_i - shrunkEdges_i). This is algebraically the
 *     same haircut as applying the shrinkage ratio directly to the edge
 *     (p'_i = q_i + shrunkEdge_i where q_i would be the breakeven
 *     probability), but is anchored on the caller's own calibrated `probs`
 *     rather than re-deriving a devig-free q from decimalOdds, since the
 *     caller's probs are the actual sizing input and may already reflect
 *     calibration beyond a simple 1/decimalOdds baseline. p'_i is clamped
 *     into (0, 1) with a tiny numerical margin (PROB_EPSILON) purely so a
 *     pathological input disarms toward a near-zero stake through
 *     fractionalKellyStake's floor instead of throwing.
 *  3. Fractional Kelly stake per play from p'_i (fractionalKellyStake).
 *  4. IF returnsHistory is supplied: a conservative correlation penalty
 *     using Ledoit-Wolf-shrunk covariance — stake_i *= 1 / (1 + sum_j!=i
 *     |corr_ij|). This is deliberately NOT full Markowitz Sigma^-1 mu
 *     optimization; per the handoff (§5), inverse-covariance estimation
 *     error is itself the danger at realistic sample sizes, so this module
 *     only ever discounts co-linear stakes, never re-weights or inverts.
 *  5. Multiply every stake by clvDeflator(rhoClv, settledCount) — the
 *     self-disarm. When the deflator is 0, every returned stake is exactly
 *     0.
 *  6. Total stake cap: if the deflated stakes sum to more than lambda * 2,
 *     rescale all of them proportionally so the sum equals lambda * 2.
 *
 * Guard: edges, se, decimalOdds, and probs must all be the same length, and
 * returnsHistory (if supplied) must have exactly one series per play, or
 * this throws RangeError.
 */
export function portfolioKellyStakes(args: PortfolioKellyArgs): PortfolioKellyResult {
  const { edges, se, decimalOdds, probs, returnsHistory, rhoClv, settledCount } = args;
  const lambda = args.lambda ?? DEFAULT_LAMBDA;
  assertLambda(lambda);

  const k = edges.length;
  if (se.length !== k || decimalOdds.length !== k || probs.length !== k) {
    throw new RangeError(
      `edges, se, decimalOdds, and probs must all be the same length (got edges=${k}, se=${se.length}, decimalOdds=${decimalOdds.length}, probs=${probs.length})`,
    );
  }

  const shrunkEdges = jamesSteinShrink(edges, se);

  const rawStakes: number[] = new Array(k);
  for (let i = 0; i < k; i++) {
    const haircut = edges[i]! - shrunkEdges[i]!;
    const pPrime = Math.min(1 - PROB_EPSILON, Math.max(PROB_EPSILON, probs[i]! - haircut));
    rawStakes[i] = fractionalKellyStake(pPrime, decimalOdds[i]!, lambda);
  }

  let lwDelta: number | null = null;
  if (returnsHistory && returnsHistory.length > 0) {
    if (returnsHistory.length !== k) {
      throw new RangeError(
        `returnsHistory must have exactly one series per play (got ${returnsHistory.length} series for ${k} plays)`,
      );
    }
    const { cov, delta } = ledoitWolfShrinkCovariance(returnsHistory);
    lwDelta = delta;

    for (let i = 0; i < k; i++) {
      const varI = cov[i]![i]!;
      let corrSum = 0;
      for (let j = 0; j < k; j++) {
        if (j === i) continue;
        const varJ = cov[j]![j]!;
        const denom = Math.sqrt(varI * varJ);
        const corr = denom > 0 ? cov[i]![j]! / denom : 0;
        corrSum += Math.abs(corr);
      }
      rawStakes[i] = rawStakes[i]! / (1 + corrSum);
    }
  }

  const deflator = clvDeflator(rhoClv, settledCount);
  const deflated = rawStakes.map((s) => s * deflator);

  const total = deflated.reduce((sum, s) => sum + s, 0);
  const cap = lambda * 2;
  const stakes = total > cap && total > 0 ? deflated.map((s) => (s * cap) / total) : deflated;

  return {
    stakes,
    diagnostics: { shrunkEdges, deflator, lwDelta },
  };
}
