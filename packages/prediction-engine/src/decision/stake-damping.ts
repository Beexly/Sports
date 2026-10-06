// ============================================================
// Stake damping and friction-aware sizing (DECIDE bucket, additive)
//
// Pure functions adapted from arXiv ledgers. Not wired into any
// publish path; activation is a later human call. Backtest-dependent
// gates are documented, not claimed.
// ============================================================

/**
 * Epsilon-damped stake update (1009.3753, "Transaction fees and
 * optimal rebalancing in the growth-optimal portfolio").
 *
 * Replaces full Kelly stake rebalancing with
 *   s_t = s_{t-1} + epsilon * (s*_t - s_{t-1})
 * so stake churn after wins/losses no longer pays the vig-driven
 * friction that makes full rebalancing growth-suboptimal.
 *
 * ACCEPTANCE GATE (needs backtest grid on terminal log growth net of
 * vig): ADOPT epsilon-damping if the tuned epsilon < 1 beats
 * epsilon = 1 on net terminal log growth by >= 2% annualized;
 * REJECT if epsilon = 1 wins.
 */
export function epsilonDampedStake(
  prevStake: number,
  targetStake: number,
  epsilon: number,
): number {
  const e = Math.min(Math.max(epsilon, 0), 1);
  return prevStake + e * (targetStake - prevStake);
}

/**
 * Grid-select the damping epsilon from backtest net log-growth
 * results (pure argmax over supplied results; the grid itself runs
 * offline).
 */
export function selectDampingEpsilon(
  results: { epsilon: number; netLogGrowth: number }[],
): number {
  if (results.length === 0) return 1;
  let best = results[0]!;
  for (const r of results) if (r.netLogGrowth > best.netLogGrowth) best = r;
  return best.epsilon;
}

/** Stop-loss scaling inputs (1311.2550v2). */
export interface StopLossInput {
  /** Current bankroll. */
  bankroll: number;
  /** Monthly stop-loss level (absolute bankroll). */
  stopLevel: number;
  /** Days remaining to the monthly reset. */
  daysToReset: number;
  /** Time constant tau = 2/s^2. */
  tau: number;
  /** Unconstrained growth-optimal (Kelly) stake. */
  kellyStake: number;
  /** Sit-out threshold: freeze (return 0) when u falls below this. */
  sitOutThreshold?: number;
}

/**
 * Stop-loss-scaled Kelly stake (1311.2550v2, "The Kelly growth
 * optimal strategy with a stop-loss rule").
 *
 * Multiplies the growth-optimal stake by u(z, theta), using the
 * cheap long-horizon asymptote u ~ 1 - z with z = stop/bankroll and
 * theta = daysToReset/tau. Stakes shrink smoothly as the bankroll
 * approaches the monthly stop-loss delta; when u falls below the
 * sit-out threshold, stakes freeze (0) instead of dripping
 * micro-stakes.
 *
 * ACCEPTANCE GATE (needs replay): accept if stop-loss Kelly achieves
 * >= 95% of free-Kelly log growth while cutting stop-hit frequency
 * by >= 50% and never underperforming free Kelly's max drawdown.
 */
export function stopLossScaledStake(input: StopLossInput): number {
  const { bankroll, stopLevel, kellyStake } = input;
  const threshold = input.sitOutThreshold ?? 0.05;
  if (bankroll <= 0 || kellyStake <= 0) return 0;
  const z = stopLevel / bankroll;
  // Long-horizon asymptote u ~ 1 - z (theta enters the exact form;
  // the asymptote is z-only, which is the documented cheap version).
  const u = Math.max(0, 1 - z);
  if (u < threshold) return 0; // sit-out rule: freeze, don't drip
  return kellyStake * u;
}

/**
 * Adaptive risk-aversion dial (2503.17927, "Optimal Betting: Beyond
 * the Long-Term Growth").
 *
 * Refit gamma each week to maximize trailing-8-week realized Sharpe:
 * pure argmax over the supplied (gamma, sharpe) pairs so the sizer
 * automatically de-risks when edge estimates are miscalibrated in
 * the current regime.
 *
 * ACCEPTANCE GATE (needs 2025-2026 replay): ADOPT if some gamma > 0
 * achieves realized Sharpe >= half-Kelly's with realized growth
 * within 5% of half-Kelly's; otherwise REJECT.
 */
export function selectAdaptiveGamma(
  candidates: { gamma: number; trailingSharpe: number }[],
): number {
  if (candidates.length === 0) return 0.5;
  let best = candidates[0]!;
  for (const c of candidates) if (c.trailingSharpe > best.trailingSharpe) best = c;
  return best.gamma;
}

/**
 * Cubic Lambda_j shrinkage for simultaneous singles (2603.09947v1
 * lane, paper "Optimal Parlay Wagering and Whitrow Asymptotics",
 * 2603.26620).
 *
 * Isolated-Kelly stakes ignore simultaneity and overbet; the cubic
 * correction shrinks each stake:
 *   s_j' = s_j * max(0, 1 - Lambda_j * s_j^2)
 * The active-leg criterion drops legs with non-positive isolated
 * Kelly fractions (they may not appear on a parlay menu either).
 *
 * ACCEPTANCE GATE (needs 2025-2026 replay): ADOPT if the
 * Lambda_j-shrinkage replay cuts max drawdown >= 10% versus naive
 * isolated-Kelly stakes with final bankroll within 2%; otherwise
 * REJECT.
 */
export function lambdaShrunkStakes(
  isolatedStakes: number[],
  lambdas: number[],
): { stakes: number[]; activeLegs: boolean[] } {
  const n = isolatedStakes.length;
  const stakes = new Array(n).fill(0);
  const activeLegs = new Array(n).fill(false);
  for (let j = 0; j < n; j++) {
    const s = isolatedStakes[j]!;
    const lam = lambdas[j] ?? 0;
    if (s <= 0) continue; // active-leg criterion: inactive leg
    activeLegs[j] = true;
    stakes[j] = s * Math.max(0, 1 - lam * s * s);
  }
  return { stakes, activeLegs };
}

/** Standard normal CDF (Abramowitz-Stegun 7.1.26, |err| < 7.5e-8). */
export function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/**
 * Delta/sigma gate for stakes (2312.10331, "Gambling under unknown
 * probabilities as a proxy for real world decisions under
 * uncertainty").
 *
 * sigma = per-market RMSE of engine win-prob vs realized outcomes on
 * a rolling window (the calibration curve's RMSE). For each pick with
 * perceived edge delta_perc = p_engine - p_market, stake only if
 * E[growth] > 0 with margin (delta_perc > 1.5 sigma), and scale the
 * Kelly fraction by Phi(delta_perc / sigma): the probability the
 * perceived edge has the right sign.
 *
 * ACCEPTANCE GATE (needs 2023-2025 replay): ADOPT if gated Kelly
 * beats ungated Kelly on terminal log growth with max drawdown no
 * worse, improvement concentrated where delta_perc/sigma < 1.5;
 * REJECT if the gate just throws away good bets.
 */
export function deltaSigmaStake(
  kellyStake: number,
  deltaPerc: number,
  sigma: number,
): number {
  if (kellyStake <= 0 || sigma <= 0) return 0;
  if (deltaPerc <= 1.5 * sigma) return 0; // gate: no stake
  return kellyStake * normalCdf(deltaPerc / sigma);
}

/**
 * Uncertainty-haircut fraction (2604.25280v1, "The optimal betting
 * wealth growth rate").
 *
 * Replaces the arbitrary 0.25/0.5 fractional-Kelly multiplier with a
 * principled haircut derived from the KL gap: let edgeKL =
 * D(p-hat || q) be the engine's edge and infKL the infimum KL over
 * the uncertainty class (p-hat +/- calibration error bars). The
 * haircut (fraction of the Kelly stake to CUT) is infKL/edgeKL,
 * clamped to [0, 1]: zero cut when the uncertainty interval contains
 * the market probability (no evidence the edge is miscalibrated),
 * strictly between 0 and 1 when the interval excludes the market,
 * approaching 1 as the interval moves far from the market. Sizing
 * applies in weekly slate blocks rather than per game.
 *
 * ACCEPTANCE GATE (needs 2024 replay): ADOPT if the haircut achieves
 * >= 90% of full Kelly's log-growth with <= 70% of its max drawdown.
 */
export function uncertaintyHaircut(
  pHat: number,
  marketProb: number,
  calibErrorBar: number,
): number {
  const clamp = (x: number) => Math.min(Math.max(x, 1e-9), 1 - 1e-9);
  const q = clamp(marketProb);
  const kl = (p: number): number => {
    const pc = clamp(p);
    return pc * Math.log(pc / q) + (1 - pc) * Math.log((1 - pc) / (1 - q));
  };
  const edgeKL = kl(pHat);
  if (edgeKL <= 1e-12) return 0;
  // Infimum KL over [pHat - bar, pHat + bar]: KL is convex in p with
  // minimum at p = q, so the infimum is at the endpoint nearest q.
  const lo = pHat - calibErrorBar;
  const hi = pHat + calibErrorBar;
  const nearest = q < lo ? lo : q > hi ? hi : q;
  const infKL = kl(nearest);
  return Math.min(1, Math.max(0, infKL / edgeKL));
}
