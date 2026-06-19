/**
 * handball-analytics.ts
 * Pure TypeScript team/Olympic handball analytics — no external dependencies.
 * Covers: shooting analytics (zones, 7m, fast break), goalkeeper analytics,
 *         player performance, team analytics, match analytics, discipline/form,
 *         DraftKings-style handball DFS scoring.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShotZone =
  | 'wing'
  | 'line'
  | 'back'
  | 'fastbreak'
  | 'breakthrough'
  | '7m'

export interface ZoneShot {
  zone: ShotZone
  scored: boolean
}

export interface ZoneAggregate {
  attempts: number
  goals: number
  pct: number
}

export interface ZoneStat {
  zone: string
  goals: number
  attempts: number
}

export interface GoalkeeperSave {
  zone: string
  saved: boolean
}

export interface PlayerRatingStats {
  goals: number
  assists: number
  saves: number
  steals: number
  blocks: number
  turnovers: number
  technicalFaults: number
}

export interface ShotZoneAttempts {
  zone: string
  attempts: number
}

export type MatchResultType = 'win' | 'loss' | 'draw'

export type FormResult = 'W' | 'D' | 'L'

export interface StreakInfo {
  type: string
  length: number
}

export interface DKHandballStats {
  goals: number
  assists: number
  steals: number
  blocks: number
  saves: number
  twoMinutes: number
  turnovers: number
  sevenMeterGoals: number
}

// ---------------------------------------------------------------------------
// 1. Shooting analytics
// ---------------------------------------------------------------------------

/** goals / shots; returns 0 if shots === 0 */
export function shootingPercentage(goals: number, shots: number): number {
  if (shots === 0) return 0
  return goals / shots
}

/** Aggregate shots per zone into attempts / goals / conversion pct. */
export function shotsByZone(
  shots: ZoneShot[],
): Map<string, ZoneAggregate> {
  const map = new Map<string, ZoneAggregate>()
  for (const shot of shots) {
    const existing = map.get(shot.zone) ?? { attempts: 0, goals: 0, pct: 0 }
    existing.attempts += 1
    if (shot.scored) existing.goals += 1
    existing.pct = existing.attempts === 0 ? 0 : existing.goals / existing.attempts
    map.set(shot.zone, existing)
  }
  return map
}

/** scored / attempts; penalty conversion. Returns 0 if attempts === 0 */
export function sevenMeterEfficiency(scored: number, attempts: number): number {
  if (attempts === 0) return 0
  return scored / attempts
}

/** Share of total goals coming from fast breaks. Returns 0 if totalGoals === 0 */
export function fastBreakRate(fastBreakGoals: number, totalGoals: number): number {
  if (totalGoals === 0) return 0
  return fastBreakGoals / totalGoals
}

/**
 * Weighted shooting efficiency across zones: total goals / total attempts.
 * Returns 0 if there are no attempts.
 */
export function shotEfficiencyIndex(
  zoneStats: ZoneStat[],
): number {
  let totalGoals = 0
  let totalAttempts = 0
  for (const stat of zoneStats) {
    totalGoals += stat.goals
    totalAttempts += stat.attempts
  }
  if (totalAttempts === 0) return 0
  return totalGoals / totalAttempts
}

// ---------------------------------------------------------------------------
// 2. Goalkeeper analytics
// ---------------------------------------------------------------------------

/** saves / shotsOnGoal; returns 0 if shotsOnGoal === 0 */
export function savePercentage(saves: number, shotsOnGoal: number): number {
  if (shotsOnGoal === 0) return 0
  return saves / shotsOnGoal
}

/** Save percentage per zone (saves faced vs saved). */
export function savesByZone(saves: GoalkeeperSave[]): Map<string, number> {
  const faced = new Map<string, number>()
  const made = new Map<string, number>()
  for (const save of saves) {
    faced.set(save.zone, (faced.get(save.zone) ?? 0) + 1)
    if (save.saved) made.set(save.zone, (made.get(save.zone) ?? 0) + 1)
  }
  const result = new Map<string, number>()
  for (const [zone, total] of faced) {
    const savedCount = made.get(zone) ?? 0
    result.set(zone, total === 0 ? 0 : savedCount / total)
  }
  return result
}

/**
 * Goals against per full game. Default game length 60 minutes.
 * Returns 0 if minutesPlayed === 0.
 */
export function goalsAgainstAverage(
  goalsAllowed: number,
  minutesPlayed: number,
  gameMinutes = 60,
): number {
  if (minutesPlayed === 0) return 0
  return (goalsAllowed / minutesPlayed) * gameMinutes
}

/** Penalty (7m) save rate: saves / faced. Returns 0 if faced === 0 */
export function sevenMeterSaveRate(saves: number, faced: number): number {
  if (faced === 0) return 0
  return saves / faced
}

// ---------------------------------------------------------------------------
// 3. Player performance
// ---------------------------------------------------------------------------

/** goals*1 + assists*0.5 + steals + blocks - turnovers */
export function playerEfficiency(
  goals: number,
  assists: number,
  turnovers: number,
  steals: number,
  blocks: number,
): number {
  return goals * 1 + assists * 0.5 + steals + blocks - turnovers
}

/** goals + assists */
export function goalContribution(goals: number, assists: number): number {
  return goals + assists
}

/** goals per possession; returns 0 if possessions === 0 */
export function attackEfficiency(goals: number, possessions: number): number {
  if (possessions === 0) return 0
  return goals / possessions
}

/** 2-minute suspensions per 60 minutes. Returns 0 if minutesPlayed === 0 */
export function twoMinutePenaltyRate(
  penalties: number,
  minutesPlayed: number,
): number {
  if (minutesPlayed === 0) return 0
  return (penalties / minutesPlayed) * 60
}

/**
 * Composite player rating:
 * goals*1 + assists*0.5 + saves*0.5 + steals*1 + blocks*1
 *   - turnovers*1 - technicalFaults*1
 */
export function playerRating(stats: PlayerRatingStats): number {
  return (
    stats.goals * 1 +
    stats.assists * 0.5 +
    stats.saves * 0.5 +
    stats.steals * 1 +
    stats.blocks * 1 -
    stats.turnovers * 1 -
    stats.technicalFaults * 1
  )
}

// ---------------------------------------------------------------------------
// 4. Team analytics
// ---------------------------------------------------------------------------

/** Team-level goals per possession; returns 0 if possessions === 0 */
export function possessionEfficiency(goals: number, possessions: number): number {
  if (possessions === 0) return 0
  return goals / possessions
}

/** Goals allowed per opponent possession; returns 0 if opponentPossessions === 0 */
export function defensiveEfficiency(
  goalsAllowed: number,
  opponentPossessions: number,
): number {
  if (opponentPossessions === 0) return 0
  return goalsAllowed / opponentPossessions
}

/**
 * Tempo classification by possessions per 60 minutes.
 * <50 slow, 50–60 moderate, >60 fast. Default gameMinutes 60.
 */
export function tempoRating(
  possessions: number,
  gameMinutes = 60,
): 'slow' | 'moderate' | 'fast' {
  if (gameMinutes === 0) return 'slow'
  const per60 = (possessions / gameMinutes) * 60
  if (per60 < 50) return 'slow'
  if (per60 <= 60) return 'moderate'
  return 'fast'
}

/** Pivot / line-player conversion: lineGoals / lineAttempts; 0 if lineAttempts === 0 */
export function pivotEffectiveness(lineGoals: number, lineAttempts: number): number {
  if (lineAttempts === 0) return 0
  return lineGoals / lineAttempts
}

/** Share of possessions ending in a fast break; 0 if totalPossessions === 0 */
export function transitionRate(
  fastBreaks: number,
  totalPossessions: number,
): number {
  if (totalPossessions === 0) return 0
  return fastBreaks / totalPossessions
}

// ---------------------------------------------------------------------------
// 5. Match analytics
// ---------------------------------------------------------------------------

/** home - away */
export function goalDifferential(homeGoals: number, awayGoals: number): number {
  return homeGoals - awayGoals
}

/** Sum of first-half goals by interval. */
export function halfTimeScore(firstHalfGoals: number[]): number {
  let sum = 0
  for (const g of firstHalfGoals) sum += g
  return sum
}

/**
 * Maximum deficit overcome in a match. Only meaningful on a win or draw.
 * Returns 0 if the match was lost (deficit was never truly overcome).
 */
export function comebackIndex(
  deficits: number[],
  result: MatchResultType,
): number {
  if (result === 'loss') return 0
  let max = 0
  for (const d of deficits) {
    if (d > max) max = d
  }
  return max
}

/**
 * Logistic-ish win probability from a goal lead and minutes remaining.
 * Bigger lead and less time remaining produce higher probability.
 * Clamped to [0, 1]. A zero lead with time remaining is a coin flip (0.5).
 */
export function winProbabilityFromLead(
  lead: number,
  minutesRemaining: number,
): number {
  // Urgency scales the lead's impact: as time runs out the lead matters more.
  const timeFactor = 1 / (1 + Math.max(0, minutesRemaining) / 10)
  const x = lead * (0.5 + timeFactor)
  const p = 1 / (1 + Math.exp(-x))
  if (p < 0) return 0
  if (p > 1) return 1
  return p
}

const XG_WEIGHTS: Record<string, number> = {
  wing: 0.55,
  line: 0.65,
  back: 0.45,
  fastbreak: 0.75,
  breakthrough: 0.7,
  '7m': 0.78,
}

/** Sum of attempts * zone xG weight (default 0.5 for unknown zones). */
export function expectedGoals(shotZones: ShotZoneAttempts[]): number {
  let xg = 0
  for (const sz of shotZones) {
    const weight = XG_WEIGHTS[sz.zone] ?? 0.5
    xg += sz.attempts * weight
  }
  return xg
}

// ---------------------------------------------------------------------------
// 6. Discipline & form
// ---------------------------------------------------------------------------

/** Penalty points: 2-minute=1, red card=3, blue card=5. */
export function disciplineScore(
  twoMinutes: number,
  redCards: number,
  blueCards: number,
): number {
  return twoMinutes * 1 + redCards * 3 + blueCards * 5
}

/**
 * Weighted form index. W=3, D=1, L=0, with the most-recent result weighted 2x.
 * recentResults is ordered oldest -> newest (last element is most recent).
 * Returns 0 if empty.
 */
export function formIndex(recentResults: FormResult[]): number {
  if (recentResults.length === 0) return 0
  let total = 0
  const lastIdx = recentResults.length - 1
  for (let i = 0; i < recentResults.length; i++) {
    const r = recentResults[i] ?? 'L'
    const base = r === 'W' ? 3 : r === 'D' ? 1 : 0
    const weight = i === lastIdx ? 2 : 1
    total += base * weight
  }
  return total
}

/**
 * Current streak measured from the end (most recent) of the results list.
 * results is ordered oldest -> newest. Returns { type: 'none', length: 0 } if empty.
 */
export function streakLength(results: FormResult[]): StreakInfo {
  if (results.length === 0) return { type: 'none', length: 0 }
  const last = results[results.length - 1] ?? 'L'
  let length = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if ((results[i] ?? 'L') === last) length += 1
    else break
  }
  return { type: last, length }
}

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy (Handball)
// ---------------------------------------------------------------------------

/**
 * DK-style scoring:
 * goal=8, assist=4, steal=3, block=3, save=3,
 * 7m goal bonus=2 (per seven-meter goal), 2min=-1, turnover=-1.
 */
export function dkHandballPoints(stats: DKHandballStats): number {
  return (
    stats.goals * 8 +
    stats.assists * 4 +
    stats.steals * 3 +
    stats.blocks * 3 +
    stats.saves * 3 +
    stats.sevenMeterGoals * 2 +
    stats.twoMinutes * -1 +
    stats.turnovers * -1
  )
}

/**
 * Weighted DK fantasy projection over recent games, most-recent weighted 3x.
 * recent is ordered oldest -> newest (last element is most recent).
 * Returns 0 if empty.
 */
export function dkProjection(recent: DKHandballStats[]): number {
  if (recent.length === 0) return 0
  let weightedTotal = 0
  let weightSum = 0
  const lastIdx = recent.length - 1
  for (let i = 0; i < recent.length; i++) {
    const game = recent[i]
    if (!game) continue
    const weight = i === lastIdx ? 3 : 1
    weightedTotal += dkHandballPoints(game) * weight
    weightSum += weight
  }
  if (weightSum === 0) return 0
  return weightedTotal / weightSum
}
