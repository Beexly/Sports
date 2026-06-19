/**
 * triathlon-analytics.ts
 * Pure TypeScript triathlon analytics library — no external dependencies.
 *
 * Covers swim / bike / run legs plus transitions (T1, T2):
 *   1. Race totals & splits
 *   2. Discipline-specific pacing & physics
 *   3. Format detection (sprint / olympic / 70.3 / ironman)
 *   4. Performance ratios
 *   5. Fitness estimates
 *   6. Race strategy
 *   7. DraftKings-style fantasy scoring
 */

// ---------------------------------------------------------------------------
// 1. Race totals & splits
// ---------------------------------------------------------------------------

/**
 * Total race time = swim + T1 + bike + T2 + run (all in seconds).
 */
export function totalTime(
  swim: number,
  t1: number,
  bike: number,
  t2: number,
  run: number,
): number {
  return swim + t1 + bike + t2 + run
}

/**
 * Percentage of total *moving* time (swim + bike + run, transitions excluded)
 * spent in each discipline. Each value is a fraction in [0, 1].
 * Returns all zeros if moving time is zero.
 */
export function splitPercentages(
  swim: number,
  bike: number,
  run: number,
): { swim: number; bike: number; run: number } {
  const moving = swim + bike + run
  if (moving <= 0) {
    return { swim: 0, bike: 0, run: 0 }
  }
  return {
    swim: swim / moving,
    bike: bike / moving,
    run: run / moving,
  }
}

/**
 * Combined transition time = T1 + T2 (seconds).
 */
export function transitionTime(t1: number, t2: number): number {
  return t1 + t2
}

/**
 * Pace in seconds per meter. Returns 0 if distance is 0 (avoid divide-by-zero).
 */
export function legPace(distanceM: number, timeSec: number): number {
  if (distanceM <= 0) return 0
  return timeSec / distanceM
}

/**
 * Riegel endurance model: predict time over `toDist` given a known time over
 * `fromDist`. predicted = time * (toDist / fromDist) ^ k. Default k = 1.06.
 * Returns 0 if fromDist is 0.
 */
export function normalizeToDistance(
  timeSec: number,
  fromDist: number,
  toDist: number,
  riegelK: number = 1.06,
): number {
  if (fromDist <= 0) return 0
  return timeSec * Math.pow(toDist / fromDist, riegelK)
}

// ---------------------------------------------------------------------------
// 2. Discipline-specific pacing & physics
// ---------------------------------------------------------------------------

/**
 * Swim pace in seconds per 100m. Returns 0 if distance is 0.
 */
export function swimPacePer100m(timeSec: number, distanceM: number): number {
  if (distanceM <= 0) return 0
  return (timeSec / distanceM) * 100
}

/**
 * Bike speed in km/h. Returns 0 if time is 0.
 */
export function bikeSpeedKmh(distanceM: number, timeSec: number): number {
  if (timeSec <= 0) return 0
  const distanceKm = distanceM / 1000
  const hours = timeSec / 3600
  return distanceKm / hours
}

/**
 * Run pace in seconds per kilometer. Returns 0 if distance is 0.
 */
export function runPacePerKm(timeSec: number, distanceM: number): number {
  if (distanceM <= 0) return 0
  const km = distanceM / 1000
  return timeSec / km
}

/**
 * Approximate cycling power (watts) to hold a steady ground speed.
 * Sums three components:
 *   - aerodynamic drag:   0.5 * rho * CdA * v^3
 *   - rolling resistance: Crr * mass * g * v
 *   - gravity:            mass * g * gradient * v
 *
 * Defaults: cda=0.3 m², rho=1.225 kg/m³, crr=0.004, mass=75 kg, gradient=0.
 * `speedMs` is ground speed in m/s. Gradient is a rise/run fraction.
 * Negative results (steep descents) are clamped to 0.
 */
export function bikePower(
  speedMs: number,
  cda: number = 0.3,
  rho: number = 1.225,
  crr: number = 0.004,
  massKg: number = 75,
  gradient: number = 0,
): number {
  const g = 9.8067
  const aero = 0.5 * rho * cda * Math.pow(speedMs, 3)
  const rolling = crr * massKg * g * speedMs
  const gravity = massKg * g * gradient * speedMs
  const total = aero + rolling + gravity
  return total < 0 ? 0 : total
}

// ---------------------------------------------------------------------------
// 3. Format detection
// ---------------------------------------------------------------------------

interface TriFormatSpec {
  name: 'sprint' | 'olympic' | 'half-ironman' | 'ironman'
  swim: number
  bike: number
  run: number
}

const TRI_FORMATS: readonly TriFormatSpec[] = [
  { name: 'sprint', swim: 750, bike: 20000, run: 5000 },
  { name: 'olympic', swim: 1500, bike: 40000, run: 10000 },
  { name: 'half-ironman', swim: 1900, bike: 90000, run: 21100 },
  { name: 'ironman', swim: 3800, bike: 180000, run: 42200 },
]

const FORMAT_TOLERANCE = 0.15

function withinTolerance(actual: number, expected: number, tol: number): boolean {
  if (expected <= 0) return actual === 0
  const lower = expected * (1 - tol)
  const upper = expected * (1 + tol)
  return actual >= lower && actual <= upper
}

/**
 * Classify a triathlon by its three leg distances (meters), within ±15%.
 * All three legs must match the same format. Returns 'unknown' otherwise.
 */
export function triathlonFormat(
  swimM: number,
  bikeM: number,
  runM: number,
): 'sprint' | 'olympic' | 'half-ironman' | 'ironman' | 'unknown' {
  for (const spec of TRI_FORMATS) {
    if (
      withinTolerance(swimM, spec.swim, FORMAT_TOLERANCE) &&
      withinTolerance(bikeM, spec.bike, FORMAT_TOLERANCE) &&
      withinTolerance(runM, spec.run, FORMAT_TOLERANCE)
    ) {
      return spec.name
    }
  }
  return 'unknown'
}

// ---------------------------------------------------------------------------
// 4. Performance ratios
// ---------------------------------------------------------------------------

/**
 * Discipline balance = population standard deviation of the three placing
 * ranks. Lower = more balanced across swim/bike/run.
 */
export function swimBikeRunBalance(
  swimRank: number,
  bikeRank: number,
  runRank: number,
): number {
  const ranks = [swimRank, bikeRank, runRank]
  const mean = (swimRank + bikeRank + runRank) / 3
  const variance =
    ranks.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / ranks.length
  return Math.sqrt(variance)
}

/**
 * Strongest discipline = the one with the best (lowest) rank.
 * Ties resolve in swim → bike → run order.
 */
export function strongestDiscipline(
  swimRank: number,
  bikeRank: number,
  runRank: number,
): 'swim' | 'bike' | 'run' {
  if (swimRank <= bikeRank && swimRank <= runRank) return 'swim'
  if (bikeRank <= runRank) return 'bike'
  return 'run'
}

/**
 * Fade factor = (secondHalfPace - firstHalfPace) / firstHalfPace.
 * Positive means the athlete slowed down (pace got bigger). Negative means
 * a negative split. Returns 0 if firstHalfPace is 0.
 */
export function fadeFactor(firstHalfPace: number, secondHalfPace: number): number {
  if (firstHalfPace <= 0) return 0
  return (secondHalfPace - firstHalfPace) / firstHalfPace
}

/**
 * Transition efficiency = transitionTime / fieldAvgTransition.
 * < 1 means faster than the field average. Returns 0 if field avg is 0.
 */
export function transitionEfficiency(
  transitionTime: number,
  fieldAvgTransition: number,
): number {
  if (fieldAvgTransition <= 0) return 0
  return transitionTime / fieldAvgTransition
}

// ---------------------------------------------------------------------------
// 5. Fitness estimates
// ---------------------------------------------------------------------------

/**
 * Functional Threshold Power ≈ 95% of best 20-minute power.
 */
export function functionalThresholdPower(twentyMinPowerW: number): number {
  return twentyMinPowerW * 0.95
}

/**
 * Critical Swim Speed, expressed as pace in seconds per 100m.
 * Speed over the 200m differential = 200 / (t400 - t200) m/s.
 * Convert to sec/100m = 100 / speed.
 * Returns 0 if the time differential is non-positive.
 */
export function criticalSwimSpeed(time400: number, time200: number): number {
  const dt = time400 - time200
  if (dt <= 0) return 0
  const speedMs = 200 / dt
  if (speedMs <= 0) return 0
  return 100 / speedMs
}

/**
 * Running Training Stress Score = IF² * (duration / 3600) * 100.
 */
export function runningTSS(durationSec: number, intensityFactor: number): number {
  if (durationSec <= 0) return 0
  return Math.pow(intensityFactor, 2) * (durationSec / 3600) * 100
}

/**
 * Simplified VO2max estimate from a 5k time.
 * 5k velocity v (m/min) → VO2 = -4.6 + 0.182258*v + 0.000104*v².
 * Returns 0 for non-positive times.
 */
export function vo2maxEstimate(fiveKmTimeSec: number): number {
  if (fiveKmTimeSec <= 0) return 0
  const minutes = fiveKmTimeSec / 60
  const velocity = 5000 / minutes // meters per minute
  return -4.6 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2)
}

// ---------------------------------------------------------------------------
// 6. Race strategy
// ---------------------------------------------------------------------------

/**
 * Classify execution by comparing actual splits to planned splits.
 * Returns:
 *   - 'erratic'  if any split deviates from plan by more than 10%, with mixed
 *                directions, or if lengths/inputs are unusable
 *   - 'negative' if the back half was faster than the front half overall
 *   - 'positive' if the back half was slower
 *   - 'even'     if front and back halves are within 2% of each other
 */
export function pacingStrategy(
  plannedSplits: number[],
  actualSplits: number[],
): 'even' | 'positive' | 'negative' | 'erratic' {
  if (
    plannedSplits.length === 0 ||
    actualSplits.length === 0 ||
    plannedSplits.length !== actualSplits.length
  ) {
    return 'erratic'
  }

  // Per-split deviation directions relative to plan.
  let sawSlower = false
  let sawFaster = false
  for (let i = 0; i < plannedSplits.length; i++) {
    const planned = plannedSplits[i] ?? 0
    const actual = actualSplits[i] ?? 0
    if (planned <= 0) return 'erratic'
    const dev = (actual - planned) / planned
    if (dev > 0.1) sawSlower = true
    if (dev < -0.1) sawFaster = true
  }
  if (sawSlower && sawFaster) return 'erratic'

  // Compare actual front half vs back half by total time.
  const mid = Math.floor(actualSplits.length / 2)
  let frontSum = 0
  let frontCount = 0
  let backSum = 0
  let backCount = 0
  for (let i = 0; i < actualSplits.length; i++) {
    const v = actualSplits[i] ?? 0
    if (i < mid) {
      frontSum += v
      frontCount++
    } else if (i >= actualSplits.length - mid) {
      backSum += v
      backCount++
    }
  }
  if (frontCount === 0 || backCount === 0) {
    // Single split (or too few) — fall back to plan adherence.
    if (sawSlower) return 'positive'
    if (sawFaster) return 'negative'
    return 'even'
  }

  const frontAvg = frontSum / frontCount
  const backAvg = backSum / backCount
  if (frontAvg <= 0) return 'erratic'
  const delta = (backAvg - frontAvg) / frontAvg
  if (Math.abs(delta) <= 0.02) return 'even'
  return delta > 0 ? 'positive' : 'negative'
}

/**
 * Total carbohydrate grams to consume over the race duration.
 * Default fueling rate is 60 g/hr.
 */
export function nutritionWindow(
  durationSec: number,
  gramsPerHour: number = 60,
): number {
  if (durationSec <= 0) return 0
  return (durationSec / 3600) * gramsPerHour
}

/**
 * Seconds required to clear a legal drafting gap at a given speed (km/h).
 * Default draft zone is 12m. Returns 0 if speed is 0.
 */
export function draftingLegalGap(
  speedKmh: number,
  draftZoneM: number = 12,
): number {
  if (speedKmh <= 0) return 0
  const speedMs = (speedKmh * 1000) / 3600
  if (speedMs <= 0) return 0
  return draftZoneM / speedMs
}

/**
 * True if the second half was faster (smaller time) than the first half.
 */
export function negativeSplitAchieved(firstHalf: number, secondHalf: number): boolean {
  return secondHalf < firstHalf
}

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy scoring
// ---------------------------------------------------------------------------

export interface DkTriathlonResult {
  overallPlace: number
  swimPlace: number
  bikePlace: number
  runPlace: number
  fastestSplitBonus: boolean
  podium: boolean
}

/**
 * Base points from overall finishing place:
 *   1st = 50, 2nd = 40, 3rd = 32, places 4–10 scale linearly 25 → 10,
 *   anything else (>10) = 5.
 */
function placePoints(place: number): number {
  if (place <= 0) return 0
  if (place === 1) return 50
  if (place === 2) return 40
  if (place === 3) return 32
  if (place >= 4 && place <= 10) {
    // 4 → 25, 10 → 10, linear interpolation over 6 steps.
    const step = (25 - 10) / (10 - 4)
    return 25 - (place - 4) * step
  }
  return 5
}

/**
 * Total DraftKings-style fantasy points for a triathlon result.
 *   base (overall place) + 8 if fastestSplitBonus + 5 if podium.
 */
export function dkTriathlonPoints(result: DkTriathlonResult): number {
  let points = placePoints(result.overallPlace)
  if (result.fastestSplitBonus) points += 8
  if (result.podium) points += 5
  return points
}

/**
 * Projection = average DK points of the most recent up-to-3 results.
 * Empty input returns 0.
 */
export function dkProjection(recent: DkTriathlonResult[]): number {
  if (recent.length === 0) return 0
  const window = recent.slice(0, 3)
  const total = window.reduce((s, r) => s + dkTriathlonPoints(r), 0)
  return total / window.length
}
