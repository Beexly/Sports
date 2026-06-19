/**
 * cycling-analytics.ts
 * Pure TypeScript cycling analytics library — no external dependencies.
 */

// ---------------------------------------------------------------------------
// 1. Power metrics
// ---------------------------------------------------------------------------

/**
 * Normalized Power: 30-second rolling average^4 → mean → ^(1/4).
 * Returns 0 for empty data.
 */
export function normalizedPower(powerData: number[], windowSize: number = 30): number {
  if (powerData.length === 0) return 0
  if (powerData.length === 1) return powerData[0] ?? 0

  const ws = Math.max(1, windowSize)
  const rollingAverages: number[] = []

  for (let i = 0; i <= powerData.length - ws; i++) {
    let sum = 0
    for (let j = i; j < i + ws; j++) {
      sum += powerData[j] ?? 0
    }
    rollingAverages.push(sum / ws)
  }

  if (rollingAverages.length === 0) {
    // window larger than data — use a single average
    const avg = powerData.reduce((s, v) => s + v, 0) / powerData.length
    return avg
  }

  const meanOfFourthPowers =
    rollingAverages.reduce((s, v) => s + Math.pow(v, 4), 0) / rollingAverages.length
  return Math.pow(meanOfFourthPowers, 0.25)
}

/**
 * Intensity Factor: NP / FTP.
 * Returns 0 if FTP is 0.
 */
export function intensityFactor(npWatts: number, ftp: number): number {
  if (ftp === 0) return 0
  return npWatts / ftp
}

/**
 * Training Stress Score: TSS = (duration * IF^2 / 3600) * 100.
 */
export function trainingStressScore(durationSeconds: number, ifValue: number): number {
  return (durationSeconds * ifValue * ifValue / 3600) * 100
}

/**
 * Variability Index: NP / AP. Values > 1.05 indicate variable pacing.
 * Returns 0 if avgPower is 0.
 */
export function variabilityIndex(npWatts: number, avgPower: number): number {
  if (avgPower === 0) return 0
  return npWatts / avgPower
}

/**
 * Power-to-weight ratio in W/kg. Returns 0 if weightKg is 0.
 */
export function powerToWeightRatio(watts: number, weightKg: number): number {
  if (weightKg === 0) return 0
  return watts / weightKg
}

/**
 * Estimated FTP from 20-minute best effort: FTP ≈ 0.95 * 20-min best effort.
 */
export function estimatedFTP(bestEffortWatts20min: number): number {
  return 0.95 * bestEffortWatts20min
}

/**
 * Critical Power model via linear regression on 1/duration vs watts.
 * watts = W' * (1/duration) + CP
 * Returns { cp, wPrime }. Returns {cp:0, wPrime:0} for fewer than 2 efforts.
 */
export function criticalPower(
  efforts: { durationSec: number; watts: number }[],
): { cp: number; wPrime: number } {
  if (efforts.length < 2) return { cp: 0, wPrime: 0 }

  // x = 1/duration, y = watts
  const n = efforts.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (const e of efforts) {
    if (e.durationSec === 0) continue
    const x = 1 / e.durationSec
    const y = e.watts
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { cp: 0, wPrime: 0 }

  const wPrime = (n * sumXY - sumX * sumY) / denom  // slope = W'
  const cp = (sumY - wPrime * sumX) / n              // intercept = CP
  return { cp, wPrime }
}

// ---------------------------------------------------------------------------
// 2. Speed and climbing
// ---------------------------------------------------------------------------

/**
 * Speed from power on flat road (grade=0): V ≈ (P / Cd)^(1/3).
 * With grade: iterative Newton solve for V in: P = Cd * V^3 + m*g*sin(atan(grade/100))*V
 * Default Cd=0.237, grade=0. Returns speed in m/s.
 */
export function speedFromPower(
  watts: number,
  weightKg: number,
  dragCoefficient: number = 0.237,
  grade: number = 0,
): number {
  if (watts <= 0) return 0

  const g = 9.81
  const theta = Math.atan(grade / 100)
  const gradeForce = weightKg * g * Math.sin(theta)

  if (gradeForce === 0) {
    // Flat road: V = (P/Cd)^(1/3)
    return Math.pow(watts / dragCoefficient, 1 / 3)
  }

  // Iterative Newton-Raphson: P = Cd*V^3 + gradeForce*V
  let v = Math.pow(watts / dragCoefficient, 1 / 3)
  for (let i = 0; i < 50; i++) {
    const f = dragCoefficient * v * v * v + gradeForce * v - watts
    const df = 3 * dragCoefficient * v * v + gradeForce
    if (df === 0) break
    const vNext = v - f / df
    if (Math.abs(vNext - v) < 1e-9) {
      v = vNext
      break
    }
    v = vNext
  }
  return Math.max(0, v)
}

/**
 * VAM (Velocità Ascensionale Media): climbing speed in m/h.
 * VAM = (elevationGain * 3600) / timeSeconds
 */
export function climbingVAM(elevationGainM: number, timeSeconds: number): number {
  if (timeSeconds === 0) return 0
  return (elevationGainM * 3600) / timeSeconds
}

/**
 * Estimated climb time (seconds).
 * estimatedSpeed = powerToWeight * 2.5 (km/h)
 * time = (distanceKm / estimatedSpeed) * 3600
 */
export function estimatedClimbTime(
  distanceKm: number,
  elevationM: number,
  pwr: number,
): number {
  if (pwr <= 0) return 0
  const estimatedSpeedKmh = pwr * 2.5
  if (estimatedSpeedKmh === 0) return 0
  // elevationM is used as context (steeper climbs covered in the distance param)
  void elevationM
  return (distanceKm / estimatedSpeedKmh) * 3600
}

/**
 * Grade-adjusted pace: equivalent flat speed.
 * adj = speed / (1 + grade * 0.09)
 */
export function gradeAdjustedPace(speedKmh: number, gradePercent: number): number {
  const denom = 1 + gradePercent * 0.09
  if (denom === 0) return 0
  return speedKmh / denom
}

// ---------------------------------------------------------------------------
// 3. Race analytics
// ---------------------------------------------------------------------------

/**
 * Watts saved by drafting in peloton.
 * Default draft savings = 30%.
 */
export function pelotonAdvantage(soloWatts: number, pelotonDraft: number = 0.30): number {
  return soloWatts * pelotonDraft
}

/**
 * Attack success rate: ratio of successful attacks.
 * Returns 0 if attacks === 0.
 */
export function attackSuccessRate(attacks: number, successfulAttacks: number): number {
  if (attacks === 0) return 0
  return successfulAttacks / attacks
}

/**
 * Stage type classification.
 * - flat: gain/dist < 8 AND maxGrad < 5
 * - time_trial: distance < 40
 * - mountain: gain/dist > 20 OR maxGrad > 10
 * - else: hilly
 */
export function stageTypeScore(profile: {
  elevationGain: number
  distance: number
  maxGradient: number
}): 'flat' | 'hilly' | 'mountain' | 'time_trial' {
  const { elevationGain, distance, maxGradient } = profile
  const gainPerKm = distance > 0 ? elevationGain / distance : 0

  if (gainPerKm < 8 && maxGradient < 5) return 'flat'
  if (distance < 40) return 'time_trial'
  if (gainPerKm > 20 || maxGradient > 10) return 'mountain'
  return 'hilly'
}

/**
 * GC time gap: positive = behind leader.
 */
export function generalClassificationGap(leaderTime: number, riderTime: number): number {
  return riderTime - leaderTime
}

/**
 * Breakaway success probability.
 * P = (groupSize / (groupSize + pelotonSize)) * (1 / (1 + distanceToFinish/50))
 * Capped 0–1.
 */
export function breakawayOdds(
  groupSize: number,
  pelotonSize: number,
  distanceToFinish: number,
): number {
  const total = groupSize + pelotonSize
  if (total === 0) return 0
  const sizeRatio = groupSize / total
  const distanceFactor = 1 / (1 + distanceToFinish / 50)
  return Math.max(0, Math.min(1, sizeRatio * distanceFactor))
}

// ---------------------------------------------------------------------------
// 4. Training load & periodization
// ---------------------------------------------------------------------------

/**
 * Acute Training Load: exponentially weighted 7-day average.
 * Default λ = 1/7.
 */
export function acuteTrainingLoad(tssValues: number[], decayFactor: number = 1 / 7): number {
  if (tssValues.length === 0) return 0
  let atl = 0
  for (const tss of tssValues) {
    atl = atl + decayFactor * (tss - atl)
  }
  return atl
}

/**
 * Chronic Training Load: exponentially weighted 42-day average.
 * Default λ = 1/42.
 */
export function chronicTrainingLoad(tssValues: number[], decayFactor: number = 1 / 42): number {
  if (tssValues.length === 0) return 0
  let ctl = 0
  for (const tss of tssValues) {
    ctl = ctl + decayFactor * (tss - ctl)
  }
  return ctl
}

/**
 * Training Stress Balance: TSB = CTL - ATL (freshness metric).
 */
export function trainingStressBalance(atl: number, ctl: number): number {
  return ctl - atl
}

/**
 * Form category based on TSB.
 * < -30: very_tired | -30 to -10: tired | -10 to 10: fresh | 10 to 25: very_fresh | > 25: untrained
 */
export function formCategory(
  tsb: number,
): 'very_tired' | 'tired' | 'fresh' | 'very_fresh' | 'untrained' {
  if (tsb < -30) return 'very_tired'
  if (tsb < -10) return 'tired'
  if (tsb <= 10) return 'fresh'
  if (tsb <= 25) return 'very_fresh'
  return 'untrained'
}

/**
 * Weekly TSS: sum of daily TSS values (partial week supported).
 */
export function weeklyTSS(dailyTSS: number[]): number {
  return dailyTSS.reduce((s, v) => s + v, 0)
}

/**
 * Ramp Rate: average week-over-week TSS change.
 * Returns 0 if fewer than 2 weeks.
 */
export function rampRate(weeklyTSSValues: number[]): number {
  if (weeklyTSSValues.length < 2) return 0
  let totalChange = 0
  for (let i = 1; i < weeklyTSSValues.length; i++) {
    totalChange += (weeklyTSSValues[i] ?? 0) - (weeklyTSSValues[i - 1] ?? 0)
  }
  return totalChange / (weeklyTSSValues.length - 1)
}

// ---------------------------------------------------------------------------
// 5. Equipment & aerodynamics
// ---------------------------------------------------------------------------

/**
 * Rolling resistance power loss.
 * P = Crr * mass * g * speed_ms
 * Default Crr=0.005, g=9.81; speedKmh converted to m/s internally.
 */
export function crrPowerLoss(
  weightKg: number,
  speedKmh: number,
  crr: number = 0.005,
): number {
  const g = 9.81
  const speedMs = speedKmh / 3.6
  return crr * weightKg * g * speedMs
}

/**
 * Aerodynamic drag power.
 * P = 0.5 * rho * CdA * v^3
 * Default CdA=0.32, rho=1.225 kg/m³; speedKmh converted to m/s internally.
 */
export function aeroDragPower(
  speedKmh: number,
  cdaM2: number = 0.32,
  airDensity: number = 1.225,
): number {
  const speedMs = speedKmh / 3.6
  return 0.5 * airDensity * cdaM2 * Math.pow(speedMs, 3)
}

/**
 * Total resistance power: aero + rolling + gravity components.
 * gradePercent default=0.
 */
export function totalResistancePower(
  weightKg: number,
  speedKmh: number,
  gradePercent: number = 0,
  cdaM2: number = 0.32,
  crr: number = 0.005,
): number {
  const g = 9.81
  const speedMs = speedKmh / 3.6
  const theta = Math.atan(gradePercent / 100)

  const aero = 0.5 * 1.225 * cdaM2 * Math.pow(speedMs, 3)
  const rolling = crr * weightKg * g * speedMs
  const gravity = weightKg * g * Math.sin(theta) * speedMs

  return aero + rolling + gravity
}

/**
 * Power savings from wheel weight reduction.
 * P = savedKg * 9.81 * sin(atan(grade/100)) * speed_ms
 * Returns 0 on flat grade.
 */
export function wheelWeightSavingsWatts(
  savedGrams: number,
  speedKmh: number,
  gradePercent: number,
): number {
  if (gradePercent === 0) return 0
  const savedKg = savedGrams / 1000
  const g = 9.81
  const theta = Math.atan(gradePercent / 100)
  const speedMs = speedKmh / 3.6
  return savedKg * g * Math.sin(theta) * speedMs
}

// ---------------------------------------------------------------------------
// 6. DraftKings fantasy (Cycling)
// ---------------------------------------------------------------------------

export interface DKCyclingResult {
  place: number
  stageType: 'flat' | 'mountain' | 'time_trial' | 'hilly'
  bonusSprints: number
  komPoints: number
  dnf: boolean
}

/**
 * DraftKings cycling points.
 * Place points (flat): 1st=10, 2nd=8, 3rd=6, 4th=4, 5th=3, other=1.
 * Mountain stages: +50% bonus on place points.
 * TT stages: standard place points.
 * Sprint bonus: +0.5 each.
 * KOM: +1 each.
 * DNF: -5.
 */
export function dkCyclingPoints(result: DKCyclingResult): number {
  if (result.dnf) return -5

  const flatPlacePoints: Record<number, number> = {
    1: 10,
    2: 8,
    3: 6,
    4: 4,
    5: 3,
  }

  const basePlacePoints = flatPlacePoints[result.place] ?? 1

  let placePoints: number
  if (result.stageType === 'mountain') {
    placePoints = basePlacePoints * 1.5
  } else {
    placePoints = basePlacePoints
  }

  const sprintBonus = result.bonusSprints * 0.5
  const komBonus = result.komPoints * 1

  return placePoints + sprintBonus + komBonus
}

/**
 * DraftKings projected score: average DK points from recent results.
 * Returns 0 for empty array.
 */
export function dkProjection(recentResults: DKCyclingResult[]): number {
  if (recentResults.length === 0) return 0
  const total = recentResults.reduce((s, r) => s + dkCyclingPoints(r), 0)
  return total / recentResults.length
}
