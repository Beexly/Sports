/**
 * curling-analytics.test.ts
 * ~150+ tests for the curling analytics library.
 */
import { describe, it, expect } from 'vitest'
import {
  endScore,
  gameScore,
  hammerNext,
  forceCount,
  stealCount,
  shotPercentage,
  teamShootingPct,
  hitAndStayRate,
  drawWeight,
  takeoutEfficiency,
  hammerConversionRate,
  blankEndRate,
  stealEfficiency,
  forceEfficiency,
  lastStoneDrawAccuracy,
  skipAccuracy,
  leadDrawPct,
  sweepingImpact,
  positionRating,
  runningScoreDiff,
  comebackIndex,
  endWinRate,
  concedeThreshold,
  freeGuardZoneViolation,
  weightControlConsistency,
  iceReadingScore,
  dkCurlingPoints,
  dkProjection,
} from '@/lib/sports/curling-analytics'
import type {
  HouseStone,
  EndResult,
  CurlingFantasyStats,
} from '@/lib/sports/curling-analytics'

// ---------------------------------------------------------------------------
// 1. Scoring & ends — endScore
// ---------------------------------------------------------------------------

describe('endScore', () => {
  it('returns blank for empty house', () => {
    expect(endScore([])).toEqual({ team: null, points: 0 })
  })

  it('scores 1 for single stone', () => {
    expect(endScore([{ team: 'a', distance: 0.5 }])).toEqual({
      team: 'a',
      points: 1,
    })
  })

  it('team a scores when closest', () => {
    const stones: HouseStone[] = [
      { team: 'a', distance: 0.3 },
      { team: 'b', distance: 0.8 },
    ]
    expect(endScore(stones)).toEqual({ team: 'a', points: 1 })
  })

  it('team b scores when closest', () => {
    const stones: HouseStone[] = [
      { team: 'a', distance: 0.9 },
      { team: 'b', distance: 0.2 },
    ]
    expect(endScore(stones)).toEqual({ team: 'b', points: 1 })
  })

  it('counts consecutive closer stones (a scores 2)', () => {
    const stones: HouseStone[] = [
      { team: 'a', distance: 0.2 },
      { team: 'a', distance: 0.4 },
      { team: 'b', distance: 0.7 },
    ]
    expect(endScore(stones)).toEqual({ team: 'a', points: 2 })
  })

  it('counts consecutive closer stones (a scores 3)', () => {
    const stones: HouseStone[] = [
      { team: 'a', distance: 0.1 },
      { team: 'a', distance: 0.2 },
      { team: 'a', distance: 0.3 },
      { team: 'b', distance: 0.9 },
    ]
    expect(endScore(stones)).toEqual({ team: 'a', points: 3 })
  })

  it('stops counting at first opponent stone', () => {
    const stones: HouseStone[] = [
      { team: 'a', distance: 0.1 },
      { team: 'b', distance: 0.2 },
      { team: 'a', distance: 0.3 },
    ]
    // a has closest, but b is 2nd closest → a counts only 1
    expect(endScore(stones)).toEqual({ team: 'a', points: 1 })
  })

  it('counts all scoring stones when opponent has none in house', () => {
    const stones: HouseStone[] = [
      { team: 'a', distance: 0.1 },
      { team: 'a', distance: 0.2 },
      { team: 'a', distance: 0.3 },
      { team: 'a', distance: 0.4 },
    ]
    expect(endScore(stones)).toEqual({ team: 'a', points: 4 })
  })

  it('scores maximum 8 when all eight a stones are closer', () => {
    const stones: HouseStone[] = Array.from({ length: 8 }, (_, i) => ({
      team: 'a' as const,
      distance: (i + 1) * 0.1,
    }))
    expect(endScore(stones)).toEqual({ team: 'a', points: 8 })
  })

  it('handles unsorted input', () => {
    const stones: HouseStone[] = [
      { team: 'b', distance: 0.9 },
      { team: 'a', distance: 0.2 },
      { team: 'a', distance: 0.1 },
    ]
    expect(endScore(stones)).toEqual({ team: 'a', points: 2 })
  })

  it('opponent closest → opponent scores 1 even if other team has more', () => {
    const stones: HouseStone[] = [
      { team: 'b', distance: 0.1 },
      { team: 'a', distance: 0.2 },
      { team: 'a', distance: 0.3 },
      { team: 'a', distance: 0.4 },
    ]
    expect(endScore(stones)).toEqual({ team: 'b', points: 1 })
  })

  it('b scores 2 with interleaved a stones farther', () => {
    const stones: HouseStone[] = [
      { team: 'b', distance: 0.1 },
      { team: 'b', distance: 0.15 },
      { team: 'a', distance: 0.2 },
    ]
    expect(endScore(stones)).toEqual({ team: 'b', points: 2 })
  })

  it('does not mutate input array order', () => {
    const stones: HouseStone[] = [
      { team: 'b', distance: 0.9 },
      { team: 'a', distance: 0.1 },
    ]
    endScore(stones)
    expect(stones[0]?.team).toBe('b')
    expect(stones[1]?.team).toBe('a')
  })
})

// ---------------------------------------------------------------------------
// gameScore
// ---------------------------------------------------------------------------

describe('gameScore', () => {
  it('returns 0-0 for empty', () => {
    expect(gameScore([])).toEqual({ a: 0, b: 0 })
  })

  it('sums a points', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 2 },
      { team: 'a', points: 1 },
    ]
    expect(gameScore(ends)).toEqual({ a: 3, b: 0 })
  })

  it('sums b points', () => {
    const ends: EndResult[] = [
      { team: 'b', points: 3 },
      { team: 'b', points: 2 },
    ]
    expect(gameScore(ends)).toEqual({ a: 0, b: 5 })
  })

  it('mixes a and b', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 2 },
      { team: 'b', points: 1 },
      { team: 'a', points: 3 },
    ]
    expect(gameScore(ends)).toEqual({ a: 5, b: 1 })
  })

  it('ignores blank ends', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 2 },
      { team: null, points: 0 },
      { team: 'b', points: 1 },
    ]
    expect(gameScore(ends)).toEqual({ a: 2, b: 1 })
  })

  it('blank with stray points still ignored', () => {
    const ends: EndResult[] = [{ team: null, points: 5 }]
    expect(gameScore(ends)).toEqual({ a: 0, b: 0 })
  })
})

// ---------------------------------------------------------------------------
// hammerNext
// ---------------------------------------------------------------------------

describe('hammerNext', () => {
  it('a scored → b gets hammer', () => {
    expect(hammerNext('a')).toBe('b')
  })

  it('b scored → a gets hammer', () => {
    expect(hammerNext('b')).toBe('a')
  })

  it('blank end → null (unchanged)', () => {
    expect(hammerNext(null)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// forceCount
// ---------------------------------------------------------------------------

describe('forceCount', () => {
  it('returns 0 for empty', () => {
    expect(forceCount([], 'a')).toBe(0)
  })

  it('counts opponent scoring exactly 1 (a forcing b)', () => {
    const ends: EndResult[] = [
      { team: 'b', points: 1 },
      { team: 'b', points: 2 },
      { team: 'b', points: 1 },
    ]
    expect(forceCount(ends, 'a')).toBe(2)
  })

  it('does not count opponent scoring 2+', () => {
    const ends: EndResult[] = [
      { team: 'b', points: 2 },
      { team: 'b', points: 3 },
    ]
    expect(forceCount(ends, 'a')).toBe(0)
  })

  it('does not count own scoring ends', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: 'a', points: 1 },
    ]
    expect(forceCount(ends, 'a')).toBe(0)
  })

  it('counts forces for b (a is opponent)', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: 'a', points: 1 },
      { team: 'a', points: 4 },
    ]
    expect(forceCount(ends, 'b')).toBe(2)
  })

  it('ignores blank ends', () => {
    const ends: EndResult[] = [
      { team: null, points: 0 },
      { team: 'b', points: 1 },
    ]
    expect(forceCount(ends, 'a')).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// stealCount
// ---------------------------------------------------------------------------

describe('stealCount', () => {
  it('returns 0 for empty', () => {
    expect(stealCount([], [], 'a')).toBe(0)
  })

  it('counts scoring without hammer (a steals)', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: 'a', points: 2 },
    ]
    // b held hammer both ends → both a scores are steals
    expect(stealCount(ends, ['b', 'b'], 'a')).toBe(2)
  })

  it('does not count scoring with hammer', () => {
    const ends: EndResult[] = [{ team: 'a', points: 2 }]
    expect(stealCount(ends, ['a'], 'a')).toBe(0)
  })

  it('does not count zero-point ends', () => {
    const ends: EndResult[] = [{ team: 'a', points: 0 }]
    expect(stealCount(ends, ['b'], 'a')).toBe(0)
  })

  it('counts steals for b', () => {
    const ends: EndResult[] = [
      { team: 'b', points: 1 },
      { team: 'b', points: 1 },
    ]
    expect(stealCount(ends, ['a', 'a'], 'b')).toBe(2)
  })

  it('mixed: only steals without hammer counted', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 }, // a no hammer → steal
      { team: 'a', points: 2 }, // a hammer → not steal
      { team: 'b', points: 1 }, // b scored, a queried → no
    ]
    expect(stealCount(ends, ['b', 'a', 'a'], 'a')).toBe(1)
  })

  it('skips ends missing hammer entry', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: 'a', points: 1 },
    ]
    // only one hammer entry → second end skipped
    expect(stealCount(ends, ['b'], 'a')).toBe(1)
  })

  it('ignores blank ends (team null)', () => {
    const ends: EndResult[] = [{ team: null, points: 0 }]
    expect(stealCount(ends, ['b'], 'a')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Shot analytics
// ---------------------------------------------------------------------------

describe('shotPercentage', () => {
  it('returns 0 when max is 0', () => {
    expect(shotPercentage(5, 0)).toBe(0)
  })

  it('returns 100 when achieved equals max', () => {
    expect(shotPercentage(10, 10)).toBe(100)
  })

  it('returns 50 for half', () => {
    expect(shotPercentage(5, 10)).toBe(50)
  })

  it('returns 0 for zero points', () => {
    expect(shotPercentage(0, 10)).toBe(0)
  })

  it('computes fractional pct', () => {
    expect(shotPercentage(3, 4)).toBe(75)
  })
})

describe('teamShootingPct', () => {
  it('returns 0 for empty', () => {
    expect(teamShootingPct([])).toBe(0)
  })

  it('rating of 4 → 100%', () => {
    expect(teamShootingPct([{ rating: 4 }])).toBe(100)
  })

  it('rating of 2 → 50%', () => {
    expect(teamShootingPct([{ rating: 2 }])).toBe(50)
  })

  it('rating of 0 → 0%', () => {
    expect(teamShootingPct([{ rating: 0 }])).toBe(0)
  })

  it('averages multiple ratings', () => {
    expect(teamShootingPct([{ rating: 4 }, { rating: 2 }])).toBe(75)
  })

  it('averages to fractional pct', () => {
    expect(teamShootingPct([{ rating: 3 }, { rating: 3 }, { rating: 3 }])).toBe(
      75,
    )
  })
})

describe('hitAndStayRate', () => {
  it('returns 0 for zero attempts', () => {
    expect(hitAndStayRate(0, 0)).toBe(0)
  })

  it('returns 100 for perfect', () => {
    expect(hitAndStayRate(5, 5)).toBe(100)
  })

  it('returns 50 for half', () => {
    expect(hitAndStayRate(3, 6)).toBe(50)
  })

  it('returns 0 for none successful', () => {
    expect(hitAndStayRate(0, 4)).toBe(0)
  })
})

describe('drawWeight', () => {
  it('returns 0 when time is 0', () => {
    expect(drawWeight(40, 0)).toBe(0)
  })

  it('computes m/s', () => {
    expect(drawWeight(40, 4)).toBe(10)
  })

  it('handles fractional velocity', () => {
    expect(drawWeight(38.4, 24)).toBeCloseTo(1.6, 5)
  })

  it('zero distance → 0', () => {
    expect(drawWeight(0, 5)).toBe(0)
  })
})

describe('takeoutEfficiency', () => {
  it('returns 0 for zero attempts', () => {
    expect(takeoutEfficiency(0, 0)).toBe(0)
  })

  it('returns 100 for perfect', () => {
    expect(takeoutEfficiency(4, 4)).toBe(100)
  })

  it('returns 75 for 3 of 4', () => {
    expect(takeoutEfficiency(3, 4)).toBe(75)
  })

  it('returns 0 for none removed', () => {
    expect(takeoutEfficiency(0, 5)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Hammer & strategy
// ---------------------------------------------------------------------------

describe('hammerConversionRate', () => {
  it('returns 0 for zero hammer ends', () => {
    expect(hammerConversionRate(0, 0)).toBe(0)
  })

  it('returns 100 when all converted', () => {
    expect(hammerConversionRate(5, 5)).toBe(100)
  })

  it('returns 50 for half', () => {
    expect(hammerConversionRate(2, 4)).toBe(50)
  })

  it('returns 0 when none converted', () => {
    expect(hammerConversionRate(0, 6)).toBe(0)
  })
})

describe('blankEndRate', () => {
  it('returns 0 for zero ends', () => {
    expect(blankEndRate(0, 0)).toBe(0)
  })

  it('returns 100 when all blank', () => {
    expect(blankEndRate(8, 8)).toBe(100)
  })

  it('returns 25 for 2 of 8', () => {
    expect(blankEndRate(2, 8)).toBe(25)
  })

  it('returns 0 with no blanks', () => {
    expect(blankEndRate(0, 10)).toBe(0)
  })
})

describe('stealEfficiency', () => {
  it('returns 0 for zero opponent hammer ends', () => {
    expect(stealEfficiency(2, 0)).toBe(0)
  })

  it('returns 100 when stealing every opp hammer end', () => {
    expect(stealEfficiency(3, 3)).toBe(100)
  })

  it('returns 50 for half', () => {
    expect(stealEfficiency(2, 4)).toBe(50)
  })

  it('returns 0 with no steals', () => {
    expect(stealEfficiency(0, 5)).toBe(0)
  })
})

describe('forceEfficiency', () => {
  it('returns 0 for zero opponent hammer ends', () => {
    expect(forceEfficiency(2, 0)).toBe(0)
  })

  it('returns 100 when forcing every opp hammer end', () => {
    expect(forceEfficiency(4, 4)).toBe(100)
  })

  it('returns 25 for 1 of 4', () => {
    expect(forceEfficiency(1, 4)).toBe(25)
  })

  it('returns 0 with no forces', () => {
    expect(forceEfficiency(0, 5)).toBe(0)
  })
})

describe('lastStoneDrawAccuracy', () => {
  it('returns 0 for empty', () => {
    expect(lastStoneDrawAccuracy([])).toBe(0)
  })

  it('averages distances', () => {
    expect(lastStoneDrawAccuracy([1, 2, 3])).toBe(2)
  })

  it('single value', () => {
    expect(lastStoneDrawAccuracy([0.5])).toBe(0.5)
  })

  it('perfect draws → 0', () => {
    expect(lastStoneDrawAccuracy([0, 0, 0])).toBe(0)
  })

  it('fractional average', () => {
    expect(lastStoneDrawAccuracy([0.2, 0.4])).toBeCloseTo(0.3, 5)
  })
})

// ---------------------------------------------------------------------------
// 4. Player positions
// ---------------------------------------------------------------------------

describe('skipAccuracy', () => {
  it('returns 0 for zero called shots', () => {
    expect(skipAccuracy(0, 0)).toBe(0)
  })

  it('returns 100 for all made', () => {
    expect(skipAccuracy(10, 10)).toBe(100)
  })

  it('returns 80 for 8 of 10', () => {
    expect(skipAccuracy(8, 10)).toBe(80)
  })

  it('returns 0 for none made', () => {
    expect(skipAccuracy(0, 7)).toBe(0)
  })
})

describe('leadDrawPct', () => {
  it('returns 0 for empty', () => {
    expect(leadDrawPct([])).toBe(0)
  })

  it('rating 4 → 100', () => {
    expect(leadDrawPct([{ rating: 4 }])).toBe(100)
  })

  it('rating 1 → 25', () => {
    expect(leadDrawPct([{ rating: 1 }])).toBe(25)
  })

  it('averages draws', () => {
    expect(leadDrawPct([{ rating: 4 }, { rating: 0 }])).toBe(50)
  })
})

describe('sweepingImpact', () => {
  it('positive gain', () => {
    expect(sweepingImpact(5, 3)).toBe(2)
  })

  it('zero gain', () => {
    expect(sweepingImpact(4, 4)).toBe(0)
  })

  it('negative (inconsistent data)', () => {
    expect(sweepingImpact(3, 5)).toBe(-2)
  })

  it('fractional gain', () => {
    expect(sweepingImpact(2.5, 1.2)).toBeCloseTo(1.3, 5)
  })
})

describe('positionRating', () => {
  it('returns 0 for empty', () => {
    expect(positionRating([])).toBe(0)
  })

  it('rating 4 → 100', () => {
    expect(positionRating([4])).toBe(100)
  })

  it('rating 2 → 50', () => {
    expect(positionRating([2])).toBe(50)
  })

  it('averages ratings', () => {
    expect(positionRating([4, 2, 0])).toBe(50)
  })

  it('all zeros → 0', () => {
    expect(positionRating([0, 0])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Match dynamics
// ---------------------------------------------------------------------------

describe('runningScoreDiff', () => {
  it('returns empty for empty', () => {
    expect(runningScoreDiff([])).toEqual([])
  })

  it('tracks cumulative a-b', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 2 },
      { team: 'b', points: 1 },
      { team: 'a', points: 1 },
    ]
    expect(runningScoreDiff(ends)).toEqual([2, 1, 2])
  })

  it('handles blank ends (no change)', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 2 },
      { team: null, points: 0 },
      { team: 'b', points: 3 },
    ]
    expect(runningScoreDiff(ends)).toEqual([2, 2, -1])
  })

  it('all b → negative trend', () => {
    const ends: EndResult[] = [
      { team: 'b', points: 1 },
      { team: 'b', points: 2 },
    ]
    expect(runningScoreDiff(ends)).toEqual([-1, -3])
  })

  it('one entry per end', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: 'a', points: 1 },
      { team: 'a', points: 1 },
    ]
    expect(runningScoreDiff(ends)).toHaveLength(3)
  })
})

describe('comebackIndex', () => {
  it('returns 0 when not won', () => {
    expect(comebackIndex(5, false)).toBe(0)
  })

  it('returns deficit when won', () => {
    expect(comebackIndex(5, true)).toBe(5)
  })

  it('clamps negative deficit to 0 when won', () => {
    expect(comebackIndex(-3, true)).toBe(0)
  })

  it('zero deficit win → 0', () => {
    expect(comebackIndex(0, true)).toBe(0)
  })

  it('large comeback', () => {
    expect(comebackIndex(8, true)).toBe(8)
  })
})

describe('endWinRate', () => {
  it('returns 0 for empty', () => {
    expect(endWinRate([], 'a')).toBe(0)
  })

  it('100 when team wins all', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: 'a', points: 2 },
    ]
    expect(endWinRate(ends, 'a')).toBe(100)
  })

  it('50 when team wins half', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: 'b', points: 1 },
    ]
    expect(endWinRate(ends, 'a')).toBe(50)
  })

  it('blank ends count as not won', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 },
      { team: null, points: 0 },
    ]
    expect(endWinRate(ends, 'a')).toBe(50)
  })

  it('zero-point scoring end does not count', () => {
    const ends: EndResult[] = [{ team: 'a', points: 0 }]
    expect(endWinRate(ends, 'a')).toBe(0)
  })

  it('rate for b', () => {
    const ends: EndResult[] = [
      { team: 'b', points: 2 },
      { team: 'b', points: 1 },
      { team: 'a', points: 1 },
      { team: 'a', points: 1 },
    ]
    expect(endWinRate(ends, 'b')).toBe(50)
  })
})

describe('concedeThreshold', () => {
  it('concede when deficit exceeds ends remaining', () => {
    expect(concedeThreshold(5, 3)).toBe(true)
  })

  it('do not concede when deficit equals ends remaining', () => {
    expect(concedeThreshold(3, 3)).toBe(false)
  })

  it('do not concede when deficit less than ends remaining', () => {
    expect(concedeThreshold(2, 4)).toBe(false)
  })

  it('do not concede with zero deficit', () => {
    expect(concedeThreshold(0, 2)).toBe(false)
  })

  it('concede when no ends remaining and trailing', () => {
    expect(concedeThreshold(1, 0)).toBe(true)
  })

  it('do not concede when level with no ends remaining', () => {
    expect(concedeThreshold(0, 0)).toBe(false)
  })

  it('big deficit, few ends → concede', () => {
    expect(concedeThreshold(7, 2)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 6. Advanced metrics
// ---------------------------------------------------------------------------

describe('freeGuardZoneViolation', () => {
  it('violation when removing before fifth stone', () => {
    expect(freeGuardZoneViolation(1, true)).toBe(true)
  })

  it('no violation when after fifth stone', () => {
    expect(freeGuardZoneViolation(1, false)).toBe(false)
  })

  it('no violation when nothing removed (before fifth)', () => {
    expect(freeGuardZoneViolation(0, true)).toBe(false)
  })

  it('no violation when nothing removed (after fifth)', () => {
    expect(freeGuardZoneViolation(0, false)).toBe(false)
  })

  it('violation with multiple removed before fifth', () => {
    expect(freeGuardZoneViolation(2, true)).toBe(true)
  })
})

describe('weightControlConsistency', () => {
  it('returns 1 for empty (<2 samples)', () => {
    expect(weightControlConsistency([])).toBe(1)
  })

  it('returns 1 for single sample (<2)', () => {
    expect(weightControlConsistency([3.2])).toBe(1)
  })

  it('returns 1 for identical weights (zero stdev)', () => {
    expect(weightControlConsistency([2, 2, 2])).toBe(1)
  })

  it('returns <1 for varied weights', () => {
    const c = weightControlConsistency([1, 2, 3, 4])
    expect(c).toBeLessThan(1)
    expect(c).toBeGreaterThan(0)
  })

  it('tighter weights → higher consistency', () => {
    const tight = weightControlConsistency([2, 2.1, 1.9])
    const loose = weightControlConsistency([1, 3, 5])
    expect(tight).toBeGreaterThan(loose)
  })

  it('computes exact value for known stdev', () => {
    // weights [0, 2] → mean 1, variance 1, stdev 1 → 1/(1+1) = 0.5
    expect(weightControlConsistency([0, 2])).toBeCloseTo(0.5, 5)
  })
})

describe('iceReadingScore', () => {
  it('returns 0 for empty predicted', () => {
    expect(iceReadingScore([], [1, 2])).toBe(0)
  })

  it('returns 0 for empty actual', () => {
    expect(iceReadingScore([1, 2], [])).toBe(0)
  })

  it('returns 0 for length mismatch', () => {
    expect(iceReadingScore([1, 2, 3], [1, 2])).toBe(0)
  })

  it('returns 1 for perfect prediction', () => {
    expect(iceReadingScore([1, 2, 3], [1, 2, 3])).toBe(1)
  })

  it('returns 1 when no curl and no error', () => {
    expect(iceReadingScore([0, 0], [0, 0])).toBe(1)
  })

  it('returns 0 when no curl expected but error present', () => {
    expect(iceReadingScore([1, 1], [0, 0])).toBe(0)
  })

  it('penalizes prediction error', () => {
    const score = iceReadingScore([2, 2], [1, 1])
    // mae = 1, meanMag = 1 → 1 - 1 = 0
    expect(score).toBe(0)
  })

  it('partial accuracy between 0 and 1', () => {
    // predicted [1.5,1.5] actual [1,1]: mae=0.5, meanMag=1 → 0.5
    expect(iceReadingScore([1.5, 1.5], [1, 1])).toBeCloseTo(0.5, 5)
  })

  it('clamps to 0 for huge error', () => {
    expect(iceReadingScore([10, 10], [1, 1])).toBe(0)
  })

  it('handles negative curl values', () => {
    expect(iceReadingScore([-2, -2], [-2, -2])).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy
// ---------------------------------------------------------------------------

describe('dkCurlingPoints', () => {
  it('all zero stats, game lost → 0', () => {
    const stats: CurlingFantasyStats = {
      shotPct: 0,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    }
    expect(dkCurlingPoints(stats)).toBe(0)
  })

  it('shotPct component (x0.5)', () => {
    const stats: CurlingFantasyStats = {
      shotPct: 80,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    }
    expect(dkCurlingPoints(stats)).toBe(40)
  })

  it('steals component (x4)', () => {
    const stats: CurlingFantasyStats = {
      shotPct: 0,
      steals: 3,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    }
    expect(dkCurlingPoints(stats)).toBe(12)
  })

  it('pointsScored component (x2)', () => {
    const stats: CurlingFantasyStats = {
      shotPct: 0,
      steals: 0,
      pointsScored: 5,
      hammerConversions: 0,
      gameWon: false,
    }
    expect(dkCurlingPoints(stats)).toBe(10)
  })

  it('hammerConversions component (x3)', () => {
    const stats: CurlingFantasyStats = {
      shotPct: 0,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 4,
      gameWon: false,
    }
    expect(dkCurlingPoints(stats)).toBe(12)
  })

  it('gameWon bonus (+10)', () => {
    const stats: CurlingFantasyStats = {
      shotPct: 0,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: true,
    }
    expect(dkCurlingPoints(stats)).toBe(10)
  })

  it('combined all components', () => {
    const stats: CurlingFantasyStats = {
      shotPct: 80, // 40
      steals: 2, // 8
      pointsScored: 6, // 12
      hammerConversions: 3, // 9
      gameWon: true, // 10
    }
    expect(dkCurlingPoints(stats)).toBe(79)
  })

  it('no win bonus when lost', () => {
    const won: CurlingFantasyStats = {
      shotPct: 50,
      steals: 1,
      pointsScored: 2,
      hammerConversions: 1,
      gameWon: true,
    }
    const lost: CurlingFantasyStats = { ...won, gameWon: false }
    expect(dkCurlingPoints(won) - dkCurlingPoints(lost)).toBe(10)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('single game equals its DK points', () => {
    const g: CurlingFantasyStats = {
      shotPct: 80,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    }
    expect(dkProjection([g])).toBe(dkCurlingPoints(g))
  })

  it('averages identical recent games', () => {
    const g: CurlingFantasyStats = {
      shotPct: 80,
      steals: 1,
      pointsScored: 2,
      hammerConversions: 1,
      gameWon: true,
    }
    expect(dkProjection([g, g, g])).toBeCloseTo(dkCurlingPoints(g), 5)
  })

  it('weights first three games 3x', () => {
    const high: CurlingFantasyStats = {
      shotPct: 100,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    } // 50
    const low: CurlingFantasyStats = {
      shotPct: 0,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    } // 0
    // first 3 high (weight 3 each = 9*50=450), 4th low (weight1 = 0)
    // total weight = 9+1 = 10 → 450/10 = 45
    expect(dkProjection([high, high, high, low])).toBeCloseTo(45, 5)
  })

  it('all recent (<=3) → straight average', () => {
    const a: CurlingFantasyStats = {
      shotPct: 100,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    } // 50
    const b: CurlingFantasyStats = {
      shotPct: 0,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    } // 0
    // both weight 3 → (150 + 0) / 6 = 25
    expect(dkProjection([a, b])).toBeCloseTo(25, 5)
  })

  it('non-negative projection', () => {
    const g: CurlingFantasyStats = {
      shotPct: 60,
      steals: 0,
      pointsScored: 0,
      hammerConversions: 0,
      gameWon: false,
    }
    expect(dkProjection([g, g])).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Integration-style scenarios
// ---------------------------------------------------------------------------

describe('integration', () => {
  it('full end → game scenario', () => {
    const e1 = endScore([
      { team: 'a', distance: 0.2 },
      { team: 'a', distance: 0.4 },
      { team: 'b', distance: 0.9 },
    ])
    const e2 = endScore([{ team: 'b', distance: 0.3 }])
    const e3 = endScore([]) // blank
    const ends: EndResult[] = [e1, e2, e3]
    expect(gameScore(ends)).toEqual({ a: 2, b: 1 })
    expect(runningScoreDiff(ends)).toEqual([2, 1, 1])
  })

  it('hammer flips after scoring ends', () => {
    expect(hammerNext('a')).toBe('b')
    expect(hammerNext(hammerNext('a'))).toBe('a')
  })

  it('steals and forces from a single game log', () => {
    const ends: EndResult[] = [
      { team: 'a', points: 1 }, // a steal (b had hammer)
      { team: 'b', points: 1 }, // a forced b to 1
      { team: 'a', points: 2 }, // a hammer score
    ]
    const hammers = ['b', 'b', 'a'] as ('a' | 'b')[]
    expect(stealCount(ends, hammers, 'a')).toBe(1)
    expect(forceCount(ends, 'a')).toBe(1)
  })

  it('fantasy projection beats single low game', () => {
    const strong: CurlingFantasyStats = {
      shotPct: 90,
      steals: 2,
      pointsScored: 5,
      hammerConversions: 3,
      gameWon: true,
    }
    expect(dkProjection([strong])).toBeGreaterThan(dkCurlingPoints(strong) - 1)
  })
})
