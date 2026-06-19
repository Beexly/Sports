/**
 * swimming-analytics.ts
 * Pure TypeScript swimming analytics library — no external dependencies.
 * All times are in seconds throughout.
 */

// ---------------------------------------------------------------------------
// 1. Basic timing and splits
// ---------------------------------------------------------------------------

/**
 * Divides totalTime evenly into `splits` segments.
 * Returns 0 if splits === 0.
 */
export function splitTime(totalTime: number, splits: number): number {
  if (splits === 0) return 0
  return totalTime / splits
}

/**
 * Returns cumulative (running total) lap times from individual lap times.
 */
export function splitTimes(lapTimes: number[]): number[] {
  const result: number[] = []
  let running = 0
  for (const t of lapTimes) {
    running += t
    result.push(running)
  }
  return result
}

/**
 * Mean of lapTimes. Returns 0 if empty.
 */
export function averageSplitTime(lapTimes: number[]): number {
  if (lapTimes.length === 0) return 0
  return lapTimes.reduce((sum, t) => sum + t, 0) / lapTimes.length
}

/**
 * Minimum lap time. Returns Infinity if empty.
 */
export function fastestSplit(lapTimes: number[]): number {
  if (lapTimes.length === 0) return Infinity
  return Math.min(...lapTimes)
}

/**
 * Maximum lap time. Returns -Infinity if empty.
 */
export function slowestSplit(lapTimes: number[]): number {
  if (lapTimes.length === 0) return -Infinity
  return Math.max(...lapTimes)
}

/**
 * Split differential: secondHalfTime - firstHalfTime.
 * Negative result indicates a negative split (faster second half = good).
 */
export function splitDifferential(firstHalfTime: number, secondHalfTime: number): number {
  return secondHalfTime - firstHalfTime
}

/**
 * Fraction of races where the second half was faster than the first (negative split).
 */
export function negativeSpiltRate(races: Array<{ firstHalf: number; secondHalf: number }>): number {
  if (races.length === 0) return 0
  const count = races.filter(r => r.secondHalf < r.firstHalf).length
  return count / races.length
}

// ---------------------------------------------------------------------------
// 2. Stroke rate and technique
// ---------------------------------------------------------------------------

/**
 * Strokes per second. Returns 0 if durationSeconds === 0.
 */
export function strokeRate(strokes: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0
  return strokes / durationSeconds
}

/**
 * Strokes per minute.
 */
export function strokeRatePerMinute(strokes: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0
  return (strokes / durationSeconds) * 60
}

/**
 * Meters per stroke. Returns 0 if totalStrokes === 0.
 */
export function distancePerStroke(distanceMeters: number, totalStrokes: number): number {
  if (totalStrokes === 0) return 0
  return distanceMeters / totalStrokes
}

/**
 * Stroke Index: velocity * distancePerStroke (measure of efficiency).
 */
export function strokeIndex(velocity: number, dps: number): number {
  return velocity * dps
}

/**
 * Stroke Efficiency Score.
 * Formula: (distancePerStroke / targetDPS) * 100 - strokeRate / 2
 * Default targetDPS = 2.0
 * Clamped to 0–100.
 */
export function strokeEfficiencyScore(
  dps: number,
  sRate: number,
  targetDPS: number = 2.0,
): number {
  const raw = (dps / targetDPS) * 100 - sRate / 2
  return Math.max(0, Math.min(100, raw))
}

/**
 * Swim velocity in m/s.
 */
export function swimVelocity(distanceMeters: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0
  return distanceMeters / timeSeconds
}

// ---------------------------------------------------------------------------
// 3. Turn and underwater analysis
// ---------------------------------------------------------------------------

/**
 * Turn time: pushOffTime - wallTouchTime.
 */
export function turnTime(wallTouchTime: number, pushOffTime: number): number {
  return pushOffTime - wallTouchTime
}

/**
 * Total underwater distance across all pullouts.
 */
export function underwaterDistance(pulloutCount: number, avgUnderwaterPerPullout: number): number {
  return pulloutCount * avgUnderwaterPerPullout
}

/**
 * Reaction time: leavingBlockTime - startSignalTime.
 */
export function reactionTime(startSignalTime: number, leavingBlockTime: number): number {
  return leavingBlockTime - startSignalTime
}

/**
 * Start efficiency: 1 - (reactionTime / firstSplitTime).
 * Clamped to 0–1.
 */
export function startEfficiency(rt: number, firstSplitTime: number): number {
  if (firstSplitTime === 0) return 0
  const raw = 1 - rt / firstSplitTime
  return Math.max(0, Math.min(1, raw))
}

/**
 * Turn efficiency score.
 * Formula: (1 - (turnTime - benchmarkTurnTime) / benchmarkTurnTime) * 100
 * Default benchmark = 0.8s. Clamped to 0–100.
 */
export function turnEfficiencyScore(tt: number, benchmarkTurnTime: number = 0.8): number {
  if (benchmarkTurnTime === 0) return 0
  const raw = (1 - (tt - benchmarkTurnTime) / benchmarkTurnTime) * 100
  return Math.max(0, Math.min(100, raw))
}

/**
 * Total turn time: sum of turnTimes.
 * Throws if lapTimes and turnTimes have different lengths.
 */
export function totalTurnTime(lapTimes: number[], turnTimes: number[]): number {
  if (lapTimes.length !== turnTimes.length) {
    throw new Error(
      `lapTimes length (${lapTimes.length}) must equal turnTimes length (${turnTimes.length})`,
    )
  }
  return turnTimes.reduce((sum, t) => sum + t, 0)
}

// ---------------------------------------------------------------------------
// 4. Race pace analytics
// ---------------------------------------------------------------------------

/**
 * Target pace in seconds per 100m.
 */
export function targetPace(distanceMeters: number, targetTimeSeconds: number): number {
  if (distanceMeters === 0) return 0
  return (targetTimeSeconds / distanceMeters) * 100
}

/**
 * Pace per 100m.
 */
export function pacePer100m(timeSeconds: number, distanceMeters: number): number {
  if (distanceMeters === 0) return 0
  return (timeSeconds / distanceMeters) * 100
}

/**
 * Pace per 50m.
 */
export function pacePer50m(timeSeconds: number, distanceMeters: number): number {
  if (distanceMeters === 0) return 0
  return (timeSeconds / distanceMeters) * 50
}

/**
 * Percentage of personal best: raceTime / personalBest * 100.
 * 100% = exact PB.
 */
export function percentageOfBestTime(raceTime: number, personalBest: number): number {
  if (personalBest === 0) return 0
  return (raceTime / personalBest) * 100
}

/**
 * Time drop needed: currentTime - targetTime.
 * Positive = needs improvement.
 */
export function timeDropNeeded(currentTime: number, targetTime: number): number {
  return currentTime - targetTime
}

/**
 * Projects final time given splits so far and total laps.
 * splitTimes.length must be < totalLaps.
 * projected = sum(splitTimes) + avg * (totalLaps - splitTimes.length)
 */
export function projectedTime(splitTimesArr: number[], totalLaps: number): number {
  const avg = averageSplitTime(splitTimesArr)
  const completed = splitTimesArr.length
  const remaining = totalLaps - completed
  const sumSoFar = splitTimesArr.reduce((s, t) => s + t, 0)
  return sumSoFar + avg * remaining
}

/**
 * Race quality score.
 * Formula: (seedTime - actualTime) / (seedTime - personalBest) * 100
 * Clamped to -100 to 200.
 */
export function raceQualityScore(
  actualTime: number,
  seedTime: number,
  personalBest: number,
): number {
  const denom = seedTime - personalBest
  if (denom === 0) return 0
  const raw = ((seedTime - actualTime) / denom) * 100
  return Math.max(-100, Math.min(200, raw))
}

// ---------------------------------------------------------------------------
// 5. Event-specific analytics
// ---------------------------------------------------------------------------

export type SwimEvent =
  | '50free'
  | '100free'
  | '200free'
  | '400free'
  | '800free'
  | '1500free'
  | '100back'
  | '200back'
  | '100breast'
  | '200breast'
  | '100fly'
  | '200fly'
  | '200IM'
  | '400IM'

/**
 * Distance in meters for each event.
 */
export function eventDistance(event: SwimEvent): number {
  const distances: Record<SwimEvent, number> = {
    '50free': 50,
    '100free': 100,
    '200free': 200,
    '400free': 400,
    '800free': 800,
    '1500free': 1500,
    '100back': 100,
    '200back': 200,
    '100breast': 100,
    '200breast': 200,
    '100fly': 100,
    '200fly': 200,
    '200IM': 200,
    '400IM': 400,
  }
  return distances[event]
}

/**
 * Normalized split proportions (should sum to 1) per event.
 * Represents expected pacing pattern by lap/segment.
 */
export function expectedSplitPattern(event: SwimEvent): number[] {
  const patterns: Record<SwimEvent, number[]> = {
    '50free': [1.0],
    '100free': [0.48, 0.52],
    '200free': [0.23, 0.25, 0.26, 0.26],
    '400free': [0.23, 0.25, 0.26, 0.26],
    '800free': [0.12, 0.13, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
    '1500free': [
      0.065, 0.067, 0.068, 0.068, 0.068, 0.068, 0.067, 0.067, 0.067, 0.067, 0.067, 0.067, 0.067,
      0.067, 0.067,
    ],
    '100back': [0.48, 0.52],
    '200back': [0.23, 0.25, 0.26, 0.26],
    '100breast': [0.47, 0.53],
    '200breast': [0.22, 0.25, 0.27, 0.26],
    '100fly': [0.46, 0.54],
    '200fly': [0.22, 0.25, 0.27, 0.26],
    '200IM': [0.23, 0.25, 0.26, 0.26],
    '400IM': [0.23, 0.25, 0.26, 0.26],
  }
  return patterns[event]
}

/**
 * Strokes used in each event.
 * IM events return strokes per quarter in order.
 */
export function strokes(event: SwimEvent): string[] {
  const strokeMap: Record<SwimEvent, string[]> = {
    '50free': ['freestyle'],
    '100free': ['freestyle'],
    '200free': ['freestyle'],
    '400free': ['freestyle'],
    '800free': ['freestyle'],
    '1500free': ['freestyle'],
    '100back': ['backstroke'],
    '200back': ['backstroke'],
    '100breast': ['breaststroke'],
    '200breast': ['breaststroke'],
    '100fly': ['butterfly'],
    '200fly': ['butterfly'],
    '200IM': ['butterfly', 'backstroke', 'breaststroke', 'freestyle'],
    '400IM': ['butterfly', 'backstroke', 'breaststroke', 'freestyle'],
  }
  return strokeMap[event]
}

/**
 * True if event is a sprint (50free, 100free, 100back, 100breast, 100fly).
 */
export function isSprintEvent(event: SwimEvent): boolean {
  return ['50free', '100free', '100back', '100breast', '100fly'].includes(event)
}

/**
 * True if event is a distance event (800free, 1500free).
 */
export function isDistanceEvent(event: SwimEvent): boolean {
  return ['800free', '1500free'].includes(event)
}

/**
 * Relative difficulty weight 1–10 per event.
 */
export function eventDifficultyWeight(event: SwimEvent): number {
  const weights: Record<SwimEvent, number> = {
    '50free': 5,
    '100free': 6,
    '200free': 7,
    '400free': 7,
    '800free': 8,
    '1500free': 8,
    '100back': 6,
    '200back': 7,
    '100breast': 6,
    '200breast': 7,
    '100fly': 6,
    '200fly': 7,
    '200IM': 8,
    '400IM': 9,
  }
  return weights[event]
}

// ---------------------------------------------------------------------------
// 6. Team relay analytics
// ---------------------------------------------------------------------------

/**
 * Lead-off relay split: splitTime + reactionTime (block start included).
 */
export function relayLeadOff(splitT: number, rt: number): number {
  return splitT + rt
}

/**
 * Relay exchange time: nextLeaveTime - touchTime.
 * Should be <= 0 for a legal relay exchange (next swimmer leaves on/before touch).
 */
export function relayExchangeTime(touchTime: number, nextLeaveTime: number): number {
  return nextLeaveTime - touchTime
}

/**
 * Total relay team time: sum of individual splits plus negative exchange bonuses.
 * Negative exchanges subtract time (benefit); positive exchanges add time (penalty/illegal).
 * exchanges.length must equal individualSplits.length - 1; throws otherwise.
 */
export function relayTeamTime(individualSplits: number[], exchanges: number[]): number {
  if (exchanges.length !== individualSplits.length - 1) {
    throw new Error(
      `exchanges length (${exchanges.length}) must equal individualSplits.length - 1 (${individualSplits.length - 1})`,
    )
  }
  const splitSum = individualSplits.reduce((s, t) => s + t, 0)
  const exchangeSum = exchanges.reduce((s, e) => s + e, 0)
  return splitSum + exchangeSum
}

export interface RelaySwimmer {
  id: string
  split: number
  reactionTime: number
}

/**
 * Optimal relay order:
 * - Lead-off: fastest reaction time
 * - Anchor: fastest split
 * - Middle two: sorted by split ascending (slower swimmers in middle)
 * For relays with exactly 4 swimmers.
 */
export function optimalRelayOrder(swimmers: RelaySwimmer[]): RelaySwimmer[] {
  if (swimmers.length <= 1) return [...swimmers]

  if (swimmers.length === 2) {
    // Lead-off = fastest reaction time
    const sorted = [...swimmers].sort((a, b) => a.reactionTime - b.reactionTime)
    return sorted
  }

  if (swimmers.length === 3) {
    const sortedByRT = [...swimmers].sort((a, b) => a.reactionTime - b.reactionTime)
    const leadOff = sortedByRT[0]
    if (leadOff === undefined) return [...swimmers]
    const rest = swimmers.filter(s => s.id !== leadOff.id)
    const sortedBySpeed = [...rest].sort((a, b) => a.split - b.split)
    const anchor = sortedBySpeed[0]
    if (anchor === undefined) return [leadOff, ...rest]
    const middle = sortedBySpeed.slice(1)
    return [leadOff, ...middle, anchor]
  }

  // 4 swimmers (standard relay)
  const sortedByRT = [...swimmers].sort((a, b) => a.reactionTime - b.reactionTime)
  const leadOff = sortedByRT[0]
  if (leadOff === undefined) return [...swimmers]

  const sortedBySplit = [...swimmers].sort((a, b) => a.split - b.split)
  const anchor = sortedBySplit[0]
  if (anchor === undefined) return [...swimmers]

  // middle two: remaining swimmers sorted by split ascending
  const middle = swimmers
    .filter(s => s.id !== leadOff.id && s.id !== anchor.id)
    .sort((a, b) => a.split - b.split)

  return [leadOff, ...middle, anchor]
}

/**
 * Projected relay team time: sum of splits + exchanges.
 * Default standardExchange = -0.05s per exchange.
 */
export function relayProjectedTime(
  relay: Array<{ split: number }>,
  standardExchange: number = -0.05,
): number {
  const splitSum = relay.reduce((s, r) => s + r.split, 0)
  const numExchanges = relay.length - 1
  return splitSum + numExchanges * standardExchange
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (swim meets)
// ---------------------------------------------------------------------------

export interface DKSwimStats {
  finishPosition: number
  personalBestSet: boolean
  meetRecord: boolean
  worldRecord: boolean
  relay: boolean
  relayFinishPosition?: number
}

/**
 * DraftKings swim meet score.
 * Base points: 1st=50, 2nd=40, 3rd=32, 4th=26, 5th=21, 6th=17, 7th=14, 8th=12, else=0
 * Bonuses: PB=+5, meet record=+10, world record=+20
 * Relay with relayFinishPosition <= 3: +8
 */
export function dkSwimScore(stats: DKSwimStats): number {
  const baseByPosition: Record<number, number> = {
    1: 50,
    2: 40,
    3: 32,
    4: 26,
    5: 21,
    6: 17,
    7: 14,
    8: 12,
  }

  const base = baseByPosition[stats.finishPosition] ?? 0
  let bonuses = 0

  if (stats.personalBestSet) bonuses += 5
  if (stats.meetRecord) bonuses += 10
  if (stats.worldRecord) bonuses += 20
  if (stats.relay && stats.relayFinishPosition !== undefined && stats.relayFinishPosition <= 3) {
    bonuses += 8
  }

  return base + bonuses
}

/**
 * DraftKings projected score from seed time relative to personal best.
 * avgFinishAtSeedTime: expected finish position (1-indexed, can be fractional).
 * Converts expected position to DK points using linear interpolation between positions.
 */
export function dkProjectedScore(
  seedTime: number,
  personalBest: number,
  avgFinishAtSeedTime: number,
): number {
  // Points table for positions 1-8, else 0
  const pointsTable = [50, 40, 32, 26, 21, 17, 14, 12]

  const position = avgFinishAtSeedTime
  if (position < 1) return pointsTable[0] ?? 0
  if (position >= 9) return 0

  const lowerIdx = Math.floor(position) - 1
  const upperIdx = Math.ceil(position) - 1
  const frac = position - Math.floor(position)

  const lowerPts = pointsTable[lowerIdx] ?? 0
  const upperPts = pointsTable[upperIdx] ?? 0

  // Adjust for proximity to PB: better than seed improves projection
  const pbRatio = personalBest > 0 ? seedTime / personalBest : 1
  const adjustmentFactor = Math.max(0.5, Math.min(1.5, 2 - pbRatio))

  const basePts = lowerPts + (upperPts - lowerPts) * frac
  return basePts * adjustmentFactor
}

/**
 * DraftKings value score: projectedScore / salary * 1000.
 * Returns 0 if salary === 0.
 */
export function dkValueScore(projectedScore: number, salary: number): number {
  if (salary === 0) return 0
  return (projectedScore / salary) * 1000
}
