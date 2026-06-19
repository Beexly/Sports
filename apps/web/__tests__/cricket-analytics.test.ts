/**
 * cricket-analytics.test.ts
 * Comprehensive tests for the cricket analytics library.
 * Covers all functions, edge cases, boundary values, and division-by-zero guards.
 */

import { describe, it, expect } from 'vitest'
import {
  battingAverage,
  strikeRate,
  battingIndex,
  centuriesAndFifties,
  consistencyScore,
  bowlingAverage,
  economyRate,
  bowlingStrikeRate,
  bowlerRating,
  maidenRate,
  fieldingContribution,
  fieldingEfficiency,
  netRunRate,
  requiredRunRate,
  projectedScore,
  powerplayAnalysis,
  deathOversRate,
  dlsResourcesRemaining,
  dlsParScore,
  matchAbandonedResult,
  t20PowerIndex,
  testBattingValue,
  odiAllRounderRating,
  draftKingsCricketScore,
  pitchType,
  pitchBettingEdge,
} from '@/lib/sports/cricket-analytics'

// ---------------------------------------------------------------------------
// battingAverage
// ---------------------------------------------------------------------------
describe('battingAverage', () => {
  it('returns runs / dismissals for standard case', () => {
    expect(battingAverage(500, 10, 2)).toBeCloseTo(62.5)
  })

  it('returns Infinity when all innings are not-outs', () => {
    expect(battingAverage(100, 5, 5)).toBe(Infinity)
  })

  it('returns Infinity when innings equals notOuts', () => {
    expect(battingAverage(0, 1, 1)).toBe(Infinity)
  })

  it('returns Infinity when notOuts exceed innings (guard)', () => {
    expect(battingAverage(50, 3, 5)).toBe(Infinity)
  })

  it('calculates correctly with zero not-outs', () => {
    expect(battingAverage(300, 10, 0)).toBeCloseTo(30)
  })

  it('handles single dismissal', () => {
    expect(battingAverage(45, 1, 0)).toBeCloseTo(45)
  })

  it('handles zero runs', () => {
    expect(battingAverage(0, 5, 2)).toBeCloseTo(0)
  })

  it('handles fractional result', () => {
    expect(battingAverage(100, 3, 0)).toBeCloseTo(33.333, 2)
  })
})

// ---------------------------------------------------------------------------
// strikeRate
// ---------------------------------------------------------------------------
describe('strikeRate', () => {
  it('returns (runs/balls)*100', () => {
    expect(strikeRate(50, 40)).toBeCloseTo(125)
  })

  it('returns 0 when no balls faced', () => {
    expect(strikeRate(50, 0)).toBe(0)
  })

  it('returns 0 when both are 0', () => {
    expect(strikeRate(0, 0)).toBe(0)
  })

  it('calculates exactly 100 SR', () => {
    expect(strikeRate(30, 30)).toBeCloseTo(100)
  })

  it('calculates low SR', () => {
    expect(strikeRate(10, 50)).toBeCloseTo(20)
  })

  it('calculates SR > 200 (six off each ball)', () => {
    expect(strikeRate(12, 2)).toBeCloseTo(600)
  })

  it('handles zero runs', () => {
    expect(strikeRate(0, 20)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// battingIndex
// ---------------------------------------------------------------------------
describe('battingIndex', () => {
  it('Test format: 70% avg + 30% SR', () => {
    expect(battingIndex(50, 60, 'test')).toBeCloseTo(50 * 0.7 + 60 * 0.3)
  })

  it('ODI format: 50% avg + 50% SR', () => {
    expect(battingIndex(40, 80, 'odi')).toBeCloseTo(40 * 0.5 + 80 * 0.5)
  })

  it('T20 format: 30% avg + 70% SR', () => {
    expect(battingIndex(30, 150, 't20')).toBeCloseTo(30 * 0.3 + 150 * 0.7)
  })

  it('Test format with equal avg and SR', () => {
    expect(battingIndex(100, 100, 'test')).toBeCloseTo(100)
  })

  it('ODI format with equal avg and SR', () => {
    expect(battingIndex(100, 100, 'odi')).toBeCloseTo(100)
  })

  it('T20 format with equal avg and SR', () => {
    expect(battingIndex(100, 100, 't20')).toBeCloseTo(100)
  })

  it('handles zero values', () => {
    expect(battingIndex(0, 0, 'test')).toBeCloseTo(0)
  })

  it('T20 weights SR more (same inputs differ from Test)', () => {
    const t20 = battingIndex(40, 150, 't20')
    const test = battingIndex(40, 150, 'test')
    expect(t20).toBeGreaterThan(test)
  })
})

// ---------------------------------------------------------------------------
// centuriesAndFifties
// ---------------------------------------------------------------------------
describe('centuriesAndFifties', () => {
  it('correctly counts centuries, fifties, ducks', () => {
    const result = centuriesAndFifties([0, 45, 55, 75, 100, 150, 0, 12])
    expect(result.centuries).toBe(2)
    expect(result.fifties).toBe(2)
    expect(result.ducks).toBe(2)
    expect(result.highScore).toBe(150)
  })

  it('returns all zeros for empty array', () => {
    const result = centuriesAndFifties([])
    expect(result).toEqual({ centuries: 0, fifties: 0, ducks: 0, highScore: 0 })
  })

  it('counts exactly 50 as a fifty (not century)', () => {
    const result = centuriesAndFifties([50])
    expect(result.fifties).toBe(1)
    expect(result.centuries).toBe(0)
  })

  it('counts exactly 100 as a century', () => {
    const result = centuriesAndFifties([100])
    expect(result.centuries).toBe(1)
    expect(result.fifties).toBe(0)
  })

  it('counts exactly 99 as a fifty', () => {
    const result = centuriesAndFifties([99])
    expect(result.fifties).toBe(1)
    expect(result.centuries).toBe(0)
  })

  it('highScore is correctly identified', () => {
    expect(centuriesAndFifties([5, 200, 50, 150]).highScore).toBe(200)
  })

  it('all ducks array', () => {
    const result = centuriesAndFifties([0, 0, 0])
    expect(result.ducks).toBe(3)
    expect(result.highScore).toBe(0)
  })

  it('no fifties or centuries in low scores', () => {
    const result = centuriesAndFifties([1, 10, 20, 49])
    expect(result.centuries).toBe(0)
    expect(result.fifties).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// consistencyScore
// ---------------------------------------------------------------------------
describe('consistencyScore', () => {
  it('returns 100 for single score', () => {
    expect(consistencyScore([50])).toBe(100)
  })

  it('returns 0 for empty array', () => {
    expect(consistencyScore([])).toBe(0)
  })

  it('returns 0 when mean is 0', () => {
    expect(consistencyScore([0, 0, 0])).toBe(0)
  })

  it('returns 100 for identical scores', () => {
    expect(consistencyScore([50, 50, 50])).toBeCloseTo(100)
  })

  it('returns lower value for more variable scores', () => {
    const highVariance = consistencyScore([0, 100, 0, 100])
    const lowVariance = consistencyScore([45, 50, 55, 48])
    expect(lowVariance).toBeGreaterThan(highVariance)
  })

  it('is clamped above 0', () => {
    const result = consistencyScore([0, 0, 0, 1000])
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('is clamped below 100', () => {
    const result = consistencyScore([50, 50])
    expect(result).toBeLessThanOrEqual(100)
  })

  it('handles two different scores', () => {
    const result = consistencyScore([0, 100])
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// bowlingAverage
// ---------------------------------------------------------------------------
describe('bowlingAverage', () => {
  it('returns runs per wicket', () => {
    expect(bowlingAverage(240, 8)).toBeCloseTo(30)
  })

  it('returns Infinity for 0 wickets', () => {
    expect(bowlingAverage(100, 0)).toBe(Infinity)
  })

  it('handles zero runs and zero wickets', () => {
    expect(bowlingAverage(0, 0)).toBe(Infinity)
  })

  it('handles zero runs with wickets', () => {
    expect(bowlingAverage(0, 5)).toBeCloseTo(0)
  })

  it('returns fractional average', () => {
    expect(bowlingAverage(100, 3)).toBeCloseTo(33.333, 2)
  })

  it('single wicket equals runs conceded', () => {
    expect(bowlingAverage(45, 1)).toBeCloseTo(45)
  })
})

// ---------------------------------------------------------------------------
// economyRate
// ---------------------------------------------------------------------------
describe('economyRate', () => {
  it('returns runs per over', () => {
    expect(economyRate(240, 40)).toBeCloseTo(6)
  })

  it('returns 0 for 0 overs', () => {
    expect(economyRate(100, 0)).toBe(0)
  })

  it('handles fractional overs', () => {
    expect(economyRate(9, 1.5)).toBeCloseTo(6)
  })

  it('returns 0 for 0 runs 0 overs', () => {
    expect(economyRate(0, 0)).toBe(0)
  })

  it('handles high economy', () => {
    expect(economyRate(60, 4)).toBeCloseTo(15)
  })
})

// ---------------------------------------------------------------------------
// bowlingStrikeRate
// ---------------------------------------------------------------------------
describe('bowlingStrikeRate', () => {
  it('returns balls per wicket', () => {
    expect(bowlingStrikeRate(240, 6)).toBeCloseTo(40)
  })

  it('returns Infinity for 0 wickets', () => {
    expect(bowlingStrikeRate(100, 0)).toBe(Infinity)
  })

  it('handles zero balls and zero wickets', () => {
    expect(bowlingStrikeRate(0, 0)).toBe(Infinity)
  })

  it('returns fractional result', () => {
    expect(bowlingStrikeRate(100, 3)).toBeCloseTo(33.333, 2)
  })

  it('single wicket equals balls bowled', () => {
    expect(bowlingStrikeRate(24, 1)).toBeCloseTo(24)
  })
})

// ---------------------------------------------------------------------------
// bowlerRating
// ---------------------------------------------------------------------------
describe('bowlerRating', () => {
  it('Test: avg×0.4 + sr×0.4 + econ×0.2', () => {
    expect(bowlerRating(30, 5, 40, 'test')).toBeCloseTo(
      30 * 0.4 + 40 * 0.4 + 5 * 0.2,
    )
  })

  it('ODI: avg×0.33 + sr×0.33 + econ×0.34', () => {
    expect(bowlerRating(28, 6, 35, 'odi')).toBeCloseTo(
      28 * 0.33 + 35 * 0.33 + 6 * 0.34,
    )
  })

  it('T20: avg×0.2 + sr×0.3 + econ×0.5', () => {
    expect(bowlerRating(25, 8, 20, 't20')).toBeCloseTo(
      25 * 0.2 + 20 * 0.3 + 8 * 0.5,
    )
  })

  it('T20 weights economy most (higher economy raises rating more)', () => {
    const lowEcon = bowlerRating(25, 5, 20, 't20')
    const highEcon = bowlerRating(25, 10, 20, 't20')
    expect(highEcon).toBeGreaterThan(lowEcon)
  })

  it('handles zero inputs', () => {
    expect(bowlerRating(0, 0, 0, 'test')).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// maidenRate
// ---------------------------------------------------------------------------
describe('maidenRate', () => {
  it('returns (maidens/overs)*100', () => {
    expect(maidenRate(4, 20)).toBeCloseTo(20)
  })

  it('returns 0 for 0 overs', () => {
    expect(maidenRate(5, 0)).toBe(0)
  })

  it('returns 100 when all overs are maidens', () => {
    expect(maidenRate(10, 10)).toBeCloseTo(100)
  })

  it('handles 0 maidens', () => {
    expect(maidenRate(0, 20)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// fieldingContribution
// ---------------------------------------------------------------------------
describe('fieldingContribution', () => {
  it('scores catches×1 + runOuts×2 + stumpings×2', () => {
    expect(fieldingContribution(3, 2, 1)).toBe(9)
  })

  it('returns 0 for all zeros', () => {
    expect(fieldingContribution(0, 0, 0)).toBe(0)
  })

  it('only catches', () => {
    expect(fieldingContribution(5, 0, 0)).toBe(5)
  })

  it('only runOuts', () => {
    expect(fieldingContribution(0, 3, 0)).toBe(6)
  })

  it('only stumpings', () => {
    expect(fieldingContribution(0, 0, 4)).toBe(8)
  })

  it('mixed values', () => {
    expect(fieldingContribution(10, 5, 3)).toBe(10 + 10 + 6)
  })
})

// ---------------------------------------------------------------------------
// fieldingEfficiency
// ---------------------------------------------------------------------------
describe('fieldingEfficiency', () => {
  it('returns percentage 0-100', () => {
    expect(fieldingEfficiency(8, 10)).toBeCloseTo(80)
  })

  it('returns 0 for 0 attempts', () => {
    expect(fieldingEfficiency(5, 0)).toBe(0)
  })

  it('returns 100 for perfect efficiency', () => {
    expect(fieldingEfficiency(10, 10)).toBeCloseTo(100)
  })

  it('is clamped to 100 even if successful > attempts', () => {
    expect(fieldingEfficiency(15, 10)).toBe(100)
  })

  it('is clamped to 0 for negative (guard)', () => {
    expect(fieldingEfficiency(0, 10)).toBeCloseTo(0)
  })

  it('handles 1/1', () => {
    expect(fieldingEfficiency(1, 1)).toBeCloseTo(100)
  })
})

// ---------------------------------------------------------------------------
// netRunRate
// ---------------------------------------------------------------------------
describe('netRunRate', () => {
  it('calculates NRR correctly', () => {
    // 300/50 = 6, 280/50 = 5.6 → NRR = 0.4
    expect(netRunRate(300, 50, 280, 50)).toBeCloseTo(0.4)
  })

  it('returns 0 if oversFor is 0', () => {
    expect(netRunRate(300, 0, 280, 50)).toBe(0)
  })

  it('returns 0 if oversAgainst is 0', () => {
    expect(netRunRate(300, 50, 280, 0)).toBe(0)
  })

  it('returns negative NRR when losing', () => {
    expect(netRunRate(200, 50, 300, 50)).toBeCloseTo(-2)
  })

  it('returns 0 for equal run rates', () => {
    expect(netRunRate(300, 50, 300, 50)).toBeCloseTo(0)
  })

  it('handles different over counts', () => {
    // 240/40=6, 180/30=6 → 0
    expect(netRunRate(240, 40, 180, 30)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// requiredRunRate
// ---------------------------------------------------------------------------
describe('requiredRunRate', () => {
  it('calculates correctly', () => {
    expect(requiredRunRate(120, 15)).toBeCloseTo(8)
  })

  it('returns Infinity for 0 overs remaining', () => {
    expect(requiredRunRate(50, 0)).toBe(Infinity)
  })

  it('handles fractional overs', () => {
    expect(requiredRunRate(10, 2.5)).toBeCloseTo(4)
  })

  it('handles 0 runs needed', () => {
    expect(requiredRunRate(0, 10)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// projectedScore
// ---------------------------------------------------------------------------
describe('projectedScore', () => {
  it('linearly projects score', () => {
    expect(projectedScore(120, 20, 50)).toBeCloseTo(300)
  })

  it('returns currentRuns if currentOvers is 0', () => {
    expect(projectedScore(0, 0, 50)).toBe(0)
  })

  it('returns currentRuns unchanged if 0 overs elapsed', () => {
    expect(projectedScore(30, 0, 20)).toBe(30)
  })

  it('projects to same total if currentOvers equals totalOvers', () => {
    expect(projectedScore(250, 50, 50)).toBeCloseTo(250)
  })

  it('handles partial overs', () => {
    // 60 runs in 10.5 overs, total 50 overs → 60/10.5*50
    expect(projectedScore(60, 10.5, 50)).toBeCloseTo((60 / 10.5) * 50, 1)
  })
})

// ---------------------------------------------------------------------------
// powerplayAnalysis
// ---------------------------------------------------------------------------
describe('powerplayAnalysis', () => {
  it('calculates RPO as runs/6', () => {
    expect(powerplayAnalysis(48, 0).rpo).toBeCloseTo(8)
  })

  it('0–1 wickets → low pressure', () => {
    expect(powerplayAnalysis(40, 0).wicketsPressure).toBe('low')
    expect(powerplayAnalysis(40, 1).wicketsPressure).toBe('low')
  })

  it('2–3 wickets → medium pressure', () => {
    expect(powerplayAnalysis(40, 2).wicketsPressure).toBe('medium')
    expect(powerplayAnalysis(40, 3).wicketsPressure).toBe('medium')
  })

  it('4+ wickets → high pressure', () => {
    expect(powerplayAnalysis(40, 4).wicketsPressure).toBe('high')
    expect(powerplayAnalysis(40, 6).wicketsPressure).toBe('high')
  })

  it('handles 0 runs and 0 wickets', () => {
    const result = powerplayAnalysis(0, 0)
    expect(result.rpo).toBeCloseTo(0)
    expect(result.wicketsPressure).toBe('low')
  })
})

// ---------------------------------------------------------------------------
// deathOversRate
// ---------------------------------------------------------------------------
describe('deathOversRate', () => {
  it('returns rpm / (1 + wicketsFallen*0.1) over 5 overs', () => {
    // 50 runs in overs 16-20, 0 wickets → 50/5 / 1.0 = 10
    expect(deathOversRate(50, 0)).toBeCloseTo(10)
  })

  it('adjusts downward with wickets', () => {
    // 50 runs, 5 wickets → 10 / 1.5 ≈ 6.67
    expect(deathOversRate(50, 5)).toBeCloseTo(10 / 1.5, 2)
  })

  it('handles 0 runs', () => {
    expect(deathOversRate(0, 0)).toBeCloseTo(0)
  })

  it('handles many wickets', () => {
    // 60 runs, 10 wickets → 12 / 2.0 = 6
    expect(deathOversRate(60, 10)).toBeCloseTo(6)
  })
})

// ---------------------------------------------------------------------------
// dlsResourcesRemaining
// ---------------------------------------------------------------------------
describe('dlsResourcesRemaining', () => {
  it('calculates resources remaining correctly', () => {
    // (1 - 2/10) * (30/50) * 100 = 0.8 * 0.6 * 100 = 48
    expect(dlsResourcesRemaining(30, 2, 50)).toBeCloseTo(48)
  })

  it('defaults totalOvers to 50', () => {
    expect(dlsResourcesRemaining(50, 0)).toBeCloseTo(100)
  })

  it('returns 100 with all overs left and 0 wickets', () => {
    expect(dlsResourcesRemaining(50, 0, 50)).toBeCloseTo(100)
  })

  it('returns 0 with 10 wickets lost', () => {
    expect(dlsResourcesRemaining(20, 10, 50)).toBeCloseTo(0)
  })

  it('clamps to 0 (never negative)', () => {
    expect(dlsResourcesRemaining(-5, 5, 50)).toBeGreaterThanOrEqual(0)
  })

  it('clamps to 100 (never over 100)', () => {
    const result = dlsResourcesRemaining(100, 0, 50)
    expect(result).toBeLessThanOrEqual(100)
  })

  it('returns 0 for 0 totalOvers', () => {
    expect(dlsResourcesRemaining(10, 0, 0)).toBe(0)
  })

  it('handles 0 overs remaining', () => {
    expect(dlsResourcesRemaining(0, 0, 50)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// dlsParScore
// ---------------------------------------------------------------------------
describe('dlsParScore', () => {
  it('calculates par score correctly', () => {
    // 200 * (60/80) = 150
    expect(dlsParScore(200, 80, 60)).toBe(150)
  })

  it('returns 0 if resourcesAtInterruption is 0', () => {
    expect(dlsParScore(200, 0, 60)).toBe(0)
  })

  it('floors the result', () => {
    // 200 * (61/80) = 152.5 → 152
    expect(dlsParScore(200, 80, 61)).toBe(152)
  })

  it('returns target when resources are equal', () => {
    expect(dlsParScore(250, 70, 70)).toBe(250)
  })

  it('handles zero target', () => {
    expect(dlsParScore(0, 80, 60)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// matchAbandonedResult
// ---------------------------------------------------------------------------
describe('matchAbandonedResult', () => {
  it('returns team1_wins when team1 score is higher', () => {
    expect(matchAbandonedResult(200, 20, 180, 20, 5)).toBe('team1_wins')
  })

  it('returns team2_wins when team2 score is higher', () => {
    expect(matchAbandonedResult(150, 20, 170, 20, 5)).toBe('team2_wins')
  })

  it('returns tie when scores are equal', () => {
    expect(matchAbandonedResult(180, 20, 180, 20, 5)).toBe('tie')
  })

  it('returns no_result if team1 overs < minimum', () => {
    expect(matchAbandonedResult(50, 3, 180, 20, 5)).toBe('no_result')
  })

  it('returns no_result if team2 overs < minimum', () => {
    expect(matchAbandonedResult(180, 20, 50, 3, 5)).toBe('no_result')
  })

  it('returns no_result if both overs < minimum', () => {
    expect(matchAbandonedResult(50, 2, 60, 3, 5)).toBe('no_result')
  })

  it('passes when overs exactly equal minimum', () => {
    expect(matchAbandonedResult(200, 5, 180, 5, 5)).toBe('team1_wins')
  })

  it('handles zero scores', () => {
    expect(matchAbandonedResult(0, 10, 0, 10, 5)).toBe('tie')
  })
})

// ---------------------------------------------------------------------------
// t20PowerIndex
// ---------------------------------------------------------------------------
describe('t20PowerIndex', () => {
  it('returns SR*0.6 + avg*0.4', () => {
    expect(t20PowerIndex(150, 35)).toBeCloseTo(150 * 0.6 + 35 * 0.4)
  })

  it('handles zero inputs', () => {
    expect(t20PowerIndex(0, 0)).toBeCloseTo(0)
  })

  it('higher SR gives higher index', () => {
    expect(t20PowerIndex(200, 30)).toBeGreaterThan(t20PowerIndex(150, 30))
  })

  it('higher average gives higher index', () => {
    expect(t20PowerIndex(150, 50)).toBeGreaterThan(t20PowerIndex(150, 30))
  })
})

// ---------------------------------------------------------------------------
// testBattingValue
// ---------------------------------------------------------------------------
describe('testBattingValue', () => {
  it('returns avg*0.7 + consistency*0.3', () => {
    expect(testBattingValue(55, 80)).toBeCloseTo(55 * 0.7 + 80 * 0.3)
  })

  it('handles zero inputs', () => {
    expect(testBattingValue(0, 0)).toBeCloseTo(0)
  })

  it('higher average gives higher value', () => {
    expect(testBattingValue(60, 70)).toBeGreaterThan(testBattingValue(40, 70))
  })

  it('higher consistency gives higher value', () => {
    expect(testBattingValue(50, 90)).toBeGreaterThan(testBattingValue(50, 60))
  })
})

// ---------------------------------------------------------------------------
// odiAllRounderRating
// ---------------------------------------------------------------------------
describe('odiAllRounderRating', () => {
  it('computes combined formula', () => {
    const raw =
      (40 / 30 + 85 / 80 - 28 / 30 - 5.5 / 6) * 25
    expect(odiAllRounderRating(40, 85, 28, 5.5)).toBeCloseTo(
      Math.max(-100, Math.min(100, raw)),
      2,
    )
  })

  it('clamps to 100 (exceptional all-rounder)', () => {
    // Very high batting, very low bowling
    expect(odiAllRounderRating(200, 200, 0, 0)).toBe(100)
  })

  it('clamps to -100 (poor all-rounder)', () => {
    expect(odiAllRounderRating(0, 0, 200, 20)).toBe(-100)
  })

  it('returns around 0 for average all-rounder', () => {
    // 30 avg, 80 SR, 30 bowl avg, 6 econ → (1+1-1-1)*25 = 0
    expect(odiAllRounderRating(30, 80, 30, 6)).toBeCloseTo(0)
  })

  it('handles zero all stats', () => {
    // (0+0-0-0)*25 = 0
    expect(odiAllRounderRating(0, 0, 0, 0)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// draftKingsCricketScore
// ---------------------------------------------------------------------------
describe('draftKingsCricketScore', () => {
  it('scores runs at 1 point each', () => {
    expect(
      draftKingsCricketScore({
        runs: 50,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(50)
  })

  it('scores fours at 0.5 points each', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 4,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(2)
  })

  it('scores sixes at 1 point each', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 3,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(3)
  })

  it('adds 10 for half century', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: true,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(10)
  })

  it('adds 20 for century', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: true,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(20)
  })

  it('scores wickets at 25 each', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 3,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(75)
  })

  it('scores maidens at 4 each', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 2,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(8)
  })

  it('scores catches at 8 each', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 2,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(16)
  })

  it('scores runOuts at 12 each', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 1,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(12)
  })

  it('scores stumpings at 12 each', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 2,
        duckBatting: false,
      }),
    ).toBeCloseTo(24)
  })

  it('deducts 5 for a duck', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: true,
      }),
    ).toBeCloseTo(-5)
  })

  it('calculates a combined all-rounder score', () => {
    // 60 runs + 4 fours (2pts) + 2 sixes (2pts) + halfCentury (10) + 2 wickets (50) + 1 catch (8) = 60+2+2+10+50+8 = 132
    expect(
      draftKingsCricketScore({
        runs: 60,
        fours: 4,
        sixes: 2,
        halfCentury: true,
        century: false,
        wickets: 2,
        maidens: 0,
        catches: 1,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(132)
  })

  it('all zeros returns 0', () => {
    expect(
      draftKingsCricketScore({
        runs: 0,
        fours: 0,
        sixes: 0,
        halfCentury: false,
        century: false,
        wickets: 0,
        maidens: 0,
        catches: 0,
        runOuts: 0,
        stumpings: 0,
        duckBatting: false,
      }),
    ).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// pitchType
// ---------------------------------------------------------------------------
describe('pitchType', () => {
  it('returns batting_paradise for < 5 total wickets', () => {
    expect(pitchType(2, 1, 4)).toBe('batting_paradise')
  })

  it('returns batting_paradise for 0 wickets', () => {
    expect(pitchType(0, 0, 0)).toBe('batting_paradise')
  })

  it('returns spin_friendly when spin > 60%', () => {
    expect(pitchType(7, 3, 10)).toBe('spin_friendly')
  })

  it('returns seam_friendly when seam > 60%', () => {
    expect(pitchType(3, 7, 10)).toBe('seam_friendly')
  })

  it('returns balanced when neither > 60%', () => {
    expect(pitchType(5, 5, 10)).toBe('balanced')
  })

  it('boundary: exactly 60% spin → balanced (not spin_friendly)', () => {
    expect(pitchType(6, 4, 10)).toBe('balanced')
  })

  it('boundary: exactly 60% seam → balanced (not seam_friendly)', () => {
    expect(pitchType(4, 6, 10)).toBe('balanced')
  })

  it('spin just over 60%', () => {
    expect(pitchType(7, 3, 10)).toBe('spin_friendly') // 70%
  })

  it('totalWickets = 5 (not batting_paradise threshold)', () => {
    // 5 wickets, 4 spin = 80% → spin_friendly
    expect(pitchType(4, 1, 5)).toBe('spin_friendly')
  })
})

// ---------------------------------------------------------------------------
// pitchBettingEdge
// ---------------------------------------------------------------------------
describe('pitchBettingEdge', () => {
  it('returns an object with highScoreProb and spinnerAdv', () => {
    const result = pitchBettingEdge('t20', 'batting_paradise', true)
    expect(result).toHaveProperty('highScoreProb')
    expect(result).toHaveProperty('spinnerAdv')
  })

  it('highScoreProb is between 0 and 100', () => {
    const formats: ('test' | 'odi' | 't20')[] = ['test', 'odi', 't20']
    const pitches = [
      'batting_paradise',
      'spin_friendly',
      'seam_friendly',
      'balanced',
    ] as const
    for (const f of formats) {
      for (const p of pitches) {
        const r = pitchBettingEdge(f, p, true)
        expect(r.highScoreProb).toBeGreaterThanOrEqual(0)
        expect(r.highScoreProb).toBeLessThanOrEqual(100)
      }
    }
  })

  it('spinnerAdv is between 0 and 100', () => {
    const formats: ('test' | 'odi' | 't20')[] = ['test', 'odi', 't20']
    const pitches = [
      'batting_paradise',
      'spin_friendly',
      'seam_friendly',
      'balanced',
    ] as const
    for (const f of formats) {
      for (const p of pitches) {
        const r = pitchBettingEdge(f, p, false)
        expect(r.spinnerAdv).toBeGreaterThanOrEqual(0)
        expect(r.spinnerAdv).toBeLessThanOrEqual(100)
      }
    }
  })

  it('spin_friendly gives higher spinnerAdv than seam_friendly', () => {
    const spin = pitchBettingEdge('test', 'spin_friendly', true)
    const seam = pitchBettingEdge('test', 'seam_friendly', true)
    expect(spin.spinnerAdv).toBeGreaterThan(seam.spinnerAdv)
  })

  it('batting_paradise gives higher highScoreProb than seam_friendly (T20)', () => {
    const bat = pitchBettingEdge('t20', 'batting_paradise', true)
    const seam = pitchBettingEdge('t20', 'seam_friendly', true)
    expect(bat.highScoreProb).toBeGreaterThan(seam.highScoreProb)
  })

  it('T20 batting_paradise gives higher highScoreProb than test batting_paradise', () => {
    const t20 = pitchBettingEdge('t20', 'batting_paradise', true)
    const test = pitchBettingEdge('test', 'batting_paradise', true)
    expect(t20.highScoreProb).toBeGreaterThan(test.highScoreProb)
  })

  it('batting-first vs chasing does not violate clamp bounds', () => {
    const batting = pitchBettingEdge('odi', 'balanced', true)
    const chasing = pitchBettingEdge('odi', 'balanced', false)
    expect(batting.highScoreProb).toBeGreaterThanOrEqual(0)
    expect(chasing.highScoreProb).toBeGreaterThanOrEqual(0)
  })
})
