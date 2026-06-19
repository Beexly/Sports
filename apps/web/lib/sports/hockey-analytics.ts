/**
 * hockey-analytics.ts
 * Pure TypeScript NHL hockey analytics — no external dependencies.
 * Covers: Corsi/Fenwick, PDO, xG model, goalie metrics, zone analytics,
 *         line combinations, skater rates, DFS scoring, team efficiency.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShotAttempt {
  type: 'goal' | 'savedShot' | 'missedShot' | 'blockedShot'
  team: 'for' | 'against'
  strengthState: 'evenStrength' | 'powerPlay' | 'shortHanded'
  xCoord: number   // NHL standard: -100 to 100 (negative = defensive zone)
  yCoord: number   // -42 to 42 (from center ice line)
  period: number
  gameSecond: number
  shotType?: 'wrist' | 'slap' | 'snap' | 'backhand' | 'tip' | 'deflection' | 'wrap'
}

export interface GoalieStats {
  shotsAgainst: number
  goalsAgainst: number
  savesMade: number
  evenStrengthShotsAgainst: number
  evenStrengthGoals: number
  powerPlayShotsAgainst: number
  shortHandedGoals: number
  minutes: number
}

export interface SkaterStats {
  goals: number
  assists: number
  points: number
  shots: number
  plusMinus: number
  penaltyMinutes: number
  hits: number
  blocks: number
  faceoffsWon: number
  faceoffsLost: number
  timeOnIce: number  // seconds
  corsiFor?: number
  corsiAgainst?: number
  fenwickFor?: number
  fenwickAgainst?: number
}

// ---------------------------------------------------------------------------
// Corsi (all shot attempts)
// ---------------------------------------------------------------------------

/** Count team='for' shot attempts (all types). */
export function corsiFor(shots: ShotAttempt[]): number {
  return shots.filter(s => s.team === 'for').length
}

/** Count team='against' shot attempts (all types). */
export function corsiAgainst(shots: ShotAttempt[]): number {
  return shots.filter(s => s.team === 'against').length
}

/** Corsi For %: CF / (CF + CA). Returns 0 if no shots. */
export function corsiForPct(shots: ShotAttempt[]): number {
  const cf = corsiFor(shots)
  const ca = corsiAgainst(shots)
  const total = cf + ca
  if (total === 0) return 0
  return cf / total
}

/**
 * Corsi Relative: Player CF% minus Team CF% (without player).
 * Positive means player drives possession better than teammates.
 */
export function corsiRel(
  playerCF: number,
  playerCA: number,
  teamCF: number,
  teamCA: number,
): number {
  const playerTotal = playerCF + playerCA
  const teamTotal = teamCF + teamCA
  const playerPct = playerTotal === 0 ? 0 : playerCF / playerTotal
  const teamPct = teamTotal === 0 ? 0 : teamCF / teamTotal
  return playerPct - teamPct
}

// ---------------------------------------------------------------------------
// Fenwick (unblocked shot attempts: goals + saved + missed, NOT blocked)
// ---------------------------------------------------------------------------

/** Fenwick For: unblocked 'for' shots (goal, savedShot, missedShot). */
export function fenwickFor(shots: ShotAttempt[]): number {
  return shots.filter(
    s => s.team === 'for' && s.type !== 'blockedShot',
  ).length
}

/** Fenwick Against: unblocked 'against' shots (goal, savedShot, missedShot). */
export function fenwickAgainst(shots: ShotAttempt[]): number {
  return shots.filter(
    s => s.team === 'against' && s.type !== 'blockedShot',
  ).length
}

/** Fenwick For %: FF / (FF + FA). Returns 0 if no unblocked shots. */
export function fenwickForPct(shots: ShotAttempt[]): number {
  const ff = fenwickFor(shots)
  const fa = fenwickAgainst(shots)
  const total = ff + fa
  if (total === 0) return 0
  return ff / total
}

// ---------------------------------------------------------------------------
// PDO (shooting % + save %) — regresses strongly to 100
// ---------------------------------------------------------------------------

/**
 * PDO = (GF / SF * 100) + ((SA - GA) / SA * 100)
 * Sum of shooting % and save % each scaled to 100.
 * Returns 100 at replacement level; above 100 means lucky/hot.
 */
export function pdo(
  goalsFor: number,
  shotsFor: number,
  shotsAgainst: number,
  goalsAgainst: number,
): number {
  const shootingPct = shotsFor === 0 ? 0 : (goalsFor / shotsFor) * 100
  const savePct = shotsAgainst === 0 ? 0 : ((shotsAgainst - goalsAgainst) / shotsAgainst) * 100
  return shootingPct + savePct
}

// ---------------------------------------------------------------------------
// Expected Goals (NHL logistic model)
// ---------------------------------------------------------------------------

/**
 * NHL xG model: logistic base from distance + angle, with shot-type modifiers.
 * Distance from goal (near x=89, y=0): sqrt((89 - |xCoord|)^2 + yCoord^2)
 * Shot type modifiers applied multiplicatively then clamped 0–1.
 */
export function xgNHL(shot: ShotAttempt): number {
  const absX = Math.abs(shot.xCoord)
  const dist = Math.sqrt(Math.pow(89 - absX, 2) + Math.pow(shot.yCoord, 2))
  const angle = Math.atan2(Math.abs(shot.yCoord), Math.max(89 - absX, 0.1))

  // Base logistic: higher probability closer + more central
  // Coefficients tuned to produce realistic NHL xG values (~0.05 average)
  const logit = 0.6 - 0.04 * dist - 0.3 * angle
  const base = 1 / (1 + Math.exp(-logit))

  // Shot type modifiers
  let modifier = 1.0
  switch (shot.shotType) {
    case 'deflection':
    case 'tip':
      modifier = 1.15
      break
    case 'slap':
      modifier = 0.95
      break
    case 'backhand':
      modifier = 0.90
      break
    case 'wrist':
    case 'snap':
    case 'wrap':
      modifier = 1.0
      break
    default:
      modifier = 1.0
  }

  // Blocked shots have 0 xG (never reach net)
  if (shot.type === 'blockedShot') return 0

  return Math.min(1, Math.max(0, base * modifier))
}

/** Average xG per shot for a collection of shots. */
export function xgPerShot(shots: ShotAttempt[]): number {
  if (shots.length === 0) return 0
  return totalXg(shots) / shots.length
}

/** Sum of xG for a collection of shots. */
export function totalXg(shots: ShotAttempt[]): number {
  return shots.reduce((sum, s) => sum + xgNHL(s), 0)
}

// ---------------------------------------------------------------------------
// Goalie metrics
// ---------------------------------------------------------------------------

/** Save percentage: saves / shotsAgainst. Returns 0 for 0 shots. */
export function savePercentage(stats: GoalieStats): number {
  if (stats.shotsAgainst === 0) return 0
  return stats.savesMade / stats.shotsAgainst
}

/** Even strength save percentage. Returns 0 if no ES shots against. */
export function evenStrengthSavePct(stats: GoalieStats): number {
  if (stats.evenStrengthShotsAgainst === 0) return 0
  const esSaves = stats.evenStrengthShotsAgainst - stats.evenStrengthGoals
  return esSaves / stats.evenStrengthShotsAgainst
}

/** Goals Against Average per 60 minutes. Returns 0 for 0 minutes. */
export function goalsAgainstAverage(stats: GoalieStats): number {
  if (stats.minutes === 0) return 0
  return (stats.goalsAgainst / stats.minutes) * 60
}

/**
 * Quality Start Rate: fraction of starts where SV% >= threshold.
 * Default threshold = 0.885.
 */
export function qualityStartRate(
  starts: Array<{ savePercentage: number }>,
  threshold = 0.885,
): number {
  if (starts.length === 0) return 0
  const qualityStarts = starts.filter(s => s.savePercentage >= threshold).length
  return qualityStarts / starts.length
}

/**
 * Goals Saved Above Replacement (GSAR).
 * Replacement-level save% = 0.880.
 * GSAR = (actualSV% - 0.880) * shotsAgainst
 */
export function goaliePdr(stats: GoalieStats): number {
  if (stats.shotsAgainst === 0) return 0
  const replacementLevel = 0.880
  const actualSvPct = savePercentage(stats)
  return (actualSvPct - replacementLevel) * stats.shotsAgainst
}

/**
 * Goals Saved Above Expected (GSAx).
 * GSAx = (shotsAgainst * saveRate) - xgAgainst
 *       = goalsSaved - xgAgainst
 */
export function goardsSave(
  shotsAgainst: number,
  goalsSaved: number,
  xgAgainst: number,
): number {
  return goalsSaved - xgAgainst
}

// ---------------------------------------------------------------------------
// Zone analytics
// ---------------------------------------------------------------------------

/** Zone entry success rate: successes / attempts. Returns 0 for 0 attempts. */
export function zoneEntry(attempts: number, successes: number): number {
  if (attempts === 0) return 0
  return successes / attempts
}

/** Controlled zone entry rate: carries (not dump-ins) / total entries. */
export function controlledZoneEntry(carriesIn: number, totalEntries: number): number {
  if (totalEntries === 0) return 0
  return carriesIn / totalEntries
}

/** Zone exit success rate: successes / attempts. Returns 0 for 0 attempts. */
export function zoneExitSuccess(attempts: number, successes: number): number {
  if (attempts === 0) return 0
  return successes / attempts
}

/** Fraction of time spent in neutral zone. Returns 0 for 0 TOI. */
export function neutralZoneTime(secondsInNZ: number, totalTOI: number): number {
  if (totalTOI === 0) return 0
  return secondsInNZ / totalTOI
}

export type IceZone = 'defensiveZone' | 'neutralZone' | 'offensiveZone'

/**
 * Classify ice zone from xCoord for home or away team.
 * Home: x < -25 = defensiveZone, -25..25 = neutralZone, x > 25 = offensiveZone
 * Away: mirrored (x > 25 = defensiveZone, x < -25 = offensiveZone)
 */
export function classifyZone(xCoord: number, team: 'home' | 'away'): IceZone {
  if (team === 'home') {
    if (xCoord < -25) return 'defensiveZone'
    if (xCoord > 25) return 'offensiveZone'
    return 'neutralZone'
  } else {
    // Away team: perspective is flipped
    if (xCoord > 25) return 'defensiveZone'
    if (xCoord < -25) return 'offensiveZone'
    return 'neutralZone'
  }
}

// ---------------------------------------------------------------------------
// Line combinations
// ---------------------------------------------------------------------------

/**
 * Simplified line combination score.
 * Average points-per-60 across players, weighted 70% + 30% average CF%.
 */
export function lineCombinationScore(players: SkaterStats[]): number {
  if (players.length === 0) return 0

  const avgPP60 = players.reduce((sum, p) => {
    const pp60 = p.timeOnIce > 0 ? p.points / (p.timeOnIce / 3600) : 0
    return sum + pp60
  }, 0) / players.length

  const avgCFPct = players.reduce((sum, p) => {
    const cf = p.corsiFor ?? 0
    const ca = p.corsiAgainst ?? 0
    const total = cf + ca
    const pct = total > 0 ? cf / total : 0.5
    return sum + pct
  }, 0) / players.length

  return avgPP60 * 0.7 + avgCFPct * 100 * 0.3
}

/** xG per 60 minutes for a set of shots given minutes on ice. */
export function lineXgContribution(shots: ShotAttempt[], minutesOnIce: number): number {
  if (minutesOnIce === 0) return 0
  const xg = totalXg(shots)
  return (xg / minutesOnIce) * 60
}

// ---------------------------------------------------------------------------
// Skater metrics
// ---------------------------------------------------------------------------

/** Points per 60 minutes. Returns 0 for 0 TOI. */
export function pointsPer60(points: number, timeOnIce: number): number {
  if (timeOnIce === 0) return 0
  return points / (timeOnIce / 3600)
}

/** Goals per shot (shooting percentage). Returns 0 for 0 shots. */
export function goalsPerShot(goals: number, shots: number): number {
  if (shots === 0) return 0
  return goals / shots
}

/** Faceoff win percentage. Returns 0 if no faceoffs taken. */
export function faceoffWinPct(won: number, lost: number): number {
  const total = won + lost
  if (total === 0) return 0
  return won / total
}

/** Hits per game. Returns 0 for 0 games. */
export function hitsPerGame(hits: number, games: number): number {
  if (games === 0) return 0
  return hits / games
}

/** Blocks per game. Returns 0 for 0 games. */
export function blocksPerGame(blocks: number, games: number): number {
  if (games === 0) return 0
  return blocks / games
}

/** Penalty minutes per game. Returns 0 for 0 games. */
export function penaltyMinutesPerGame(pim: number, games: number): number {
  if (games === 0) return 0
  return pim / games
}

// ---------------------------------------------------------------------------
// Strength state filtering
// ---------------------------------------------------------------------------

/** Filter shots to only a specific strength state. */
export function filterByStrength(
  shots: ShotAttempt[],
  state: ShotAttempt['strengthState'],
): ShotAttempt[] {
  return shots.filter(s => s.strengthState === state)
}

/** Corsi For % at even strength only. */
export function evenStrengthCorsi(shots: ShotAttempt[]): number {
  const eShots = filterByStrength(shots, 'evenStrength')
  return corsiForPct(eShots)
}

// ---------------------------------------------------------------------------
// Momentum & streaks
// ---------------------------------------------------------------------------

/** Corsi For % of the last N shot events. */
export function shotRatioLast10(recentShots: ShotAttempt[]): number {
  return corsiForPct(recentShots)
}

/**
 * Is the goalie hot? True if average SV% >= 0.920 in last `window` games.
 * Default window = 5.
 */
export function hotGoalie(
  recentGames: Array<{ savePercentage: number }>,
  window = 5,
): boolean {
  const relevant = recentGames.slice(-window)
  if (relevant.length === 0) return false
  const avg = relevant.reduce((sum, g) => sum + g.savePercentage, 0) / relevant.length
  return avg >= 0.920
}

// ---------------------------------------------------------------------------
// Fantasy scoring
// ---------------------------------------------------------------------------

/**
 * Fantasy score for a skater.
 *
 * Yahoo:  G=3, A=2, +/-=1, PIM=-1, PPP=0.5, SHG=1, GWG=0.5, shots=0.5
 * ESPN:   G=6, A=4, +/-=2, PIM=-1, shots=0.5, blocks=0.5
 * DraftKings: G=8.5, A=5, +/-=2, blocks=1.3, shots=1.5, PPP=1.5, shortHandedPoint=2
 *
 * Note: SkaterStats doesn't have powerPlayPoints/shortHandedPoints/gameWinningGoals
 * as separate fields, so we approximate: PPP = 0, SHG = 0, GWG = 0 unless inferred.
 * These would need to be added to SkaterStats for full accuracy; we score what we have.
 */
export function fantasyScoreHockey(
  stats: SkaterStats,
  format: 'yahoo' | 'espn' | 'draftkings',
): number {
  switch (format) {
    case 'yahoo':
      return (
        stats.goals * 3 +
        stats.assists * 2 +
        stats.plusMinus * 1 +
        stats.penaltyMinutes * -1 +
        stats.shots * 0.5
      )

    case 'espn':
      return (
        stats.goals * 6 +
        stats.assists * 4 +
        stats.plusMinus * 2 +
        stats.penaltyMinutes * -1 +
        stats.shots * 0.5 +
        stats.blocks * 0.5
      )

    case 'draftkings':
      return (
        stats.goals * 8.5 +
        stats.assists * 5 +
        stats.plusMinus * 2 +
        stats.blocks * 1.3 +
        stats.shots * 1.5
      )
  }
}

// ---------------------------------------------------------------------------
// Team stats summary
// ---------------------------------------------------------------------------

/**
 * Compute team efficiency metrics from a shot attempt array.
 * Returns CF%, FF%, xGF%, and shot attempt differential (CF - CA).
 */
export function teamEfficiency(shots: ShotAttempt[]): {
  corsiForPct: number
  fenwickForPct: number
  xgForPct: number
  shotAttemptDifferential: number
} {
  const cf = corsiFor(shots)
  const ca = corsiAgainst(shots)

  const ff = fenwickFor(shots)
  const fa = fenwickAgainst(shots)

  const forShots = shots.filter(s => s.team === 'for')
  const againstShots = shots.filter(s => s.team === 'against')
  const xgFor = totalXg(forShots)
  const xgAgainst = totalXg(againstShots)
  const xgTotal = xgFor + xgAgainst

  return {
    corsiForPct: cf + ca === 0 ? 0 : cf / (cf + ca),
    fenwickForPct: ff + fa === 0 ? 0 : ff / (ff + fa),
    xgForPct: xgTotal === 0 ? 0 : xgFor / xgTotal,
    shotAttemptDifferential: cf - ca,
  }
}
