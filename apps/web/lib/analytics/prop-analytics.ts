/**
 * Player prop bet analytics — pure, zero dependencies.
 *
 * Prop line analysis, threshold modeling, hit rate calculations,
 * and prop bet value assessment. Pure analytics only —
 * does not affect model weights or published picks.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PropType =
  | "passing_yards"
  | "rushing_yards"
  | "receiving_yards"
  | "receptions"
  | "touchdowns"
  | "points"
  | "rebounds"
  | "assists"
  | "three_pointers"
  | "strikeouts"
  | "hits"
  | "total_bases";

export interface PropLine {
  readonly propType: PropType;
  readonly line: number;
  readonly overOdds: number;   // American odds for over
  readonly underOdds: number;  // American odds for under
  readonly playerName: string;
  readonly gameId?: string;
}

export interface PropHistoricalResult {
  readonly value: number;       // actual stat value
  readonly gameDate: number;    // timestamp
  readonly opponent?: string;
  readonly isHome?: boolean;
}

export interface PropAnalysis {
  readonly line: number;
  readonly hitRate: number | null;      // fraction of historical over the line, null if empty
  readonly avgValue: number | null;     // mean historical value
  readonly stdDev: number | null;       // std dev of historical values
  readonly sampleSize: number;
  readonly recentTrend: "hot" | "cold" | "neutral";  // last 5 vs overall
  readonly overEv: number | null;       // EV of taking over (based on hit rate vs implied prob)
  readonly underEv: number | null;      // EV of taking under
}

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Fraction of results where value > line (strictly over).
 * Push (value === line) counts as neither over nor under.
 * Returns null if empty array.
 */
export function propHitRate(
  results: readonly PropHistoricalResult[],
  line: number
): number | null {
  if (results.length === 0) return null;
  const overs = results.filter((r) => r.value > line).length;
  return overs / results.length;
}

/**
 * Mean value across all historical results.
 * Returns null if empty.
 */
export function propAverage(
  results: readonly PropHistoricalResult[]
): number | null {
  if (results.length === 0) return null;
  const sum = results.reduce((acc, r) => acc + r.value, 0);
  return sum / results.length;
}

/**
 * Population standard deviation of historical values.
 * Returns null if empty or single value.
 */
export function propStdDev(
  results: readonly PropHistoricalResult[]
): number | null {
  if (results.length <= 1) return null;
  const mean = results.reduce((acc, r) => acc + r.value, 0) / results.length;
  const variance =
    results.reduce((acc, r) => acc + Math.pow(r.value - mean, 2), 0) /
    results.length;
  return Math.sqrt(variance);
}

/**
 * Compare most recent N games hit rate vs all-time hit rate for a given line.
 * delta = recentRate - overallRate
 * Returns null for each if no results with that context.
 */
export function recentVsOverall(
  results: readonly PropHistoricalResult[],
  line: number,
  recentN = 5
): { recentRate: number | null; overallRate: number | null; delta: number | null } {
  const overallRate = propHitRate(results, line);

  // Sort by gameDate ascending, take last recentN
  const sorted = [...results].sort((a, b) => a.gameDate - b.gameDate);
  const recent = sorted.slice(-recentN);
  const recentRate = propHitRate(recent, line);

  const delta =
    recentRate !== null && overallRate !== null
      ? recentRate - overallRate
      : null;

  return { recentRate, overallRate, delta };
}

/**
 * Trend based on recent vs overall hit rate comparison.
 * hot: recentRate - overallRate > 0.15
 * cold: overallRate - recentRate > 0.15
 * neutral: otherwise or insufficient data
 */
export function propTrend(
  results: readonly PropHistoricalResult[],
  line: number,
  recentN = 5
): "hot" | "cold" | "neutral" {
  const { delta } = recentVsOverall(results, line, recentN);
  if (delta === null) return "neutral";
  if (delta > 0.15) return "hot";
  if (delta < -0.15) return "cold";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Odds / EV helpers
// ---------------------------------------------------------------------------

/**
 * Convert American odds to implied probability.
 * Positive: 100 / (odds + 100)
 * Negative: |odds| / (|odds| + 100)
 */
export function impliedHitRate(americanOdds: number): number {
  if (americanOdds >= 0) {
    return 100 / (americanOdds + 100);
  } else {
    const abs = Math.abs(americanOdds);
    return abs / (abs + 100);
  }
}

/**
 * Edge = hitRate - impliedHitRate(odds)
 * Positive = value on that side.
 */
export function propValue(hitRate: number, americanOdds: number): number {
  return hitRate - impliedHitRate(americanOdds);
}

/**
 * Profit multiplier if winning a bet at American odds.
 * Positive: odds / 100
 * Negative: 100 / |odds|
 */
function profitMultiplier(americanOdds: number): number {
  if (americanOdds >= 0) {
    return americanOdds / 100;
  } else {
    return 100 / Math.abs(americanOdds);
  }
}

// ---------------------------------------------------------------------------
// Full analysis
// ---------------------------------------------------------------------------

/**
 * Full prop analysis combining all metrics.
 * overEv: (hitRate * profit_if_win_over) - ((1-hitRate) * 1)
 * underEv: (underHitRate * profit_if_win_under) - ((1-underHitRate) * 1)
 * Both null if hitRate is null.
 */
export function analyzeProp(
  prop: PropLine,
  results: readonly PropHistoricalResult[]
): PropAnalysis {
  const hitRate = propHitRate(results, prop.line);
  const avgValue = propAverage(results);
  const stdDev = propStdDev(results);
  const recentTrend = propTrend(results, prop.line);

  let overEv: number | null = null;
  let underEv: number | null = null;

  if (hitRate !== null) {
    const profitOver = profitMultiplier(prop.overOdds);
    overEv = hitRate * profitOver - (1 - hitRate) * 1;

    const underHitRate = 1 - hitRate;
    const profitUnder = profitMultiplier(prop.underOdds);
    underEv = underHitRate * profitUnder - (1 - underHitRate) * 1;
  }

  return {
    line: prop.line,
    hitRate,
    avgValue,
    stdDev,
    sampleSize: results.length,
    recentTrend,
    overEv,
    underEv,
  };
}

// ---------------------------------------------------------------------------
// Alt line analysis
// ---------------------------------------------------------------------------

/**
 * Analyze multiple alt lines for a prop.
 * impliedProb: breakeven hit rate needed to profit (assume -110: 110/210 ≈ 0.524)
 * recommendedSide:
 *   if hitRate > 0.524 + 0.05: "over"
 *   if hitRate < 0.476 - 0.05 (underHitRate > 0.524 + 0.05): "under"
 *   otherwise: "skip"
 */
export function altLineAnalysis(
  baseLine: number,
  altLines: readonly number[],
  hitRate: (line: number) => number
): Array<{
  line: number;
  hitRate: number;
  impliedProb: number;
  recommendedSide: "over" | "under" | "skip";
}> {
  // baseLine is provided for context but we analyze altLines
  void baseLine;

  const ALT_IMPLIED_PROB = 110 / 210; // ≈ 0.5238 for -110

  return altLines.map((line) => {
    const rate = hitRate(line);
    const impliedProb = ALT_IMPLIED_PROB;

    let recommendedSide: "over" | "under" | "skip";
    if (rate > ALT_IMPLIED_PROB + 0.05) {
      recommendedSide = "over";
    } else if (rate < 0.476 - 0.05) {
      recommendedSide = "under";
    } else {
      recommendedSide = "skip";
    }

    return { line, hitRate: rate, impliedProb, recommendedSide };
  });
}

// ---------------------------------------------------------------------------
// Splits
// ---------------------------------------------------------------------------

/**
 * Hit rate for home games vs away games.
 * Returns null for each if no results with that isHome value.
 */
export function splitByHomeAway(
  results: readonly PropHistoricalResult[],
  line: number
): { home: number | null; away: number | null } {
  const homeResults = results.filter((r) => r.isHome === true);
  const awayResults = results.filter((r) => r.isHome === false);

  return {
    home: propHitRate(homeResults, line),
    away: propHitRate(awayResults, line),
  };
}

/**
 * Hit rate per opponent (opponent as key).
 * Only includes opponents with results.
 */
export function splitByOpponent(
  results: readonly PropHistoricalResult[],
  line: number
): Record<string, number> {
  const grouped: Record<string, PropHistoricalResult[]> = {};

  for (const result of results) {
    if (result.opponent === undefined) continue;
    if (!grouped[result.opponent]) grouped[result.opponent] = [];
    grouped[result.opponent].push(result);
  }

  const output: Record<string, number> = {};

  for (const [opponent, opponentResults] of Object.entries(grouped)) {
    const rate = propHitRate(opponentResults, line);
    if (rate !== null) {
      output[opponent] = rate;
    }
  }

  return output;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format American odds with sign: "+130" or "-110".
 */
function formatOdds(odds: number): string {
  if (odds >= 0) return `+${odds}`;
  return `${odds}`;
}

/**
 * Convert propType to display string: replace underscores with spaces,
 * capitalize each word.
 */
function propTypeDisplay(propType: PropType): string {
  return propType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Human-readable prop line.
 * Format: "{playerName} {propType_display} {line} (O{overOdds}/U{underOdds})"
 * Example: "Patrick Mahomes Passing Yards 275.5 (O-115/U-105)"
 */
export function formatPropLine(prop: PropLine): string {
  const display = propTypeDisplay(prop.propType);
  const over = formatOdds(prop.overOdds);
  const under = formatOdds(prop.underOdds);
  return `${prop.playerName} ${display} ${prop.line} (O${over}/U${under})`;
}

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

/**
 * Category for each prop type.
 */
export function propTypeCategory(
  propType: PropType
): "passing" | "rushing" | "receiving" | "scoring" | "basketball" | "baseball" {
  switch (propType) {
    case "passing_yards":
      return "passing";
    case "rushing_yards":
      return "rushing";
    case "receiving_yards":
    case "receptions":
      return "receiving";
    case "touchdowns":
      return "scoring";
    case "points":
    case "rebounds":
    case "assists":
    case "three_pointers":
      return "basketball";
    case "strikeouts":
    case "hits":
    case "total_bases":
      return "baseball";
  }
}
