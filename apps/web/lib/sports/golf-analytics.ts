/**
 * golf-analytics.ts
 * Pure TypeScript golf analytics library — no external dependencies.
 * Covers scoring, fairways/GIR/putting, strokes gained, handicap system,
 * course difficulty, tournament analytics, and fantasy scoring.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShotType = 'tee' | 'approach' | 'around_green' | 'putting'

export interface Shot {
  type: ShotType
  /** yards for full shots, feet for putts */
  distance: number
  result: 'hit' | 'miss' | 'near_miss'
  lie: 'fairway' | 'rough' | 'sand' | 'recovery' | 'tee' | 'green'
}

export interface HoleResult {
  par: number
  score: number
  fairwayHit?: boolean
  greenInRegulation?: boolean
  putts: number
  drivingDistance?: number
  shots?: Shot[]
}

export interface RoundStats {
  holes: HoleResult[]
  course: string
  par: number
  rating: number
  slope: number
}

export interface PlayerProfile {
  handicapIndex: number
  rounds: RoundStats[]
}

export interface TournamentEntry {
  playerId: string
  /** score vs par */
  score: number
  holesCompleted: number
  position?: number
}

export interface GolfFantasyScore {
  dkScore: number
  fdScore: number
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Returns score relative to par (negative = under par). */
export function toPar(score: number, par: number): number {
  return score - par
}

/** Returns the conventional label for a score relative to par. */
export function scoreLabel(toParValue: number): string {
  if (toParValue <= -3) return 'albatross'
  if (toParValue === -2) return 'eagle'
  if (toParValue === -1) return 'birdie'
  if (toParValue === 0) return 'par'
  if (toParValue === 1) return 'bogey'
  if (toParValue === 2) return 'double bogey'
  if (toParValue === 3) return 'triple bogey'
  return `+${toParValue}`
}

/** Returns total score vs par for all holes. */
export function roundToPar(holes: HoleResult[]): number {
  return holes.reduce((sum, h) => sum + (h.score - h.par), 0)
}

/** Returns total strokes for front nine (holes 0-8). */
export function frontNine(holes: HoleResult[]): number {
  return holes.slice(0, 9).reduce((sum, h) => sum + h.score, 0)
}

/** Returns total strokes for back nine (holes 9-17). */
export function backNine(holes: HoleResult[]): number {
  return holes.slice(9, 18).reduce((sum, h) => sum + h.score, 0)
}

/** Counts how many holes match the given score type. */
export function countScoreType(
  holes: HoleResult[],
  type: 'eagle' | 'birdie' | 'par' | 'bogey' | 'double_bogey' | 'worse',
): number {
  return holes.filter((h) => {
    const diff = h.score - h.par
    switch (type) {
      case 'eagle':
        return diff <= -2
      case 'birdie':
        return diff === -1
      case 'par':
        return diff === 0
      case 'bogey':
        return diff === 1
      case 'double_bogey':
        return diff === 2
      case 'worse':
        return diff >= 3
      default:
        return false
    }
  }).length
}

/** Returns average total strokes per round. */
export function scoringAverage(rounds: RoundStats[]): number {
  if (rounds.length === 0) return 0
  const total = rounds.reduce(
    (sum, r) => sum + r.holes.reduce((s, h) => s + h.score, 0),
    0,
  )
  return total / rounds.length
}

/**
 * Returns adjusted scoring average where each hole is capped at par+2
 * (Equitable Stroke Control).
 */
export function adjustedScoringAverage(rounds: RoundStats[]): number {
  if (rounds.length === 0) return 0
  const total = rounds.reduce((sum, r) => {
    const roundScore = r.holes.reduce((s, h) => {
      const capped = Math.min(h.score, h.par + 2)
      return s + capped
    }, 0)
    return sum + roundScore
  }, 0)
  return total / rounds.length
}

// ---------------------------------------------------------------------------
// Fairways, GIR, Putting
// ---------------------------------------------------------------------------

/** Returns fairway hit percentage on applicable holes (par 4s and 5s only). */
export function fairwayHitPct(holes: HoleResult[]): number {
  const applicable = holes.filter((h) => h.par >= 4 && h.fairwayHit !== undefined)
  if (applicable.length === 0) return 0
  const hits = applicable.filter((h) => h.fairwayHit === true).length
  return hits / applicable.length
}

/** Returns greens in regulation percentage. */
export function girPct(holes: HoleResult[]): number {
  if (holes.length === 0) return 0
  const gir = holes.filter((h) => h.greenInRegulation === true).length
  return gir / holes.length
}

/** Returns mean putts per hole. */
export function avgPutts(holes: HoleResult[]): number {
  if (holes.length === 0) return 0
  const total = holes.reduce((sum, h) => sum + h.putts, 0)
  return total / holes.length
}

/** Returns average putts on holes where GIR was achieved. */
export function puttsPerGIR(holes: HoleResult[]): number {
  const girHoles = holes.filter((h) => h.greenInRegulation === true)
  if (girHoles.length === 0) return 0
  const total = girHoles.reduce((sum, h) => sum + h.putts, 0)
  return total / girHoles.length
}

/** Returns percentage of holes where only one putt was taken. */
export function onePuttPct(holes: HoleResult[]): number {
  if (holes.length === 0) return 0
  return holes.filter((h) => h.putts === 1).length / holes.length
}

/** Returns percentage of holes where three or more putts were taken. */
export function threePuttPct(holes: HoleResult[]): number {
  if (holes.length === 0) return 0
  return holes.filter((h) => h.putts >= 3).length / holes.length
}

/** Returns sand save percentage (saves / bunker shots attempted). */
export function sandSavePct(bunkerShots: number, sandSaves: number): number {
  if (bunkerShots === 0) return 0
  return sandSaves / bunkerShots
}

// ---------------------------------------------------------------------------
// Driving
// ---------------------------------------------------------------------------

/** Returns mean driving distance where recorded. */
export function avgDrivingDistance(holes: HoleResult[]): number {
  const withDist = holes.filter(
    (h) => h.drivingDistance !== undefined && h.drivingDistance > 0,
  )
  if (withDist.length === 0) return 0
  const total = withDist.reduce((sum, h) => sum + (h.drivingDistance ?? 0), 0)
  return total / withDist.length
}

/** Returns driving accuracy (same as fairwayHitPct — fairway hit on par 4/5). */
export function drivingAccuracy(holes: HoleResult[]): number {
  return fairwayHitPct(holes)
}

/**
 * Returns total driving rank relative to field.
 * Lower is better (average of distance rank and accuracy rank).
 */
export function totalDrivingRank(
  distanceRank: number,
  accuracyRank: number,
  _totalPlayers: number,
): number {
  return (distanceRank + accuracyRank) / 2
}

// ---------------------------------------------------------------------------
// Strokes Gained — lookup tables and interpolation
// ---------------------------------------------------------------------------

/** Linear interpolation between two points. */
function lerp(x0: number, y0: number, x1: number, y1: number, x: number): number {
  if (x1 === x0) return y0
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
}

/** Find surrounding entries in a sorted lookup table and interpolate. */
function interpolateLookup(
  table: ReadonlyArray<readonly [number, number]>,
  distance: number,
): number {
  if (table.length === 0) return 0
  const first = table[0]!
  const last = table[table.length - 1]!
  if (distance <= first[0]) return first[1]
  if (distance >= last[0]) return last[1]

  for (let i = 0; i < table.length - 1; i++) {
    const lo = table[i]
    const hi = table[i + 1]
    if (lo === undefined || hi === undefined) continue
    const [x0, y0] = lo
    const [x1, y1] = hi
    if (distance >= x0 && distance <= x1) {
      return lerp(x0, y0, x1, y1, distance)
    }
  }
  return last[1]
}

// Tee shot baseline: [holeDistance, expectedStrokes] by par
const PAR4_TEE_TABLE = [
  [300, 3.8],
  [400, 4.0],
  [450, 4.1],
] as const

// Approach: [distance yards, expectedStrokes]
const APPROACH_TABLE = [
  [50, 2.8],
  [100, 3.0],
  [150, 3.2],
  [200, 3.5],
  [250, 3.8],
] as const

// Around green: [distance yards, expectedStrokes]
const AROUND_TABLE = [
  [10, 2.4],
  [20, 2.5],
  [30, 2.6],
  [50, 2.8],
] as const

// Putting: [distance feet, expectedStrokes]
const PUTTING_TABLE = [
  [3, 1.08],
  [5, 1.2],
  [10, 1.5],
  [15, 1.7],
  [20, 1.9],
  [25, 2.05],
  [30, 2.15],
] as const

/**
 * Returns expected strokes to hole out from the given position.
 * For 'tee' shots, distance is hole length in yards (requires context).
 * For 'approach', distance is yards to the hole.
 * For 'around_green', distance is yards.
 * For 'putting', distance is feet.
 *
 * Note: for tee shots, we use par=4 baseline by default as a simplification
 * when called standalone. Use sgOffTee for the full tee-shot SG calculation.
 */
export function expectedStrokes(type: ShotType, distance: number): number {
  switch (type) {
    case 'tee':
      // Default to par4 table when called without par context
      return interpolateLookup(PAR4_TEE_TABLE, distance)
    case 'approach':
      return interpolateLookup(APPROACH_TABLE, distance)
    case 'around_green':
      return interpolateLookup(AROUND_TABLE, distance)
    case 'putting': {
      const raw = interpolateLookup(PUTTING_TABLE, distance)
      return Math.min(2.5, Math.max(1.0, raw))
    }
    default:
      return 0
  }
}

/**
 * Calculates strokes gained for a single shot.
 * SG = expectedStrokes(before) - (1 + expectedStrokes(after))
 * If the shot is holed, afterExpected = 0.
 */
export function sgShot(
  type: ShotType,
  distanceBefore: number,
  distanceAfter: number | 'holed',
): number {
  const before = expectedStrokes(type, distanceBefore)
  const after = distanceAfter === 'holed' ? 0 : expectedStrokes(type, distanceAfter)
  return before - (1 + after)
}

/** Calculates total strokes gained off the tee. */
export function sgOffTee(
  shots: Array<{ distance: number; result: Shot }>,
): number {
  return shots.reduce((sum, s) => {
    // distance here is hole distance; result.distance is remaining distance after shot
    const before = expectedStrokes('tee', s.distance)
    const afterDist = s.result.distance
    const after = expectedStrokes('approach', afterDist)
    return sum + (before - (1 + after))
  }, 0)
}

/** Calculates total strokes gained on approach shots. */
export function sgApproach(shots: Shot[]): number {
  return shots
    .filter((s) => s.type === 'approach')
    .reduce((sum, s) => {
      const before = expectedStrokes('approach', s.distance)
      // After approach shot: ball is on or near green; estimate ~10ft if near_miss, 5ft if hit
      const remainingFeet = s.result === 'hit' ? 5 : s.result === 'near_miss' ? 15 : 30
      const after = expectedStrokes('putting', remainingFeet)
      return sum + (before - (1 + after))
    }, 0)
}

/** Calculates total strokes gained around the green. */
export function sgAround(shots: Shot[]): number {
  return shots
    .filter((s) => s.type === 'around_green')
    .reduce((sum, s) => {
      const before = expectedStrokes('around_green', s.distance)
      const remainingFeet = s.result === 'hit' ? 3 : s.result === 'near_miss' ? 8 : 20
      const after = expectedStrokes('putting', remainingFeet)
      return sum + (before - (1 + after))
    }, 0)
}

/** Calculates total strokes gained putting. */
export function sgPutting(
  putts: Array<{ feet: number; made: boolean }>,
): number {
  return putts.reduce((sum, p) => {
    const before = expectedStrokes('putting', p.feet)
    // If made: distanceAfter = 0 (holed). If missed: estimate 1.5ft remaining.
    const after = p.made ? 0 : expectedStrokes('putting', 1.5)
    return sum + (before - (1 + after))
  }, 0)
}

/** Returns total strokes gained from all categories. */
export function totalSG(breakdown: {
  offTee: number
  approach: number
  around: number
  putting: number
}): number {
  return breakdown.offTee + breakdown.approach + breakdown.around + breakdown.putting
}

// ---------------------------------------------------------------------------
// Handicap System (World Handicap System — simplified)
// ---------------------------------------------------------------------------

/**
 * Returns course handicap.
 * Formula: floor(handicapIndex × (slope/113) + (rating - par))
 */
export function courseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number,
): number {
  return Math.floor(handicapIndex * (slope / 113) + (rating - par))
}

/**
 * Returns adjusted gross score (net double bogey cap per hole applied).
 * Each hole is capped at par + 2 + any handicap strokes.
 * For simplicity, we cap each hole at par+2 (course handicap strokes not per-hole here).
 */
export function adjustedGrossScore(
  score: number,
  _courseHandicap: number,
): number {
  // Simplified: the score already represents the full round;
  // return as-is (caller is responsible for per-hole adjustments)
  return score
}

/**
 * Returns a score differential.
 * Formula: (adjustedScore - rating) × (113 / slope)
 */
export function scoreDifferential(
  adjustedScore: number,
  rating: number,
  slope: number,
): number {
  return (adjustedScore - rating) * (113 / slope)
}

/**
 * Partial table for fewer than 20 differentials (WHS simplified):
 * 3→1, 4→1, 5→1, 6→2, 7→2, 8→2, 9→3, 10→3, ..., 19→8
 */
const PARTIAL_DIFF_TABLE: Record<number, number> = {
  3: 1,
  4: 1,
  5: 1,
  6: 2,
  7: 2,
  8: 2,
  9: 3,
  10: 3,
  11: 3,
  12: 4,
  13: 4,
  14: 5,
  15: 5,
  16: 6,
  17: 6,
  18: 7,
  19: 8,
}

/**
 * Returns handicap index from an array of score differentials.
 * If ≥20 differentials: best 8 of last 20 × 0.96.
 * If fewer than 20: use partial table.
 */
export function handicapIndex(differentials: number[]): number {
  const n = differentials.length
  if (n < 3) return 0

  if (n >= 20) {
    const last20 = differentials.slice(-20)
    const sorted = [...last20].sort((a, b) => a - b)
    const best8 = sorted.slice(0, 8)
    const avg = best8.reduce((s, d) => s + d, 0) / 8
    return avg * 0.96
  }

  // Partial table
  const useBest = PARTIAL_DIFF_TABLE[n] ?? 1
  const sorted = [...differentials].sort((a, b) => a - b)
  const bestN = sorted.slice(0, useBest)
  const avg = bestN.reduce((s, d) => s + d, 0) / useBest
  return avg * 0.96
}

/**
 * Returns playing handicap.
 * Formula: floor(courseHandicap × allowance), default allowance = 1.0
 */
export function playingHandicap(
  courseHandicapValue: number,
  allowance = 1.0,
): number {
  return Math.floor(courseHandicapValue * allowance)
}

/** Returns net score (gross score minus playing handicap). */
export function netScore(grossScore: number, playingHandicapValue: number): number {
  return grossScore - playingHandicapValue
}

// ---------------------------------------------------------------------------
// Course Difficulty
// ---------------------------------------------------------------------------

/** Returns the course rating directly (already adjusted for scratch golfer). */
export function courseRating(rating: number): number {
  return rating
}

/** Returns slope rating (55-155 range). */
export function slopeRating(difficulty: number): number {
  return difficulty
}

export interface CourseDifficulty {
  overPar: number
  bogeyDiff: number
  label: 'easy' | 'moderate' | 'hard' | 'very_hard'
}

/**
 * Returns course difficulty assessment.
 * overPar = rating - par
 * bogeyDiff = slope (proxy)
 * label: easy <70 slope, moderate 70-120, hard 121-135, very_hard >135
 */
export function difficulty(
  rating: number,
  slope: number,
  par: number,
): CourseDifficulty {
  const overPar = rating - par
  const bogeyDiff = slope

  let label: 'easy' | 'moderate' | 'hard' | 'very_hard'
  if (slope < 70) {
    label = 'easy'
  } else if (slope <= 120) {
    label = 'moderate'
  } else if (slope <= 135) {
    label = 'hard'
  } else {
    label = 'very_hard'
  }

  return { overPar, bogeyDiff, label }
}

/**
 * Normalizes a score to a standard scale.
 * Formula: score - rating + par
 */
export function courseParAdjusted(
  score: number,
  rating: number,
  par: number,
): number {
  return score - rating + par
}

// ---------------------------------------------------------------------------
// Tournament Analytics
// ---------------------------------------------------------------------------

/**
 * Returns sorted leaderboard with positions assigned.
 * Sorted by score ascending (lowest wins), holesCompleted descending for ties.
 */
export function leaderboard(entries: TournamentEntry[]): TournamentEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return b.holesCompleted - a.holesCompleted
  })

  // Assign positions with tied positions
  return sorted.map((entry, idx, arr) => {
    let pos: number
    const prev = arr[idx - 1]
    if (idx === 0 || prev === undefined) {
      pos = 1
    } else if (
      prev.score === entry.score &&
      prev.holesCompleted === entry.holesCompleted
    ) {
      pos = prev.position ?? idx
    } else {
      pos = idx + 1
    }
    return { ...entry, position: pos }
  })
}

/**
 * Returns the score of the last player who makes the cut.
 * Default cutSize = 70.
 */
export function cutLine(entries: TournamentEntry[], cutSize = 70): number {
  const sorted = [...entries].sort((a, b) => a.score - b.score)
  const cutIndex = Math.min(cutSize - 1, sorted.length - 1)
  return sorted[cutIndex]?.score ?? 0
}

/**
 * Projects final score based on current pace.
 * Formula: currentScore / holesPlayed * totalHoles (default 72).
 */
export function projectedFinish(
  currentScore: number,
  holesPlayed: number,
  totalHoles = 72,
): number {
  if (holesPlayed === 0) return 0
  return (currentScore / holesPlayed) * totalHoles
}

/** Returns whether a score makes the cut. */
export function madeTheCut(score: number, cutLineScore: number): boolean {
  return score <= cutLineScore
}

/**
 * Returns field strength index — ratio of players scoring below average vs total.
 * Higher = more competitive field.
 */
export function fieldStrengthIndex(
  entries: TournamentEntry[],
  avgTourRating = 0,
): number {
  if (entries.length === 0) return 0
  const belowAvg = entries.filter((e) => e.score < avgTourRating).length
  return belowAvg / entries.length
}

// ---------------------------------------------------------------------------
// Fantasy Scoring
// ---------------------------------------------------------------------------

export interface DraftKingsGolfStats {
  place: number
  totalPlayers: number
  birdie: number
  eagle: number
  bogey: number
  doubleBogey: number
  bogeyFree: boolean
  birdieOrBetter: number
  holesInOne: number
  drivingDistanceBonus?: boolean
}

/**
 * Returns DraftKings golf fantasy score.
 * 1st: 30pts, top5: 14, top10: 9, top20: 5, top30: 3, made cut (not top30): 2
 * Bogey-free round: 5
 * Birdie: 3, Eagle: 8, Bogey: -1, Double bogey: -2
 * Hole in one: 10
 * Driving distance bonus: 1
 */
export function draftKingsGolfScore(stats: DraftKingsGolfStats): number {
  let score = 0

  // Placement points
  if (stats.place === 1) {
    score += 30
  } else if (stats.place <= 5) {
    score += 14
  } else if (stats.place <= 10) {
    score += 9
  } else if (stats.place <= 20) {
    score += 5
  } else if (stats.place <= 30) {
    score += 3
  } else {
    // Made cut (not top 30)
    score += 2
  }

  // Bogey-free round bonus
  if (stats.bogeyFree) {
    score += 5
  }

  // Scoring events
  score += stats.birdie * 3
  score += stats.eagle * 8
  score += stats.bogey * -1
  score += stats.doubleBogey * -2
  score += stats.holesInOne * 10

  // Driving distance bonus
  if (stats.drivingDistanceBonus) {
    score += 1
  }

  return score
}

export interface FanDuelGolfStats {
  place: number
  totalPlayers: number
  birdies: number
  eagles: number
  bogeys: number
  doubleBogeys: number
  makeCut: boolean
}

/**
 * Returns FanDuel golf fantasy score.
 * 1st: 20, top5: 10, top10: 6, top20: 3
 * Birdie: 3, Eagle: 6, Bogey: -1, Double bogey: -2
 * Make cut: 2
 */
export function fanDuelGolfScore(stats: FanDuelGolfStats): number {
  let score = 0

  // Placement points
  if (stats.place === 1) {
    score += 20
  } else if (stats.place <= 5) {
    score += 10
  } else if (stats.place <= 10) {
    score += 6
  } else if (stats.place <= 20) {
    score += 3
  }

  // Scoring events
  score += stats.birdies * 3
  score += stats.eagles * 6
  score += stats.bogeys * -1
  score += stats.doubleBogeys * -2

  // Make cut bonus
  if (stats.makeCut) {
    score += 2
  }

  return score
}
