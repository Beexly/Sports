/**
 * rugby-analytics.test.ts
 * Comprehensive tests for rugby-analytics.ts
 * Covers all exported functions, including edge cases.
 */

import { describe, it, expect } from 'vitest'
import {
  rugbyScore,
  tryScoringRate,
  conversionRate,
  penaltyRate,
  pointBreakdown,
  rugbyLeagueScore,
  metersPerCarry,
  lineBreakRate,
  offloadRate,
  supportPlayerIndex,
  gainLineSuccess,
  tryAssistRate,
  tackleSuccessRate,
  defensiveRatingIndex,
  pressureCreated,
  interceptRate,
  scrumWinRate,
  lineoutWinRate,
  lineoutStealsPerMatch,
  setPieceScore,
  kickingGame,
  forwardRating,
  backRating,
  hookerRating,
  flyHalfRating,
  numberEightRating,
  possessionPct,
  territoryPct,
  rugbyNetRating,
  rugbyStrengthIndex,
  rugbyMomentumScore,
  draftKingsRugbyScore,
  homeAdvantage,
  rugbyMatchOdds,
  totalPointsProjection,
} from '../lib/sports/rugby-analytics'

// ---------------------------------------------------------------------------
// Scoring System
// ---------------------------------------------------------------------------

describe('rugbyScore', () => {
  it('calculates score with all scoring types', () => {
    // 2 tries=10, 2 conversions=4, 1 penalty=3, 1 dropGoal=3 => 20
    expect(rugbyScore(2, 2, 1, 1)).toBe(20)
  })

  it('returns 0 for all zeros', () => {
    expect(rugbyScore(0, 0, 0, 0)).toBe(0)
  })

  it('counts tries as 5 points each', () => {
    expect(rugbyScore(3, 0, 0, 0)).toBe(15)
  })

  it('counts conversions as 2 points each', () => {
    expect(rugbyScore(0, 4, 0, 0)).toBe(8)
  })

  it('counts penalties as 3 points each', () => {
    expect(rugbyScore(0, 0, 5, 0)).toBe(15)
  })

  it('counts drop goals as 3 points each', () => {
    expect(rugbyScore(0, 0, 0, 2)).toBe(6)
  })

  it('handles a typical first-half score', () => {
    // 1 try=5, 1 conversion=2, 2 penalties=6 => 13
    expect(rugbyScore(1, 1, 2, 0)).toBe(13)
  })
})

describe('tryScoringRate', () => {
  it('returns 0 when no minutes played', () => {
    expect(tryScoringRate(3, 0)).toBe(0)
  })

  it('returns rate per 80 minutes correctly', () => {
    // 4 tries in 80 min => 4 per 80 min
    expect(tryScoringRate(4, 80)).toBe(4)
  })

  it('scales rate for partial game', () => {
    // 2 tries in 40 min => 4 per 80 min
    expect(tryScoringRate(2, 40)).toBe(4)
  })

  it('returns 0 when 0 tries scored', () => {
    expect(tryScoringRate(0, 80)).toBe(0)
  })
})

describe('conversionRate', () => {
  it('returns 0 when no tries scored', () => {
    expect(conversionRate(3, 0)).toBe(0)
  })

  it('calculates 100% conversion rate', () => {
    expect(conversionRate(5, 5)).toBe(100)
  })

  it('calculates partial conversion rate', () => {
    expect(conversionRate(3, 5)).toBe(60)
  })

  it('returns 0 when 0 conversions', () => {
    expect(conversionRate(0, 4)).toBe(0)
  })
})

describe('penaltyRate', () => {
  it('returns 0 when no minutes played', () => {
    expect(penaltyRate(3, 0)).toBe(0)
  })

  it('calculates per-80-minute rate', () => {
    // 4 penalties in 80 min => 4 per 80
    expect(penaltyRate(4, 80)).toBe(4)
  })

  it('scales correctly for partial game', () => {
    // 2 penalties in 40 min => 4 per 80
    expect(penaltyRate(2, 40)).toBe(4)
  })

  it('returns 0 when 0 penalties', () => {
    expect(penaltyRate(0, 80)).toBe(0)
  })
})

describe('pointBreakdown', () => {
  it('returns all zeros for zero inputs', () => {
    const result = pointBreakdown(0, 0, 0, 0)
    expect(result.fromTries).toBe(0)
    expect(result.fromConversions).toBe(0)
    expect(result.fromPenalties).toBe(0)
    expect(result.fromDropGoals).toBe(0)
    expect(result.total).toBe(0)
  })

  it('calculates each component correctly', () => {
    const result = pointBreakdown(2, 1, 3, 2)
    expect(result.fromTries).toBe(10)
    expect(result.fromConversions).toBe(2)
    expect(result.fromPenalties).toBe(9)
    expect(result.fromDropGoals).toBe(6)
    expect(result.total).toBe(27)
  })

  it('total matches rugbyScore', () => {
    const breakdown = pointBreakdown(3, 2, 4, 1)
    expect(breakdown.total).toBe(rugbyScore(3, 2, 4, 1))
  })

  it('handles only tries', () => {
    const result = pointBreakdown(4, 0, 0, 0)
    expect(result.fromTries).toBe(20)
    expect(result.total).toBe(20)
  })
})

describe('rugbyLeagueScore', () => {
  it('calculates league score correctly', () => {
    // 2 tries=8, 2 goals=4, 1 fieldGoal=1 => 13
    expect(rugbyLeagueScore(2, 2, 1)).toBe(13)
  })

  it('returns 0 for all zeros', () => {
    expect(rugbyLeagueScore(0, 0, 0)).toBe(0)
  })

  it('counts tries as 4 points each', () => {
    expect(rugbyLeagueScore(3, 0, 0)).toBe(12)
  })

  it('counts goals as 2 points each', () => {
    expect(rugbyLeagueScore(0, 5, 0)).toBe(10)
  })

  it('counts field goals as 1 point each', () => {
    expect(rugbyLeagueScore(0, 0, 3)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Attack Analytics
// ---------------------------------------------------------------------------

describe('metersPerCarry', () => {
  it('returns 0 when no carries', () => {
    expect(metersPerCarry(100, 0)).toBe(0)
  })

  it('calculates correctly', () => {
    expect(metersPerCarry(100, 20)).toBe(5)
  })

  it('handles fractional result', () => {
    expect(metersPerCarry(75, 30)).toBe(2.5)
  })

  it('returns 0 when 0 meters', () => {
    expect(metersPerCarry(0, 10)).toBe(0)
  })
})

describe('lineBreakRate', () => {
  it('returns 0 when no carries', () => {
    expect(lineBreakRate(5, 0)).toBe(0)
  })

  it('calculates percentage correctly', () => {
    expect(lineBreakRate(10, 100)).toBe(10)
  })

  it('returns 100 if every carry is a line break', () => {
    expect(lineBreakRate(5, 5)).toBe(100)
  })

  it('returns 0 when 0 line breaks', () => {
    expect(lineBreakRate(0, 50)).toBe(0)
  })
})

describe('offloadRate', () => {
  it('returns 0 when no tackles', () => {
    expect(offloadRate(5, 0)).toBe(0)
  })

  it('calculates percentage correctly', () => {
    expect(offloadRate(15, 100)).toBe(15)
  })

  it('returns 0 when 0 offloads', () => {
    expect(offloadRate(0, 40)).toBe(0)
  })
})

describe('supportPlayerIndex', () => {
  it('returns 0 for all zeros', () => {
    expect(supportPlayerIndex(0, 0, 0)).toBe(0)
  })

  it('caps at 10', () => {
    // Very high values should still cap at 10
    expect(supportPlayerIndex(100, 100, 100)).toBe(10)
  })

  it('calculates correctly for typical values', () => {
    // (5*3 + 20*0.5 + 2*2)/10 = (15+10+4)/10 = 29/10 = 2.9
    expect(supportPlayerIndex(5, 20, 2)).toBeCloseTo(2.9)
  })

  it('never goes below 0', () => {
    expect(supportPlayerIndex(-10, -10, -10)).toBe(0)
  })
})

describe('gainLineSuccess', () => {
  it('returns 0 when no carries', () => {
    expect(gainLineSuccess(10, 0)).toBe(0)
  })

  it('calculates percentage correctly', () => {
    expect(gainLineSuccess(60, 100)).toBe(60)
  })

  it('returns 100 when all carries beat gain line', () => {
    expect(gainLineSuccess(20, 20)).toBe(100)
  })

  it('returns 0 when 0 gains over', () => {
    expect(gainLineSuccess(0, 20)).toBe(0)
  })
})

describe('tryAssistRate', () => {
  it('returns 0 when no matches played', () => {
    expect(tryAssistRate(5, 0)).toBe(0)
  })

  it('calculates per-match rate correctly', () => {
    expect(tryAssistRate(10, 5)).toBe(2)
  })

  it('handles fractional result', () => {
    expect(tryAssistRate(3, 2)).toBe(1.5)
  })

  it('returns 0 when 0 assists', () => {
    expect(tryAssistRate(0, 10)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Defense Analytics
// ---------------------------------------------------------------------------

describe('tackleSuccessRate', () => {
  it('returns 0 when no attempts', () => {
    expect(tackleSuccessRate(10, 0)).toBe(0)
  })

  it('calculates 100% success rate', () => {
    expect(tackleSuccessRate(20, 20)).toBe(100)
  })

  it('calculates partial success rate', () => {
    expect(tackleSuccessRate(80, 100)).toBe(80)
  })

  it('returns 0 for 0 completed tackles', () => {
    expect(tackleSuccessRate(0, 30)).toBe(0)
  })
})

describe('defensiveRatingIndex', () => {
  it('returns 0 when no minutes played', () => {
    expect(defensiveRatingIndex(80, 5, 3, 0)).toBe(0)
  })

  it('caps at 100', () => {
    // Extremely high tackle success with lots of turnovers and no penalties
    expect(defensiveRatingIndex(100, 100, 0, 80)).toBe(100)
  })

  it('never goes below 0', () => {
    // No tackle success, lots of penalties, few turnovers
    expect(defensiveRatingIndex(0, 0, 100, 80)).toBe(0)
  })

  it('calculates a typical mid-range rating', () => {
    // tackleSuccess=80, turnovers=2, penaltiesConceded=3, minutes=80
    // 80*0.5 + (2/80)*80*10 - (3/80)*80*2 = 40 + 20 - 6 = 54
    expect(defensiveRatingIndex(80, 2, 3, 80)).toBeCloseTo(54)
  })

  it('penalizes conceded penalties', () => {
    const withPenalties = defensiveRatingIndex(80, 2, 5, 80)
    const withoutPenalties = defensiveRatingIndex(80, 2, 0, 80)
    expect(withPenalties).toBeLessThan(withoutPenalties)
  })
})

describe('pressureCreated', () => {
  it('returns 0 for all zeros', () => {
    expect(pressureCreated(0, 0)).toBe(0)
  })

  it('calculates correctly', () => {
    // 3 turnovers*3 + 4 penalties*2 = 9+8 = 17
    expect(pressureCreated(3, 4)).toBe(17)
  })

  it('weights turnovers higher than penalties', () => {
    const turnoverResult = pressureCreated(1, 0)
    const penaltyResult = pressureCreated(0, 1)
    expect(turnoverResult).toBeGreaterThan(penaltyResult)
  })
})

describe('interceptRate', () => {
  it('returns 0 when no defensive actions', () => {
    expect(interceptRate(3, 0)).toBe(0)
  })

  it('calculates percentage correctly', () => {
    expect(interceptRate(5, 100)).toBe(5)
  })

  it('returns 100 if every action is an intercept', () => {
    expect(interceptRate(10, 10)).toBe(100)
  })

  it('returns 0 when 0 intercepts', () => {
    expect(interceptRate(0, 50)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Set Piece
// ---------------------------------------------------------------------------

describe('scrumWinRate', () => {
  it('returns 0 when no scrums', () => {
    expect(scrumWinRate(5, 0)).toBe(0)
  })

  it('calculates 100% win rate', () => {
    expect(scrumWinRate(10, 10)).toBe(100)
  })

  it('calculates partial win rate', () => {
    expect(scrumWinRate(7, 10)).toBe(70)
  })
})

describe('lineoutWinRate', () => {
  it('returns 0 when no lineouts', () => {
    expect(lineoutWinRate(5, 0)).toBe(0)
  })

  it('calculates 100% win rate', () => {
    expect(lineoutWinRate(12, 12)).toBe(100)
  })

  it('calculates partial win rate', () => {
    expect(lineoutWinRate(9, 12)).toBe(75)
  })
})

describe('lineoutStealsPerMatch', () => {
  it('returns 0 when no matches played', () => {
    expect(lineoutStealsPerMatch(3, 0)).toBe(0)
  })

  it('calculates per-match rate correctly', () => {
    expect(lineoutStealsPerMatch(6, 3)).toBe(2)
  })

  it('returns 0 when 0 steals', () => {
    expect(lineoutStealsPerMatch(0, 10)).toBe(0)
  })
})

describe('setPieceScore', () => {
  it('returns 50 for both at 50%', () => {
    expect(setPieceScore(50, 50)).toBe(50)
  })

  it('returns 100 for both at 100%', () => {
    expect(setPieceScore(100, 100)).toBe(100)
  })

  it('returns 0 for both at 0%', () => {
    expect(setPieceScore(0, 0)).toBe(0)
  })

  it('averages the two rates', () => {
    expect(setPieceScore(80, 60)).toBe(70)
  })
})

describe('kickingGame', () => {
  it('returns 0 for both when totalKicks is 0', () => {
    const result = kickingGame(5, 3, 0)
    expect(result.exitRate).toBe(0)
    expect(result.touchRate).toBe(0)
  })

  it('calculates exit and touch rates correctly', () => {
    // 40 territory kicks, 30 kicks to touch, 100 total
    const result = kickingGame(40, 30, 100)
    expect(result.exitRate).toBe(40)
    expect(result.touchRate).toBe(30)
  })

  it('handles 100% exit rate', () => {
    const result = kickingGame(10, 0, 10)
    expect(result.exitRate).toBe(100)
    expect(result.touchRate).toBe(0)
  })

  it('exit and touch rates can overlap (both measured against total kicks)', () => {
    // A kick can be both a territory kick and a kick to touch
    const result = kickingGame(8, 8, 10)
    expect(result.exitRate).toBe(80)
    expect(result.touchRate).toBe(80)
  })
})

// ---------------------------------------------------------------------------
// Player Ratings
// ---------------------------------------------------------------------------

describe('forwardRating', () => {
  it('returns 0 when all inputs are 0', () => {
    // metersPerCarry(0,0)=0, so 0*5 + 0*0.4 + 0*20 + 0*20 = 0
    expect(forwardRating(0, 0, 0, 0, 0, 0)).toBe(0)
  })

  it('caps at 100', () => {
    // Very high meters per carry and 100% contributions
    expect(forwardRating(1, 1000, 30, 100, 1, 1)).toBe(100)
  })

  it('correctly weights scrum and lineout contributions', () => {
    // carries=10, meters=50, metersPerCarry=5, tackleSuccess=80
    // 5*5 + 80*0.4 + 0.5*20 + 0.5*20 = 25+32+10+10 = 77
    expect(forwardRating(10, 50, 20, 80, 0.5, 0.5)).toBeCloseTo(77)
  })

  it('handles 0 carries with some tackle success', () => {
    // metersPerCarry=0, 0*5 + 50*0.4 + 0*20 + 0*20 = 20
    expect(forwardRating(0, 0, 20, 50, 0, 0)).toBeCloseTo(20)
  })
})

describe('backRating', () => {
  it('returns 0 when all inputs are 0', () => {
    expect(backRating(0, 0, 0, 0, 0)).toBe(0)
  })

  it('caps at 100', () => {
    expect(backRating(10, 10, 10000, 1, 100)).toBe(100)
  })

  it('calculates correctly', () => {
    // tries=2, assists=3, meters=100, carries=20, tackleSuccess=70
    // 2*10 + 3*5 + (100/20)*3 + 70*0.3 = 20+15+15+21 = 71
    expect(backRating(2, 3, 100, 20, 70)).toBeCloseTo(71)
  })

  it('never goes below 0', () => {
    expect(backRating(0, 0, 0, 0, 0)).toBe(0)
  })
})

describe('hookerRating', () => {
  it('returns 0 when all inputs are 0', () => {
    expect(hookerRating(0, 0, 0, 0)).toBe(0)
  })

  it('caps at 100', () => {
    expect(hookerRating(100, 100, 100, 10)).toBe(100)
  })

  it('calculates correctly with typical values', () => {
    // lineoutWR=90, scrumWR=85, tackles=20
    // 90*0.35 + 85*0.35 + min(20/20,1)*30 = 31.5 + 29.75 + 30 = 91.25
    expect(hookerRating(90, 85, 20, 10)).toBeCloseTo(91.25)
  })

  it('caps tackle contribution at min(tackles/20,1)', () => {
    // High tackles should not exceed the min(tackles/20,1) cap
    const r1 = hookerRating(80, 80, 20, 10)
    const r2 = hookerRating(80, 80, 40, 10) // Same result since min(40/20,1)=1 and min(20/20,1)=1
    expect(r1).toBeCloseTo(r2)
  })
})

describe('flyHalfRating', () => {
  it('returns 0 when all inputs are 0', () => {
    expect(flyHalfRating(0, 0, 0, 0, 0)).toBe(0)
  })

  it('caps at 100', () => {
    expect(flyHalfRating(100, 100, 100, 20, 20)).toBe(100)
  })

  it('calculates correctly with typical values', () => {
    // convRate=80, penaltyKickRate=75, kicksFromHand=20, tries=1, assists=2
    // 80*0.25 + 75*0.25 + min(20/20,1)*20 + 1*5 + 2*3
    // = 20 + 18.75 + 20 + 5 + 6 = 69.75
    expect(flyHalfRating(80, 75, 20, 1, 2)).toBeCloseTo(69.75)
  })

  it('kicks from hand cap applies', () => {
    const r1 = flyHalfRating(70, 70, 20, 0, 0)
    const r2 = flyHalfRating(70, 70, 40, 0, 0) // kicks capped at 20
    expect(r1).toBeCloseTo(r2)
  })
})

describe('numberEightRating', () => {
  it('returns 0 when all inputs are 0', () => {
    expect(numberEightRating(0, 0, 0, 0, 0)).toBe(0)
  })

  it('caps at 100', () => {
    expect(numberEightRating(100, 1000, 100, 100, 100)).toBe(100)
  })

  it('calculates correctly with typical values', () => {
    // carries=20, metersGained=200, lineBreaks=3, tackles=20, turnovers=2
    // min(20/20,1)*30 + min(200/200,1)*30 + 3*5 + min(20/20,1)*20 + 2*5
    // = 30 + 30 + 15 + 20 + 10 = 105 -> capped at 100
    expect(numberEightRating(20, 200, 3, 20, 2)).toBe(100)
  })

  it('partial carries produce partial contribution', () => {
    // carries=10 (half cap), metersGained=0, lineBreaks=0, tackles=0, turnovers=0
    // min(10/20,1)*30 = 15
    expect(numberEightRating(10, 0, 0, 0, 0)).toBeCloseTo(15)
  })

  it('turnovers add to the score', () => {
    const withTurnovers = numberEightRating(10, 100, 0, 10, 3)
    const withoutTurnovers = numberEightRating(10, 100, 0, 10, 0)
    expect(withTurnovers).toBeGreaterThan(withoutTurnovers)
  })
})

// ---------------------------------------------------------------------------
// Team Performance
// ---------------------------------------------------------------------------

describe('possessionPct', () => {
  it('returns 0 when totalPossession is 0', () => {
    expect(possessionPct(40, 0)).toBe(0)
  })

  it('calculates 50/50 possession correctly', () => {
    expect(possessionPct(40, 80)).toBe(50)
  })

  it('calculates 100% possession correctly', () => {
    expect(possessionPct(80, 80)).toBe(100)
  })

  it('calculates typical possession split', () => {
    expect(possessionPct(55, 100)).toBeCloseTo(55)
  })
})

describe('territoryPct', () => {
  it('returns 0 when totalTerritory is 0', () => {
    expect(territoryPct(40, 0)).toBe(0)
  })

  it('calculates correctly', () => {
    expect(territoryPct(60, 100)).toBe(60)
  })

  it('returns 50 for equal territory', () => {
    expect(territoryPct(50, 100)).toBe(50)
  })
})

describe('rugbyNetRating', () => {
  it('returns 0 when no matches played', () => {
    expect(rugbyNetRating(100, 50, 0)).toBe(0)
  })

  it('calculates positive net rating', () => {
    // 200 for, 100 against, 10 matches => +10 per game
    expect(rugbyNetRating(200, 100, 10)).toBe(10)
  })

  it('calculates negative net rating', () => {
    // 100 for, 200 against, 10 matches => -10 per game
    expect(rugbyNetRating(100, 200, 10)).toBe(-10)
  })

  it('returns 0 when points are equal', () => {
    expect(rugbyNetRating(100, 100, 10)).toBe(0)
  })
})

describe('rugbyStrengthIndex', () => {
  it('returns 0 for unplayed season with 0 point diff', () => {
    expect(rugbyStrengthIndex(0, 0, 0, 0)).toBe(0)
  })

  it('returns high value for undefeated season with large point diff', () => {
    const rating = rugbyStrengthIndex(10, 0, 0, 200)
    expect(rating).toBeGreaterThan(90)
  })

  it('handles negative point differential', () => {
    const rating = rugbyStrengthIndex(5, 5, 0, -50)
    expect(rating).toBeLessThan(30)
  })

  it('draws contribute half a win', () => {
    const withDraws = rugbyStrengthIndex(4, 4, 2, 0)
    const withoutDraws = rugbyStrengthIndex(5, 5, 0, 0)
    // Both should have same win rate contribution with same total games
    expect(withDraws).toBeCloseTo(withoutDraws)
  })

  it('caps at 100', () => {
    const rating = rugbyStrengthIndex(100, 0, 0, 10000)
    expect(rating).toBe(100)
  })

  it('result is never below 0', () => {
    const rating = rugbyStrengthIndex(0, 10, 0, -1000)
    expect(rating).toBe(0)
  })
})

describe('rugbyMomentumScore', () => {
  it('returns 0 for empty results array', () => {
    expect(rugbyMomentumScore([])).toBe(0)
  })

  it('returns 100 for single win', () => {
    expect(rugbyMomentumScore(['win'])).toBe(100)
  })

  it('returns 0 for single loss', () => {
    expect(rugbyMomentumScore(['loss'])).toBe(0)
  })

  it('returns 50 for single draw', () => {
    expect(rugbyMomentumScore(['draw'])).toBe(50)
  })

  it('weights most recent result most heavily', () => {
    // Win then loss (recent=loss) vs loss then win (recent=win)
    const recentWin = rugbyMomentumScore(['win', 'loss'])
    const recentLoss = rugbyMomentumScore(['loss', 'win'])
    expect(recentWin).toBeGreaterThan(recentLoss)
  })

  it('gives higher score for winning streak than losing streak', () => {
    const winStreak = rugbyMomentumScore(['win', 'win', 'win'])
    const lossStreak = rugbyMomentumScore(['loss', 'loss', 'loss'])
    expect(winStreak).toBeGreaterThan(lossStreak)
  })

  it('returns a score between 0 and 100', () => {
    const score = rugbyMomentumScore(['win', 'loss', 'draw', 'win', 'loss'])
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('all draws returns 50', () => {
    expect(rugbyMomentumScore(['draw', 'draw', 'draw'])).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// Fantasy Scoring (DraftKings Rugby)
// ---------------------------------------------------------------------------

describe('draftKingsRugbyScore', () => {
  it('returns 0 for all zero stats without cards', () => {
    expect(
      draftKingsRugbyScore({
        tries: 0,
        assists: 0,
        conversions: 0,
        penaltyKicks: 0,
        tackles: 0,
        carries: 0,
        lineBreaks: 0,
        turnovers: 0,
        yellowCard: false,
        redCard: false,
      }),
    ).toBe(0)
  })

  it('scores tries at 12 points each', () => {
    expect(
      draftKingsRugbyScore({
        tries: 2,
        assists: 0,
        conversions: 0,
        penaltyKicks: 0,
        tackles: 0,
        carries: 0,
        lineBreaks: 0,
        turnovers: 0,
        yellowCard: false,
        redCard: false,
      }),
    ).toBe(24)
  })

  it('scores assists at 6 points each', () => {
    expect(
      draftKingsRugbyScore({
        tries: 0,
        assists: 3,
        conversions: 0,
        penaltyKicks: 0,
        tackles: 0,
        carries: 0,
        lineBreaks: 0,
        turnovers: 0,
        yellowCard: false,
        redCard: false,
      }),
    ).toBe(18)
  })

  it('applies yellow card penalty of -4', () => {
    const withCard = draftKingsRugbyScore({
      tries: 0,
      assists: 0,
      conversions: 0,
      penaltyKicks: 0,
      tackles: 0,
      carries: 0,
      lineBreaks: 0,
      turnovers: 0,
      yellowCard: true,
      redCard: false,
    })
    expect(withCard).toBe(-4)
  })

  it('applies red card penalty of -8', () => {
    const withCard = draftKingsRugbyScore({
      tries: 0,
      assists: 0,
      conversions: 0,
      penaltyKicks: 0,
      tackles: 0,
      carries: 0,
      lineBreaks: 0,
      turnovers: 0,
      yellowCard: false,
      redCard: true,
    })
    expect(withCard).toBe(-8)
  })

  it('applies both card penalties together', () => {
    const withBothCards = draftKingsRugbyScore({
      tries: 0,
      assists: 0,
      conversions: 0,
      penaltyKicks: 0,
      tackles: 0,
      carries: 0,
      lineBreaks: 0,
      turnovers: 0,
      yellowCard: true,
      redCard: true,
    })
    expect(withBothCards).toBe(-12)
  })

  it('calculates a full game score correctly', () => {
    // try=12, assist=6, conversion=3, penaltyKick=3, 10 tackles=15, 10 carries=5,
    // 2 lineBreaks=8, 1 turnover=6, no cards
    // total = 12+6+3+3+15+5+8+6 = 58
    expect(
      draftKingsRugbyScore({
        tries: 1,
        assists: 1,
        conversions: 1,
        penaltyKicks: 1,
        tackles: 10,
        carries: 10,
        lineBreaks: 2,
        turnovers: 1,
        yellowCard: false,
        redCard: false,
      }),
    ).toBe(58)
  })

  it('scores turnovers at 6 points each', () => {
    expect(
      draftKingsRugbyScore({
        tries: 0,
        assists: 0,
        conversions: 0,
        penaltyKicks: 0,
        tackles: 0,
        carries: 0,
        lineBreaks: 0,
        turnovers: 2,
        yellowCard: false,
        redCard: false,
      }),
    ).toBe(12)
  })

  it('scores lineBreaks at 4 points each', () => {
    expect(
      draftKingsRugbyScore({
        tries: 0,
        assists: 0,
        conversions: 0,
        penaltyKicks: 0,
        tackles: 0,
        carries: 0,
        lineBreaks: 3,
        turnovers: 0,
        yellowCard: false,
        redCard: false,
      }),
    ).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// Match Prediction
// ---------------------------------------------------------------------------

describe('homeAdvantage', () => {
  it('returns 3.5 for home venue', () => {
    expect(homeAdvantage(false)).toBe(3.5)
  })

  it('returns 0 for neutral venue', () => {
    expect(homeAdvantage(true)).toBe(0)
  })
})

describe('rugbyMatchOdds', () => {
  it('returns drawProb of 0.08 always', () => {
    const result = rugbyMatchOdds(80, 80, 0)
    expect(result.drawProb).toBe(0.08)
  })

  it('all probabilities sum to 1 when ratings are equal and no home advantage', () => {
    const result = rugbyMatchOdds(80, 80, 0)
    const total = result.homeWinProb + result.awayWinProb + result.drawProb
    expect(total).toBeCloseTo(1)
  })

  it('all probabilities sum to 1 with home advantage', () => {
    const result = rugbyMatchOdds(75, 70, 3.5)
    const total = result.homeWinProb + result.awayWinProb + result.drawProb
    expect(total).toBeCloseTo(1)
  })

  it('equal ratings with no advantage give 50% win probability (adjusted for draw)', () => {
    const result = rugbyMatchOdds(80, 80, 0)
    // With equal ratings and no advantage: spread=0, homeWinProb = 1/(1+exp(0)) = 0.5
    expect(result.homeWinProb).toBeCloseTo(0.5)
    expect(result.awayWinProb).toBeCloseTo(0.42) // 1 - 0.5 - 0.08
  })

  it('higher-rated home team has higher win probability', () => {
    const result = rugbyMatchOdds(90, 70, 0)
    expect(result.homeWinProb).toBeGreaterThan(result.awayWinProb)
  })

  it('higher-rated away team has higher win probability', () => {
    const result = rugbyMatchOdds(70, 90, 0)
    expect(result.awayWinProb).toBeGreaterThan(result.homeWinProb)
  })

  it('home advantage shifts probability toward home team', () => {
    const withAdvantage = rugbyMatchOdds(80, 80, 3.5)
    const withoutAdvantage = rugbyMatchOdds(80, 80, 0)
    expect(withAdvantage.homeWinProb).toBeGreaterThan(withoutAdvantage.homeWinProb)
  })

  it('neutral venue means 0 home advantage', () => {
    const neutral = rugbyMatchOdds(80, 80, homeAdvantage(true))
    const home = rugbyMatchOdds(80, 80, homeAdvantage(false))
    expect(neutral.homeWinProb).toBeLessThan(home.homeWinProb)
  })
})

describe('totalPointsProjection', () => {
  it('averages the two ratings', () => {
    expect(totalPointsProjection(60, 40)).toBe(50)
  })

  it('returns 50 when both ratings are 50', () => {
    expect(totalPointsProjection(50, 50)).toBe(50)
  })

  it('reflects typical 40-60 range', () => {
    const result = totalPointsProjection(55, 45)
    expect(result).toBeGreaterThanOrEqual(40)
    expect(result).toBeLessThanOrEqual(60)
  })

  it('returns 0 when both ratings are 0', () => {
    expect(totalPointsProjection(0, 0)).toBe(0)
  })

  it('handles asymmetric ratings', () => {
    // (80 + 20) / 2 = 50
    expect(totalPointsProjection(80, 20)).toBe(50)
  })
})
