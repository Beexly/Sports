/**
 * skiing-analytics.ts
 * Pure TypeScript skiing analytics library — no external dependencies.
 * Covers alpine skiing, cross-country, ski jumping, biathlon,
 * snowboarding/freestyle, speed skating, and DraftKings fantasy.
 */

// ---------------------------------------------------------------------------
// 1. Alpine skiing (downhill / slalom / GS / SG / Super-G)
// ---------------------------------------------------------------------------

/**
 * Sum of all gate split times.
 */
export function gateTime(splits: number[]): number {
  return splits.reduce((sum, s) => sum + s, 0)
}

/**
 * Combined time for two-run formats (e.g. slalom, GS).
 */
export function combinedTime(run1: number, run2: number): number {
  return run1 + run2
}

/**
 * Signed time difference: time2 - time1.
 * Positive = time2 is slower. Negative = time2 is faster.
 */
export function timeDifference(time1: number, time2: number): number {
  return time2 - time1
}

/**
 * Returns true when the status means no finishing time was recorded.
 */
export function dnsOrDnf(status: 'DNS' | 'DNF' | 'DSQ' | 'finish'): boolean {
  return status !== 'finish'
}

/**
 * Speed through a gate in metres per second.
 * Returns 0 when elapsedSec is 0.
 */
export function slalomGateSpeed(distance: number, elapsedSec: number): number {
  if (elapsedSec === 0) return 0
  return distance / elapsedSec
}

/**
 * Vertical descent speed in metres per second.
 */
export function verticalSpeed(verticalDrop: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0
  return verticalDrop / timeSeconds
}

/**
 * Glide efficiency: horizontal speed / vertical speed.
 * Higher = more efficient traverse. Returns 0 when verticalSpeed is 0.
 */
export function glideEfficiency(horizontalSpeed: number, vSpeed: number): number {
  if (vSpeed === 0) return 0
  return horizontalSpeed / vSpeed
}

/**
 * FIS Alpine Ski World Cup points for a given finishing place.
 * 1st=100, 2nd=80, 3rd=60, 4th=50, 5th=45, 6th=40, 7th=36, 8th=32,
 * 9th=29, 10th=26, 11–30th: 24,22,20,18,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1
 * Beyond 30th = 0.
 */
export function worldCupPoints(place: number): number {
  const table: Record<number, number> = {
    1: 100,
    2: 80,
    3: 60,
    4: 50,
    5: 45,
    6: 40,
    7: 36,
    8: 32,
    9: 29,
    10: 26,
    11: 24,
    12: 22,
    13: 20,
    14: 18,
    15: 16,
    16: 15,
    17: 14,
    18: 13,
    19: 12,
    20: 11,
    21: 10,
    22: 9,
    23: 8,
    24: 7,
    25: 6,
    26: 5,
    27: 4,
    28: 3,
    29: 2,
    30: 1,
  }
  return table[place] ?? 0
}

// ---------------------------------------------------------------------------
// 2. Cross-country skiing
// ---------------------------------------------------------------------------

/**
 * Pace in seconds per kilometre.
 * Returns 0 when distanceKm is 0.
 */
export function pacePerKm(totalSec: number, distanceKm: number): number {
  if (distanceKm === 0) return 0
  return totalSec / distanceKm
}

/**
 * Uphill efficiency: ratio of flat pace to uphill pace.
 * <1 = faster on flat than uphill (normal); >1 = faster uphill (unusual).
 * Returns 0 when either segment has invalid (zero) distance or time.
 */
export function uphillEfficiency(
  uphillSec: number,
  uphillKm: number,
  flatSec: number,
  flatKm: number,
): number {
  if (uphillKm === 0 || flatKm === 0) return 0
  const uphillPace = uphillSec / uphillKm
  if (uphillPace === 0) return 0
  const flatPace = flatSec / flatKm
  return flatPace / uphillPace
}

/**
 * Skating advantage in seconds over classical technique.
 * Positive = skating is faster; negative = classical is faster.
 */
export function skatingVsClassical(skatingTime: number, classicalTime: number): number {
  return classicalTime - skatingTime
}

/**
 * 1-based finishing rank for a given finishTime in a field.
 * Ties share the lower (better) rank.
 */
export function massStartPosition(finishTime: number, fieldTimes: number[]): number {
  let rank = 1
  for (const t of fieldTimes) {
    if (t < finishTime) rank++
  }
  return rank
}

/**
 * Pursuit gap in seconds relative to the leader.
 * Positive = athlete is ahead of the reference leader time.
 * Negative = athlete is behind.
 */
export function pursuitGap(intervalStart: number, currentTime: number): number {
  return intervalStart - currentTime
}

// ---------------------------------------------------------------------------
// 3. Ski jumping
// ---------------------------------------------------------------------------

/**
 * Distance points for a ski jump.
 * Formula: 60 + (distance - kPoint) * unitPoints
 * Default unitPoints = 1.8 (K120 hill); use 2.0 for K90–K119; 1.2 for <K90.
 * When unitPoints is omitted the caller passes undefined and we use 1.8.
 */
export function distancePoints(
  distance: number,
  kPoint: number,
  unitPoints: number = 1.8,
): number {
  return 60 + (distance - kPoint) * unitPoints
}

/**
 * Style points from 5 judges (each 0–20).
 * Drop the highest and lowest scores, sum the remaining three.
 * Returns 0 for empty arrays; returns sum of all for ≤3 judges (no drops).
 */
export function stylePoints(judges: number[]): number {
  if (judges.length === 0) return 0
  if (judges.length <= 3) return judges.reduce((s, j) => s + j, 0)

  const sorted = [...judges].sort((a, b) => a - b)
  // Drop lowest (index 0) and highest (last index)
  const middle = sorted.slice(1, sorted.length - 1)
  // For exactly 5 judges: keep middle 3
  const keep = middle.slice(0, 3)
  return keep.reduce((s, j) => s + j, 0)
}

/**
 * Wind compensation points.
 * compensation = windSpeed * windFactor + windGatePoints
 * A positive (headwind) result is a bonus subtracted from the total when applied.
 * Returned raw — caller decides sign convention in totalJumpPoints.
 */
export function windCompensation(
  windSpeed: number,
  windFactor: number,
  windGatePoints: number,
): number {
  return windSpeed * windFactor + windGatePoints
}

/**
 * Gate compensation points.
 * Each gate difference from the neutral gate is worth gatePoints.
 */
export function gateCompensation(gates: number, gatePoints: number): number {
  return gates * gatePoints
}

/**
 * Total jump score: distance points + style points + wind comp + gate comp.
 */
export function totalJumpPoints(
  distance: number,
  kPoint: number,
  style: number,
  windComp: number,
  gateComp: number,
): number {
  return distancePoints(distance, kPoint) + style + windComp + gateComp
}

/**
 * Hill record: the maximum distance in the jumps array.
 * Returns 0 for an empty array.
 */
export function hillRecord(jumps: number[]): number {
  if (jumps.length === 0) return 0
  return Math.max(...jumps)
}

// ---------------------------------------------------------------------------
// 4. Biathlon
// ---------------------------------------------------------------------------

/**
 * Shooting accuracy as a ratio (0–1).
 * Returns 0 when shots is 0.
 */
export function shootingAccuracy(hits: number, shots: number): number {
  if (shots === 0) return 0
  return hits / shots
}

/**
 * Total penalty loop time in seconds.
 * Default 60 seconds per miss (IBU standard).
 */
export function penaltyLoop(misses: number, loopTimeSec: number = 60): number {
  return misses * loopTimeSec
}

/**
 * Adjusted race time: ski time plus penalty time for each miss.
 * Default penalty is 60 seconds per miss.
 */
export function adjustedTime(skiTime: number, misses: number, penaltyPerMiss: number = 60): number {
  return skiTime + misses * penaltyPerMiss
}

export interface BiathlonPositionAccuracy {
  standing: number
  prone: number
  overall: number
}

/**
 * Shooting accuracy broken down by position plus overall.
 * Each sub-accuracy is a ratio (0–1); 0 when shots is 0.
 */
export function standingVsProne(
  standingHits: number,
  standingShots: number,
  proneHits: number,
  proneShots: number,
): BiathlonPositionAccuracy {
  const standing = standingShots === 0 ? 0 : standingHits / standingShots
  const prone = proneShots === 0 ? 0 : proneHits / proneShots
  const totalShots = standingShots + proneShots
  const overall = totalShots === 0 ? 0 : (standingHits + proneHits) / totalShots
  return { standing, prone, overall }
}

/**
 * Total relay team time: sum of all team member times.
 */
export function relayHandicap(teamTimes: number[]): number {
  return teamTimes.reduce((sum, t) => sum + t, 0)
}

// ---------------------------------------------------------------------------
// 5. Snowboarding / Freestyle
// ---------------------------------------------------------------------------

/**
 * Halfpipe score: best (highest) of multiple runs.
 * Returns 0 for an empty array.
 */
export function halfpipeScore(runs: number[]): number {
  if (runs.length === 0) return 0
  return Math.max(...runs)
}

/**
 * Slopestyle score.
 * If runs (array of judge arrays) is provided, the best run wins where
 * each run score = average of its judges. If only judges (flat array)
 * is provided, returns their average.
 */
export function slopestyleScore(judges: number[], runs?: number[][]): number {
  if (runs !== undefined && runs.length > 0) {
    let best = -Infinity
    for (const run of runs) {
      if (run.length === 0) continue
      const avg = run.reduce((s, j) => s + j, 0) / run.length
      if (avg > best) best = avg
    }
    return best === -Infinity ? 0 : best
  }
  if (judges.length === 0) return 0
  return judges.reduce((s, j) => s + j, 0) / judges.length
}

/**
 * Big Air score: sum of three judges.
 */
export function bigAirScore(judge1: number, judge2: number, judge3: number): number {
  return judge1 + judge2 + judge3
}

/**
 * Snowboardcross placing: 1-based rank array for finish times.
 * Ties share the lower (better) rank.
 */
export function snowboardcrossPlacing(finishTimes: number[]): number[] {
  return finishTimes.map(t => {
    let rank = 1
    for (const other of finishTimes) {
      if (other < t) rank++
    }
    return rank
  })
}

/**
 * Trick difficulty score.
 * score = (rotationDegrees / 360) * 5 + grabs * 1.5 + spins * 0.5
 */
export function trickDifficulty(rotationDegrees: number, grabs: number, spins: number): number {
  return (rotationDegrees / 360) * 5 + grabs * 1.5 + spins * 0.5
}

// ---------------------------------------------------------------------------
// 6. Speed skating
// ---------------------------------------------------------------------------

/**
 * Normalise any distance/time to a 500 m pace equivalent.
 * Returns 0 when distanceM is 0.
 */
export function fiveHundredMEquivalent(distanceM: number, timeSec: number): number {
  if (distanceM === 0) return 0
  return (500 / distanceM) * timeSec
}

/**
 * Seconds per lap.
 * Default lap length = 400 m.
 * Returns 0 when laps is 0.
 */
export function skatingPacePerLap(timeSec: number, laps: number, _lapLengthM: number = 400): number {
  if (laps === 0) return 0
  return timeSec / laps
}

/**
 * Signed gap between two team pursuit times: team2Time - team1Time.
 * Positive = team1 is faster.
 */
export function teamPursuitGap(team1Time: number, team2Time: number): number {
  return team2Time - team1Time
}

/**
 * Short track penalty.
 * DQ → Infinity; false start → 0 (warning; no time penalty on first offence).
 */
export function shortTrackPenalty(disqualified: boolean, falseStart: boolean): number {
  if (disqualified) return Infinity
  if (falseStart) return 0
  return 0
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Skiing)
// ---------------------------------------------------------------------------

export type SkiingDiscipline =
  | 'slalom'
  | 'gs'
  | 'sg'
  | 'downhill'
  | 'combined'
  | 'jumping'
  | 'crosscountry'

export interface DKSkiingResult {
  place: number
  discipline: SkiingDiscipline
  dnf: boolean
  worldCupPoints: number
}

/**
 * DraftKings skiing fantasy points for a single result.
 * Place points: 1st=40, 2nd=35, 3rd=30, 4th=25, 5th=20, 6th=15, 7th-10th=10,
 *               11–20th=5, else=1
 * DNF penalty: -10
 * Bonus: +0.1 per World Cup point (capped at 20 bonus points = 200 WC pts)
 */
export function dkSkiingPoints(result: DKSkiingResult): number {
  const { place, dnf, worldCupPoints: wcpts } = result

  let base: number
  if (place === 1) base = 40
  else if (place === 2) base = 35
  else if (place === 3) base = 30
  else if (place === 4) base = 25
  else if (place === 5) base = 20
  else if (place === 6) base = 15
  else if (place >= 7 && place <= 10) base = 10
  else if (place >= 11 && place <= 20) base = 5
  else base = 1

  const dnfPenalty = dnf ? -10 : 0
  const wcBonus = Math.min(wcpts * 0.1, 20)

  return base + dnfPenalty + wcBonus
}

/**
 * DraftKings projected skiing score.
 * Weighted average of recent results: most recent = 3×, all others = 1×.
 * Returns 0 for an empty array.
 */
export function dkProjection(recentResults: DKSkiingResult[]): number {
  if (recentResults.length === 0) return 0

  const points = recentResults.map(r => dkSkiingPoints(r))

  // Most recent result is the last element in the array
  const mostRecentIdx = recentResults.length - 1
  let weightedSum = 0
  let totalWeight = 0

  for (let i = 0; i < points.length; i++) {
    const weight = i === mostRecentIdx ? 3 : 1
    weightedSum += (points[i] ?? 0) * weight
    totalWeight += weight
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}
