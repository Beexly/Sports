/**
 * player-stats-aggregation.ts
 * Pure TypeScript player stats aggregation library.
 * No runtime dependencies. No `any`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameLog {
  date: string // ISO date
  opponent: string
  homeAway: 'home' | 'away'
  minutesPlayed: number
  stats: Record<string, number> // e.g. { points: 24, rebounds: 8, ... }
  result: 'W' | 'L'
  pointsFor: number // team score
  pointsAgainst: number // opponent score
}

export interface SeasonTotals {
  gamesPlayed: number
  gamesStarted?: number
  totals: Record<string, number>
  perGame: Record<string, number> // total / gamesPlayed
  per36?: Record<string, number> // (stat / minutesPlayed) * 36
  per100Possessions?: Record<string, number>
}

export interface StatSplit {
  label: string
  games: number
  totals: Record<string, number>
  perGame: Record<string, number>
}

export interface StreakResult {
  currentStreak: number // positive = wins, negative = losses
  longestWin: number
  longestLoss: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}

function sumStats(games: GameLog[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const game of games) {
    for (const [key, value] of Object.entries(game.stats)) {
      totals[key] = (totals[key] ?? 0) + value
    }
  }
  return totals
}

function perGameStats(
  totals: Record<string, number>,
  gamesPlayed: number,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(totals)) {
    result[key] = safeDivide(value, gamesPlayed)
  }
  return result
}

function computePer36(
  totals: Record<string, number>,
  totalMinutes: number,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(totals)) {
    if (key === 'minutesPlayed' || key === 'possessions') continue
    result[key] = totalMinutes === 0 ? 0 : (value / totalMinutes) * 36
  }
  return result
}

function computePer100(
  totals: Record<string, number>,
  totalPossessions: number,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(totals)) {
    if (key === 'minutesPlayed' || key === 'possessions') continue
    result[key] = totalPossessions === 0 ? 0 : (value / totalPossessions) * 100
  }
  return result
}

function sortedByDate(games: GameLog[]): GameLog[] {
  return [...games].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
}

function buildStatSplit(
  label: string,
  games: GameLog[],
  _statKey: string, // kept for API symmetry
): StatSplit {
  const totals = sumStats(games)
  const perGame = perGameStats(totals, games.length)
  return { label, games: games.length, totals, perGame }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = p * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower] ?? 0
  return (sorted[lower] ?? 0) + ((sorted[upper] ?? 0) - (sorted[lower] ?? 0)) * (idx - lower)
}

// ---------------------------------------------------------------------------
// Core aggregation
// ---------------------------------------------------------------------------

/**
 * Sum all stats fields, compute perGame, per36 (if minutesPlayed in stats),
 * per100 if possessions key exists.
 */
export function aggregateTotals(games: GameLog[]): SeasonTotals {
  if (games.length === 0) {
    return { gamesPlayed: 0, totals: {}, perGame: {} }
  }

  const gamesPlayed = games.length
  const totals = sumStats(games)

  // Also accumulate minutesPlayed from top-level field (not stats)
  const totalMinutes = games.reduce((sum, g) => sum + g.minutesPlayed, 0)

  const perGame = perGameStats(totals, gamesPlayed)

  const result: SeasonTotals = { gamesPlayed, totals, perGame }

  // per36: compute if the games have meaningful minutesPlayed
  if (totalMinutes > 0) {
    result.per36 = computePer36(totals, totalMinutes)
    // Also include minutesPlayed per36 normalisation makes no sense, but perGame does
    // We replicate top-level minutesPlayed per game
    result.per36['minutesPlayed'] = safeDivide(totalMinutes, gamesPlayed)
  }

  // per100: only if possessions key exists in any game's stats
  const totalPossessions = totals['possessions'] ?? 0
  if (totalPossessions > 0) {
    result.per100Possessions = computePer100(totals, totalPossessions)
  }

  return result
}

/**
 * Returns array same length as games; expanding window for first n-1 entries.
 * Games are sorted chronologically before computation.
 */
export function rollingAvg(
  games: GameLog[],
  statKey: string,
  window: number,
): number[] {
  const sorted = sortedByDate(games)
  const result: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = sorted.slice(start, i + 1)
    const sum = slice.reduce((acc, g) => acc + (g.stats[statKey] ?? 0), 0)
    result.push(safeDivide(sum, slice.length))
  }
  return result
}

/**
 * Multi-stat rolling averages; index matches games array (chronological).
 */
export function rollingStats(
  games: GameLog[],
  keys: string[],
  window: number,
): Array<Record<string, number>> {
  const sorted = sortedByDate(games)
  return sorted.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = sorted.slice(start, i + 1)
    const entry: Record<string, number> = {}
    for (const key of keys) {
      const sum = slice.reduce((acc, g) => acc + (g.stats[key] ?? 0), 0)
      entry[key] = safeDivide(sum, slice.length)
    }
    return entry
  })
}

/**
 * Exponential decay: most recent = weight 1, each prior game * decayFactor (default 0.9).
 * Returns weighted average.
 */
export function weightedRecentForm(
  games: GameLog[],
  statKey: string,
  decayFactor = 0.9,
): number {
  if (games.length === 0) return 0
  const sorted = sortedByDate(games)
  // Most recent = index sorted.length - 1
  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < sorted.length; i++) {
    const game = sorted[i]
    if (game === undefined) continue
    const distanceFromRecent = sorted.length - 1 - i
    const weight = Math.pow(decayFactor, distanceFromRecent)
    weightedSum += (game.stats[statKey] ?? 0) * weight
    totalWeight += weight
  }
  return safeDivide(weightedSum, totalWeight)
}

/**
 * Compare first-half avg vs second-half avg of last `window` games (default: all).
 * improving if second half > first half + 5%, declining if < first half - 5%, else stable.
 */
export function trendDirection(
  games: GameLog[],
  statKey: string,
  window?: number,
): 'improving' | 'declining' | 'stable' {
  const sorted = sortedByDate(games)
  const subset = window !== undefined ? sorted.slice(-window) : sorted

  if (subset.length < 2) return 'stable'

  const mid = Math.floor(subset.length / 2)
  const firstHalf = subset.slice(0, mid)
  const secondHalf = subset.slice(mid)

  const avg = (arr: GameLog[]): number => {
    if (arr.length === 0) return 0
    const sum = arr.reduce((acc, g) => acc + (g.stats[statKey] ?? 0), 0)
    return sum / arr.length
  }

  const firstAvg = avg(firstHalf)
  const secondAvg = avg(secondHalf)

  if (firstAvg === 0) {
    // If first half is 0 and second is positive → improving; negative → declining
    if (secondAvg > 0) return 'improving'
    if (secondAvg < 0) return 'declining'
    return 'stable'
  }

  const pctChange = (secondAvg - firstAvg) / Math.abs(firstAvg)
  if (pctChange > 0.05) return 'improving'
  if (pctChange < -0.05) return 'declining'
  return 'stable'
}

// ---------------------------------------------------------------------------
// Splits
// ---------------------------------------------------------------------------

export function homeAwaySplit(
  games: GameLog[],
  statKey: string,
): { home: StatSplit; away: StatSplit } {
  const homeGames = games.filter(g => g.homeAway === 'home')
  const awayGames = games.filter(g => g.homeAway === 'away')
  return {
    home: buildStatSplit('home', homeGames, statKey),
    away: buildStatSplit('away', awayGames, statKey),
  }
}

export function winLossSplit(
  games: GameLog[],
  statKey: string,
): { wins: StatSplit; losses: StatSplit } {
  const wins = games.filter(g => g.result === 'W')
  const losses = games.filter(g => g.result === 'L')
  return {
    wins: buildStatSplit('wins', wins, statKey),
    losses: buildStatSplit('losses', losses, statKey),
  }
}

/**
 * One StatSplit per opponent, sorted by games desc.
 */
export function opponentSplit(games: GameLog[], statKey: string): StatSplit[] {
  const grouped: Record<string, GameLog[]> = {}
  for (const game of games) {
    const bucket = grouped[game.opponent] ?? (grouped[game.opponent] = [])
    bucket.push(game)
  }
  return Object.entries(grouped)
    .map(([opponent, g]) => buildStatSplit(opponent, g, statKey))
    .sort((a, b) => b.games - a.games)
}

/**
 * Group by YYYY-MM from date field.
 */
export function monthSplit(games: GameLog[], statKey: string): StatSplit[] {
  const grouped: Record<string, GameLog[]> = {}
  for (const game of games) {
    const month = game.date.slice(0, 7) // YYYY-MM
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(game)
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, g]) => buildStatSplit(month, g, statKey))
}

/**
 * Most recent n games (sorted by date desc, return in chronological order).
 */
export function lastNGames(games: GameLog[], n: number): GameLog[] {
  const sorted = sortedByDate(games)
  return sorted.slice(Math.max(0, sorted.length - n))
}

/**
 * Aggregate the last n games.
 */
export function lastNGamesStats(games: GameLog[], n: number): SeasonTotals {
  return aggregateTotals(lastNGames(games, n))
}

// ---------------------------------------------------------------------------
// Consistency & variance
// ---------------------------------------------------------------------------

export function statConsistency(
  games: GameLog[],
  statKey: string,
): {
  mean: number
  stdDev: number
  cv: number
  pctAboveMean: number
  floor: number
  ceiling: number
} {
  if (games.length === 0) {
    return { mean: 0, stdDev: 0, cv: 0, pctAboveMean: 0, floor: 0, ceiling: 0 }
  }

  const values = games.map(g => g.stats[statKey] ?? 0)
  const mean = values.reduce((a, b) => a + b, 0) / values.length

  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  const cv = mean === 0 ? 0 : stdDev / mean

  const pctAboveMean =
    values.filter(v => v > mean).length / values.length

  const sorted = [...values].sort((a, b) => a - b)
  const floor = percentile(sorted, 0.1)
  const ceiling = percentile(sorted, 0.9)

  return { mean, stdDev, cv, pctAboveMean, floor, ceiling }
}

/**
 * Fraction of games where stat >= threshold.
 */
export function bigGameRate(
  games: GameLog[],
  statKey: string,
  threshold: number,
): number {
  if (games.length === 0) return 0
  const count = games.filter(g => (g.stats[statKey] ?? 0) >= threshold).length
  return count / games.length
}

/**
 * threshold default 10; fraction of games where both stats >= threshold.
 */
export function doubleDoubleRate(
  games: GameLog[],
  stat1: string,
  stat2: string,
  threshold = 10,
): number {
  if (games.length === 0) return 0
  const count = games.filter(
    g => (g.stats[stat1] ?? 0) >= threshold && (g.stats[stat2] ?? 0) >= threshold,
  ).length
  return count / games.length
}

// ---------------------------------------------------------------------------
// Streaks & runs
// ---------------------------------------------------------------------------

export function resultStreak(games: GameLog[]): StreakResult {
  if (games.length === 0) {
    return { currentStreak: 0, longestWin: 0, longestLoss: 0 }
  }

  const sorted = sortedByDate(games)

  // current streak: count from most recent backwards
  let currentStreak = 0
  const lastResult = sorted[sorted.length - 1]!.result
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i]!.result === lastResult) {
      currentStreak += lastResult === 'W' ? 1 : -1
    } else {
      break
    }
  }

  // longest win/loss
  let longestWin = 0
  let longestLoss = 0
  let curWin = 0
  let curLoss = 0
  for (const game of sorted) {
    if (game.result === 'W') {
      curWin++
      curLoss = 0
      longestWin = Math.max(longestWin, curWin)
    } else {
      curLoss++
      curWin = 0
      longestLoss = Math.max(longestLoss, curLoss)
    }
  }

  return { currentStreak, longestWin, longestLoss }
}

export function statStreak(
  games: GameLog[],
  statKey: string,
  threshold: number,
): { currentAbove: number; longestAbove: number } {
  if (games.length === 0) return { currentAbove: 0, longestAbove: 0 }

  const sorted = sortedByDate(games)

  // current streak from most recent
  let currentAbove = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if ((sorted[i]!.stats[statKey] ?? 0) >= threshold) {
      currentAbove++
    } else {
      break
    }
  }

  // longest streak
  let longestAbove = 0
  let cur = 0
  for (const game of sorted) {
    if ((game.stats[statKey] ?? 0) >= threshold) {
      cur++
      longestAbove = Math.max(longestAbove, cur)
    } else {
      cur = 0
    }
  }

  return { currentAbove, longestAbove }
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Per-game per36 values; 0 if minutesPlayed = 0.
 */
export function per36Minutes(games: GameLog[], statKey: string): number[] {
  const sorted = sortedByDate(games)
  return sorted.map(g => {
    if (g.minutesPlayed === 0) return 0
    return ((g.stats[statKey] ?? 0) / g.minutesPlayed) * 36
  })
}

/**
 * Z-score each game relative to the full sample mean/std.
 */
export function standardScore(games: GameLog[], statKey: string): number[] {
  if (games.length === 0) return []
  const sorted = sortedByDate(games)
  const values = sorted.map(g => g.stats[statKey] ?? 0)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return values.map(() => 0)
  return values.map(v => (v - mean) / stdDev)
}

// ---------------------------------------------------------------------------
// Season comparisons
// ---------------------------------------------------------------------------

export function compareSeasons(
  season1: GameLog[],
  season2: GameLog[],
  statKey: string,
): {
  season1Avg: number
  season2Avg: number
  delta: number
  pctChange: number
  improved: boolean
} {
  const avg = (g: GameLog[]): number => {
    if (g.length === 0) return 0
    return g.reduce((acc, game) => acc + (game.stats[statKey] ?? 0), 0) / g.length
  }

  const season1Avg = avg(season1)
  const season2Avg = avg(season2)
  const delta = season2Avg - season1Avg
  const pctChange = season1Avg === 0 ? 0 : delta / Math.abs(season1Avg)
  const improved = delta > 0

  return { season1Avg, season2Avg, delta, pctChange, improved }
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

export function buildPlayerProfile(
  games: GameLog[],
  primaryStats: string[],
): {
  gamesPlayed: number
  seasonAverages: Record<string, number>
  lastFiveAvg: Record<string, number>
  homeAvg: Record<string, number>
  awayAvg: Record<string, number>
  consistency: Record<string, number>
  trend: Record<string, string>
} {
  const gamesPlayed = games.length

  // Season averages
  const seasonAverages: Record<string, number> = {}
  for (const stat of primaryStats) {
    const sum = games.reduce((acc, g) => acc + (g.stats[stat] ?? 0), 0)
    seasonAverages[stat] = safeDivide(sum, gamesPlayed)
  }

  // Last 5 averages
  const last5 = lastNGames(games, 5)
  const lastFiveAvg: Record<string, number> = {}
  for (const stat of primaryStats) {
    const sum = last5.reduce((acc, g) => acc + (g.stats[stat] ?? 0), 0)
    lastFiveAvg[stat] = safeDivide(sum, last5.length)
  }

  // Home / away averages
  const homeGames = games.filter(g => g.homeAway === 'home')
  const awayGames = games.filter(g => g.homeAway === 'away')
  const homeAvg: Record<string, number> = {}
  const awayAvg: Record<string, number> = {}
  for (const stat of primaryStats) {
    const homeSum = homeGames.reduce((acc, g) => acc + (g.stats[stat] ?? 0), 0)
    homeAvg[stat] = safeDivide(homeSum, homeGames.length)
    const awaySum = awayGames.reduce((acc, g) => acc + (g.stats[stat] ?? 0), 0)
    awayAvg[stat] = safeDivide(awaySum, awayGames.length)
  }

  // Consistency (CV)
  const consistency: Record<string, number> = {}
  for (const stat of primaryStats) {
    consistency[stat] = statConsistency(games, stat).cv
  }

  // Trend
  const trend: Record<string, string> = {}
  for (const stat of primaryStats) {
    trend[stat] = trendDirection(games, stat)
  }

  return {
    gamesPlayed,
    seasonAverages,
    lastFiveAvg,
    homeAvg,
    awayAvg,
    consistency,
    trend,
  }
}
