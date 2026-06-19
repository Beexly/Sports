/**
 * rowing-analytics.ts
 * Pure TypeScript rowing, canoe/kayak, sailing, and ergometer analytics library.
 * Zero external dependencies — Node built-ins only.
 * All times are in seconds throughout unless otherwise noted.
 */

// ---------------------------------------------------------------------------
// 1. Rowing race analytics
// ---------------------------------------------------------------------------

/**
 * Seconds per meter pace.
 * Returns 0 if distanceMeters === 0.
 */
export function splitPacePerMeter(totalTimeSeconds: number, distanceMeters: number): number {
  if (distanceMeters === 0) return 0
  return totalTimeSeconds / distanceMeters
}

/**
 * Normalize a split time over a given distance to 500m pace.
 * Returns 0 if splitDistanceM === 0.
 */
export function split500mPace(splitTimeSeconds: number, splitDistanceM: number): number {
  if (splitDistanceM === 0) return 0
  return (splitTimeSeconds / splitDistanceM) * 500
}

/**
 * Arithmetic mean of split times.
 * Returns 0 if splits array is empty.
 */
export function averageSplitTimes(splits: number[]): number {
  if (splits.length === 0) return 0
  return splits.reduce((sum, t) => sum + t, 0) / splits.length
}

/**
 * Classify stroke rate (strokes per minute).
 */
export function strokeRate(strokesPerMinute: number): 'low' | 'moderate' | 'high' | 'sprint' {
  if (strokesPerMinute < 24) return 'low'
  if (strokesPerMinute <= 28) return 'moderate'
  if (strokesPerMinute <= 34) return 'high'
  return 'sprint'
}

/**
 * Distance per stroke (DPS).
 * Returns 0 if totalStrokes === 0.
 */
export function distancePerStroke(totalDistance: number, totalStrokes: number): number {
  if (totalStrokes === 0) return 0
  return totalDistance / totalStrokes
}

/**
 * Power per stroke in joules.
 * Returns 0 if spm === 0.
 */
export function powerPerStroke(watts: number, spm: number): number {
  if (spm === 0) return 0
  return watts / (spm / 60)
}

/**
 * Absolute time difference between two race times.
 */
export function raceMarginSeconds(time1: number, time2: number): number {
  return Math.abs(time1 - time2)
}

/**
 * Convert margin in meters to boat lengths.
 * Default boatLength is 8.23m (standard shell).
 */
export function raceMarginLengths(marginM: number, boatLength = 8.23): number {
  if (boatLength === 0) return 0
  return marginM / boatLength
}

// ---------------------------------------------------------------------------
// 2. Boat classes and crews
// ---------------------------------------------------------------------------

export interface BoatClassInfo {
  sweep: boolean
  sculling: boolean
  coxed: boolean
  seats: number
}

const BOAT_CLASS_MAP: Record<string, BoatClassInfo> = {
  M1x:  { sweep: false, sculling: true,  coxed: false, seats: 1 },
  W1x:  { sweep: false, sculling: true,  coxed: false, seats: 1 },
  M2x:  { sweep: false, sculling: true,  coxed: false, seats: 2 },
  W2x:  { sweep: false, sculling: true,  coxed: false, seats: 2 },
  M4x:  { sweep: false, sculling: true,  coxed: false, seats: 4 },
  W4x:  { sweep: false, sculling: true,  coxed: false, seats: 4 },
  'M2-': { sweep: true, sculling: false, coxed: false, seats: 2 },
  'W2-': { sweep: true, sculling: false, coxed: false, seats: 2 },
  'M4-': { sweep: true, sculling: false, coxed: false, seats: 4 },
  'W4-': { sweep: true, sculling: false, coxed: false, seats: 4 },
  'M4+': { sweep: true, sculling: false, coxed: true,  seats: 4 },
  'W4+': { sweep: true, sculling: false, coxed: true,  seats: 4 },
  'M8+': { sweep: true, sculling: false, coxed: true,  seats: 8 },
  'W8+': { sweep: true, sculling: false, coxed: true,  seats: 8 },
}

/**
 * Returns boat class information for a standard code, or null if unknown.
 */
export function boatClass(code: string): BoatClassInfo | null {
  return BOAT_CLASS_MAP[code] ?? null
}

/**
 * Sum of all crew member weights.
 */
export function crewWeight(weights: number[]): number {
  return weights.reduce((sum, w) => sum + w, 0)
}

/**
 * Check if a crew meets lightweight rowing rules.
 * Lightweight mens: avg ≤70kg, max individual ≤72.5kg.
 * Returns false if isLightweight is false/undefined.
 */
export function lightweightCheck(
  crewWeights: number[],
  coxWeight?: number,
  isLightweight?: boolean,
): boolean {
  if (!isLightweight) return false
  if (crewWeights.length === 0) return false

  const rowerWeights = crewWeights

  const avg = rowerWeights.reduce((s, w) => s + w, 0) / rowerWeights.length
  const maxIndividual = Math.max(...rowerWeights)

  return avg <= 70 && maxIndividual <= 72.5
}

/**
 * Handicap factor in seconds per 2000m relative to M8+.
 * M8+=0, M4+=5, M4-=10, M2-=15, M1x=25, others=20; 0 for unknown.
 */
export function handicapFactor(boatClassCode: string): number {
  const map: Record<string, number> = {
    'M8+': 0,
    'W8+': 0,
    'M4+': 5,
    'W4+': 5,
    'M4-': 10,
    'W4-': 10,
    'M2-': 15,
    'W2-': 15,
    M1x:  25,
    W1x:  25,
  }
  if (map[boatClassCode] !== undefined) return map[boatClassCode] ?? 0
  if (BOAT_CLASS_MAP[boatClassCode] !== undefined) return 20
  return 0
}

// ---------------------------------------------------------------------------
// 3. Ergometer (indoor rowing)
// ---------------------------------------------------------------------------

/**
 * Watts from 500m split time (seconds).
 * Concept2 formula: watts = 2.80 / (split500m)^3
 */
export function watts(split500m: number): number {
  if (split500m === 0) return 0
  return 2.80 / Math.pow(split500m, 3)
}

/**
 * 500m split from watts (reverse of watts()).
 * split = (2.80 / watts)^(1/3)
 */
export function splitFromWatts(wattsValue: number): number {
  if (wattsValue === 0) return 0
  return Math.pow(2.80 / wattsValue, 1 / 3)
}

/**
 * Riegel formula performance prediction.
 * T2 = T1 * (D2/D1)^k; default k=1.07 for rowing.
 */
export function predictedErg(
  known: { distance: number; timeSeconds: number },
  targetDistance: number,
  kFactor = 1.07,
): number {
  if (known.distance === 0) return 0
  return known.timeSeconds * Math.pow(targetDistance / known.distance, kFactor)
}

/**
 * Simplified VO2max estimate from 2000m erg time and bodyweight.
 * VO2max ≈ (10.7 - seconds/2000m * 0.6) * 1000 / weightKg; clamped ≥ 20.
 */
export function vo2maxErgEstimate(erg2000mTimeSeconds: number, weightKg: number): number {
  if (weightKg === 0) return 20
  const raw = (10.7 - (erg2000mTimeSeconds / 2000) * 0.6) * 1000 / weightKg
  return Math.max(20, raw)
}

/**
 * FISA age category.
 * <19 → "J", 19–22 → "U23", 23–26 → "Senior", >26 → "Open"
 */
export function categoryByAge(ageYears: number, gender: 'M' | 'F'): string {
  // gender is part of the API signature for future use (gendered categories)
  void gender
  if (ageYears < 19) return 'J'
  if (ageYears <= 22) return 'U23'
  if (ageYears <= 26) return 'Senior'
  return 'Open'
}

/**
 * Borg-like RPE from heart rate.
 * RPE = (%maxHR) * 20, clamped to [6, 20].
 */
export function ratingOfPerceivedExertion(heartRate: number, maxHR: number): number {
  if (maxHR === 0) return 6
  const pct = heartRate / maxHR
  return Math.min(20, Math.max(6, pct * 20))
}

// ---------------------------------------------------------------------------
// 4. Canoe/Kayak analytics
// ---------------------------------------------------------------------------

/**
 * Pace in seconds per kilometer.
 * Returns 0 if distanceM === 0.
 */
export function kayakSprintPacePerKm(timeSeconds: number, distanceM: number): number {
  if (distanceM === 0) return 0
  return (timeSeconds / distanceM) * 1000
}

/**
 * Average paddle rate in strokes per minute.
 * Returns 0 if timeSeconds === 0.
 */
export function averagePaddleRate(strokes: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0
  return (strokes / timeSeconds) * 60
}

/**
 * Time advantage of a C2 over a C1 (double boat advantage).
 * Returns C2 - C1.
 */
export function c1c2Difference(c1Time: number, c2Time: number): number {
  return c2Time - c1Time
}

/**
 * Total time penalty for slalom infringements.
 * Gate touch = 2s, missed gate = 50s.
 */
export function whiteWaterPenalty(gateTouches: number, missedGates: number): number {
  return gateTouches * 2 + missedGates * 50
}

/**
 * Adjusted slalom time: rawTime + penalties.
 */
export function slalomAdjustedTime(rawTime: number, penalties: number): number {
  return rawTime + penalties
}

/**
 * Simplified drag force on kayak hull (N).
 * F = 0.5 * density * frontalArea * Cd * v²
 * Defaults: frontalArea=0.06m², density=1000kg/m³, Cd=1.1
 */
export function dragCoefficient(
  velocity: number,
  frontalArea = 0.06,
  density = 1000,
): number {
  const Cd = 1.1
  return 0.5 * density * frontalArea * Cd * velocity * velocity
}

// ---------------------------------------------------------------------------
// 5. Sailing (competitive)
// ---------------------------------------------------------------------------

/**
 * Simplified boat speed from true wind speed and angle.
 * Upwind (<60°): 0.5*tws; reaching (60–120°): 0.85*tws; downwind (>120°): 0.75*tws.
 */
export function boatSpeed(
  trueWindSpeed: number,
  trueWindAngle: number,
  sailType = 'standard',
): number {
  void sailType
  if (trueWindAngle < 60) return trueWindSpeed * 0.5
  if (trueWindAngle <= 120) return trueWindSpeed * 0.85
  return trueWindSpeed * 0.75
}

/**
 * Velocity made good (VMG).
 * Upwind: boatSpeed * cos(angle_rad); downwind: boatSpeed * cos(π - angle_rad).
 */
export function vmg(boatSpeedKnots: number, windAngle: number): number {
  const rad = (windAngle * Math.PI) / 180
  if (windAngle <= 90) {
    // upwind
    return boatSpeedKnots * Math.cos(rad)
  }
  // downwind
  return boatSpeedKnots * Math.cos(Math.PI - rad)
}

/**
 * Minimum number of tacks required to reach a target bearing.
 * Default tackingAngle = 90°.
 */
export function tacksRequired(
  currentBearing: number,
  targetBearing: number,
  tackingAngle = 90,
): number {
  if (tackingAngle === 0) return 0
  const diff = Math.abs(((targetBearing - currentBearing + 540) % 360) - 180)
  return Math.ceil(diff / tackingAngle)
}

/**
 * Total penalty time in seconds.
 * Default: 360° turn = 20s equivalent per infringement.
 */
export function penaltyTime(infringements: number, penaltyPerInfringement = 20): number {
  return infringements * penaltyPerInfringement
}

/**
 * Low-point race scoring.
 * Finish positions map 1:1; DNS/DNF = boats+1.
 */
export function raceScore(boats: string[], finishOrder: string[]): Map<string, number> {
  const scores = new Map<string, number>()
  const dnScore = boats.length + 1

  for (const boat of boats) {
    const idx = finishOrder.indexOf(boat)
    scores.set(boat, idx === -1 ? dnScore : idx + 1)
  }
  return scores
}

// ---------------------------------------------------------------------------
// 6. Performance tracking
// ---------------------------------------------------------------------------

/**
 * Personal best time for an exact distance.
 * Returns Infinity if no matching distance found.
 */
export function pbOnDistance(
  times: { distanceM: number; timeSeconds: number }[],
  targetDistance: number,
): number {
  let best = Infinity
  for (const entry of times) {
    if (entry.distanceM === targetDistance && entry.timeSeconds < best) {
      best = entry.timeSeconds
    }
  }
  return best
}

/**
 * Percentage improvement from first to last performance.
 * For 'time': negative = faster (improvement). For 'power': positive.
 * Returns 0 if fewer than 2 performances.
 */
export function seasonProgress(performances: number[], eventType: 'time' | 'power' = 'time'): number {
  if (performances.length < 2) return 0
  const first = performances[0] ?? 0
  const last = performances[performances.length - 1] ?? 0
  if (first === 0) return 0
  if (eventType === 'time') {
    return ((last - first) / first) * 100
  }
  return ((last - first) / first) * 100
}

/**
 * Cross-training score: intensity-weighted hours ratio.
 * Returns 0 if empty.
 */
export function crossTrainingScore(
  sports: { sport: string; hours: number; intensity: number }[],
): number {
  if (sports.length === 0) return 0
  const totalHours = sports.reduce((sum, s) => sum + s.hours, 0)
  if (totalHours === 0) return 0
  const weightedSum = sports.reduce((sum, s) => sum + s.intensity * s.hours, 0)
  return weightedSum / totalHours
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Rowing)
// ---------------------------------------------------------------------------

export interface DKRowingResult {
  place: number
  distance: 'sprint_200' | '500' | '1000' | '2000'
  boatClass: string
  medalRound: boolean
}

const PLACE_POINTS: Record<number, number> = {
  1: 50,
  2: 40,
  3: 30,
  4: 20,
  5: 15,
  6: 10,
}

/**
 * DraftKings rowing fantasy points for a single result.
 * Place bonuses: 1st=50, 2nd=40, 3rd=30, 4th=20, 5th=15, 6th=10, else=2.
 * Medal round bonus: +10; 2000m bonus: +5; single scull bonus: +5.
 */
export function dkRowingPoints(result: DKRowingResult): number {
  let pts = PLACE_POINTS[result.place] ?? 2
  if (result.medalRound) pts += 10
  if (result.distance === '2000') pts += 5
  if (result.boatClass === 'M1x' || result.boatClass === 'W1x') pts += 5
  return pts
}

/**
 * Weighted average DK projection; most recent result counts 3x.
 * Returns 0 if empty.
 */
export function dkProjection(recentResults: DKRowingResult[]): number {
  if (recentResults.length === 0) return 0
  if (recentResults.length === 1) {
    return dkRowingPoints(recentResults[0] ?? { place: 99, distance: '500', boatClass: '', medalRound: false })
  }

  const last = recentResults[recentResults.length - 1]
  const lastPts = dkRowingPoints(
    last ?? { place: 99, distance: '500', boatClass: '', medalRound: false },
  )

  const others = recentResults.slice(0, recentResults.length - 1)
  const otherSum = others.reduce((sum, r) => sum + dkRowingPoints(r), 0)
  const totalWeight = 3 + others.length

  return (lastPts * 3 + otherSum) / totalWeight
}
