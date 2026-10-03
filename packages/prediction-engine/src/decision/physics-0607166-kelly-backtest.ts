// ============================================================
// Fractional-Kelly staking backtest (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: physics/0607166 — "Kelly Criterion revisited: optimal bets"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the Kelly criterion revisited for optimal bets — the
 * staking module takes the engine's win probability p-hat per pick plus
 * the de-vigged market-implied probability q and decimal odds b, and sizes
 * stakes by the fractional-Kelly fraction f = (p̂·b − 1)/(b − 1) (half
 * Kelly in the backtest). The paper's parimutuel formulas are NOT
 * adopted (wrong market structure for US books); only the fixed-odds
 * Kelly sizing is used.
 *
 * IMPROVEMENT (from ledger): Add a staking module to the Sports repo taking the engine's win probability p-hat per pick plus the de-vigged market-implied probability q and decimal odds b as inputs, run a 1/2-Kelly backtest on the engine's historical picks, and wire fractional-Kelly units into the posted-pick pipeline if the backtest passes.
 *
 * ACCEPTANCE GATE: ADAPT if the 1/2-Kelly backtest on the engine's historical picks shows log-wealth >= flat staking with no worse max drawdown - then wire fractional-Kelly units into the posted-pick pipeline; reject the sizing layer (keep flat units) if Kelly underperforms flat or if realized edge is too noisy for stable stakes (stake variance > 3x flat). The paper's parimutuel formulas themselves are NOT adopted (wrong market structure for US books).
 */

/** Full-Kelly fraction for decimal odds b and win probability p. */
export function kellyFraction(p: number, b: number): number {
  if (b <= 1) return 0;
  return Math.max(0, (p * b - 1) / (b - 1));
}

/** Edge of the engine probability over the de-vigged market probability. */
export function probEdge(pHat: number, q: number): number {
  return pHat - q;
}

export interface BacktestPick {
  pHat: number;
  /** De-vigged market-implied probability. */
  q: number;
  /** Decimal odds. */
  b: number;
  won: boolean;
}

export interface BacktestResult {
  stakes: number[];
  logWealth: number;
  maxDrawdown: number;
  stakeVariance: number;
}

/** 1/2-Kelly backtest over historical picks. */
export function halfKellyBacktest(picks: BacktestPick[]): BacktestResult {
  const stakes = picks.map((pk) => 0.5 * kellyFraction(pk.pHat, pk.b));
  return backtestFromStakes(picks, stakes);
}

/** Flat staking backtest over the same picks (unitSize defaults to 1 unit). */
export function flatBacktest(picks: BacktestPick[], unitSize = 1): BacktestResult {
  return backtestFromStakes(picks, picks.map(() => unitSize));
}

function backtestFromStakes(picks: BacktestPick[], stakes: number[]): BacktestResult {
  let wealth = 1;
  let peak = 1;
  let maxDrawdown = 0;
  for (let i = 0; i < picks.length; i++) {
    const pk = picks[i]!;
    const ret = pk.won ? stakes[i]! * (pk.b - 1) : -stakes[i]!;
    wealth = Math.max(wealth * (1 + ret), 1e-12);
    if (wealth > peak) peak = wealth;
    maxDrawdown = Math.max(maxDrawdown, 1 - wealth / peak);
  }
  const mean = stakes.reduce((a, b) => a + b, 0) / Math.max(stakes.length, 1);
  const stakeVariance =
    stakes.reduce((a, s) => a + (s - mean) * (s - mean), 0) / Math.max(stakes.length, 1);
  return { stakes, logWealth: Math.log(wealth), maxDrawdown, stakeVariance };
}

export interface KellyBacktestGate {
  logWealthLift: number;
  drawdownNoWorse: boolean;
  stakeNoiseOk: boolean;
  passes: boolean;
}

/**
 * Acceptance-gate helper: 1/2-Kelly log-wealth ≥ flat with no worse max
 * drawdown; reject if stakes are too noisy — stake variance (relative to
 * squared mean stake, since flat stakes have zero variance) above 3.
 */
export function kellyBacktestGatePasses(
  kelly: BacktestResult,
  flat: BacktestResult,
): KellyBacktestGate {
  const logWealthLift = kelly.logWealth - flat.logWealth;
  const drawdownNoWorse = kelly.maxDrawdown <= flat.maxDrawdown + 1e-12;
  const meanStake = kelly.stakes.reduce((a, b) => a + b, 0) / Math.max(kelly.stakes.length, 1);
  const relVariance =
    meanStake > 0 ? kelly.stakeVariance / (meanStake * meanStake) : 0;
  const stakeNoiseOk = relVariance <= 3;
  return {
    logWealthLift,
    drawdownNoWorse,
    stakeNoiseOk,
    passes: logWealthLift >= 0 && drawdownNoWorse && stakeNoiseOk,
  };
}
