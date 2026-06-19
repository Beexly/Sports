/**
 * nfl-advanced-analytics.ts
 * Pure TypeScript NFL advanced analytics — no external dependencies.
 */

// ---------------------------------------------------------------------------
// 1. Expected Points Added (EPA)
// ---------------------------------------------------------------------------

/**
 * Approximate expected points for a given down/distance/field position.
 * EP = baseEP(down) - 0.05*yardsToGo + 0.04*(yardLine/100)*10
 * Base EP: 1st=1.5, 2nd=0.8, 3rd=0.2, 4th=-0.5
 * yardLine: 0 = own end zone, 100 = opponent's end zone
 */
export function expectedPoints(
  down: number,
  yardsToGo: number,
  yardLine: number,
): number {
  const baseEPMap: Record<number, number> = {
    1: 1.5,
    2: 0.8,
    3: 0.2,
    4: -0.5,
  };
  const baseEP = baseEPMap[down] ?? -0.5;
  return baseEP - 0.05 * yardsToGo + 0.04 * (yardLine / 100) * 10;
}

/**
 * EPA for a single play.
 * At end of possession (turnover): nextEP = -EP(next down for opponent)
 * At scoring: nextEP = actual points scored
 */
export function epa(playEP: number, nextEP: number): number {
  return nextEP - playEP;
}

/** Sum of EPA over an array of plays */
export function cumulativeEPA(plays: Array<{ epa: number }>): number {
  return plays.reduce((sum, p) => sum + p.epa, 0);
}

/** Mean EPA per play; returns 0 if no plays */
export function epaPerPlay(plays: Array<{ epa: number }>): number {
  if (plays.length === 0) return 0;
  return cumulativeEPA(plays) / plays.length;
}

/** Fraction of plays with positive EPA */
export function successRate(plays: Array<{ epa: number }>): number {
  if (plays.length === 0) return 0;
  const successes = plays.filter((p) => p.epa > 0).length;
  return successes / plays.length;
}

// ---------------------------------------------------------------------------
// 2. Air yards and passing metrics
// ---------------------------------------------------------------------------

/**
 * Air yards = targeted receiver yard line - line of scrimmage.
 * Negative when target is behind LOS.
 */
export function airYards(
  targetedReceiverYardLine: number,
  lineOfScrimmage: number,
): number {
  return targetedReceiverYardLine - lineOfScrimmage;
}

/** Yards after catch = total reception yards - air yards */
export function yardsAfterCatch(
  receptionYards: number,
  airYardsValue: number,
): number {
  return receptionYards - airYardsValue;
}

/**
 * Simplified completion probability model.
 * Base = 0.65; adjust by air yards (-0.01 per yard beyond 5).
 * Coverage adjustments: press=-0.08, zone=+0.03, off=+0.05.
 * Clamped to [0.05, 0.95].
 */
export function completionProbability(
  airYardsValue: number,
  coverage: "press" | "off" | "zone",
): number {
  let prob = 0.65;

  const depthAdjust = airYardsValue > 5 ? -0.01 * (airYardsValue - 5) : 0;
  prob += depthAdjust;

  if (coverage === "press") {
    prob -= 0.08;
  } else if (coverage === "zone") {
    prob += 0.03;
  } else {
    // off
    prob += 0.05;
  }

  return Math.min(0.95, Math.max(0.05, prob));
}

/**
 * Completion percentage over expected (CPOE).
 * Returns actual - expected as percentage points.
 */
export function completionPercentageOverExpected(
  actual: number,
  expected: number,
): number {
  return actual - expected;
}

/**
 * Average air yards across targets and completed targets only.
 * If completions is omitted/null, treats all targets as completed.
 */
export function averageAirYards(
  targets: number[],
  completions?: number[],
): { total: number; completed: number } {
  const totalAvg =
    targets.length === 0
      ? 0
      : targets.reduce((s, v) => s + v, 0) / targets.length;

  const completedArr = completions ?? targets;
  const completedAvg =
    completedArr.length === 0
      ? 0
      : completedArr.reduce((s, v) => s + v, 0) / completedArr.length;

  return { total: totalAvg, completed: completedAvg };
}

/** Air yards share = player target air yards / team air yards; 0 if team=0 */
export function airYardsShare(
  playerTargetAirYards: number,
  teamAirYards: number,
): number {
  if (teamAirYards === 0) return 0;
  return playerTargetAirYards / teamAirYards;
}

/** Target share = player targets / team targets; 0 if team=0 */
export function targetShare(
  playerTargets: number,
  teamTargets: number,
): number {
  if (teamTargets === 0) return 0;
  return playerTargets / teamTargets;
}

/**
 * Weighted Opportunity Rating (WOPR) = 1.5*targetShare + 0.7*airYardsShare.
 * Clamped to [0, 1].
 */
export function woprScore(
  targetShareValue: number,
  airYardsShareValue: number,
): number {
  const raw = 1.5 * targetShareValue + 0.7 * airYardsShareValue;
  return Math.min(1, Math.max(0, raw));
}

// ---------------------------------------------------------------------------
// 3. Rushing metrics
// ---------------------------------------------------------------------------

/** Stuff rate = carries stuffed for ≤0 yards / total carries; 0 if carries=0 */
export function stuffRate(stuffed: number, carries: number): number {
  if (carries === 0) return 0;
  return stuffed / carries;
}

/** Yards before contact = total yards - yards after contact */
export function yardsBeforeContact(
  totalYards: number,
  yardAfterContact: number,
): number {
  return totalYards - yardAfterContact;
}

/**
 * Average yards after contact across all carries.
 * YAC per carry = totalYards - yardBeforeContact.
 */
export function yardsAfterContact(
  tackleStats: Array<{ totalYards: number; yardBeforeContact: number }>,
): number {
  if (tackleStats.length === 0) return 0;
  const total = tackleStats.reduce(
    (sum, s) => sum + (s.totalYards - s.yardBeforeContact),
    0,
  );
  return total / tackleStats.length;
}

/**
 * True Passer Rating (custom metric).
 * (passYds + 20*TDs - 45*INTs + 0.5*completions + 0.25*(attempts-completions)
 *  + 0.5*airYards + 0.25*yac) / attempts
 * Throws if attempts = 0.
 */
export function truePasser(
  passingYards: number,
  tds: number,
  interceptions: number,
  completions: number,
  attempts: number,
  airYardsValue: number,
  yac: number,
): number {
  if (attempts === 0) {
    throw new Error("Cannot compute truePasser with zero attempts");
  }
  return (
    (passingYards +
      20 * tds -
      45 * interceptions +
      0.5 * completions +
      0.25 * (attempts - completions) +
      0.5 * airYardsValue +
      0.25 * yac) /
    attempts
  );
}

/** Count rushing attempts inside the opponent's 5-yard line (yardLine <= 5) */
export function rushingAttemptsInside5(
  carries: Array<{ yardLine: number }>,
): number {
  return carries.filter((c) => c.yardLine <= 5).length;
}

// ---------------------------------------------------------------------------
// 4. Fourth-down decision analytics
// ---------------------------------------------------------------------------

/**
 * Expected value of going for it on 4th down.
 * conversionProb = max(0.1, 0.6 - yardsToGo*0.05)
 * If converted: EP from 1st down at that yardLine
 * If failed: -EP(opp 1st down at 100 - yardLine after turnover on downs)
 */
export function goForItExpectedValue(
  yardsToGo: number,
  yardLine: number,
  down: number = 4,
): number {
  const conversionProb = Math.max(0.1, 0.6 - yardsToGo * 0.05);
  const epIfConverted = expectedPoints(1, 10, yardLine);
  const epIfFailed = -expectedPoints(1, 10, 100 - yardLine);
  void down; // parameter retained for API compatibility
  return conversionProb * epIfConverted + (1 - conversionProb) * epIfFailed;
}

/**
 * Expected value of punting.
 * Opponent gets ball at (yardLine - puntNetYards) from their own end.
 * Returns -expectedPoints(1, 10, 100 - (yardLine - puntNetYards))
 */
export function puntExpectedValue(
  yardLine: number,
  puntNetYards: number = 40,
): number {
  const oppYardLine = 100 - (yardLine - puntNetYards);
  return -expectedPoints(1, 10, oppYardLine);
}

/**
 * Expected value of a field goal attempt.
 * fieldGoalPct defaults to max(0.1, 0.95 - (yardLine-20)*0.02) where yardLine
 * is distance from goal line (roughly from line of scrimmage).
 * If made: +3 pts. If missed: -expectedPoints(1, 10, 100-yardLine+7)
 */
export function fieldGoalExpectedValue(
  yardLine: number,
  fieldGoalPct?: number,
): number {
  const pct =
    fieldGoalPct !== undefined
      ? fieldGoalPct
      : Math.max(0.1, 0.95 - (yardLine - 20) * 0.02);
  const evMake = 3;
  const evMiss = -expectedPoints(1, 10, 100 - yardLine + 7);
  return pct * evMake + (1 - pct) * evMiss;
}

/**
 * Returns optimal 4th-down decision based on highest expected value.
 */
export function optimalFourthDownDecision(
  yardsToGo: number,
  yardLine: number,
): "go" | "punt" | "fieldGoal" {
  const goEV = goForItExpectedValue(yardsToGo, yardLine);
  const puntEV = puntExpectedValue(yardLine);
  const fgEV = fieldGoalExpectedValue(yardLine);

  if (goEV >= puntEV && goEV >= fgEV) return "go";
  if (fgEV >= puntEV) return "fieldGoal";
  return "punt";
}

/**
 * Win probability added by a decision relative to optimal.
 * (chosenEV - bestEV) / runsPerPoint; default runsPerPoint=6
 */
export function winProbabilityAddedByDecision(
  chosenEV: number,
  bestEV: number,
  runsPerPoint: number = 6,
): number {
  return (chosenEV - bestEV) / runsPerPoint;
}

// ---------------------------------------------------------------------------
// 5. Defensive metrics
// ---------------------------------------------------------------------------

/** Pressure rate = pressures / dropbacks; 0 if dropbacks=0 */
export function pressureRate(pressures: number, dropbacks: number): number {
  if (dropbacks === 0) return 0;
  return pressures / dropbacks;
}

/**
 * Coverage grade (0–100).
 * 100 - (50*(completions/targets) + 0.5*yardsAllowed/targets
 *       + 10*tdsAllowed - 20*interceptions)
 * Clamped to [0, 100].
 */
export function coverageGrade(
  targets: number,
  completions: number,
  yardsAllowed: number,
  tdsAllowed: number,
  interceptions: number,
): number {
  if (targets === 0) return 100;
  const raw =
    100 -
    (50 * (completions / targets) +
      0.5 * (yardsAllowed / targets) +
      10 * tdsAllowed -
      20 * interceptions);
  return Math.min(100, Math.max(0, raw));
}

/**
 * Defense-adjusted yards — adjusts for opponent quality.
 * actualYards * (1 + (opponentOffensiveRank - 16) / 32)
 * Rank 1 = best offense (hardest to defend against).
 */
export function defenseAdjustedYards(
  actualYards: number,
  leagueAvgYards: number,
  opponentOffensiveRank: number,
): number {
  void leagueAvgYards; // retained for API compatibility
  return actualYards * (1 + (opponentOffensiveRank - 16) / 32);
}

/**
 * Stop rate = fraction of defensive plays where the offense had negative EPA.
 */
export function stopRate(plays: Array<{ epa: number }>): number {
  if (plays.length === 0) return 0;
  return plays.filter((p) => p.epa < 0).length / plays.length;
}

/**
 * Havoc rate = (sacks + TFL + passes defended) / plays; 0 if plays=0
 */
export function havocRate(
  sacks: number,
  tfl: number,
  passes_defended: number,
  plays: number,
): number {
  if (plays === 0) return 0;
  return (sacks + tfl + passes_defended) / plays;
}

// ---------------------------------------------------------------------------
// 6. Team efficiency metrics
// ---------------------------------------------------------------------------

/**
 * Offensive efficiency = (pointsScored/drives) * yardsPerPlay / 10
 */
export function offensiveEfficiency(
  pointsScored: number,
  drives: number,
  yardsPerPlay: number,
): number {
  if (drives === 0) return 0;
  return (pointsScored / drives) * (yardsPerPlay / 10);
}

/**
 * Defensive efficiency (lower is better; scale 0–10).
 * 10 - (pointsAllowed/drives) * yardsPerPlay / 10; clamped to [0, 10].
 */
export function defensiveEfficiency(
  pointsAllowed: number,
  drives: number,
  yardsPerPlay: number,
): number {
  if (drives === 0) return 10;
  const raw = 10 - (pointsAllowed / drives) * (yardsPerPlay / 10);
  return Math.min(10, Math.max(0, raw));
}

/** Turnover differential = takeaways - giveaways */
export function turnoverDifferential(
  takeaways: number,
  giveaways: number,
): number {
  return takeaways - giveaways;
}

/**
 * Explosive play rate = fraction of plays ≥ threshold yards.
 * Default threshold is 15 yards.
 */
export function explosivePlayRate(
  plays: Array<{ yards: number }>,
  threshold: number = 15,
): number {
  if (plays.length === 0) return 0;
  return plays.filter((p) => p.yards >= threshold).length / plays.length;
}

/** Red zone efficiency = scores / trips; 0 if no trips */
export function redZoneEfficiency(
  redZoneScores: number,
  redZoneTrips: number,
): number {
  if (redZoneTrips === 0) return 0;
  return redZoneScores / redZoneTrips;
}

/** Third-down conversion rate = conversions / attempts; 0 if no attempts */
export function thirdDownConversionRate(
  conversions: number,
  attempts: number,
): number {
  if (attempts === 0) return 0;
  return conversions / attempts;
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy scoring
// ---------------------------------------------------------------------------

export interface DKQBStats {
  passingYards: number;
  passingTDs: number;
  interceptions: number;
  rushingYards: number;
  rushingTDs: number;
  twoPointConversions: number;
  fumblesLost: number;
}

/** DraftKings QB scoring */
export function dkQBScore(stats: DKQBStats): number {
  return (
    0.04 * stats.passingYards +
    4 * stats.passingTDs -
    1 * stats.interceptions +
    0.1 * stats.rushingYards +
    6 * stats.rushingTDs +
    2 * stats.twoPointConversions -
    1 * stats.fumblesLost
  );
}

export interface DKRBStats {
  rushingYards: number;
  rushingTDs: number;
  receptions: number;
  receivingYards: number;
  receivingTDs: number;
  twoPointConversions: number;
  fumblesLost: number;
}

/** DraftKings RB scoring */
export function dkRBScore(stats: DKRBStats): number {
  return (
    0.1 * stats.rushingYards +
    6 * stats.rushingTDs +
    1 * stats.receptions +
    0.1 * stats.receivingYards +
    6 * stats.receivingTDs +
    2 * stats.twoPointConversions -
    1 * stats.fumblesLost
  );
}

export interface DKWRTEStats {
  receptions: number;
  receivingYards: number;
  receivingTDs: number;
  twoPointConversions: number;
  fumblesLost: number;
}

/** DraftKings WR/TE scoring */
export function dkWRTEScore(stats: DKWRTEStats): number {
  return (
    1 * stats.receptions +
    0.1 * stats.receivingYards +
    6 * stats.receivingTDs +
    2 * stats.twoPointConversions -
    1 * stats.fumblesLost
  );
}

export interface DKDSTStats {
  sacks: number;
  interceptions: number;
  fumblesRecovered: number;
  safeties: number;
  touchdowns: number;
  pointsAllowed: number;
  yardsAllowed: number;
}

function pointsAllowedScore(pts: number): number {
  if (pts === 0) return 10;
  if (pts <= 6) return 7;
  if (pts <= 13) return 4;
  if (pts <= 20) return 1;
  if (pts <= 27) return 0;
  if (pts <= 34) return -1;
  return -4;
}

function yardsAllowedScore(yards: number): number {
  if (yards < 100) return 5;
  if (yards < 200) return 3;
  if (yards < 300) return 2;
  if (yards < 350) return 0;
  if (yards < 400) return -1;
  if (yards < 450) return -3;
  if (yards < 500) return -5;
  return -7;
}

/** DraftKings DST scoring */
export function dkDSTScore(stats: DKDSTStats): number {
  return (
    1 * stats.sacks +
    2 * stats.interceptions +
    2 * stats.fumblesRecovered +
    2 * stats.safeties +
    6 * stats.touchdowns +
    pointsAllowedScore(stats.pointsAllowed) +
    yardsAllowedScore(stats.yardsAllowed)
  );
}

// ---------------------------------------------------------------------------
// 8. Game script and situational
// ---------------------------------------------------------------------------

/**
 * Classify game script based on score differential, quarter, time remaining.
 * blowout: |diff|>=17 after Q2
 * comeback: trailing by >=14 in Q4
 * close: |diff|<=3 in Q4
 * else: normal
 */
export function gameScript(
  scoreDiff: number,
  quarter: number,
  timeRemaining: number,
): "blowout" | "comeback" | "close" | "normal" {
  void timeRemaining; // used implicitly via quarter context
  if (Math.abs(scoreDiff) >= 17 && quarter > 2) return "blowout";
  if (scoreDiff <= -14 && quarter === 4) return "comeback";
  if (Math.abs(scoreDiff) <= 3 && quarter === 4) return "close";
  return "normal";
}

/**
 * Two-minute drill urgency score (0–100).
 * 100 * (1 - timeRemaining/120) * (1 + |scoreDiff|/14) * timeoutBonus
 * timeRemaining in seconds (max 120 = 2 min)
 * timeoutBonus: 3=1.0, 2=0.9, 1=0.75, 0=0.5
 */
export function twoMinuteDrillPressure(
  timeRemaining: number,
  scoreDiff: number,
  timeoutsRemaining: number,
): number {
  const timeoutBonusMap: Record<number, number> = {
    3: 1.0,
    2: 0.9,
    1: 0.75,
    0: 0.5,
  };
  const timeoutBonus = timeoutBonusMap[timeoutsRemaining] ?? 0.5;
  const clampedTime = Math.min(120, Math.max(0, timeRemaining));
  const urgency =
    100 *
    (1 - clampedTime / 120) *
    (1 + Math.abs(scoreDiff) / 14) *
    timeoutBonus;
  return Math.min(100, Math.max(0, urgency));
}

export interface WeatherImpact {
  passingImpact: number;
  kickingImpact: number;
}

/**
 * Weather impact on passing and kicking.
 * Wind: above 15 mph reduces passing by -0.05 per mph over 15.
 * Cold: below 32F reduces kicking by -0.02 per degree under 32.
 * Precipitation compounds both effects.
 */
export function weatherImpact(
  windSpeedMph: number,
  temperatureFahrenheit: number,
  precipitation: "none" | "light" | "heavy",
): WeatherImpact {
  let passingImpact = 0;
  let kickingImpact = 0;

  // Wind impact on passing
  if (windSpeedMph > 15) {
    passingImpact -= 0.05 * (windSpeedMph - 15);
  }

  // Cold impact on kicking
  if (temperatureFahrenheit < 32) {
    kickingImpact -= 0.02 * (32 - temperatureFahrenheit);
  }

  // Precipitation compounds both
  if (precipitation === "light") {
    passingImpact -= 0.05;
    kickingImpact -= 0.05;
  } else if (precipitation === "heavy") {
    passingImpact -= 0.15;
    kickingImpact -= 0.15;
  }

  return { passingImpact, kickingImpact };
}
