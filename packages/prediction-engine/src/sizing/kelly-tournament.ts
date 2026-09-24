
export interface BetResolution {
  /** Model win probability. */
  readonly p: number;
  /** Decimal odds. */
  readonly odds: number;
  readonly won: boolean;
}

/** Kelly stake fraction of bankroll for one bet: f* = (b p - q) / b, floored at 0. */
export function kellyFraction(p: number, odds: number): number {
  const b = odds - 1;
  if (!(b > 0)) throw new Error("kelly-tournament: odds must exceed 1");
  const pc = Math.min(Math.max(p, 0), 1);
  return Math.max(0, (b * pc - (1 - pc)) / b);
}

export interface TournamentResult {
  readonly fraction: number;
  readonly terminalWealth: number;
  readonly logGrowth: number;
  readonly maxDrawdown: number;
}

/** Simulate one Kelly-fraction bankroll path over bet resolutions. */
export function simulateKellyFraction(
  bets: readonly BetResolution[],
  kellyMultiple: number,
  bankroll0 = 1,
): TournamentResult {
  if (!(kellyMultiple >= 0)) throw new Error("kelly-tournament: multiple must be nonnegative");
  let wealth = bankroll0;
  let peak = bankroll0;
  let maxDd = 0;
  for (const bet of bets) {
    const f = Math.min(kellyFraction(bet.p, bet.odds) * kellyMultiple, 1);
    const b = bet.odds - 1;
    wealth *= bet.won ? 1 + b * f : 1 - f;
    peak = Math.max(peak, wealth);
    maxDd = Math.max(maxDd, 1 - wealth / peak);
    if (wealth <= 0) break;
  }
  return {
    fraction: kellyMultiple,
    terminalWealth: wealth,
    logGrowth: Math.log(Math.max(wealth / bankroll0, 1e-12)),
    maxDrawdown: maxDd,
  };
}

/** Tournament: pick the fraction with max log-growth among drawdown survivors. */
export function kellyTournament(
  bets: readonly BetResolution[],
  candidates: readonly number[],
  maxDrawdownCap = 0.3,
): TournamentResult {
  if (candidates.length === 0) throw new Error("kelly-tournament: need >= 1 candidate");
  const results = candidates.map((c) => simulateKellyFraction(bets, c));
  const survivors = results.filter((r) => r.maxDrawdown <= maxDrawdownCap);
  const pool = survivors.length > 0 ? survivors : results;
  return pool.reduce((best, r) => (r.logGrowth > best.logGrowth ? r : best));
}
