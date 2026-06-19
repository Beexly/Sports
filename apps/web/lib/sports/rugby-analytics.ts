/**
 * rugby-analytics.ts
 * Pure TypeScript rugby analytics — no external dependencies.
 * All functions are pure (no side effects, no I/O).
 * Covers Rugby Union and Rugby League scoring, attack/defense analytics,
 * set piece, player ratings, team performance, DraftKings fantasy, and
 * match prediction.
 */

// ---------------------------------------------------------------------------
// Scoring System
// ---------------------------------------------------------------------------

/**
 * Calculates total Rugby Union score.
 * try=5, conversion=2, penalty=3, dropGoal=3
 */
export function rugbyScore(
  tries: number,
  conversions: number,
  penalties: number,
  dropGoals: number,
): number {
  return tries * 5 + conversions * 2 + penalties * 3 + dropGoals * 3
}

/**
 * Tries scored per 80 minutes of play.
 * Returns 0 if no minutes played.
 */
export function tryScoringRate(tries: number, minutesPlayed: number): number {
  if (minutesPlayed <= 0) return 0
  return (tries / minutesPlayed) * 80
}

/**
 * Conversion success rate as a percentage.
 * Returns 0 if no tries scored.
 */
export function conversionRate(conversions: number, tries: number): number {
  if (tries <= 0) return 0
  return (conversions / tries) * 100
}

/**
 * Penalties scored per 80 minutes of play.
 * Returns 0 if no minutes played.
 */
export function penaltyRate(penalties: number, minutesPlayed: number): number {
  if (minutesPlayed <= 0) return 0
  return (penalties / minutesPlayed) * 80
}

/**
 * Breaks down total score by scoring method.
 */
export function pointBreakdown(
  tries: number,
  conversions: number,
  penalties: number,
  dropGoals: number,
): {
  fromTries: number
  fromConversions: number
  fromPenalties: number
  fromDropGoals: number
  total: number
} {
  const fromTries = tries * 5
  const fromConversions = conversions * 2
  const fromPenalties = penalties * 3
  const fromDropGoals = dropGoals * 3
  return {
    fromTries,
    fromConversions,
    fromPenalties,
    fromDropGoals,
    total: fromTries + fromConversions + fromPenalties + fromDropGoals,
  }
}

/**
 * Calculates total Rugby League score.
 * try=4, goal=2, fieldGoal=1
 */
export function rugbyLeagueScore(
  tries: number,
  goals: number,
  fieldGoals: number,
): number {
  return tries * 4 + goals * 2 + fieldGoals * 1
}

// ---------------------------------------------------------------------------
// Attack Analytics
// ---------------------------------------------------------------------------

/**
 * Average meters gained per carry.
 * Returns 0 if no carries.
 */
export function metersPerCarry(totalMeters: number, carries: number): number {
  if (carries <= 0) return 0
  return totalMeters / carries
}

/**
 * Percentage of carries that result in a line break.
 * Returns 0 if no carries.
 */
export function lineBreakRate(lineBreaks: number, carries: number): number {
  if (carries <= 0) return 0
  return (lineBreaks / carries) * 100
}

/**
 * Percentage of tackles that result in an offload.
 * Returns 0 if no tackles.
 */
export function offloadRate(offloads: number, tackles: number): number {
  if (tackles <= 0) return 0
  return (offloads / tackles) * 100
}

/**
 * Support player composite index: (offloads*3 + rucksAttended*0.5 + lineBreaks*2) / 10
 * Capped between 0 and 10.
 */
export function supportPlayerIndex(
  offloads: number,
  rucksAttended: number,
  lineBreaks: number,
): number {
  const raw = (offloads * 3 + rucksAttended * 0.5 + lineBreaks * 2) / 10
  return Math.min(Math.max(raw, 0), 10)
}

/**
 * Percentage of carries where the player gains ground past the gain line.
 * Returns 0 if no carries.
 */
export function gainLineSuccess(
  gainsOver: number,
  totalCarries: number,
): number {
  if (totalCarries <= 0) return 0
  return (gainsOver / totalCarries) * 100
}

/**
 * Try assists per match played.
 * Returns 0 if no matches played.
 */
export function tryAssistRate(
  assistedTries: number,
  matchesPlayed: number,
): number {
  if (matchesPlayed <= 0) return 0
  return assistedTries / matchesPlayed
}

// ---------------------------------------------------------------------------
// Defense Analytics
// ---------------------------------------------------------------------------

/**
 * Percentage of tackle attempts that are completed.
 * Returns 0 if no attempts.
 */
export function tackleSuccessRate(
  completedTackles: number,
  totalAttempts: number,
): number {
  if (totalAttempts <= 0) return 0
  return (completedTackles / totalAttempts) * 100
}

/**
 * Composite defensive rating index.
 * Formula: (tackleSuccess * 0.5 + turnoversWon/minutesPlayed*80*10 - penaltiesConceded/minutesPlayed*80*2)
 * Capped between 0 and 100.
 */
export function defensiveRatingIndex(
  tackleSuccess: number,
  turnoversWon: number,
  penaltiesConceded: number,
  minutesPlayed: number,
): number {
  if (minutesPlayed <= 0) return 0
  const raw =
    tackleSuccess * 0.5 +
    (turnoversWon / minutesPlayed) * 80 * 10 -
    (penaltiesConceded / minutesPlayed) * 80 * 2
  return Math.min(Math.max(raw, 0), 100)
}

/**
 * Pressure score created through turnovers and penalties forced.
 * turnoversForced*3 + penaltiesForced*2
 */
export function pressureCreated(
  turnoversForced: number,
  penaltiesForced: number,
): number {
  return turnoversForced * 3 + penaltiesForced * 2
}

/**
 * Percentage of defensive actions that result in an intercept.
 * Returns 0 if no defensive actions.
 */
export function interceptRate(
  intercepts: number,
  defensiveActions: number,
): number {
  if (defensiveActions <= 0) return 0
  return (intercepts / defensiveActions) * 100
}

// ---------------------------------------------------------------------------
// Set Piece
// ---------------------------------------------------------------------------

/**
 * Percentage of scrums won.
 * Returns 0 if no scrums.
 */
export function scrumWinRate(
  scrumWon: number,
  totalScrums: number,
): number {
  if (totalScrums <= 0) return 0
  return (scrumWon / totalScrums) * 100
}

/**
 * Percentage of lineouts won.
 * Returns 0 if no lineouts.
 */
export function lineoutWinRate(
  lineoutsWon: number,
  totalLineouts: number,
): number {
  if (totalLineouts <= 0) return 0
  return (lineoutsWon / totalLineouts) * 100
}

/**
 * Lineout steals per match played.
 * Returns 0 if no matches played.
 */
export function lineoutStealsPerMatch(
  steals: number,
  matchesPlayed: number,
): number {
  if (matchesPlayed <= 0) return 0
  return steals / matchesPlayed
}

/**
 * Weighted average of scrum and lineout win rates (50/50 split).
 * Result is between 0 and 100.
 */
export function setPieceScore(
  scrumWinRatePct: number,
  lineoutWinRatePct: number,
): number {
  return (scrumWinRatePct * 0.5 + lineoutWinRatePct * 0.5)
}

/**
 * Breakdown of kicking game effectiveness.
 * exitRate: territory kicks as % of total kicks
 * touchRate: kicks to touch as % of total kicks
 * Returns 0 for both if no total kicks.
 */
export function kickingGame(
  territoryKicks: number,
  kicksToTouch: number,
  totalKicks: number,
): { exitRate: number; touchRate: number } {
  if (totalKicks <= 0) return { exitRate: 0, touchRate: 0 }
  return {
    exitRate: (territoryKicks / totalKicks) * 100,
    touchRate: (kicksToTouch / totalKicks) * 100,
  }
}

// ---------------------------------------------------------------------------
// Player Ratings
// ---------------------------------------------------------------------------

/**
 * Forward player composite rating.
 * Formula: metersPerCarry(meters,carries)*5 + tackleSuccess*0.4 + scrumContrib*20 + lineoutContrib*20
 * Capped between 0 and 100.
 */
export function forwardRating(
  carries: number,
  meters: number,
  _tackles: number,
  tackleSuccess: number,
  scrumContrib: number,
  lineoutContrib: number,
): number {
  const raw =
    metersPerCarry(meters, carries) * 5 +
    tackleSuccess * 0.4 +
    scrumContrib * 20 +
    lineoutContrib * 20
  return Math.min(Math.max(raw, 0), 100)
}

/**
 * Back player composite rating.
 * Formula: tries*10 + assists*5 + metersPerCarry(meters,carries)*3 + tackleSuccess*0.3
 * Capped between 0 and 100.
 */
export function backRating(
  tries: number,
  assists: number,
  meters: number,
  carries: number,
  tackleSuccess: number,
): number {
  const raw =
    tries * 10 +
    assists * 5 +
    metersPerCarry(meters, carries) * 3 +
    tackleSuccess * 0.3
  return Math.min(Math.max(raw, 0), 100)
}

/**
 * Hooker composite rating.
 * Formula: lineoutWinRate*0.35 + scrumWinRate*0.35 + min(tackles/20,1)*30
 * Capped between 0 and 100.
 */
export function hookerRating(
  lineoutWinRatePct: number,
  scrumWinRatePct: number,
  tackles: number,
  _carries: number,
): number {
  const raw =
    lineoutWinRatePct * 0.35 +
    scrumWinRatePct * 0.35 +
    Math.min(tackles / 20, 1) * 30
  return Math.min(Math.max(raw, 0), 100)
}

/**
 * Fly-half composite rating.
 * Formula: convRate*0.25 + penaltyKickRate*0.25 + min(kicksFromHand/20,1)*20 + tries*5 + assists*3
 * Capped between 0 and 100.
 */
export function flyHalfRating(
  convRate: number,
  penaltyKickRate: number,
  kicksFromHand: number,
  tries: number,
  assists: number,
): number {
  const raw =
    convRate * 0.25 +
    penaltyKickRate * 0.25 +
    Math.min(kicksFromHand / 20, 1) * 20 +
    tries * 5 +
    assists * 3
  return Math.min(Math.max(raw, 0), 100)
}

/**
 * Number eight composite rating.
 * Formula: min(carries/20,1)*30 + min(metersGained/200,1)*30 + lineBreaks*5 + min(tackles/20,1)*20 + turnovers*5
 * Capped between 0 and 100.
 */
export function numberEightRating(
  carries: number,
  metersGained: number,
  lineBreaks: number,
  tackles: number,
  turnovers: number,
): number {
  const raw =
    Math.min(carries / 20, 1) * 30 +
    Math.min(metersGained / 200, 1) * 30 +
    lineBreaks * 5 +
    Math.min(tackles / 20, 1) * 20 +
    turnovers * 5
  return Math.min(Math.max(raw, 0), 100)
}

// ---------------------------------------------------------------------------
// Team Performance
// ---------------------------------------------------------------------------

/**
 * Team possession as a percentage of total possession.
 * Returns 0 if no total possession.
 */
export function possessionPct(
  ownPossession: number,
  totalPossession: number,
): number {
  if (totalPossession <= 0) return 0
  return (ownPossession / totalPossession) * 100
}

/**
 * Team territory as a percentage of total territory.
 * Returns 0 if no total territory.
 */
export function territoryPct(
  ownTerritory: number,
  totalTerritory: number,
): number {
  if (totalTerritory <= 0) return 0
  return (ownTerritory / totalTerritory) * 100
}

/**
 * Net points per game difference (points for minus points against, divided by matches).
 * Returns 0 if no matches played.
 */
export function rugbyNetRating(
  pointsFor: number,
  pointsAgainst: number,
  matchesPlayed: number,
): number {
  if (matchesPlayed <= 0) return 0
  return (pointsFor - pointsAgainst) / matchesPlayed
}

/**
 * Overall team strength index combining win rate and point differential.
 * Formula: (wins*2 + draws) / max((wins+losses+draws)*2, 1) * 60 + min(pointDiff/100, 1)*40
 * Capped between 0 and 100.
 */
export function rugbyStrengthIndex(
  wins: number,
  losses: number,
  draws: number,
  pointDiff: number,
): number {
  const totalGames = wins + losses + draws
  const winRatePart =
    ((wins * 2 + draws) / Math.max(totalGames * 2, 1)) * 60
  const pointDiffPart = Math.min(pointDiff / 100, 1) * 40
  return Math.min(Math.max(winRatePart + pointDiffPart, 0), 100)
}

/**
 * Momentum score based on recent results with exponential decay.
 * Most recent result has weight 1, each prior result multiplied by 0.8.
 * win=1, draw=0.5, loss=0; normalized 0-100.
 * Returns 0 if no results provided.
 */
export function rugbyMomentumScore(
  recentResults: Array<'win' | 'loss' | 'draw'>,
): number {
  if (recentResults.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0

  for (let i = 0; i < recentResults.length; i++) {
    const weight = Math.pow(0.8, i)
    const result = recentResults[i]
    const value = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
    weightedSum += value * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 0
  return (weightedSum / totalWeight) * 100
}

// ---------------------------------------------------------------------------
// Fantasy Scoring (DraftKings Rugby)
// ---------------------------------------------------------------------------

/**
 * DraftKings Rugby fantasy score.
 * try=12, assist=6, conversion=3, penaltyKick=3, tackle=1.5, carry=0.5,
 * lineBreak=4, turnover=6, yellowCard=−4, redCard=−8
 */
export function draftKingsRugbyScore(stats: {
  tries: number
  assists: number
  conversions: number
  penaltyKicks: number
  tackles: number
  carries: number
  lineBreaks: number
  turnovers: number
  yellowCard: boolean
  redCard: boolean
}): number {
  return (
    stats.tries * 12 +
    stats.assists * 6 +
    stats.conversions * 3 +
    stats.penaltyKicks * 3 +
    stats.tackles * 1.5 +
    stats.carries * 0.5 +
    stats.lineBreaks * 4 +
    stats.turnovers * 6 +
    (stats.yellowCard ? -4 : 0) +
    (stats.redCard ? -8 : 0)
  )
}

// ---------------------------------------------------------------------------
// Match Prediction
// ---------------------------------------------------------------------------

/**
 * Home advantage handicap in points.
 * Returns 3.5 for home venue, 0 for neutral venue.
 */
export function homeAdvantage(neutralVenue: boolean): number {
  return neutralVenue ? 0 : 3.5
}

/**
 * Estimates match win probabilities using a logistic model.
 * spread = homeRating - awayRating + homeAdv
 * homeWinProb = 1 / (1 + exp(-spread/15))
 * drawProb = 8% constant
 * awayWinProb = 1 - homeWinProb - 0.08
 */
export function rugbyMatchOdds(
  homeRating: number,
  awayRating: number,
  homeAdv: number,
): { homeWinProb: number; awayWinProb: number; drawProb: number } {
  const spread = homeRating - awayRating + homeAdv
  const homeWinProb = 1 / (1 + Math.exp(-spread / 15))
  const drawProb = 0.08
  const awayWinProb = 1 - homeWinProb - drawProb
  return { homeWinProb, awayWinProb, drawProb }
}

/**
 * Projects total points for a match based on both teams' ratings.
 * Formula: (homeRating + awayRating) / 2; typical output range 40-60.
 */
export function totalPointsProjection(
  homeRating: number,
  awayRating: number,
): number {
  return (homeRating + awayRating) / 2
}
