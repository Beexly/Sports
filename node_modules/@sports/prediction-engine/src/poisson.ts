// ============================================================
// Poisson goal-distribution model (v6.0.0)
//
// Classical sports-prediction approach (Maher 1982; Dixon & Coles
// 1997) treating each team's scoring as a Poisson process with rate
// λ. Once the two team-rates are known, the probability of any
// final score X-Y is:
//
//     P(X=x, Y=y) = e^(-λh) · λh^x / x! · e^(-λa) · λa^y / y!
//
// From the joint distribution we can derive:
//   - moneyline probability (sum P(home > away))
//   - over/under N probability (sum P(home + away > N))
//   - exact score grid (for "ladder" pricing on totals)
//
// IMPORTANT — IS NOT WIRED INTO THE LIVE SCORER YET.
//
// The Poisson model requires team-level scoring rates (λh, λa).
// Galaxy Sports Edge does NOT currently ingest team scoring
// averages, so this module exists as a future-ready helper. It is
// fully tested and mathematically correct, but the scoring engine
// does not call it until we add a team-rate ingestion adapter.
//
// Wiring it in prematurely would require synthesizing λ values —
// that violates the non-negotiable "no fabricated stats" rule.
// When real team-rate data lands, point `computePoissonTotalScore`
// at it from `scoring.ts` and add a new constant
// `WEIGHTS.POISSON_TOTAL_COMPONENT_MAX` (suggested initial: 8).
//
// References:
//   - Maher, M. J. (1982). "Modelling association football scores."
//     Statistica Neerlandica 36(3), 109–118.
//   - Dixon, M. J. & Coles, S. G. (1997). "Modelling association
//     football scores and inefficiencies in the football betting
//     market." Applied Statistics 46(2), 265–280.
//   - Tuan Nguyen-Doan, "O Jogo Bonito: Predicting the Premier
//     League with a random model" (Towards Data Science, 2018) —
//     practitioner-grade walkthrough of the Maher Poisson model.
// ============================================================

import type { IndependentMarketFairValue } from "@sports/types";

// ============================================================
// Runtime guard — refuse to participate in scoring without team
// rates. When `enforce` is true (default), throws if the helper
// is being called from a path that hasn't declared
// `TEAM_RATES_AVAILABLE=true`. Pure math helpers (factorial, pmf,
// cdf) are exempt because they have no scoring meaning on their
// own — only the *aggregation* functions check this.
//
// Set `TEAM_RATES_AVAILABLE=true` only after a real ingestion
// adapter for team scoring rates is wired in. The team-rates
// adapter does not yet exist; do not set this flag prematurely.
// ============================================================
export function assertTeamRatesAvailable(): void {
  if (process.env["NODE_ENV"] === "production" &&
      process.env["TEAM_RATES_AVAILABLE"] !== "true") {
    throw new Error(
      "Poisson scoring called without TEAM_RATES_AVAILABLE=true in " +
      "production. This prevents accidentally producing picks against " +
      "synthesized team-rate inputs. See packages/prediction-engine/" +
      "src/poisson.ts header comment for the wiring path."
    );
  }
}

// ============================================================
// Factorial — memoised. Goal counts in real sports rarely exceed
// 20 even in basketball/baseball totals decomposed by quarter,
// so a small cache is fine.
// ============================================================
const FACTORIAL_CACHE: Map<number, number> = new Map([
  [0, 1],
  [1, 1],
]);

export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new RangeError(`factorial requires a non-negative integer, got ${n}`);
  }
  const cached = FACTORIAL_CACHE.get(n);
  if (cached !== undefined) return cached;
  let result = FACTORIAL_CACHE.get(FACTORIAL_CACHE.size - 1) ?? 1;
  for (let i = FACTORIAL_CACHE.size; i <= n; i++) {
    result = result * i;
    FACTORIAL_CACHE.set(i, result);
  }
  return result;
}

// ============================================================
// Poisson probability mass function: P(X = k | λ)
// ============================================================
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0 || !Number.isFinite(lambda)) return 0;
  if (k < 0 || !Number.isInteger(k)) return 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

// ============================================================
// Poisson cumulative distribution: P(X <= k | λ)
// ============================================================
export function poissonCdf(k: number, lambda: number): number {
  if (lambda <= 0) return k >= 0 ? 1 : 0;
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += poissonPmf(i, lambda);
  }
  return Math.min(1, sum);
}

// ============================================================
// Compute joint matrix P(home=x, away=y) for x,y in [0, maxGoals]
// Returns a 2-D array, indexable as matrix[x][y].
// ============================================================
export function jointScoreMatrix(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number = 12
): number[][] {
  if (maxGoals < 0) throw new RangeError("maxGoals must be >= 0");
  const matrix: number[][] = [];
  const homePmfs: number[] = [];
  const awayPmfs: number[] = [];
  for (let i = 0; i <= maxGoals; i++) {
    homePmfs.push(poissonPmf(i, lambdaHome));
    awayPmfs.push(poissonPmf(i, lambdaAway));
  }
  for (let x = 0; x <= maxGoals; x++) {
    const row: number[] = [];
    for (let y = 0; y <= maxGoals; y++) {
      row.push((homePmfs[x] ?? 0) * (awayPmfs[y] ?? 0));
    }
    matrix.push(row);
  }
  return matrix;
}

// ============================================================
// Derived probability: P(home wins), P(draw), P(away wins).
// Returns probabilities that may sum to slightly less than 1
// when maxGoals truncates the tail — caller can normalise if needed.
// ============================================================
export function moneylineProbabilities(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals: number = 12
): { home: number; draw: number; away: number; coverage: number } {
  assertTeamRatesAvailable();
  const m = jointScoreMatrix(lambdaHome, lambdaAway, maxGoals);
  let home = 0;
  let draw = 0;
  let away = 0;
  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      const p = m[x]?.[y] ?? 0;
      if (x > y) home += p;
      else if (x === y) draw += p;
      else away += p;
    }
  }
  return { home, draw, away, coverage: home + draw + away };
}

// ============================================================
// Derived probability: P(home + away > totalLine).
// Returns { over, under, push } — push is the probability of
// landing exactly on an integer total line.
// ============================================================
export function overUnderProbabilities(
  lambdaHome: number,
  lambdaAway: number,
  totalLine: number,
  maxGoals: number = 12
): { over: number; under: number; push: number; coverage: number } {
  assertTeamRatesAvailable();
  const m = jointScoreMatrix(lambdaHome, lambdaAway, maxGoals);
  let over = 0;
  let under = 0;
  let push = 0;
  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      const p = m[x]?.[y] ?? 0;
      const total = x + y;
      if (total > totalLine) over += p;
      else if (total < totalLine) under += p;
      else push += p;
    }
  }
  return { over, under, push, coverage: over + under + push };
}

// ============================================================
// Sanity check function: are two Poisson rates internally
// consistent with a bookmaker's total line?
//
// Given the bookmaker's total T and the Poisson-implied total
// (λh + λa), returns a normalised divergence score where 0 means
// perfect agreement and 1 means total disagreement (capped).
// Useful as an FUTURE additional signal — high divergence may
// indicate a soft line or stale data.
// ============================================================
export function poissonConsistencyScore(
  lambdaHome: number,
  lambdaAway: number,
  bookmakerTotal: number
): number {
  if (lambdaHome <= 0 || lambdaAway <= 0 || bookmakerTotal <= 0) return 0;
  const poissonTotal = lambdaHome + lambdaAway;
  const ratio = Math.abs(poissonTotal - bookmakerTotal) / bookmakerTotal;
  // Normalise: a 5% divergence is "noticeable", a 25% divergence is "extreme"
  return Math.min(1, ratio / 0.25);
}

/**
 * Bridge the Poisson model into the engine's independent fair-value ("referee")
 * shape, alongside Elo/Kalshi/ML. Uses a draw-no-bet basis: reports
 * P(home | decisive) and P(away | decisive), conditioning out the draw so the
 * two sides sum to 1 and compare cleanly to a 2-way win market. In 2-outcome
 * sports draw≈0, so this collapses to the plain moneyline.
 *
 * Returns `homeFairProb`/`awayFairProb` in (0, 1), each rounded to 4 dp; the two
 * sum to 1 up to that rounding. Both are `null` when the model produces no
 * decisive mass (decisive = P(home) + P(away) == 0, e.g. non-positive λ inputs)
 * — the engine reads null as "no independent read", never as an implied 50/50.
 * These are structured, market-independent probabilities: nothing here reads the
 * sportsbook line, which is what makes this a valid independent cross-check in
 * the edge engine.
 *
 * Requires REAL team scoring rates: `moneylineProbabilities` runs the
 * `assertTeamRatesAvailable` guard, so in production this can never price
 * synthesized λ (upholds the non-negotiable no-fabricated-stats rule). See the
 * file header for why the module is not yet wired into the live scorer.
 *
 * `capturedAt` is provenance only: an ISO-8601 timestamp recording when the
 * estimate was materialised. It never affects any probability.
 *
 * Determinism seam: `options.now` is the SOLE non-deterministic input to this
 * otherwise pure module. When omitted it defaults to an argless `new Date()`,
 * reading the wall clock at call time, so two calls with identical rates emit
 * different `capturedAt` values. Deterministic/reproducible callers (and all
 * tests that assert on `capturedAt`) MUST inject `now`; the default is a
 * convenience escape hatch for ad-hoc use only, not for library/pipeline paths
 * that require byte-identical, replayable output.
 */
export function toPoissonFairValue(
  lambdaHome: number,
  lambdaAway: number,
  options: {
    /**
     * Truncation ceiling for the joint score grid; probability mass on scores
     * above this is dropped (the tail is negligible for realistic λ). Default 12.
     */
    readonly maxGoals?: number;
    /**
     * Clock supplying the provenance `capturedAt` stamp. Inject for determinism;
     * defaults to wall-clock time — see the determinism-seam note above.
     */
    readonly now?: () => Date;
  } = {}
): IndependentMarketFairValue {
  const { home, away } = moneylineProbabilities(lambdaHome, lambdaAway, options.maxGoals ?? 12);
  const decisive = home + away;
  const homeFairProb = decisive > 0 ? Number((home / decisive).toFixed(4)) : null;
  // Clock seam: `options.now` is injectable; the argless `new Date()` fallback is
  // this module's single non-deterministic path (see the determinism-seam note in
  // the JSDoc above). It stamps `capturedAt` provenance only — no probability reads it.
  const now = (options.now ?? (() => new Date()))();
  return {
    source: "poisson",
    homeFairProb,
    awayFairProb: homeFairProb != null ? Number((1 - homeFairProb).toFixed(4)) : null,
    capturedAt: now.toISOString(),
  };
}
