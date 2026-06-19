/**
 * curling-analytics.ts
 * Pure TypeScript curling analytics library — no external dependencies.
 * Covers end scoring, shot analytics, hammer & strategy, player positions,
 * match dynamics, advanced metrics, and DraftKings-style fantasy scoring.
 *
 * Node built-ins only. No `any`. Every function is a named export.
 */

export type Team = 'a' | 'b'

/** A stone resting in the house, with its distance (m) from the button. */
export interface HouseStone {
  team: Team
  distance: number
}

/** Result of a single end: which team scored and how many points. null = blank end. */
export interface EndResult {
  team: Team | null
  points: number
}

// ---------------------------------------------------------------------------
// 1. Scoring & ends
// ---------------------------------------------------------------------------

/**
 * Determine the score for a single end from stones in the house.
 * The team whose stone is closest to the button scores; it counts every one
 * of its stones that is closer than the opponent's nearest stone.
 * Returns { team: null, points: 0 } when no stones are in the house (blank end).
 */
export function endScore(
  teamStonesInHouse: HouseStone[],
): EndResult {
  if (teamStonesInHouse.length === 0) {
    return { team: null, points: 0 }
  }
  // Sort by distance ascending (closest first).
  const sorted = [...teamStonesInHouse].sort((x, y) => x.distance - y.distance)
  const closest = sorted[0]
  if (closest === undefined) {
    return { team: null, points: 0 }
  }
  const scoringTeam = closest.team
  // Nearest opponent stone distance (Infinity if opponent has none in house).
  let nearestOpponent = Infinity
  for (const stone of sorted) {
    if (stone.team !== scoringTeam) {
      nearestOpponent = stone.distance
      break
    }
  }
  // Count consecutive scoring-team stones closer than nearest opponent.
  let points = 0
  for (const stone of sorted) {
    if (stone.team === scoringTeam && stone.distance < nearestOpponent) {
      points += 1
    } else {
      break
    }
  }
  return { team: scoringTeam, points }
}

/**
 * Aggregate the running game score from a list of end results.
 * Blank ends (team === null) add nothing.
 */
export function gameScore(ends: EndResult[]): { a: number; b: number } {
  let a = 0
  let b = 0
  for (const end of ends) {
    if (end.team === 'a') a += end.points
    else if (end.team === 'b') b += end.points
  }
  return { a, b }
}

/**
 * Who has the hammer next end. The team that scored loses the hammer.
 * A blank end (winner === null) keeps the hammer unchanged → returns null
 * to signal "no change".
 */
export function hammerNext(prevEndWinner: Team | null): Team | null {
  if (prevEndWinner === null) return null
  return prevEndWinner === 'a' ? 'b' : 'a'
}

/**
 * Number of times the given team forced the opponent to a single point.
 * A "force" = opponent held the hammer in an end and scored exactly 1.
 * `team` is the forcing (non-hammer) team; we count opponent-held ends where
 * the opponent scored exactly 1.
 */
export function forceCount(
  ends: EndResult[],
  team: Team,
): number {
  const opponent: Team = team === 'a' ? 'b' : 'a'
  let count = 0
  for (const end of ends) {
    if (end.team === opponent && end.points === 1) {
      count += 1
    }
  }
  return count
}

/**
 * Number of steals by the given team. A steal = scoring an end without the
 * hammer. `hammerByEnd[i]` is which team held the hammer for ends[i].
 * Ends without a matching hammer entry are skipped.
 */
export function stealCount(
  ends: EndResult[],
  hammerByEnd: Team[],
  team: Team,
): number {
  let count = 0
  for (let i = 0; i < ends.length; i += 1) {
    const end = ends[i]
    const hammer = hammerByEnd[i]
    if (end === undefined || hammer === undefined) continue
    if (end.team === team && end.points > 0 && hammer !== team) {
      count += 1
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// 2. Shot analytics
// ---------------------------------------------------------------------------

/**
 * Curling shot percentage: achieved points / possible points * 100.
 * Returns 0 when maxPoints is 0.
 */
export function shotPercentage(points: number, maxPoints: number): number {
  if (maxPoints === 0) return 0
  return (points / maxPoints) * 100
}

/**
 * Team shooting percentage from per-shot ratings (0–4 scale).
 * Average rating normalized to a 0–100 percentage (rating / 4 * 100).
 * Returns 0 for empty input.
 */
export function teamShootingPct(shots: { rating: number }[]): number {
  if (shots.length === 0) return 0
  const total = shots.reduce((sum, s) => sum + s.rating, 0)
  const avg = total / shots.length
  return (avg / 4) * 100
}

/**
 * Hit-and-stay rate: successful / attempts * 100. Returns 0 when no attempts.
 */
export function hitAndStayRate(successful: number, attempts: number): number {
  if (attempts === 0) return 0
  return (successful / attempts) * 100
}

/**
 * Draw weight proxy: distance traveled (m) over time to hog line (s) = m/s.
 * Returns 0 when time is 0.
 */
export function drawWeight(
  distanceTraveledM: number,
  timeToHogSec: number,
): number {
  if (timeToHogSec === 0) return 0
  return distanceTraveledM / timeToHogSec
}

/**
 * Takeout efficiency: removed / attempts * 100. Returns 0 when no attempts.
 */
export function takeoutEfficiency(removed: number, attempts: number): number {
  if (attempts === 0) return 0
  return (removed / attempts) * 100
}

// ---------------------------------------------------------------------------
// 3. Hammer & strategy
// ---------------------------------------------------------------------------

/**
 * Hammer conversion rate: ends with the hammer where the team scored 2+ /
 * total hammer ends * 100. Returns 0 when there are no hammer ends.
 */
export function hammerConversionRate(
  hammerEndsScored2Plus: number,
  hammerEnds: number,
): number {
  if (hammerEnds === 0) return 0
  return (hammerEndsScored2Plus / hammerEnds) * 100
}

/**
 * Blank end rate: blanks / total ends * 100. Returns 0 when no ends.
 */
export function blankEndRate(blanks: number, totalEnds: number): number {
  if (totalEnds === 0) return 0
  return (blanks / totalEnds) * 100
}

/**
 * Steal efficiency: steals / opponent hammer ends * 100.
 * Returns 0 when opponent never held the hammer.
 */
export function stealEfficiency(
  steals: number,
  opponentHammerEnds: number,
): number {
  if (opponentHammerEnds === 0) return 0
  return (steals / opponentHammerEnds) * 100
}

/**
 * Force efficiency: forces / opponent hammer ends * 100.
 * Returns 0 when opponent never held the hammer.
 */
export function forceEfficiency(
  forces: number,
  opponentHammerEnds: number,
): number {
  if (opponentHammerEnds === 0) return 0
  return (forces / opponentHammerEnds) * 100
}

/**
 * Last-stone-draw accuracy: average distance from button (lower is better).
 * Returns 0 for empty input.
 */
export function lastStoneDrawAccuracy(distancesFromButton: number[]): number {
  if (distancesFromButton.length === 0) return 0
  const total = distancesFromButton.reduce((sum, d) => sum + d, 0)
  return total / distancesFromButton.length
}

// ---------------------------------------------------------------------------
// 4. Player positions
// ---------------------------------------------------------------------------

/**
 * Skip accuracy: made shots / called shots * 100. Returns 0 when no calls.
 */
export function skipAccuracy(madeShots: number, calledShots: number): number {
  if (calledShots === 0) return 0
  return (madeShots / calledShots) * 100
}

/**
 * Lead draw percentage from per-draw ratings (0–4). Same normalization as
 * teamShootingPct: average rating / 4 * 100. Returns 0 for empty input.
 */
export function leadDrawPct(draws: { rating: number }[]): number {
  if (draws.length === 0) return 0
  const total = draws.reduce((sum, d) => sum + d.rating, 0)
  const avg = total / draws.length
  return (avg / 4) * 100
}

/**
 * Sweeping impact: extra distance (m) gained by sweeping = with - without.
 * Can be negative if sweeping data is inconsistent.
 */
export function sweepingImpact(
  distanceWithSweep: number,
  distanceWithout: number,
): number {
  return distanceWithSweep - distanceWithout
}

/**
 * Position rating: average of per-shot ratings (0–4) normalized to 0–100.
 * Returns 0 for empty input.
 */
export function positionRating(shotRatings: number[]): number {
  if (shotRatings.length === 0) return 0
  const total = shotRatings.reduce((sum, r) => sum + r, 0)
  const avg = total / shotRatings.length
  return (avg / 4) * 100
}

// ---------------------------------------------------------------------------
// 5. Match dynamics
// ---------------------------------------------------------------------------

/**
 * Running score differential (a - b) cumulatively after each end.
 * Returns one entry per end. Empty input → empty array.
 */
export function runningScoreDiff(ends: EndResult[]): number[] {
  const result: number[] = []
  let a = 0
  let b = 0
  for (const end of ends) {
    if (end.team === 'a') a += end.points
    else if (end.team === 'b') b += end.points
    result.push(a - b)
  }
  return result
}

/**
 * Comeback index: rewards overcoming a large deficit and winning.
 * If won, returns the max deficit faced (positive). If not won, returns 0.
 * A negative maxDeficit (never trailed) yields 0 when won.
 */
export function comebackIndex(maxDeficit: number, won: boolean): number {
  if (!won) return 0
  return Math.max(0, maxDeficit)
}

/**
 * End win rate: fraction of ends won by the team * 100.
 * Blank ends count as not-won for either team. Returns 0 for empty input.
 */
export function endWinRate(ends: EndResult[], team: Team): number {
  if (ends.length === 0) return 0
  let won = 0
  for (const end of ends) {
    if (end.team === team && end.points > 0) won += 1
  }
  return (won / ends.length) * 100
}

/**
 * Concede threshold: a team should concede when it is mathematically unable to
 * catch up. With `endsRemaining` ends left, the most points obtainable is
 * bounded by those ends; if the deficit exceeds endsRemaining the game is out
 * of reach. Returns true when scoreDiff (the team's deficit, positive number)
 * is strictly greater than endsRemaining.
 */
export function concedeThreshold(
  scoreDiff: number,
  endsRemaining: number,
): boolean {
  return scoreDiff > endsRemaining
}

// ---------------------------------------------------------------------------
// 6. Advanced metrics
// ---------------------------------------------------------------------------

/**
 * Free Guard Zone violation: removing an opponent's guard stone from play
 * before the fifth stone of the end is illegal. Returns true when a stone was
 * removed (>0) AND it happened before the fifth stone.
 */
export function freeGuardZoneViolation(
  stonesRemoved: number,
  beforeFifthStone: boolean,
): boolean {
  return stonesRemoved > 0 && beforeFifthStone
}

/**
 * Weight control consistency: 1 / (1 + stdev) of the delivered weights.
 * Tighter weights → closer to 1. Returns 1 when fewer than 2 samples
 * (no measurable variance).
 */
export function weightControlConsistency(weights: number[]): number {
  if (weights.length < 2) return 1
  const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length
  const variance =
    weights.reduce((sum, w) => sum + (w - mean) ** 2, 0) / weights.length
  const stdev = Math.sqrt(variance)
  return 1 / (1 + stdev)
}

/**
 * Ice reading score: 1 - normalized mean absolute error between predicted and
 * actual curl. Returns 0 when inputs are empty or lengths mismatch.
 * Normalization divides MAE by (mean magnitude of actual curl) so the result
 * is bounded; clamped to [0, 1].
 */
export function iceReadingScore(
  predictedCurl: number[],
  actualCurl: number[],
): number {
  if (
    predictedCurl.length === 0 ||
    actualCurl.length === 0 ||
    predictedCurl.length !== actualCurl.length
  ) {
    return 0
  }
  let absErrorSum = 0
  let magnitudeSum = 0
  for (let i = 0; i < actualCurl.length; i += 1) {
    const pred = predictedCurl[i] ?? 0
    const act = actualCurl[i] ?? 0
    absErrorSum += Math.abs(pred - act)
    magnitudeSum += Math.abs(act)
  }
  const mae = absErrorSum / actualCurl.length
  const meanMagnitude = magnitudeSum / actualCurl.length
  if (meanMagnitude === 0) {
    // No curl expected; perfect only if no error.
    return mae === 0 ? 1 : 0
  }
  const normalizedError = mae / meanMagnitude
  return Math.max(0, Math.min(1, 1 - normalizedError))
}

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy
// ---------------------------------------------------------------------------

export interface CurlingFantasyStats {
  shotPct: number
  steals: number
  pointsScored: number
  hammerConversions: number
  gameWon: boolean
}

/**
 * DraftKings-style curling fantasy points:
 *   shotPct * 0.5
 *   + steals * 4
 *   + pointsScored * 2
 *   + hammerConversions * 3
 *   + (gameWon ? 10 : 0)
 */
export function dkCurlingPoints(stats: CurlingFantasyStats): number {
  return (
    stats.shotPct * 0.5 +
    stats.steals * 4 +
    stats.pointsScored * 2 +
    stats.hammerConversions * 3 +
    (stats.gameWon ? 10 : 0)
  )
}

/**
 * DK projection from recent games: average of the recent games' DK points,
 * weighting the three most recent games 3x. Returns 0 for empty input.
 */
export function dkProjection(recent: CurlingFantasyStats[]): number {
  if (recent.length === 0) return 0
  let weightedSum = 0
  let weightTotal = 0
  for (let i = 0; i < recent.length; i += 1) {
    const game = recent[i]
    if (game === undefined) continue
    const weight = i < 3 ? 3 : 1
    weightedSum += dkCurlingPoints(game) * weight
    weightTotal += weight
  }
  if (weightTotal === 0) return 0
  return weightedSum / weightTotal
}
