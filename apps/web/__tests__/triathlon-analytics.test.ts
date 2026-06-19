import { describe, it, expect } from 'vitest'

import {
  // 1. Race totals & splits
  totalTime,
  splitPercentages,
  transitionTime,
  legPace,
  normalizeToDistance,
  // 2. Discipline-specific
  swimPacePer100m,
  bikeSpeedKmh,
  runPacePerKm,
  bikePower,
  // 3. Format detection
  triathlonFormat,
  // 4. Performance ratios
  swimBikeRunBalance,
  strongestDiscipline,
  fadeFactor,
  transitionEfficiency,
  // 5. Fitness estimates
  functionalThresholdPower,
  criticalSwimSpeed,
  runningTSS,
  vo2maxEstimate,
  // 6. Race strategy
  pacingStrategy,
  nutritionWindow,
  draftingLegalGap,
  negativeSplitAchieved,
  // 7. DraftKings-style fantasy
  dkTriathlonPoints,
  dkProjection,
} from '@/lib/sports/triathlon-analytics'
import type { DkTriathlonResult } from '@/lib/sports/triathlon-analytics'

// ===========================================================================
// 1. Race totals & splits
// ===========================================================================

describe('totalTime', () => {
  it('sums all five components', () => {
    expect(totalTime(1200, 60, 3600, 45, 2400)).toBe(7305)
  })

  it('equals sum of moving time plus transitions', () => {
    const swim = 1000
    const t1 = 50
    const bike = 3000
    const t2 = 40
    const run = 2000
    expect(totalTime(swim, t1, bike, t2, run)).toBe(
      swim + bike + run + transitionTime(t1, t2),
    )
  })

  it('returns 0 for all zeros', () => {
    expect(totalTime(0, 0, 0, 0, 0)).toBe(0)
  })

  it('handles only swim', () => {
    expect(totalTime(900, 0, 0, 0, 0)).toBe(900)
  })

  it('handles only transitions', () => {
    expect(totalTime(0, 30, 0, 25, 0)).toBe(55)
  })

  it('is order-stable additive', () => {
    expect(totalTime(1, 2, 3, 4, 5)).toBe(15)
  })

  it('supports large ironman times', () => {
    expect(totalTime(4000, 300, 18000, 200, 14000)).toBe(36500)
  })

  it('supports fractional seconds', () => {
    expect(totalTime(100.5, 0.5, 0, 0, 0)).toBeCloseTo(101, 5)
  })
})

describe('splitPercentages', () => {
  it('sums to 1 across moving time', () => {
    const p = splitPercentages(1000, 3000, 2000)
    expect(p.swim + p.bike + p.run).toBeCloseTo(1, 10)
  })

  it('computes correct fractions', () => {
    const p = splitPercentages(1000, 2000, 1000)
    expect(p.swim).toBeCloseTo(0.25, 10)
    expect(p.bike).toBeCloseTo(0.5, 10)
    expect(p.run).toBeCloseTo(0.25, 10)
  })

  it('excludes transitions (moving time only)', () => {
    // bike should dominate in a typical race
    const p = splitPercentages(1200, 3600, 2400)
    expect(p.bike).toBeGreaterThan(p.swim)
    expect(p.bike).toBeGreaterThan(p.run)
  })

  it('returns zeros for zero moving time', () => {
    const p = splitPercentages(0, 0, 0)
    expect(p).toEqual({ swim: 0, bike: 0, run: 0 })
  })

  it('handles single discipline', () => {
    const p = splitPercentages(1000, 0, 0)
    expect(p.swim).toBe(1)
    expect(p.bike).toBe(0)
    expect(p.run).toBe(0)
  })

  it('handles equal thirds', () => {
    const p = splitPercentages(100, 100, 100)
    expect(p.swim).toBeCloseTo(1 / 3, 10)
    expect(p.bike).toBeCloseTo(1 / 3, 10)
    expect(p.run).toBeCloseTo(1 / 3, 10)
  })

  it('each value within [0,1]', () => {
    const p = splitPercentages(500, 4000, 1500)
    for (const v of [p.swim, p.bike, p.run]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('handles negative moving time as zeros', () => {
    const p = splitPercentages(-10, -20, -5)
    expect(p).toEqual({ swim: 0, bike: 0, run: 0 })
  })
})

describe('transitionTime', () => {
  it('adds t1 and t2', () => {
    expect(transitionTime(60, 45)).toBe(105)
  })

  it('returns 0 for zero transitions', () => {
    expect(transitionTime(0, 0)).toBe(0)
  })

  it('handles only t1', () => {
    expect(transitionTime(70, 0)).toBe(70)
  })

  it('handles only t2', () => {
    expect(transitionTime(0, 30)).toBe(30)
  })

  it('handles fractional seconds', () => {
    expect(transitionTime(12.5, 7.5)).toBe(20)
  })
})

describe('legPace', () => {
  it('returns sec per meter', () => {
    expect(legPace(1000, 2000)).toBe(2)
  })

  it('returns 0 when distance is 0', () => {
    expect(legPace(0, 1000)).toBe(0)
  })

  it('returns 0 when distance is negative', () => {
    expect(legPace(-5, 1000)).toBe(0)
  })

  it('handles fast pace', () => {
    expect(legPace(5000, 1000)).toBe(0.2)
  })

  it('handles zero time', () => {
    expect(legPace(1000, 0)).toBe(0)
  })

  it('handles fractional distance', () => {
    expect(legPace(500, 1500)).toBe(3)
  })
})

describe('normalizeToDistance', () => {
  it('returns same time for same distance (Riegel)', () => {
    expect(normalizeToDistance(3600, 10000, 10000)).toBeCloseTo(3600, 6)
  })

  it('predicts longer time for longer distance', () => {
    const out = normalizeToDistance(1200, 5000, 10000)
    expect(out).toBeGreaterThan(2400) // more than linear double
  })

  it('uses default k = 1.06', () => {
    const expected = 1200 * Math.pow(2, 1.06)
    expect(normalizeToDistance(1200, 5000, 10000)).toBeCloseTo(expected, 6)
  })

  it('honors custom riegelK', () => {
    const out = normalizeToDistance(1200, 5000, 10000, 1.0) // linear
    expect(out).toBeCloseTo(2400, 6)
  })

  it('returns 0 when fromDist is 0', () => {
    expect(normalizeToDistance(1200, 0, 10000)).toBe(0)
  })

  it('predicts shorter time for shorter distance', () => {
    const out = normalizeToDistance(2400, 10000, 5000)
    expect(out).toBeLessThan(1200)
  })

  it('handles k = 0 (constant time)', () => {
    expect(normalizeToDistance(1500, 5000, 42000, 0)).toBeCloseTo(1500, 6)
  })
})

// ===========================================================================
// 2. Discipline-specific pacing & physics
// ===========================================================================

describe('swimPacePer100m', () => {
  it('computes sec per 100m', () => {
    expect(swimPacePer100m(900, 1500)).toBe(60)
  })

  it('returns 0 for zero distance', () => {
    expect(swimPacePer100m(900, 0)).toBe(0)
  })

  it('returns 0 for negative distance', () => {
    expect(swimPacePer100m(900, -100)).toBe(0)
  })

  it('handles 100m exactly', () => {
    expect(swimPacePer100m(75, 100)).toBe(75)
  })

  it('handles fast swimmer', () => {
    expect(swimPacePer100m(1140, 1900)).toBeCloseTo(60, 6)
  })

  it('scales linearly with time', () => {
    expect(swimPacePer100m(1800, 1500)).toBe(120)
  })
})

describe('bikeSpeedKmh', () => {
  it('computes km/h', () => {
    expect(bikeSpeedKmh(40000, 3600)).toBeCloseTo(40, 6)
  })

  it('returns 0 for zero time', () => {
    expect(bikeSpeedKmh(40000, 0)).toBe(0)
  })

  it('returns 0 for negative time', () => {
    expect(bikeSpeedKmh(40000, -10)).toBe(0)
  })

  it('handles short ride', () => {
    expect(bikeSpeedKmh(20000, 1800)).toBeCloseTo(40, 6)
  })

  it('handles slow speed', () => {
    expect(bikeSpeedKmh(10000, 3600)).toBeCloseTo(10, 6)
  })

  it('handles zero distance', () => {
    expect(bikeSpeedKmh(0, 3600)).toBe(0)
  })
})

describe('runPacePerKm', () => {
  it('computes sec per km', () => {
    expect(runPacePerKm(3000, 10000)).toBe(300)
  })

  it('returns 0 for zero distance', () => {
    expect(runPacePerKm(3000, 0)).toBe(0)
  })

  it('returns 0 for negative distance', () => {
    expect(runPacePerKm(3000, -100)).toBe(0)
  })

  it('handles 5 min/km', () => {
    expect(runPacePerKm(1500, 5000)).toBe(300)
  })

  it('handles half marathon', () => {
    expect(runPacePerKm(6330, 21100)).toBeCloseTo(300, 4)
  })

  it('scales with time', () => {
    expect(runPacePerKm(6000, 10000)).toBe(600)
  })
})

describe('bikePower', () => {
  it('returns positive power for default flat ride', () => {
    expect(bikePower(10)).toBeGreaterThan(0)
  })

  it('returns 0 at zero speed', () => {
    expect(bikePower(0)).toBe(0)
  })

  it('aero dominates at high speed (cubic growth)', () => {
    const p10 = bikePower(10)
    const p20 = bikePower(20)
    expect(p20).toBeGreaterThan(p10 * 2)
  })

  it('matches aero+rolling formula on the flat', () => {
    const v = 10
    const cda = 0.3
    const rho = 1.225
    const crr = 0.004
    const mass = 75
    const g = 9.8067
    const expected =
      0.5 * rho * cda * Math.pow(v, 3) + crr * mass * g * v
    expect(bikePower(v)).toBeCloseTo(expected, 4)
  })

  it('uphill requires more power than flat', () => {
    const flat = bikePower(8, 0.3, 1.225, 0.004, 75, 0)
    const uphill = bikePower(8, 0.3, 1.225, 0.004, 75, 0.05)
    expect(uphill).toBeGreaterThan(flat)
  })

  it('clamps negative (steep descent) to 0', () => {
    const out = bikePower(5, 0.3, 1.225, 0.004, 75, -0.5)
    expect(out).toBe(0)
  })

  it('higher CdA increases power', () => {
    const low = bikePower(12, 0.25)
    const high = bikePower(12, 0.4)
    expect(high).toBeGreaterThan(low)
  })

  it('heavier rider needs more power uphill', () => {
    const light = bikePower(8, 0.3, 1.225, 0.004, 60, 0.03)
    const heavy = bikePower(8, 0.3, 1.225, 0.004, 90, 0.03)
    expect(heavy).toBeGreaterThan(light)
  })

  it('lower rolling resistance reduces power', () => {
    const slick = bikePower(10, 0.3, 1.225, 0.003)
    const rough = bikePower(10, 0.3, 1.225, 0.006)
    expect(slick).toBeLessThan(rough)
  })

  it('denser air increases aero power', () => {
    const thin = bikePower(12, 0.3, 1.0)
    const dense = bikePower(12, 0.3, 1.3)
    expect(dense).toBeGreaterThan(thin)
  })
})

// ===========================================================================
// 3. Format detection
// ===========================================================================

describe('triathlonFormat', () => {
  it('detects sprint at exact distances', () => {
    expect(triathlonFormat(750, 20000, 5000)).toBe('sprint')
  })

  it('detects olympic at 1500/40k/10k', () => {
    expect(triathlonFormat(1500, 40000, 10000)).toBe('olympic')
  })

  it('detects half-ironman (70.3)', () => {
    expect(triathlonFormat(1900, 90000, 21100)).toBe('half-ironman')
  })

  it('detects ironman', () => {
    expect(triathlonFormat(3800, 180000, 42200)).toBe('ironman')
  })

  it('detects olympic within +10% tolerance', () => {
    expect(triathlonFormat(1600, 43000, 10800)).toBe('olympic')
  })

  it('detects olympic within -10% tolerance', () => {
    expect(triathlonFormat(1400, 37000, 9200)).toBe('olympic')
  })

  it('detects sprint at upper tolerance edge', () => {
    expect(triathlonFormat(750 * 1.14, 20000 * 1.14, 5000 * 1.14)).toBe('sprint')
  })

  it('returns unknown when one leg is off', () => {
    // swim and bike sprint-ish but run is full marathon
    expect(triathlonFormat(750, 20000, 42200)).toBe('unknown')
  })

  it('returns unknown for all zeros', () => {
    expect(triathlonFormat(0, 0, 0)).toBe('unknown')
  })

  it('returns unknown for nonsense distances', () => {
    expect(triathlonFormat(100, 100, 100)).toBe('unknown')
  })

  it('returns unknown just beyond tolerance', () => {
    // 1500 * 1.16 = 1740 is beyond +15%
    expect(triathlonFormat(1740, 40000, 10000)).toBe('unknown')
  })

  it('detects ironman within tolerance', () => {
    expect(triathlonFormat(3700, 175000, 42000)).toBe('ironman')
  })

  it('does not confuse sprint with olympic', () => {
    expect(triathlonFormat(750, 20000, 5000)).not.toBe('olympic')
  })

  it('half-ironman tolerance band', () => {
    expect(triathlonFormat(1850, 88000, 21000)).toBe('half-ironman')
  })
})

// ===========================================================================
// 4. Performance ratios
// ===========================================================================

describe('swimBikeRunBalance', () => {
  it('is 0 when all ranks equal', () => {
    expect(swimBikeRunBalance(5, 5, 5)).toBe(0)
  })

  it('is positive when ranks differ', () => {
    expect(swimBikeRunBalance(1, 10, 20)).toBeGreaterThan(0)
  })

  it('computes population stdev', () => {
    // ranks 1,2,3 → mean 2 → variance (1+0+1)/3 = 0.6667 → stdev ~0.8165
    expect(swimBikeRunBalance(1, 2, 3)).toBeCloseTo(0.81649658, 6)
  })

  it('lower value means more balanced', () => {
    const balanced = swimBikeRunBalance(4, 5, 6)
    const lopsided = swimBikeRunBalance(1, 5, 30)
    expect(balanced).toBeLessThan(lopsided)
  })

  it('handles zeros', () => {
    expect(swimBikeRunBalance(0, 0, 0)).toBe(0)
  })

  it('symmetric to ordering', () => {
    expect(swimBikeRunBalance(1, 5, 9)).toBeCloseTo(
      swimBikeRunBalance(9, 1, 5),
      10,
    )
  })
})

describe('strongestDiscipline', () => {
  it('picks swim when it has lowest rank', () => {
    expect(strongestDiscipline(1, 5, 9)).toBe('swim')
  })

  it('picks bike when it has lowest rank', () => {
    expect(strongestDiscipline(8, 2, 9)).toBe('bike')
  })

  it('picks run when it has lowest rank', () => {
    expect(strongestDiscipline(8, 5, 1)).toBe('run')
  })

  it('tie resolves to swim first', () => {
    expect(strongestDiscipline(3, 3, 3)).toBe('swim')
  })

  it('tie between bike and run resolves to bike', () => {
    expect(strongestDiscipline(9, 2, 2)).toBe('bike')
  })

  it('tie between swim and run resolves to swim', () => {
    expect(strongestDiscipline(2, 9, 2)).toBe('swim')
  })

  it('handles all equal high ranks', () => {
    expect(strongestDiscipline(50, 50, 50)).toBe('swim')
  })
})

describe('fadeFactor', () => {
  it('is positive when athlete slows (second pace bigger)', () => {
    expect(fadeFactor(300, 330)).toBeGreaterThan(0)
  })

  it('is negative for a negative split', () => {
    expect(fadeFactor(300, 270)).toBeLessThan(0)
  })

  it('is 0 for identical paces', () => {
    expect(fadeFactor(300, 300)).toBe(0)
  })

  it('computes exact fraction', () => {
    expect(fadeFactor(300, 330)).toBeCloseTo(0.1, 10)
  })

  it('returns 0 when first pace is 0', () => {
    expect(fadeFactor(0, 300)).toBe(0)
  })

  it('returns 0 when first pace is negative', () => {
    expect(fadeFactor(-10, 300)).toBe(0)
  })

  it('large fade for big slowdown', () => {
    expect(fadeFactor(200, 400)).toBeCloseTo(1, 10)
  })
})

describe('transitionEfficiency', () => {
  it('is < 1 when faster than field', () => {
    expect(transitionEfficiency(40, 60)).toBeLessThan(1)
  })

  it('is > 1 when slower than field', () => {
    expect(transitionEfficiency(80, 60)).toBeGreaterThan(1)
  })

  it('is 1 at field average', () => {
    expect(transitionEfficiency(60, 60)).toBe(1)
  })

  it('computes exact ratio', () => {
    expect(transitionEfficiency(30, 60)).toBeCloseTo(0.5, 10)
  })

  it('returns 0 when field avg is 0', () => {
    expect(transitionEfficiency(40, 0)).toBe(0)
  })

  it('returns 0 when field avg negative', () => {
    expect(transitionEfficiency(40, -1)).toBe(0)
  })
})

// ===========================================================================
// 5. Fitness estimates
// ===========================================================================

describe('functionalThresholdPower', () => {
  it('is 95% of 20-min power', () => {
    expect(functionalThresholdPower(300)).toBeCloseTo(285, 10)
  })

  it('handles 0', () => {
    expect(functionalThresholdPower(0)).toBe(0)
  })

  it('scales linearly', () => {
    expect(functionalThresholdPower(200)).toBeCloseTo(190, 10)
  })

  it('handles high power', () => {
    expect(functionalThresholdPower(400)).toBeCloseTo(380, 10)
  })

  it('FTP is always below 20-min power', () => {
    expect(functionalThresholdPower(250)).toBeLessThan(250)
  })
})

describe('criticalSwimSpeed', () => {
  it('computes pace per 100m from differential', () => {
    // 400 in 360, 200 in 170 → dt=190, speed=200/190=1.0526 → 100/v=95s
    expect(criticalSwimSpeed(360, 170)).toBeCloseTo(95, 4)
  })

  it('returns 0 when differential is 0', () => {
    expect(criticalSwimSpeed(200, 200)).toBe(0)
  })

  it('returns 0 when t400 < t200 (invalid)', () => {
    expect(criticalSwimSpeed(150, 200)).toBe(0)
  })

  it('faster swimmer has lower pace', () => {
    const fast = criticalSwimSpeed(300, 145)
    const slow = criticalSwimSpeed(420, 200)
    expect(fast).toBeLessThan(slow)
  })

  it('positive for valid inputs', () => {
    expect(criticalSwimSpeed(400, 190)).toBeGreaterThan(0)
  })

  it('exact for clean numbers', () => {
    // dt=200, speed=1 m/s, pace=100s/100m
    expect(criticalSwimSpeed(400, 200)).toBeCloseTo(100, 6)
  })
})

describe('runningTSS', () => {
  it('is 100 for one hour at IF=1', () => {
    expect(runningTSS(3600, 1)).toBeCloseTo(100, 10)
  })

  it('scales with IF squared', () => {
    expect(runningTSS(3600, 0.8)).toBeCloseTo(64, 10)
  })

  it('scales with duration', () => {
    expect(runningTSS(7200, 1)).toBeCloseTo(200, 10)
  })

  it('returns 0 for zero duration', () => {
    expect(runningTSS(0, 0.9)).toBe(0)
  })

  it('returns 0 for negative duration', () => {
    expect(runningTSS(-10, 0.9)).toBe(0)
  })

  it('half hour at IF=1 is 50', () => {
    expect(runningTSS(1800, 1)).toBeCloseTo(50, 10)
  })

  it('low intensity yields low TSS', () => {
    expect(runningTSS(3600, 0.5)).toBeCloseTo(25, 10)
  })
})

describe('vo2maxEstimate', () => {
  it('returns 0 for zero time', () => {
    expect(vo2maxEstimate(0)).toBe(0)
  })

  it('returns 0 for negative time', () => {
    expect(vo2maxEstimate(-100)).toBe(0)
  })

  it('faster 5k yields higher VO2max', () => {
    const fast = vo2maxEstimate(1080) // 18:00
    const slow = vo2maxEstimate(1500) // 25:00
    expect(fast).toBeGreaterThan(slow)
  })

  it('positive for a typical 5k', () => {
    expect(vo2maxEstimate(1200)).toBeGreaterThan(0)
  })

  it('matches formula for a 20:00 5k', () => {
    const minutes = 1200 / 60
    const v = 5000 / minutes
    const expected = -4.6 + 0.182258 * v + 0.000104 * Math.pow(v, 2)
    expect(vo2maxEstimate(1200)).toBeCloseTo(expected, 6)
  })

  it('is in a plausible range for elite 5k', () => {
    const out = vo2maxEstimate(900) // 15:00
    expect(out).toBeGreaterThan(50)
    expect(out).toBeLessThan(90)
  })
})

// ===========================================================================
// 6. Race strategy
// ===========================================================================

describe('pacingStrategy', () => {
  it('returns even when actual matches plan', () => {
    expect(pacingStrategy([100, 100, 100, 100], [100, 100, 100, 100])).toBe('even')
  })

  it('returns negative when back half faster', () => {
    expect(pacingStrategy([100, 100, 100, 100], [105, 104, 96, 95])).toBe('negative')
  })

  it('returns positive when back half slower', () => {
    expect(pacingStrategy([100, 100, 100, 100], [95, 96, 105, 106])).toBe('positive')
  })

  it('returns erratic on mixed large deviations', () => {
    expect(pacingStrategy([100, 100, 100, 100], [80, 130, 70, 125])).toBe('erratic')
  })

  it('returns erratic for empty planned', () => {
    expect(pacingStrategy([], [100])).toBe('erratic')
  })

  it('returns erratic for empty actual', () => {
    expect(pacingStrategy([100], [])).toBe('erratic')
  })

  it('returns erratic for mismatched lengths', () => {
    expect(pacingStrategy([100, 100], [100])).toBe('erratic')
  })

  it('returns erratic when a planned split is 0', () => {
    expect(pacingStrategy([0, 100], [50, 100])).toBe('erratic')
  })

  it('even within 2% tolerance', () => {
    expect(pacingStrategy([100, 100], [100, 101])).toBe('even')
  })

  it('positive when single split is much slower than plan', () => {
    // mid=0 so falls back to plan adherence
    expect(pacingStrategy([100], [120])).toBe('positive')
  })

  it('negative when single split is much faster than plan', () => {
    expect(pacingStrategy([100], [80])).toBe('negative')
  })

  it('even for single split close to plan', () => {
    expect(pacingStrategy([100], [101])).toBe('even')
  })

  it('handles six even splits', () => {
    expect(pacingStrategy([90, 90, 90, 90, 90, 90], [90, 90, 90, 90, 90, 90])).toBe(
      'even',
    )
  })
})

describe('nutritionWindow', () => {
  it('uses default 60 g/hr', () => {
    expect(nutritionWindow(3600)).toBeCloseTo(60, 10)
  })

  it('scales with duration', () => {
    expect(nutritionWindow(7200)).toBeCloseTo(120, 10)
  })

  it('honors custom rate', () => {
    expect(nutritionWindow(3600, 90)).toBeCloseTo(90, 10)
  })

  it('returns 0 for zero duration', () => {
    expect(nutritionWindow(0)).toBe(0)
  })

  it('returns 0 for negative duration', () => {
    expect(nutritionWindow(-100)).toBe(0)
  })

  it('half hour at 60 g/hr is 30g', () => {
    expect(nutritionWindow(1800)).toBeCloseTo(30, 10)
  })

  it('ironman-length window is large', () => {
    expect(nutritionWindow(36000, 80)).toBeCloseTo(800, 6)
  })
})

describe('draftingLegalGap', () => {
  it('computes seconds to clear default 12m zone', () => {
    // 36 km/h = 10 m/s → 1.2s
    expect(draftingLegalGap(36)).toBeCloseTo(1.2, 6)
  })

  it('returns 0 for zero speed', () => {
    expect(draftingLegalGap(0)).toBe(0)
  })

  it('returns 0 for negative speed', () => {
    expect(draftingLegalGap(-10)).toBe(0)
  })

  it('honors custom draft zone', () => {
    // 36 km/h = 10 m/s, zone 20m → 2.0s
    expect(draftingLegalGap(36, 20)).toBeCloseTo(2, 6)
  })

  it('faster speed clears zone quicker', () => {
    expect(draftingLegalGap(45)).toBeLessThan(draftingLegalGap(30))
  })

  it('larger zone takes longer', () => {
    expect(draftingLegalGap(36, 24)).toBeGreaterThan(draftingLegalGap(36, 12))
  })
})

describe('negativeSplitAchieved', () => {
  it('true when second half faster', () => {
    expect(negativeSplitAchieved(1800, 1700)).toBe(true)
  })

  it('false when second half slower', () => {
    expect(negativeSplitAchieved(1700, 1800)).toBe(false)
  })

  it('false when halves equal', () => {
    expect(negativeSplitAchieved(1800, 1800)).toBe(false)
  })

  it('true for tiny improvement', () => {
    expect(negativeSplitAchieved(1800.1, 1800)).toBe(true)
  })

  it('handles zeros', () => {
    expect(negativeSplitAchieved(0, 0)).toBe(false)
  })
})

// ===========================================================================
// 7. DraftKings-style fantasy scoring
// ===========================================================================

function makeResult(overrides: Partial<DkTriathlonResult> = {}): DkTriathlonResult {
  return {
    overallPlace: 5,
    swimPlace: 5,
    bikePlace: 5,
    runPlace: 5,
    fastestSplitBonus: false,
    podium: false,
    ...overrides,
  }
}

describe('dkTriathlonPoints', () => {
  it('1st place = 50', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 1 }))).toBe(50)
  })

  it('2nd place = 40', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 2 }))).toBe(40)
  })

  it('3rd place = 32', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 3 }))).toBe(32)
  })

  it('4th place = 25 (top of scaled band)', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 4 }))).toBeCloseTo(25, 6)
  })

  it('10th place = 10 (bottom of scaled band)', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 10 }))).toBeCloseTo(10, 6)
  })

  it('7th place is mid band (~17.5)', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 7 }))).toBeCloseTo(17.5, 6)
  })

  it('11th place = 5 (out of band)', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 11 }))).toBe(5)
  })

  it('deep field place = 5', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 50 }))).toBe(5)
  })

  it('place ladder is monotonically non-increasing', () => {
    let prev = Infinity
    for (let place = 1; place <= 12; place++) {
      const pts = dkTriathlonPoints(makeResult({ overallPlace: place }))
      expect(pts).toBeLessThanOrEqual(prev)
      prev = pts
    }
  })

  it('adds fastest split bonus (+8)', () => {
    const base = dkTriathlonPoints(makeResult({ overallPlace: 5 }))
    const bonus = dkTriathlonPoints(makeResult({ overallPlace: 5, fastestSplitBonus: true }))
    expect(bonus - base).toBe(8)
  })

  it('adds podium bonus (+5)', () => {
    const base = dkTriathlonPoints(makeResult({ overallPlace: 5 }))
    const podium = dkTriathlonPoints(makeResult({ overallPlace: 5, podium: true }))
    expect(podium - base).toBe(5)
  })

  it('stacks both bonuses', () => {
    const out = dkTriathlonPoints(
      makeResult({ overallPlace: 1, fastestSplitBonus: true, podium: true }),
    )
    expect(out).toBe(50 + 8 + 5)
  })

  it('handles place 0 as 0 base', () => {
    expect(dkTriathlonPoints(makeResult({ overallPlace: 0 }))).toBe(0)
  })

  it('winner with both bonuses tops the chart', () => {
    const winner = dkTriathlonPoints(
      makeResult({ overallPlace: 1, fastestSplitBonus: true, podium: true }),
    )
    const tenth = dkTriathlonPoints(makeResult({ overallPlace: 10 }))
    expect(winner).toBeGreaterThan(tenth)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty input', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('averages a single result', () => {
    const r = makeResult({ overallPlace: 1 })
    expect(dkProjection([r])).toBe(50)
  })

  it('averages up to three recent results', () => {
    const results = [
      makeResult({ overallPlace: 1 }), // 50
      makeResult({ overallPlace: 2 }), // 40
      makeResult({ overallPlace: 3 }), // 32
    ]
    expect(dkProjection(results)).toBeCloseTo((50 + 40 + 32) / 3, 6)
  })

  it('only uses the most recent three', () => {
    const results = [
      makeResult({ overallPlace: 1 }), // 50
      makeResult({ overallPlace: 1 }), // 50
      makeResult({ overallPlace: 1 }), // 50
      makeResult({ overallPlace: 50 }), // ignored (5)
    ]
    expect(dkProjection(results)).toBeCloseTo(50, 6)
  })

  it('includes bonuses in projection', () => {
    const results = [makeResult({ overallPlace: 1, podium: true })] // 55
    expect(dkProjection(results)).toBe(55)
  })

  it('averages two results', () => {
    const results = [
      makeResult({ overallPlace: 1 }), // 50
      makeResult({ overallPlace: 3 }), // 32
    ]
    expect(dkProjection(results)).toBeCloseTo(41, 6)
  })
})
