/**
 * Matchup analysis utilities for sports analytics.
 *
 * Pure TypeScript — no external dependencies. All functions are individually
 * exported and side-effect-free.
 *
 * Terminology note: we deliberately avoid phrases like "guaranteed", "lock",
 * "tout", "beat the book", or "sharp money" in any user-facing strings.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type GameResult = 'W' | 'L' | 'T'
export type AtsCover = 'cover' | 'push' | 'no_cover'

export interface HistoricalGame {
  gameId: string
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  date: Date
  spread?: number      // negative = home favored; e.g. -3 means home -3
  overUnder?: number
  venue?: 'neutral' | 'home' | 'away'
}

export interface TeamRecord {
  wins: number
  losses: number
  ties: number
  winRate: number      // 0-1
  pct: string          // "WW-LL" format
}

export interface AtsRecord {
  covers: number
  pushes: number
  noCovers: number
  coverRate: number    // covers / (covers + noCovers), pushes excluded
  total: number        // covers + pushes + noCovers
}

export interface HeadToHeadResult {
  teamA: string        // teamId
  teamB: string
  games: HistoricalGame[]
  teamARecord: TeamRecord
  teamBRecord: TeamRecord
  teamAAtsRecord: AtsRecord
  teamBAtsRecord: AtsRecord
  homeRecord: TeamRecord       // home team's perspective
  avgMargin: number            // positive = teamA wins by this much on average
  recentTrend: 'teamA' | 'teamB' | 'split'  // based on last 3 games
}

export interface MatchupStrengthResult {
  strengthScore: number         // 0-100; higher = stronger matchup advantage for team
  confidenceModifier: number    // -10 to +10 (add to pick confidence)
  dominanceIndicators: string[] // human-readable evidence
  matchupAdvantage: 'strong' | 'moderate' | 'slight' | 'neutral' | 'disadvantage'
}

export interface SosResult {
  teamId: string
  sosScore: number       // 0-100; 50 = average
  rank: number           // among all teams provided
  easyGames: number      // opponents with winRate < 0.4
  hardGames: number      // opponents with winRate > 0.6
  avgOpponentWinRate: number
}

export interface TrendAnalysis {
  teamId: string
  recentRecord: TeamRecord     // last N games
  recentAts: AtsRecord         // last N games ATS
  streak: { type: GameResult; count: number }
  atsStreak: { type: AtsCover; count: number }
  homeRecord: TeamRecord
  awayRecord: TeamRecord
  vsTopHalf: TeamRecord        // vs opponents with winRate >= 0.5
  vsBottomHalf: TeamRecord     // vs opponents with winRate < 0.5
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function zeroRecord(): TeamRecord {
  return { wins: 0, losses: 0, ties: 0, winRate: 0, pct: '0-0' }
}

function zeroAtsRecord(): AtsRecord {
  return { covers: 0, pushes: 0, noCovers: 0, coverRate: 0, total: 0 }
}

function formatPct(wins: number, losses: number, ties: number): string {
  if (ties > 0) return `${wins}-${losses}-${ties}`
  return `${wins}-${losses}`
}

function computeWinRate(wins: number, losses: number, ties: number): number {
  const total = wins + losses + ties
  if (total === 0) return 0
  return wins / total
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Determine game result (W/L/T) from a given team's perspective.
 * Throws if teamId is not a participant in the game.
 */
export function gameResult(game: HistoricalGame, teamId: string): GameResult {
  const isHome = game.homeTeamId === teamId
  const isAway = game.awayTeamId === teamId

  if (!isHome && !isAway) {
    throw new Error(
      `Team "${teamId}" is not a participant in game "${game.gameId}".`
    )
  }

  if (game.homeScore === game.awayScore) return 'T'

  const homeWon = game.homeScore > game.awayScore
  return (isHome && homeWon) || (isAway && !homeWon) ? 'W' : 'L'
}

/**
 * Determine ATS cover result from a given team's perspective.
 *
 * Spread convention: negative value means home team is favored.
 *   e.g. spread = -3 → home must win by more than 3 to cover.
 *
 * For the home team:
 *   adjusted = homeScore - awayScore + spread
 *   adjusted > 0 → cover; adjusted = 0 → push; adjusted < 0 → no_cover
 *
 * For the away team the perspective inverts.
 *
 * If no spread is set, returns 'push'.
 */
export function atsCover(game: HistoricalGame, teamId: string): AtsCover {
  const isHome = game.homeTeamId === teamId
  const isAway = game.awayTeamId === teamId

  if (!isHome && !isAway) {
    throw new Error(
      `Team "${teamId}" is not a participant in game "${game.gameId}".`
    )
  }

  if (game.spread === undefined || game.spread === null) return 'push'

  const margin = game.homeScore - game.awayScore
  // spread is from the home team's perspective (home -3 means home needs to win by >3)
  // adjusted for home: margin + spread (spread is negative for home fav)
  const homeAdjusted = margin + game.spread

  let adjusted: number
  if (isHome) {
    adjusted = homeAdjusted
  } else {
    // Away team's perspective is the inverse
    adjusted = -homeAdjusted
  }

  if (adjusted > 0) return 'cover'
  if (adjusted === 0) return 'push'
  return 'no_cover'
}

/**
 * Win probability for a team derived from a head-to-head record.
 * Returns 0.5 if there are no games on record.
 */
export function h2hWinProbability(h2h: HeadToHeadResult, teamId: string): number {
  if (h2h.games.length === 0) return 0.5

  if (teamId === h2h.teamA) return h2h.teamARecord.winRate
  if (teamId === h2h.teamB) return h2h.teamBRecord.winRate

  return 0.5
}

/**
 * Build a TeamRecord from a list of games for the given team.
 */
export function buildTeamRecord(games: HistoricalGame[], teamId: string): TeamRecord {
  const relevant = games.filter(
    (g) => g.homeTeamId === teamId || g.awayTeamId === teamId
  )

  let wins = 0
  let losses = 0
  let ties = 0

  for (const g of relevant) {
    const r = gameResult(g, teamId)
    if (r === 'W') wins++
    else if (r === 'L') losses++
    else ties++
  }

  const winRate = computeWinRate(wins, losses, ties)
  const pct = formatPct(wins, losses, ties)

  return { wins, losses, ties, winRate, pct }
}

/**
 * Build an ATS record for a team from a list of games.
 * coverRate excludes pushes from the denominator.
 */
export function buildAtsRecord(games: HistoricalGame[], teamId: string): AtsRecord {
  const relevant = games.filter(
    (g) => g.homeTeamId === teamId || g.awayTeamId === teamId
  )

  let covers = 0
  let pushes = 0
  let noCovers = 0

  for (const g of relevant) {
    const r = atsCover(g, teamId)
    if (r === 'cover') covers++
    else if (r === 'push') pushes++
    else noCovers++
  }

  const decisiveTotal = covers + noCovers
  const coverRate = decisiveTotal === 0 ? 0 : covers / decisiveTotal
  const total = covers + pushes + noCovers

  return { covers, pushes, noCovers, coverRate, total }
}

/**
 * Return the last N games for a team, sorted newest-first.
 */
export function lastNGames(
  games: HistoricalGame[],
  teamId: string,
  n: number
): HistoricalGame[] {
  return games
    .filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, n)
}

/**
 * Build a complete head-to-head result between two teams.
 */
export function buildHeadToHead(
  games: HistoricalGame[],
  teamAId: string,
  teamBId: string
): HeadToHeadResult {
  // Filter to matchups between the two teams only
  const h2hGames = games
    .filter(
      (g) =>
        (g.homeTeamId === teamAId && g.awayTeamId === teamBId) ||
        (g.homeTeamId === teamBId && g.awayTeamId === teamAId)
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // most recent first

  const teamARecord = buildTeamRecord(h2hGames, teamAId)
  const teamBRecord = buildTeamRecord(h2hGames, teamBId)
  const teamAAtsRecord = buildAtsRecord(h2hGames, teamAId)
  const teamBAtsRecord = buildAtsRecord(h2hGames, teamBId)

  // Home record: from the perspective of whichever team is home in each game
  // Build record for the home team in each matchup
  let homeWins = 0
  let homeLosses = 0
  let homeTies = 0

  for (const g of h2hGames) {
    const homeId = g.homeTeamId
    const r = gameResult(g, homeId)
    if (r === 'W') homeWins++
    else if (r === 'L') homeLosses++
    else homeTies++
  }
  const homeRecord: TeamRecord = {
    wins: homeWins,
    losses: homeLosses,
    ties: homeTies,
    winRate: computeWinRate(homeWins, homeLosses, homeTies),
    pct: formatPct(homeWins, homeLosses, homeTies),
  }

  // Average margin from teamA perspective
  let avgMargin = 0
  if (h2hGames.length > 0) {
    const totalMargin = h2hGames.reduce((acc, g) => {
      const aScore = g.homeTeamId === teamAId ? g.homeScore : g.awayScore
      const bScore = g.homeTeamId === teamBId ? g.homeScore : g.awayScore
      return acc + (aScore - bScore)
    }, 0)
    avgMargin = totalMargin / h2hGames.length
  }

  // Recent trend based on last 3 matchups
  const last3 = h2hGames.slice(0, 3)
  let teamARecent = 0
  let teamBRecent = 0
  for (const g of last3) {
    const r = gameResult(g, teamAId)
    if (r === 'W') teamARecent++
    else if (r === 'L') teamBRecent++
    // ties count for neither
  }

  let recentTrend: 'teamA' | 'teamB' | 'split'
  if (teamARecent >= 2) recentTrend = 'teamA'
  else if (teamBRecent >= 2) recentTrend = 'teamB'
  else recentTrend = 'split'

  return {
    teamA: teamAId,
    teamB: teamBId,
    games: h2hGames,
    teamARecord,
    teamBRecord,
    teamAAtsRecord,
    teamBAtsRecord,
    homeRecord,
    avgMargin,
    recentTrend,
  }
}

/**
 * Compute strength of schedule for a single team.
 *
 * Only completed games are counted (both scores > 0, or date in the past).
 */
export function strengthOfSchedule(
  teamId: string,
  schedule: HistoricalGame[],
  allTeamRecords: Record<string, TeamRecord>
): SosResult {
  const now = new Date()
  const completed = schedule.filter(
    (g) =>
      (g.homeTeamId === teamId || g.awayTeamId === teamId) &&
      (g.homeScore + g.awayScore > 0 || g.date < now)
  )

  const opponentWinRates: number[] = []
  let easyGames = 0
  let hardGames = 0

  for (const g of completed) {
    const oppId = g.homeTeamId === teamId ? g.awayTeamId : g.homeTeamId
    const oppRecord = allTeamRecords[oppId]
    if (!oppRecord) continue

    const wr = oppRecord.winRate
    opponentWinRates.push(wr)
    if (wr < 0.4) easyGames++
    if (wr > 0.6) hardGames++
  }

  const avgOpponentWinRate =
    opponentWinRates.length === 0
      ? 0
      : opponentWinRates.reduce((a, b) => a + b, 0) / opponentWinRates.length

  const sosScore = avgOpponentWinRate * 100

  return {
    teamId,
    sosScore,
    rank: 0, // assigned externally or by rankBySos
    easyGames,
    hardGames,
    avgOpponentWinRate,
  }
}

/**
 * Rank multiple teams by strength of schedule (rank 1 = hardest schedule).
 */
export function rankBySos(
  teamIds: string[],
  schedules: Record<string, HistoricalGame[]>,
  allTeamRecords: Record<string, TeamRecord>
): SosResult[] {
  const results = teamIds.map((id) =>
    strengthOfSchedule(id, schedules[id] ?? [], allTeamRecords)
  )

  // Sort descending by sosScore (hardest first) and assign ranks
  results.sort((a, b) => b.sosScore - a.sosScore)
  results.forEach((r, i) => {
    r.rank = i + 1
  })

  return results
}

/**
 * Comprehensive trend analysis for a team.
 */
export function analyzeTrends(
  games: HistoricalGame[],
  teamId: string,
  recentN: number = 5,
  opponentRecords?: Record<string, TeamRecord>
): TrendAnalysis {
  const teamGames = games
    .filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  const recentGames = teamGames.slice(0, recentN)
  const recentRecord = buildTeamRecord(recentGames, teamId)
  const recentAts = buildAtsRecord(recentGames, teamId)

  // Current win/loss/tie streak (games are newest-first)
  let streakType: GameResult = 'W'
  let streakCount = 0
  if (teamGames.length > 0) {
    streakType = gameResult(teamGames[0], teamId)
    for (const g of teamGames) {
      const r = gameResult(g, teamId)
      if (r === streakType) streakCount++
      else break
    }
  }

  // Current ATS streak (newest-first)
  let atsStreakType: AtsCover = 'cover'
  let atsStreakCount = 0

  // Find games that have a spread (needed for ATS streak)
  const atsGames = teamGames.filter(
    (g) => g.spread !== undefined && g.spread !== null
  )

  if (atsGames.length > 0) {
    atsStreakType = atsCover(atsGames[0], teamId)
    for (const g of atsGames) {
      const r = atsCover(g, teamId)
      if (r === atsStreakType) atsStreakCount++
      else break
    }
  }

  // Home / away splits (all games)
  const homeGames = teamGames.filter((g) => g.homeTeamId === teamId)
  const awayGames = teamGames.filter((g) => g.awayTeamId === teamId)
  const homeRecord = buildTeamRecord(homeGames, teamId)
  const awayRecord = buildTeamRecord(awayGames, teamId)

  // vs top half / bottom half (requires opponent records)
  let vsTopHalf: TeamRecord = zeroRecord()
  let vsBottomHalf: TeamRecord = zeroRecord()

  if (opponentRecords) {
    const topHalfGames = teamGames.filter((g) => {
      const oppId = g.homeTeamId === teamId ? g.awayTeamId : g.homeTeamId
      const oppRec = opponentRecords[oppId]
      return oppRec && oppRec.winRate >= 0.5
    })
    const bottomHalfGames = teamGames.filter((g) => {
      const oppId = g.homeTeamId === teamId ? g.awayTeamId : g.homeTeamId
      const oppRec = opponentRecords[oppId]
      return oppRec && oppRec.winRate < 0.5
    })
    vsTopHalf = buildTeamRecord(topHalfGames, teamId)
    vsBottomHalf = buildTeamRecord(bottomHalfGames, teamId)
  }

  return {
    teamId,
    recentRecord,
    recentAts,
    streak: { type: streakType, count: streakCount },
    atsStreak: { type: atsStreakType, count: atsStreakCount },
    homeRecord,
    awayRecord,
    vsTopHalf,
    vsBottomHalf,
  }
}

/**
 * Compute matchup strength for a team against a specific opponent.
 *
 * Scoring weights:
 *   H2H winRate (team's pov):  40%
 *   Recent form (last 5):      30%
 *   ATS recent:                20%
 *   Trend momentum:            10%
 *
 * confidenceModifier = ((strengthScore - 50) / 50) * 10 → [-10, +10]
 *
 * matchupAdvantage thresholds:
 *   >= 70 → strong
 *   60-69 → moderate
 *   55-59 → slight
 *   45-54 → neutral
 *   < 45  → disadvantage
 */
export function matchupStrength(
  teamId: string,
  opponentId: string,
  h2h: HeadToHeadResult,
  teamTrend: TrendAnalysis,
  opponentTrend: TrendAnalysis
): MatchupStrengthResult {
  // H2H component (40 pts max)
  const h2hWinRate = h2hWinProbability(h2h, teamId)
  const h2hComponent = h2hWinRate * 40

  // Recent form component (30 pts max)
  const recentWinRate = teamTrend.recentRecord.winRate
  const recentFormComponent = recentWinRate * 30

  // ATS recent component (20 pts max)
  const atsRate = teamTrend.recentAts.coverRate
  const atsComponent = atsRate * 20

  // Momentum / streak component (10 pts max)
  let momentumComponent = 5 // default: neutral
  if (teamTrend.streak.type === 'W' && teamTrend.streak.count >= 3) {
    momentumComponent = 10
  } else if (teamTrend.streak.type === 'L' && teamTrend.streak.count >= 3) {
    momentumComponent = 0
  }

  const strengthScore = clamp(
    h2hComponent + recentFormComponent + atsComponent + momentumComponent,
    0,
    100
  )

  const confidenceModifier = clamp(((strengthScore - 50) / 50) * 10, -10, 10)

  // Advantage label
  let matchupAdvantage: MatchupStrengthResult['matchupAdvantage']
  if (strengthScore >= 70) matchupAdvantage = 'strong'
  else if (strengthScore >= 60) matchupAdvantage = 'moderate'
  else if (strengthScore >= 55) matchupAdvantage = 'slight'
  else if (strengthScore >= 45) matchupAdvantage = 'neutral'
  else matchupAdvantage = 'disadvantage'

  // Dominance indicators (up to 3 strongest signals)
  const indicators: Array<{ msg: string; weight: number }> = []

  if (h2hWinRate >= 0.6 && h2h.games.length > 0) {
    indicators.push({
      msg: `Winning ${Math.round(h2hWinRate * 100)}% of head-to-head matchups`,
      weight: h2hComponent,
    })
  } else if (h2hWinRate < 0.4 && h2h.games.length > 0) {
    indicators.push({
      msg: `Losing ${Math.round((1 - h2hWinRate) * 100)}% of head-to-head matchups`,
      weight: 40 - h2hComponent,
    })
  }

  if (recentWinRate >= 0.6) {
    indicators.push({
      msg: `Strong recent form — ${teamTrend.recentRecord.wins}W-${teamTrend.recentRecord.losses}L in last ${teamTrend.recentRecord.wins + teamTrend.recentRecord.losses} games`,
      weight: recentFormComponent,
    })
  } else if (recentWinRate < 0.4) {
    indicators.push({
      msg: `Weak recent form — ${teamTrend.recentRecord.wins}W-${teamTrend.recentRecord.losses}L in last ${teamTrend.recentRecord.wins + teamTrend.recentRecord.losses} games`,
      weight: 30 - recentFormComponent,
    })
  }

  if (atsRate >= 0.6) {
    indicators.push({
      msg: `Covering the spread at a ${Math.round(atsRate * 100)}% clip recently`,
      weight: atsComponent,
    })
  }

  if (teamTrend.streak.type === 'W' && teamTrend.streak.count >= 3) {
    indicators.push({
      msg: `Active ${teamTrend.streak.count}-game winning streak`,
      weight: 10,
    })
  } else if (teamTrend.streak.type === 'L' && teamTrend.streak.count >= 3) {
    indicators.push({
      msg: `Active ${teamTrend.streak.count}-game losing streak`,
      weight: 10,
    })
  }

  // Opponent context
  const oppRecentWinRate = opponentTrend.recentRecord.winRate
  if (oppRecentWinRate >= 0.7) {
    indicators.push({
      msg: `Opponent in strong recent form (${Math.round(oppRecentWinRate * 100)}% recently)`,
      weight: oppRecentWinRate * 10,
    })
  }

  // Pick the top 3 by weight
  indicators.sort((a, b) => b.weight - a.weight)
  const dominanceIndicators = indicators.slice(0, 3).map((i) => i.msg)

  return {
    strengthScore,
    confidenceModifier,
    dominanceIndicators,
    matchupAdvantage,
  }
}

/**
 * Score a game's importance for pick-selection prioritization.
 *
 * Base: 50
 * Playoffs: +30
 * Rivalry (rivalryScore 0-10): up to +20
 * Late-season (NFL weeks 15-17): +10
 * Clamped to [0, 100].
 */
export function gameImportanceScore(
  game: HistoricalGame,
  context?: {
    isPlayoffs?: boolean
    rivalryScore?: number   // 0-10
    weekNumber?: number     // NFL week
  }
): number {
  let score = 50

  if (context?.isPlayoffs) score += 30

  if (context?.rivalryScore !== undefined) {
    score += (context.rivalryScore / 10) * 20
  }

  if (
    context?.weekNumber !== undefined &&
    context.weekNumber >= 15 &&
    context.weekNumber <= 17
  ) {
    score += 10
  }

  return clamp(score, 0, 100)
}

/**
 * Return the teamIds that both teamA and teamB have played against.
 */
export function commonOpponents(
  teamAId: string,
  teamBId: string,
  allGames: HistoricalGame[]
): string[] {
  const opponentsOf = (teamId: string): Set<string> => {
    const s = new Set<string>()
    for (const g of allGames) {
      if (g.homeTeamId === teamId) s.add(g.awayTeamId)
      else if (g.awayTeamId === teamId) s.add(g.homeTeamId)
    }
    return s
  }

  const aOpps = opponentsOf(teamAId)
  const bOpps = opponentsOf(teamBId)

  const common: string[] = []
  for (const id of aOpps) {
    if (id !== teamBId && bOpps.has(id)) common.push(id)
  }

  return common.sort()
}

/**
 * Compare teamA and teamB's records against their common opponents.
 */
export function vsCommonOpponents(
  teamAId: string,
  teamBId: string,
  allGames: HistoricalGame[]
): { teamA: TeamRecord; teamB: TeamRecord; commonOpponents: string[] } {
  const common = commonOpponents(teamAId, teamBId, allGames)

  const aGames = allGames.filter((g) => {
    const opp = g.homeTeamId === teamAId ? g.awayTeamId : g.homeTeamId
    return (g.homeTeamId === teamAId || g.awayTeamId === teamAId) && common.includes(opp)
  })

  const bGames = allGames.filter((g) => {
    const opp = g.homeTeamId === teamBId ? g.awayTeamId : g.homeTeamId
    return (g.homeTeamId === teamBId || g.awayTeamId === teamBId) && common.includes(opp)
  })

  return {
    teamA: buildTeamRecord(aGames, teamAId),
    teamB: buildTeamRecord(bGames, teamBId),
    commonOpponents: common,
  }
}

/**
 * Return the season series between two teams for a given calendar year.
 */
export function seasonSeries(
  games: HistoricalGame[],
  teamAId: string,
  teamBId: string,
  season: number
): {
  leader: string | 'tied'
  teamAWins: number
  teamBWins: number
  games: HistoricalGame[]
} {
  const seriesGames = games.filter((g) => {
    const year = g.date.getFullYear()
    return (
      year === season &&
      ((g.homeTeamId === teamAId && g.awayTeamId === teamBId) ||
        (g.homeTeamId === teamBId && g.awayTeamId === teamAId))
    )
  })

  let teamAWins = 0
  let teamBWins = 0

  for (const g of seriesGames) {
    const r = gameResult(g, teamAId)
    if (r === 'W') teamAWins++
    else if (r === 'L') teamBWins++
  }

  let leader: string | 'tied'
  if (teamAWins > teamBWins) leader = teamAId
  else if (teamBWins > teamAWins) leader = teamBId
  else leader = 'tied'

  return { leader, teamAWins, teamBWins, games: seriesGames }
}

/**
 * Pythagorean-style win probability from two teams' records.
 *
 *   P = teamWR / (teamWR + oppWR)
 *
 * Returns 0.5 when both records are 0-0 or both winRates are 0.
 */
export function winProbabilityFromRecords(
  teamRecord: TeamRecord,
  opponentRecord: TeamRecord
): number {
  const tw = teamRecord.winRate
  const ow = opponentRecord.winRate
  const denom = tw + ow
  if (denom === 0) return 0.5
  return tw / denom
}

/**
 * Format a single-line matchup summary from a H2H result.
 *
 * e.g. "Chiefs lead all-time series 8-3 (ATS: 5-3)"
 */
export function formatMatchupSummary(
  h2h: HeadToHeadResult,
  teamAName: string,
  teamBName: string
): string {
  const { teamARecord, teamBRecord, teamAAtsRecord } = h2h
  const aW = teamARecord.wins
  const bW = teamBRecord.wins

  const seriesSummary =
    aW > bW
      ? `${teamAName} lead all-time series ${aW}-${bW}`
      : aW < bW
        ? `${teamBName} lead all-time series ${bW}-${aW}`
        : `All-time series tied ${aW}-${bW}`

  const atsSummary = `ATS: ${teamAAtsRecord.covers}-${teamAAtsRecord.noCovers}`

  return `${seriesSummary} (${atsSummary})`
}

/**
 * Build a recent form string (e.g. "WWLWL") for a team.
 * Left-to-right = oldest to newest. Most recent is the rightmost character.
 * n defaults to 5.
 */
export function recentFormString(
  games: HistoricalGame[],
  teamId: string,
  n: number = 5
): string {
  const recent = lastNGames(games, teamId, n)
  // lastNGames returns newest-first; reverse for oldest-first display
  const ordered = [...recent].reverse()
  return ordered.map((g) => gameResult(g, teamId)).join('')
}

/**
 * Compute home and away splits, plus the home advantage differential.
 */
export function homeAwaySplit(
  games: HistoricalGame[],
  teamId: string
): {
  home: TeamRecord
  away: TeamRecord
  homeAdvantage: number
} {
  const homeGames = games.filter((g) => g.homeTeamId === teamId)
  const awayGames = games.filter((g) => g.awayTeamId === teamId)

  const home = buildTeamRecord(homeGames, teamId)
  const away = buildTeamRecord(awayGames, teamId)

  const homeAdvantage = home.winRate - away.winRate

  return { home, away, homeAdvantage }
}
