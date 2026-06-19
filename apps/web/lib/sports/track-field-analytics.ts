/**
 * track-field-analytics.ts
 * Pure TypeScript track & field analytics library — no external dependencies.
 * All times are in seconds throughout unless noted.
 */

// ---------------------------------------------------------------------------
// 1. Sprint analytics
// ---------------------------------------------------------------------------

/**
 * Returns true if the wind speed is legal for record purposes.
 * Legal if windSpeed <= +2.0 m/s (positive = tailwind).
 */
export function windLegalSprint(windSpeed: number): boolean {
  return windSpeed <= 2.0
}

/**
 * Classifies a reaction time.
 * <100ms = false_start, >300ms = slow, else valid.
 * Input in milliseconds.
 */
export function reactionTime(ms: number): 'valid' | 'false_start' | 'slow' {
  if (ms < 100) return 'false_start'
  if (ms > 300) return 'slow'
  return 'valid'
}

/**
 * Computes per-split and cumulative times for a sprint.
 * Assumes 10m splits by default (splitDistance parameter).
 * pace = splitDistance / splitTime (m/s).
 */
export function sprintSplitTimes(
  splits: number[],
  splitDistance: number = 10,
): { split: number; cumulative: number; pace: number }[] {
  const result: { split: number; cumulative: number; pace: number }[] = []
  let cumulative = 0
  for (const s of splits) {
    cumulative += s
    const pace = s > 0 ? splitDistance / s : 0
    result.push({ split: s, cumulative, pace })
  }
  return result
}

/**
 * Distance in meters where athlete reaches >95% of peak velocity.
 * Peak velocity = fastest pace (splitDistance / fastestSplitTime).
 * Returns the cumulative distance at end of the split that first exceeds the threshold.
 * Returns 0 if splits is empty.
 */
export function accelerationPhase(splits: number[], splitDistance: number = 10): number {
  if (splits.length === 0) return 0

  // Find fastest (minimum) split time
  let fastestSplit = Infinity
  for (const s of splits) {
    if (s < fastestSplit) fastestSplit = s
  }
  if (fastestSplit === Infinity || fastestSplit === 0) return 0

  const peakVelocity = splitDistance / fastestSplit
  const threshold = 0.95 * peakVelocity

  let cumDistance = 0
  for (const s of splits) {
    cumDistance += splitDistance
    const velocity = s > 0 ? splitDistance / s : 0
    if (velocity > threshold) return cumDistance
  }
  return cumDistance
}

/**
 * Meters of exchange zone remaining after both athletes complete the exchange.
 * exchangeZone defaults to 20m.
 * Uses speeds to estimate where in the zone the baton was passed.
 * Returns positive if completed in zone (meters remaining).
 */
export function relayExchangeWindow(
  leg1Time: number,
  leg2Time: number,
  exchangeZone: number = 20,
): number {
  // Positive result = completed within zone; negative = out of zone
  // Simplified model: ratio of zone consumed
  const totalTime = leg1Time + leg2Time
  if (totalTime === 0) return exchangeZone
  const zoneFraction = leg2Time / totalTime
  return exchangeZone * (1 - zoneFraction)
}

// ---------------------------------------------------------------------------
// 2. Distance/endurance events
// ---------------------------------------------------------------------------

/**
 * Pace in seconds per km.
 * Returns 0 if distanceKm is 0.
 */
export function pacePerKm(totalSeconds: number, distanceKm: number): number {
  if (distanceKm === 0) return 0
  return totalSeconds / distanceKm
}

/**
 * Pace in seconds per mile.
 * Returns 0 if distanceMiles is 0.
 */
export function pacePerMile(totalSeconds: number, distanceMiles: number): number {
  if (distanceMiles === 0) return 0
  return totalSeconds / distanceMiles
}

/**
 * Riegel prediction formula: T2 = T1 * (D2/D1)^e
 * Default exponent e = 1.06.
 * Returns 0 if knownDistance is 0.
 */
export function riegelPrediction(
  knownTime: number,
  knownDistance: number,
  targetDistance: number,
  exponent: number = 1.06,
): number {
  if (knownDistance === 0) return 0
  return knownTime * Math.pow(targetDistance / knownDistance, exponent)
}

/**
 * Cameron formula — approximate time limit using power law.
 * T = worldRecordSeconds * (distanceMeters / 1000)^1.06
 * Approximation of Cameron's speed-endurance model.
 * Returns 0 if distanceMeters is 0.
 */
export function cameronFormula(distanceMeters: number, worldRecordSeconds: number): number {
  if (distanceMeters === 0) return 0
  return worldRecordSeconds * Math.pow(distanceMeters / 1000, 1.06)
}

/**
 * Approximate lactate threshold pace.
 * Uses 0.88 factor applied to race pace (seconds per km).
 * Returns 0 if raceDistanceKm is 0.
 */
export function lactateThresholdPace(raceTimeSec: number, raceDistanceKm: number): number {
  if (raceDistanceKm === 0) return 0
  const racePace = raceTimeSec / raceDistanceKm
  return racePace / 0.88
}

/**
 * Simplified VO2max estimate.
 * VO2max ≈ (distanceMeters / timeSeconds) * 0.2 + 3.5
 * Returns 3.5 if timeSeconds is 0.
 */
export function vo2maxEstimate(distanceMeters: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 3.5
  return (distanceMeters / timeSeconds) * 0.2 + 3.5
}

// ---------------------------------------------------------------------------
// 3. Field events — jumps
// ---------------------------------------------------------------------------

/**
 * IAAF scoring formula helper (field events): points = A * (P - B)^C
 * Returns 0 if result would be negative or P <= B.
 */
function iaafFieldScore(A: number, B: number, C: number, P: number): number {
  if (P <= B) return 0
  return Math.floor(A * Math.pow(P - B, C))
}

/**
 * IAAF scoring formula helper (track events): points = A * (B - P)^C
 * Returns 0 if result would be negative or P >= B.
 */
function iaafTrackScore(A: number, B: number, C: number, P: number): number {
  if (P >= B) return 0
  return Math.floor(A * Math.pow(B - P, C))
}

/**
 * Long jump IAAF scoring.
 * Wind-illegal if windSpeed > 2.0 m/s.
 * IAAF constants: A=0.14354, B=220, C=1.40; P = distance in cm.
 */
export function longJumpScore(
  distanceMeters: number,
  windSpeed: number,
): { distance: number; windLegal: boolean; iaafPoints: number } {
  const windLegal = windSpeed <= 2.0
  const P = distanceMeters * 100
  const iaafPoints = iaafFieldScore(0.14354, 220, 1.4, P)
  return { distance: distanceMeters, windLegal, iaafPoints }
}

/**
 * High jump IAAF scoring.
 * IAAF constants: A=0.8465, B=75, C=1.42; P = height in cm.
 */
export function highJumpScore(heightMeters: number): number {
  const P = heightMeters * 100
  return iaafFieldScore(0.8465, 75, 1.42, P)
}

/**
 * Triple jump IAAF scoring.
 * Wind-illegal if windSpeed > 2.0 m/s.
 * IAAF constants: A=0.14354, B=300, C=1.40; P = distance in cm.
 */
export function tripleJumpScore(
  distanceMeters: number,
  windSpeed: number,
): { distance: number; windLegal: boolean; iaafPoints: number } {
  const windLegal = windSpeed <= 2.0
  const P = distanceMeters * 100
  const iaafPoints = iaafFieldScore(0.14354, 300, 1.4, P)
  return { distance: distanceMeters, windLegal, iaafPoints }
}

/**
 * Pole vault IAAF scoring.
 * IAAF constants: A=0.2797, B=100, C=1.35; P = height in cm.
 */
export function poleVaultScore(heightMeters: number): number {
  const P = heightMeters * 100
  return iaafFieldScore(0.2797, 100, 1.35, P)
}

// ---------------------------------------------------------------------------
// 4. Field events — throws
// ---------------------------------------------------------------------------

/**
 * Shot put IAAF scoring (men).
 * IAAF constants: A=51.39, B=1.5, C=1.05; P = distance in meters.
 */
export function shotPutScore(distanceMeters: number): number {
  return iaafFieldScore(51.39, 1.5, 1.05, distanceMeters)
}

/**
 * Discus IAAF scoring (men).
 * IAAF constants: A=12.91, B=4.0, C=1.10; P = distance in meters.
 */
export function discusScore(distanceMeters: number): number {
  return iaafFieldScore(12.91, 4.0, 1.1, distanceMeters)
}

/**
 * Hammer IAAF scoring (men).
 * IAAF constants: A=14.16, B=7.0, C=1.10; P = distance in meters.
 */
export function hammerScore(distanceMeters: number): number {
  return iaafFieldScore(14.16, 7.0, 1.1, distanceMeters)
}

/**
 * Javelin IAAF scoring (men).
 * IAAF constants: A=10.14, B=7.0, C=1.08; P = distance in meters.
 */
export function javelinScore(distanceMeters: number): number {
  return iaafFieldScore(10.14, 7.0, 1.08, distanceMeters)
}

// ---------------------------------------------------------------------------
// 5. Decathlon/Heptathlon scoring
// ---------------------------------------------------------------------------

type DecathlonEvent =
  | '100m'
  | '400m'
  | '110mH'
  | '1500m'
  | 'LJ'
  | 'SP'
  | 'HJ'
  | 'PV'
  | 'DT'
  | 'JT'

type HeptathlonEvent = '100mH' | 'HJ' | 'SP' | '200m' | 'LJ' | 'JT' | '800m'

// IAAF decathlon scoring constants [A, B, C]
// Track events: points = floor(A * (B - P)^C)
// Field events: points = floor(A * (P - B)^C)
const DECATHLON_CONSTANTS: Record<DecathlonEvent, [number, number, number, 'track' | 'field']> = {
  '100m': [25.4347, 18, 1.81, 'track'],
  '400m': [1.53775, 82, 1.81, 'track'],
  '110mH': [5.74352, 28.5, 1.92, 'track'],
  '1500m': [0.03768, 480, 1.85, 'track'],
  LJ: [0.14354, 220, 1.4, 'field'],
  SP: [51.39, 1.5, 1.05, 'field'],
  HJ: [0.8465, 75, 1.42, 'field'],
  PV: [0.2797, 100, 1.35, 'field'],
  DT: [12.91, 4.0, 1.1, 'field'],
  JT: [10.14, 7.0, 1.08, 'field'],
}

// IAAF heptathlon scoring constants [A, B, C]
const HEPTATHLON_CONSTANTS: Record<HeptathlonEvent, [number, number, number, 'track' | 'field']> =
  {
    '100mH': [9.23076, 26.7, 1.835, 'track'],
    HJ: [1.84523, 75, 1.348, 'field'],
    SP: [56.0211, 1.5, 1.05, 'field'],
    '200m': [4.99087, 42.5, 1.81, 'track'],
    LJ: [0.188807, 210, 1.41, 'field'],
    JT: [15.9803, 3.8, 1.04, 'field'],
    '800m': [0.11193, 254, 1.88, 'track'],
  }

/**
 * Compute IAAF decathlon event score.
 * Time events (100m, 400m, 110mH, 1500m): performance in seconds.
 * Field events (LJ in cm, HJ in cm, PV in cm; SP/DT/JT in meters).
 * LJ/HJ/PV: P in cm (performance * 100 for LJ, HJ, PV if given in meters — caller handles units).
 * For consistency with IAAF tables: LJ/HJ/PV take cm; SP/DT/JT take meters.
 */
export function decathlonEventScore(event: string, performance: number): number {
  const constants = DECATHLON_CONSTANTS[event as DecathlonEvent]
  if (constants === undefined) return 0
  const [A, B, C, type] = constants
  if (type === 'track') {
    return iaafTrackScore(A, B, C, performance)
  }
  return iaafFieldScore(A, B, C, performance)
}

/**
 * Sum decathlon scores for all 10 events from a performances map.
 * Keys: '100m', 'LJ', 'SP', 'HJ', '400m', '110mH', 'DT', 'PV', 'JT', '1500m'
 */
export function decathlonTotal(performances: Record<string, number>): number {
  const events: DecathlonEvent[] = ['100m', 'LJ', 'SP', 'HJ', '400m', '110mH', 'DT', 'PV', 'JT', '1500m']
  let total = 0
  for (const event of events) {
    const p = performances[event] ?? 0
    total += decathlonEventScore(event, p)
  }
  return total
}

/**
 * Compute IAAF heptathlon event score.
 * Time events: performance in seconds.
 * HJ: cm. LJ: cm. SP/JT: meters.
 */
export function heptatlonEventScore(event: string, performance: number): number {
  const constants = HEPTATHLON_CONSTANTS[event as HeptathlonEvent]
  if (constants === undefined) return 0
  const [A, B, C, type] = constants
  if (type === 'track') {
    return iaafTrackScore(A, B, C, performance)
  }
  return iaafFieldScore(A, B, C, performance)
}

/**
 * Sum heptathlon scores for all 7 events from a performances map.
 * Keys: '100mH', 'HJ', 'SP', '200m', 'LJ', 'JT', '800m'
 */
export function heptatlonTotal(performances: Record<string, number>): number {
  const events: HeptathlonEvent[] = ['100mH', 'HJ', 'SP', '200m', 'LJ', 'JT', '800m']
  let total = 0
  for (const event of events) {
    const p = performances[event] ?? 0
    total += heptatlonEventScore(event, p)
  }
  return total
}

// ---------------------------------------------------------------------------
// 6. Performance tracking
// ---------------------------------------------------------------------------

/**
 * Personal best: minimum for time events, maximum for distance events.
 * Default eventType = 'time'.
 * Returns Infinity (time) or -Infinity (distance) if empty.
 */
export function personalBest(
  performances: number[],
  eventType: 'time' | 'distance' = 'time',
): number {
  if (performances.length === 0) return eventType === 'time' ? Infinity : -Infinity
  if (eventType === 'time') return Math.min(...performances)
  return Math.max(...performances)
}

/**
 * Season best: best performance in the given year.
 * Returns Infinity (time) or -Infinity (distance) if no performances in that season.
 */
export function seasonBest(
  performances: { date: string; value: number }[],
  season: number,
  eventType: 'time' | 'distance' = 'time',
): number {
  const inSeason = performances.filter(p => {
    const year = new Date(p.date).getFullYear()
    return year === season
  })
  if (inSeason.length === 0) return eventType === 'time' ? Infinity : -Infinity
  const values = inSeason.map(p => p.value)
  return eventType === 'time' ? Math.min(...values) : Math.max(...values)
}

/**
 * Performance trend via linear regression slope.
 * improving: slope < -0.01 for time (getting faster), slope > 0.01 for distance.
 * declining: slope > 0.01 for time (getting slower), slope < -0.01 for distance.
 * stable otherwise.
 * Returns 'stable' for empty or single-element arrays.
 */
export function performanceTrend(
  performances: number[],
  eventType: 'time' | 'distance' = 'time',
): 'improving' | 'declining' | 'stable' {
  if (performances.length < 2) return 'stable'

  const n = performances.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    const x = i
    const y = performances[i] ?? 0
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return 'stable'
  const slope = (n * sumXY - sumX * sumY) / denom

  if (eventType === 'time') {
    if (slope < -0.01) return 'improving'
    if (slope > 0.01) return 'declining'
  } else {
    if (slope > 0.01) return 'improving'
    if (slope < -0.01) return 'declining'
  }
  return 'stable'
}

/**
 * Percentile rank 0–100 of myPerformance among peerPerformances.
 * For time: lower is better. For distance: higher is better.
 * Returns 100 if no peers.
 */
export function rankAmongPeers(
  myPerformance: number,
  peerPerformances: number[],
  eventType: 'time' | 'distance' = 'time',
): number {
  if (peerPerformances.length === 0) return 100

  let countBetter: number
  if (eventType === 'time') {
    // Lower time is better; peers with higher time are "worse"
    countBetter = peerPerformances.filter(p => p > myPerformance).length
  } else {
    // Higher distance is better; peers with lower distance are "worse"
    countBetter = peerPerformances.filter(p => p < myPerformance).length
  }

  return (countBetter / peerPerformances.length) * 100
}

/**
 * World ranking points: ratio relative to world leading performance * 1000, capped at 1000.
 * For time: lead/mine * 1000.
 * For distance: mine/lead * 1000.
 * Returns 0 if own performance is 0.
 */
export function worldRankingPoints(
  performance: number,
  worldLeadingPerformance: number,
  eventType: 'time' | 'distance' = 'time',
): number {
  if (performance === 0) return 0
  if (worldLeadingPerformance === 0) return 0

  let ratio: number
  if (eventType === 'time') {
    ratio = worldLeadingPerformance / performance
  } else {
    ratio = performance / worldLeadingPerformance
  }

  return Math.min(1000, ratio * 1000)
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Track & Field)
// ---------------------------------------------------------------------------

const DK_PLACE_POINTS: Record<number, number> = {
  1: 10,
  2: 8,
  3: 7,
  4: 6,
  5: 5,
  6: 4,
  7: 3,
  8: 2,
}

/**
 * DraftKings fantasy points for track & field.
 * Place points: 1st=10, 2nd=8, 3rd=7, 4th=6, 5th=5, 6th=4, 7th=3, 8th=2, other=0.5
 * PB bonus: +3. SB bonus: +1.
 */
export function dkFantasyPoints(
  results: { event: string; place: number; personalBest: boolean; seasonBest: boolean }[],
): number {
  let total = 0
  for (const result of results) {
    const basePts = DK_PLACE_POINTS[result.place] ?? 0.5
    let bonus = 0
    if (result.personalBest) bonus += 3
    if (result.seasonBest) bonus += 1
    total += basePts + bonus
  }
  return total
}

/**
 * DraftKings projected points — average DK points across recent results.
 * Each result is treated as a single-event entry.
 * Returns 0 if no results.
 */
export function dkProjection(
  recentResults: { place: number; personalBest: boolean; seasonBest: boolean }[],
): number {
  if (recentResults.length === 0) return 0

  // Map each result to a single-event dkFantasyPoints call
  const points = recentResults.map(r =>
    dkFantasyPoints([{ event: 'generic', place: r.place, personalBest: r.personalBest, seasonBest: r.seasonBest }]),
  )

  const total = points.reduce((sum, p) => sum + p, 0)
  return total / points.length
}
