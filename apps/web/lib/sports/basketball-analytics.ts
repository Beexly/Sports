/**
 * basketball-analytics.ts
 * Pure TypeScript advanced basketball analytics — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerBoxScore {
  minutes: number
  points: number
  fieldGoalsAttempted: number
  fieldGoalsMade: number
  threePointAttempted: number
  threePointMade: number
  freeThrowsAttempted: number
  freeThrowsMade: number
  offensiveRebounds: number
  defensiveRebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  personalFouls: number
}

export interface TeamStats {
  points: number
  fieldGoalsAttempted: number
  fieldGoalsMade: number
  threePointAttempted: number
  threePointMade: number
  freeThrowsAttempted: number
  freeThrowsMade: number
  offensiveRebounds: number
  defensiveRebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  personalFouls: number
  pace?: number // possessions per 48 min
}

export interface LeagueAverages {
  pointsPerGame: number
  fieldGoalPct: number
  threePct: number
  freeThrowPct: number
  assistsPerGame: number
  stealsPerGame: number
  blocksPerGame: number
  turnoversPerGame: number
  reboundsPerGame: number
  pace: number // possessions per 48 min
}

// ---------------------------------------------------------------------------
// Shooting efficiency
// ---------------------------------------------------------------------------

/**
 * Effective Field Goal Percentage
 * eFG% = (FGM + 0.5 * 3PM) / FGA
 */
export function effectiveFieldGoalPct(
  fgm: number,
  threesMade: number,
  fga: number,
): number {
  if (fga === 0) return 0
  return (fgm + 0.5 * threesMade) / fga
}

/**
 * True Shooting Percentage
 * TS% = points / (2 * (FGA + 0.44 * FTA))
 */
export function trueShootingPct(
  points: number,
  fga: number,
  fta: number,
): number {
  const denominator = 2 * (fga + 0.44 * fta)
  if (denominator === 0) return 0
  return points / denominator
}

/**
 * Free Throw Rate = FTA / FGA
 */
export function freeThrowRate(fta: number, fga: number): number {
  if (fga === 0) return 0
  return fta / fga
}

/**
 * Three Point Rate = 3PA / FGA
 */
export function threePointRate(tpa: number, fga: number): number {
  if (fga === 0) return 0
  return tpa / fga
}

/**
 * Combined shooting efficiency metrics for a player box score.
 */
export function shootingEfficiencyRating(p: PlayerBoxScore): {
  efg: number
  ts: number
  threeRate: number
  ftRate: number
} {
  return {
    efg: effectiveFieldGoalPct(p.fieldGoalsMade, p.threePointMade, p.fieldGoalsAttempted),
    ts: trueShootingPct(p.points, p.fieldGoalsAttempted, p.freeThrowsAttempted),
    threeRate: threePointRate(p.threePointAttempted, p.fieldGoalsAttempted),
    ftRate: freeThrowRate(p.freeThrowsAttempted, p.fieldGoalsAttempted),
  }
}

// ---------------------------------------------------------------------------
// Rebounding
// ---------------------------------------------------------------------------

/**
 * Offensive Rebound Percentage
 * ORB% = (ORB * teamMin) / (playerMin * (teamORB + oppDRB))
 */
export function offensiveReboundPct(
  orb: number,
  teamOrb: number,
  oppDrb: number,
  playerMin: number,
  teamMin: number,
): number {
  const denominator = playerMin * (teamOrb + oppDrb)
  if (denominator === 0) return 0
  return (orb * teamMin) / denominator
}

/**
 * Defensive Rebound Percentage
 * DRB% = (DRB * teamMin) / (playerMin * (teamDRB + oppORB))
 */
export function defensiveReboundPct(
  drb: number,
  teamDrb: number,
  oppOrb: number,
  playerMin: number,
  teamMin: number,
): number {
  const denominator = playerMin * (teamDrb + oppOrb)
  if (denominator === 0) return 0
  return (drb * teamMin) / denominator
}

/**
 * Total Rebound Percentage
 * TRB% = ((ORB + DRB) * teamMin) / (playerMin * (teamORB + teamDRB + oppORB + oppDRB))
 */
export function totalReboundPct(
  orb: number,
  drb: number,
  teamOrb: number,
  teamDrb: number,
  oppOrb: number,
  oppDrb: number,
  playerMin: number,
  teamMin: number,
): number {
  const denominator = playerMin * (teamOrb + teamDrb + oppOrb + oppDrb)
  if (denominator === 0) return 0
  return ((orb + drb) * teamMin) / denominator
}

// ---------------------------------------------------------------------------
// Assist / Turnover
// ---------------------------------------------------------------------------

/**
 * Assist Percentage
 * AST% = (AST * teamMin) / (playerMin * (teamFGM - playerFGM))
 */
export function assistPct(
  ast: number,
  playerMin: number,
  teamMin: number,
  teamFgm: number,
  playerFgm: number,
): number {
  const denominator = playerMin * (teamFgm - playerFgm)
  if (denominator === 0) return 0
  return (ast * teamMin) / denominator
}

/**
 * Turnover Percentage
 * TOV% = TOV / (FGA + 0.44 * FTA + TOV)
 */
export function turnoverPct(tov: number, fga: number, fta: number): number {
  const denominator = fga + 0.44 * fta + tov
  if (denominator === 0) return 0
  return tov / denominator
}

/**
 * Assist-to-Turnover Ratio
 */
export function assistToTurnover(ast: number, tov: number): number {
  if (tov === 0) return ast === 0 ? 0 : Infinity
  return ast / tov
}

// ---------------------------------------------------------------------------
// Usage & Impact
// ---------------------------------------------------------------------------

/**
 * Usage Rate
 * Usage = (FGA + 0.44*FTA + TOV) * teamMin / (playerMin * (teamFGA + 0.44*teamFTA + teamTOV))
 */
export function usageRate(
  fga: number,
  fta: number,
  tov: number,
  playerMin: number,
  teamMin: number,
  teamFga: number,
  teamFta: number,
  teamTov: number,
): number {
  const playerPoss = fga + 0.44 * fta + tov
  const teamPoss = teamFga + 0.44 * teamFta + teamTov
  const denominator = playerMin * teamPoss
  if (denominator === 0) return 0
  return (playerPoss * teamMin) / denominator
}

/**
 * Estimated Possessions (Hollinger)
 * Poss = FGA - ORB + TOV + 0.44 * FTA
 */
export function estimatedPossessions(
  fga: number,
  orb: number,
  tov: number,
  fta: number,
): number {
  return fga - orb + tov + 0.44 * fta
}

// ---------------------------------------------------------------------------
// PER (simplified Hollinger)
// ---------------------------------------------------------------------------

/**
 * Unadjusted PER
 * Simplified: (PTS + REB*1.2 + AST*1.5 + (STL+BLK)*2 - FGMiss*0.5 - FTMiss*0.5 - TOV) / MIN * 15
 */
export function perUnadjusted(p: PlayerBoxScore, _lgAvg: LeagueAverages): number {
  if (p.minutes === 0) return 0
  const fgMiss = p.fieldGoalsAttempted - p.fieldGoalsMade
  const ftMiss = p.freeThrowsAttempted - p.freeThrowsMade
  const totalReb = p.offensiveRebounds + p.defensiveRebounds
  const value =
    p.points +
    totalReb * 1.2 +
    p.assists * 1.5 +
    (p.steals + p.blocks) * 2 -
    fgMiss * 0.5 -
    ftMiss * 0.5 -
    p.turnovers
  return (value / p.minutes) * 15
}

/**
 * Full simplified PER adjusted for pace.
 * Multiply perUnadjusted by (lgPace / teamPace) * (15 / lgAvgPER)
 * lgAvgPER assumed = 15 (NBA standard); returns 0 for 0 minutes.
 */
export function playerEfficiencyRating(
  p: PlayerBoxScore,
  teamStats: TeamStats,
  lgAvg: LeagueAverages,
): number {
  if (p.minutes === 0) return 0
  const raw = perUnadjusted(p, lgAvg)
  const teamPace = teamStats.pace ?? lgAvg.pace
  const paceFactor = teamPace === 0 ? 1 : lgAvg.pace / teamPace
  // lgAvgPER = 15 by convention
  return raw * paceFactor
}

// ---------------------------------------------------------------------------
// Box Plus/Minus (simplified)
// ---------------------------------------------------------------------------

/**
 * Simplified BPM.
 * OBPM: scoring/creation/shooting efficiency vs league average.
 * DBPM: steals, blocks, defensive rebounds vs league average.
 * BPM = OBPM + DBPM.
 */
export function boxPlusMinus(
  p: PlayerBoxScore,
  teamOffRtg: number,
  teamDefRtg: number,
  lgAvg: LeagueAverages,
): {
  offensiveBpm: number
  defensiveBpm: number
  bpm: number
} {
  if (p.minutes === 0) {
    return { offensiveBpm: 0, defensiveBpm: 0, bpm: 0 }
  }

  const per36 = (val: number) => (val / p.minutes) * 36

  const pts36 = per36(p.points)
  const ast36 = per36(p.assists)
  const tov36 = per36(p.turnovers)
  const stl36 = per36(p.steals)
  const blk36 = per36(p.blocks)
  const drb36 = per36(p.defensiveRebounds)
  const orb36 = per36(p.offensiveRebounds)

  const efg = effectiveFieldGoalPct(p.fieldGoalsMade, p.threePointMade, p.fieldGoalsAttempted)
  const lgEfg = lgAvg.fieldGoalPct

  // League averages are team-level; estimate per-player (5 players, ~33.6 min avg)
  // to make meaningful per-36 comparisons
  const lgPts36PerPlayer = lgAvg.pointsPerGame / 5
  const lgAst36PerPlayer = lgAvg.assistsPerGame / 5
  const lgTov36PerPlayer = lgAvg.turnoversPerGame / 5
  const lgStl36PerPlayer = lgAvg.stealsPerGame / 5
  const lgBlk36PerPlayer = lgAvg.blocksPerGame / 5
  const lgDrb36PerPlayer = lgAvg.reboundsPerGame * 0.7 / 5
  const lgOrb36PerPlayer = lgAvg.reboundsPerGame * 0.3 / 5

  // Offensive BPM: scoring + creation vs league, blended with team offense context
  const scoringEdge = (pts36 - lgPts36PerPlayer) * 0.5
  const shootingEdge = (efg - lgEfg) * 20
  const creationEdge = (ast36 - lgAst36PerPlayer) * 1.5 - (tov36 - lgTov36PerPlayer) * 1.5
  const orbEdge = (orb36 - lgOrb36PerPlayer) * 0.5
  const offRtgEdge = (teamOffRtg - 110) * 0.05

  const offensiveBpm = scoringEdge + shootingEdge + creationEdge + orbEdge + offRtgEdge

  // Defensive BPM: steals, blocks, defensive rebounds vs league
  const stlEdge = (stl36 - lgStl36PerPlayer) * 3.0
  const blkEdge = (blk36 - lgBlk36PerPlayer) * 1.5
  const drbEdge = (drb36 - lgDrb36PerPlayer) * 0.5
  const defRtgEdge = (110 - teamDefRtg) * 0.05

  const defensiveBpm = stlEdge + blkEdge + drbEdge + defRtgEdge

  return {
    offensiveBpm,
    defensiveBpm,
    bpm: offensiveBpm + defensiveBpm,
  }
}

// ---------------------------------------------------------------------------
// VORP
// ---------------------------------------------------------------------------

/**
 * Value Over Replacement Player
 * VORP = (BPM - replacementLevel) * minutes / 48
 * replacementLevel default = -2.0
 */
export function vorp(
  bpm: number,
  minutes: number,
  replacementLevel: number = -2.0,
): number {
  return (bpm - replacementLevel) * (minutes / 48)
}

// ---------------------------------------------------------------------------
// Win Shares (simplified)
// ---------------------------------------------------------------------------

/**
 * Offensive Win Shares (simplified)
 * Marginal offense = points produced - (lgPts/lgPoss) * possessions used
 * OWS = marginalOffense / marginalPtsPerWin (~33 NBA)
 */
export function offensiveWinShares(
  p: PlayerBoxScore,
  teamStats: TeamStats,
  lgAvg: LeagueAverages,
): number {
  if (p.minutes === 0) return 0

  // Points produced estimate
  const teamPoss = estimatedPossessions(
    teamStats.fieldGoalsAttempted,
    teamStats.offensiveRebounds,
    teamStats.turnovers,
    teamStats.freeThrowsAttempted,
  )
  const minutesFraction = teamPoss === 0 ? 0 : p.minutes / 240 // 5 players * 48 min

  // Approximate points produced by the player
  const pointsProduced =
    p.points +
    p.assists * (teamStats.points / Math.max(teamStats.fieldGoalsMade, 1) - 1) * 0.5

  // Possessions used
  const possUsed = estimatedPossessions(
    p.fieldGoalsAttempted,
    p.offensiveRebounds,
    p.turnovers,
    p.freeThrowsAttempted,
  )

  const lgPtsPerPoss = lgAvg.pointsPerGame / lgAvg.pace
  const marginalOffense = pointsProduced - lgPtsPerPoss * possUsed
  const marginalPtsPerWin = 33

  const ows = marginalOffense / marginalPtsPerWin
  // Cap at reasonable range relative to minutes played
  return Math.max(0, ows * (1 + minutesFraction * 0.1))
}

/**
 * Defensive Win Shares (simplified)
 * Weight steals, blocks, defensive rebounds vs league average.
 */
export function defensiveWinShares(
  p: PlayerBoxScore,
  teamStats: TeamStats,
  lgAvg: LeagueAverages,
): number {
  if (p.minutes === 0) return 0

  const stlContrib = p.steals * 1.5
  const blkContrib = p.blocks * 1.1
  const drbContrib = p.defensiveRebounds * 0.3
  const foulPenalty = p.personalFouls * 0.1

  const rawDefValue = stlContrib + blkContrib + drbContrib - foulPenalty

  // League expected defensive value per minute per player (5 players share team stats)
  const lgDefPerMin =
    (lgAvg.stealsPerGame * 1.5 + lgAvg.blocksPerGame * 1.1 + lgAvg.reboundsPerGame * 0.7 * 0.3) /
    (48 * 5)
  const playerDefPerMin = rawDefValue / Math.max(p.minutes, 1)

  const marginalDef = (playerDefPerMin - lgDefPerMin) * p.minutes
  const marginalPtsPerWin = 33

  return Math.max(0, marginalDef / marginalPtsPerWin)
}

/**
 * Total Win Shares = OWS + DWS
 */
export function winShares(
  p: PlayerBoxScore,
  teamStats: TeamStats,
  lgAvg: LeagueAverages,
): number {
  return (
    offensiveWinShares(p, teamStats, lgAvg) + defensiveWinShares(p, teamStats, lgAvg)
  )
}

// ---------------------------------------------------------------------------
// Game Score (Hollinger)
// ---------------------------------------------------------------------------

/**
 * Game Score
 * GmSc = PTS + 0.4*FGM - 0.7*FGA - 0.4*(FTA-FTM) + 0.7*ORB + 0.3*DRB + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TOV
 */
export function gameScore(p: PlayerBoxScore): number {
  return (
    p.points +
    0.4 * p.fieldGoalsMade -
    0.7 * p.fieldGoalsAttempted -
    0.4 * (p.freeThrowsAttempted - p.freeThrowsMade) +
    0.7 * p.offensiveRebounds +
    0.3 * p.defensiveRebounds +
    p.steals +
    0.7 * p.assists +
    0.7 * p.blocks -
    0.4 * p.personalFouls -
    p.turnovers
  )
}

// ---------------------------------------------------------------------------
// Double-doubles / Triple-doubles
// ---------------------------------------------------------------------------

function statCategories(p: PlayerBoxScore): Record<string, number> {
  return {
    points: p.points,
    rebounds: p.offensiveRebounds + p.defensiveRebounds,
    assists: p.assists,
    steals: p.steals,
    blocks: p.blocks,
  }
}

/**
 * Returns which stat categories hit the threshold.
 */
export function statlineCategories(
  p: PlayerBoxScore,
  threshold: number = 10,
): string[] {
  const cats = statCategories(p)
  return Object.entries(cats)
    .filter(([, val]) => val >= threshold)
    .map(([cat]) => cat)
}

/**
 * Returns true if 2 or more stat categories reach the threshold.
 */
export function isDoubleDouble(
  p: PlayerBoxScore,
  threshold: number = 10,
): boolean {
  return statlineCategories(p, threshold).length >= 2
}

/**
 * Returns true if 3 or more stat categories reach the threshold.
 */
export function isTripleDouble(
  p: PlayerBoxScore,
  threshold: number = 10,
): boolean {
  return statlineCategories(p, threshold).length >= 3
}

// ---------------------------------------------------------------------------
// Clutch rating (simplified estimation)
// ---------------------------------------------------------------------------

/**
 * Clutch Rating
 * Compare clutch scoring efficiency vs overall.
 * Positive = better in clutch.
 */
export function clutchRating(
  p: PlayerBoxScore,
  clutchMinutes: number,
  clutchPoints: number,
  clutchFga: number,
): number {
  const overallPtsPerMin = p.minutes === 0 ? 0 : p.points / p.minutes
  const clutchPtsPerMin = clutchMinutes === 0 ? 0 : clutchPoints / clutchMinutes

  const overallEfg = effectiveFieldGoalPct(
    p.fieldGoalsMade,
    p.threePointMade,
    p.fieldGoalsAttempted,
  )
  // Estimate clutch FGM from clutch points (assuming similar FT rate)
  const estimatedClutchFgm = clutchFga === 0 ? 0 : (clutchPoints / 2) * 0.5
  const clutchEfg = clutchFga === 0 ? 0 : effectiveFieldGoalPct(estimatedClutchFgm, 0, clutchFga)

  const volumeDiff = (clutchPtsPerMin - overallPtsPerMin) * 10
  const efficiencyDiff = (clutchEfg - overallEfg) * 20

  return volumeDiff + efficiencyDiff
}

// ---------------------------------------------------------------------------
// Team analytics
// ---------------------------------------------------------------------------

/**
 * Net Rating = Offensive Rating - Defensive Rating
 */
export function netRating(ortg: number, drtg: number): number {
  return ortg - drtg
}

/**
 * Adjusted Net Rating (accounts for strength of schedule)
 */
export function adjustedNetRating(netRtg: number, strengthOfSchedule: number): number {
  return netRtg - strengthOfSchedule
}

/**
 * Expected Wins using logistic curve
 * Expected wins = games / (1 + 10^(-netRating/12.5))
 */
export function expectedWins(netRating: number, games: number): number {
  return games / (1 + Math.pow(10, -netRating / 12.5))
}

// ---------------------------------------------------------------------------
// Fantasy Scoring
// ---------------------------------------------------------------------------

/**
 * Fantasy score for DraftKings, FanDuel, or Yahoo formats.
 *
 * DK: PTS + 0.5*3PM + 1.25*(ORB+DRB) + 1.5*AST + 2*STL + 2*BLK - 0.5*TOV
 *   + bonuses: DD (+1.5), TD (+3)
 * FD: PTS + 1.2*(ORB+DRB) + 1.5*AST + 3*STL + 3*BLK - TOV (no DD bonus)
 * Yahoo: PTS + 1.2*(ORB+DRB) + 1.5*AST + 3*STL + 3*BLK - TOV
 *   + bonuses: DD (+3), TD (+4.5)
 */
export function fantasyScore(
  p: PlayerBoxScore,
  format: 'draftKings' | 'fanduel' | 'yahoo',
): number {
  const totalReb = p.offensiveRebounds + p.defensiveRebounds

  if (format === 'draftKings') {
    let score =
      p.points +
      0.5 * p.threePointMade +
      1.25 * totalReb +
      1.5 * p.assists +
      2 * p.steals +
      2 * p.blocks -
      0.5 * p.turnovers

    const dd = isDoubleDouble(p)
    const td = isTripleDouble(p)
    if (td) {
      score += 3
    } else if (dd) {
      score += 1.5
    }
    return score
  }

  if (format === 'fanduel') {
    return (
      p.points +
      1.2 * totalReb +
      1.5 * p.assists +
      3 * p.steals +
      3 * p.blocks -
      p.turnovers
    )
  }

  // yahoo
  let score =
    p.points +
    1.2 * totalReb +
    1.5 * p.assists +
    3 * p.steals +
    3 * p.blocks -
    p.turnovers

  const dd = isDoubleDouble(p)
  const td = isTripleDouble(p)
  if (td) {
    score += 4.5
  } else if (dd) {
    score += 3
  }
  return score
}
