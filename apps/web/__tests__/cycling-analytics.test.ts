import { describe, it, expect } from 'vitest'

import {
  // 1. Power metrics
  normalizedPower,
  intensityFactor,
  trainingStressScore,
  variabilityIndex,
  powerToWeightRatio,
  estimatedFTP,
  criticalPower,
  // 2. Speed and climbing
  speedFromPower,
  climbingVAM,
  estimatedClimbTime,
  gradeAdjustedPace,
  // 3. Race analytics
  pelotonAdvantage,
  attackSuccessRate,
  stageTypeScore,
  generalClassificationGap,
  breakawayOdds,
  // 4. Training load & periodization
  acuteTrainingLoad,
  chronicTrainingLoad,
  trainingStressBalance,
  formCategory,
  weeklyTSS,
  rampRate,
  // 5. Equipment & aerodynamics
  crrPowerLoss,
  aeroDragPower,
  totalResistancePower,
  wheelWeightSavingsWatts,
  // 6. DraftKings fantasy
  dkCyclingPoints,
  dkProjection,
  // Types
  type DKCyclingResult,
} from '@/lib/sports/cycling-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps
}

// ---------------------------------------------------------------------------
// 1. Power metrics
// ---------------------------------------------------------------------------

describe('normalizedPower', () => {
  it('returns 0 for empty data', () => {
    expect(normalizedPower([])).toBe(0)
  })

  it('returns the single value for a 1-element array', () => {
    expect(normalizedPower([250])).toBe(250)
  })

  it('returns a positive number for real power data', () => {
    const data = Array.from({ length: 60 }, (_, i) => 200 + (i % 2) * 100)
    const np = normalizedPower(data)
    expect(np).toBeGreaterThan(0)
  })

  it('NP >= average power for variable data', () => {
    const data = [100, 400, 100, 400, 100, 400, 100, 400, 100, 400,
                  100, 400, 100, 400, 100, 400, 100, 400, 100, 400,
                  100, 400, 100, 400, 100, 400, 100, 400, 100, 400,
                  100, 400]
    const avg = data.reduce((s, v) => s + v, 0) / data.length
    const np = normalizedPower(data, 30)
    expect(np).toBeGreaterThanOrEqual(avg)
  })

  it('NP equals average power for constant data', () => {
    const data = Array.from({ length: 60 }, () => 250)
    const np = normalizedPower(data, 30)
    expect(approx(np, 250, 1e-4)).toBe(true)
  })

  it('respects custom window size', () => {
    const data = Array.from({ length: 20 }, (_, i) => 200 + i * 5)
    const np10 = normalizedPower(data, 10)
    const np5 = normalizedPower(data, 5)
    expect(np10).toBeGreaterThan(0)
    expect(np5).toBeGreaterThan(0)
  })

  it('handles window larger than data length', () => {
    const data = [200, 250, 300]
    const np = normalizedPower(data, 30)
    expect(np).toBeGreaterThan(0)
  })
})

describe('intensityFactor', () => {
  it('calculates IF correctly', () => {
    expect(intensityFactor(270, 300)).toBeCloseTo(0.9)
  })

  it('returns 0 when FTP is 0', () => {
    expect(intensityFactor(200, 0)).toBe(0)
  })

  it('IF of 1.0 means riding at FTP', () => {
    expect(intensityFactor(300, 300)).toBe(1)
  })

  it('IF > 1.0 is above FTP', () => {
    expect(intensityFactor(350, 300)).toBeGreaterThan(1)
  })
})

describe('trainingStressScore', () => {
  it('calculates TSS for a 1-hour ride at IF=1.0', () => {
    expect(trainingStressScore(3600, 1.0)).toBeCloseTo(100)
  })

  it('calculates TSS for 2-hour ride at IF=0.75', () => {
    // (7200 * 0.5625 / 3600) * 100 = 112.5
    expect(trainingStressScore(7200, 0.75)).toBeCloseTo(112.5)
  })

  it('returns 0 for 0 duration', () => {
    expect(trainingStressScore(0, 1.0)).toBe(0)
  })

  it('returns 0 for 0 IF', () => {
    expect(trainingStressScore(3600, 0)).toBe(0)
  })
})

describe('variabilityIndex', () => {
  it('calculates VI correctly', () => {
    expect(variabilityIndex(270, 250)).toBeCloseTo(1.08)
  })

  it('returns 0 when avgPower is 0', () => {
    expect(variabilityIndex(270, 0)).toBe(0)
  })

  it('returns 1.0 for steady power', () => {
    expect(variabilityIndex(250, 250)).toBe(1)
  })

  it('VI > 1.05 indicates variable pacing', () => {
    expect(variabilityIndex(280, 250)).toBeGreaterThan(1.05)
  })
})

describe('powerToWeightRatio', () => {
  it('calculates W/kg correctly', () => {
    expect(powerToWeightRatio(300, 75)).toBeCloseTo(4)
  })

  it('returns 0 when weight is 0', () => {
    expect(powerToWeightRatio(300, 0)).toBe(0)
  })

  it('handles fractional values', () => {
    expect(powerToWeightRatio(250, 62.5)).toBeCloseTo(4)
  })
})

describe('estimatedFTP', () => {
  it('returns 0.95 * 20-min best effort', () => {
    expect(estimatedFTP(300)).toBeCloseTo(285)
  })

  it('handles 0 input', () => {
    expect(estimatedFTP(0)).toBe(0)
  })

  it('handles fractional watts', () => {
    expect(estimatedFTP(250.5)).toBeCloseTo(237.975)
  })
})

describe('criticalPower', () => {
  it('returns {cp:0, wPrime:0} for empty efforts', () => {
    expect(criticalPower([])).toEqual({ cp: 0, wPrime: 0 })
  })

  it('returns {cp:0, wPrime:0} for single effort', () => {
    expect(criticalPower([{ durationSec: 300, watts: 350 }])).toEqual({ cp: 0, wPrime: 0 })
  })

  it('fits a line through 2 points', () => {
    // For perfect linear model: if CP=250, W'=20000
    // watts = W' * (1/duration) + CP
    // 5min: 20000/300 + 250 ≈ 316.67
    // 1min: 20000/60 + 250 ≈ 583.33
    const efforts = [
      { durationSec: 300, watts: 250 + 20000 / 300 },
      { durationSec: 60, watts: 250 + 20000 / 60 },
    ]
    const { cp, wPrime } = criticalPower(efforts)
    expect(approx(cp, 250, 1)).toBe(true)
    expect(approx(wPrime, 20000, 100)).toBe(true)
  })

  it('handles more than 2 effort points', () => {
    const efforts = [
      { durationSec: 60, watts: 580 },
      { durationSec: 180, watts: 400 },
      { durationSec: 300, watts: 360 },
      { durationSec: 600, watts: 320 },
    ]
    const { cp, wPrime } = criticalPower(efforts)
    expect(cp).toBeGreaterThan(0)
    expect(wPrime).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Speed and climbing
// ---------------------------------------------------------------------------

describe('speedFromPower', () => {
  it('returns 0 for 0 watts', () => {
    expect(speedFromPower(0, 70)).toBe(0)
  })

  it('returns positive speed on flat road', () => {
    const v = speedFromPower(200, 70)
    expect(v).toBeGreaterThan(0)
  })

  it('flat road formula: V ≈ (P/Cd)^(1/3)', () => {
    const watts = 200
    const cd = 0.237
    const expected = Math.pow(watts / cd, 1 / 3)
    const actual = speedFromPower(watts, 70, cd, 0)
    expect(approx(actual, expected, 1e-6)).toBe(true)
  })

  it('climbing reduces speed', () => {
    const flat = speedFromPower(200, 70, 0.237, 0)
    const uphill = speedFromPower(200, 70, 0.237, 5)
    expect(uphill).toBeLessThan(flat)
  })

  it('returns 0 for negative watts', () => {
    expect(speedFromPower(-100, 70)).toBe(0)
  })
})

describe('climbingVAM', () => {
  it('calculates VAM correctly', () => {
    // 1000m in 3600s = 1000 m/h
    expect(climbingVAM(1000, 3600)).toBeCloseTo(1000)
  })

  it('returns 0 when time is 0', () => {
    expect(climbingVAM(500, 0)).toBe(0)
  })

  it('higher VAM for same gain in less time', () => {
    const slow = climbingVAM(500, 3600)
    const fast = climbingVAM(500, 1800)
    expect(fast).toBeGreaterThan(slow)
  })

  it('handles decimal elevation gain', () => {
    expect(climbingVAM(1500, 3600)).toBeCloseTo(1500)
  })
})

describe('estimatedClimbTime', () => {
  it('returns 0 when powerToWeight is 0', () => {
    expect(estimatedClimbTime(10, 500, 0)).toBe(0)
  })

  it('returns positive time for valid inputs', () => {
    const t = estimatedClimbTime(10, 500, 4)
    expect(t).toBeGreaterThan(0)
  })

  it('higher power = faster time', () => {
    const slow = estimatedClimbTime(10, 1000, 3)
    const fast = estimatedClimbTime(10, 1000, 5)
    expect(fast).toBeLessThan(slow)
  })

  it('longer distance = longer time', () => {
    const short = estimatedClimbTime(5, 500, 4)
    const long = estimatedClimbTime(20, 500, 4)
    expect(long).toBeGreaterThan(short)
  })
})

describe('gradeAdjustedPace', () => {
  it('returns same speed on flat grade', () => {
    // grade=0: denom = 1 + 0*0.09 = 1
    expect(gradeAdjustedPace(30, 0)).toBeCloseTo(30)
  })

  it('uphill grade reduces effective speed', () => {
    const adj = gradeAdjustedPace(30, 5)
    expect(adj).toBeLessThan(30)
  })

  it('steeper grade = more reduction', () => {
    const mild = gradeAdjustedPace(30, 3)
    const steep = gradeAdjustedPace(30, 10)
    expect(steep).toBeLessThan(mild)
  })

  it('calculates correctly for 10% grade', () => {
    // adj = 30 / (1 + 10 * 0.09) = 30 / 1.9
    expect(gradeAdjustedPace(30, 10)).toBeCloseTo(30 / 1.9)
  })
})

// ---------------------------------------------------------------------------
// 3. Race analytics
// ---------------------------------------------------------------------------

describe('pelotonAdvantage', () => {
  it('returns 30% of soloWatts by default', () => {
    expect(pelotonAdvantage(300)).toBeCloseTo(90)
  })

  it('respects custom draft savings', () => {
    expect(pelotonAdvantage(300, 0.25)).toBeCloseTo(75)
  })

  it('returns 0 for 0 watts', () => {
    expect(pelotonAdvantage(0)).toBe(0)
  })

  it('returns full watts at 100% draft', () => {
    expect(pelotonAdvantage(300, 1.0)).toBeCloseTo(300)
  })
})

describe('attackSuccessRate', () => {
  it('returns ratio of successful attacks', () => {
    expect(attackSuccessRate(10, 3)).toBeCloseTo(0.3)
  })

  it('returns 0 when attacks is 0', () => {
    expect(attackSuccessRate(0, 0)).toBe(0)
  })

  it('returns 1.0 for 100% success', () => {
    expect(attackSuccessRate(5, 5)).toBe(1)
  })

  it('returns 0 for 0 successes', () => {
    expect(attackSuccessRate(10, 0)).toBe(0)
  })
})

describe('stageTypeScore', () => {
  it('classifies a flat stage', () => {
    expect(stageTypeScore({ elevationGain: 200, distance: 180, maxGradient: 3 })).toBe('flat')
  })

  it('classifies a mountain stage by gain/dist', () => {
    expect(stageTypeScore({ elevationGain: 4000, distance: 150, maxGradient: 8 })).toBe('mountain')
  })

  it('classifies a mountain stage by max gradient', () => {
    expect(stageTypeScore({ elevationGain: 1500, distance: 120, maxGradient: 15 })).toBe('mountain')
  })

  it('classifies a time trial by distance', () => {
    expect(stageTypeScore({ elevationGain: 100, distance: 30, maxGradient: 8 })).toBe('time_trial')
  })

  it('classifies a hilly stage', () => {
    expect(stageTypeScore({ elevationGain: 1200, distance: 160, maxGradient: 7 })).toBe('hilly')
  })

  it('flat takes priority over short distance when gain < 8 and grad < 5', () => {
    // distance=35 but gain/dist=1.4 and maxGrad=2 → flat wins
    expect(stageTypeScore({ elevationGain: 50, distance: 35, maxGradient: 2 })).toBe('flat')
  })

  it('returns time_trial for short steep course (after flat check fails)', () => {
    // gain/dist=10 (not flat), distance=25 < 40 → time_trial
    expect(stageTypeScore({ elevationGain: 250, distance: 25, maxGradient: 6 })).toBe('time_trial')
  })
})

describe('generalClassificationGap', () => {
  it('returns positive when rider is behind', () => {
    expect(generalClassificationGap(10000, 10045)).toBeCloseTo(45)
  })

  it('returns 0 when times are equal', () => {
    expect(generalClassificationGap(10000, 10000)).toBe(0)
  })

  it('returns negative when rider leads (impossible in practice but mathematic)', () => {
    expect(generalClassificationGap(10050, 10000)).toBeLessThan(0)
  })
})

describe('breakawayOdds', () => {
  it('returns a value between 0 and 1', () => {
    const p = breakawayOdds(5, 100, 30)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })

  it('returns 0 when group and peloton size are 0', () => {
    expect(breakawayOdds(0, 0, 30)).toBe(0)
  })

  it('higher group size increases odds', () => {
    const small = breakawayOdds(5, 100, 30)
    const large = breakawayOdds(20, 100, 30)
    expect(large).toBeGreaterThan(small)
  })

  it('more distance to finish reduces odds', () => {
    const near = breakawayOdds(5, 50, 10)
    const far = breakawayOdds(5, 50, 100)
    expect(near).toBeGreaterThan(far)
  })

  it('zero distance to finish gives high probability', () => {
    const p = breakawayOdds(5, 5, 0)
    expect(p).toBeCloseTo(0.5) // (5/10) * (1/1) = 0.5
  })
})

// ---------------------------------------------------------------------------
// 4. Training load & periodization
// ---------------------------------------------------------------------------

describe('acuteTrainingLoad', () => {
  it('returns 0 for empty input', () => {
    expect(acuteTrainingLoad([])).toBe(0)
  })

  it('returns a positive value for positive TSS', () => {
    const atl = acuteTrainingLoad([100, 80, 120, 90, 110, 70, 100])
    expect(atl).toBeGreaterThan(0)
  })

  it('converges toward TSS level with constant input', () => {
    const data = Array.from({ length: 50 }, () => 100)
    const atl = acuteTrainingLoad(data)
    expect(atl).toBeGreaterThan(50)
    expect(atl).toBeLessThanOrEqual(100)
  })

  it('respects custom decay factor', () => {
    const defaultATL = acuteTrainingLoad([100, 100, 100])
    const fasterATL = acuteTrainingLoad([100, 100, 100], 0.5)
    expect(fasterATL).toBeGreaterThan(defaultATL)
  })
})

describe('chronicTrainingLoad', () => {
  it('returns 0 for empty input', () => {
    expect(chronicTrainingLoad([])).toBe(0)
  })

  it('CTL is lower than ATL for same data (slower decay)', () => {
    const data = Array.from({ length: 14 }, () => 100)
    const atl = acuteTrainingLoad(data)
    const ctl = chronicTrainingLoad(data)
    expect(ctl).toBeLessThan(atl)
  })

  it('returns positive value for positive TSS stream', () => {
    const data = Array.from({ length: 42 }, () => 80)
    expect(chronicTrainingLoad(data)).toBeGreaterThan(0)
  })
})

describe('trainingStressBalance', () => {
  it('TSB = CTL - ATL', () => {
    expect(trainingStressBalance(80, 60)).toBeCloseTo(-20)
  })

  it('positive TSB = fresh', () => {
    expect(trainingStressBalance(30, 50)).toBeGreaterThan(0)
  })

  it('negative TSB = tired', () => {
    expect(trainingStressBalance(100, 50)).toBeLessThan(0)
  })
})

describe('formCategory', () => {
  it('returns very_tired for TSB < -30', () => {
    expect(formCategory(-40)).toBe('very_tired')
    expect(formCategory(-31)).toBe('very_tired')
  })

  it('returns tired for TSB -30 to -10', () => {
    expect(formCategory(-30)).toBe('tired')
    expect(formCategory(-20)).toBe('tired')
    expect(formCategory(-10.1)).toBe('tired')
  })

  it('returns fresh for TSB -10 to 10', () => {
    expect(formCategory(-10)).toBe('fresh')
    expect(formCategory(0)).toBe('fresh')
    expect(formCategory(10)).toBe('fresh')
  })

  it('returns very_fresh for TSB 10 to 25', () => {
    expect(formCategory(11)).toBe('very_fresh')
    expect(formCategory(20)).toBe('very_fresh')
    expect(formCategory(25)).toBe('very_fresh')
  })

  it('returns untrained for TSB > 25', () => {
    expect(formCategory(26)).toBe('untrained')
    expect(formCategory(50)).toBe('untrained')
  })

  it('boundary at -10 is fresh', () => {
    expect(formCategory(-10)).toBe('fresh')
  })
})

describe('weeklyTSS', () => {
  it('sums all daily TSS values', () => {
    expect(weeklyTSS([80, 100, 0, 90, 120, 60, 70])).toBe(520)
  })

  it('returns 0 for empty array', () => {
    expect(weeklyTSS([])).toBe(0)
  })

  it('handles partial week', () => {
    expect(weeklyTSS([100, 80, 120])).toBe(300)
  })

  it('handles all zeros', () => {
    expect(weeklyTSS([0, 0, 0, 0, 0, 0, 0])).toBe(0)
  })
})

describe('rampRate', () => {
  it('returns 0 for empty array', () => {
    expect(rampRate([])).toBe(0)
  })

  it('returns 0 for single value', () => {
    expect(rampRate([400])).toBe(0)
  })

  it('calculates average weekly change', () => {
    // 400, 440, 420 → changes: +40, -20 → avg = 10
    expect(rampRate([400, 440, 420])).toBeCloseTo(10)
  })

  it('positive ramp when training load increases', () => {
    expect(rampRate([300, 350, 400, 450])).toBeGreaterThan(0)
  })

  it('negative ramp when load decreases', () => {
    expect(rampRate([500, 400, 300])).toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Equipment & aerodynamics
// ---------------------------------------------------------------------------

describe('crrPowerLoss', () => {
  it('returns a positive value at speed', () => {
    expect(crrPowerLoss(75, 36)).toBeGreaterThan(0)
  })

  it('returns 0 at 0 speed', () => {
    expect(crrPowerLoss(75, 0)).toBe(0)
  })

  it('heavier rider has more rolling resistance', () => {
    const light = crrPowerLoss(60, 36)
    const heavy = crrPowerLoss(90, 36)
    expect(heavy).toBeGreaterThan(light)
  })

  it('uses default Crr=0.005', () => {
    const speedMs = 36 / 3.6 // 10 m/s
    const expected = 0.005 * 75 * 9.81 * speedMs
    expect(crrPowerLoss(75, 36)).toBeCloseTo(expected)
  })
})

describe('aeroDragPower', () => {
  it('returns a positive value at speed', () => {
    expect(aeroDragPower(36)).toBeGreaterThan(0)
  })

  it('returns 0 at 0 speed', () => {
    expect(aeroDragPower(0)).toBe(0)
  })

  it('higher speed = much higher drag (cubic relationship)', () => {
    const slow = aeroDragPower(18)
    const fast = aeroDragPower(36)
    // Should be roughly 8x (2^3) more at double speed
    expect(fast / slow).toBeCloseTo(8, 0)
  })

  it('uses default CdA=0.32 and rho=1.225', () => {
    const v = 36 / 3.6 // 10 m/s
    const expected = 0.5 * 1.225 * 0.32 * Math.pow(v, 3)
    expect(aeroDragPower(36)).toBeCloseTo(expected)
  })
})

describe('totalResistancePower', () => {
  it('returns a positive value at speed', () => {
    expect(totalResistancePower(75, 36)).toBeGreaterThan(0)
  })

  it('returns 0 at 0 speed', () => {
    expect(totalResistancePower(75, 0)).toBe(0)
  })

  it('climbing adds to total resistance', () => {
    const flat = totalResistancePower(75, 36, 0)
    const uphill = totalResistancePower(75, 36, 5)
    expect(uphill).toBeGreaterThan(flat)
  })

  it('is sum of aero + rolling on flat', () => {
    const aero = aeroDragPower(36)
    const rolling = crrPowerLoss(75, 36)
    const total = totalResistancePower(75, 36, 0)
    expect(approx(total, aero + rolling, 0.01)).toBe(true)
  })
})

describe('wheelWeightSavingsWatts', () => {
  it('returns 0 on flat grade', () => {
    expect(wheelWeightSavingsWatts(500, 25, 0)).toBe(0)
  })

  it('returns positive savings on a climb', () => {
    expect(wheelWeightSavingsWatts(500, 15, 8)).toBeGreaterThan(0)
  })

  it('more grams saved = more power saved', () => {
    const small = wheelWeightSavingsWatts(200, 15, 8)
    const large = wheelWeightSavingsWatts(500, 15, 8)
    expect(large).toBeGreaterThan(small)
  })

  it('steeper grade = more power saved', () => {
    const mild = wheelWeightSavingsWatts(500, 15, 5)
    const steep = wheelWeightSavingsWatts(500, 15, 10)
    expect(steep).toBeGreaterThan(mild)
  })
})

// ---------------------------------------------------------------------------
// 6. DraftKings fantasy (Cycling)
// ---------------------------------------------------------------------------

describe('dkCyclingPoints', () => {
  const base: DKCyclingResult = {
    place: 1,
    stageType: 'flat',
    bonusSprints: 0,
    komPoints: 0,
    dnf: false,
  }

  it('DNF returns -5 regardless of other inputs', () => {
    expect(dkCyclingPoints({ ...base, dnf: true })).toBe(-5)
    expect(dkCyclingPoints({ ...base, place: 1, dnf: true })).toBe(-5)
  })

  it('flat stage: 1st place = 10 points', () => {
    expect(dkCyclingPoints({ ...base, place: 1 })).toBe(10)
  })

  it('flat stage: 2nd place = 8 points', () => {
    expect(dkCyclingPoints({ ...base, place: 2 })).toBe(8)
  })

  it('flat stage: 3rd place = 6 points', () => {
    expect(dkCyclingPoints({ ...base, place: 3 })).toBe(6)
  })

  it('flat stage: 4th place = 4 points', () => {
    expect(dkCyclingPoints({ ...base, place: 4 })).toBe(4)
  })

  it('flat stage: 5th place = 3 points', () => {
    expect(dkCyclingPoints({ ...base, place: 5 })).toBe(3)
  })

  it('flat stage: other place = 1 point', () => {
    expect(dkCyclingPoints({ ...base, place: 10 })).toBe(1)
    expect(dkCyclingPoints({ ...base, place: 50 })).toBe(1)
  })

  it('mountain stage: 50% bonus on place points', () => {
    // 1st on mountain: 10 * 1.5 = 15
    expect(dkCyclingPoints({ ...base, stageType: 'mountain', place: 1 })).toBeCloseTo(15)
  })

  it('mountain stage 2nd: 8 * 1.5 = 12', () => {
    expect(dkCyclingPoints({ ...base, stageType: 'mountain', place: 2 })).toBeCloseTo(12)
  })

  it('TT stage: standard points (same as flat)', () => {
    expect(dkCyclingPoints({ ...base, stageType: 'time_trial', place: 1 })).toBe(10)
  })

  it('hilly stage: standard points', () => {
    expect(dkCyclingPoints({ ...base, stageType: 'hilly', place: 1 })).toBe(10)
  })

  it('sprint bonus: +0.5 per sprint', () => {
    expect(dkCyclingPoints({ ...base, bonusSprints: 2 })).toBeCloseTo(11)
  })

  it('KOM points: +1 each', () => {
    expect(dkCyclingPoints({ ...base, komPoints: 3 })).toBeCloseTo(13)
  })

  it('combined bonuses accumulate correctly', () => {
    // flat 1st (10) + 2 sprints (1) + 3 KOM (3) = 14
    expect(dkCyclingPoints({ ...base, bonusSprints: 2, komPoints: 3 })).toBeCloseTo(14)
  })

  it('returns 1 point for last place with no bonuses', () => {
    expect(dkCyclingPoints({ ...base, place: 150 })).toBe(1)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty results', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('averages DK points from multiple results', () => {
    const results: DKCyclingResult[] = [
      { place: 1, stageType: 'flat', bonusSprints: 0, komPoints: 0, dnf: false }, // 10
      { place: 3, stageType: 'flat', bonusSprints: 0, komPoints: 0, dnf: false }, // 6
    ]
    expect(dkProjection(results)).toBeCloseTo(8)
  })

  it('DNF result drags average down', () => {
    const results: DKCyclingResult[] = [
      { place: 1, stageType: 'flat', bonusSprints: 0, komPoints: 0, dnf: false }, // 10
      { place: 1, stageType: 'flat', bonusSprints: 0, komPoints: 0, dnf: true },  // -5
    ]
    expect(dkProjection(results)).toBeCloseTo(2.5)
  })

  it('single result returns that result score', () => {
    const result: DKCyclingResult = { place: 2, stageType: 'flat', bonusSprints: 0, komPoints: 0, dnf: false }
    expect(dkProjection([result])).toBeCloseTo(8)
  })

  it('mountain stage bonuses affect projection', () => {
    const results: DKCyclingResult[] = [
      { place: 1, stageType: 'mountain', bonusSprints: 0, komPoints: 0, dnf: false }, // 15
      { place: 1, stageType: 'flat', bonusSprints: 0, komPoints: 0, dnf: false },     // 10
    ]
    expect(dkProjection(results)).toBeCloseTo(12.5)
  })
})
