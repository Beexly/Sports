/**
 * Bet tracking and performance display utilities — pure, zero dependencies.
 *
 * Running P/L, unit tracking, ROI series, variance, Sharpe ratio,
 * streak analysis, and historical performance visualization helpers.
 * All calculations from provided bet data — no fabricated statistics.
 */

export type BetResult = "win" | "loss" | "push" | "no-action";

export interface Bet {
  readonly id: string;
  readonly result: BetResult;
  readonly stake: number; // in units (e.g., 1.0 = 1 unit)
  readonly decimalOdds: number; // e.g., 1.909 for -110
  readonly settledAt: number; // ms timestamp
}

export interface BetStats {
  readonly totalBets: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly winRate: number; // wins / (wins + losses), NaN if 0
  readonly roi: number; // net / totalStaked, NaN if 0
  readonly netUnits: number;
  readonly totalStaked: number;
  readonly avgOdds: number; // avg decimal odds on wins+losses
  readonly breakEvenWinRate: number; // needed to break even at avg odds
}

export interface PnlPoint {
  readonly betIndex: number;
  readonly cumulativeUnits: number;
  readonly runningRoi: number;
}

export interface DrawdownStats {
  readonly maxDrawdownUnits: number;
  readonly maxDrawdownPercent: number; // relative to peak bankroll
  readonly currentDrawdownUnits: number;
  readonly peakUnits: number;
  readonly currentUnits: number;
}

export interface SharpeResult {
  readonly sharpeRatio: number;
  readonly avgReturnPerBet: number;
  readonly stdDevPerBet: number;
}

/**
 * Profit from a single bet in units.
 * win: stake * (decimalOdds - 1)
 * loss: -stake
 * push / no-action: 0
 */
export function profitFromBet(bet: Bet): number {
  switch (bet.result) {
    case "win":
      return bet.stake * (bet.decimalOdds - 1);
    case "loss":
      return -bet.stake;
    case "push":
    case "no-action":
      return 0;
  }
}

/**
 * Compute all BetStats from an array of bets.
 * winRate = wins / (wins + losses) — NaN if no settled bets
 * roi = netUnits / totalStaked — NaN if totalStaked === 0
 * avgOdds = average decimal odds over wins + losses only
 * breakEvenWinRate = 1 / avgOdds (or NaN if no bets)
 */
export function calculateBetStats(bets: readonly Bet[]): BetStats {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let netUnits = 0;
  let totalStaked = 0;
  let oddsSum = 0;
  let oddsCount = 0;

  for (const bet of bets) {
    const profit = profitFromBet(bet);
    netUnits += profit;

    if (bet.result === "win") {
      wins++;
      totalStaked += bet.stake;
      oddsSum += bet.decimalOdds;
      oddsCount++;
    } else if (bet.result === "loss") {
      losses++;
      totalStaked += bet.stake;
      oddsSum += bet.decimalOdds;
      oddsCount++;
    } else if (bet.result === "push") {
      pushes++;
      // pushes return stake, not staked for ROI purposes
    }
    // no-action: no stake committed
  }

  const settled = wins + losses;
  const winRate = settled === 0 ? NaN : wins / settled;
  const roi = totalStaked === 0 ? NaN : netUnits / totalStaked;
  const avgOdds = oddsCount === 0 ? NaN : oddsSum / oddsCount;
  const breakEvenWinRate = oddsCount === 0 ? NaN : 1 / avgOdds;

  return {
    totalBets: bets.length,
    wins,
    losses,
    pushes,
    winRate,
    roi,
    netUnits,
    totalStaked,
    avgOdds,
    breakEvenWinRate,
  };
}

/**
 * Build cumulative P/L series (one point per bet, in chronological order).
 * Sort bets by settledAt before computing.
 * runningRoi = cumulativeUnits / totalStakedSoFar (NaN if 0)
 */
export function buildPnlSeries(bets: readonly Bet[]): PnlPoint[] {
  if (bets.length === 0) return [];

  const sorted = [...bets].sort((a, b) => a.settledAt - b.settledAt);
  const points: PnlPoint[] = [];

  let cumulativeUnits = 0;
  let totalStakedSoFar = 0;

  for (let i = 0; i < sorted.length; i++) {
    const bet = sorted[i];
    if (bet === undefined) continue;
    cumulativeUnits += profitFromBet(bet);
    if (bet.result === "win" || bet.result === "loss") {
      totalStakedSoFar += bet.stake;
    }
    const runningRoi =
      totalStakedSoFar === 0 ? NaN : cumulativeUnits / totalStakedSoFar;

    points.push({
      betIndex: i,
      cumulativeUnits,
      runningRoi,
    });
  }

  return points;
}

/**
 * Track peak bankroll (in units) over bets, compute max drawdown.
 * maxDrawdownUnits = max(peak - trough) over the series
 * maxDrawdownPercent = maxDrawdownUnits / peak * 100 (or 0 if peak = 0)
 * currentDrawdownUnits = peak - current
 */
export function analyzeDrawdown(bets: readonly Bet[]): DrawdownStats {
  const sorted = [...bets].sort((a, b) => a.settledAt - b.settledAt);

  let cumulativeUnits = 0;
  let peakUnits = 0;
  let maxDrawdownUnits = 0;
  let peakAtMaxDrawdown = 0;

  for (const bet of sorted) {
    cumulativeUnits += profitFromBet(bet);

    if (cumulativeUnits > peakUnits) {
      peakUnits = cumulativeUnits;
    }

    const drawdown = peakUnits - cumulativeUnits;
    if (drawdown > maxDrawdownUnits) {
      maxDrawdownUnits = drawdown;
      peakAtMaxDrawdown = peakUnits;
    }
  }

  const currentUnits = cumulativeUnits;
  const currentDrawdownUnits = peakUnits - currentUnits;
  const maxDrawdownPercent =
    peakAtMaxDrawdown === 0 ? 0 : (maxDrawdownUnits / peakAtMaxDrawdown) * 100;

  return {
    maxDrawdownUnits,
    maxDrawdownPercent,
    currentDrawdownUnits,
    peakUnits,
    currentUnits,
  };
}

/**
 * Per-bet return = profit / stake for each win/loss bet
 * avgReturnPerBet = mean of per-bet returns
 * stdDevPerBet = population std dev of per-bet returns
 * sharpeRatio = avgReturnPerBet / stdDevPerBet — NaN if stdDev = 0
 */
export function sharpeBetting(bets: readonly Bet[]): SharpeResult {
  const settled = bets.filter(
    (b) => b.result === "win" || b.result === "loss"
  );

  if (settled.length === 0) {
    return {
      sharpeRatio: NaN,
      avgReturnPerBet: NaN,
      stdDevPerBet: NaN,
    };
  }

  const returns = settled.map((b) => profitFromBet(b) / b.stake);
  const avg = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - avg) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev === 0 ? NaN : avg / stdDev;

  return {
    sharpeRatio,
    avgReturnPerBet: avg,
    stdDevPerBet: stdDev,
  };
}

/**
 * Sortino ratio: avgReturn / downside deviation
 * Downside = std dev of only losing per-bet returns
 * Returns NaN if no downside or stdDev = 0
 */
export function sortinoBetting(bets: readonly Bet[]): number {
  const settled = bets.filter(
    (b) => b.result === "win" || b.result === "loss"
  );

  if (settled.length === 0) return NaN;

  const returns = settled.map((b) => profitFromBet(b) / b.stake);
  const avg = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  const downsideReturns = returns.filter((r) => r < 0);
  if (downsideReturns.length === 0) return NaN;

  const downsideVariance =
    downsideReturns.reduce((sum, r) => sum + r ** 2, 0) /
    downsideReturns.length;
  const downsideDev = Math.sqrt(downsideVariance);

  if (downsideDev === 0) return NaN;

  return avg / downsideDev;
}

/**
 * Rolling win rate over a window of settled bets.
 * Each value = wins / (wins + losses) in that window.
 * Output length = max(0, settledBets.length - window + 1)
 */
export function rollingWinRate(
  bets: readonly Bet[],
  window: number
): number[] {
  const sorted = [...bets].sort((a, b) => a.settledAt - b.settledAt);
  const settled = sorted.filter(
    (b) => b.result === "win" || b.result === "loss"
  );

  if (settled.length < window) return [];

  const result: number[] = [];
  for (let i = 0; i <= settled.length - window; i++) {
    const slice = settled.slice(i, i + window);
    const wins = slice.filter((b) => b.result === "win").length;
    result.push(wins / window);
  }
  return result;
}

/**
 * Rolling ROI (net units / staked) over window.
 * Same length logic as rollingWinRate.
 */
export function rollingRoi(bets: readonly Bet[], window: number): number[] {
  const sorted = [...bets].sort((a, b) => a.settledAt - b.settledAt);
  const settled = sorted.filter(
    (b) => b.result === "win" || b.result === "loss"
  );

  if (settled.length < window) return [];

  const result: number[] = [];
  for (let i = 0; i <= settled.length - window; i++) {
    const slice = settled.slice(i, i + window);
    const netUnits = slice.reduce((sum, b) => sum + profitFromBet(b), 0);
    const totalStaked = slice.reduce((sum, b) => sum + b.stake, 0);
    result.push(totalStaked === 0 ? NaN : netUnits / totalStaked);
  }
  return result;
}

/**
 * Average bets per day across the date range.
 * dayRange = (max(settledAt) - min(settledAt)) / 86400000 + 1
 * Returns bets.length / dayRange, or bets.length if only 1 day
 */
export function betsPerDay(bets: readonly Bet[]): number {
  if (bets.length === 0) return 0;

  const timestamps = bets.map((b) => b.settledAt);
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);

  const dayRange = (maxTs - minTs) / 86400000 + 1;
  return bets.length / dayRange;
}

/**
 * Longest consecutive win streak (push/no-action don't break streak).
 */
export function longestWinStreak(bets: readonly Bet[]): number {
  const sorted = [...bets].sort((a, b) => a.settledAt - b.settledAt);

  let longest = 0;
  let current = 0;

  for (const bet of sorted) {
    if (bet.result === "win") {
      current++;
      if (current > longest) longest = current;
    } else if (bet.result === "loss") {
      current = 0;
    }
    // push / no-action: don't break streak
  }

  return longest;
}

/**
 * Longest consecutive loss streak (push/no-action don't break streak).
 */
export function longestLossStreak(bets: readonly Bet[]): number {
  const sorted = [...bets].sort((a, b) => a.settledAt - b.settledAt);

  let longest = 0;
  let current = 0;

  for (const bet of sorted) {
    if (bet.result === "loss") {
      current++;
      if (current > longest) longest = current;
    } else if (bet.result === "win") {
      current = 0;
    }
    // push / no-action: don't break streak
  }

  return longest;
}

/**
 * Current streak at the end of sorted bets.
 * Returns null if no bets.
 */
export function currentStreak(
  bets: readonly Bet[]
): { type: BetResult; count: number } | null {
  if (bets.length === 0) return null;

  const sorted = [...bets].sort((a, b) => a.settledAt - b.settledAt);

  // Find the last bet that's a win or loss to anchor the streak type
  let streakType: BetResult | null = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const b = sorted[i];
    if (b === undefined) continue;
    if (b.result === "win" || b.result === "loss") {
      streakType = b.result;
      break;
    }
  }

  if (streakType === null) {
    // All bets are push/no-action — return the last bet's type with count
    const last = sorted[sorted.length - 1]!;
    return { type: last.result, count: 1 };
  }

  // Count consecutive streak from the end, push/no-action don't break it
  let count = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i]!.result;
    if (r === streakType) {
      count++;
    } else if (r === "push" || r === "no-action") {
      // doesn't break streak, but don't count it
      continue;
    } else {
      // opposite result — streak ends
      break;
    }
  }

  return { type: streakType, count };
}

/**
 * Group net profit by "YYYY-MM".
 * Keys are month strings, values are net unit P/L.
 */
export function profitByMonth(bets: readonly Bet[]): Record<string, number> {
  const result: Record<string, number> = {};

  for (const bet of bets) {
    const date = new Date(bet.settledAt);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;

    result[key] = (result[key] ?? 0) + profitFromBet(bet);
  }

  return result;
}

/**
 * Group bets by sport (from getSport fn) and compute BetStats for each.
 */
export function profitBySport(
  bets: readonly Bet[],
  getSport: (bet: Bet) => string
): Record<string, BetStats> {
  const grouped: Record<string, Bet[]> = {};

  for (const bet of bets) {
    const sport = getSport(bet);
    if (!grouped[sport]) grouped[sport] = [];
    grouped[sport].push(bet);
  }

  const result: Record<string, BetStats> = {};
  for (const [sport, sportBets] of Object.entries(grouped)) {
    result[sport] = calculateBetStats(sportBets);
  }

  return result;
}

/**
 * Average CLV captured across bets where CLV is available.
 * Returns NaN if no CLV data.
 */
export function clvCapture(
  bets: readonly Bet[],
  getClv: (bet: Bet) => number | null
): number {
  const clvValues: number[] = [];

  for (const bet of bets) {
    const clv = getClv(bet);
    if (clv !== null) {
      clvValues.push(clv);
    }
  }

  if (clvValues.length === 0) return NaN;

  return clvValues.reduce((sum, v) => sum + v, 0) / clvValues.length;
}

/**
 * EV = winRate * (odds - 1) - (1 - winRate) * 1
 * Returns expected net units per 1 unit staked.
 */
export function expectedValuePerUnit(
  avgWinRate: number,
  avgDecimalOdds: number
): number {
  return avgWinRate * (avgDecimalOdds - 1) - (1 - avgWinRate) * 1;
}

/**
 * Estimate minimum sample needed to detect the given win rate as significantly above null.
 * Using normal approximation:
 * n = (z_alpha * sqrt(nullHypothesis * (1 - nullHypothesis)) / (winRate - nullHypothesis))^2
 * z_alpha for alpha=0.05 (one-tail) ≈ 1.645
 * Returns Infinity if winRate <= nullHypothesis.
 * Returns at least 1.
 */
export function minimumSampleForSignificance(
  winRate: number,
  nullHypothesis = 0.5238,
  alpha = 0.05
): number {
  if (winRate <= nullHypothesis) return Infinity;

  // z-score for one-tailed test
  // For alpha=0.05 → z=1.645; for other values we use a simple approximation
  // Using the probit approximation: z ≈ 1.645 for alpha=0.05
  const zAlpha = alpha === 0.05 ? 1.645 : -Math.log(2 * alpha) * 0.8; // fallback approx

  const stdErr = Math.sqrt(nullHypothesis * (1 - nullHypothesis));
  const diff = winRate - nullHypothesis;
  const n = Math.ceil((zAlpha * stdErr) / diff) ** 2;

  return Math.max(1, n);
}
