/**
 * Dynamic risk budgeting via expected shortfall — arXiv 2406.02141
 * ("Dynamic Risk Budgeting with Expected Shortfall Constraints...").
 *
 * ADDITIVE utility. Not wired into any staking path (wiring changes real
 * stakes and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: replace the fixed fractional-Kelly stake scale with a
 * dynamic risk budget. The budget expands/contracts with (a) the trailing
 * CVaR_0.25 of the P&L stream relative to its target and (b) edge
 * volatility (stdev of CLV per pick): strong realized tail + stable edge ->
 * larger budget; weak tail or volatile edge -> smaller budget. Stakes are
 * then allocated across the week's slate proportional to edge subject to
 * the budget (documented; allocation stays in the sizing module).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT iff on the 2022-2025
 * walk-forward the dynamic budget beats fixed fractional Kelly on
 * risk-adjusted return (final bankroll / max drawdown) by >=10% relative
 * with max drawdown <= 1.1x the fixed-Kelly baseline's.
 */

/** Lower-tail CVaR of a sample (mean of the worst tau-fraction). */
export function trailingCvar(samples: readonly number[], tau: number): number {
  const t = Math.min(Math.max(tau, 0), 1);
  if (samples.length === 0) return 0;
  const s = [...samples].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(t * s.length));
  let sum = 0;
  for (let i = 0; i < k; i++) sum += s[i]!;
  return sum / k;
}

/** Edge volatility: stdev of per-pick CLV (in units). */
export function edgeVolatility(clvPerPick: readonly number[]): number {
  const n = clvPerPick.length;
  if (n < 2) return 0;
  const mean = clvPerPick.reduce((a, b) => a + b, 0) / n;
  let s = 0;
  for (const x of clvPerPick) s += (x - mean) * (x - mean);
  return Math.sqrt(s / (n - 1));
}

export interface RiskBudgetParams {
  readonly baseBudget: number;
  readonly cvarTarget: number;
  readonly volTarget: number;
  /** Sensitivity to CVaR deviation (default 0.5). */
  readonly kCvar?: number;
  /** Sensitivity to edge-vol deviation (default 0.5). */
  readonly kVol?: number;
  readonly minBudget?: number;
  readonly maxBudget?: number;
}

/**
 * Dynamic risk budget: expands when trailing CVaR beats its target,
 * contracts when edge volatility exceeds its target. Clamped to
 * [minBudget, maxBudget].
 */
export function dynamicRiskBudget(
  weeklyProfits: readonly number[],
  clvPerPick: readonly number[],
  params: RiskBudgetParams,
): number {
  const kCvar = params.kCvar ?? 0.5;
  const kVol = params.kVol ?? 0.5;
  const cvar = trailingCvar(weeklyProfits, 0.25);
  const vol = edgeVolatility(clvPerPick);
  const cvarTerm =
    params.cvarTarget !== 0
      ? 1 + kCvar * ((cvar - params.cvarTarget) / Math.abs(params.cvarTarget))
      : 1;
  const volTerm =
    params.volTarget > 0
      ? 1 - kVol * ((vol - params.volTarget) / params.volTarget)
      : 1;
  const budget = params.baseBudget * Math.max(cvarTerm, 0) * Math.max(volTerm, 0);
  const lo = params.minBudget ?? params.baseBudget * 0.25;
  const hi = params.maxBudget ?? params.baseBudget * 2;
  return Math.min(Math.max(budget, lo), hi);
}

/** Fractional Kelly stake for one pick (decimal odds). */
export function fractionalKellyStake(
  prob: number,
  decimalOdds: number,
  fraction: number,
  bankroll: number,
): number {
  const p = Math.min(Math.max(prob, 0), 1);
  const b = decimalOdds - 1;
  if (!(b > 0) || !(bankroll > 0)) return 0;
  const kelly = (p * b - (1 - p)) / b;
  return Math.max(0, kelly * fraction * bankroll);
}
