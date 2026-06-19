/**
 * equestrian-analytics.ts
 * Pure TypeScript equestrian & horse racing analytics library — no external dependencies.
 * Covers show jumping, dressage, eventing (3-day), horse racing, performance/form,
 * rider/jockey stats, and DraftKings-style fantasy scoring.
 *
 * Conventions:
 *  - All array index reads use `?? 0` / `?? ''` fallbacks (noUncheckedIndexedAccess).
 *  - No `any` types. Every function is a named export.
 */

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Penalty value applied for an eliminating fault (fall, 2nd refusal, etc.). */
export const ELIMINATION_FAULTS = 1000

/** Metres per furlong (international standard). */
export const METERS_PER_FURLONG = 201.168

// ---------------------------------------------------------------------------
// 1. Show jumping
// ---------------------------------------------------------------------------

/**
 * Total jumping faults from knockdowns, refusals and falls.
 *  - Each knockdown = 4 faults.
 *  - First refusal = 4 faults; any refusal beyond the first = elimination (1000).
 *  - A fall = elimination (treated as 1000).
 */
export function jumpingFaults(
  knockdowns: number,
  refusals: number,
  falls: number,
): number {
  const kd = Math.max(0, knockdowns)
  const ref = Math.max(0, refusals)
  const fl = Math.max(0, falls)

  let total = kd * 4

  if (ref >= 2) {
    total += ELIMINATION_FAULTS
  } else if (ref === 1) {
    total += 4
  }

  if (fl >= 1) {
    total += ELIMINATION_FAULTS
  }

  return total
}

/**
 * Time faults for exceeding the allowed time.
 * `perSecond` is the number of seconds-per-fault (default 4, i.e. 1 fault per 4s over).
 * Returns 0 if within (or exactly at) the allowed time.
 */
export function timeFaults(
  timeSeconds: number,
  allowedTime: number,
  perSecond = 4,
): number {
  const over = timeSeconds - allowedTime
  if (over <= 0) return 0
  if (perSecond <= 0) return 0
  return Math.ceil(over / perSecond)
}

/** Sum of jumping (obstacle) faults and time faults. */
export function totalJumpingScore(jumpFaults: number, timeFaults: number): number {
  return jumpFaults + timeFaults
}

/** A clear round has exactly zero faults. */
export function clearRound(faults: number): boolean {
  return faults === 0
}

/**
 * Jump-off ranking: sort by faults ascending, then by time ascending.
 * Returns the rider order (best first).
 */
export function jumpOffRanking(
  rounds: { rider: string; faults: number; time: number }[],
): string[] {
  return [...rounds]
    .sort((a, b) => {
      if (a.faults !== b.faults) return a.faults - b.faults
      return a.time - b.time
    })
    .map((r) => r.rider)
}

// ---------------------------------------------------------------------------
// 2. Dressage
// ---------------------------------------------------------------------------

/**
 * Dressage percentage = points / max * 100.
 * Returns 0 if max is 0 (avoid divide-by-zero).
 */
export function dressagePercentage(totalPoints: number, maxPoints: number): number {
  if (maxPoints === 0) return 0
  return (totalPoints / maxPoints) * 100
}

/**
 * Weighted movement score: sum of score * coefficient over all movements.
 */
export function weightedMovementScore(
  movements: { score: number; coefficient: number }[],
): number {
  return movements.reduce((sum, m) => sum + m.score * m.coefficient, 0)
}

/**
 * Dressage final score = average across the judges' panel scores.
 * Returns 0 for an empty panel.
 */
export function dressageFinalScore(judgeScores: number[]): number {
  if (judgeScores.length === 0) return 0
  const sum = judgeScores.reduce((s, v) => s + v, 0)
  return sum / judgeScores.length
}

/**
 * Collective marks: sum of the four collective categories (each on a /10 scale).
 */
export function collectiveMarks(
  rhythm: number,
  impulsion: number,
  submission: number,
  riderPosition: number,
): number {
  return rhythm + impulsion + submission + riderPosition
}

/**
 * Dressage ranking: sort competitors by percentage descending (best first).
 */
export function dressageRanking(
  competitors: { name: string; percentage: number }[],
): string[] {
  return [...competitors]
    .sort((a, b) => b.percentage - a.percentage)
    .map((c) => c.name)
}

// ---------------------------------------------------------------------------
// 3. Eventing (3-day)
// ---------------------------------------------------------------------------

/**
 * Eventing total penalty = dressage + cross-country + show jumping (lower = better).
 */
export function eventingTotal(
  dressagePenalty: number,
  crossCountryPenalty: number,
  showJumpingPenalty: number,
): number {
  return dressagePenalty + crossCountryPenalty + showJumpingPenalty
}

/**
 * Convert a dressage percentage into an eventing penalty.
 * penalty = (100 - percentage) * 1.5 (good-mark coefficient). Clamped to >= 0.
 */
export function dressageToPenalty(percentage: number): number {
  const penalty = (100 - percentage) * 1.5
  return Math.max(0, penalty)
}

/**
 * Cross-country penalty = jumping penalties + time penalties.
 * Time penalties accrue at `perSecond` (default 0.4) per second over the optimum time.
 */
export function crossCountryPenalty(
  jumpingPenalties: number,
  timeSeconds: number,
  optimumTime: number,
  perSecond = 0.4,
): number {
  const over = timeSeconds - optimumTime
  const timePenalty = over > 0 ? over * perSecond : 0
  return jumpingPenalties + timePenalty
}

/**
 * Eventing ranking: sort by total penalty ascending (best first).
 */
export function eventingRanking(
  competitors: { name: string; totalPenalty: number }[],
): string[] {
  return [...competitors]
    .sort((a, b) => a.totalPenalty - b.totalPenalty)
    .map((c) => c.name)
}

// ---------------------------------------------------------------------------
// 4. Horse racing
// ---------------------------------------------------------------------------

/** Convert furlongs to metres (1 furlong = 201.168 m). */
export function furlongsToMeters(furlongs: number): number {
  return furlongs * METERS_PER_FURLONG
}

/** Race pace in metres/second. Returns 0 if time is 0. */
export function racePace(distanceMeters: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0
  return distanceMeters / timeSeconds
}

/**
 * Speed rating where the standard time = 100.
 * Faster than standard => higher rating. `perLength` = seconds per 1 rating point
 * (default 0.2s = 1 point).
 */
export function speedRating(
  timeSeconds: number,
  standardTime: number,
  perLength = 0.2,
): number {
  if (perLength <= 0) return 100
  const diff = standardTime - timeSeconds
  return 100 + diff / perLength
}

/**
 * Weight-adjusted rating: penalises weight carried above par.
 * Default parWeight = 57 kg, perKg = 2 points per kg over par.
 * Carrying less than par raises the rating (negative penalty).
 */
export function weightAdjustedRating(
  baseRating: number,
  weightCarriedKg: number,
  parWeightKg = 57,
  perKg = 2,
): number {
  const extra = weightCarriedKg - parWeightKg
  return baseRating - extra * perKg
}

/**
 * Convert a time gap (seconds behind) into beaten lengths.
 * lengths = (timeBehind * speed) / lengthMeters. Default length = 2.4 m.
 * Returns 0 if length is 0.
 */
export function marginInLengths(
  timeBehindSeconds: number,
  speedMetersPerSec: number,
  lengthMeters = 2.4,
): number {
  if (lengthMeters === 0) return 0
  return (timeBehindSeconds * speedMetersPerSec) / lengthMeters
}

/** Implied probability from decimal odds = 1 / odds. Returns 0 if odds <= 0. */
export function impliedProbFromOdds(decimalOdds: number): number {
  if (decimalOdds <= 0) return 0
  return 1 / decimalOdds
}

/**
 * Convert decimal odds to a simplified fractional string "X/Y".
 * Returns "0/1" if odds <= 1 (no positive return).
 */
export function oddsToFractional(decimalOdds: number): string {
  if (decimalOdds <= 1) return '0/1'

  // Net profit fraction = odds - 1.
  const net = decimalOdds - 1

  // Express net as a fraction over a denominator, then reduce.
  // Use 1000 precision to capture common odds cleanly.
  const denom = 1000
  let numerator = Math.round(net * denom)
  let denominator = denom

  const divisor = gcd(numerator, denominator)
  if (divisor > 0) {
    numerator = numerator / divisor
    denominator = denominator / divisor
  }

  return `${numerator}/${denominator}`
}

/** Greatest common divisor (Euclid). Works on non-negative integers. */
function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x
}

// ---------------------------------------------------------------------------
// 5. Performance & form (racing)
// ---------------------------------------------------------------------------

/**
 * Form-figure score from a list of recent finishing positions.
 * Non-finishing codes 'P' (pulled up), 'F' (fell), 'U' (unseated) count as 10 (worst).
 * The two most-recent figures are weighted 2x. Lower average = better form.
 * Returns 0 for an empty list.
 *
 * `figures` are ordered oldest -> newest (most recent last).
 */
export function formFigureScore(figures: (number | 'P' | 'F' | 'U')[]): number {
  if (figures.length === 0) return 0

  const n = figures.length
  let weightedSum = 0
  let weightTotal = 0

  for (let i = 0; i < n; i++) {
    const raw = figures[i] ?? 0
    const value = typeof raw === 'number' ? raw : 10
    // Most recent two figures (last two indices) get weight 2x.
    const weight = i >= n - 2 ? 2 : 1
    weightedSum += value * weight
    weightTotal += weight
  }

  if (weightTotal === 0) return 0
  return weightedSum / weightTotal
}

/**
 * Whole days since the last run. Returns 0 if the result would be negative.
 */
export function daysSinceLastRun(lastRunEpochMs: number, nowEpochMs: number): number {
  const diffMs = nowEpochMs - lastRunEpochMs
  if (diffMs < 0) return 0
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Average finishing position on a given going. Returns Infinity if no data exists
 * for that going.
 */
export function goingPreference(
  results: { going: string; position: number }[],
  going: string,
): number {
  const matching = results.filter((r) => r.going === going)
  if (matching.length === 0) return Infinity
  const sum = matching.reduce((s, r) => s + r.position, 0)
  return sum / matching.length
}

/**
 * Class rating = (wins * 3 + places) / runs. Returns 0 if runs is 0.
 */
export function classRating(wins: number, places: number, runs: number): number {
  if (runs === 0) return 0
  return (wins * 3 + places) / runs
}

// ---------------------------------------------------------------------------
// 6. Rider / jockey stats
// ---------------------------------------------------------------------------

/** Win strike rate = wins / rides. Returns 0 if rides is 0. */
export function winStrikeRate(wins: number, rides: number): number {
  if (rides === 0) return 0
  return wins / rides
}

/** Place strike rate = placings / rides. Returns 0 if rides is 0. */
export function placeStrikeRate(placings: number, rides: number): number {
  if (rides === 0) return 0
  return placings / rides
}

/**
 * Rider consistency = 1 / (1 + stdev of finishing positions).
 * Returns 1 if fewer than 2 positions (no variance data => perfectly consistent).
 */
export function riderConsistency(positions: number[]): number {
  if (positions.length < 2) return 1
  const n = positions.length
  const mean = positions.reduce((s, p) => s + p, 0) / n
  const variance =
    positions.reduce((s, p) => s + (p - mean) * (p - mean), 0) / n
  const stdev = Math.sqrt(variance)
  return 1 / (1 + stdev)
}

/** Return on stakes = (returns - staked) / staked. Returns 0 if staked is 0. */
export function returnOnStakes(returns: number, staked: number): number {
  if (staked === 0) return 0
  return (returns - staked) / staked
}

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy (Equestrian / Racing)
// ---------------------------------------------------------------------------

type EquestrianDiscipline = 'jumping' | 'dressage' | 'eventing' | 'racing'

interface EquestrianResult {
  discipline: EquestrianDiscipline
  placement: number
  clearRound?: boolean
  personalBest?: boolean
}

/**
 * DraftKings-style points for a single equestrian/racing result.
 * Placement ladder: 1st=40, 2nd=32, 3rd=26, 4th=20, 5th=16, 6th-10th=10, else=4.
 * Bonuses: clear round +8, personal best +5.
 */
export function dkEquestrianPoints(result: EquestrianResult): number {
  let points = placementPoints(result.placement)
  if (result.clearRound) points += 8
  if (result.personalBest) points += 5
  return points
}

/** Map a finishing placement to its DK base points. */
function placementPoints(placement: number): number {
  if (placement === 1) return 40
  if (placement === 2) return 32
  if (placement === 3) return 26
  if (placement === 4) return 20
  if (placement === 5) return 16
  if (placement >= 6 && placement <= 10) return 10
  return 4
}

/**
 * DK projection from recent results — weighted average with the most-recent
 * result weighted 3x. Returns 0 for an empty list.
 *
 * `recent` is ordered oldest -> newest (most recent last).
 */
export function dkProjection(recent: EquestrianResult[]): number {
  if (recent.length === 0) return 0

  const n = recent.length
  let weightedSum = 0
  let weightTotal = 0

  for (let i = 0; i < n; i++) {
    const result = recent[i]
    if (!result) continue
    const pts = dkEquestrianPoints(result)
    // Most recent result (last index) weighted 3x.
    const weight = i === n - 1 ? 3 : 1
    weightedSum += pts * weight
    weightTotal += weight
  }

  if (weightTotal === 0) return 0
  return weightedSum / weightTotal
}
