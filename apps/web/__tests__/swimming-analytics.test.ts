import { describe, it, expect } from 'vitest'

import {
  // 1. Basic timing and splits
  splitTime,
  splitTimes,
  averageSplitTime,
  fastestSplit,
  slowestSplit,
  splitDifferential,
  negativeSpiltRate,
  // 2. Stroke rate and technique
  strokeRate,
  strokeRatePerMinute,
  distancePerStroke,
  strokeIndex,
  strokeEfficiencyScore,
  swimVelocity,
  // 3. Turn and underwater analysis
  turnTime,
  underwaterDistance,
  reactionTime,
  startEfficiency,
  turnEfficiencyScore,
  totalTurnTime,
  // 4. Race pace analytics
  targetPace,
  pacePer100m,
  pacePer50m,
  percentageOfBestTime,
  timeDropNeeded,
  projectedTime,
  raceQualityScore,
  // 5. Event-specific analytics
  eventDistance,
  expectedSplitPattern,
  strokes,
  isSprintEvent,
  isDistanceEvent,
  eventDifficultyWeight,
  // 6. Team relay analytics
  relayLeadOff,
  relayExchangeTime,
  relayTeamTime,
  optimalRelayOrder,
  relayProjectedTime,
  // 7. DraftKings fantasy
  dkSwimScore,
  dkProjectedScore,
  dkValueScore,
  // Types
  type SwimEvent,
  type DKSwimStats,
  type RelaySwimmer,
} from '@/lib/sports/swimming-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps
}

// ---------------------------------------------------------------------------
// 1. Basic timing and splits
// ---------------------------------------------------------------------------

describe('splitTime', () => {
  it('divides totalTime by splits', () => {
    expect(splitTime(60, 4)).toBe(15)
  })

  it('returns 0 when splits is 0', () => {
    expect(splitTime(60, 0)).toBe(0)
  })

  it('handles non-integer result', () => {
    expect(approx(splitTime(100, 3), 100 / 3)).toBe(true)
  })

  it('returns totalTime when splits is 1', () => {
    expect(splitTime(45.5, 1)).toBe(45.5)
  })
})

describe('splitTimes', () => {
  it('returns cumulative sum', () => {
    expect(splitTimes([10, 11, 12])).toEqual([10, 21, 33])
  })

  it('returns empty array for empty input', () => {
    expect(splitTimes([])).toEqual([])
  })

  it('single element returns itself', () => {
    expect(splitTimes([30])).toEqual([30])
  })

  it('works with decimal lap times', () => {
    const result = splitTimes([13.5, 14.2, 13.8])
    expect(approx(result[0]!, 13.5)).toBe(true)
    expect(approx(result[1]!, 27.7)).toBe(true)
    expect(approx(result[2]!, 41.5)).toBe(true)
  })
})

describe('averageSplitTime', () => {
  it('returns mean of lapTimes', () => {
    expect(averageSplitTime([10, 20, 30])).toBe(20)
  })

  it('returns 0 for empty array', () => {
    expect(averageSplitTime([])).toBe(0)
  })

  it('returns the value for single element', () => {
    expect(averageSplitTime([42])).toBe(42)
  })

  it('handles decimal values', () => {
    expect(approx(averageSplitTime([13.5, 14.5]), 14)).toBe(true)
  })
})

describe('fastestSplit', () => {
  it('returns minimum lap time', () => {
    expect(fastestSplit([14, 12, 13])).toBe(12)
  })

  it('returns Infinity for empty array', () => {
    expect(fastestSplit([])).toBe(Infinity)
  })

  it('handles single element', () => {
    expect(fastestSplit([25])).toBe(25)
  })
})

describe('slowestSplit', () => {
  it('returns maximum lap time', () => {
    expect(slowestSplit([14, 12, 16])).toBe(16)
  })

  it('returns -Infinity for empty array', () => {
    expect(slowestSplit([])).toBe(-Infinity)
  })

  it('handles single element', () => {
    expect(slowestSplit([25])).toBe(25)
  })
})

describe('splitDifferential', () => {
  it('returns positive for positive split (slower second half)', () => {
    expect(splitDifferential(28, 30)).toBe(2)
  })

  it('returns negative for negative split (faster second half)', () => {
    expect(splitDifferential(30, 28)).toBe(-2)
  })

  it('returns 0 for even split', () => {
    expect(splitDifferential(29, 29)).toBe(0)
  })
})

describe('negativeSpiltRate', () => {
  it('returns fraction of negative splits', () => {
    const races = [
      { firstHalf: 30, secondHalf: 28 }, // negative split
      { firstHalf: 28, secondHalf: 31 }, // positive split
      { firstHalf: 29, secondHalf: 27 }, // negative split
    ]
    expect(approx(negativeSpiltRate(races), 2 / 3)).toBe(true)
  })

  it('returns 0 for empty array', () => {
    expect(negativeSpiltRate([])).toBe(0)
  })

  it('returns 1.0 when all races have negative splits', () => {
    const races = [
      { firstHalf: 30, secondHalf: 28 },
      { firstHalf: 31, secondHalf: 29 },
    ]
    expect(negativeSpiltRate(races)).toBe(1)
  })

  it('returns 0 when no races have negative splits', () => {
    const races = [
      { firstHalf: 28, secondHalf: 30 },
      { firstHalf: 29, secondHalf: 31 },
    ]
    expect(negativeSpiltRate(races)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Stroke rate and technique
// ---------------------------------------------------------------------------

describe('strokeRate', () => {
  it('calculates strokes per second', () => {
    expect(strokeRate(60, 30)).toBe(2)
  })

  it('returns 0 when durationSeconds is 0', () => {
    expect(strokeRate(60, 0)).toBe(0)
  })

  it('handles fractional result', () => {
    expect(approx(strokeRate(45, 30), 1.5)).toBe(true)
  })
})

describe('strokeRatePerMinute', () => {
  it('calculates strokes per minute', () => {
    expect(approx(strokeRatePerMinute(60, 60), 60)).toBe(true)
  })

  it('returns 0 when durationSeconds is 0', () => {
    expect(strokeRatePerMinute(60, 0)).toBe(0)
  })

  it('converts correctly from per-second to per-minute', () => {
    expect(approx(strokeRatePerMinute(30, 30), 60)).toBe(true)
  })
})

describe('distancePerStroke', () => {
  it('calculates meters per stroke', () => {
    expect(distancePerStroke(100, 50)).toBe(2)
  })

  it('returns 0 when totalStrokes is 0', () => {
    expect(distancePerStroke(100, 0)).toBe(0)
  })

  it('handles fractional result', () => {
    expect(approx(distancePerStroke(100, 45), 100 / 45)).toBe(true)
  })
})

describe('strokeIndex', () => {
  it('multiplies velocity by distancePerStroke', () => {
    expect(strokeIndex(2.0, 1.8)).toBeCloseTo(3.6)
  })

  it('returns 0 when either is 0', () => {
    expect(strokeIndex(0, 1.8)).toBe(0)
    expect(strokeIndex(2.0, 0)).toBe(0)
  })
})

describe('strokeEfficiencyScore', () => {
  it('calculates efficiency with default targetDPS', () => {
    // (2/2)*100 - 1/2 = 100 - 0.5 = 99.5
    const score = strokeEfficiencyScore(2.0, 1.0)
    expect(approx(score, 99.5)).toBe(true)
  })

  it('clamps to 0 minimum', () => {
    // very high stroke rate with low dps
    const score = strokeEfficiencyScore(0.1, 200, 2.0)
    expect(score).toBe(0)
  })

  it('clamps to 100 maximum', () => {
    // very high dps with no stroke rate
    const score = strokeEfficiencyScore(10.0, 0, 2.0)
    expect(score).toBe(100)
  })

  it('uses custom targetDPS', () => {
    // (2.5/2.5)*100 - 0 = 100
    const score = strokeEfficiencyScore(2.5, 0, 2.5)
    expect(score).toBe(100)
  })
})

describe('swimVelocity', () => {
  it('calculates m/s correctly', () => {
    expect(swimVelocity(100, 50)).toBe(2)
  })

  it('returns 0 when timeSeconds is 0', () => {
    expect(swimVelocity(100, 0)).toBe(0)
  })

  it('handles fractional velocity', () => {
    expect(approx(swimVelocity(200, 120), 200 / 120)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3. Turn and underwater analysis
// ---------------------------------------------------------------------------

describe('turnTime', () => {
  it('calculates pushOff minus wallTouch', () => {
    expect(turnTime(50.0, 50.7)).toBeCloseTo(0.7)
  })

  it('returns negative if pushOff before wallTouch (edge case)', () => {
    expect(turnTime(50.5, 50.0)).toBeCloseTo(-0.5)
  })
})

describe('underwaterDistance', () => {
  it('multiplies pullout count by avg distance', () => {
    expect(underwaterDistance(4, 7.5)).toBe(30)
  })

  it('returns 0 when pulloutCount is 0', () => {
    expect(underwaterDistance(0, 7.5)).toBe(0)
  })
})

describe('reactionTime', () => {
  it('calculates leavingBlock minus startSignal', () => {
    expect(approx(reactionTime(0, 0.65), 0.65)).toBe(true)
  })

  it('handles non-zero startSignalTime', () => {
    expect(approx(reactionTime(100, 100.65), 0.65)).toBe(true)
  })
})

describe('startEfficiency', () => {
  it('calculates 1 - (reactionTime / firstSplitTime)', () => {
    // 1 - (0.65/13) ≈ 0.95
    const eff = startEfficiency(0.65, 13)
    expect(approx(eff, 1 - 0.65 / 13)).toBe(true)
  })

  it('returns 0 when firstSplitTime is 0', () => {
    expect(startEfficiency(0.65, 0)).toBe(0)
  })

  it('clamps to 0 minimum', () => {
    // reactionTime > firstSplitTime
    const eff = startEfficiency(5, 3)
    expect(eff).toBe(0)
  })

  it('clamps to 1 maximum', () => {
    // reactionTime is negative (impossible but check clamping)
    const eff = startEfficiency(-1, 13)
    expect(eff).toBe(1)
  })
})

describe('turnEfficiencyScore', () => {
  it('returns 100 for turn matching benchmark exactly', () => {
    // (1 - (0.8 - 0.8)/0.8) * 100 = 100
    expect(approx(turnEfficiencyScore(0.8), 100)).toBe(true)
  })

  it('returns <100 for slower turn', () => {
    const score = turnEfficiencyScore(1.0, 0.8)
    expect(score).toBeLessThan(100)
  })

  it('clamps to 0 minimum', () => {
    const score = turnEfficiencyScore(5.0, 0.8)
    expect(score).toBe(0)
  })

  it('uses default benchmark of 0.8', () => {
    const withDefault = turnEfficiencyScore(1.0)
    const withExplicit = turnEfficiencyScore(1.0, 0.8)
    expect(approx(withDefault, withExplicit)).toBe(true)
  })

  it('clamps to 100 maximum for very fast turn', () => {
    // (1 - (0.1 - 0.8)/0.8) * 100 = (1 + 0.875)*100 = 187.5 -> clamped to 100
    const score = turnEfficiencyScore(0.1, 0.8)
    expect(score).toBe(100)
  })

  it('returns 0 when benchmarkTurnTime is 0', () => {
    expect(turnEfficiencyScore(0.8, 0)).toBe(0)
  })
})

describe('totalTurnTime', () => {
  it('returns sum of turnTimes', () => {
    expect(totalTurnTime([13, 14, 13, 14], [0.8, 0.9, 0.7, 0.85])).toBeCloseTo(3.25)
  })

  it('throws on length mismatch', () => {
    expect(() => totalTurnTime([13, 14, 13], [0.8, 0.9])).toThrow()
  })

  it('works with empty arrays', () => {
    expect(totalTurnTime([], [])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Race pace analytics
// ---------------------------------------------------------------------------

describe('targetPace', () => {
  it('calculates seconds per 100m', () => {
    // 200m in 120s -> 60s per 100m
    expect(targetPace(200, 120)).toBe(60)
  })

  it('returns 0 when distanceMeters is 0', () => {
    expect(targetPace(0, 120)).toBe(0)
  })

  it('handles 100m distance', () => {
    expect(targetPace(100, 47)).toBe(47)
  })
})

describe('pacePer100m', () => {
  it('calculates seconds per 100m', () => {
    expect(pacePer100m(120, 200)).toBe(60)
  })

  it('returns 0 when distanceMeters is 0', () => {
    expect(pacePer100m(120, 0)).toBe(0)
  })
})

describe('pacePer50m', () => {
  it('calculates seconds per 50m', () => {
    expect(pacePer50m(120, 200)).toBe(30)
  })

  it('returns 0 when distanceMeters is 0', () => {
    expect(pacePer50m(120, 0)).toBe(0)
  })
})

describe('percentageOfBestTime', () => {
  it('returns 100 when raceTime equals personalBest', () => {
    expect(percentageOfBestTime(47, 47)).toBe(100)
  })

  it('returns >100 when raceTime is slower than PB', () => {
    expect(percentageOfBestTime(48, 47)).toBeGreaterThan(100)
  })

  it('returns <100 when raceTime is faster than PB (new PB)', () => {
    expect(percentageOfBestTime(46, 47)).toBeLessThan(100)
  })

  it('returns 0 when personalBest is 0', () => {
    expect(percentageOfBestTime(47, 0)).toBe(0)
  })
})

describe('timeDropNeeded', () => {
  it('returns positive when currentTime is slower', () => {
    expect(timeDropNeeded(50, 47)).toBe(3)
  })

  it('returns negative when currentTime is already faster than target', () => {
    expect(timeDropNeeded(46, 47)).toBe(-1)
  })

  it('returns 0 when equal', () => {
    expect(timeDropNeeded(47, 47)).toBe(0)
  })
})

describe('projectedTime', () => {
  it('projects remaining laps at average pace', () => {
    // 3 splits done: avg=14, 4 laps total -> sum=42 + 14 = 56
    const result = projectedTime([14, 14, 14], 4)
    expect(approx(result, 56)).toBe(true)
  })

  it('returns the sum when all laps are done (0 remaining)', () => {
    const result = projectedTime([14, 14], 2)
    expect(approx(result, 28)).toBe(true)
  })

  it('projects with varying splits', () => {
    // splits [12, 14], avg=13, 4 total laps -> sum=26 + 13*2 = 52
    const result = projectedTime([12, 14], 4)
    expect(approx(result, 52)).toBe(true)
  })
})

describe('raceQualityScore', () => {
  it('returns 100 when actualTime equals seedTime', () => {
    // (seedTime - seedTime)/(seedTime - PB)*100 = 0
    // Actually: (seed - actual)/(seed - PB)*100
    // 0/... = 0
    expect(raceQualityScore(50, 50, 47)).toBe(0)
  })

  it('returns 100 when swimmer beats seed by same margin as seed vs PB', () => {
    // (55 - 52)/(55 - 52)*100 = 100
    expect(raceQualityScore(52, 55, 52)).toBe(100)
  })

  it('returns positive when actualTime beats seedTime', () => {
    // (50 - 48)/(50 - 47)*100 = 200/3 ≈ 66.7
    expect(raceQualityScore(48, 50, 47)).toBeGreaterThan(0)
  })

  it('returns negative when actualTime is worse than seedTime', () => {
    // (50 - 52)/(50 - 47)*100 = -200/3 ≈ -66.7
    const score = raceQualityScore(52, 50, 47)
    expect(score).toBeLessThan(0)
  })

  it('clamps to -100 minimum', () => {
    // very bad swim
    const score = raceQualityScore(200, 50, 49)
    expect(score).toBe(-100)
  })

  it('clamps to 200 maximum', () => {
    // crush the seed by huge margin
    const score = raceQualityScore(10, 50, 49)
    expect(score).toBe(200)
  })

  it('returns 0 when seedTime equals personalBest (zero denom)', () => {
    expect(raceQualityScore(47, 47, 47)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Event-specific analytics
// ---------------------------------------------------------------------------

describe('eventDistance', () => {
  it('returns 50 for 50free', () => {
    expect(eventDistance('50free')).toBe(50)
  })

  it('returns 100 for 100free', () => {
    expect(eventDistance('100free')).toBe(100)
  })

  it('returns 200 for 200free', () => {
    expect(eventDistance('200free')).toBe(200)
  })

  it('returns 400 for 400free', () => {
    expect(eventDistance('400free')).toBe(400)
  })

  it('returns 800 for 800free', () => {
    expect(eventDistance('800free')).toBe(800)
  })

  it('returns 1500 for 1500free', () => {
    expect(eventDistance('1500free')).toBe(1500)
  })

  it('returns 100 for 100back', () => {
    expect(eventDistance('100back')).toBe(100)
  })

  it('returns 200 for 200IM', () => {
    expect(eventDistance('200IM')).toBe(200)
  })

  it('returns 400 for 400IM', () => {
    expect(eventDistance('400IM')).toBe(400)
  })
})

describe('expectedSplitPattern', () => {
  it('100free has 2 splits summing to 1', () => {
    const pattern = expectedSplitPattern('100free')
    expect(pattern.length).toBe(2)
    expect(approx(pattern.reduce((a, b) => a + b, 0), 1)).toBe(true)
  })

  it('200free has 4 splits summing to 1', () => {
    const pattern = expectedSplitPattern('200free')
    expect(pattern.length).toBe(4)
    expect(approx(pattern.reduce((a, b) => a + b, 0), 1)).toBe(true)
  })

  it('50free has 1 split equal to 1', () => {
    const pattern = expectedSplitPattern('50free')
    expect(pattern).toEqual([1.0])
  })

  it('100free first split is faster (0.48 < 0.52)', () => {
    const pattern = expectedSplitPattern('100free')
    expect(pattern[0]!).toBeLessThan(pattern[1]!)
  })

  it('800free has 8 segments', () => {
    const pattern = expectedSplitPattern('800free')
    expect(pattern.length).toBe(8)
  })

  it('800free sums to approximately 1', () => {
    const pattern = expectedSplitPattern('800free')
    expect(pattern.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
  })

  it('400IM has 4 splits', () => {
    const pattern = expectedSplitPattern('400IM')
    expect(pattern.length).toBe(4)
  })

  it('1500free has 15 splits', () => {
    const pattern = expectedSplitPattern('1500free')
    expect(pattern.length).toBe(15)
  })
})

describe('strokes', () => {
  it('freestyle events return [freestyle]', () => {
    expect(strokes('100free')).toEqual(['freestyle'])
    expect(strokes('400free')).toEqual(['freestyle'])
  })

  it('backstroke events return [backstroke]', () => {
    expect(strokes('100back')).toEqual(['backstroke'])
    expect(strokes('200back')).toEqual(['backstroke'])
  })

  it('breaststroke events return [breaststroke]', () => {
    expect(strokes('100breast')).toEqual(['breaststroke'])
  })

  it('butterfly events return [butterfly]', () => {
    expect(strokes('100fly')).toEqual(['butterfly'])
  })

  it('200IM returns all 4 strokes in order', () => {
    expect(strokes('200IM')).toEqual(['butterfly', 'backstroke', 'breaststroke', 'freestyle'])
  })

  it('400IM returns all 4 strokes in order', () => {
    expect(strokes('400IM')).toEqual(['butterfly', 'backstroke', 'breaststroke', 'freestyle'])
  })
})

describe('isSprintEvent', () => {
  it('50free is a sprint', () => {
    expect(isSprintEvent('50free')).toBe(true)
  })

  it('100free is a sprint', () => {
    expect(isSprintEvent('100free')).toBe(true)
  })

  it('100back is a sprint', () => {
    expect(isSprintEvent('100back')).toBe(true)
  })

  it('100breast is a sprint', () => {
    expect(isSprintEvent('100breast')).toBe(true)
  })

  it('100fly is a sprint', () => {
    expect(isSprintEvent('100fly')).toBe(true)
  })

  it('200free is not a sprint', () => {
    expect(isSprintEvent('200free')).toBe(false)
  })

  it('400IM is not a sprint', () => {
    expect(isSprintEvent('400IM')).toBe(false)
  })

  it('800free is not a sprint', () => {
    expect(isSprintEvent('800free')).toBe(false)
  })
})

describe('isDistanceEvent', () => {
  it('800free is a distance event', () => {
    expect(isDistanceEvent('800free')).toBe(true)
  })

  it('1500free is a distance event', () => {
    expect(isDistanceEvent('1500free')).toBe(true)
  })

  it('400free is not a distance event', () => {
    expect(isDistanceEvent('400free')).toBe(false)
  })

  it('100free is not a distance event', () => {
    expect(isDistanceEvent('100free')).toBe(false)
  })
})

describe('eventDifficultyWeight', () => {
  it('400IM has highest weight of 9', () => {
    expect(eventDifficultyWeight('400IM')).toBe(9)
  })

  it('sprint events have weight 6', () => {
    expect(eventDifficultyWeight('100free')).toBe(6)
    expect(eventDifficultyWeight('100back')).toBe(6)
    expect(eventDifficultyWeight('100breast')).toBe(6)
    expect(eventDifficultyWeight('100fly')).toBe(6)
  })

  it('50free has weight 5', () => {
    expect(eventDifficultyWeight('50free')).toBe(5)
  })

  it('distance events have weight 8', () => {
    expect(eventDifficultyWeight('800free')).toBe(8)
    expect(eventDifficultyWeight('1500free')).toBe(8)
  })

  it('200 events generally have weight 7', () => {
    expect(eventDifficultyWeight('200free')).toBe(7)
    expect(eventDifficultyWeight('200back')).toBe(7)
    expect(eventDifficultyWeight('200breast')).toBe(7)
    expect(eventDifficultyWeight('200fly')).toBe(7)
  })

  it('all weights are between 1 and 10', () => {
    const events: SwimEvent[] = [
      '50free', '100free', '200free', '400free', '800free', '1500free',
      '100back', '200back', '100breast', '200breast', '100fly', '200fly',
      '200IM', '400IM',
    ]
    for (const event of events) {
      const w = eventDifficultyWeight(event)
      expect(w).toBeGreaterThanOrEqual(1)
      expect(w).toBeLessThanOrEqual(10)
    }
  })
})

// ---------------------------------------------------------------------------
// 6. Team relay analytics
// ---------------------------------------------------------------------------

describe('relayLeadOff', () => {
  it('adds split time and reaction time', () => {
    expect(approx(relayLeadOff(22.5, 0.65), 23.15)).toBe(true)
  })

  it('returns split when reaction time is 0', () => {
    expect(relayLeadOff(22.5, 0)).toBe(22.5)
  })
})

describe('relayExchangeTime', () => {
  it('returns negative when next swimmer leaves before touch', () => {
    // next leaves at 44.0, touch at 44.1 → -0.1
    expect(approx(relayExchangeTime(44.1, 44.0), -0.1)).toBe(true)
  })

  it('returns 0 for perfect exchange (simultaneous)', () => {
    expect(relayExchangeTime(44.0, 44.0)).toBe(0)
  })

  it('returns positive when next swimmer leaves too late (relay DQ risk)', () => {
    expect(relayExchangeTime(44.0, 44.2)).toBeCloseTo(0.2)
  })
})

describe('relayTeamTime', () => {
  it('sums splits and adds exchanges', () => {
    // splits: [22.5, 23.0, 23.5, 24.0], exchanges: [-0.05, -0.05, -0.05]
    const result = relayTeamTime([22.5, 23.0, 23.5, 24.0], [-0.05, -0.05, -0.05])
    expect(approx(result, 93.0 - 0.15)).toBe(true)
  })

  it('throws when exchange length does not match splits-1', () => {
    expect(() => relayTeamTime([22, 23, 24, 25], [0, 0])).toThrow()
  })

  it('works with single swimmer (no exchanges)', () => {
    expect(relayTeamTime([22.5], [])).toBe(22.5)
  })
})

describe('optimalRelayOrder', () => {
  it('places fastest reaction time as lead-off', () => {
    const swimmers: RelaySwimmer[] = [
      { id: 'A', split: 23.0, reactionTime: 0.65 },
      { id: 'B', split: 22.5, reactionTime: 0.60 },
      { id: 'C', split: 24.0, reactionTime: 0.70 },
      { id: 'D', split: 22.0, reactionTime: 0.68 },
    ]
    const ordered = optimalRelayOrder(swimmers)
    expect(ordered[0]!.id).toBe('B') // fastest RT = 0.60
  })

  it('places fastest split as anchor', () => {
    const swimmers: RelaySwimmer[] = [
      { id: 'A', split: 23.0, reactionTime: 0.65 },
      { id: 'B', split: 22.5, reactionTime: 0.60 },
      { id: 'C', split: 24.0, reactionTime: 0.70 },
      { id: 'D', split: 22.0, reactionTime: 0.68 },
    ]
    const ordered = optimalRelayOrder(swimmers)
    expect(ordered[3]!.id).toBe('D') // fastest split = 22.0
  })

  it('returns same array for single swimmer', () => {
    const swimmers: RelaySwimmer[] = [{ id: 'A', split: 23.0, reactionTime: 0.65 }]
    const ordered = optimalRelayOrder(swimmers)
    expect(ordered.length).toBe(1)
    expect(ordered[0]!.id).toBe('A')
  })

  it('returns array of same length as input', () => {
    const swimmers: RelaySwimmer[] = [
      { id: 'A', split: 23.0, reactionTime: 0.65 },
      { id: 'B', split: 22.5, reactionTime: 0.60 },
      { id: 'C', split: 24.0, reactionTime: 0.70 },
      { id: 'D', split: 22.0, reactionTime: 0.68 },
    ]
    const ordered = optimalRelayOrder(swimmers)
    expect(ordered.length).toBe(4)
  })
})

describe('relayProjectedTime', () => {
  it('uses default exchange of -0.05 per exchange', () => {
    // 4 swimmers, 3 exchanges: 4*(22.5) - 3*0.05 = 90 - 0.15 = 89.85
    const relay = [
      { split: 22.5 },
      { split: 22.5 },
      { split: 22.5 },
      { split: 22.5 },
    ]
    expect(approx(relayProjectedTime(relay), 89.85)).toBe(true)
  })

  it('uses custom standardExchange', () => {
    const relay = [{ split: 22.5 }, { split: 22.5 }]
    // 2 swimmers, 1 exchange at -0.1: 45 - 0.1 = 44.9
    expect(approx(relayProjectedTime(relay, -0.1), 44.9)).toBe(true)
  })

  it('works with single swimmer (no exchanges)', () => {
    const relay = [{ split: 22.5 }]
    expect(relayProjectedTime(relay)).toBe(22.5)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (swim meets)
// ---------------------------------------------------------------------------

describe('dkSwimScore', () => {
  it('awards 50 points for 1st place', () => {
    const stats: DKSwimStats = {
      finishPosition: 1, personalBestSet: false, meetRecord: false,
      worldRecord: false, relay: false,
    }
    expect(dkSwimScore(stats)).toBe(50)
  })

  it('awards 40 points for 2nd place', () => {
    const stats: DKSwimStats = {
      finishPosition: 2, personalBestSet: false, meetRecord: false,
      worldRecord: false, relay: false,
    }
    expect(dkSwimScore(stats)).toBe(40)
  })

  it('awards 0 points for 9th place and beyond', () => {
    const stats: DKSwimStats = {
      finishPosition: 9, personalBestSet: false, meetRecord: false,
      worldRecord: false, relay: false,
    }
    expect(dkSwimScore(stats)).toBe(0)
  })

  it('adds 5 points for personal best', () => {
    const stats: DKSwimStats = {
      finishPosition: 3, personalBestSet: true, meetRecord: false,
      worldRecord: false, relay: false,
    }
    expect(dkSwimScore(stats)).toBe(32 + 5)
  })

  it('adds 10 points for meet record', () => {
    const stats: DKSwimStats = {
      finishPosition: 1, personalBestSet: false, meetRecord: true,
      worldRecord: false, relay: false,
    }
    expect(dkSwimScore(stats)).toBe(50 + 10)
  })

  it('adds 20 points for world record', () => {
    const stats: DKSwimStats = {
      finishPosition: 1, personalBestSet: false, meetRecord: false,
      worldRecord: true, relay: false,
    }
    expect(dkSwimScore(stats)).toBe(50 + 20)
  })

  it('adds 8 points for relay finish in top 3', () => {
    const stats: DKSwimStats = {
      finishPosition: 1, personalBestSet: false, meetRecord: false,
      worldRecord: false, relay: true, relayFinishPosition: 1,
    }
    expect(dkSwimScore(stats)).toBe(50 + 8)
  })

  it('does not add relay bonus for relay finish outside top 3', () => {
    const stats: DKSwimStats = {
      finishPosition: 1, personalBestSet: false, meetRecord: false,
      worldRecord: false, relay: true, relayFinishPosition: 4,
    }
    expect(dkSwimScore(stats)).toBe(50)
  })

  it('does not add relay bonus when relay is false even with position ≤ 3', () => {
    const stats: DKSwimStats = {
      finishPosition: 1, personalBestSet: false, meetRecord: false,
      worldRecord: false, relay: false, relayFinishPosition: 1,
    }
    expect(dkSwimScore(stats)).toBe(50)
  })

  it('stacks all bonuses', () => {
    const stats: DKSwimStats = {
      finishPosition: 1, personalBestSet: true, meetRecord: true,
      worldRecord: true, relay: true, relayFinishPosition: 1,
    }
    // 50 + 5 + 10 + 20 + 8 = 93
    expect(dkSwimScore(stats)).toBe(93)
  })

  it('awards correct points for positions 4-8', () => {
    const expected: Record<number, number> = { 4: 26, 5: 21, 6: 17, 7: 14, 8: 12 }
    for (const [pos, pts] of Object.entries(expected)) {
      const stats: DKSwimStats = {
        finishPosition: parseInt(pos), personalBestSet: false, meetRecord: false,
        worldRecord: false, relay: false,
      }
      expect(dkSwimScore(stats)).toBe(pts)
    }
  })
})

describe('dkProjectedScore', () => {
  it('returns a positive number for a competitive position', () => {
    const score = dkProjectedScore(47.5, 46.0, 1.5)
    expect(score).toBeGreaterThan(0)
  })

  it('returns 0 for position 9 or worse', () => {
    const score = dkProjectedScore(60, 47, 9)
    expect(score).toBe(0)
  })

  it('returns points for position exactly 1', () => {
    // position 1 means top of table = 50 base points * adjustment
    const score = dkProjectedScore(47, 47, 1)
    expect(score).toBeGreaterThan(0)
  })

  it('adjusts score based on proximity to PB', () => {
    const closeToP = dkProjectedScore(47.1, 47.0, 2)
    const farFromP = dkProjectedScore(52.0, 47.0, 2)
    // closer to PB should get a better multiplier
    expect(closeToP).toBeGreaterThan(farFromP)
  })
})

describe('dkValueScore', () => {
  it('calculates score per $1000 of salary', () => {
    // 50 / 5000 * 1000 = 10
    expect(dkValueScore(50, 5000)).toBe(10)
  })

  it('returns 0 when salary is 0', () => {
    expect(dkValueScore(50, 0)).toBe(0)
  })

  it('returns higher value for same score with lower salary', () => {
    const highValue = dkValueScore(50, 4000)
    const lowValue = dkValueScore(50, 8000)
    expect(highValue).toBeGreaterThan(lowValue)
  })

  it('returns 0 when projected score is 0', () => {
    expect(dkValueScore(0, 5000)).toBe(0)
  })
})
