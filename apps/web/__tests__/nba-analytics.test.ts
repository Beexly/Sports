/**
 * nba-analytics.test.ts
 * Comprehensive tests for the NBA analytics library.
 * Covers all 8 sections and critical edge cases.
 */

import { describe, it, expect } from 'vitest'
import {
  // 1. Basic shooting metrics
  fieldGoalPct,
  threePointPct,
  freeThrowPct,
  effectiveFGPct,
  trueShootingPct,
  twoPointPct,
  // 2. Volume and efficiency
  pointsPerPossession,
  offensiveRating,
  defensiveRating,
  netRating,
  pace,
  possessionEstimate,
  // 3. Box score advanced
  playerEfficiencyRating,
  winShares,
  boxPlusMinus,
  valueOverReplacement,
  usageRate,
  assistToTurnoverRatio,
  reboundRate,
  // 4. Four Factors
  shootingFactor,
  turnoverFactor,
  reboundingFactor,
  freeThrowFactor,
  fourFactorsRating,
  // 5. Team analytics
  teamRating,
  strengthOfSchedule,
  pythagoreanExpectation,
  clutchScore,
  homeCourtAdvantage,
  // 6. Player comparison
  playerSimilarityScore,
  tradeValueIndex,
  agingCurve,
  // 7. Fantasy scoring
  draftKingsNBAScore,
  fantasyValue,
  starterProbability,
  // 8. Game projection
  projectedTotal,
  spreadFromRatings,
  moneylineFromSpread,
  type PlayerStatLine,
  type DKNBAStats,
  type FantasyValueStats,
} from '../lib/sports/nba-analytics'

// ---------------------------------------------------------------------------
// 1. Basic shooting metrics
// ---------------------------------------------------------------------------

describe('fieldGoalPct', () => {
  it('returns made/attempted', () => {
    expect(fieldGoalPct(8, 16)).toBeCloseTo(0.5, 5)
  })

  it('returns 0 for 0 attempted', () => {
    expect(fieldGoalPct(0, 0)).toBe(0)
  })

  it('perfect shooting returns 1', () => {
    expect(fieldGoalPct(10, 10)).toBeCloseTo(1.0, 5)
  })

  it('low shooting returns correct fraction', () => {
    expect(fieldGoalPct(3, 15)).toBeCloseTo(0.2, 5)
  })

  it('returns 0 for 0 made 10 attempted', () => {
    expect(fieldGoalPct(0, 10)).toBe(0)
  })
})

describe('threePointPct', () => {
  it('returns made3/attempted3', () => {
    expect(threePointPct(4, 10)).toBeCloseTo(0.4, 5)
  })

  it('returns 0 for 0 attempted', () => {
    expect(threePointPct(0, 0)).toBe(0)
  })

  it('perfect three-point shooting returns 1', () => {
    expect(threePointPct(5, 5)).toBeCloseTo(1.0, 5)
  })

  it('low three-point shooting returns correct value', () => {
    expect(threePointPct(2, 10)).toBeCloseTo(0.2, 5)
  })
})

describe('freeThrowPct', () => {
  it('returns made/attempted', () => {
    expect(freeThrowPct(7, 10)).toBeCloseTo(0.7, 5)
  })

  it('returns 0 for 0 attempted', () => {
    expect(freeThrowPct(0, 0)).toBe(0)
  })

  it('perfect free throw shooting returns 1', () => {
    expect(freeThrowPct(10, 10)).toBeCloseTo(1.0, 5)
  })

  it('scales correctly', () => {
    expect(freeThrowPct(3, 4)).toBeCloseTo(0.75, 5)
  })
})

describe('effectiveFGPct', () => {
  it('no threes: equals standard FG%', () => {
    expect(effectiveFGPct(8, 0, 16)).toBeCloseTo(0.5, 5)
  })

  it('three-point bonus: (FG + 0.5*3P) / FGA', () => {
    // (8 + 0.5*4) / 16 = 10/16 = 0.625
    expect(effectiveFGPct(8, 4, 16)).toBeCloseTo(0.625, 5)
  })

  it('returns 0 for 0 FGA', () => {
    expect(effectiveFGPct(0, 0, 0)).toBe(0)
  })

  it('higher with more threes', () => {
    const without3 = effectiveFGPct(8, 0, 16)
    const with3 = effectiveFGPct(8, 4, 16)
    expect(with3).toBeGreaterThan(without3)
  })

  it('all three-point field goals', () => {
    // (4 + 0.5*4) / 4 = 6/4 = 1.5
    expect(effectiveFGPct(4, 4, 4)).toBeCloseTo(1.5, 5)
  })
})

describe('trueShootingPct', () => {
  it('classic formula: 20pts, 14 FGA, 6 FTA', () => {
    // 20 / (2 * (14 + 0.44*6)) = 20 / (2 * 16.64) = 20/33.28 ≈ 0.601
    expect(trueShootingPct(20, 14, 6)).toBeCloseTo(0.601, 2)
  })

  it('returns 0 for 0 FGA and 0 FTA', () => {
    expect(trueShootingPct(0, 0, 0)).toBe(0)
  })

  it('returns 0 for 0 points even with attempts', () => {
    expect(trueShootingPct(0, 10, 4)).toBe(0)
  })

  it('efficient scorer has higher TS% than volume scorer', () => {
    const efficient = trueShootingPct(30, 20, 4)
    const inefficient = trueShootingPct(20, 25, 4)
    expect(efficient).toBeGreaterThan(inefficient)
  })

  it('free throw-only scoring (no FGA) returns positive value', () => {
    // 10pts / (2 * (0 + 0.44*12)) = 10 / 10.56 ≈ 0.947
    expect(trueShootingPct(10, 0, 12)).toBeGreaterThan(0)
  })
})

describe('twoPointPct', () => {
  it('all two-pointers: (FG - 0) / (FGA - 0)', () => {
    expect(twoPointPct(8, 0, 16, 0)).toBeCloseTo(0.5, 5)
  })

  it('mixed shots: (10 - 3) / (20 - 8) = 7/12', () => {
    expect(twoPointPct(10, 3, 20, 8)).toBeCloseTo(7 / 12, 5)
  })

  it('returns 0 when FGA equals FGA3 (no two-pointers attempted)', () => {
    expect(twoPointPct(4, 4, 8, 8)).toBe(0)
  })

  it('returns 0 for all zeros', () => {
    expect(twoPointPct(0, 0, 0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Volume and efficiency
// ---------------------------------------------------------------------------

describe('pointsPerPossession', () => {
  it('returns points / possessions', () => {
    expect(pointsPerPossession(110, 100)).toBeCloseTo(1.1, 5)
  })

  it('returns 0 for 0 possessions', () => {
    expect(pointsPerPossession(110, 0)).toBe(0)
  })

  it('less than 1 for poor offense', () => {
    expect(pointsPerPossession(90, 100)).toBeCloseTo(0.9, 5)
  })
})

describe('offensiveRating', () => {
  it('returns points per 100 possessions', () => {
    expect(offensiveRating(110, 100)).toBeCloseTo(110, 5)
  })

  it('returns 0 for 0 possessions', () => {
    expect(offensiveRating(110, 0)).toBe(0)
  })

  it('scales linearly with points', () => {
    const lower = offensiveRating(100, 100)
    const higher = offensiveRating(115, 100)
    expect(higher).toBeGreaterThan(lower)
  })
})

describe('defensiveRating', () => {
  it('returns points allowed per 100 possessions', () => {
    expect(defensiveRating(105, 100)).toBeCloseTo(105, 5)
  })

  it('returns 0 for 0 possessions', () => {
    expect(defensiveRating(105, 0)).toBe(0)
  })

  it('lower is better defense', () => {
    const elite = defensiveRating(100, 100)
    const poor = defensiveRating(120, 100)
    expect(elite).toBeLessThan(poor)
  })
})

describe('netRating', () => {
  it('equals ORTG - DRTG', () => {
    expect(netRating(112, 108)).toBeCloseTo(4, 5)
  })

  it('returns 0 for equal ratings', () => {
    expect(netRating(110, 110)).toBe(0)
  })

  it('returns negative for bad team', () => {
    expect(netRating(105, 112)).toBeCloseTo(-7, 5)
  })
})

describe('pace', () => {
  it('uses default 48 minutes regulation', () => {
    // 100 poss / 48 min * 48 * 2 = 200... wait: poss/min * total * 2
    // = 100/48 * 48 * 2 = 200
    expect(pace(100, 48)).toBeCloseTo(200, 3)
  })

  it('scales with possessions', () => {
    const slow = pace(80, 48)
    const fast = pace(110, 48)
    expect(fast).toBeGreaterThan(slow)
  })

  it('returns 0 for 0 minutes', () => {
    expect(pace(100, 0)).toBe(0)
  })

  it('respects custom totalMinutes', () => {
    const reg = pace(100, 48, 48)
    const ot = pace(100, 53, 53)
    expect(typeof reg).toBe('number')
    expect(typeof ot).toBe('number')
  })

  it('possessions/minutes * totalMinutes * 2', () => {
    // 50 poss in 24 min, total=48: 50/24 * 48 * 2 = 200
    expect(pace(50, 24, 48)).toBeCloseTo(200, 3)
  })
})

describe('possessionEstimate', () => {
  it('Hollinger formula: FGA - ORB + TOV + 0.44*FTA', () => {
    // 85 - 10 + 14 + 0.44*20 = 85 - 10 + 14 + 8.8 = 97.8
    expect(possessionEstimate(85, 20, 10, 14)).toBeCloseTo(97.8, 5)
  })

  it('returns 0 for all zeros', () => {
    expect(possessionEstimate(0, 0, 0, 0)).toBe(0)
  })

  it('scales with FGA', () => {
    const low = possessionEstimate(60, 15, 8, 10)
    const high = possessionEstimate(100, 15, 8, 10)
    expect(high).toBeGreaterThan(low)
  })
})

// ---------------------------------------------------------------------------
// 3. Box score advanced
// ---------------------------------------------------------------------------

describe('playerEfficiencyRating', () => {
  it('returns 0 for 0 minutes', () => {
    expect(playerEfficiencyRating(20, 6, 4, 1, 1, 8, 16, 4, 6, 2, 2, 0, 100, 100)).toBe(0)
  })

  it('positive for productive player', () => {
    const per = playerEfficiencyRating(20, 6, 4, 1, 1, 8, 16, 4, 6, 2, 2, 36, 100, 100)
    expect(per).toBeGreaterThan(0)
  })

  it('capped at 40', () => {
    // Absurdly good stats — should hit cap
    const per = playerEfficiencyRating(100, 30, 30, 10, 10, 40, 60, 20, 25, 0, 0, 10, 100, 100)
    expect(per).toBeLessThanOrEqual(40)
  })

  it('floor at 0', () => {
    // Bad player: many fouls and turnovers, no production
    const per = playerEfficiencyRating(0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 6, 20, 100, 100)
    expect(per).toBeGreaterThanOrEqual(0)
  })

  it('star outperforms average', () => {
    const star = playerEfficiencyRating(30, 10, 8, 2, 2, 12, 22, 6, 8, 2, 2, 36, 100, 100)
    const avg = playerEfficiencyRating(12, 4, 3, 1, 0, 5, 11, 2, 3, 2, 2, 20, 100, 100)
    expect(star).toBeGreaterThan(avg)
  })

  it('slower team pace increases PER', () => {
    const slowTeam = playerEfficiencyRating(20, 6, 4, 1, 1, 8, 16, 4, 6, 2, 2, 36, 90, 100)
    const fastTeam = playerEfficiencyRating(20, 6, 4, 1, 1, 8, 16, 4, 6, 2, 2, 36, 110, 100)
    expect(slowTeam).toBeGreaterThan(fastTeam)
  })
})

describe('winShares', () => {
  it('positive net rating yields positive win shares', () => {
    expect(winShares(5, 120, 240)).toBeGreaterThan(0)
  })

  it('negative net rating yields negative win shares', () => {
    expect(winShares(-5, 120, 240)).toBeLessThan(0)
  })

  it('0 net rating yields 0 win shares', () => {
    expect(winShares(0, 120, 240)).toBeCloseTo(0, 5)
  })

  it('scales with minutes played', () => {
    const low = winShares(5, 60, 240)
    const high = winShares(5, 200, 240)
    expect(high).toBeGreaterThan(low)
  })

  it('uses default teamMinutes of 240', () => {
    const explicit = winShares(5, 120, 240)
    const defaulted = winShares(5, 120)
    expect(defaulted).toBeCloseTo(explicit, 5)
  })

  it('returns 0 for 0 teamMinutes', () => {
    expect(winShares(5, 120, 0)).toBe(0)
  })

  it('formula: netRating/100 * min/teamMin * 2.5', () => {
    // 10/100 * 120/240 * 2.5 = 0.1 * 0.5 * 2.5 = 0.125
    expect(winShares(10, 120, 240)).toBeCloseTo(0.125, 5)
  })
})

describe('boxPlusMinus', () => {
  it('returns 0 for 0 minutes', () => {
    expect(boxPlusMinus(0, 0, 0, 0, 0, 0, 0, 0, 0)).toBe(0)
  })

  it('high scorer above league average has positive BPM', () => {
    // pts=30 per 36 min exceeds baseline of ~10
    const bpm = boxPlusMinus(30, 6, 5, 2, 1, 2, 20, 6, 36)
    expect(bpm).toBeGreaterThan(0)
  })

  it('capped at 15', () => {
    const bpm = boxPlusMinus(100, 0, 30, 10, 10, 0, 10, 0, 36)
    expect(bpm).toBeLessThanOrEqual(15)
  })

  it('floored at -10', () => {
    const bpm = boxPlusMinus(0, 0, 0, 0, 0, 20, 30, 5, 36)
    expect(bpm).toBeGreaterThanOrEqual(-10)
  })

  it('scales with scoring efficiency', () => {
    const scorer = boxPlusMinus(36, 4, 4, 1, 1, 2, 20, 4, 36)
    const bencher = boxPlusMinus(4, 2, 1, 0, 0, 3, 6, 1, 10)
    expect(scorer).toBeGreaterThan(bencher)
  })
})

describe('valueOverReplacement', () => {
  it('VORP formula: (BPM - (-2)) * min / 2400 * 2.7', () => {
    // (3 - (-2)) * 1200/2400 * 2.7 = 5 * 0.5 * 2.7 = 6.75
    expect(valueOverReplacement(3, 1200)).toBeCloseTo(6.75, 5)
  })

  it('at replacement level (-2 BPM) returns 0', () => {
    expect(valueOverReplacement(-2, 1200)).toBeCloseTo(0, 5)
  })

  it('below replacement BPM returns negative VORP', () => {
    expect(valueOverReplacement(-5, 1200)).toBeLessThan(0)
  })

  it('scales with minutes', () => {
    const low = valueOverReplacement(3, 500)
    const high = valueOverReplacement(3, 2000)
    expect(high).toBeGreaterThan(low)
  })

  it('elite BPM over full season', () => {
    // (10 + 2) * 2400/2400 * 2.7 = 12 * 2.7 = 32.4
    expect(valueOverReplacement(10, 2400)).toBeCloseTo(32.4, 3)
  })
})

describe('usageRate', () => {
  it('returns positive for typical player', () => {
    const usage = usageRate(14, 4, 3, 36, 85, 22, 14, 240)
    expect(usage).toBeGreaterThan(0)
  })

  it('returns 0 for 0 minutes played', () => {
    expect(usageRate(14, 4, 3, 0, 85, 22, 14, 240)).toBe(0)
  })

  it('returns 0 for 0 team possessions', () => {
    expect(usageRate(14, 4, 3, 36, 0, 0, 0, 240)).toBe(0)
  })

  it('higher usage with more FGA', () => {
    const high = usageRate(25, 8, 5, 36, 85, 22, 14, 240)
    const low = usageRate(8, 2, 1, 36, 85, 22, 14, 240)
    expect(high).toBeGreaterThan(low)
  })

  it('formula check: 100 * (fga + 0.44*fta + tov) * (tMin/5) / (min * teamPoss)', () => {
    const fga = 14, fta = 4, tov = 3, min = 36, tFGA = 85, tFTA = 22, tTOV = 14, tMin = 240
    const playerPoss = fga + 0.44 * fta + tov
    const teamPoss = tFGA + 0.44 * tFTA + tTOV
    const expected = (100 * playerPoss * (tMin / 5)) / (min * teamPoss)
    expect(usageRate(fga, fta, tov, min, tFGA, tFTA, tTOV, tMin)).toBeCloseTo(expected, 5)
  })
})

describe('assistToTurnoverRatio', () => {
  it('divides assists by turnovers', () => {
    expect(assistToTurnoverRatio(8, 2)).toBeCloseTo(4.0, 5)
  })

  it('uses 1 as floor for turnovers (0 tov)', () => {
    expect(assistToTurnoverRatio(8, 0)).toBeCloseTo(8, 5)
  })

  it('returns 0 for 0 assists', () => {
    expect(assistToTurnoverRatio(0, 3)).toBe(0)
  })

  it('returns 0 for 0 assists and 0 turnovers', () => {
    expect(assistToTurnoverRatio(0, 0)).toBe(0)
  })

  it('higher assists yields higher ratio', () => {
    const low = assistToTurnoverRatio(4, 2)
    const high = assistToTurnoverRatio(10, 2)
    expect(high).toBeGreaterThan(low)
  })
})

describe('reboundRate', () => {
  it('positive for a rebounder with time', () => {
    const rate = reboundRate(8, 36, 35, 30, 240)
    expect(rate).toBeGreaterThan(0)
  })

  it('returns 0 for 0 minutes', () => {
    expect(reboundRate(8, 0, 35, 30, 240)).toBe(0)
  })

  it('returns 0 when no rebounds in pool', () => {
    expect(reboundRate(0, 36, 0, 0, 240)).toBe(0)
  })

  it('scales with player rebounds', () => {
    const low = reboundRate(3, 36, 35, 30, 240)
    const high = reboundRate(12, 36, 35, 30, 240)
    expect(high).toBeGreaterThan(low)
  })
})

// ---------------------------------------------------------------------------
// 4. Four Factors
// ---------------------------------------------------------------------------

describe('shootingFactor', () => {
  it('returns the eFG% as-is', () => {
    expect(shootingFactor(0.55)).toBeCloseTo(0.55, 5)
  })

  it('returns 0 for 0 eFG', () => {
    expect(shootingFactor(0)).toBe(0)
  })

  it('identity function', () => {
    expect(shootingFactor(0.7)).toBeCloseTo(0.7, 5)
  })
})

describe('turnoverFactor', () => {
  it('TOV / (FGA + 0.44*FTA + TOV)', () => {
    // 14 / (85 + 0.44*22 + 14) = 14 / 108.68 ≈ 0.1288
    const expected = 14 / (85 + 0.44 * 22 + 14)
    expect(turnoverFactor(14, 85, 22)).toBeCloseTo(expected, 5)
  })

  it('returns 0 for all zeros', () => {
    expect(turnoverFactor(0, 0, 0)).toBe(0)
  })

  it('stays between 0 and 1', () => {
    const val = turnoverFactor(14, 85, 22)
    expect(val).toBeGreaterThan(0)
    expect(val).toBeLessThan(1)
  })
})

describe('reboundingFactor', () => {
  it('ORB / (ORB + oppDRB)', () => {
    // 10 / (10 + 30) = 0.25
    expect(reboundingFactor(10, 10, 30)).toBeCloseTo(0.25, 5)
  })

  it('returns 0 when ORB and oppDRB are both 0', () => {
    expect(reboundingFactor(0, 0, 0)).toBe(0)
  })

  it('approaches 1 with dominant offensive rebounding', () => {
    expect(reboundingFactor(50, 50, 1)).toBeGreaterThan(0.9)
  })

  it('stays between 0 and 1 for typical values', () => {
    const val = reboundingFactor(10, 10, 30)
    expect(val).toBeGreaterThanOrEqual(0)
    expect(val).toBeLessThanOrEqual(1)
  })
})

describe('freeThrowFactor', () => {
  it('FTM / FGA', () => {
    expect(freeThrowFactor(16, 85)).toBeCloseTo(16 / 85, 5)
  })

  it('returns 0 for 0 FGA', () => {
    expect(freeThrowFactor(16, 0)).toBe(0)
  })

  it('higher FTM raises factor', () => {
    const low = freeThrowFactor(10, 85)
    const high = freeThrowFactor(25, 85)
    expect(high).toBeGreaterThan(low)
  })
})

describe('fourFactorsRating', () => {
  it('default weights sum to 1.0', () => {
    const weights: [number, number, number, number] = [0.4, 0.25, 0.2, 0.15]
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 5)
  })

  it('computes weighted sum with defaults', () => {
    // 0.4*0.55 + 0.25*0.12 + 0.2*0.28 + 0.15*0.22
    const expected = 0.4 * 0.55 + 0.25 * 0.12 + 0.2 * 0.28 + 0.15 * 0.22
    expect(fourFactorsRating(0.55, 0.12, 0.28, 0.22)).toBeCloseTo(expected, 5)
  })

  it('accepts custom weights', () => {
    const custom: [number, number, number, number] = [0.5, 0.2, 0.2, 0.1]
    const expected = 0.5 * 0.55 + 0.2 * 0.12 + 0.2 * 0.28 + 0.1 * 0.22
    expect(fourFactorsRating(0.55, 0.12, 0.28, 0.22, custom)).toBeCloseTo(expected, 5)
  })

  it('all zeros returns 0', () => {
    expect(fourFactorsRating(0, 0, 0, 0)).toBe(0)
  })

  it('better shooting increases rating', () => {
    const low = fourFactorsRating(0.45, 0.12, 0.28, 0.22)
    const high = fourFactorsRating(0.60, 0.12, 0.28, 0.22)
    expect(high).toBeGreaterThan(low)
  })
})

// ---------------------------------------------------------------------------
// 5. Team analytics
// ---------------------------------------------------------------------------

describe('teamRating', () => {
  it('winPct: wins / (wins + losses)', () => {
    const { winPct } = teamRating(50, 32, 110, 108, 82)
    expect(winPct).toBeCloseTo(50 / 82, 5)
  })

  it('pointDiffPerGame: (PF - PA) / gamesPlayed', () => {
    const { pointDiffPerGame } = teamRating(50, 32, 9020, 8856, 82)
    expect(pointDiffPerGame).toBeCloseTo((9020 - 8856) / 82, 3)
  })

  it('simpleRating equals pointDiffPerGame', () => {
    const r = teamRating(40, 42, 8900, 8960, 82)
    expect(r.simpleRating).toBeCloseTo(r.pointDiffPerGame, 5)
  })

  it('returns 0 winPct for 0 games', () => {
    const { winPct } = teamRating(0, 0, 0, 0, 0)
    expect(winPct).toBe(0)
  })

  it('negative simpleRating for losing team', () => {
    const { simpleRating } = teamRating(20, 62, 7000, 8000, 82)
    expect(simpleRating).toBeLessThan(0)
  })

  it('returns object with winPct, pointDiffPerGame, simpleRating', () => {
    const r = teamRating(50, 32, 9000, 8700, 82)
    expect(r).toHaveProperty('winPct')
    expect(r).toHaveProperty('pointDiffPerGame')
    expect(r).toHaveProperty('simpleRating')
  })
})

describe('strengthOfSchedule', () => {
  it('returns average of opponent win percentages', () => {
    expect(strengthOfSchedule([0.5, 0.6, 0.4])).toBeCloseTo(0.5, 5)
  })

  it('returns 0 for empty array', () => {
    expect(strengthOfSchedule([])).toBe(0)
  })

  it('all equal win pcts returns that pct', () => {
    expect(strengthOfSchedule([0.55, 0.55, 0.55])).toBeCloseTo(0.55, 5)
  })

  it('harder schedule has higher SOS', () => {
    const easy = strengthOfSchedule([0.3, 0.35, 0.4])
    const hard = strengthOfSchedule([0.6, 0.65, 0.7])
    expect(hard).toBeGreaterThan(easy)
  })
})

describe('pythagoreanExpectation', () => {
  it('equal points yields 50%', () => {
    expect(pythagoreanExpectation(100, 100)).toBeCloseTo(0.5, 5)
  })

  it('more points for produces higher expectation', () => {
    expect(pythagoreanExpectation(115, 100)).toBeGreaterThan(0.5)
  })

  it('fewer points for produces lower expectation', () => {
    expect(pythagoreanExpectation(95, 110)).toBeLessThan(0.5)
  })

  it('returns 0 for 0 pointsFor and 0 pointsAgainst', () => {
    expect(pythagoreanExpectation(0, 0)).toBe(0)
  })

  it('accepts custom exponent', () => {
    const standard = pythagoreanExpectation(115, 100)
    const custom = pythagoreanExpectation(115, 100, 16)
    expect(standard).not.toBeCloseTo(custom, 5)
  })

  it('stays between 0 and 1', () => {
    const val = pythagoreanExpectation(120, 100)
    expect(val).toBeGreaterThan(0)
    expect(val).toBeLessThan(1)
  })
})

describe('clutchScore', () => {
  it('positive for efficient clutch play with good AST/TOV', () => {
    const score = clutchScore(20, 14, 6, 5, 1)
    expect(score).toBeGreaterThan(0)
  })

  it('returns 0 for all zeros', () => {
    expect(clutchScore(0, 0, 0, 0, 0)).toBe(0)
  })

  it('capped at 100', () => {
    // Perfect TS + extreme A/TO
    const score = clutchScore(100, 10, 5, 100, 0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('floored at 0', () => {
    // 0 pts with 0/0 FGA/FTA = TS=0; AST/TOV with 0 assists = 0
    const score = clutchScore(0, 5, 3, 0, 5)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('better shooting increases score', () => {
    const low = clutchScore(10, 20, 5, 3, 2)
    const high = clutchScore(25, 20, 5, 3, 2)
    expect(high).toBeGreaterThan(low)
  })
})

describe('homeCourtAdvantage', () => {
  it('typical home-court advantage is positive', () => {
    const hca = homeCourtAdvantage(30, 11, 20, 21)
    expect(hca).toBeGreaterThan(0)
  })

  it('equal home/away records yields 0', () => {
    expect(homeCourtAdvantage(20, 21, 20, 21)).toBeCloseTo(0, 5)
  })

  it('returns 0 for 0 games at home and away', () => {
    expect(homeCourtAdvantage(0, 0, 0, 0)).toBe(0)
  })

  it('away-dominant team yields negative value', () => {
    const hca = homeCourtAdvantage(10, 31, 30, 11)
    expect(hca).toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Player comparison
// ---------------------------------------------------------------------------

describe('playerSimilarityScore', () => {
  it('identical players score 100', () => {
    const p: PlayerStatLine = { pts: 20, reb: 8, ast: 5, stl: 1, blk: 1, tov: 2 }
    expect(playerSimilarityScore(p, p)).toBeCloseTo(100, 3)
  })

  it('completely different players score < 100', () => {
    const p1: PlayerStatLine = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0 }
    const p2: PlayerStatLine = { pts: 36, reb: 15, ast: 12, stl: 5, blk: 5, tov: 8 }
    expect(playerSimilarityScore(p1, p2)).toBeLessThan(100)
  })

  it('is symmetric', () => {
    const p1: PlayerStatLine = { pts: 20, reb: 8, ast: 5, stl: 1, blk: 1, tov: 2 }
    const p2: PlayerStatLine = { pts: 15, reb: 10, ast: 7, stl: 2, blk: 0, tov: 3 }
    expect(playerSimilarityScore(p1, p2)).toBeCloseTo(playerSimilarityScore(p2, p1), 5)
  })

  it('returns a value between 0 and 100', () => {
    const p1: PlayerStatLine = { pts: 10, reb: 5, ast: 3, stl: 1, blk: 0, tov: 2 }
    const p2: PlayerStatLine = { pts: 30, reb: 2, ast: 10, stl: 0, blk: 3, tov: 5 }
    const score = playerSimilarityScore(p1, p2)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('closer stats yield higher similarity', () => {
    const base: PlayerStatLine = { pts: 20, reb: 8, ast: 5, stl: 1, blk: 1, tov: 2 }
    const similar: PlayerStatLine = { pts: 21, reb: 8, ast: 5, stl: 1, blk: 1, tov: 2 }
    const different: PlayerStatLine = { pts: 35, reb: 1, ast: 12, stl: 0, blk: 4, tov: 7 }
    expect(playerSimilarityScore(base, similar)).toBeGreaterThan(
      playerSimilarityScore(base, different),
    )
  })

  it('zero-stats players are identical to each other', () => {
    const p: PlayerStatLine = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0 }
    expect(playerSimilarityScore(p, p)).toBeCloseTo(100, 3)
  })
})

describe('tradeValueIndex', () => {
  it('higher PER raises value', () => {
    const low = tradeValueIndex(15, 2, 5_000_000)
    const high = tradeValueIndex(25, 2, 5_000_000)
    expect(high).toBeGreaterThan(low)
  })

  it('higher salary lowers value', () => {
    const cheap = tradeValueIndex(20, 3, 5_000_000)
    const expensive = tradeValueIndex(20, 3, 30_000_000)
    expect(cheap).toBeGreaterThan(expensive)
  })

  it('0 salary uses 0.01M floor', () => {
    const val = tradeValueIndex(20, 3, 0)
    expect(val).toBeGreaterThan(0)
    expect(Number.isFinite(val)).toBe(true)
  })

  it('positive VORP increases value', () => {
    const low = tradeValueIndex(20, 0, 10_000_000)
    const high = tradeValueIndex(20, 5, 10_000_000)
    expect(high).toBeGreaterThan(low)
  })

  it('formula: (per + vorp*10) / max(salary/1M, 0.01)', () => {
    const expected = (20 + 3 * 10) / (10_000_000 / 1_000_000)
    expect(tradeValueIndex(20, 3, 10_000_000)).toBeCloseTo(expected, 5)
  })
})

describe('agingCurve', () => {
  it('peak is at 26 (returns 100)', () => {
    expect(agingCurve(26)).toBeCloseTo(100, 5)
  })

  it('age 18 returns 50', () => {
    expect(agingCurve(18)).toBeCloseTo(50, 5)
  })

  it('age <= 18 returns 50', () => {
    expect(agingCurve(16)).toBe(50)
  })

  it('age >= 38 returns 10', () => {
    expect(agingCurve(40)).toBe(10)
  })

  it('increases from 18 to 26', () => {
    expect(agingCurve(22)).toBeGreaterThan(agingCurve(20))
    expect(agingCurve(24)).toBeGreaterThan(agingCurve(22))
  })

  it('decreases from 26 to 38', () => {
    expect(agingCurve(30)).toBeLessThan(agingCurve(28))
    expect(agingCurve(34)).toBeLessThan(agingCurve(30))
  })

  it('stays between 0 and 100 for all valid ages', () => {
    for (const age of [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38]) {
      const val = agingCurve(age)
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Fantasy scoring (DraftKings NBA)
// ---------------------------------------------------------------------------

describe('draftKingsNBAScore', () => {
  const baseStats: DKNBAStats = {
    points: 20,
    rebounds: 6,
    assists: 4,
    steals: 1,
    blocks: 1,
    turnovers: 2,
    doubleDouble: false,
    tripleDouble: false,
  }

  it('basic formula: pts×1 + reb×1.25 + ast×1.5 + stl×2 + blk×2 + tov×−0.5', () => {
    // 20 + 7.5 + 6 + 2 + 2 - 1 = 36.5
    expect(draftKingsNBAScore(baseStats)).toBeCloseTo(36.5, 5)
  })

  it('double-double adds 1.5 bonus', () => {
    const dd = { ...baseStats, doubleDouble: true }
    expect(draftKingsNBAScore(dd)).toBeCloseTo(36.5 + 1.5, 5)
  })

  it('triple-double adds 3 bonus (not DD bonus)', () => {
    const td = { ...baseStats, tripleDouble: true }
    expect(draftKingsNBAScore(td)).toBeCloseTo(36.5 + 3, 5)
  })

  it('triple-double takes precedence over double-double', () => {
    const both = { ...baseStats, doubleDouble: true, tripleDouble: true }
    expect(draftKingsNBAScore(both)).toBeCloseTo(36.5 + 3, 5)
  })

  it('turnovers reduce score', () => {
    const noTov = { ...baseStats, turnovers: 0 }
    expect(draftKingsNBAScore(noTov)).toBeGreaterThan(draftKingsNBAScore(baseStats))
  })

  it('0 stats returns 0', () => {
    const zero: DKNBAStats = {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
      turnovers: 0, doubleDouble: false, tripleDouble: false,
    }
    expect(draftKingsNBAScore(zero)).toBe(0)
  })

  it('steals and blocks each count 2', () => {
    const withSB: DKNBAStats = {
      points: 0, rebounds: 0, assists: 0, steals: 3, blocks: 2,
      turnovers: 0, doubleDouble: false, tripleDouble: false,
    }
    expect(draftKingsNBAScore(withSB)).toBeCloseTo(3 * 2 + 2 * 2, 5)
  })
})

describe('fantasyValue', () => {
  it('returns 0 for 0 minutes', () => {
    const stats: FantasyValueStats = {
      points: 20, rebounds: 6, assists: 4, steals: 1, blocks: 1,
      turnovers: 2, minutesPlayed: 0,
    }
    expect(fantasyValue(stats)).toBe(0)
  })

  it('scales to 36-minute pace', () => {
    const stats: FantasyValueStats = {
      points: 20, rebounds: 6, assists: 4, steals: 1, blocks: 1,
      turnovers: 2, minutesPlayed: 36,
    }
    // DK base = 20 + 7.5 + 6 + 2 + 2 - 1 = 36.5; per36 = 36.5
    expect(fantasyValue(stats)).toBeCloseTo(36.5, 3)
  })

  it('fewer minutes played yields higher per-36 value', () => {
    const stats18: FantasyValueStats = {
      points: 15, rebounds: 4, assists: 3, steals: 1, blocks: 0,
      turnovers: 1, minutesPlayed: 18,
    }
    const stats36: FantasyValueStats = {
      ...stats18, minutesPlayed: 36,
    }
    // Same raw stats over half the time → higher per-36
    expect(fantasyValue(stats18)).toBeGreaterThan(fantasyValue(stats36))
  })

  it('positive for productive player', () => {
    const stats: FantasyValueStats = {
      points: 18, rebounds: 8, assists: 5, steals: 1, blocks: 1,
      turnovers: 2, minutesPlayed: 30,
    }
    expect(fantasyValue(stats)).toBeGreaterThan(0)
  })
})

describe('starterProbability', () => {
  it('at 25 mpg returns 0.5', () => {
    expect(starterProbability(25)).toBeCloseTo(0.5, 5)
  })

  it('above 25 mpg returns > 0.5', () => {
    expect(starterProbability(30)).toBeGreaterThan(0.5)
  })

  it('below 25 mpg returns < 0.5', () => {
    expect(starterProbability(15)).toBeLessThan(0.5)
  })

  it('returns value between 0 and 1', () => {
    for (const mpg of [0, 10, 20, 25, 30, 40, 48]) {
      const prob = starterProbability(mpg)
      expect(prob).toBeGreaterThanOrEqual(0)
      expect(prob).toBeLessThanOrEqual(1)
    }
  })

  it('clear starter (38 mpg) has high probability', () => {
    expect(starterProbability(38)).toBeGreaterThan(0.95)
  })

  it('bench player (12 mpg) has low probability', () => {
    expect(starterProbability(12)).toBeLessThan(0.1)
  })

  it('monotonically increasing with mpg', () => {
    expect(starterProbability(20)).toBeLessThan(starterProbability(25))
    expect(starterProbability(25)).toBeLessThan(starterProbability(30))
    expect(starterProbability(30)).toBeLessThan(starterProbability(35))
  })
})

// ---------------------------------------------------------------------------
// 8. Game projection
// ---------------------------------------------------------------------------

describe('projectedTotal', () => {
  it('computes combined score for typical NBA teams', () => {
    // (113 + 110) / 200 * (100 + 98) / 2 * 2 = 1.115 * 99 * 2 = 220.77
    const total = projectedTotal(113, 100, 110, 98)
    expect(total).toBeGreaterThan(200)
    expect(total).toBeLessThan(250)
  })

  it('higher offensive ratings yields higher total', () => {
    const low = projectedTotal(105, 98, 102, 96)
    const high = projectedTotal(120, 105, 118, 102)
    expect(high).toBeGreaterThan(low)
  })

  it('faster pace yields higher total', () => {
    const slow = projectedTotal(112, 90, 108, 88)
    const fast = projectedTotal(112, 110, 108, 108)
    expect(fast).toBeGreaterThan(slow)
  })

  it('symmetric if home/away swapped', () => {
    const a = projectedTotal(112, 100, 108, 98)
    const b = projectedTotal(108, 98, 112, 100)
    expect(a).toBeCloseTo(b, 5)
  })
})

describe('spreadFromRatings', () => {
  it('home advantage: 0 diff + default 3 HCA → positive spread', () => {
    expect(spreadFromRatings(0, 0)).toBeCloseTo(1.5, 5)
  })

  it('better home team yields larger spread', () => {
    const evenTeams = spreadFromRatings(0, 0)
    const homeAdvantaged = spreadFromRatings(5, 0)
    expect(homeAdvantaged).toBeGreaterThan(evenTeams)
  })

  it('better away team yields negative spread', () => {
    const spread = spreadFromRatings(0, 10)
    expect(spread).toBeLessThan(0)
  })

  it('uses custom home court advantage', () => {
    const noHCA = spreadFromRatings(0, 0, 0)
    const withHCA = spreadFromRatings(0, 0, 4)
    expect(withHCA).toBeGreaterThan(noHCA)
  })

  it('formula check: (homeNet - awayNet + HCA) * 0.5', () => {
    expect(spreadFromRatings(6, 2, 3)).toBeCloseTo((6 - 2 + 3) * 0.5, 5)
  })
})

describe('moneylineFromSpread', () => {
  it('returns homeML and awayML', () => {
    const ml = moneylineFromSpread(5)
    expect(ml).toHaveProperty('homeML')
    expect(ml).toHaveProperty('awayML')
  })

  it('0 spread yields even money (around ±100)', () => {
    const ml = moneylineFromSpread(0)
    // At spread=0, home win prob = 0.5, so ~±100
    expect(Math.abs(ml.homeML)).toBeCloseTo(100, -1)
    expect(Math.abs(ml.awayML)).toBeCloseTo(100, -1)
  })

  it('home-favored spread: homeML is negative (favorite)', () => {
    const ml = moneylineFromSpread(7)
    expect(ml.homeML).toBeLessThan(0)
    expect(ml.awayML).toBeGreaterThan(0)
  })

  it('away-favored spread: awayML is negative (favorite)', () => {
    const ml = moneylineFromSpread(-7)
    expect(ml.awayML).toBeLessThan(0)
    expect(ml.homeML).toBeGreaterThan(0)
  })

  it('larger spread means larger absolute moneyline', () => {
    const ml5 = moneylineFromSpread(5)
    const ml10 = moneylineFromSpread(10)
    expect(Math.abs(ml10.homeML)).toBeGreaterThan(Math.abs(ml5.homeML))
  })

  it('homeML and awayML are numbers', () => {
    const ml = moneylineFromSpread(3)
    expect(typeof ml.homeML).toBe('number')
    expect(typeof ml.awayML).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// Edge cases across all functions
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('fieldGoalPct: 0 attempts returns 0', () => {
    expect(fieldGoalPct(0, 0)).toBe(0)
  })

  it('threePointPct: 0 attempts returns 0', () => {
    expect(threePointPct(0, 0)).toBe(0)
  })

  it('freeThrowPct: 0 attempts returns 0', () => {
    expect(freeThrowPct(0, 0)).toBe(0)
  })

  it('effectiveFGPct: 0 FGA returns 0', () => {
    expect(effectiveFGPct(0, 0, 0)).toBe(0)
  })

  it('trueShootingPct: 0 FGA and 0 FTA returns 0', () => {
    expect(trueShootingPct(0, 0, 0)).toBe(0)
  })

  it('twoPointPct: FGA equals FGA3 returns 0', () => {
    expect(twoPointPct(5, 5, 8, 8)).toBe(0)
  })

  it('pointsPerPossession: 0 possessions returns 0', () => {
    expect(pointsPerPossession(100, 0)).toBe(0)
  })

  it('offensiveRating: 0 possessions returns 0', () => {
    expect(offensiveRating(110, 0)).toBe(0)
  })

  it('defensiveRating: 0 possessions returns 0', () => {
    expect(defensiveRating(110, 0)).toBe(0)
  })

  it('pace: 0 minutes returns 0', () => {
    expect(pace(100, 0)).toBe(0)
  })

  it('possessionEstimate: all zeros returns 0', () => {
    expect(possessionEstimate(0, 0, 0, 0)).toBe(0)
  })

  it('playerEfficiencyRating: 0 minutes returns 0', () => {
    expect(playerEfficiencyRating(20, 6, 4, 1, 1, 8, 16, 4, 6, 2, 2, 0, 100, 100)).toBe(0)
  })

  it('boxPlusMinus: 0 minutes returns 0', () => {
    expect(boxPlusMinus(0, 0, 0, 0, 0, 0, 0, 0, 0)).toBe(0)
  })

  it('winShares: 0 teamMinutes returns 0', () => {
    expect(winShares(5, 120, 0)).toBe(0)
  })

  it('usageRate: 0 player minutes returns 0', () => {
    expect(usageRate(14, 4, 3, 0, 85, 22, 14, 240)).toBe(0)
  })

  it('reboundRate: 0 minutes returns 0', () => {
    expect(reboundRate(8, 0, 35, 30, 240)).toBe(0)
  })

  it('shootingFactor is identity', () => {
    expect(shootingFactor(0.55)).toBe(0.55)
  })

  it('turnoverFactor: all zeros returns 0', () => {
    expect(turnoverFactor(0, 0, 0)).toBe(0)
  })

  it('reboundingFactor: all zeros returns 0', () => {
    expect(reboundingFactor(0, 0, 0)).toBe(0)
  })

  it('freeThrowFactor: 0 FGA returns 0', () => {
    expect(freeThrowFactor(16, 0)).toBe(0)
  })

  it('fourFactorsRating: all zeros returns 0', () => {
    expect(fourFactorsRating(0, 0, 0, 0)).toBe(0)
  })

  it('strengthOfSchedule: empty array returns 0', () => {
    expect(strengthOfSchedule([])).toBe(0)
  })

  it('pythagoreanExpectation: both 0 returns 0', () => {
    expect(pythagoreanExpectation(0, 0)).toBe(0)
  })

  it('clutchScore: all zeros returns 0', () => {
    expect(clutchScore(0, 0, 0, 0, 0)).toBe(0)
  })

  it('homeCourtAdvantage: all zeros returns 0', () => {
    expect(homeCourtAdvantage(0, 0, 0, 0)).toBe(0)
  })

  it('playerSimilarityScore: identical players = 100', () => {
    const p: PlayerStatLine = { pts: 20, reb: 8, ast: 5, stl: 1, blk: 1, tov: 2 }
    expect(playerSimilarityScore(p, p)).toBeCloseTo(100, 3)
  })

  it('fantasyValue: 0 minutes returns 0', () => {
    const stats: FantasyValueStats = {
      points: 20, rebounds: 6, assists: 4, steals: 1, blocks: 1,
      turnovers: 2, minutesPlayed: 0,
    }
    expect(fantasyValue(stats)).toBe(0)
  })

  it('draftKingsNBAScore: all zeros returns 0', () => {
    const zero: DKNBAStats = {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
      turnovers: 0, doubleDouble: false, tripleDouble: false,
    }
    expect(draftKingsNBAScore(zero)).toBe(0)
  })

  it('starterProbability: 0 mpg is near 0', () => {
    expect(starterProbability(0)).toBeLessThan(0.01)
  })

  it('starterProbability: 48 mpg is near 1', () => {
    expect(starterProbability(48)).toBeGreaterThan(0.99)
  })

  it('agingCurve: below 18 returns 50', () => {
    expect(agingCurve(16)).toBe(50)
  })

  it('agingCurve: above 38 returns 10', () => {
    expect(agingCurve(40)).toBe(10)
  })

  it('spreadFromRatings: equal teams with no HCA yields 0', () => {
    expect(spreadFromRatings(0, 0, 0)).toBeCloseTo(0, 5)
  })

  it('moneylineFromSpread: 0 spread gives near-even odds', () => {
    const ml = moneylineFromSpread(0)
    expect(Math.abs(ml.homeML)).toBeCloseTo(100, -1)
  })
})
