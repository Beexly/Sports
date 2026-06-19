/**
 * golf-analytics.test.ts
 * Comprehensive tests for the golf analytics library.
 * Target: >= 115 tests covering all exported functions.
 */

import { describe, it, expect } from 'vitest'
import {
  toPar,
  scoreLabel,
  roundToPar,
  frontNine,
  backNine,
  countScoreType,
  scoringAverage,
  adjustedScoringAverage,
  fairwayHitPct,
  girPct,
  avgPutts,
  puttsPerGIR,
  onePuttPct,
  threePuttPct,
  sandSavePct,
  avgDrivingDistance,
  drivingAccuracy,
  totalDrivingRank,
  expectedStrokes,
  sgShot,
  sgOffTee,
  sgApproach,
  sgAround,
  sgPutting,
  totalSG,
  courseHandicap,
  adjustedGrossScore,
  scoreDifferential,
  handicapIndex,
  playingHandicap,
  netScore,
  courseRating,
  slopeRating,
  difficulty,
  courseParAdjusted,
  leaderboard,
  cutLine,
  projectedFinish,
  madeTheCut,
  fieldStrengthIndex,
  draftKingsGolfScore,
  fanDuelGolfScore,
  type HoleResult,
  type RoundStats,
  type TournamentEntry,
  type Shot,
} from '../lib/sports/golf-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHole(
  par: number,
  score: number,
  putts = 2,
  fairwayHit?: boolean,
  gir?: boolean,
  drivingDistance?: number,
): HoleResult {
  return { par, score, putts, fairwayHit, greenInRegulation: gir, drivingDistance }
}

function makeRound(scores: number[], par: number, rating: number, slope: number): RoundStats {
  const holes: HoleResult[] = scores.map((s) => makeHole(par === 72 ? 4 : Math.round(par / scores.length), s, 2))
  return { holes, course: 'Test Course', par, rating, slope }
}

// Standard 18-hole par 72 setup: mix of par 3, 4, 5
function standardHoles(): HoleResult[] {
  // 4 par-3s, 10 par-4s, 4 par-5s = par 72
  const pars = [4, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5]
  return pars.map((par, i) => ({
    par,
    score: par, // even par by default
    putts: 2,
    fairwayHit: par >= 4 ? true : undefined,
    greenInRegulation: true,
    drivingDistance: par >= 4 ? 260 + i * 2 : undefined,
  }))
}

// ---------------------------------------------------------------------------
// toPar
// ---------------------------------------------------------------------------

describe('toPar', () => {
  it('returns 0 for par score', () => {
    expect(toPar(4, 4)).toBe(0)
  })

  it('returns negative for birdie', () => {
    expect(toPar(3, 4)).toBe(-1)
  })

  it('returns negative for eagle', () => {
    expect(toPar(2, 4)).toBe(-2)
  })

  it('returns positive for bogey', () => {
    expect(toPar(5, 4)).toBe(1)
  })

  it('returns positive for double bogey', () => {
    expect(toPar(6, 4)).toBe(2)
  })

  it('handles par 3', () => {
    expect(toPar(1, 3)).toBe(-2)
  })

  it('handles par 5', () => {
    expect(toPar(6, 5)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// scoreLabel
// ---------------------------------------------------------------------------

describe('scoreLabel', () => {
  it('labels eagle as "eagle"', () => {
    expect(scoreLabel(-2)).toBe('eagle')
  })

  it('labels birdie as "birdie"', () => {
    expect(scoreLabel(-1)).toBe('birdie')
  })

  it('labels par as "par"', () => {
    expect(scoreLabel(0)).toBe('par')
  })

  it('labels bogey as "bogey"', () => {
    expect(scoreLabel(1)).toBe('bogey')
  })

  it('labels double bogey as "double bogey"', () => {
    expect(scoreLabel(2)).toBe('double bogey')
  })

  it('labels triple bogey as "triple bogey"', () => {
    expect(scoreLabel(3)).toBe('triple bogey')
  })

  it('labels +4 as "+4"', () => {
    expect(scoreLabel(4)).toBe('+4')
  })

  it('labels +5 as "+5"', () => {
    expect(scoreLabel(5)).toBe('+5')
  })

  it('labels +10 as "+10"', () => {
    expect(scoreLabel(10)).toBe('+10')
  })

  it('labels -3 or lower as "albatross"', () => {
    expect(scoreLabel(-3)).toBe('albatross')
    expect(scoreLabel(-4)).toBe('albatross')
  })
})

// ---------------------------------------------------------------------------
// roundToPar
// ---------------------------------------------------------------------------

describe('roundToPar', () => {
  it('returns 0 for all par scores', () => {
    const holes = [makeHole(4, 4), makeHole(3, 3), makeHole(5, 5)]
    expect(roundToPar(holes)).toBe(0)
  })

  it('returns -3 for three birdies', () => {
    const holes = [makeHole(4, 3), makeHole(4, 3), makeHole(4, 3)]
    expect(roundToPar(holes)).toBe(-3)
  })

  it('returns +4 for mix of bogeys and double bogeys', () => {
    const holes = [makeHole(4, 5), makeHole(4, 5), makeHole(4, 6)]
    expect(roundToPar(holes)).toBe(4)
  })

  it('handles empty array', () => {
    expect(roundToPar([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// frontNine / backNine
// ---------------------------------------------------------------------------

describe('frontNine', () => {
  it('returns strokes for first 9 holes', () => {
    const holes = Array.from({ length: 18 }, (_, i) => makeHole(4, i < 9 ? 4 : 5))
    expect(frontNine(holes)).toBe(36)
  })

  it('ignores extra holes beyond 18', () => {
    const holes = Array.from({ length: 9 }, () => makeHole(4, 3))
    expect(frontNine(holes)).toBe(27)
  })
})

describe('backNine', () => {
  it('returns strokes for holes 9-17', () => {
    const holes = Array.from({ length: 18 }, (_, i) => makeHole(4, i < 9 ? 4 : 5))
    expect(backNine(holes)).toBe(45)
  })

  it('returns 0 when fewer than 10 holes', () => {
    const holes = Array.from({ length: 9 }, () => makeHole(4, 4))
    expect(backNine(holes)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// countScoreType
// ---------------------------------------------------------------------------

describe('countScoreType', () => {
  const holes = [
    makeHole(4, 2), // eagle
    makeHole(4, 3), // birdie
    makeHole(4, 4), // par
    makeHole(4, 5), // bogey
    makeHole(4, 6), // double bogey
    makeHole(4, 7), // worse
  ]

  it('counts eagles correctly', () => {
    expect(countScoreType(holes, 'eagle')).toBe(1)
  })

  it('counts birdies correctly', () => {
    expect(countScoreType(holes, 'birdie')).toBe(1)
  })

  it('counts pars correctly', () => {
    expect(countScoreType(holes, 'par')).toBe(1)
  })

  it('counts bogeys correctly', () => {
    expect(countScoreType(holes, 'bogey')).toBe(1)
  })

  it('counts double bogeys correctly', () => {
    expect(countScoreType(holes, 'double_bogey')).toBe(1)
  })

  it('counts worse correctly', () => {
    expect(countScoreType(holes, 'worse')).toBe(1)
  })

  it('eagles includes albatross (-3)', () => {
    const h = [makeHole(5, 2)] // -3 = albatross
    expect(countScoreType(h, 'eagle')).toBe(1)
  })

  it('returns 0 on empty array', () => {
    expect(countScoreType([], 'birdie')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// scoringAverage / adjustedScoringAverage
// ---------------------------------------------------------------------------

describe('scoringAverage', () => {
  it('returns average strokes per round', () => {
    const rounds: RoundStats[] = [
      {
        holes: Array.from({ length: 18 }, () => makeHole(4, 4)),
        course: 'A',
        par: 72,
        rating: 72,
        slope: 113,
      },
      {
        holes: Array.from({ length: 18 }, () => makeHole(4, 5)),
        course: 'B',
        par: 72,
        rating: 72,
        slope: 113,
      },
    ]
    expect(scoringAverage(rounds)).toBe(81) // 18*4=72, 18*5=90 → avg=81
  })

  it('returns 0 for empty rounds', () => {
    expect(scoringAverage([])).toBe(0)
  })
})

describe('adjustedScoringAverage', () => {
  it('caps each hole at par+2', () => {
    const rounds: RoundStats[] = [
      {
        holes: [
          makeHole(4, 10), // capped at 6
          makeHole(4, 4),
          makeHole(4, 4),
        ],
        course: 'A',
        par: 12,
        rating: 12,
        slope: 113,
      },
    ]
    // Uncapped: 10+4+4=18; capped: 6+4+4=14
    expect(adjustedScoringAverage(rounds)).toBe(14)
  })

  it('does not cap normal scores', () => {
    const rounds: RoundStats[] = [
      {
        holes: [makeHole(4, 4), makeHole(4, 5), makeHole(4, 6)],
        course: 'A',
        par: 12,
        rating: 12,
        slope: 113,
      },
    ]
    expect(adjustedScoringAverage(rounds)).toBe(15)
  })

  it('returns 0 for empty', () => {
    expect(adjustedScoringAverage([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Fairways, GIR, Putting
// ---------------------------------------------------------------------------

describe('fairwayHitPct', () => {
  it('counts only par 4s and 5s', () => {
    const holes = [
      makeHole(3, 3, 2, undefined, true), // par 3 — excluded
      makeHole(4, 4, 2, true, true),
      makeHole(5, 5, 2, false, true),
    ]
    expect(fairwayHitPct(holes)).toBeCloseTo(0.5)
  })

  it('returns 1.0 when all fairways hit', () => {
    const holes = [makeHole(4, 4, 2, true), makeHole(5, 5, 2, true)]
    expect(fairwayHitPct(holes)).toBe(1)
  })

  it('returns 0 when no fairways hit', () => {
    const holes = [makeHole(4, 4, 2, false), makeHole(4, 4, 2, false)]
    expect(fairwayHitPct(holes)).toBe(0)
  })

  it('returns 0 when no applicable holes', () => {
    const holes = [makeHole(3, 3)]
    expect(fairwayHitPct(holes)).toBe(0)
  })

  it('excludes holes where fairwayHit is undefined', () => {
    const holes = [makeHole(4, 4, 2, undefined), makeHole(4, 4, 2, true)]
    expect(fairwayHitPct(holes)).toBe(1)
  })
})

describe('girPct', () => {
  it('returns correct GIR percentage', () => {
    const holes = [
      makeHole(4, 4, 2, true, true),
      makeHole(4, 4, 2, true, false),
      makeHole(4, 4, 2, true, true),
    ]
    expect(girPct(holes)).toBeCloseTo(2 / 3)
  })

  it('returns 0 for empty', () => {
    expect(girPct([])).toBe(0)
  })

  it('returns 1 when all GIR', () => {
    const holes = standardHoles()
    expect(girPct(holes)).toBe(1)
  })
})

describe('avgPutts', () => {
  it('returns mean putts per hole', () => {
    const holes = [makeHole(4, 4, 1), makeHole(4, 4, 2), makeHole(4, 4, 3)]
    expect(avgPutts(holes)).toBe(2)
  })

  it('returns 0 for empty', () => {
    expect(avgPutts([])).toBe(0)
  })
})

describe('puttsPerGIR', () => {
  it('returns avg putts only on GIR holes', () => {
    const holes = [
      makeHole(4, 4, 1, true, true),
      makeHole(4, 5, 3, true, false), // not GIR — excluded
      makeHole(4, 4, 2, true, true),
    ]
    expect(puttsPerGIR(holes)).toBe(1.5)
  })

  it('returns 0 when no GIR holes', () => {
    const holes = [makeHole(4, 5, 2, true, false)]
    expect(puttsPerGIR(holes)).toBe(0)
  })
})

describe('onePuttPct', () => {
  it('counts holes with exactly 1 putt', () => {
    const holes = [makeHole(4, 4, 1), makeHole(4, 4, 2), makeHole(4, 4, 1)]
    expect(onePuttPct(holes)).toBeCloseTo(2 / 3)
  })

  it('returns 0 for empty', () => {
    expect(onePuttPct([])).toBe(0)
  })
})

describe('threePuttPct', () => {
  it('counts holes with 3+ putts', () => {
    const holes = [makeHole(4, 4, 2), makeHole(4, 5, 3), makeHole(4, 6, 4)]
    expect(threePuttPct(holes)).toBeCloseTo(2 / 3)
  })

  it('returns 0 for empty', () => {
    expect(threePuttPct([])).toBe(0)
  })
})

describe('sandSavePct', () => {
  it('returns correct sand save percentage', () => {
    expect(sandSavePct(10, 4)).toBe(0.4)
  })

  it('returns 0 when no bunker shots', () => {
    expect(sandSavePct(0, 0)).toBe(0)
  })

  it('returns 1 when all saves made', () => {
    expect(sandSavePct(5, 5)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Driving
// ---------------------------------------------------------------------------

describe('avgDrivingDistance', () => {
  it('returns mean driving distance', () => {
    const holes = [
      makeHole(4, 4, 2, true, true, 280),
      makeHole(4, 4, 2, true, true, 300),
      makeHole(3, 3), // no driving distance
    ]
    expect(avgDrivingDistance(holes)).toBe(290)
  })

  it('returns 0 when no distances recorded', () => {
    const holes = [makeHole(3, 3)]
    expect(avgDrivingDistance(holes)).toBe(0)
  })
})

describe('drivingAccuracy', () => {
  it('delegates to fairwayHitPct', () => {
    const holes = [makeHole(4, 4, 2, true), makeHole(4, 4, 2, false)]
    expect(drivingAccuracy(holes)).toBe(0.5)
  })
})

describe('totalDrivingRank', () => {
  it('returns average of distance and accuracy ranks', () => {
    expect(totalDrivingRank(10, 20, 200)).toBe(15)
  })

  it('handles tied ranks', () => {
    expect(totalDrivingRank(5, 5, 100)).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Strokes Gained — expectedStrokes
// ---------------------------------------------------------------------------

describe('expectedStrokes', () => {
  it('returns tee shot baseline at known distances', () => {
    // par4 table: 300y → 3.8, 400y → 4.0, 450y → 4.1
    expect(expectedStrokes('tee', 300)).toBeCloseTo(3.8)
    expect(expectedStrokes('tee', 400)).toBeCloseTo(4.0)
    expect(expectedStrokes('tee', 450)).toBeCloseTo(4.1)
  })

  it('interpolates tee shot baseline', () => {
    // midpoint between 300 (3.8) and 400 (4.0) → 3.9
    expect(expectedStrokes('tee', 350)).toBeCloseTo(3.9)
  })

  it('clamps tee shot below min distance', () => {
    expect(expectedStrokes('tee', 100)).toBeCloseTo(3.8)
  })

  it('clamps tee shot above max distance', () => {
    expect(expectedStrokes('tee', 600)).toBeCloseTo(4.1)
  })

  it('returns approach baseline at known distances', () => {
    expect(expectedStrokes('approach', 100)).toBeCloseTo(3.0)
    expect(expectedStrokes('approach', 150)).toBeCloseTo(3.2)
  })

  it('interpolates approach baseline', () => {
    // midpoint between 100 (3.0) and 150 (3.2) → 3.1
    expect(expectedStrokes('approach', 125)).toBeCloseTo(3.1)
  })

  it('returns around-green baseline at known distances', () => {
    expect(expectedStrokes('around_green', 10)).toBeCloseTo(2.4)
    expect(expectedStrokes('around_green', 30)).toBeCloseTo(2.6)
  })

  it('returns putting baseline at known distances', () => {
    expect(expectedStrokes('putting', 3)).toBeCloseTo(1.08)
    expect(expectedStrokes('putting', 10)).toBeCloseTo(1.5)
    expect(expectedStrokes('putting', 30)).toBeCloseTo(2.15)
  })

  it('interpolates putting baseline', () => {
    // between 3ft (1.08) and 5ft (1.20) at 4ft → 1.14
    expect(expectedStrokes('putting', 4)).toBeCloseTo(1.14)
  })

  it('clamps putting to [1.0, 2.5]', () => {
    expect(expectedStrokes('putting', 0)).toBeGreaterThanOrEqual(1.0)
    expect(expectedStrokes('putting', 100)).toBeLessThanOrEqual(2.5)
  })
})

// ---------------------------------------------------------------------------
// sgShot
// ---------------------------------------------------------------------------

describe('sgShot', () => {
  it('returns positive SG when shot beats baseline', () => {
    // expectedStrokes('approach', 150) = 3.2; after holed = 0
    // SG = 3.2 - (1 + 0) = 2.2
    const sg = sgShot('approach', 150, 'holed')
    expect(sg).toBeCloseTo(2.2)
  })

  it('returns negative SG when shot underperforms', () => {
    // From 100y (3.0 expected), hit to 50y (2.8 expected)
    // SG = 3.0 - (1 + 2.8) = -0.8
    const sg = sgShot('approach', 100, 50)
    expect(sg).toBeCloseTo(-0.8)
  })

  it('correctly handles hole-out from putt', () => {
    // from 3ft (1.08 expected), holed
    // SG = 1.08 - (1 + 0) = 0.08
    const sg = sgShot('putting', 3, 'holed')
    expect(sg).toBeCloseTo(0.08)
  })
})

// ---------------------------------------------------------------------------
// sgPutting
// ---------------------------------------------------------------------------

describe('sgPutting', () => {
  it('returns positive when makes long putt', () => {
    // 30ft putt made: expected 2.15 - (1 + 0) = 1.15
    const sg = sgPutting([{ feet: 30, made: true }])
    expect(sg).toBeGreaterThan(0)
  })

  it('returns near-zero for routine short putt made', () => {
    // 3ft made: 1.08 - (1 + 0) = 0.08
    const sg = sgPutting([{ feet: 3, made: true }])
    expect(sg).toBeCloseTo(0.08)
  })

  it('returns negative when missing putt', () => {
    // 3ft missed: 1.08 - (1 + expectedStrokes('putting', 1.5)) < 0
    const sg = sgPutting([{ feet: 3, made: false }])
    expect(sg).toBeLessThan(0)
  })

  it('accumulates across multiple putts', () => {
    const sg = sgPutting([
      { feet: 20, made: true },
      { feet: 5, made: true },
    ])
    expect(sg).toBeGreaterThan(0)
  })

  it('returns 0 for empty array', () => {
    expect(sgPutting([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// totalSG
// ---------------------------------------------------------------------------

describe('totalSG', () => {
  it('sums all SG categories', () => {
    const result = totalSG({ offTee: 1.2, approach: 0.8, around: -0.3, putting: 0.5 })
    expect(result).toBeCloseTo(2.2)
  })

  it('handles all zeros', () => {
    expect(totalSG({ offTee: 0, approach: 0, around: 0, putting: 0 })).toBe(0)
  })

  it('handles negative total', () => {
    expect(totalSG({ offTee: -1, approach: -0.5, around: -0.5, putting: -0.5 })).toBeCloseTo(-2.5)
  })
})

// ---------------------------------------------------------------------------
// Handicap System
// ---------------------------------------------------------------------------

describe('courseHandicap', () => {
  it('returns correct course handicap', () => {
    // floor(10 × (113/113) + (72 - 72)) = floor(10) = 10
    expect(courseHandicap(10, 113, 72, 72)).toBe(10)
  })

  it('applies slope adjustment', () => {
    // floor(10 × (130/113) + 0) = floor(11.5) = 11
    expect(courseHandicap(10, 130, 72, 72)).toBe(11)
  })

  it('includes rating-par offset', () => {
    // floor(10 × (113/113) + (74 - 72)) = floor(12) = 12
    expect(courseHandicap(10, 113, 74, 72)).toBe(12)
  })

  it('floors fractional result', () => {
    // floor(7.5 × (113/113) + 0) = 7
    expect(courseHandicap(7.5, 113, 72, 72)).toBe(7)
  })
})

describe('adjustedGrossScore', () => {
  it('returns the score as-is (simplified)', () => {
    expect(adjustedGrossScore(85, 15)).toBe(85)
  })
})

describe('scoreDifferential', () => {
  it('returns correct differential', () => {
    // (85 - 72) * (113/113) = 13
    expect(scoreDifferential(85, 72, 113)).toBeCloseTo(13)
  })

  it('adjusts for slope', () => {
    // (85 - 72) * (113/130) = 13 * 0.869 ≈ 11.3
    expect(scoreDifferential(85, 72, 130)).toBeCloseTo(11.3, 0)
  })

  it('handles below-rating score', () => {
    // (70 - 72) * (113/113) = -2
    expect(scoreDifferential(70, 72, 113)).toBeCloseTo(-2)
  })
})

describe('handicapIndex', () => {
  it('returns 0 for fewer than 3 differentials', () => {
    expect(handicapIndex([12])).toBe(0)
    expect(handicapIndex([])).toBe(0)
  })

  it('uses best 1 of 3 differentials (partial table)', () => {
    // 3 rounds → use best 1 × 0.96
    const diffs = [10, 15, 20]
    expect(handicapIndex(diffs)).toBeCloseTo(10 * 0.96)
  })

  it('uses best 2 of 6 differentials', () => {
    // 6 rounds → use best 2 × 0.96
    const diffs = [8, 10, 12, 14, 16, 18]
    expect(handicapIndex(diffs)).toBeCloseTo((8 + 10) / 2 * 0.96)
  })

  it('uses best 8 of last 20 for large sets', () => {
    // 20 identical differentials of 10 → best 8 avg = 10 × 0.96 = 9.6
    const diffs = Array.from({ length: 20 }, () => 10)
    expect(handicapIndex(diffs)).toBeCloseTo(9.6)
  })

  it('uses last 20 when more than 20 available', () => {
    // 25 diffs: first 5 are 0 (low), last 20 are all 10
    const diffs = [...Array.from({ length: 5 }, () => 0), ...Array.from({ length: 20 }, () => 10)]
    expect(handicapIndex(diffs)).toBeCloseTo(9.6)
  })

  it('handles 19 differentials — uses best 8', () => {
    const diffs = Array.from({ length: 19 }, (_, i) => i + 1) // 1-19
    // partial table for 19 → use best 8
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8]
    const avg = sorted.reduce((a, b) => a + b, 0) / 8
    expect(handicapIndex(diffs)).toBeCloseTo(avg * 0.96)
  })
})

describe('playingHandicap', () => {
  it('returns floor of courseHandicap × allowance', () => {
    expect(playingHandicap(15)).toBe(15)
    expect(playingHandicap(15, 0.9)).toBe(13) // floor(15 × 0.9) = floor(13.5) = 13
  })

  it('applies custom allowance', () => {
    expect(playingHandicap(10, 0.95)).toBe(9) // floor(9.5) = 9
  })
})

describe('netScore', () => {
  it('subtracts playing handicap from gross', () => {
    expect(netScore(85, 15)).toBe(70)
  })

  it('handles scratch golfer', () => {
    expect(netScore(72, 0)).toBe(72)
  })
})

// ---------------------------------------------------------------------------
// Course Difficulty
// ---------------------------------------------------------------------------

describe('courseRating', () => {
  it('returns the rating directly', () => {
    expect(courseRating(72.5)).toBe(72.5)
  })
})

describe('slopeRating', () => {
  it('returns difficulty directly', () => {
    expect(slopeRating(130)).toBe(130)
  })
})

describe('difficulty', () => {
  it('labels easy course (slope < 70)', () => {
    const result = difficulty(68, 65, 72)
    expect(result.label).toBe('easy')
    expect(result.overPar).toBeCloseTo(-4)
    expect(result.bogeyDiff).toBe(65)
  })

  it('labels moderate course (slope 70-120)', () => {
    const result = difficulty(72, 113, 72)
    expect(result.label).toBe('moderate')
  })

  it('labels hard course (slope 121-135)', () => {
    const result = difficulty(74, 130, 72)
    expect(result.label).toBe('hard')
  })

  it('labels very hard course (slope > 135)', () => {
    const result = difficulty(76, 145, 72)
    expect(result.label).toBe('very_hard')
  })

  it('returns correct overPar', () => {
    const result = difficulty(75.5, 130, 72)
    expect(result.overPar).toBeCloseTo(3.5)
  })

  it('boundary: slope exactly 70 is moderate', () => {
    const result = difficulty(72, 70, 72)
    expect(result.label).toBe('moderate')
  })

  it('boundary: slope exactly 135 is hard', () => {
    const result = difficulty(72, 135, 72)
    expect(result.label).toBe('hard')
  })

  it('boundary: slope exactly 120 is moderate', () => {
    const result = difficulty(72, 120, 72)
    expect(result.label).toBe('moderate')
  })
})

describe('courseParAdjusted', () => {
  it('normalizes score to standard scale', () => {
    // 80 - 72.5 + 72 = 79.5
    expect(courseParAdjusted(80, 72.5, 72)).toBeCloseTo(79.5)
  })

  it('handles exact rating match', () => {
    expect(courseParAdjusted(72, 72, 72)).toBe(72)
  })
})

// ---------------------------------------------------------------------------
// Tournament Analytics
// ---------------------------------------------------------------------------

describe('leaderboard', () => {
  const entries: TournamentEntry[] = [
    { playerId: 'A', score: -10, holesCompleted: 72 },
    { playerId: 'B', score: -8, holesCompleted: 72 },
    { playerId: 'C', score: -10, holesCompleted: 72 },
    { playerId: 'D', score: -12, holesCompleted: 72 },
  ]

  it('sorts by score ascending (lowest wins)', () => {
    const lb = leaderboard(entries)
    expect(lb[0]!.score).toBe(-12)
    expect(lb[3]!.score).toBe(-8)
  })

  it('assigns position 1 to leader', () => {
    const lb = leaderboard(entries)
    expect(lb[0]!.position).toBe(1)
  })

  it('assigns same position to tied players', () => {
    const lb = leaderboard(entries)
    const tied = lb.filter((e) => e.score === -10)
    expect(tied.every((e) => e.position === 2)).toBe(true)
  })

  it('does not modify original array', () => {
    const orig = [...entries]
    leaderboard(entries)
    expect(entries[0]!.playerId).toBe(orig[0]!.playerId)
  })

  it('handles single entry', () => {
    const lb = leaderboard([{ playerId: 'X', score: -5, holesCompleted: 72 }])
    expect(lb[0]!.position).toBe(1)
  })

  it('breaks ties by holesCompleted descending', () => {
    const tied: TournamentEntry[] = [
      { playerId: 'A', score: -5, holesCompleted: 54 },
      { playerId: 'B', score: -5, holesCompleted: 72 },
    ]
    const lb = leaderboard(tied)
    expect(lb[0]!.playerId).toBe('B')
  })
})

describe('cutLine', () => {
  it('returns score of 70th player', () => {
    const entries: TournamentEntry[] = Array.from({ length: 100 }, (_, i) => ({
      playerId: `P${i}`,
      score: i - 50, // -50 to 49
      holesCompleted: 36,
    }))
    const cut = cutLine(entries)
    expect(cut).toBe(19) // 70th player (index 69): score = 69 - 50 = 19
  })

  it('accepts custom cut size', () => {
    const entries: TournamentEntry[] = Array.from({ length: 10 }, (_, i) => ({
      playerId: `P${i}`,
      score: i,
      holesCompleted: 36,
    }))
    expect(cutLine(entries, 5)).toBe(4) // 5th player: score=4 (0-indexed: 0,1,2,3,4)
  })

  it('clamps to available players when cut size exceeds field', () => {
    const entries: TournamentEntry[] = [
      { playerId: 'A', score: -3, holesCompleted: 36 },
      { playerId: 'B', score: 0, holesCompleted: 36 },
    ]
    expect(cutLine(entries, 70)).toBe(0)
  })
})

describe('projectedFinish', () => {
  it('projects 72-hole score from pace', () => {
    // -5 after 18 holes → projected -20 over 72
    expect(projectedFinish(-5, 18, 72)).toBeCloseTo(-20)
  })

  it('uses default totalHoles of 72', () => {
    expect(projectedFinish(-2, 18)).toBeCloseTo(-8)
  })

  it('returns 0 when holesPlayed is 0', () => {
    expect(projectedFinish(-5, 0)).toBe(0)
  })
})

describe('madeTheCut', () => {
  it('returns true when score <= cutLine', () => {
    expect(madeTheCut(-5, -3)).toBe(true)
    expect(madeTheCut(-3, -3)).toBe(true)
  })

  it('returns false when score > cutLine', () => {
    expect(madeTheCut(0, -3)).toBe(false)
  })
})

describe('fieldStrengthIndex', () => {
  it('returns ratio of below-average scores', () => {
    const entries: TournamentEntry[] = [
      { playerId: 'A', score: -5, holesCompleted: 72 },
      { playerId: 'B', score: -3, holesCompleted: 72 },
      { playerId: 'C', score: 2, holesCompleted: 72 },
      { playerId: 'D', score: 5, holesCompleted: 72 },
    ]
    // avgTourRating default=0 → below-average means score<0 → 2 out of 4
    expect(fieldStrengthIndex(entries)).toBe(0.5)
  })

  it('returns 0 for empty field', () => {
    expect(fieldStrengthIndex([])).toBe(0)
  })

  it('uses custom avgTourRating', () => {
    const entries: TournamentEntry[] = [
      { playerId: 'A', score: -5, holesCompleted: 72 },
      { playerId: 'B', score: -3, holesCompleted: 72 },
      { playerId: 'C', score: -1, holesCompleted: 72 },
    ]
    // avgTourRating = -3 → below-average: score < -3 → only A
    expect(fieldStrengthIndex(entries, -3)).toBeCloseTo(1 / 3)
  })
})

// ---------------------------------------------------------------------------
// Fantasy Scoring — DraftKings
// ---------------------------------------------------------------------------

describe('draftKingsGolfScore', () => {
  const baseStats = {
    place: 1,
    totalPlayers: 156,
    birdie: 0,
    eagle: 0,
    bogey: 0,
    doubleBogey: 0,
    bogeyFree: false,
    birdieOrBetter: 0,
    holesInOne: 0,
  }

  it('awards 30 pts for 1st place', () => {
    expect(draftKingsGolfScore({ ...baseStats, place: 1 })).toBe(30)
  })

  it('awards 14 pts for top 5', () => {
    expect(draftKingsGolfScore({ ...baseStats, place: 5 })).toBe(14)
  })

  it('awards 9 pts for top 10', () => {
    expect(draftKingsGolfScore({ ...baseStats, place: 10 })).toBe(9)
  })

  it('awards 5 pts for top 20', () => {
    expect(draftKingsGolfScore({ ...baseStats, place: 20 })).toBe(5)
  })

  it('awards 3 pts for top 30', () => {
    expect(draftKingsGolfScore({ ...baseStats, place: 30 })).toBe(3)
  })

  it('awards 2 pts for making cut (not top 30)', () => {
    expect(draftKingsGolfScore({ ...baseStats, place: 50 })).toBe(2)
  })

  it('awards 5 bonus pts for bogey-free round', () => {
    const score = draftKingsGolfScore({ ...baseStats, place: 50, bogeyFree: true })
    expect(score).toBe(7) // 2 + 5
  })

  it('awards 3 pts per birdie', () => {
    const score = draftKingsGolfScore({ ...baseStats, place: 50, birdie: 4 })
    expect(score).toBe(14) // 2 + 12
  })

  it('awards 8 pts per eagle', () => {
    const score = draftKingsGolfScore({ ...baseStats, place: 50, eagle: 2 })
    expect(score).toBe(18) // 2 + 16
  })

  it('deducts 1 pt per bogey', () => {
    const score = draftKingsGolfScore({ ...baseStats, place: 50, bogey: 3 })
    expect(score).toBe(-1) // 2 - 3
  })

  it('deducts 2 pts per double bogey', () => {
    const score = draftKingsGolfScore({ ...baseStats, place: 50, doubleBogey: 2 })
    expect(score).toBe(-2) // 2 - 4
  })

  it('awards 10 pts per hole in one', () => {
    const score = draftKingsGolfScore({ ...baseStats, place: 50, holesInOne: 1 })
    expect(score).toBe(12) // 2 + 10
  })

  it('awards 1 pt for driving distance bonus', () => {
    const score = draftKingsGolfScore({ ...baseStats, place: 50, drivingDistanceBonus: true })
    expect(score).toBe(3) // 2 + 1
  })

  it('combines multiple scoring events', () => {
    const score = draftKingsGolfScore({
      place: 1,
      totalPlayers: 156,
      birdie: 6,
      eagle: 1,
      bogey: 1,
      doubleBogey: 0,
      bogeyFree: false,
      birdieOrBetter: 7,
      holesInOne: 0,
      drivingDistanceBonus: false,
    })
    // 30 + 18 + 8 - 1 = 55
    expect(score).toBe(55)
  })
})

// ---------------------------------------------------------------------------
// Fantasy Scoring — FanDuel
// ---------------------------------------------------------------------------

describe('fanDuelGolfScore', () => {
  const baseStats = {
    place: 1,
    totalPlayers: 156,
    birdies: 0,
    eagles: 0,
    bogeys: 0,
    doubleBogeys: 0,
    makeCut: true,
  }

  it('awards 20 pts for 1st place', () => {
    expect(fanDuelGolfScore({ ...baseStats, place: 1 })).toBe(22) // 20 + 2 make cut
  })

  it('awards 10 pts for top 5', () => {
    expect(fanDuelGolfScore({ ...baseStats, place: 5 })).toBe(12)
  })

  it('awards 6 pts for top 10', () => {
    expect(fanDuelGolfScore({ ...baseStats, place: 10 })).toBe(8)
  })

  it('awards 3 pts for top 20', () => {
    expect(fanDuelGolfScore({ ...baseStats, place: 20 })).toBe(5)
  })

  it('awards no placement pts outside top 20', () => {
    expect(fanDuelGolfScore({ ...baseStats, place: 50 })).toBe(2) // only make cut
  })

  it('awards 3 pts per birdie', () => {
    const score = fanDuelGolfScore({ ...baseStats, place: 50, birdies: 5 })
    expect(score).toBe(17) // 2 + 15
  })

  it('awards 6 pts per eagle', () => {
    const score = fanDuelGolfScore({ ...baseStats, place: 50, eagles: 2 })
    expect(score).toBe(14) // 2 + 12
  })

  it('deducts 1 pt per bogey', () => {
    const score = fanDuelGolfScore({ ...baseStats, place: 50, bogeys: 3 })
    expect(score).toBe(-1) // 2 - 3
  })

  it('deducts 2 pts per double bogey', () => {
    const score = fanDuelGolfScore({ ...baseStats, place: 50, doubleBogeys: 2 })
    expect(score).toBe(-2) // 2 - 4
  })

  it('awards 2 pts for making cut', () => {
    const score = fanDuelGolfScore({ ...baseStats, place: 50, makeCut: true })
    expect(score).toBe(2)
  })

  it('awards no cut bonus when missed', () => {
    const score = fanDuelGolfScore({ ...baseStats, place: 50, makeCut: false })
    expect(score).toBe(0)
  })

  it('combines multiple scoring events', () => {
    const score = fanDuelGolfScore({
      place: 5,
      totalPlayers: 156,
      birdies: 7,
      eagles: 1,
      bogeys: 2,
      doubleBogeys: 0,
      makeCut: true,
    })
    // 10 + 21 + 6 - 2 + 2 = 37
    expect(score).toBe(37)
  })
})

// ---------------------------------------------------------------------------
// sgApproach and sgAround (integration-style)
// ---------------------------------------------------------------------------

describe('sgApproach', () => {
  const shots: Shot[] = [
    { type: 'approach', distance: 150, result: 'hit', lie: 'fairway' },
    { type: 'approach', distance: 200, result: 'near_miss', lie: 'fairway' },
    { type: 'tee', distance: 300, result: 'hit', lie: 'tee' }, // filtered out
  ]

  it('only counts approach shots', () => {
    const sg = sgApproach(shots)
    // 2 approach shots processed
    // Shot 1: from 150 (3.2) → hit → 5ft (1.2) → SG = 3.2 - (1 + 1.2) = 1.0
    // Shot 2: from 200 (3.5) → near_miss → 15ft (1.7) → SG = 3.5 - (1 + 1.7) = 0.8
    expect(sg).toBeCloseTo(1.8, 0)
  })

  it('returns 0 for no approach shots', () => {
    const noApproach: Shot[] = [
      { type: 'tee', distance: 300, result: 'hit', lie: 'tee' },
    ]
    expect(sgApproach(noApproach)).toBe(0)
  })
})

describe('sgAround', () => {
  const shots: Shot[] = [
    { type: 'around_green', distance: 20, result: 'hit', lie: 'rough' },
    { type: 'around_green', distance: 30, result: 'miss', lie: 'sand' },
    { type: 'putting', distance: 10, result: 'hit', lie: 'green' }, // filtered out
  ]

  it('only counts around_green shots', () => {
    const sg = sgAround(shots)
    // Shot 1: from 20 (2.5) → hit → 3ft (1.08) → SG = 2.5 - (1 + 1.08) = 0.42
    // Shot 2: from 30 (2.6) → miss → 20ft (1.9) → SG = 2.6 - (1 + 1.9) = -0.3
    expect(sg).toBeCloseTo(0.12, 0)
  })
})

// ---------------------------------------------------------------------------
// sgOffTee (integration)
// ---------------------------------------------------------------------------

describe('sgOffTee', () => {
  it('returns positive SG for above-average tee shots', () => {
    const shots = [
      {
        distance: 400, // par4, 400y hole → expected 4.0
        result: { type: 'tee' as const, distance: 50, result: 'hit' as const, lie: 'fairway' as const },
      },
    ]
    // SG = expectedStrokes('tee', 400) - (1 + expectedStrokes('approach', 50))
    // = 4.0 - (1 + 2.8) = 0.2
    const sg = sgOffTee(shots)
    expect(sg).toBeCloseTo(0.2)
  })

  it('returns 0 for empty shots', () => {
    expect(sgOffTee([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Banned phrases guard
// ---------------------------------------------------------------------------

describe('golf-analytics banned phrases', () => {
  // Import as raw text won't work in test, but we can check function names / strings
  it('does not contain banned gambling language in scoreLabel', () => {
    const labels = [-2, -1, 0, 1, 2, 3, 4].map(scoreLabel)
    const banned = ['guarantee', 'lock', 'sure thing', "can't miss"]
    labels.forEach((label) => {
      banned.forEach((phrase) => {
        expect(label.toLowerCase()).not.toContain(phrase)
      })
    })
  })
})
