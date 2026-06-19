/**
 * nba-analytics.ts
 * Pure TypeScript NBA analytics library — no external dependencies.
 */

// ---------------------------------------------------------------------------
// 1. Basic shooting metrics
// ---------------------------------------------------------------------------

/**
 * Field Goal Percentage = FGM / FGA
 */
export function fieldGoalPct(made: number, attempted: number): number {
  if (attempted === 0) return 0
  return made / attempted
}

/**
 * Three-Point Percentage = 3PM / 3PA
 */
export function threePointPct(made3: number, attempted3: number): number {
  if (attempted3 === 0) return 0
  return made3 / attempted3
}

/**
 * Free Throw Percentage = FTM / FTA
 */
export function freeThrowPct(made: number, attempted: number): number {
  if (attempted === 0) return 0
  return made / attempted
}

/**
 * Effective Field Goal Percentage
 * eFG% = (FG + 0.5 * 3P) / FGA
 */
export function effectiveFGPct(fg: number, threesMade: number, fga: number): number {
  if (fga === 0) return 0
  return (fg + 0.5 * threesMade) / fga
}

/**
 * True Shooting Percentage
 * TS% = PTS / (2 * (FGA + 0.44 * FTA))
 */
export function trueShootingPct(points: number, fga: number, fta: number): number {
  const denominator = 2 * (fga + 0.44 * fta)
  if (denominator === 0) return 0
  return points / denominator
}

/**
 * Two-Point Field Goal Percentage
 * 2P% = (FGM - 3PM) / (FGA - 3PA)
 */
export function twoPointPct(
  fg: number,
  threesMade: number,
  fga: number,
  fga3: number,
): number {
  const denominator = fga - fga3
  if (denominator <= 0) return 0
  return (fg - threesMade) / denominator
}

// ---------------------------------------------------------------------------
// 2. Volume and efficiency
// ---------------------------------------------------------------------------

/**
 * Points Per Possession
 */
export function pointsPerPossession(points: number, possessions: number): number {
  if (possessions === 0) return 0
  return points / possessions
}

/**
 * Offensive Rating = points per 100 possessions
 */
export function offensiveRating(points: number, possessions: number): number {
  if (possessions === 0) return 0
  return (points / possessions) * 100
}

/**
 * Defensive Rating = points allowed per 100 possessions
 */
export function defensiveRating(pointsAllowed: number, possessions: number): number {
  if (possessions === 0) return 0
  return (pointsAllowed / possessions) * 100
}

/**
 * Net Rating = ORTG - DRTG
 */
export function netRating(ortg: number, drtg: number): number {
  return ortg - drtg
}

/**
 * Pace = possessions / minutes * totalMinutes * 2
 * totalMinutes defaults to 48 (regulation)
 */
export function pace(
  possessions: number,
  minutes: number,
  totalMinutes?: number,
): number {
  if (minutes === 0) return 0
  return (possessions / minutes) * (totalMinutes ?? 48) * 2
}

/**
 * Possession Estimate (Hollinger)
 * Poss = FGA - ORB + TOV + 0.44 * FTA
 */
export function possessionEstimate(
  fga: number,
  fta: number,
  orb: number,
  tov: number,
): number {
  return fga - orb + tov + 0.44 * fta
}

// ---------------------------------------------------------------------------
// 3. Box score advanced
// ---------------------------------------------------------------------------

/**
 * Simplified Player Efficiency Rating.
 * Formula: (pts + 1.5*ast + stl + blk + 0.5*reb - tov - 0.5*pf)
 *          / minutesPlayed * (leaguePace / teamPace) * 15
 * Capped to [0, 40].
 */
export function playerEfficiencyRating(
  pts: number,
  reb: number,
  ast: number,
  stl: number,
  blk: number,
  fgMade: number,
  fgAtt: number,
  ftMade: number,
  ftAtt: number,
  tov: number,
  pf: number,
  minutesPlayed: number,
  teamPace: number,
  leaguePace: number,
): number {
  if (minutesPlayed === 0) return 0
  const paceFactor = teamPace === 0 ? 1 : leaguePace / teamPace
  // fgMade, fgAtt, ftMade, ftAtt captured for future per-shot adjustments
  void fgMade
  void fgAtt
  void ftMade
  void ftAtt
  const raw =
    pts + 1.5 * ast + stl + blk + 0.5 * reb - tov - 0.5 * pf
  const per = (raw / minutesPlayed) * paceFactor * 15
  return Math.min(40, Math.max(0, per))
}

/**
 * Simplified Win Shares.
 * netRating / 100 * minutesPlayed / teamMinutes * 2.5
 * teamMinutes defaults to 240 (5 players × 48 minutes).
 */
export function winShares(
  netRatingValue: number,
  minutesPlayed: number,
  teamMinutes?: number,
): number {
  const tMin = teamMinutes ?? 240
  if (tMin === 0) return 0
  return (netRatingValue / 100) * (minutesPlayed / tMin) * 2.5
}

/**
 * Box Plus/Minus regression approximation.
 * Capped to [-10, 15].
 */
export function boxPlusMinus(
  pts: number,
  reb: number,
  ast: number,
  stl: number,
  blk: number,
  tov: number,
  fga: number,
  fta: number,
  minutesPlayed: number,
): number {
  if (minutesPlayed === 0) return 0
  // fta captured but not used in current simplified formula
  void fta
  const p36 = (v: number): number => (v / minutesPlayed) * 36
  const fgMiss = fga - pts / 2
  const raw =
    (p36(pts) - 10 +
      p36(ast) -
      p36(tov) +
      p36(stl) +
      p36(blk) -
      p36(fgMiss) * 0.5) *
    0.8
  void reb // reb intentionally not in this simplified regression
  return Math.min(15, Math.max(-10, raw))
}

/**
 * Value Over Replacement Player.
 * VORP = (BPM - (-2.0)) * minutesPlayed / 2400 * 2.7
 */
export function valueOverReplacement(bpm: number, minutesPlayed: number): number {
  return (bpm - -2.0) * (minutesPlayed / 2400) * 2.7
}

/**
 * Usage Rate.
 * 100 * ((fga + 0.44*fta + tov) * (teamMinutes/5)) / (minutesPlayed * (teamFGA + 0.44*teamFTA + teamTOV))
 */
export function usageRate(
  fga: number,
  fta: number,
  tov: number,
  minutesPlayed: number,
  teamFGA: number,
  teamFTA: number,
  teamTOV: number,
  teamMinutes: number,
): number {
  const playerPoss = fga + 0.44 * fta + tov
  const teamPoss = teamFGA + 0.44 * teamFTA + teamTOV
  const denominator = minutesPlayed * teamPoss
  if (denominator === 0) return 0
  return (100 * (playerPoss * (teamMinutes / 5))) / denominator
}

/**
 * Assist-to-Turnover Ratio = AST / max(TOV, 1)
 */
export function assistToTurnoverRatio(assists: number, turnovers: number): number {
  return assists / Math.max(turnovers, 1)
}

/**
 * Rebound Rate.
 * 100 * (reb * (teamMinutes/5)) / (minutesPlayed * (teamReb + oppReb))
 */
export function reboundRate(
  reb: number,
  minutesPlayed: number,
  teamReb: number,
  oppReb: number,
  teamMinutes: number,
): number {
  const denominator = minutesPlayed * (teamReb + oppReb)
  if (denominator === 0) return 0
  return (100 * reb * (teamMinutes / 5)) / denominator
}

// ---------------------------------------------------------------------------
// 4. Four Factors (Dean Oliver)
// ---------------------------------------------------------------------------

/**
 * Shooting Factor — the factor IS eFG%.
 */
export function shootingFactor(efgPct: number): number {
  return efgPct
}

/**
 * Turnover Factor = TOV / (FGA + 0.44*FTA + TOV)
 */
export function turnoverFactor(tov: number, fga: number, fta: number): number {
  const denominator = fga + 0.44 * fta + tov
  if (denominator === 0) return 0
  return tov / denominator
}

/**
 * Rebounding Factor = ORB / (ORB + oppDRB)
 */
export function reboundingFactor(
  orb: number,
  teamORB: number,
  oppDRB: number,
): number {
  // teamORB is the player/team's offensive rebounds; same as orb for team-level
  void teamORB
  const denominator = orb + oppDRB
  if (denominator === 0) return 0
  return orb / denominator
}

/**
 * Free Throw Factor = FTM / FGA
 */
export function freeThrowFactor(ftm: number, fga: number): number {
  if (fga === 0) return 0
  return ftm / fga
}

/**
 * Four Factors Rating — weighted sum of the four factors.
 * Default weights: [0.4, 0.25, 0.2, 0.15] (shooting, turnover, rebounding, FT)
 */
export function fourFactorsRating(
  efgPct: number,
  tovRate: number,
  orbRate: number,
  ftRate: number,
  weights?: [number, number, number, number],
): number {
  const [w1, w2, w3, w4] = weights ?? [0.4, 0.25, 0.2, 0.15]
  return w1 * efgPct + w2 * tovRate + w3 * orbRate + w4 * ftRate
}

// ---------------------------------------------------------------------------
// 5. Team analytics
// ---------------------------------------------------------------------------

/**
 * Team Rating summary.
 */
export function teamRating(
  wins: number,
  losses: number,
  pointsFor: number,
  pointsAgainst: number,
  gamesPlayed: number,
): { winPct: number; pointDiffPerGame: number; simpleRating: number } {
  const totalGames = wins + losses
  const winPct = totalGames === 0 ? 0 : wins / totalGames
  const pointDiffPerGame = gamesPlayed === 0 ? 0 : (pointsFor - pointsAgainst) / gamesPlayed
  // Simplified SRS: use point differential per game as proxy
  const simpleRating = pointDiffPerGame
  return { winPct, pointDiffPerGame, simpleRating }
}

/**
 * Strength of Schedule = average of opponent win percentages.
 */
export function strengthOfSchedule(opponentWinPcts: number[]): number {
  if (opponentWinPcts.length === 0) return 0
  const sum = opponentWinPcts.reduce((acc, pct) => acc + pct, 0)
  return sum / opponentWinPcts.length
}

/**
 * Pythagorean Expectation.
 * PF^exp / (PF^exp + PA^exp); exponent default 13.91.
 */
export function pythagoreanExpectation(
  pointsFor: number,
  pointsAgainst: number,
  exponent?: number,
): number {
  const exp = exponent ?? 13.91
  const pfExp = Math.pow(pointsFor, exp)
  const paExp = Math.pow(pointsAgainst, exp)
  const denominator = pfExp + paExp
  if (denominator === 0) return 0
  return pfExp / denominator
}

/**
 * Clutch Score — TS%×40 + AST/TOV ratio×10; capped [0, 100].
 */
export function clutchScore(
  points: number,
  fga: number,
  fta: number,
  assists: number,
  turnovers: number,
): number {
  const ts = trueShootingPct(points, fga, fta)
  const atr = assistToTurnoverRatio(assists, turnovers)
  const raw = ts * 40 + atr * 10
  return Math.min(100, Math.max(0, raw))
}

/**
 * Home Court Advantage = home win% - away win%.
 */
export function homeCourtAdvantage(
  homeWins: number,
  homeLosses: number,
  awayWins: number,
  awayLosses: number,
): number {
  const homeTotal = homeWins + homeLosses
  const awayTotal = awayWins + awayLosses
  const homeWinPct = homeTotal === 0 ? 0 : homeWins / homeTotal
  const awayWinPct = awayTotal === 0 ? 0 : awayWins / awayTotal
  return homeWinPct - awayWinPct
}

// ---------------------------------------------------------------------------
// 6. Player comparison
// ---------------------------------------------------------------------------

/** Stats shape for player similarity. */
export interface PlayerStatLine {
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
}

/**
 * Player Similarity Score.
 * Euclidean distance over normalized stat ranges; 100 = identical.
 * Normalization ranges: pts/36, reb/15, ast/12, stl/5, blk/5, tov/8.
 */
export function playerSimilarityScore(
  player1: PlayerStatLine,
  player2: PlayerStatLine,
): number {
  const ranges = { pts: 36, reb: 15, ast: 12, stl: 5, blk: 5, tov: 8 }
  const keys = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov'] as const

  let sumSq = 0
  for (const key of keys) {
    const range = ranges[key]
    const diff = (player1[key] - player2[key]) / range
    sumSq += diff * diff
  }

  const maxDistance = Math.sqrt(keys.length) // max possible distance when all diffs = 1.0
  const distance = Math.sqrt(sumSq)
  const normalized = distance / maxDistance
  return Math.max(0, Math.min(100, (1 - normalized) * 100))
}

/**
 * Trade Value Index.
 * (PER + VORP×10) / max(salary/1_000_000, 0.01); higher = better value.
 */
export function tradeValueIndex(per: number, vorp: number, salary: number): number {
  const salaryM = Math.max(salary / 1_000_000, 0.01)
  return (per + vorp * 10) / salaryM
}

/**
 * Aging Curve multiplier (0–100).
 * Peak at 26. Linear rise from 18 to 26, steeper decline 26 to 38.
 */
export function agingCurve(age: number): number {
  if (age <= 18) return 50
  if (age >= 38) return 10
  if (age <= 26) {
    // Linear rise: 50 at 18, 100 at 26
    return 50 + (age - 18) * (50 / 8)
  }
  // Steeper decline: 100 at 26, 10 at 38 → slope = -90/12 = -7.5/year
  return Math.max(10, 100 - (age - 26) * (90 / 12))
}

// ---------------------------------------------------------------------------
// 7. Fantasy scoring (DraftKings NBA)
// ---------------------------------------------------------------------------

/** Stats required for DraftKings NBA scoring. */
export interface DKNBAStats {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  tripleDouble: boolean
  doubleDouble: boolean
}

/**
 * DraftKings NBA Fantasy Score.
 * PTS×1 + REB×1.25 + AST×1.5 + STL×2 + BLK×2 + TOV×(−0.5)
 * + doubleDouble=+1.5, tripleDouble=+3
 */
export function draftKingsNBAScore(stats: DKNBAStats): number {
  let score =
    stats.points * 1 +
    stats.rebounds * 1.25 +
    stats.assists * 1.5 +
    stats.steals * 2 +
    stats.blocks * 2 +
    stats.turnovers * -0.5
  if (stats.tripleDouble) {
    score += 3
  } else if (stats.doubleDouble) {
    score += 1.5
  }
  return score
}

/** Stats required for fantasy value calculation. */
export interface FantasyValueStats {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  minutesPlayed: number
}

/**
 * Fantasy Value — DK score normalized to 36 minutes.
 * dkScore / minutesPlayed * 36
 */
export function fantasyValue(stats: FantasyValueStats): number {
  if (stats.minutesPlayed === 0) return 0
  const dkStats: DKNBAStats = {
    ...stats,
    doubleDouble: false,
    tripleDouble: false,
  }
  const dk = draftKingsNBAScore(dkStats)
  return (dk / stats.minutesPlayed) * 36
}

/**
 * Starter Probability.
 * Logistic: 1 / (1 + exp(-(mpg - 25) / 4)); returns 0–1.
 */
export function starterProbability(minutesPerGame: number): number {
  return 1 / (1 + Math.exp(-(minutesPerGame - 25) / 4))
}

// ---------------------------------------------------------------------------
// 8. Game projection
// ---------------------------------------------------------------------------

/**
 * Projected Total score for both teams.
 * (homeORtg + awayORtg) / 200 * (homePace + awayPace) / 2 * 2
 */
export function projectedTotal(
  homeORtg: number,
  homePace: number,
  awayORtg: number,
  awayPace: number,
): number {
  return ((homeORtg + awayORtg) / 200) * ((homePace + awayPace) / 2) * 2
}

/**
 * Spread From Ratings.
 * (homeNetRating - awayNetRating + homeCourtAdv) × 0.5
 * Positive = home favored; homeCourtAdv defaults to 3.0.
 */
export function spreadFromRatings(
  homeNetRating: number,
  awayNetRating: number,
  homeCourtAdv?: number,
): number {
  return (homeNetRating - awayNetRating + (homeCourtAdv ?? 3.0)) * 0.5
}

/**
 * Moneyline From Spread.
 * homeWinProb = 1 / (1 + 10^(-spread/7)); positive spread = home favored
 * Convert to American odds.
 */
export function moneylineFromSpread(spread: number): { homeML: number; awayML: number } {
  // positive spread = home favored; negate exponent so home prob > 0.5 when spread > 0
  const homeWinProb = 1 / (1 + Math.pow(10, -spread / 7))
  const awayWinProb = 1 - homeWinProb

  function toAmericanOdds(prob: number): number {
    if (prob <= 0) return 10000
    if (prob >= 1) return -10000
    if (prob >= 0.5) {
      // Favorite — negative American odds
      return Math.round(-(prob / (1 - prob)) * 100)
    }
    // Underdog — positive American odds
    return Math.round(((1 - prob) / prob) * 100)
  }

  return {
    homeML: toAmericanOdds(homeWinProb),
    awayML: toAmericanOdds(awayWinProb),
  }
}
