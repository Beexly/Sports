/**
 * football-analytics.ts
 * Pure TypeScript NFL football analytics — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayContext {
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  yardLine: number; // 0-100 (own 0 = end zone, opp 0 = opponent's end zone)
  quarterSecondsLeft: number;
  scoreDiff: number; // possessing team score - opponent score
}

export interface PassPlay {
  airYards: number; // distance past line of scrimmage
  completed: boolean;
  yardsAfterCatch?: number;
  targetDepth: "short" | "intermediate" | "deep"; // < 10, 10-20, > 20 air yards
  targetLocation: "left" | "middle" | "right";
  contested?: boolean;
}

export interface RushPlay {
  yardsGained: number;
  direction: "left" | "middle" | "right";
  gapType: "edge" | "tackle" | "guard" | "center";
}

export interface TeamGameStats {
  plays: number;
  yards: number;
  points: number;
  firstDowns: number;
  rushAttempts: number;
  rushYards: number;
  passAttempts: number;
  completions: number;
  passYards: number;
  sacks: number;
  sackYards: number;
  turnovers: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  redZoneAttempts: number;
  redZoneScores: number;
  penaltyYards: number;
  timeOfPossession: number; // seconds
}

export interface Drive {
  plays: number;
  yards: number;
  result:
    | "touchdown"
    | "field_goal"
    | "punt"
    | "turnover"
    | "downs"
    | "end_of_half"
    | "end_of_game";
  startingYardLine: number;
  secondsUsed: number;
}

// ---------------------------------------------------------------------------
// Expected Points
// ---------------------------------------------------------------------------

/**
 * Estimate expected points from field position + down/distance.
 * Uses a simplified linear model:
 *   - Field position: linear from -2 (own end zone) to 6 (opponent's end zone)
 *   - Down/distance adjustment: based on yards needed and down
 */
export function expectedPoints(ctx: PlayContext): number {
  // Field position component: own 0 (end zone) = very negative; opp 0 = max positive
  // yardLine 0–100 where 0 = own end zone, 100 = opponent's end zone
  const fieldPositionEP = -2.0 + (ctx.yardLine / 100) * 8.0;

  // Down/distance adjustment: penalties for long yardage and later downs
  const yardsPenalty = Math.min(ctx.yardsToGo, 20) * 0.05;
  const downPenalty =
    ctx.down === 1
      ? 0
      : ctx.down === 2
        ? 0.4
        : ctx.down === 3
          ? 0.9
          : 1.4;

  return fieldPositionEP - yardsPenalty - downPenalty;
}

/**
 * EPA = EP(after) - EP(before)
 * Scoring plays use fixed EP values: TD = 7, FG = 3, safety = -2
 */
export function epaFromPlay(
  ctx: PlayContext,
  yardsGained: number,
  scoringPlay?: "touchdown" | "field_goal" | "safety" | null
): number {
  const epBefore = expectedPoints(ctx);

  if (scoringPlay === "touchdown") {
    return 7.0 - epBefore;
  }
  if (scoringPlay === "field_goal") {
    return 3.0 - epBefore;
  }
  if (scoringPlay === "safety") {
    return -2.0 - epBefore;
  }

  // Compute new field position after gain
  const newYardLine = Math.min(100, ctx.yardLine + yardsGained);
  const yardsToFirstDown = ctx.yardsToGo - yardsGained;

  // Determine new down/yardsToGo
  let newDown: 1 | 2 | 3 | 4;
  let newYardsToGo: number;

  if (yardsGained >= ctx.yardsToGo) {
    // First down
    newDown = 1;
    newYardsToGo = 10;
  } else if (ctx.down === 4) {
    // Turnover on downs — opponent gets ball
    const epAfter = expectedPoints({
      down: 1,
      yardsToGo: 10,
      yardLine: 100 - newYardLine,
      quarterSecondsLeft: ctx.quarterSecondsLeft,
      scoreDiff: -ctx.scoreDiff,
    });
    // EPA from opponent perspective is negative for us
    return -epAfter - epBefore;
  } else {
    newDown = (ctx.down + 1) as 2 | 3 | 4;
    newYardsToGo = Math.max(1, yardsToFirstDown);
  }

  const ctxAfter: PlayContext = {
    down: newDown,
    yardsToGo: newYardsToGo,
    yardLine: newYardLine,
    quarterSecondsLeft: ctx.quarterSecondsLeft,
    scoreDiff: ctx.scoreDiff,
  };

  return expectedPoints(ctxAfter) - epBefore;
}

// ---------------------------------------------------------------------------
// Win Probability
// ---------------------------------------------------------------------------

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Simplified logistic win probability model.
 * Returns probability for possessing team.
 */
export function winProbability(ctx: PlayContext): number {
  // Total seconds in game = 60 * 60 = 3600
  // Each quarter = 15 minutes = 900 seconds
  // quarterSecondsLeft ranges 0–900

  // Approximate seconds remaining: this is simplified — we don't track quarter number,
  // so we use quarterSecondsLeft as a proxy for urgency
  const timeWeight = ctx.quarterSecondsLeft / 900;

  // Score diff influence — larger when less time remains
  const scoreFactor = ctx.scoreDiff * (1 - timeWeight * 0.5) * 0.15;

  // Field position small bonus
  const fieldFactor = (ctx.yardLine - 50) * 0.005;

  return logistic(scoreFactor + fieldFactor);
}

/**
 * WPA = WP(after) - WP(before)
 */
export function wpaFromPlay(
  ctxBefore: PlayContext,
  ctxAfter: PlayContext
): number {
  return winProbability(ctxAfter) - winProbability(ctxBefore);
}

// ---------------------------------------------------------------------------
// Success Rate
// ---------------------------------------------------------------------------

/**
 * A play is successful if:
 *   1st down: gain >= 40% of yards needed
 *   2nd down: gain >= 60% of yards needed OR achieves first down
 *   3rd/4th:  achieves first down
 */
export function isSuccessfulPlay(
  ctx: PlayContext,
  yardsGained: number
): boolean {
  switch (ctx.down) {
    case 1:
      return yardsGained >= ctx.yardsToGo * 0.4;
    case 2:
      return (
        yardsGained >= ctx.yardsToGo * 0.6 || yardsGained >= ctx.yardsToGo
      );
    case 3:
    case 4:
      return yardsGained >= ctx.yardsToGo;
  }
}

/**
 * Success rate across an array of plays.
 */
export function successRate(
  plays: Array<{ ctx: PlayContext; yardsGained: number }>
): number {
  if (plays.length === 0) return 0;
  const successful = plays.filter((p) => isSuccessfulPlay(p.ctx, p.yardsGained)).length;
  return successful / plays.length;
}

// ---------------------------------------------------------------------------
// Air Yards Metrics
// ---------------------------------------------------------------------------

/**
 * Sum of airYards for completed passes only.
 */
export function completedAirYards(plays: PassPlay[]): number {
  return plays
    .filter((p) => p.completed)
    .reduce((sum, p) => sum + p.airYards, 0);
}

/**
 * Sum of all airYards regardless of completion.
 */
export function intendedAirYards(plays: PassPlay[]): number {
  return plays.reduce((sum, p) => sum + p.airYards, 0);
}

/**
 * Average air yards per attempt.
 */
export function airYardsPerAttempt(plays: PassPlay[]): number {
  if (plays.length === 0) return 0;
  return intendedAirYards(plays) / plays.length;
}

/**
 * Catch rate by depth bucket: { short, intermediate, deep }
 */
export function catchRateByDepth(plays: PassPlay[]): Record<string, number> {
  const buckets: Record<string, { completions: number; attempts: number }> = {
    short: { completions: 0, attempts: 0 },
    intermediate: { completions: 0, attempts: 0 },
    deep: { completions: 0, attempts: 0 },
  };

  for (const play of plays) {
    const bucket = buckets[play.targetDepth];
    if (bucket) {
      bucket.attempts++;
      if (play.completed) bucket.completions++;
    }
  }

  const result: Record<string, number> = {};
  for (const [depth, { completions, attempts }] of Object.entries(buckets)) {
    result[depth] = attempts === 0 ? 0 : completions / attempts;
  }
  return result;
}

/**
 * Target share: fraction of team targets going to this player.
 */
export function targetShare(
  playerTargets: number,
  teamTargets: number
): number {
  if (teamTargets === 0) return 0;
  return playerTargets / teamTargets;
}

/**
 * Average yards after catch (completed plays only).
 */
export function aYAC(plays: PassPlay[]): number {
  const completed = plays.filter((p) => p.completed && p.yardsAfterCatch !== undefined);
  if (completed.length === 0) return 0;
  const totalYAC = completed.reduce((sum, p) => sum + (p.yardsAfterCatch ?? 0), 0);
  return totalYAC / completed.length;
}

/**
 * Completion Probability Over Expected (CPOE).
 * Expected completion rate by air yards (empirical curve approximation):
 *   0-5: 75%, 5-10: 65%, 10-15: 50%, 15-20: 40%, >20: 25%
 * Returns (1 - expected) if completed, (0 - expected) if incomplete.
 */
export function cpoe(completion: boolean, airYards: number): number {
  let expected: number;
  if (airYards <= 5) {
    expected = 0.75;
  } else if (airYards <= 10) {
    expected = 0.65;
  } else if (airYards <= 15) {
    expected = 0.50;
  } else if (airYards <= 20) {
    expected = 0.40;
  } else {
    expected = 0.25;
  }

  return completion ? 1 - expected : 0 - expected;
}

// ---------------------------------------------------------------------------
// Rushing Analytics
// ---------------------------------------------------------------------------

/**
 * Average yards per carry.
 */
export function yardsPerCarry(plays: RushPlay[]): number {
  if (plays.length === 0) return 0;
  const total = plays.reduce((sum, p) => sum + p.yardsGained, 0);
  return total / plays.length;
}

/**
 * Rush success rate across plays with context.
 */
export function rushSuccessRate(
  plays: Array<{ play: RushPlay; ctx: PlayContext }>
): number {
  if (plays.length === 0) return 0;
  const successful = plays.filter((p) =>
    isSuccessfulPlay(p.ctx, p.play.yardsGained)
  ).length;
  return successful / plays.length;
}

/**
 * Fraction of runs stuffed at or below stuffThreshold yards (default 0).
 */
export function stuffRate(plays: RushPlay[], stuffThreshold = 0): number {
  if (plays.length === 0) return 0;
  const stuffed = plays.filter((p) => p.yardsGained <= stuffThreshold).length;
  return stuffed / plays.length;
}

/**
 * Fraction of runs gaining >= threshold yards (default 10).
 */
export function explosiveRunRate(plays: RushPlay[], threshold = 10): number {
  if (plays.length === 0) return 0;
  const explosive = plays.filter((p) => p.yardsGained >= threshold).length;
  return explosive / plays.length;
}

/**
 * Simple yards before contact: returns avgContact clamped to yardsGained.
 */
export function yardsBeforeContact(
  avgContact: number,
  yardsGained: number
): number {
  return avgContact > yardsGained ? avgContact : avgContact;
}

// ---------------------------------------------------------------------------
// DVOA-lite
// ---------------------------------------------------------------------------

/**
 * Success value for a play, weighted by down importance.
 * Positive = successful, negative = failure.
 */
export function successValue(
  ctx: PlayContext,
  yardsGained: number
): number {
  const downWeights: Record<number, number> = {
    1: 1.0,
    2: 1.1,
    3: 1.3,
    4: 1.5,
  };
  const weight = downWeights[ctx.down] ?? 1.0;
  const success = isSuccessfulPlay(ctx, yardsGained);

  if (success) {
    // Magnitude: how much better than minimum required
    const surplus = yardsGained - ctx.yardsToGo * (ctx.down === 1 ? 0.4 : ctx.down === 2 ? 0.6 : 1.0);
    return weight * (1 + Math.max(0, surplus) * 0.05);
  } else {
    const deficit = (ctx.down === 1 ? ctx.yardsToGo * 0.4 : ctx.down === 2 ? ctx.yardsToGo * 0.6 : ctx.yardsToGo) - yardsGained;
    return -weight * (1 + Math.max(0, deficit) * 0.05);
  }
}

/**
 * DVOA-lite: (sum of successValues - leagueAvg * plays) / plays
 */
export function dvoaLite(
  plays: Array<{ ctx: PlayContext; yardsGained: number }>,
  leagueAvg = 0
): number {
  if (plays.length === 0) return 0;
  const total = plays.reduce(
    (sum, p) => sum + successValue(p.ctx, p.yardsGained),
    0
  );
  return (total - leagueAvg * plays.length) / plays.length;
}

/**
 * Offensive DVOA relative to league average.
 */
export function offensiveDvoa(
  stats: TeamGameStats,
  leagueAvg: TeamGameStats
): number {
  if (stats.plays === 0 || leagueAvg.plays === 0) return 0;
  const teamYPP = stats.yards / stats.plays;
  const leagueYPP = leagueAvg.yards / leagueAvg.plays;
  if (leagueYPP === 0) return 0;
  return (teamYPP - leagueYPP) / leagueYPP;
}

/**
 * Defensive DVOA: how much worse/better than average the defense is.
 * Positive = better defense (allowed fewer yards per play).
 */
export function defensiveDvoa(
  stats: TeamGameStats,
  leagueAvg: TeamGameStats
): number {
  // Defensive DVOA: positive means better (allowing less)
  return -offensiveDvoa(stats, leagueAvg);
}

// ---------------------------------------------------------------------------
// Pressure and Protection
// ---------------------------------------------------------------------------

/**
 * Categorize snap-to-throw time.
 */
export function timeToThrow(
  snapToThrow: number
): "quick" | "average" | "slow" {
  if (snapToThrow < 2.5) return "quick";
  if (snapToThrow <= 3.0) return "average";
  return "slow";
}

/**
 * Fraction of dropbacks under pressure.
 */
export function pressureRate(
  pressuredDropbacks: number,
  totalDropbacks: number
): number {
  if (totalDropbacks === 0) return 0;
  return pressuredDropbacks / totalDropbacks;
}

/**
 * Fraction of dropbacks resulting in sacks.
 */
export function sackRate(sacks: number, totalDropbacks: number): number {
  if (totalDropbacks === 0) return 0;
  return sacks / totalDropbacks;
}

/**
 * Fraction of plays run with a blitz.
 */
export function blitzRate(blitzPlays: number, totalPlays: number): number {
  if (totalPlays === 0) return 0;
  return blitzPlays / totalPlays;
}

// ---------------------------------------------------------------------------
// Situational Stats
// ---------------------------------------------------------------------------

/**
 * Red zone scoring efficiency (scores / attempts).
 */
export function redZoneEfficiency(attempts: number, scores: number): number {
  if (attempts === 0) return 0;
  return scores / attempts;
}

/**
 * Third down conversion rate.
 */
export function thirdDownConversionRate(
  conversions: number,
  attempts: number
): number {
  if (attempts === 0) return 0;
  return conversions / attempts;
}

/**
 * Fourth down conversion rate.
 */
export function fourthDownConversionRate(
  conversions: number,
  attempts: number
): number {
  if (attempts === 0) return 0;
  return conversions / attempts;
}

/**
 * Turnover differential: turnoversForced - turnoversCommitted.
 */
export function turnoverDifferential(
  turnoversForced: number,
  turnoversCommitted: number
): number {
  return turnoversForced - turnoversCommitted;
}

/**
 * Average penalty yards per game.
 */
export function penaltyYardsPerGame(
  totalPenaltyYards: number,
  games: number
): number {
  if (games === 0) return 0;
  return totalPenaltyYards / games;
}

// ---------------------------------------------------------------------------
// Drive Analytics
// ---------------------------------------------------------------------------

/**
 * Fraction of drives ending in touchdown or field goal.
 */
export function driveSuccessRate(drives: Drive[]): number {
  if (drives.length === 0) return 0;
  const successful = drives.filter(
    (d) => d.result === "touchdown" || d.result === "field_goal"
  ).length;
  return successful / drives.length;
}

/**
 * Average yards per drive.
 */
export function avgDriveLength(drives: Drive[]): number {
  if (drives.length === 0) return 0;
  return drives.reduce((sum, d) => sum + d.yards, 0) / drives.length;
}

/**
 * Average seconds per drive.
 */
export function avgDriveTime(drives: Drive[]): number {
  if (drives.length === 0) return 0;
  return drives.reduce((sum, d) => sum + d.secondsUsed, 0) / drives.length;
}

/**
 * Average points per drive: TD=7, FG=3, else=0.
 */
export function drivePointsPerTrip(drives: Drive[]): number {
  if (drives.length === 0) return 0;
  const totalPoints = drives.reduce((sum, d) => {
    if (d.result === "touchdown") return sum + 7;
    if (d.result === "field_goal") return sum + 3;
    return sum;
  }, 0);
  return totalPoints / drives.length;
}

// ---------------------------------------------------------------------------
// Team Efficiency Summary
// ---------------------------------------------------------------------------

/**
 * Summarize team efficiency across key metrics.
 */
export function teamEfficiencySummary(
  stats: TeamGameStats,
  leagueAvg: TeamGameStats
): {
  yardsPerPlay: number;
  pointsPerPlay: number;
  successRate: number;
  offensiveDvoa: number;
  explosivePlayRate: number;
} {
  const yardsPerPlay = stats.plays === 0 ? 0 : stats.yards / stats.plays;
  const pointsPerPlay = stats.plays === 0 ? 0 : stats.points / stats.plays;

  // Approximate success rate from 3rd down conversions and overall efficiency
  const thirdDownRate =
    stats.thirdDownAttempts === 0
      ? 0
      : stats.thirdDownConversions / stats.thirdDownAttempts;
  // Weighted average: general plays (assumed ~50% on 1st/2nd) and 3rd downs
  const approxSuccessRate = thirdDownRate * 0.3 + Math.min(1, yardsPerPlay / 10) * 0.7;

  const oDvoa = offensiveDvoa(stats, leagueAvg);

  // Explosive plays: approximate from average yards — we don't have per-play data here
  // Use a ratio based on yards distribution assumption
  const leagueYPP =
    leagueAvg.plays === 0 ? 5 : leagueAvg.yards / leagueAvg.plays;
  // Explosive rate relative to league avg (plays > 20 yards)
  // Approximation: explosive play rate scales with yards/play ratio
  const yppRatio = leagueYPP === 0 ? 1 : yardsPerPlay / leagueYPP;
  const explosivePlayRate = Math.min(1, Math.max(0, 0.08 * yppRatio));

  return {
    yardsPerPlay,
    pointsPerPlay,
    successRate: approxSuccessRate,
    offensiveDvoa: oDvoa,
    explosivePlayRate,
  };
}
