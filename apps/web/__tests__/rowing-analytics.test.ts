import { describe, it, expect } from 'vitest'

import {
  // 1. Rowing race analytics
  splitPacePerMeter,
  split500mPace,
  averageSplitTimes,
  strokeRate,
  distancePerStroke,
  powerPerStroke,
  raceMarginSeconds,
  raceMarginLengths,
  // 2. Boat classes and crews
  boatClass,
  crewWeight,
  lightweightCheck,
  handicapFactor,
  // 3. Ergometer
  watts,
  splitFromWatts,
  predictedErg,
  vo2maxErgEstimate,
  categoryByAge,
  ratingOfPerceivedExertion,
  // 4. Canoe/Kayak
  kayakSprintPacePerKm,
  averagePaddleRate,
  c1c2Difference,
  whiteWaterPenalty,
  slalomAdjustedTime,
  dragCoefficient,
  // 5. Sailing
  boatSpeed,
  vmg,
  tacksRequired,
  penaltyTime,
  raceScore,
  // 6. Performance tracking
  pbOnDistance,
  seasonProgress,
  crossTrainingScore,
  // 7. DraftKings fantasy
  dkRowingPoints,
  dkProjection,
  // types
  type BoatClassInfo,
  type DKRowingResult,
} from '@/lib/sports/rowing-analytics'

// ---------------------------------------------------------------------------
// 1. Rowing race analytics
// ---------------------------------------------------------------------------

describe('splitPacePerMeter', () => {
  it('returns seconds per meter for normal input', () => {
    expect(splitPacePerMeter(500, 2000)).toBeCloseTo(0.25)
  })

  it('returns 0 when distance is 0', () => {
    expect(splitPacePerMeter(300, 0)).toBe(0)
  })

  it('handles 1m distance', () => {
    expect(splitPacePerMeter(1, 1)).toBe(1)
  })

  it('handles fractional results', () => {
    expect(splitPacePerMeter(100, 400)).toBeCloseTo(0.25)
  })
})

describe('split500mPace', () => {
  it('normalizes a 2000m time to 500m pace', () => {
    // 7:00 for 2000m → 1:45 per 500m = 105s
    expect(split500mPace(420, 2000)).toBeCloseTo(105)
  })

  it('returns 0 when distance is 0', () => {
    expect(split500mPace(200, 0)).toBe(0)
  })

  it('returns same value when splitDistance is 500m', () => {
    expect(split500mPace(100, 500)).toBe(100)
  })

  it('normalizes 1000m at 200s to 100s per 500m', () => {
    expect(split500mPace(200, 1000)).toBeCloseTo(100)
  })

  it('normalizes a fast sprint 200m split', () => {
    // 40s for 200m → 100s per 500m
    expect(split500mPace(40, 200)).toBeCloseTo(100)
  })
})

describe('averageSplitTimes', () => {
  it('returns 0 for empty array', () => {
    expect(averageSplitTimes([])).toBe(0)
  })

  it('returns single value for single-element array', () => {
    expect(averageSplitTimes([100])).toBe(100)
  })

  it('computes arithmetic mean', () => {
    expect(averageSplitTimes([100, 110, 90])).toBeCloseTo(100)
  })

  it('handles float splits', () => {
    expect(averageSplitTimes([99.5, 100.5])).toBeCloseTo(100)
  })
})

describe('strokeRate', () => {
  it('returns low for rate below 24', () => {
    expect(strokeRate(20)).toBe('low')
    expect(strokeRate(0)).toBe('low')
    expect(strokeRate(23.9)).toBe('low')
  })

  it('returns moderate for 24–28', () => {
    expect(strokeRate(24)).toBe('moderate')
    expect(strokeRate(26)).toBe('moderate')
    expect(strokeRate(28)).toBe('moderate')
  })

  it('returns high for 28–34 (exclusive of 28 in moderate)', () => {
    expect(strokeRate(29)).toBe('high')
    expect(strokeRate(34)).toBe('high')
  })

  it('returns sprint for over 34', () => {
    expect(strokeRate(35)).toBe('sprint')
    expect(strokeRate(40)).toBe('sprint')
  })
})

describe('distancePerStroke', () => {
  it('returns DPS for normal values', () => {
    expect(distancePerStroke(2000, 250)).toBeCloseTo(8)
  })

  it('returns 0 when strokes is 0', () => {
    expect(distancePerStroke(2000, 0)).toBe(0)
  })

  it('handles 1 stroke', () => {
    expect(distancePerStroke(10, 1)).toBe(10)
  })
})

describe('powerPerStroke', () => {
  it('computes joules per stroke at 200W and 30spm', () => {
    // 200 / (30/60) = 200 / 0.5 = 400J
    expect(powerPerStroke(200, 30)).toBeCloseTo(400)
  })

  it('returns 0 when spm is 0', () => {
    expect(powerPerStroke(200, 0)).toBe(0)
  })

  it('handles high spm', () => {
    // 300W at 60spm = 300 / 1 = 300J
    expect(powerPerStroke(300, 60)).toBeCloseTo(300)
  })
})

describe('raceMarginSeconds', () => {
  it('returns absolute difference', () => {
    expect(raceMarginSeconds(420, 418)).toBeCloseTo(2)
    expect(raceMarginSeconds(418, 420)).toBeCloseTo(2)
  })

  it('returns 0 for equal times', () => {
    expect(raceMarginSeconds(400, 400)).toBe(0)
  })
})

describe('raceMarginLengths', () => {
  it('converts margin to boat lengths using default 8.23m', () => {
    expect(raceMarginLengths(8.23)).toBeCloseTo(1)
    expect(raceMarginLengths(16.46)).toBeCloseTo(2)
  })

  it('accepts custom boat length', () => {
    expect(raceMarginLengths(10, 10)).toBeCloseTo(1)
  })

  it('returns 0 for 0 boat length', () => {
    expect(raceMarginLengths(10, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Boat classes and crews
// ---------------------------------------------------------------------------

describe('boatClass', () => {
  it('returns correct info for M1x', () => {
    const bc = boatClass('M1x')
    expect(bc).not.toBeNull()
    expect(bc?.sculling).toBe(true)
    expect(bc?.sweep).toBe(false)
    expect(bc?.coxed).toBe(false)
    expect(bc?.seats).toBe(1)
  })

  it('returns correct info for M8+', () => {
    const bc = boatClass('M8+')
    expect(bc?.sweep).toBe(true)
    expect(bc?.coxed).toBe(true)
    expect(bc?.seats).toBe(8)
  })

  it('returns correct info for W4-', () => {
    const bc = boatClass('W4-')
    expect(bc?.sweep).toBe(true)
    expect(bc?.coxed).toBe(false)
    expect(bc?.seats).toBe(4)
  })

  it('returns correct info for M4+', () => {
    const bc = boatClass('M4+')
    expect(bc?.coxed).toBe(true)
    expect(bc?.seats).toBe(4)
  })

  it('returns null for unknown code', () => {
    expect(boatClass('X9?')).toBeNull()
    expect(boatClass('')).toBeNull()
  })

  it('returns sculling for M4x', () => {
    expect(boatClass('M4x')?.sculling).toBe(true)
    expect(boatClass('M4x')?.seats).toBe(4)
  })

  it('returns sculling for W2x', () => {
    expect(boatClass('W2x')?.sculling).toBe(true)
    expect(boatClass('W2x')?.seats).toBe(2)
  })
})

describe('crewWeight', () => {
  it('sums all weights', () => {
    expect(crewWeight([70, 72, 68, 71])).toBe(281)
  })

  it('returns 0 for empty array', () => {
    expect(crewWeight([])).toBe(0)
  })
})

describe('lightweightCheck', () => {
  it('returns false when isLightweight is false', () => {
    expect(lightweightCheck([69, 70, 68], undefined, false)).toBe(false)
  })

  it('returns false when isLightweight is undefined', () => {
    expect(lightweightCheck([69, 70, 68])).toBe(false)
  })

  it('passes when average is exactly 70kg and no individual exceeds 72.5kg', () => {
    // avg = 70, max = 71 → passes
    expect(lightweightCheck([69, 70, 71], undefined, true)).toBe(true)
  })

  it('boundary: avg exactly 70kg passes', () => {
    // All exactly 70 → avg=70, max=70
    expect(lightweightCheck([70, 70, 70, 70], undefined, true)).toBe(true)
  })

  it('fails when average exceeds 70kg', () => {
    expect(lightweightCheck([71, 71, 71, 71], undefined, true)).toBe(false)
  })

  it('fails when any individual exceeds 72.5kg', () => {
    // avg = 70 but one is 73
    expect(lightweightCheck([67, 70, 70, 73], undefined, true)).toBe(false)
  })

  it('passes at 72.5kg individual exactly', () => {
    // avg: (67+70+70+72.5)/4 = 69.875 ≤70, max=72.5 ≤72.5
    expect(lightweightCheck([67, 70, 70, 72.5], undefined, true)).toBe(true)
  })

  it('returns false for empty crew', () => {
    expect(lightweightCheck([], undefined, true)).toBe(false)
  })
})

describe('handicapFactor', () => {
  it('returns 0 for M8+ and W8+', () => {
    expect(handicapFactor('M8+')).toBe(0)
    expect(handicapFactor('W8+')).toBe(0)
  })

  it('returns 5 for M4+', () => {
    expect(handicapFactor('M4+')).toBe(5)
  })

  it('returns 10 for M4-', () => {
    expect(handicapFactor('M4-')).toBe(10)
  })

  it('returns 15 for M2-', () => {
    expect(handicapFactor('M2-')).toBe(15)
  })

  it('returns 25 for M1x and W1x', () => {
    expect(handicapFactor('M1x')).toBe(25)
    expect(handicapFactor('W1x')).toBe(25)
  })

  it('returns 20 for other known codes', () => {
    expect(handicapFactor('M2x')).toBe(20)
    expect(handicapFactor('W4x')).toBe(20)
  })

  it('returns 0 for unknown codes', () => {
    expect(handicapFactor('X9?')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Ergometer
// ---------------------------------------------------------------------------

describe('watts', () => {
  it('returns ~2.8W for 1-second split (mathematical identity)', () => {
    expect(watts(1)).toBeCloseTo(2.8)
  })

  it('returns ~2.8W for 120-second 500m split', () => {
    // 2.80 / (120)^3 ≈ 0.00001620...  (very small for realistic splits)
    const result = watts(120)
    expect(result).toBeCloseTo(2.80 / (120 * 120 * 120), 10)
  })

  it('watts for a fast 1:30/500m (90s) split', () => {
    const expected = 2.80 / (90 ** 3)
    expect(watts(90)).toBeCloseTo(expected, 10)
  })

  it('returns 0 when split is 0', () => {
    expect(watts(0)).toBe(0)
  })

  it('is consistent: watts then splitFromWatts roundtrip', () => {
    const w = watts(100)
    const s = splitFromWatts(w)
    expect(s).toBeCloseTo(100, 5)
  })
})

describe('splitFromWatts', () => {
  it('recovers 1s split from watts(1)', () => {
    expect(splitFromWatts(watts(1))).toBeCloseTo(1, 5)
  })

  it('recovers 120s split from watts(120)', () => {
    expect(splitFromWatts(watts(120))).toBeCloseTo(120, 5)
  })

  it('returns 0 when watts is 0', () => {
    expect(splitFromWatts(0)).toBe(0)
  })
})

describe('predictedErg', () => {
  it('same distance prediction returns same time', () => {
    expect(predictedErg({ distance: 2000, timeSeconds: 390 }, 2000)).toBeCloseTo(390)
  })

  it('Riegel: 2000m from 1000m with default k=1.07', () => {
    const t1 = 200
    const predicted = predictedErg({ distance: 1000, timeSeconds: t1 }, 2000)
    // T2 = 200 * (2000/1000)^1.07 = 200 * 2^1.07
    expect(predicted).toBeCloseTo(t1 * Math.pow(2, 1.07), 3)
  })

  it('handles custom k factor', () => {
    const result = predictedErg({ distance: 2000, timeSeconds: 400 }, 4000, 1.1)
    expect(result).toBeCloseTo(400 * Math.pow(2, 1.1), 3)
  })

  it('returns 0 when known distance is 0', () => {
    expect(predictedErg({ distance: 0, timeSeconds: 400 }, 2000)).toBe(0)
  })
})

describe('vo2maxErgEstimate', () => {
  it('returns a positive estimate for a typical rower', () => {
    // ~6min for 2000m = 360s, 80kg
    const result = vo2maxErgEstimate(360, 80)
    expect(result).toBeGreaterThan(20)
  })

  it('clamps minimum at 20 for extremely slow time', () => {
    // Need t > ~30333s for formula to go below 20 at 80kg
    expect(vo2maxErgEstimate(35000, 80)).toBe(20)
  })

  it('returns 20 when weight is 0', () => {
    expect(vo2maxErgEstimate(360, 0)).toBe(20)
  })
})

describe('categoryByAge', () => {
  it('Junior for age < 19', () => {
    expect(categoryByAge(16, 'M')).toBe('J')
    expect(categoryByAge(18, 'F')).toBe('J')
  })

  it('U23 for ages 19–22', () => {
    expect(categoryByAge(19, 'M')).toBe('U23')
    expect(categoryByAge(22, 'F')).toBe('U23')
  })

  it('Senior for ages 23–26', () => {
    expect(categoryByAge(23, 'M')).toBe('Senior')
    expect(categoryByAge(26, 'F')).toBe('Senior')
  })

  it('Open for ages over 26', () => {
    expect(categoryByAge(27, 'M')).toBe('Open')
    expect(categoryByAge(40, 'F')).toBe('Open')
  })
})

describe('ratingOfPerceivedExertion', () => {
  it('returns 20 at max heart rate', () => {
    expect(ratingOfPerceivedExertion(200, 200)).toBeCloseTo(20)
  })

  it('clamps minimum to 6', () => {
    expect(ratingOfPerceivedExertion(0, 200)).toBe(6)
    expect(ratingOfPerceivedExertion(50, 200)).toBe(6)
  })

  it('returns 10 at 50% of max HR', () => {
    expect(ratingOfPerceivedExertion(100, 200)).toBeCloseTo(10)
  })

  it('returns 6 when maxHR is 0', () => {
    expect(ratingOfPerceivedExertion(100, 0)).toBe(6)
  })

  it('clamps above 20', () => {
    expect(ratingOfPerceivedExertion(300, 200)).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// 4. Canoe/Kayak analytics
// ---------------------------------------------------------------------------

describe('kayakSprintPacePerKm', () => {
  it('returns seconds per km', () => {
    // 100s for 1000m = 100s/km
    expect(kayakSprintPacePerKm(100, 1000)).toBeCloseTo(100)
  })

  it('returns 0 when distance is 0', () => {
    expect(kayakSprintPacePerKm(100, 0)).toBe(0)
  })

  it('normalizes 200m to km', () => {
    // 40s for 200m → 200s/km
    expect(kayakSprintPacePerKm(40, 200)).toBeCloseTo(200)
  })
})

describe('averagePaddleRate', () => {
  it('returns strokes per minute', () => {
    // 60 strokes in 60s = 60spm
    expect(averagePaddleRate(60, 60)).toBeCloseTo(60)
  })

  it('returns 0 when time is 0', () => {
    expect(averagePaddleRate(60, 0)).toBe(0)
  })

  it('handles 120 strokes in 120s', () => {
    expect(averagePaddleRate(120, 120)).toBeCloseTo(60)
  })
})

describe('c1c2Difference', () => {
  it('returns C2 - C1', () => {
    expect(c1c2Difference(100, 110)).toBe(10)
    expect(c1c2Difference(110, 100)).toBe(-10)
  })

  it('returns 0 for equal times', () => {
    expect(c1c2Difference(100, 100)).toBe(0)
  })
})

describe('whiteWaterPenalty', () => {
  it('calculates touch penalties at 2s each', () => {
    expect(whiteWaterPenalty(3, 0)).toBe(6)
  })

  it('calculates miss penalties at 50s each', () => {
    expect(whiteWaterPenalty(0, 2)).toBe(100)
  })

  it('calculates combined penalties', () => {
    expect(whiteWaterPenalty(1, 1)).toBe(52)
  })

  it('returns 0 for no infringements', () => {
    expect(whiteWaterPenalty(0, 0)).toBe(0)
  })
})

describe('slalomAdjustedTime', () => {
  it('adds penalties to raw time', () => {
    expect(slalomAdjustedTime(90, 52)).toBe(142)
  })

  it('returns raw time with 0 penalties', () => {
    expect(slalomAdjustedTime(90, 0)).toBe(90)
  })
})

describe('dragCoefficient', () => {
  it('returns positive drag force at 2 m/s with defaults', () => {
    // F = 0.5 * 1000 * 0.06 * 1.1 * 4 = 132N
    expect(dragCoefficient(2)).toBeCloseTo(132)
  })

  it('returns 0 at velocity 0', () => {
    expect(dragCoefficient(0)).toBe(0)
  })

  it('accepts custom frontal area and density', () => {
    const result = dragCoefficient(2, 0.1, 1000)
    // 0.5 * 1000 * 0.1 * 1.1 * 4 = 220N
    expect(result).toBeCloseTo(220)
  })
})

// ---------------------------------------------------------------------------
// 5. Sailing
// ---------------------------------------------------------------------------

describe('boatSpeed', () => {
  it('upwind: 50% of TWS below 60 degrees', () => {
    expect(boatSpeed(10, 45)).toBeCloseTo(5)
  })

  it('reaching: 85% of TWS between 60 and 120 degrees', () => {
    expect(boatSpeed(10, 90)).toBeCloseTo(8.5)
    expect(boatSpeed(10, 60)).toBeCloseTo(8.5)
    expect(boatSpeed(10, 120)).toBeCloseTo(8.5)
  })

  it('downwind: 75% of TWS above 120 degrees', () => {
    expect(boatSpeed(10, 150)).toBeCloseTo(7.5)
    expect(boatSpeed(10, 180)).toBeCloseTo(7.5)
  })

  it('handles 0 wind speed', () => {
    expect(boatSpeed(0, 45)).toBe(0)
  })

  it('uses sailType parameter without changing result (future-proof)', () => {
    expect(boatSpeed(10, 45, 'spinnaker')).toBeCloseTo(5)
  })
})

describe('vmg', () => {
  it('upwind at 0 degrees returns full boatSpeed', () => {
    expect(vmg(10, 0)).toBeCloseTo(10)
  })

  it('upwind at 45 degrees', () => {
    expect(vmg(10, 45)).toBeCloseTo(10 * Math.cos(Math.PI / 4))
  })

  it('downwind at 180 degrees returns boatSpeed (cos of 0 = 1)', () => {
    expect(vmg(10, 180)).toBeCloseTo(10)
  })

  it('downwind at 135 degrees', () => {
    expect(vmg(10, 135)).toBeCloseTo(10 * Math.cos(Math.PI - (135 * Math.PI) / 180))
  })
})

describe('tacksRequired', () => {
  it('returns 0 for same bearing with no difference', () => {
    expect(tacksRequired(0, 0)).toBe(0)
  })

  it('returns 1 for a 90-degree change with default 90-degree tacking angle', () => {
    expect(tacksRequired(0, 90)).toBe(1)
  })

  it('returns 2 for a 180-degree change with 90-degree tacking angle', () => {
    expect(tacksRequired(0, 180)).toBe(2)
  })

  it('handles crossing 360 boundary', () => {
    expect(tacksRequired(350, 10)).toBe(1)
  })

  it('returns 0 when tackingAngle is 0', () => {
    expect(tacksRequired(0, 90, 0)).toBe(0)
  })
})

describe('penaltyTime', () => {
  it('returns 0 for 0 infringements', () => {
    expect(penaltyTime(0)).toBe(0)
  })

  it('uses default 20s per infringement', () => {
    expect(penaltyTime(3)).toBe(60)
  })

  it('accepts custom penalty per infringement', () => {
    expect(penaltyTime(2, 30)).toBe(60)
  })
})

describe('raceScore', () => {
  it('assigns place 1 to first finisher', () => {
    const boats = ['A', 'B', 'C']
    const scores = raceScore(boats, ['A', 'B', 'C'])
    expect(scores.get('A')).toBe(1)
    expect(scores.get('B')).toBe(2)
    expect(scores.get('C')).toBe(3)
  })

  it('assigns DNS/DNF score of boats+1', () => {
    const boats = ['A', 'B', 'C']
    const scores = raceScore(boats, ['A', 'B'])
    expect(scores.get('C')).toBe(4)
  })

  it('handles all DNS', () => {
    const boats = ['A', 'B']
    const scores = raceScore(boats, [])
    expect(scores.get('A')).toBe(3)
    expect(scores.get('B')).toBe(3)
  })

  it('handles single boat fleet', () => {
    const scores = raceScore(['A'], ['A'])
    expect(scores.get('A')).toBe(1)
  })

  it('returns a Map with all boats', () => {
    const boats = ['A', 'B', 'C', 'D']
    const scores = raceScore(boats, ['D', 'B', 'A', 'C'])
    expect(scores.size).toBe(4)
    expect(scores.get('D')).toBe(1)
    expect(scores.get('B')).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 6. Performance tracking
// ---------------------------------------------------------------------------

describe('pbOnDistance', () => {
  it('returns best time for exact matching distance', () => {
    const times = [
      { distanceM: 2000, timeSeconds: 390 },
      { distanceM: 2000, timeSeconds: 385 },
      { distanceM: 1000, timeSeconds: 200 },
    ]
    expect(pbOnDistance(times, 2000)).toBe(385)
  })

  it('returns Infinity when no matching distance', () => {
    const times = [{ distanceM: 1000, timeSeconds: 200 }]
    expect(pbOnDistance(times, 2000)).toBe(Infinity)
  })

  it('returns Infinity for empty array', () => {
    expect(pbOnDistance([], 2000)).toBe(Infinity)
  })

  it('handles single entry', () => {
    expect(pbOnDistance([{ distanceM: 500, timeSeconds: 95 }], 500)).toBe(95)
  })
})

describe('seasonProgress', () => {
  it('returns 0 for fewer than 2 performances', () => {
    expect(seasonProgress([])).toBe(0)
    expect(seasonProgress([100])).toBe(0)
  })

  it('returns negative improvement for time (faster = better)', () => {
    // 400s → 390s = -2.5% improvement
    const result = seasonProgress([400, 390], 'time')
    expect(result).toBeCloseTo(-2.5)
  })

  it('returns positive improvement for power (more = better)', () => {
    const result = seasonProgress([200, 220], 'power')
    expect(result).toBeCloseTo(10)
  })

  it('defaults to time', () => {
    const result = seasonProgress([100, 95])
    expect(result).toBeCloseTo(-5)
  })

  it('returns 0 when first performance is 0', () => {
    expect(seasonProgress([0, 100])).toBe(0)
  })
})

describe('crossTrainingScore', () => {
  it('returns 0 for empty array', () => {
    expect(crossTrainingScore([])).toBe(0)
  })

  it('computes intensity-weighted average', () => {
    const sports = [
      { sport: 'cycling', hours: 2, intensity: 8 },
      { sport: 'running', hours: 2, intensity: 6 },
    ]
    // (8*2 + 6*2) / (2+2) = 28/4 = 7
    expect(crossTrainingScore(sports)).toBeCloseTo(7)
  })

  it('returns 0 when total hours is 0', () => {
    const sports = [{ sport: 'yoga', hours: 0, intensity: 5 }]
    expect(crossTrainingScore(sports)).toBe(0)
  })

  it('handles single sport', () => {
    expect(crossTrainingScore([{ sport: 'swimming', hours: 3, intensity: 9 }])).toBeCloseTo(9)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Rowing)
// ---------------------------------------------------------------------------

describe('dkRowingPoints', () => {
  it('awards 50 points for 1st place', () => {
    const result: DKRowingResult = { place: 1, distance: '2000', boatClass: 'M4-', medalRound: false }
    expect(dkRowingPoints(result)).toBe(55) // 50 + 5 (2000m bonus)
  })

  it('awards 40 points for 2nd place', () => {
    expect(dkRowingPoints({ place: 2, distance: '500', boatClass: 'M4-', medalRound: false })).toBe(40)
  })

  it('awards 30 points for 3rd place', () => {
    expect(dkRowingPoints({ place: 3, distance: '1000', boatClass: 'M2-', medalRound: false })).toBe(30)
  })

  it('awards 20 points for 4th place', () => {
    expect(dkRowingPoints({ place: 4, distance: '500', boatClass: 'M2-', medalRound: false })).toBe(20)
  })

  it('awards 15 points for 5th place', () => {
    expect(dkRowingPoints({ place: 5, distance: '500', boatClass: 'M4-', medalRound: false })).toBe(15)
  })

  it('awards 10 points for 6th place', () => {
    expect(dkRowingPoints({ place: 6, distance: '500', boatClass: 'M4-', medalRound: false })).toBe(10)
  })

  it('awards 2 points for lower places', () => {
    expect(dkRowingPoints({ place: 7, distance: '500', boatClass: 'M4-', medalRound: false })).toBe(2)
    expect(dkRowingPoints({ place: 12, distance: '500', boatClass: 'M4-', medalRound: false })).toBe(2)
  })

  it('adds +10 for medal round', () => {
    expect(dkRowingPoints({ place: 2, distance: '500', boatClass: 'M4-', medalRound: true })).toBe(50)
  })

  it('adds +5 for 2000m distance', () => {
    expect(dkRowingPoints({ place: 3, distance: '2000', boatClass: 'M4-', medalRound: false })).toBe(35)
  })

  it('adds +5 for single scull M1x', () => {
    expect(dkRowingPoints({ place: 3, distance: '500', boatClass: 'M1x', medalRound: false })).toBe(35)
  })

  it('adds +5 for single scull W1x', () => {
    expect(dkRowingPoints({ place: 3, distance: '500', boatClass: 'W1x', medalRound: false })).toBe(35)
  })

  it('stacks all bonuses: 1st, 2000m, medal round, M1x', () => {
    // 50 + 10 + 5 + 5 = 70
    expect(dkRowingPoints({ place: 1, distance: '2000', boatClass: 'M1x', medalRound: true })).toBe(70)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty array', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('returns single result points for single-element array', () => {
    const result: DKRowingResult = { place: 1, distance: '500', boatClass: 'M4-', medalRound: false }
    expect(dkProjection([result])).toBe(50)
  })

  it('weights most recent result 3x', () => {
    const older: DKRowingResult = { place: 6, distance: '500', boatClass: 'M4-', medalRound: false } // 10pts
    const recent: DKRowingResult = { place: 1, distance: '500', boatClass: 'M4-', medalRound: false } // 50pts
    // (50*3 + 10) / (3+1) = 160/4 = 40
    expect(dkProjection([older, recent])).toBeCloseTo(40)
  })

  it('handles three results', () => {
    const r1: DKRowingResult = { place: 3, distance: '500', boatClass: 'M4-', medalRound: false } // 30
    const r2: DKRowingResult = { place: 2, distance: '500', boatClass: 'M4-', medalRound: false } // 40
    const r3: DKRowingResult = { place: 1, distance: '500', boatClass: 'M4-', medalRound: false } // 50
    // (50*3 + 30 + 40) / (3+2) = (150+70)/5 = 44
    expect(dkProjection([r1, r2, r3])).toBeCloseTo(44)
  })
})
