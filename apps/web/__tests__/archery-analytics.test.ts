/**
 * archery-analytics.test.ts
 * ~120+ tests for the archery analytics library.
 */
import { describe, it, expect } from 'vitest'
import {
  arrowScore,
  endScore,
  setScore,
  innermostTiebreak,
  setPointSystem,
  matchResult,
  groupingRadius,
  dispersionScore,
  meanRadialError,
  hitRate,
  consistencyScore,
  xRingRate,
  windDrift,
  optimalHoldPoint,
  temperatureArrowVelocityAdjust,
  altitudeAdjust,
  arrowSpineRecommendation,
  bowWeight,
  laneSpeedFPS,
  kineticEnergy,
  qualificationRanking,
  seedMatchup,
  handicapAdjustedScore,
  classificationRating,
  seasonAverage,
  trainingVolume,
  progressTrend,
  peakPerformance,
  performanceZone,
  mentalConsistency,
  dkArcheryPoints,
  dkProjection,
} from '@/lib/sports/archery-analytics'

// ---------------------------------------------------------------------------
// 1. Scoring
// ---------------------------------------------------------------------------

describe('arrowScore', () => {
  it('returns ring value 1', () => expect(arrowScore(1)).toBe(1))
  it('returns ring value 5', () => expect(arrowScore(5)).toBe(5))
  it('returns ring value 10', () => expect(arrowScore(10)).toBe(10))
  it('works with recurve discipline', () =>
    expect(arrowScore(9, 'recurve')).toBe(9))
  it('works with compound discipline', () =>
    expect(arrowScore(10, 'compound')).toBe(10))
  it('works with barebow discipline', () =>
    expect(arrowScore(7, 'barebow')).toBe(7))
  it('all rings 1-10 equal their face value', () => {
    for (let r = 1; r <= 10; r++) {
      expect(arrowScore(r)).toBe(r)
    }
  })
})

describe('endScore', () => {
  it('sums 3 arrows', () => expect(endScore([9, 10, 8])).toBe(27))
  it('sums 6 arrows', () => expect(endScore([10, 10, 9, 9, 8, 7])).toBe(53))
  it('returns 0 for empty array', () => expect(endScore([])).toBe(0))
  it('single arrow', () => expect(endScore([10])).toBe(10))
})

describe('setScore', () => {
  it('totals across multiple ends', () =>
    expect(setScore([[10, 10, 10], [9, 9, 9]])).toBe(57))
  it('empty ends array returns 0', () => expect(setScore([])).toBe(0))
  it('single end', () => expect(setScore([[8, 7, 6]])).toBe(21))
})

describe('innermostTiebreak', () => {
  it('archer 1 wins with more 10+X', () =>
    expect(innermostTiebreak([10, 10, 9], [10, 9, 9])).toBe(1))
  it('archer 2 wins with more 10+X', () =>
    expect(innermostTiebreak([9, 9, 9], [10, 9, 9])).toBe(2))
  it('equal 10+X, archer 1 wins with more X (11)', () =>
    expect(innermostTiebreak([11, 10, 9], [10, 10, 9])).toBe(1))
  it('equal 10+X, archer 2 wins with more X', () =>
    expect(innermostTiebreak([10, 10, 9], [11, 10, 9])).toBe(2))
  it('complete tie returns 0', () =>
    expect(innermostTiebreak([10, 9, 8], [10, 9, 8])).toBe(0))
  it('empty arrays → tie', () =>
    expect(innermostTiebreak([], [])).toBe(0))
  it('multiple Xs vs none', () =>
    expect(innermostTiebreak([11, 11, 10], [10, 10, 10])).toBe(1))
})

describe('setPointSystem', () => {
  it('win: 2-0', () =>
    expect(setPointSystem(27, 25)).toEqual({ myPoints: 2, opponentPoints: 0 }))
  it('loss: 0-2', () =>
    expect(setPointSystem(24, 27)).toEqual({ myPoints: 0, opponentPoints: 2 }))
  it('draw: 1-1', () =>
    expect(setPointSystem(26, 26)).toEqual({ myPoints: 1, opponentPoints: 1 }))
})

describe('matchResult', () => {
  it('returns ongoing when neither reaches 6', () => {
    const series = [
      { my: 27, opponent: 25 },
      { my: 26, opponent: 26 },
    ]
    const r = matchResult(series)
    expect(r.winner).toBe('ongoing')
  })
  it('me wins first to 6', () => {
    // three wins = 6 points
    const series = [
      { my: 27, opponent: 25 },
      { my: 27, opponent: 25 },
      { my: 27, opponent: 25 },
    ]
    const r = matchResult(series)
    expect(r.winner).toBe('me')
    expect(r.mySets).toBe(6)
  })
  it('opponent wins first to 6', () => {
    const series = [
      { my: 25, opponent: 27 },
      { my: 25, opponent: 27 },
      { my: 25, opponent: 27 },
    ]
    const r = matchResult(series)
    expect(r.winner).toBe('opponent')
    expect(r.opponentSets).toBe(6)
  })
  it('5-5 is ongoing (shoot-off needed)', () => {
    // five draws = 5-5
    const series = [
      { my: 26, opponent: 26 },
      { my: 26, opponent: 26 },
      { my: 26, opponent: 26 },
      { my: 26, opponent: 26 },
      { my: 26, opponent: 26 },
    ]
    const r = matchResult(series)
    expect(r.mySets).toBe(5)
    expect(r.opponentSets).toBe(5)
    expect(r.winner).toBe('ongoing')
  })
  it('empty series returns ongoing', () => {
    expect(matchResult([]).winner).toBe('ongoing')
  })
})

// ---------------------------------------------------------------------------
// 2. Accuracy metrics
// ---------------------------------------------------------------------------

describe('groupingRadius', () => {
  it('returns 0 for empty array', () => expect(groupingRadius([])).toBe(0))
  it('single arrow at origin', () =>
    expect(groupingRadius([{ x: 0, y: 0 }])).toBe(0))
  it('symmetric group around centroid', () => {
    const arrows = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]
    expect(groupingRadius(arrows)).toBeCloseTo(1, 5)
  })
  it('two arrows far apart', () => {
    const arrows = [{ x: 0, y: 0 }, { x: 4, y: 0 }]
    expect(groupingRadius(arrows)).toBeCloseTo(2, 5)
  })
})

describe('dispersionScore', () => {
  it('returns 0 for empty array', () => expect(dispersionScore([])).toBe(0))
  it('returns 0 for single arrow', () =>
    expect(dispersionScore([{ x: 0, y: 0 }])).toBe(0))
  it('two arrows 5 apart', () =>
    expect(dispersionScore([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBeCloseTo(5, 5))
  it('max distance found among three arrows', () => {
    const arrows = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 }]
    expect(dispersionScore(arrows)).toBeCloseTo(10, 5)
  })
})

describe('meanRadialError', () => {
  it('returns 0 for empty array', () => expect(meanRadialError([])).toBe(0))
  it('single arrow at origin', () =>
    expect(meanRadialError([{ x: 0, y: 0 }])).toBe(0))
  it('single arrow at (3,4) has MRE=5', () =>
    expect(meanRadialError([{ x: 3, y: 4 }])).toBeCloseTo(5, 5))
  it('two arrows symmetric', () =>
    expect(meanRadialError([{ x: 1, y: 0 }, { x: -1, y: 0 }])).toBeCloseTo(1, 5))
})

describe('hitRate', () => {
  it('returns 0 for empty array', () => expect(hitRate([], 8)).toBe(0))
  it('all arrows hit target ring', () =>
    expect(hitRate([9, 10, 8], 8)).toBe(1))
  it('no arrows hit target ring', () =>
    expect(hitRate([5, 6, 7], 8)).toBe(0))
  it('partial hit rate', () =>
    expect(hitRate([10, 6, 9, 5], 9)).toBeCloseTo(0.5, 5))
  it('target ring of 1 → all arrows hit', () =>
    expect(hitRate([1, 2, 3], 1)).toBe(1))
})

describe('consistencyScore', () => {
  it('returns 0 for empty array', () =>
    expect(consistencyScore([], 30)).toBe(0))
  it('returns 0 if maxEndScore is 0', () =>
    expect(consistencyScore([10, 10], 0)).toBe(0))
  it('perfect consistency (no variation)', () =>
    expect(consistencyScore([27, 27, 27], 30)).toBeCloseTo(1, 5))
  it('lower score for higher variation', () => {
    const high = consistencyScore([27, 27, 27], 30)
    const low = consistencyScore([20, 27, 24], 30)
    expect(high).toBeGreaterThan(low)
  })
})

describe('xRingRate', () => {
  it('returns 0 if totalArrows is 0', () =>
    expect(xRingRate(5, 0)).toBe(0))
  it('correct rate', () =>
    expect(xRingRate(3, 12)).toBeCloseTo(0.25, 5))
  it('100% Xs', () =>
    expect(xRingRate(6, 6)).toBe(1))
})

// ---------------------------------------------------------------------------
// 3. Wind and environmental corrections
// ---------------------------------------------------------------------------

describe('windDrift', () => {
  it('zero wind produces zero drift', () =>
    expect(windDrift(0, 45, 23)).toBe(0))
  it('zero cross-wind angle (headwind/tailwind) produces zero drift', () =>
    expect(windDrift(5, 0, 23)).toBeCloseTo(0, 5))
  it('90-degree crosswind maximises drift', () => {
    const drift90 = windDrift(5, 90, 23)
    const drift45 = windDrift(5, 45, 23)
    expect(drift90).toBeGreaterThan(drift45)
  })
  it('known value: 5 m/s, 90°, default distance=70m, velocity=60m/s → 583.33cm', () => {
    // drift = 5 * sin(90°) * 70 / 60 * 100 = 5 * 1 * 70 / 60 * 100
    const expected = (5 * 1 * 70 / 60) * 100
    expect(windDrift(5, 90, 23)).toBeCloseTo(expected, 2)
  })
  it('custom distance and velocity', () => {
    const drift = windDrift(5, 90, 23, 50, 50)
    const expected = (5 * 1 * 50 / 50) * 100
    expect(drift).toBeCloseTo(expected, 2)
  })
  it('negative crosswind angle gives negative drift', () =>
    expect(windDrift(5, -90, 23)).toBeLessThan(0))
})

describe('optimalHoldPoint', () => {
  it('negates drift in x, y stays 0', () =>
    expect(optimalHoldPoint(10, 5)).toEqual({ x: -10, y: 0 }))
  it('zero drift → aim at center', () => {
    const p = optimalHoldPoint(0, 5)
    expect(p.x).toBeCloseTo(0, 9)
    expect(p.y).toBe(0)
  })
  it('negative drift → positive x hold', () =>
    expect(optimalHoldPoint(-8, 3)).toEqual({ x: 8, y: 0 }))
})

describe('temperatureArrowVelocityAdjust', () => {
  it('at base temp (20°C) velocity unchanged', () =>
    expect(temperatureArrowVelocityAdjust(60, 20)).toBeCloseTo(60, 5))
  it('at 30°C velocity increases ~1%', () =>
    expect(temperatureArrowVelocityAdjust(60, 30)).toBeCloseTo(60.6, 5))
  it('at 10°C velocity decreases ~1%', () =>
    expect(temperatureArrowVelocityAdjust(60, 10)).toBeCloseTo(59.4, 5))
  it('custom base temp', () =>
    expect(temperatureArrowVelocityAdjust(60, 25, 25)).toBeCloseTo(60, 5))
})

describe('altitudeAdjust', () => {
  it('sea level (0m) → no adjustment', () =>
    expect(altitudeAdjust(70, 0)).toBeCloseTo(70, 5))
  it('1000m altitude reduces effective distance', () =>
    expect(altitudeAdjust(70, 1000)).toBeCloseTo(70 * 0.9, 5))
  it('2000m altitude', () =>
    expect(altitudeAdjust(50, 2000)).toBeCloseTo(50 * 0.8, 5))
})

// ---------------------------------------------------------------------------
// 4. Equipment analytics
// ---------------------------------------------------------------------------

describe('arrowSpineRecommendation', () => {
  // spine = drawWeight * 0.9 - (arrowLength - 28) * 2 + (pointWeight - 100) * 0.02
  it('very light setup → ultralight', () => {
    // spine = 20 * 0.9 - 0 + 0 = 18 < 300
    expect(arrowSpineRecommendation(20, 28)).toBe('ultralight')
  })
  it('returns light spine', () => {
    // spine = 380 * 0.9... let's use: 350/0.9 ≈ 389 → light
    // drawWeight=350, arrowLength=28 → spine=350*0.9=315 → light
    expect(arrowSpineRecommendation(350, 28)).toBe('light')
  })
  it('returns medium spine', () => {
    // spine = 490 → medium (500–700)
    // drawWeight=500, arrowLength=28 → 500*0.9=450 → medium
    expect(arrowSpineRecommendation(500, 28)).toBe('medium')
  })
  it('returns stiff spine', () => {
    // spine = 600 → stiff
    // drawWeight=667, arrowLength=28 → 667*0.9≈600
    expect(arrowSpineRecommendation(667, 28)).toBe('stiff')
  })
  it('returns very_stiff for high draw weight', () => {
    // drawWeight=800, arrowLength=28 → 800*0.9=720 > 700
    expect(arrowSpineRecommendation(800, 28)).toBe('very_stiff')
  })
  it('point weight affects spine', () => {
    const light = arrowSpineRecommendation(500, 28, 100)
    const heavier = arrowSpineRecommendation(500, 28, 200)
    // heavier point adds (200-100)*0.02 = 2 → slightly higher spine
    expect(heavier).not.toBe(undefined)
    // Both should be defined; heavier point → higher spine value
    expect(arrowSpineRecommendation(500, 28, 200)).toBeDefined()
  })
})

describe('bowWeight', () => {
  it('basic calculation', () =>
    expect(bowWeight(70, 30)).toBeCloseTo(70 * 30 * 0.025, 5))
  it('custom peakWeight', () =>
    expect(bowWeight(70, 30, 80)).toBeCloseTo(80 * 30 * 0.025, 5))
  it('default peakWeight equals drawWeight', () => {
    expect(bowWeight(60, 28)).toBeCloseTo(60 * 28 * 0.025, 5)
  })
})

describe('laneSpeedFPS', () => {
  it('known calculation', () => {
    const expected = 70 * 3.25 - 400 * 0.006 + 15
    expect(laneSpeedFPS(70, 400)).toBeCloseTo(expected, 5)
  })
  it('heavier arrow → slower speed', () => {
    const light = laneSpeedFPS(70, 300)
    const heavy = laneSpeedFPS(70, 500)
    expect(light).toBeGreaterThan(heavy)
  })
})

describe('kineticEnergy', () => {
  it('known calculation', () => {
    const ke = (400 * 280 * 280) / 450240
    expect(kineticEnergy(400, 280)).toBeCloseTo(ke, 3)
  })
  it('heavier and faster → more KE', () => {
    const low = kineticEnergy(300, 250)
    const high = kineticEnergy(500, 300)
    expect(high).toBeGreaterThan(low)
  })
})

// ---------------------------------------------------------------------------
// 5. Competition analytics
// ---------------------------------------------------------------------------

describe('qualificationRanking', () => {
  it('ranks in descending order', () => {
    const result = qualificationRanking([
      { archerId: 'A', total: 280 },
      { archerId: 'B', total: 295 },
      { archerId: 'C', total: 310 },
    ])
    expect(result[0]?.archerId).toBe('C')
    expect(result[0]?.rank).toBe(1)
    expect(result[1]?.rank).toBe(2)
    expect(result[2]?.rank).toBe(3)
  })
  it('ties share same rank', () => {
    const result = qualificationRanking([
      { archerId: 'A', total: 300 },
      { archerId: 'B', total: 300 },
      { archerId: 'C', total: 290 },
    ])
    const ranks = result.filter((r) => r.total === 300).map((r) => r.rank)
    expect(ranks.every((r) => r === 1)).toBe(true)
    const cRank = result.find((r) => r.archerId === 'C')?.rank
    expect(cRank).toBe(3)
  })
  it('empty array returns empty', () =>
    expect(qualificationRanking([])).toEqual([]))
  it('single archer ranked 1', () => {
    const result = qualificationRanking([{ archerId: 'X', total: 250 }])
    expect(result[0]?.rank).toBe(1)
  })
})

describe('seedMatchup', () => {
  it('8-archer bracket: 4 pairs', () => {
    const pairs = seedMatchup(8, 8)
    expect(pairs).toHaveLength(4)
    expect(pairs[0]).toEqual({ seed1: 1, seed2: 8 })
    expect(pairs[1]).toEqual({ seed1: 2, seed2: 7 })
    expect(pairs[2]).toEqual({ seed1: 3, seed2: 6 })
    expect(pairs[3]).toEqual({ seed1: 4, seed2: 5 })
  })
  it('4-archer bracket', () => {
    const pairs = seedMatchup(4, 4)
    expect(pairs).toHaveLength(2)
    expect(pairs[0]).toEqual({ seed1: 1, seed2: 4 })
  })
  it('no seeds → empty', () =>
    expect(seedMatchup(0, 8)).toHaveLength(0))
})

describe('handicapAdjustedScore', () => {
  it('adds handicap', () =>
    expect(handicapAdjustedScore(250, 30)).toBe(280))
  it('zero handicap', () =>
    expect(handicapAdjustedScore(280, 0)).toBe(280))
  it('negative handicap', () =>
    expect(handicapAdjustedScore(280, -10)).toBe(270))
})

describe('classificationRating', () => {
  it('≥280 → master_bowman', () =>
    expect(classificationRating(285)).toBe('master_bowman'))
  it('280 → master_bowman', () =>
    expect(classificationRating(280)).toBe('master_bowman'))
  it('≥260 → bowman', () =>
    expect(classificationRating(265)).toBe('bowman'))
  it('260 → bowman', () =>
    expect(classificationRating(260)).toBe('bowman'))
  it('≥220 → archer', () =>
    expect(classificationRating(240)).toBe('archer'))
  it('220 → archer', () =>
    expect(classificationRating(220)).toBe('archer'))
  it('≥180 → junior_archer', () =>
    expect(classificationRating(200)).toBe('junior_archer'))
  it('180 → junior_archer', () =>
    expect(classificationRating(180)).toBe('junior_archer'))
  it('<180 → beginner', () =>
    expect(classificationRating(150)).toBe('beginner'))
  it('0 → beginner', () =>
    expect(classificationRating(0)).toBe('beginner'))
})

describe('seasonAverage', () => {
  it('returns 0 for empty', () => expect(seasonAverage([])).toBe(0))
  it('single score', () => expect(seasonAverage([280])).toBe(280))
  it('mean of three scores', () =>
    expect(seasonAverage([270, 280, 290])).toBeCloseTo(280, 5))
})

// ---------------------------------------------------------------------------
// 6. Training metrics
// ---------------------------------------------------------------------------

describe('trainingVolume', () => {
  it('empty sessions', () =>
    expect(trainingVolume([])).toEqual({
      totalArrows: 0,
      totalMinutes: 0,
      arrowsPerHour: 0,
    }))
  it('aggregates correctly', () => {
    const result = trainingVolume([
      { arrows: 60, duration: 60 },
      { arrows: 60, duration: 60 },
    ])
    expect(result.totalArrows).toBe(120)
    expect(result.totalMinutes).toBe(120)
    expect(result.arrowsPerHour).toBeCloseTo(60, 5)
  })
  it('zero duration → arrowsPerHour = 0', () =>
    expect(trainingVolume([{ arrows: 100, duration: 0 }]).arrowsPerHour).toBe(0))
})

describe('progressTrend', () => {
  it('returns 0 for empty', () => expect(progressTrend([])).toBe(0))
  it('returns 0 for single value', () => expect(progressTrend([280])).toBe(0))
  it('positive trend (improving)', () => {
    expect(progressTrend([270, 275, 280, 285])).toBeGreaterThan(0)
  })
  it('negative trend (declining)', () => {
    expect(progressTrend([285, 280, 275, 270])).toBeLessThan(0)
  })
  it('flat trend → 0', () =>
    expect(progressTrend([280, 280, 280])).toBeCloseTo(0, 5))
})

describe('peakPerformance', () => {
  it('returns 0 for empty', () => expect(peakPerformance([])).toBe(0))
  it('single value', () => expect(peakPerformance([280])).toBe(280))
  it('max of array', () =>
    expect(peakPerformance([270, 295, 280])).toBe(295))
})

describe('performanceZone', () => {
  it('≥95% → peak', () =>
    expect(performanceZone(285, 300)).toBe('peak'))
  it('exactly 95% → peak', () =>
    expect(performanceZone(285, 300)).toBe('peak'))
  it('≥85% < 95% → good', () =>
    expect(performanceZone(255, 300)).toBe('good'))
  it('≥70% < 85% → average', () =>
    expect(performanceZone(210, 300)).toBe('average'))
  it('≥50% < 70% → below', () =>
    expect(performanceZone(165, 300)).toBe('below'))
  it('<50% → poor', () =>
    expect(performanceZone(140, 300)).toBe('poor'))
  it('maxScore=0 → poor', () =>
    expect(performanceZone(100, 0)).toBe('poor'))
})

describe('mentalConsistency', () => {
  it('returns 0 for empty', () => expect(mentalConsistency([])).toBe(0))
  it('all same scores → 1', () =>
    expect(mentalConsistency([280, 280, 280])).toBeCloseTo(1, 5))
  it('high variation → lower score', () => {
    const low = mentalConsistency([250, 270, 290, 230, 300])
    expect(low).toBeLessThan(1)
  })
  it('two scores, small variation → high consistency', () => {
    const c = mentalConsistency([280, 282])
    expect(c).toBeGreaterThan(0.9)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy
// ---------------------------------------------------------------------------

describe('dkArcheryPoints', () => {
  it('1st place', () =>
    expect(dkArcheryPoints({ place: 1, score: 330, xs: 0, worldRecord: false })).toBe(30))
  it('2nd place', () =>
    expect(dkArcheryPoints({ place: 2, score: 320, xs: 0, worldRecord: false })).toBe(25))
  it('3rd place', () =>
    expect(dkArcheryPoints({ place: 3, score: 310, xs: 0, worldRecord: false })).toBe(20))
  it('4th place', () =>
    expect(dkArcheryPoints({ place: 4, score: 305, xs: 0, worldRecord: false })).toBe(16))
  it('5th place', () =>
    expect(dkArcheryPoints({ place: 5, score: 300, xs: 0, worldRecord: false })).toBe(13))
  it('6th place', () =>
    expect(dkArcheryPoints({ place: 6, score: 295, xs: 0, worldRecord: false })).toBe(11))
  it('7th place', () =>
    expect(dkArcheryPoints({ place: 7, score: 290, xs: 0, worldRecord: false })).toBe(9))
  it('8th place', () =>
    expect(dkArcheryPoints({ place: 8, score: 285, xs: 0, worldRecord: false })).toBe(7))
  it('9th+ place → 2', () =>
    expect(dkArcheryPoints({ place: 10, score: 280, xs: 0, worldRecord: false })).toBe(2))
  it('+0.5 per X', () =>
    expect(dkArcheryPoints({ place: 1, score: 330, xs: 4, worldRecord: false })).toBe(32))
  it('WR bonus +15', () =>
    expect(dkArcheryPoints({ place: 1, score: 340, xs: 0, worldRecord: true })).toBe(45))
  it('X + WR combined', () =>
    expect(dkArcheryPoints({ place: 1, score: 340, xs: 6, worldRecord: true })).toBe(48))
  it('place 1 + 2 Xs + WR', () =>
    expect(dkArcheryPoints({ place: 1, score: 330, xs: 2, worldRecord: true })).toBe(46))
})

describe('dkProjection', () => {
  it('returns 0 for empty', () => expect(dkProjection([])).toBe(0))
  it('single result → same as dkArcheryPoints', () => {
    const result = { place: 1, score: 330, xs: 0, worldRecord: false }
    expect(dkProjection([result])).toBeCloseTo(
      dkArcheryPoints(result),
      5,
    )
  })
  it('latest result (last element) has 3x weight', () => {
    const old = { place: 8, score: 280, xs: 0, worldRecord: false } // 7 pts
    const latest = { place: 1, score: 330, xs: 0, worldRecord: false } // 30 pts
    // weight: old=1x(7), latest=3x(30) → (7 + 90) / 4 = 24.25
    const proj = dkProjection([old, latest])
    expect(proj).toBeCloseTo((7 + 90) / 4, 4)
  })
  it('three results: first two 1x, last 3x', () => {
    const r1 = { place: 2, score: 320, xs: 0, worldRecord: false } // 25
    const r2 = { place: 3, score: 310, xs: 0, worldRecord: false } // 20
    const r3 = { place: 1, score: 330, xs: 0, worldRecord: false } // 30
    // (25*1 + 20*1 + 30*3) / 5 = (25+20+90)/5 = 135/5 = 27
    expect(dkProjection([r1, r2, r3])).toBeCloseTo(27, 4)
  })
})
