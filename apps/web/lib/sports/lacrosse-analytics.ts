/**
 * lacrosse-analytics.ts
 * Pure TypeScript lacrosse analytics — no external dependencies.
 * Covers: field lacrosse scoring, face-off analytics, ground balls/possession,
 *         attack/defense ratings, box lacrosse, team analytics, DraftKings DFS.
 */

// ---------------------------------------------------------------------------
// 1. Field lacrosse scoring and game stats
// ---------------------------------------------------------------------------

/** Goals count 1 point each; overtimeWin flag is tracked only (no bonus). */
export function lacrosseScore(goals: number, overtimeWin: boolean): number {
  void overtimeWin
  return goals
}

export function goalsPerGame(totalGoals: number, games: number): number {
  if (games === 0) return 0
  return totalGoals / games
}

export function assistsPerGame(totalAssists: number, games: number): number {
  if (games === 0) return 0
  return totalAssists / games
}

/** (goals + assists) / games */
export function pointsPerGame(goals: number, assists: number, games: number): number {
  if (games === 0) return 0
  return (goals + assists) / games
}

/** goals / shots; returns 0 if shots === 0 */
export function shootingPercentage(goals: number, shots: number): number {
  if (shots === 0) return 0
  return goals / shots
}

/** saves / shotsOnGoal; returns 0 if shotsOnGoal === 0 */
export function savePercentage(saves: number, shotsOnGoal: number): number {
  if (shotsOnGoal === 0) return 0
  return saves / shotsOnGoal
}

/** (goalsAllowed / minutesPlayed) * 60 */
export function goalsAgainstAverage(goalsAllowed: number, minutesPlayed: number): number {
  if (minutesPlayed === 0) return 0
  return (goalsAllowed / minutesPlayed) * 60
}

export function shotDifferential(teamShots: number, opponentShots: number): number {
  return teamShots - opponentShots
}

/** successfulClears / clearAttempts; 0 if clearAttempts === 0 */
export function clearingPercentage(successfulClears: number, clearAttempts: number): number {
  if (clearAttempts === 0) return 0
  return successfulClears / clearAttempts
}

/** successfulRides / rideAttempts; 0 if rideAttempts === 0 */
export function ridePercentage(successfulRides: number, rideAttempts: number): number {
  if (rideAttempts === 0) return 0
  return successfulRides / rideAttempts
}

// ---------------------------------------------------------------------------
// 2. Face-off analytics
// ---------------------------------------------------------------------------

/** faceoffsWon / faceoffsTaken; 0 if faceoffsTaken === 0 */
export function faceOffWinRate(faceoffsWon: number, faceoffsTaken: number): number {
  if (faceoffsTaken === 0) return 0
  return faceoffsWon / faceoffsTaken
}

/**
 * faceOffWinRate * (goalsScored / (goalsScored + goalsAllowed || 1))
 * Clamped to [0, 1].
 */
export function faceOffImpact(
  faceoffsWon: number,
  faceoffsTaken: number,
  goalsScored: number,
  goalsAllowed: number,
): number {
  const winRate = faceOffWinRate(faceoffsWon, faceoffsTaken)
  const totalGoals = goalsScored + goalsAllowed || 1
  const result = winRate * (goalsScored / totalGoals)
  return Math.min(1, Math.max(0, result))
}

/** groundBalls / faceoffsTaken; 0 if faceoffsTaken === 0 */
export function groundBallsPerFaceOff(groundBalls: number, faceoffsTaken: number): number {
  if (faceoffsTaken === 0) return 0
  return groundBalls / faceoffsTaken
}

/**
 * Expected possessions from face-offs.
 * won + won * tieRate; default tieRate = 0.15
 */
export function faceOffExpectedPossessions(faceoffsWon: number, faceoffTieRate = 0.15): number {
  return faceoffsWon + faceoffsWon * faceoffTieRate
}

/**
 * faceOffWinRate * 0.6 + (groundBalls / (faceoffsTaken || 1)) * 0.4
 */
export function faceOffValueIndex(
  faceoffsWon: number,
  faceoffsTaken: number,
  groundBalls: number,
): number {
  const winRate = faceOffWinRate(faceoffsWon, faceoffsTaken)
  const gbRate = groundBalls / (faceoffsTaken || 1)
  return winRate * 0.6 + gbRate * 0.4
}

// ---------------------------------------------------------------------------
// 3. Ground balls and possession
// ---------------------------------------------------------------------------

/** groundBalls / games; 0 if games === 0 */
export function groundBallsPerGame(groundBalls: number, games: number): number {
  if (games === 0) return 0
  return groundBalls / games
}

/** teamPossTime / totalPossTime; 0.5 if totalPossTime === 0 */
export function possessionPercentage(teamPossTime: number, totalPossTime: number): number {
  if (totalPossTime === 0) return 0.5
  return teamPossTime / totalPossTime
}

/** shots / possessions; 0 if possessions === 0 */
export function possessionToShotRatio(shots: number, possessions: number): number {
  if (possessions === 0) return 0
  return shots / possessions
}

/** turnovers / games; 0 if games === 0 */
export function turnoversPerGame(turnovers: number, games: number): number {
  if (games === 0) return 0
  return turnovers / games
}

/** forcedTurnovers - teamTurnovers (positive = team wins possession battle) */
export function turnoverDifferential(teamTurnovers: number, forcedTurnovers: number): number {
  return forcedTurnovers - teamTurnovers
}

/**
 * (goals / (shots || 1)) * (shots / (possessions || 1)) * 100
 * Clamped to [0, 100].
 */
export function possessionEfficiencyRating(
  goals: number,
  possessions: number,
  shots: number,
): number {
  const result = (goals / (shots || 1)) * (shots / (possessions || 1)) * 100
  return Math.min(100, Math.max(0, result))
}

// ---------------------------------------------------------------------------
// 4. Attack and defense ratings
// ---------------------------------------------------------------------------

/**
 * (goals*3 + assists*2 + shots*0.5 - turnovers*2) / max(1, 1)
 * (games defaults to 1 per the spec)
 */
export function attackRating(
  goals: number,
  assists: number,
  shots: number,
  turnovers: number,
): number {
  return (goals * 3 + assists * 2 + shots * 0.5 - turnovers * 2) / 1
}

/**
 * (groundBalls + causedTurnovers*2 + saves - goalsAllowed*2) / 10
 * Clamped to [0, 10].
 */
export function defenseRating(
  groundBalls: number,
  causedTurnovers: number,
  goalsAllowed: number,
  saves: number,
): number {
  const result = (groundBalls + causedTurnovers * 2 + saves - goalsAllowed * 2) / 10
  return Math.min(10, Math.max(0, result))
}

/**
 * faceOffWinRate*3 + groundBalls*0.2 + goals*1 - turnovers*0.5
 * Clamped to [0, 10].
 */
export function midfielderRating(
  groundBalls: number,
  faceoffsWon: number,
  faceoffsTaken: number,
  goals: number,
  turnovers: number,
): number {
  const winRate = faceOffWinRate(faceoffsWon, faceoffsTaken)
  const result = winRate * 3 + groundBalls * 0.2 + goals * 1 - turnovers * 0.5
  return Math.min(10, Math.max(0, result))
}

/**
 * savePct*100 * 0.8 + (1 - goalsAllowed/(shotsOnGoal||1))*20
 * Clamped to [0, 100].
 */
export function goalkeeperRating(
  saves: number,
  shotsOnGoal: number,
  goalsAllowed: number,
): number {
  const savePct = savePercentage(saves, shotsOnGoal)
  const result = savePct * 100 * 0.8 + (1 - goalsAllowed / (shotsOnGoal || 1)) * 20
  return Math.min(100, Math.max(0, result))
}

/** extraManGoals / extraManOpportunities; 0 if opportunities === 0 */
export function extraManEfficiency(
  extraManGoals: number,
  extraManOpportunities: number,
): number {
  if (extraManOpportunities === 0) return 0
  return extraManGoals / extraManOpportunities
}

/** clears / opportunities; 0 if opportunities === 0 */
export function manDownClearRate(clears: number, opportunities: number): number {
  if (opportunities === 0) return 0
  return clears / opportunities
}

// ---------------------------------------------------------------------------
// 5. Box lacrosse (NLL-style)
// ---------------------------------------------------------------------------

/** shots / games; 0 if games === 0 */
export function boxShotsPerGame(shots: number, games: number): number {
  if (games === 0) return 0
  return shots / games
}

/** goals / games; 0 if games === 0 */
export function boxGoalsPerGame(goals: number, games: number): number {
  if (games === 0) return 0
  return goals / games
}

/** penalties / games; 0 if games === 0 */
export function roughingPenaltyRate(penalties: number, games: number): number {
  if (games === 0) return 0
  return penalties / games
}

/** ppGoals / ppOpportunities; 0 if ppOpportunities === 0 */
export function powerPlayPercentage(ppGoals: number, ppOpportunities: number): number {
  if (ppOpportunities === 0) return 0
  return ppGoals / ppOpportunities
}

/** pkSuccesses / pkOpportunities; 0 if pkOpportunities === 0 */
export function penaltyKillPercentage(pkSuccesses: number, pkOpportunities: number): number {
  if (pkOpportunities === 0) return 0
  return pkSuccesses / pkOpportunities
}

export interface BoxLacrosseStats {
  goals: number
  assists: number
  penalties: number
  groundBalls: number
  saves: number
  isGoalie: boolean
}

/**
 * Goalie: saves*2 - penalties
 * Field: goals*3 + assists*2 + groundBalls*0.5 - penalties*1.5
 */
export function boxLacrosseRating(
  goals: number,
  assists: number,
  penalties: number,
  groundBalls: number,
  saves: number,
  isGoalie: boolean,
): number {
  if (isGoalie) {
    return saves * 2 - penalties
  }
  return goals * 3 + assists * 2 + groundBalls * 0.5 - penalties * 1.5
}

// ---------------------------------------------------------------------------
// 6. Team analytics and predictions
// ---------------------------------------------------------------------------

/** (goalsFor - goalsAgainst) / gamesPlayed; 0 if gamesPlayed === 0 */
export function netRating(goalsFor: number, goalsAgainst: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0
  return (goalsFor - goalsAgainst) / gamesPlayed
}

/** Mean of opponent win rates; 0 if empty array */
export function strengthOfSchedule(opponentWinRates: number[]): number {
  if (opponentWinRates.length === 0) return 0
  const sum = opponentWinRates.reduce((acc, r) => acc + r, 0)
  return sum / opponentWinRates.length
}

/**
 * GF^exp / (GF^exp + GA^exp); default exponent = 2
 * Returns 0.5 if both are 0.
 */
export function pythagoreanWinPct(
  goalsFor: number,
  goalsAgainst: number,
  exponent = 2,
): number {
  if (goalsFor === 0 && goalsAgainst === 0) return 0.5
  const gfPow = Math.pow(goalsFor, exponent)
  const gaPow = Math.pow(goalsAgainst, exponent)
  return gfPow / (gfPow + gaPow)
}

/**
 * Weighted sum of last-N results: W=1, OTL=0.5, L=0.
 * Default weights = descending [n, n-1, ..., 1] normalized by sum.
 * Clamped to [0, 1].
 */
export function momentumScore(
  lastNResults: Array<'W' | 'L' | 'OTL'>,
  weights?: number[],
): number {
  const n = lastNResults.length
  if (n === 0) return 0

  let resolvedWeights: number[]
  if (weights !== undefined) {
    resolvedWeights = weights
  } else {
    // descending: [n, n-1, ..., 1]
    const raw = Array.from({ length: n }, (_, i) => n - i)
    const total = raw.reduce((a, b) => a + b, 0)
    resolvedWeights = raw.map((w) => w / total)
  }

  const resultValues: Record<'W' | 'L' | 'OTL', number> = { W: 1, OTL: 0.5, L: 0 }
  let score = 0
  for (let i = 0; i < n; i++) {
    const result = lastNResults[i]
    const weight = resolvedWeights[i] ?? 0
    if (result !== undefined) {
      score += weight * resultValues[result]
    }
  }
  return Math.min(1, Math.max(0, score))
}

/**
 * Logistic win probability:
 * 1 / (1 + exp(-(teamRating - opponentRating + homeAdvantage) / 3))
 * Default homeAdvantage = 0.5
 */
export function winProbability(
  teamRating: number,
  opponentRating: number,
  homeAdvantage = 0.5,
): number {
  const x = (teamRating - opponentRating + homeAdvantage) / 3
  return 1 / (1 + Math.exp(-x))
}

/**
 * (avgGF + opponentAvgGA + opponentAvgGF + avgGA) / 2
 */
export function totalScorePrediction(
  avgGoalsFor: number,
  avgGoalsAgainst: number,
  opponentAvgGoalsFor: number,
  opponentAvgGoalsAgainst: number,
): number {
  return (avgGoalsFor + opponentAvgGoalsAgainst + opponentAvgGoalsFor + avgGoalsAgainst) / 2
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy scoring (PLL)
// ---------------------------------------------------------------------------

export interface DKLacrosseStats {
  goals: number
  assists: number
  shots: number
  shotsOnGoal: number
  groundBalls: number
  turnovers: number
  causedTurnovers: number
  faceoffsWon: number
  faceoffsTaken: number
}

/**
 * DraftKings PLL player scoring:
 * 12*goals + 7*assists + 1.6*shots + 2*shotsOnGoal + 3*groundBalls
 * - 2.5*turnovers + 5*causedTurnovers + 4*faceoffsWon - 2*faceoffsTaken
 */
export function dkLacrosseScore(stats: DKLacrosseStats): number {
  return (
    12 * stats.goals +
    7 * stats.assists +
    1.6 * stats.shots +
    2 * stats.shotsOnGoal +
    3 * stats.groundBalls -
    2.5 * stats.turnovers +
    5 * stats.causedTurnovers +
    4 * stats.faceoffsWon -
    2 * stats.faceoffsTaken
  )
}

export interface DKGoalieStats {
  saves: number
  goalsAllowed: number
  win: boolean
}

/**
 * DraftKings PLL goalie scoring:
 * 3.5*saves - 3.5*goalsAllowed + (win ? 6 : 0)
 */
export function dkGoalieScore(stats: DKGoalieStats): number {
  return 3.5 * stats.saves - 3.5 * stats.goalsAllowed + (stats.win ? 6 : 0)
}
