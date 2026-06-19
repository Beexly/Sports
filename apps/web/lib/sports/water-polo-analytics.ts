/**
 * water-polo-analytics.ts
 * Pure TypeScript water polo analytics library.
 * Zero external dependencies — Node built-ins only.
 * noUncheckedIndexedAccess: all array index reads use ?? fallbacks.
 */

// ---------------------------------------------------------------------------
// 1. Scoring and game rules
// ---------------------------------------------------------------------------

/**
 * Signed goal differential (goalsFor - goalsAgainst).
 */
export function goalDifferential(goalsFor: number, goalsAgainst: number): number {
  return goalsFor - goalsAgainst
}

/**
 * Alternating 5-shot penalty shootout.
 * team1[0] vs team2[0] etc. Sudden death after 5 shots each.
 * Stops early if a winner is mathematically guaranteed.
 * Returns { team1, team2, winner }.
 */
export function shootoutResult(
  attempts: { player: number; scored: boolean }[][],
): { team1: number; team2: number; winner: 1 | 2 | 'draw' } {
  const team1Shots = attempts[0] ?? []
  const team2Shots = attempts[1] ?? []

  let t1 = 0
  let t2 = 0
  const regularRounds = 5

  // Regulated 5-shot phase with early termination
  for (let i = 0; i < regularRounds; i++) {
    const shot1 = team1Shots[i]
    const shot2 = team2Shots[i]

    if (shot1 !== undefined && shot1.scored) t1++
    if (shot2 !== undefined && shot2.scored) t2++

    // Check for early guaranteed winner after both teams have shot this round
    const shotsRemaining = regularRounds - (i + 1)
    if (t1 > t2 + shotsRemaining) break
    if (t2 > t1 + shotsRemaining) break
  }

  if (t1 !== t2) {
    return { team1: t1, team2: t2, winner: t1 > t2 ? 1 : 2 }
  }

  // Sudden death: continue from index 5 onward
  const sdStart = regularRounds
  const maxExtra = Math.max(team1Shots.length, team2Shots.length) - sdStart

  for (let i = 0; i < maxExtra; i++) {
    const idx = sdStart + i
    const shot1 = team1Shots[idx]
    const shot2 = team2Shots[idx]

    if (shot1 !== undefined && shot1.scored) t1++
    if (shot2 !== undefined && shot2.scored) t2++

    if (t1 !== t2) {
      return { team1: t1, team2: t2, winner: t1 > t2 ? 1 : 2 }
    }
  }

  return { team1: t1, team2: t2, winner: 'draw' }
}

/**
 * Advantage swim result: winner gains possession with "advantage" label.
 */
export function advantageSwim(winner: 1 | 2): { possession: 1 | 2; advantage: string } {
  return { possession: winner, advantage: 'advantage' }
}

/**
 * Goals per period (4 regular + optional OT = period 5) and totals.
 */
export function periodScore(
  goals: { period: 1 | 2 | 3 | 4 | 5; team: 1 | 2 }[],
): { p1: number[]; p2: number[]; total: [number, number] } {
  const p1 = [0, 0, 0, 0, 0] // indices 0–4 → periods 1–5
  const p2 = [0, 0, 0, 0, 0]

  for (const goal of goals) {
    const idx = goal.period - 1
    if (goal.team === 1) {
      p1[idx] = (p1[idx] ?? 0) + 1
    } else {
      p2[idx] = (p2[idx] ?? 0) + 1
    }
  }

  const total1 = p1.reduce((s, v) => s + v, 0)
  const total2 = p2.reduce((s, v) => s + v, 0)

  return { p1, p2, total: [total1, total2] }
}

/**
 * Standard league points: win=3, draw=1, loss=0.
 */
export function teamPoints(wins: number, losses: number, draws: number): number {
  void losses // losses contribute 0
  return wins * 3 + draws * 1
}

/**
 * Milliseconds remaining in current quarter.
 * Default quarter duration = 480000ms (8 minutes).
 */
export function quarterTimeRemaining(
  startMs: number,
  nowMs: number,
  quarterDurationMs = 480_000,
): number {
  const elapsed = nowMs - startMs
  return Math.max(0, quarterDurationMs - elapsed)
}

// ---------------------------------------------------------------------------
// 2. Shot analytics
// ---------------------------------------------------------------------------

/**
 * Shooting percentage (goals / shots). Returns 0 if shots === 0.
 */
export function shootingPercentage(goals: number, shots: number): number {
  if (shots === 0) return 0
  return goals / shots
}

/**
 * Group shots by position and compute per-position stats.
 */
export function shotsByPosition(
  shots: { position: 'left' | 'right' | 'center' | 'penalty' | 'extra_man'; scored: boolean }[],
): Map<string, { attempts: number; goals: number; pct: number }> {
  const map = new Map<string, { attempts: number; goals: number; pct: number }>()

  for (const shot of shots) {
    const existing = map.get(shot.position) ?? { attempts: 0, goals: 0, pct: 0 }
    const attempts = existing.attempts + 1
    const goals = existing.goals + (shot.scored ? 1 : 0)
    const pct = attempts === 0 ? 0 : goals / attempts
    map.set(shot.position, { attempts, goals, pct })
  }

  return map
}

/**
 * Goalkeeper save percentage (saves / shotsOnGoal). Returns 0 if shotsOnGoal === 0.
 */
export function goalKeeperSavePercentage(saves: number, shotsOnGoal: number): number {
  if (shotsOnGoal === 0) return 0
  return saves / shotsOnGoal
}

/**
 * Counter-attack goal ratio (counterGoals / totalGoals). Returns 0 if totalGoals === 0.
 */
export function counterAttackRate(counterGoals: number, totalGoals: number): number {
  if (totalGoals === 0) return 0
  return counterGoals / totalGoals
}

/**
 * Extra-man goal conversion per exclusion drawn. Returns 0 if exclusions === 0.
 */
export function exclusionToGoalConversion(extraManGoals: number, exclusions: number): number {
  if (exclusions === 0) return 0
  return extraManGoals / exclusions
}

/**
 * Driver vs perimeter goal ratio: driver/(driver+perimeter). Returns 0 if sum === 0.
 */
export function driverVsPerimeter(driverGoals: number, perimeterGoals: number): number {
  const total = driverGoals + perimeterGoals
  if (total === 0) return 0
  return driverGoals / total
}

// ---------------------------------------------------------------------------
// 3. Player analytics
// ---------------------------------------------------------------------------

/**
 * PER-like player efficiency rating.
 * (goals*3 + assists*2 + steals*2 + exclusionsCaused) / Math.max(minutes, 1)
 */
export function playerEfficiencyRating(
  goals: number,
  assists: number,
  steals: number,
  exclusionsCaused: number,
  minutes: number,
): number {
  const numerator = goals * 3 + assists * 2 + steals * 2 + exclusionsCaused
  return numerator / Math.max(minutes, 1)
}

/**
 * Assist-to-goal ratio. Returns 0 if goals === 0.
 */
export function assistToGoalRatio(assists: number, goals: number): number {
  if (goals === 0) return 0
  return assists / goals
}

/**
 * Exclusions per 32-minute game equivalent. Returns 0 if minutesPlayed === 0.
 */
export function exclusionRate(exclusions: number, minutesPlayed: number): number {
  if (minutesPlayed === 0) return 0
  return (exclusions / minutesPlayed) * 32
}

/**
 * Swim speed in meters per second.
 */
export function swimSpeed(distanceM: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0
  return distanceM / timeSeconds
}

/**
 * Average sprint speed after fatigue decay.
 * Each sprint assumes 15m distance; decay: sprint_i * (1 - 0.02 * i), where i is 0-indexed.
 * Returns 0 if sprints array is empty or restSeconds === 0.
 */
export function sprintCapacity(sprints: number[], restSeconds: number): number {
  if (sprints.length === 0) return 0
  if (restSeconds === 0) return 0

  const SPRINT_DISTANCE = 15

  let totalSpeed = 0
  for (let i = 0; i < sprints.length; i++) {
    const time = sprints[i] ?? 0
    const decayFactor = 1 - 0.02 * i
    const speed = time === 0 ? 0 : SPRINT_DISTANCE / time
    totalSpeed += speed * decayFactor
  }

  return totalSpeed / sprints.length
}

/**
 * Average goalkeeper reaction quotient = distanceM / shotSpeed (higher = more time).
 * Returns 0 if saves array is empty.
 */
export function goalieReactionScore(
  saves: { shotSpeed: number; distanceM: number }[],
): number {
  if (saves.length === 0) return 0

  let total = 0
  for (const save of saves) {
    const rq = save.shotSpeed === 0 ? 0 : save.distanceM / save.shotSpeed
    total += rq
  }

  return total / saves.length
}

// ---------------------------------------------------------------------------
// 4. Tactical analytics
// ---------------------------------------------------------------------------

/**
 * Extra-man efficiency: conversion rate and average exclusion duration.
 */
export function extraManEfficiency(
  plays: { duration: number; scored: boolean }[],
): { conversionRate: number; avgDuration: number } {
  if (plays.length === 0) return { conversionRate: 0, avgDuration: 0 }

  const scored = plays.filter((p) => p.scored).length
  const totalDuration = plays.reduce((s, p) => s + p.duration, 0)

  return {
    conversionRate: scored / plays.length,
    avgDuration: totalDuration / plays.length,
  }
}

/**
 * Pressure defense rating: (steals + turnoversForced) / max(possessionsDefended, 1).
 */
export function pressureDefenseRating(
  steals: number,
  turnoversForced: number,
  possessionsDefended: number,
): number {
  return (steals + turnoversForced) / Math.max(possessionsDefended, 1)
}

/**
 * Offensive efficiency: goals per 100 possessions. Returns 0 if possessions === 0.
 */
export function offensiveEfficiency(goals: number, possessions: number): number {
  if (possessions === 0) return 0
  return (goals / possessions) * 100
}

/**
 * Defensive efficiency: goals allowed per 100 possessions defended.
 */
export function defensiveEfficiency(
  goalsAllowed: number,
  possessionsDefended: number,
): number {
  if (possessionsDefended === 0) return 0
  return (goalsAllowed / possessionsDefended) * 100
}

/**
 * Net rating: offEff - defEff (per 100 possessions).
 */
export function netRating(offEff: number, defEff: number): number {
  return offEff - defEff
}

/**
 * Transition/fast-break rate: fastBreakGoals / totalGoals. Returns 0 if totalGoals === 0.
 */
export function transitionRate(fastBreakGoals: number, totalGoals: number): number {
  if (totalGoals === 0) return 0
  return fastBreakGoals / totalGoals
}

// ---------------------------------------------------------------------------
// 5. Set play analytics
// ---------------------------------------------------------------------------

/**
 * Penalty shot rate per possession. Returns 0 if totalPossessions === 0.
 */
export function penaltyShotRate(
  penaltyShotsAttempted: number,
  totalPossessions: number,
): number {
  if (totalPossessions === 0) return 0
  return penaltyShotsAttempted / totalPossessions
}

/**
 * Penalty conversion rate. Returns 0 if penaltyAttempts === 0.
 */
export function penaltyConversionRate(
  penaltyGoals: number,
  penaltyAttempts: number,
): number {
  if (penaltyAttempts === 0) return 0
  return penaltyGoals / penaltyAttempts
}

/**
 * Corner throw success rate (goals from corner throws). Returns 0 if corners === 0.
 */
export function cornerThrowSuccess(goals: number, corners: number): number {
  if (corners === 0) return 0
  return goals / corners
}

/**
 * Six-meter shot conversion rate. Returns 0 if sixMeterAttempts === 0.
 */
export function sixMeterShotRate(
  sixMeterGoals: number,
  sixMeterAttempts: number,
): number {
  if (sixMeterAttempts === 0) return 0
  return sixMeterGoals / sixMeterAttempts
}

/**
 * Pressure defense composite: steals*2 + blocks*1.5 - fouls*0.5.
 */
export function pressureDefense(
  steals: number,
  blocks: number,
  fouls: number,
): number {
  return steals * 2 + blocks * 1.5 - fouls * 0.5
}

// ---------------------------------------------------------------------------
// 6. Team analysis
// ---------------------------------------------------------------------------

/**
 * Possession time percentage. Returns 0 if totalSeconds === 0.
 */
export function possessionTime(totalSeconds: number, possessionSeconds: number): number {
  if (totalSeconds === 0) return 0
  return (possessionSeconds / totalSeconds) * 100
}

/**
 * Home advantage: home win% - away win%.
 * Returns 0 if homeGames === 0 or awayGames === 0.
 */
export function homeAdvantage(
  homeWins: number,
  homeGames: number,
  awayWins: number,
  awayGames: number,
): number {
  if (homeGames === 0 || awayGames === 0) return 0
  return homeWins / homeGames - awayWins / awayGames
}

/**
 * Rolling momentum index for team 1.
 * Counts team 1 goals in the final window of the goalSequence.
 * Default windowSize = 3. Returns 0 if sequence is empty.
 */
export function momentumIndex(
  goalSequence: (1 | 2)[],
  windowSize = 3,
): number {
  if (goalSequence.length === 0) return 0
  const window = goalSequence.slice(-windowSize)
  return window.filter((g) => g === 1).length
}

/**
 * Fatigue-adjusted rating.
 * rating * (1 - gamesInLast7Days * 0.03); clamped >= 0.
 */
export function fatigueAdjustedRating(baseRating: number, gamesInLast7Days: number): number {
  const adjusted = baseRating * (1 - gamesInLast7Days * 0.03)
  return Math.max(0, adjusted)
}

/**
 * Diving penalty rate: divingCalls / foulsCommitted. Returns 0 if foulsCommitted === 0.
 */
export function divingPenaltyRate(divingCalls: number, foulsCommitted: number): number {
  if (foulsCommitted === 0) return 0
  return divingCalls / foulsCommitted
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Water Polo)
// ---------------------------------------------------------------------------

export interface DKWaterPoloResult {
  goals: number
  assists: number
  saves: number
  steals: number
  exclusionsCaused: number
  minutesPlayed: number
}

/**
 * DraftKings water polo fantasy points.
 * goal=10, assist=5, save=5, steal=4, exclusionCaused=3, +2 per 5 min played.
 */
export function dkWaterPoloPoints(result: DKWaterPoloResult): number {
  const minuteBonus = Math.floor(result.minutesPlayed / 5) * 2
  return (
    result.goals * 10 +
    result.assists * 5 +
    result.saves * 5 +
    result.steals * 4 +
    result.exclusionsCaused * 3 +
    minuteBonus
  )
}

/**
 * Weighted average DK projection; most recent result counts 3x.
 * Returns 0 if empty.
 */
export function dkProjection(recentResults: DKWaterPoloResult[]): number {
  if (recentResults.length === 0) return 0

  const lastResult = recentResults[recentResults.length - 1]
  const lastPts = dkWaterPoloPoints(
    lastResult ?? { goals: 0, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 },
  )

  if (recentResults.length === 1) {
    return lastPts
  }

  const others = recentResults.slice(0, recentResults.length - 1)
  const otherSum = others.reduce((sum, r) => sum + dkWaterPoloPoints(r), 0)
  const totalWeight = 3 + others.length

  return (lastPts * 3 + otherSum) / totalWeight
}
