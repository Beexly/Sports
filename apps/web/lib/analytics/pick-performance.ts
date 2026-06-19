/**
 * Pick performance analytics — pure, zero dependencies.
 *
 * EV tracking, pick grading, win rate displays, confidence tier
 * performance, and pick quality metrics for sports picks.
 * All functions are pure/inert — read-only analytics only.
 */

export type PickResult = "win" | "loss" | "push" | "no-action" | "pending";

export type PickTier = "signal" | "edge" | "sharp" | "apex";

export interface PickRecord {
  readonly id: string;
  readonly confidence: number; // 0-100
  readonly tier: PickTier;
  readonly result: PickResult;
  readonly americanOdds: number;
  readonly stake: number; // in units
  readonly ev: number; // expected value at time of pick (-1 to +1 range)
  readonly actualClv?: number; // closing line value, undefined if not settled
}

export interface TierPerformance {
  readonly tier: PickTier;
  readonly picks: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly winRate: number | null;
  readonly roi: number | null; // profit / total staked
  readonly avgEv: number;
  readonly avgConfidence: number;
}

export interface PickGrade {
  readonly grade: "A" | "B" | "C" | "D" | "F";
  readonly score: number; // 0-100
  readonly label: string; // e.g., "Good Read", "Poor Execution"
  readonly clvPositive: boolean;
}

export interface PerformanceSummary {
  readonly totalPicks: number;
  readonly settledPicks: number;
  readonly overallWinRate: number | null;
  readonly overallRoi: number | null;
  readonly byTier: TierPerformance[];
  readonly avgEv: number;
  readonly clvBeatRate: number | null; // fraction that beat closing line
}

/**
 * Calculate net profit from a pick (in units).
 * Win: stake * (odds/100) for positive odds; stake * (100/|odds|) for negative
 * Loss: -stake
 * Push/no-action/pending: 0
 */
export function pickProfit(
  pick: Pick<PickRecord, "result" | "americanOdds" | "stake">
): number {
  switch (pick.result) {
    case "win": {
      const odds = pick.americanOdds;
      if (odds >= 0) {
        return pick.stake * (odds / 100);
      } else {
        return pick.stake * (100 / Math.abs(odds));
      }
    }
    case "loss":
      return -pick.stake;
    case "push":
    case "no-action":
    case "pending":
      return 0;
  }
}

/**
 * Total return from a pick (stake + profit).
 * Win: stake + profit
 * Loss: 0
 * Push/no-action/pending: stake
 */
export function pickReturn(
  pick: Pick<PickRecord, "result" | "americanOdds" | "stake">
): number {
  switch (pick.result) {
    case "win":
      return pick.stake + pickProfit(pick);
    case "loss":
      return 0;
    case "push":
    case "no-action":
    case "pending":
      return pick.stake;
  }
}

/**
 * Convert American odds to implied probability.
 * Positive: 100 / (odds + 100)
 * Negative: |odds| / (|odds| + 100)
 * Returns value in [0, 1].
 */
export function impliedProbability(americanOdds: number): number {
  if (americanOdds >= 0) {
    return 100 / (americanOdds + 100);
  } else {
    const abs = Math.abs(americanOdds);
    return abs / (abs + 100);
  }
}

/**
 * Expected value per unit staked.
 * EV = confidence * profit_if_win + (1-confidence) * profit_if_loss
 * confidence is in [0, 1] (not percent)
 * profit_if_win = positive odds: odds/100; negative odds: 100/|odds|
 * profit_if_loss = -1
 */
export function expectedValue(
  confidence: number,
  americanOdds: number
): number {
  const profitIfWin =
    americanOdds >= 0
      ? americanOdds / 100
      : 100 / Math.abs(americanOdds);
  const profitIfLoss = -1;
  return confidence * profitIfWin + (1 - confidence) * profitIfLoss;
}

/**
 * Grade a settled pick based on closing line value and result.
 * Returns a PickGrade with letter grade, score, label, and clv status.
 */
export function gradePickByClv(pick: PickRecord): PickGrade {
  if (pick.actualClv === undefined) {
    return {
      grade: "C",
      score: 50,
      label: "No CLV Data",
      clvPositive: false,
    };
  }

  const clv = pick.actualClv;
  const clvPositive = clv > 0;

  if (pick.result === "push") {
    return { grade: "C", score: 50, label: "Push", clvPositive };
  }

  if (pick.result === "win" && clv > 0) {
    let score = 90;
    if (clv > 0.02) score += 5;
    return { grade: "A", score, label: "Good Read, Good Result", clvPositive };
  }

  if (pick.result === "win" && clv <= 0) {
    return { grade: "B", score: 70, label: "Lucky Win", clvPositive };
  }

  if (pick.result === "loss" && clv > 0) {
    return {
      grade: "B",
      score: 75,
      label: "Good Read, Bad Result",
      clvPositive,
    };
  }

  if (pick.result === "loss" && clv <= 0) {
    return { grade: "D", score: 30, label: "Poor Read", clvPositive };
  }

  // Fallback for pending/no-action
  return { grade: "C", score: 50, label: "No CLV Data", clvPositive };
}

/**
 * Calculate performance stats for all picks belonging to a specific tier.
 * winRate = wins / (wins + losses), null if no settled picks
 * roi = sum(profit) / sum(stake for settled picks), null if no staked picks
 * avgEv = mean ev across all picks in the tier
 * avgConfidence = mean confidence across all picks in the tier
 */
export function tierPerformance(
  picks: readonly PickRecord[],
  tier: PickTier
): TierPerformance {
  const tierPicks = picks.filter((p) => p.tier === tier);

  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let totalProfit = 0;
  let totalStaked = 0;
  let evSum = 0;
  let confidenceSum = 0;

  for (const pick of tierPicks) {
    if (pick.result === "win") {
      wins++;
      totalProfit += pickProfit(pick);
      totalStaked += pick.stake;
    } else if (pick.result === "loss") {
      losses++;
      totalProfit += pickProfit(pick);
      totalStaked += pick.stake;
    } else if (pick.result === "push") {
      pushes++;
    }
    evSum += pick.ev;
    confidenceSum += pick.confidence;
  }

  const settled = wins + losses;
  const winRate = settled > 0 ? wins / settled : null;
  const roi = totalStaked > 0 ? totalProfit / totalStaked : null;
  const avgEv = tierPicks.length > 0 ? evSum / tierPicks.length : 0;
  const avgConfidence =
    tierPicks.length > 0 ? confidenceSum / tierPicks.length : 0;

  return {
    tier,
    picks: tierPicks.length,
    wins,
    losses,
    pushes,
    winRate,
    roi,
    avgEv,
    avgConfidence,
  };
}

const ALL_TIERS: PickTier[] = ["signal", "edge", "sharp", "apex"];

/**
 * Full performance summary across all picks.
 * settledPicks: win + loss + push count
 * overallWinRate: total wins / (wins + losses)
 * overallRoi: sum(profit) / sum(stake for settled picks)
 * byTier: TierPerformance for each tier that has any picks
 * avgEv: mean ev across all picks
 * clvBeatRate: fraction of settled picks where actualClv > 0
 */
export function performanceSummary(
  picks: readonly PickRecord[]
): PerformanceSummary {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let totalProfit = 0;
  let totalStaked = 0;
  let evSum = 0;
  let clvBeatCount = 0;
  let clvSettledCount = 0;

  for (const pick of picks) {
    evSum += pick.ev;

    if (pick.result === "win") {
      wins++;
      totalProfit += pickProfit(pick);
      totalStaked += pick.stake;
      if (pick.actualClv !== undefined) {
        clvSettledCount++;
        if (pick.actualClv > 0) clvBeatCount++;
      }
    } else if (pick.result === "loss") {
      losses++;
      totalProfit += pickProfit(pick);
      totalStaked += pick.stake;
      if (pick.actualClv !== undefined) {
        clvSettledCount++;
        if (pick.actualClv > 0) clvBeatCount++;
      }
    } else if (pick.result === "push") {
      pushes++;
      if (pick.actualClv !== undefined) {
        clvSettledCount++;
        if (pick.actualClv > 0) clvBeatCount++;
      }
    }
  }

  const settled = wins + losses + pushes;
  const overallWinRate =
    wins + losses > 0 ? wins / (wins + losses) : null;
  const overallRoi = totalStaked > 0 ? totalProfit / totalStaked : null;
  const avgEv = picks.length > 0 ? evSum / picks.length : 0;
  const clvBeatRate =
    clvSettledCount > 0 ? clvBeatCount / clvSettledCount : null;

  const tiersWithPicks = ALL_TIERS.filter((t) =>
    picks.some((p) => p.tier === t)
  );
  const byTier = tiersWithPicks.map((t) => tierPerformance(picks, t));

  return {
    totalPicks: picks.length,
    settledPicks: settled,
    overallWinRate,
    overallRoi,
    byTier,
    avgEv,
    clvBeatRate,
  };
}

/**
 * Group picks into confidence buckets.
 * For 5 buckets: 0-20, 20-40, 40-60, 60-80, 80-100
 * Returns only non-empty buckets.
 */
export function confidenceBuckets(
  picks: readonly PickRecord[],
  buckets = 5
): Array<{
  label: string;
  count: number;
  winRate: number | null;
  avgConfidence: number;
}> {
  const bucketSize = 100 / buckets;
  const result: Array<{
    label: string;
    count: number;
    winRate: number | null;
    avgConfidence: number;
  }> = [];

  for (let i = 0; i < buckets; i++) {
    const low = i * bucketSize;
    const high = (i + 1) * bucketSize;
    const label = `${Math.round(low)}-${Math.round(high)}%`;

    // For the last bucket include 100 as well (confidence can be exactly 100)
    const bucketPicks = picks.filter((p) => {
      if (i === buckets - 1) {
        return p.confidence >= low && p.confidence <= high;
      }
      return p.confidence >= low && p.confidence < high;
    });

    if (bucketPicks.length === 0) continue;

    const wins = bucketPicks.filter((p) => p.result === "win").length;
    const losses = bucketPicks.filter((p) => p.result === "loss").length;
    const settled = wins + losses;
    const winRate = settled > 0 ? wins / settled : null;
    const avgConfidence =
      bucketPicks.reduce((sum, p) => sum + p.confidence, 0) / bucketPicks.length;

    result.push({ label, count: bucketPicks.length, winRate, avgConfidence });
  }

  return result;
}

/**
 * Return the top n picks by EV (descending), only picks with EV > 0.
 */
export function topPicks(
  picks: readonly PickRecord[],
  n: number
): PickRecord[] {
  return picks
    .filter((p) => p.ev > 0)
    .sort((a, b) => b.ev - a.ev)
    .slice(0, n);
}

/**
 * Return the worst n picks by EV (ascending, most negative first).
 */
export function worstPicks(
  picks: readonly PickRecord[],
  n: number
): PickRecord[] {
  return [...picks].sort((a, b) => a.ev - b.ev).slice(0, n);
}

/**
 * Group win rates by sport.
 * Returns object mapping sport name → win rate (null if no settled games).
 */
export function winRateBySport(
  picks: readonly (PickRecord & { sport: string })[]
): Record<string, number | null> {
  const grouped: Record<string, (PickRecord & { sport: string })[]> = {};

  for (const pick of picks) {
    if (!grouped[pick.sport]) grouped[pick.sport] = [];
    grouped[pick.sport]!.push(pick);
  }

  const result: Record<string, number | null> = {};

  for (const [sport, sportPicks] of Object.entries(grouped)) {
    const wins = sportPicks.filter((p) => p.result === "win").length;
    const losses = sportPicks.filter((p) => p.result === "loss").length;
    const settled = wins + losses;
    result[sport] = settled > 0 ? wins / settled : null;
  }

  return result;
}

/**
 * Current streak from the end of the picks array (most recent last).
 * Only counts win/loss (ignores push/pending/no-action).
 * Returns { type: "none", length: 0 } if no settled picks.
 */
export function streakFromPicks(
  picks: readonly PickRecord[]
): { type: "win" | "loss" | "none"; length: number } {
  let streakType: "win" | "loss" | null = null;
  let length = 0;

  for (let i = picks.length - 1; i >= 0; i--) {
    const result = picks[i]!.result;
    if (result !== "win" && result !== "loss") continue;

    if (streakType === null) {
      streakType = result;
      length = 1;
    } else if (result === streakType) {
      length++;
    } else {
      break;
    }
  }

  if (streakType === null) {
    return { type: "none", length: 0 };
  }

  return { type: streakType, length };
}

/**
 * Last n settled picks as a string: "WLWWL"
 * W for win, L for loss, P for push
 * Most recent at the end
 * Returns empty string if no settled picks
 */
export function recentForm(picks: readonly PickRecord[], n = 5): string {
  const settled = picks.filter(
    (p) => p.result === "win" || p.result === "loss" || p.result === "push"
  );

  const recent = settled.slice(-n);

  return recent
    .map((p) => {
      if (p.result === "win") return "W";
      if (p.result === "loss") return "L";
      return "P";
    })
    .join("");
}
