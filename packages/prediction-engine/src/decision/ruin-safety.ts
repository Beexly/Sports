// ============================================================
// Ruin gates and staking safety rails (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/** Discrete payoff distribution: value -> probability. */
export interface PayoffDist {
  value: number;
  prob: number;
}

/**
 * Adjustment coefficient R solving E[exp(-R X)] = 1 via bisection.
 * The Lundberg exponent for the ruin approximation
 * P_ruin(bankroll) ~= C * exp(-R * bankroll). For a positive-drift
 * payoff distribution with downside risk, R > 0; returns 0 when the
 * drift is non-positive (no positive root) or no crossing exists.
 */
export function adjustmentCoefficient(dist: PayoffDist[]): number {
  if (dist.length === 0) return 0;
  const mean = dist.reduce((a, x) => a + x.prob * x.value, 0);
  if (mean <= 0) return 0; // non-positive drift: no positive root
  // g(R) = E[exp(-R X)] - 1; g(0) = 0, g'(0) = -mean < 0, so g dips
  // negative then crosses back up through 0 at R > 0 (given
  // downside risk).
  const g = (r: number): number => {
    let s = 0;
    for (const { value, prob } of dist) s += prob * Math.exp(-r * value);
    return s - 1;
  };
  let lo = 0;
  let hi = 1;
  while (g(hi) < 0) {
    hi *= 2;
    if (hi > 1e6) return 0; // no crossing (e.g., no downside risk)
  }
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (g(m) < 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * Payoff-aware gambler's ruin gate (1209.4203, "Gambler's ruin
 * probability - a general formula").
 *
 * Discretizes weekly settled P&L into units, estimates the empirical
 * payoff distribution {p_k} per market, and computes the ruin
 * probability via the Katriel-style adjustment-coefficient exponent
 * P_ruin ~= exp(-R * bankrollUnits) with R solving E[exp(-R X)] = 1.
 * Sizes weekly stake units so P_ruin(bankroll) <= 1%; recompute
 * monthly as {p_k} drifts (the recompute cadence is process, not
 * code). Reports skewness so the caller can check the paper's
 * materiality condition.
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if the empirical {p_k} is
 * materially asymmetric (skewness |gamma| > 0.3) AND the payoff-aware
 * P_ruin differs from the symmetric +-1 approximation by > 25%
 * relative; REJECT if root-finding is numerically unstable on real
 * data.
 */
export function payoffAwareRuinGate(
  dist: PayoffDist[],
  bankrollUnits: number,
  maxRuinProb = 0.01,
): { pRuin: number; passes: boolean; skewness: number } {
  const total = dist.reduce((a, d) => a + d.prob, 0);
  const norm = total > 0 ? dist.map((d) => ({ ...d, prob: d.prob / total })) : dist;
  const mean = norm.reduce((a, d) => a + d.value * d.prob, 0);
  const variance = norm.reduce((a, d) => a + d.prob * (d.value - mean) ** 2, 0);
  const sd = Math.sqrt(Math.max(variance, 1e-300));
  const skewness =
    norm.reduce((a, d) => a + d.prob * ((d.value - mean) / sd) ** 3, 0);
  const r = adjustmentCoefficient(norm);
  const pRuin = r > 0 ? Math.exp(-r * bankrollUnits) : 1;
  return { pRuin: Math.min(pRuin, 1), passes: pRuin <= maxRuinProb, skewness };
}

/**
 * Streak-aware (correlated) ruin probability (2501.10302,
 * "Martingale Approach to Gambler's Ruin Problem for Correlated
 * Random Walks").
 *
 * Fits a 2-state Markov chain to weekly P&L signs (up/down with
 * transition probabilities pUpUp, pDownDown). The ruin exponent
 * theta > 0 is the Lundberg exponent of the Markov-modulated walk:
 * the theta with spectral radius of the twisted kernel
 * T(theta)_ij = P_ij * exp(-theta * x_j) equal to 1, found by
 * bisection; P_ruin ~= exp(-theta * bankroll). Positive persistence
 * (sticky streaks) raises ruin vs the comparable independent
 * positive-drift walk. Reduces to the i.i.d. ruin when the chain
 * has no persistence. Empty bankroll => ruin probability 1.
 *
 * ACCEPTANCE GATE (needs backtest): ADOPT if weekly signs show
 * significant persistence (|p - 1/2| > 0.05, binomial test) AND the
 * CRW theta differs from the i.i.d. value by > 20% relative;
 * REJECT if weekly signs are statistically independent.
 */
export function correlatedRuinProb(
  pUpUp: number,
  pDownDown: number,
  upPayoff: number,
  downPayoff: number,
  bankrollUnits: number,
): { pRuin: number; persistence: number } {
  const clamp = (x: number) => Math.min(Math.max(x, 1e-9), 1 - 1e-9);
  const a = clamp(pUpUp);
  const b = clamp(pDownDown);
  const persistence = (a + b) / 2 - 0.5; // 0 = independent
  if (bankrollUnits <= 0) return { pRuin: 1, persistence };
  // Stationary mean payoff; non-positive drift => ruin certain.
  const piUp = (1 - b) / Math.max(2 - a - b, 1e-9);
  const mean = piUp * upPayoff + (1 - piUp) * downPayoff;
  if (mean <= 0) return { pRuin: 1, persistence };
  // Twisted kernel T(theta)_ij = P_ij * exp(-theta * x_j), theta > 0.
  const spectralRadius = (theta: number): number => {
    const t11 = a * Math.exp(-theta * upPayoff);
    const t12 = (1 - a) * Math.exp(-theta * downPayoff);
    const t21 = (1 - b) * Math.exp(-theta * upPayoff);
    const t22 = b * Math.exp(-theta * downPayoff);
    const tr = t11 + t22;
    const det = t11 * t22 - t12 * t21;
    return (tr + Math.sqrt(Math.max(tr * tr - 4 * det, 0))) / 2;
  };
  // rho(0) = 1, rho'(0) = -mean < 0, so rho < 1 just above 0;
  // with downside risk rho -> infinity, giving a root theta > 0.
  let lo = 0;
  let hi = 1;
  while (spectralRadius(hi) < 1) {
    hi *= 2;
    if (hi > 1e6) return { pRuin: 0, persistence };
  }
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (spectralRadius(m) < 1) lo = m;
    else hi = m;
  }
  const theta = (lo + hi) / 2;
  return { pRuin: Math.min(Math.exp(-theta * bankrollUnits), 1), persistence };
}

/**
 * Survival clamp (2004.14048, "On Feedback Control in Kelly Betting:
 * An Approximation Approach").
 *
 * Any stake fraction (exact or approximate) is hard-clamped into
 * (-1/Xmax, 1/|Xmin|) from the bet's worst-case return before
 * serving: the paper's SAT_s safety invariant. Pure safety net.
 *
 * ACCEPTANCE GATE: ADOPT the clamp if it modifies 0% of current
 * production stakes (pure safety net, no behavior change) and the
 * coin-example unit test passes.
 */
export function survivalClamp(
  stakeFraction: number,
  worstWinReturn: number,
  worstLossReturn: number,
): number {
  const hi = worstWinReturn > 0 ? 1 / worstWinReturn : Infinity;
  const lo = worstLossReturn < 0 ? -1 / Math.abs(worstLossReturn) : -Infinity;
  return Math.min(Math.max(stakeFraction, lo), hi);
}

/**
 * Closed-form Kelly certification test (2412.14144, "Application of
 * the Kelly Criterion to Prediction Markets").
 *
 * Pre-bet validity gate: certify the stake is positive iff the edge
 * is positive (p > implied), and report the price-vs-resolved gap
 * diagnostics the paper's gap monitor needs: the gap itself and
 * whether the market sits in a wide-gap, low-liquidity tier (the
 * regime where the paper predicts edge concentrates).
 */
export function certifyKellyStake(
  p: number,
  decimalOdds: number,
  stake: number,
): { certified: boolean; edge: number; gap: number } {
  const implied = 1 / decimalOdds;
  const edge = p - implied;
  const gap = Math.abs(p - implied);
  const certified = (stake > 0) === edge > 0 || (stake === 0 && edge <= 0);
  return { certified, edge, gap };
}

/**
 * Gap-monitor flag: wide price gap in a low-liquidity tier.
 * The monitor's ADOPT gate is empirical (flagged high-gap markets
 * must show realized ROI significantly below average on held-out
 * data); this function only computes the flag.
 */
export function priceGapFlag(
  gap: number,
  liquidityTier: "high" | "medium" | "low",
  gapThreshold = 0.15,
): boolean {
  return liquidityTier === "low" && gap >= gapThreshold;
}

/**
 * No-progression guardrail (1807.11729, "Expectation of the Largest
 * bet size in Labouchere System").
 *
 * Policy, immediate: encodes the anti-progression theorem as a hard
 * rule - no staking rule whose bet size is a function of cumulative
 * recent losses (any loss-chasing progression: Labouchere,
 * Fibonacci, martingale) may be deployed. All sizing stays
 * edge-conditioned (fractional Kelly on calibrated probabilities),
 * where the paper's p > 1/2 regime is the analogue of positive
 * expected value. The infinite expected maximum bet without an edge
 * is the citable reason GSE's sizing never chases losses.
 */
export interface StakingRuleDescriptor {
  name: string;
  /** True if the stake size depends on cumulative recent losses. */
  dependsOnRecentLosses: boolean;
  /** True if the stake size depends on the calibrated edge. */
  dependsOnEdge: boolean;
}

export function assertNoProgression(
  rule: StakingRuleDescriptor,
): { allowed: boolean; reason: string } {
  if (rule.dependsOnRecentLosses) {
    return {
      allowed: false,
      reason: `rejected: stake size is a function of cumulative recent losses (anti-progression theorem, 1807.11729)`,
    };
  }
  if (!rule.dependsOnEdge) {
    return {
      allowed: false,
      reason: `rejected: stake size is not edge-conditioned`,
    };
  }
  return { allowed: true, reason: "edge-conditioned, no loss-chasing" };
}

/**
 * Finite bound on expected maximum bet (certification template,
 * 1807.11729).
 *
 * Change-of-measure sketch: for a stake cap c and per-bet win rate
 * p over a horizon of H bets, the expected maximum single stake is
 * bounded by c / (1 - (1-p)^H) under the stated assumptions
 * (constant p, bounded stakes). Returns null when the assumptions
 * are violated so the checklist REJECTs instead of certifying
 * vacuously.
 */
export function certifyMaxBetBound(
  stakeCap: number,
  winRate: number,
  horizon: number,
): { bound: number | null; assumptionsHold: boolean } {
  const assumptionsHold =
    stakeCap > 0 && winRate > 0 && winRate < 1 && horizon >= 1;
  if (!assumptionsHold) return { bound: null, assumptionsHold: false };
  const denom = 1 - Math.pow(1 - winRate, horizon);
  if (denom <= 0) return { bound: null, assumptionsHold: false };
  return { bound: stakeCap / denom, assumptionsHold: true };
}
