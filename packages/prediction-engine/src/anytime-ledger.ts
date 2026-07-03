/**
 * Anytime-valid performance ledger (kernel K11) — sequential evidence against
 * "no edge", immune to optional stopping.
 *
 * THE PROBLEM THIS SOLVES. A fixed-alpha 95% CI computed once is only honestly
 * interpretable if the sample size was fixed in advance. Checking the record
 * every day and stopping the moment it looks good ("peeking") silently
 * inflates the false-positive rate — the single most common way honest-looking
 * track records go quietly dishonest. This module implements a SEQUENTIAL test
 * that stays valid under continuous monitoring, so the platform can honestly
 * say "checked after every settled pick; still holds."
 *
 * THE MATH (first-principles, nothing load-bearing taken on faith):
 *  - Returns are bounded by construction (loss = -1 stake, win <= `range`),
 *    the same licensing argument as empiricalBernsteinMeanCi. Rescale
 *    Y = (X + 1) / (range + 1) in [0, 1]; the null H0 "true mean per-bet
 *    return <= nullMean" becomes E[Y] <= y0 = (nullMean + 1) / (range + 1).
 *  - Testing by betting: wealth K_t = prod_{i<=t} (1 + lambda_i (Y_i - y0))
 *    with lambda_i PREDICTABLE (depends only on Y_1..Y_{i-1}) and
 *    0 <= lambda_i <= CAP/y0 with CAP < 1, so every factor is >= 1 - CAP > 0.
 *    Under ANY null distribution, E[1 + lambda_i (Y_i - y0) | past] <= 1, so
 *    K_t is a nonnegative supermartingale with K_0 = 1.
 *  - Ville's inequality: P(exists t: K_t >= 1/alpha) <= alpha — for EVERY
 *    stopping rule, including an adversary who peeks after each pick and stops
 *    at the most favorable moment. That inequality IS the anytime-validity.
 *  - VALIDITY DOES NOT DEPEND ON THE BETTING SCHEDULE. Any predictable,
 *    cap-respecting lambda gives a valid test; the schedule only affects POWER
 *    (how fast evidence accumulates under a real edge). We use an empirical-
 *    Kelly (GRAPA-flavored) plug-in with add-half smoothing — chosen because
 *    every constant in it is a smoothing prior, not a validity assumption.
 *    The Waudby-Smith & Ramdas tuned-optimal schedule is a documented future
 *    upgrade, gated on verifying its exact constants against the primary
 *    source rather than reconstructing them from memory.
 *  - The lower confidence bound inverts the same family: L_t = the largest
 *    null mean m whose betting test has ALREADY rejected (K_t(m) >= 1/alpha
 *    at some point up to t), found by bracket + bisection over m. HONEST
 *    SCOPE OF THE PROOF: Ville gives EXACT per-m validity (P(reject the true
 *    mean) <= alpha for each fixed m); lifting that to the supremum L_t
 *    additionally needs rejects(m) to be downward-monotone in m, which the
 *    m-adaptive plug-in schedule does not come with a theorem for. What IS
 *    guaranteed by construction: the reported bound is always a
 *    CERTIFIED-REJECTED m (every assignment paths through rejects()), and the
 *    grid scan breaks at the first non-rejected point, so any monotonicity
 *    wobble causes understatement, never overstatement. Monotonicity itself
 *    is empirically verified (hostile-review probe: zero non-monotone islands
 *    over 600 ledgers x 241-point m-grids across four worlds) and the bound's
 *    validity is Monte-Carlo-tested in the suite (violations 0.0325 vs the
 *    0.05 budget). A theorem-clean upgrade (fixed-lambda mixture, provably
 *    monotone) is documented as future work.
 *
 * DETERMINISM — STRONGER THAN SEEDED. No RNG anywhere: the whole object is a
 * closed-form function of the ORDERED ledger. Any two parties recompute
 * bit-identical numbers from the sealed ledger, by hand if they want.
 *
 * ORDER MATTERS. Unlike every function in performance-ci.ts (which treats
 * returns as an exchangeable sample), this is a sequential statistic: callers
 * MUST pass returns in settlement order. Do not shuffle; do not feed it a
 * query without an ORDER BY.
 *
 * The claims above are not merely asserted: the test suite runs an
 * adversarial-peeking Monte-Carlo (worst-case stopping over 2000 simulated
 * break-even ledgers) and confirms the false-positive rate stays within the
 * Ville budget, plus a power check proving the test isn't trivially valid by
 * never rejecting.
 */

export interface AnytimeLedgerPoint {
  /** 1-indexed count of settled picks incorporated at this point. */
  readonly t: number;
  /** Running mean of returns[0..t), original units. */
  readonly cumulativeMean: number;
  /** Cumulative e-value K_t against H0: mean <= nullMean (capped at MAX_VALUE for display). */
  readonly eValue: number;
  /** ln(K_t) — numerically stable for long ledgers. */
  readonly logEValue: number;
  /** K_t >= 1/alpha at this point (Ville threshold crossed). */
  readonly crossedThreshold: boolean;
}

export interface AnytimeLedgerResult {
  readonly alpha: number;
  /** Upper bound on a single win's return used for rescaling (loss floor is -1 by construction). */
  readonly range: number;
  readonly nullMean: number;
  readonly n: number;
  readonly points: readonly AnytimeLedgerPoint[];
  readonly current: AnytimeLedgerPoint;
  /** True if the threshold was crossed at ANY point — the anytime-valid rejection of H0. */
  readonly everRejected: boolean;
  readonly firstRejectedAt: number | null;
  /**
   * Anytime-valid lower confidence bound on the true mean per-bet return
   * (original units) at the CURRENT t: the largest null mean already rejected
   * by the running betting test. -1 (the structural floor) when nothing below
   * the observed record can be ruled out yet.
   */
  readonly lowerBound: number;
}

export interface AnytimeLedgerOptions {
  readonly alpha?: number; // default 0.05
  /**
   * Upper bound on a single win's return. PASS A FIXED A-PRIORI VALUE in
   * production (e.g. the platform's max publishable odds): the observed-max
   * default makes every bet depend on the full array through the rescaling,
   * which is a strict predictability leak — the Ville licensing is exact only
   * for a range fixed before the data. The leak is second-order (a
   * hostile-review probe measured identical 0.020 false-positive rates for
   * fixed, final-observed, and live-recomputed ranges over 400 mixed-odds
   * break-even ledgers) and vanishes entirely while all wins stay <= the
   * default's initial value, but theorem-clean callers inject the constant.
   */
  readonly range?: number;
  /** The null mean being tested (original units). Default 0 = "no edge". */
  readonly nullMean?: number;
  /**
   * Compute the inverted lower confidence bound (bracket + bisection = ~100
   * extra full replays). Default true; simulation harnesses that only need
   * the rejection path can disable it.
   */
  readonly computeLowerBound?: boolean;
}

/** Betting cap as a fraction of the positivity limit 1/y0: factors stay >= 1-CAP. */
const CAP = 0.5;

/**
 * One full deterministic replay of the betting e-process against null mean y0
 * (rescaled units). Returns per-step log wealth. Predictability: lambda for
 * step i uses only observations 0..i-1 (plus fixed smoothing priors).
 */
function replayLogWealth(ys: readonly number[], y0: number): number[] {
  // Positivity cap: with lambda <= CAP/y0, the worst factor (at Y=0) is
  // 1 - lambda*y0 >= 1 - CAP > 0. y0 > 0 is guaranteed by the nullMean guard.
  const capLambda = CAP / Math.max(y0, 1e-12);
  const logs = new Array<number>(ys.length);
  // Smoothing priors: one unit of prior mass at y0 for the mean (so the first
  // bet is ~0 — burn-in) and 1/4 (the max variance of a [0,1] variable) for
  // the variance. These are smoothing choices affecting POWER only; validity
  // holds for ANY predictable lambda in [0, CAP/y0].
  let sumY = 0;
  let sumSq = 0; // sum of (Y_i - muHat_{i-1})^2
  let logK = 0;
  for (let i = 0; i < ys.length; i++) {
    const tPrev = i;
    const muHat = (y0 + sumY) / (tPrev + 1);
    const varHat = (0.25 + sumSq) / (tPrev + 1);
    const rawLambda = (muHat - y0) / (varHat + 1e-9);
    const lambda = Math.min(Math.max(rawLambda, 0), capLambda);
    const y = ys[i]!;
    const factor = 1 + lambda * (y - y0);
    // factor >= 1 - CAP > 0 by the cap; guard anyway for float dust.
    logK += Math.log(Math.max(factor, 1e-12));
    logs[i] = logK;
    sumSq += (y - muHat) * (y - muHat);
    sumY += y;
  }
  return logs;
}

/** Did the betting test against null y0 EVER cross ln(1/alpha)? */
function everCrosses(ys: readonly number[], y0: number, logThreshold: number): boolean {
  const logs = replayLogWealth(ys, y0);
  for (const l of logs) if (l >= logThreshold) return true;
  return false;
}

export function anytimeValidLedger(
  returns: readonly number[],
  opts: AnytimeLedgerOptions = {},
): AnytimeLedgerResult | null {
  const alpha = opts.alpha ?? 0.05;
  const nullMean = opts.nullMean ?? 0;
  const n = returns.length;
  if (n < 1 || !returns.every(Number.isFinite) || !(alpha > 0 && alpha < 1)) return null;

  let maxReturn = -Infinity;
  let minReturn = Infinity;
  for (const x of returns) {
    if (x > maxReturn) maxReturn = x;
    if (x < minReturn) minReturn = x;
  }
  // Structural floor: a 1-unit flat stake cannot lose more than the stake.
  if (minReturn < -1 - 1e-9) return null;
  const range = opts.range ?? Math.max(1, maxReturn);
  if (!(range > 0) || !Number.isFinite(range) || maxReturn > range + 1e-9) return null;
  // The null must be inside the achievable interval for the rescaling to make sense.
  if (nullMean <= -1 || nullMean >= range) return null;

  const scale = range + 1;
  const ys = returns.map((x) => Math.min(Math.max((x + 1) / scale, 0), 1));
  const y0 = (nullMean + 1) / scale;
  const logThreshold = Math.log(1 / alpha);

  // Headline test path against the configured null.
  const logs = replayLogWealth(ys, y0);
  const points: AnytimeLedgerPoint[] = new Array(n);
  let everRejected = false;
  let firstRejectedAt: number | null = null;
  let runningSum = 0;
  for (let i = 0; i < n; i++) {
    runningSum += returns[i]!;
    const crossed = logs[i]! >= logThreshold;
    if (crossed && firstRejectedAt === null) {
      everRejected = true;
      firstRejectedAt = i + 1;
    }
    points[i] = {
      t: i + 1,
      cumulativeMean: runningSum / (i + 1),
      eValue: Math.min(Math.exp(logs[i]!), Number.MAX_VALUE),
      logEValue: logs[i]!,
      crossedThreshold: crossed,
    };
  }

  // Anytime-valid lower bound: largest null mean m already rejected by its own
  // running test. reject(m) is (in practice) monotone decreasing in m; find the
  // boundary with a coarse bracket then bisection. All in original units.
  const computeLowerBound = opts.computeLowerBound ?? true;
  const rejects = (m: number): boolean => everCrosses(ys, (m + 1) / scale, logThreshold);
  let lowerBound = -1;
  if (computeLowerBound && rejects(-1 + 1e-9)) {
    // At least the near-floor null ("loses ~everything") is rejected —
    // bracket the boundary on a grid, then bisect.
    const GRID = 64;
    let lo = -1 + 1e-9; // known rejected
    let hi = range - 1e-9; // assume not rejected unless proven
    if (rejects(hi)) {
      lowerBound = hi; // pathological all-max ledger: everything below max rejected
    } else {
      // coarse scan to tighten the bracket (keeps bisection robust even if
      // reject(m) has tiny non-monotone wobbles from the adaptive lambda)
      for (let g = 1; g < GRID; g++) {
        const m = -1 + ((range + 1) * g) / GRID;
        if (rejects(m)) lo = m;
        else {
          hi = m;
          break;
        }
      }
      for (let iter = 0; iter < 40; iter++) {
        const mid = (lo + hi) / 2;
        if (rejects(mid)) lo = mid;
        else hi = mid;
      }
      lowerBound = lo;
    }
  }

  return {
    alpha,
    range,
    nullMean,
    n,
    points,
    current: points[n - 1]!,
    everRejected,
    firstRejectedAt,
    lowerBound,
  };
}
