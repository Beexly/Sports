import { describe, it, expect } from 'vitest'
import {
  // Strike statistics
  punchAccuracy,
  totalPunchOutput,
  punchesPerRound,
  powerPunchRatio,
  jabAccuracy,
  bodyPunchRatio,
  punchingEfficiency,
  // Physical attributes
  reachAdvantage,
  heightAdvantage,
  weightClassRange,
  weightCutAmount,
  weightCutRisk,
  // Performance ratings
  knockdownRatio,
  koRate,
  stoppageRate,
  decisionRate,
  activityScore,
  aggressivenessRating,
  defensiveRating,
  // KO probability model
  koProbabilityModel,
  earlyKoProbability,
  sustainedPressureKO,
  // Round scoring
  scoreRound,
  scorecardTotal,
  judgeVariance,
  controversialDecision,
  // Historical analysis
  winStreakCurrent,
  lossStreakCurrent,
  formRating,
  opponentStrengthRating,
  // DraftKings fantasy
  dkBoxingPoints,
  dkBoxingProjection,
  // Types
  type WeightClassRange,
  type RoundFighterStats,
  type RoundScoreResult,
  type ScorecardRound,
  type FightResult2,
  type FighterKOProfile,
  type OpponentDurabilityProfile,
  type DKBoxingFight,
} from '@/lib/sports/boxing-analytics'

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

function makeFighter(overrides: Partial<RoundFighterStats> = {}): RoundFighterStats {
  return {
    punches: 30,
    knockdowns: 0,
    aggression: 5,
    defense: 5,
    ...overrides,
  }
}

function makeKOProfile(overrides: Partial<FighterKOProfile> = {}): FighterKOProfile {
  return {
    koRate: 0.5,
    powerPunchLanded: 60,
    knockdownsScored: 5,
    fights: 20,
    ...overrides,
  }
}

function makeOpponent(overrides: Partial<OpponentDurabilityProfile> = {}): OpponentDurabilityProfile {
  return {
    chinDurability: 0.7,
    hasBeenKd: false,
    fights: 15,
    ...overrides,
  }
}

function makeDKFight(overrides: Partial<DKBoxingFight> = {}): DKBoxingFight {
  return {
    outcome: 'UD',
    roundsWon: 8,
    knockdowns: 1,
    totalPunches: 200,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. Strike statistics
// ---------------------------------------------------------------------------

describe('punchAccuracy', () => {
  it('returns landed/thrown ratio', () => {
    expect(punchAccuracy(50, 100)).toBe(0.5)
  })

  it('returns 0 when thrown is 0', () => {
    expect(punchAccuracy(0, 0)).toBe(0)
  })

  it('returns 0 when zero landed and zero thrown', () => {
    expect(punchAccuracy(0, 0)).toBe(0)
  })

  it('returns 1 when all punches land', () => {
    expect(punchAccuracy(100, 100)).toBe(1)
  })

  it('handles partial accuracy', () => {
    expect(punchAccuracy(3, 12)).toBeCloseTo(0.25)
  })
})

describe('totalPunchOutput', () => {
  it('sums jabs, power, body', () => {
    expect(totalPunchOutput(30, 50, 20)).toBe(100)
  })

  it('returns 0 when all inputs are 0', () => {
    expect(totalPunchOutput(0, 0, 0)).toBe(0)
  })

  it('works with only jabs', () => {
    expect(totalPunchOutput(40, 0, 0)).toBe(40)
  })
})

describe('punchesPerRound', () => {
  it('calculates average per round', () => {
    expect(punchesPerRound(120, 12)).toBe(10)
  })

  it('returns 0 when rounds is 0', () => {
    expect(punchesPerRound(100, 0)).toBe(0)
  })

  it('handles fractional result', () => {
    expect(punchesPerRound(100, 3)).toBeCloseTo(33.333)
  })
})

describe('powerPunchRatio', () => {
  it('returns ratio of power to total landed', () => {
    expect(powerPunchRatio(40, 100)).toBe(0.4)
  })

  it('returns 0 when totalLanded is 0', () => {
    expect(powerPunchRatio(0, 0)).toBe(0)
  })

  it('returns 1 when all punches are power', () => {
    expect(powerPunchRatio(80, 80)).toBe(1)
  })
})

describe('jabAccuracy', () => {
  it('returns jab landing ratio', () => {
    expect(jabAccuracy(20, 50)).toBe(0.4)
  })

  it('returns 0 when jabsThrown is 0', () => {
    expect(jabAccuracy(0, 0)).toBe(0)
  })
})

describe('bodyPunchRatio', () => {
  it('returns body ratio', () => {
    expect(bodyPunchRatio(15, 100)).toBe(0.15)
  })

  it('returns 0 when totalLanded is 0', () => {
    expect(bodyPunchRatio(0, 0)).toBe(0)
  })
})

describe('punchingEfficiency', () => {
  it('multiplies accuracy by damage', () => {
    expect(punchingEfficiency(50, 100, 10)).toBe(5)
  })

  it('returns 0 when thrown is 0', () => {
    expect(punchingEfficiency(0, 0, 10)).toBe(0)
  })

  it('handles zero damage score', () => {
    expect(punchingEfficiency(50, 100, 0)).toBe(0)
  })

  it('computes correctly with perfect accuracy', () => {
    expect(punchingEfficiency(100, 100, 8)).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// 2. Physical attributes
// ---------------------------------------------------------------------------

describe('reachAdvantage', () => {
  it('returns positive when fighter has longer reach', () => {
    expect(reachAdvantage(180, 170)).toBe(10)
  })

  it('returns negative when fighter has shorter reach', () => {
    expect(reachAdvantage(170, 180)).toBe(-10)
  })

  it('returns 0 when equal reach', () => {
    expect(reachAdvantage(175, 175)).toBe(0)
  })
})

describe('heightAdvantage', () => {
  it('returns positive when taller', () => {
    expect(heightAdvantage(185, 178)).toBe(7)
  })

  it('returns negative when shorter', () => {
    expect(heightAdvantage(170, 185)).toBe(-15)
  })
})

describe('weightClassRange', () => {
  it('flyweight at exactly 50.8', () => {
    const range = weightClassRange(50.8)
    expect(range.min).toBe(0)
    expect(range.max).toBe(50.8)
  })

  it('bantamweight above flyweight limit', () => {
    const range = weightClassRange(52)
    expect(range.max).toBe(53.5)
    expect(range.min).toBeCloseTo(50.801)
  })

  it('featherweight', () => {
    const range = weightClassRange(55)
    expect(range.max).toBe(57.2)
  })

  it('lightweight', () => {
    const range = weightClassRange(60)
    expect(range.max).toBe(61.2)
  })

  it('welterweight', () => {
    const range = weightClassRange(65)
    expect(range.max).toBe(66.7)
  })

  it('middleweight', () => {
    const range = weightClassRange(70)
    expect(range.max).toBe(72.6)
  })

  it('light heavyweight', () => {
    const range = weightClassRange(75)
    expect(range.max).toBe(79.4)
  })

  it('cruiserweight', () => {
    const range = weightClassRange(85)
    expect(range.max).toBe(90.7)
  })

  it('heavyweight above 90.7', () => {
    const range = weightClassRange(100)
    expect(range.min).toBeCloseTo(90.701)
    expect(range.max).toBe(Infinity)
  })

  it('exact boundary: 90.7 is cruiserweight', () => {
    const range = weightClassRange(90.7)
    expect(range.max).toBe(90.7)
  })

  it('above 90.7 is heavyweight', () => {
    const range = weightClassRange(90.701)
    expect(range.max).toBe(Infinity)
  })
})

describe('weightCutAmount', () => {
  it('positive when cutting weight', () => {
    expect(weightCutAmount(66.7, 72)).toBeCloseTo(5.3)
  })

  it('0 when fighting at walkaround weight', () => {
    expect(weightCutAmount(70, 70)).toBe(0)
  })

  it('negative when gaining weight (bulking up)', () => {
    expect(weightCutAmount(70, 65)).toBe(-5)
  })
})

describe('weightCutRisk', () => {
  it('safe under 3kg', () => {
    expect(weightCutRisk(2)).toBe('safe')
    expect(weightCutRisk(2.9)).toBe('safe')
  })

  it('moderate between 3 and 5 inclusive', () => {
    expect(weightCutRisk(3)).toBe('moderate')
    expect(weightCutRisk(5)).toBe('moderate')
    expect(weightCutRisk(4)).toBe('moderate')
  })

  it('dangerous above 5', () => {
    expect(weightCutRisk(5.1)).toBe('dangerous')
    expect(weightCutRisk(10)).toBe('dangerous')
  })
})

// ---------------------------------------------------------------------------
// 3. Performance ratings
// ---------------------------------------------------------------------------

describe('knockdownRatio', () => {
  it('returns knockdowns per round', () => {
    expect(knockdownRatio(3, 10)).toBe(0.3)
  })

  it('returns 0 when no rounds fought', () => {
    expect(knockdownRatio(5, 0)).toBe(0)
  })

  it('returns 0 when no knockdowns', () => {
    expect(knockdownRatio(0, 12)).toBe(0)
  })
})

describe('koRate', () => {
  it('returns KO ratio', () => {
    expect(koRate(10, 20)).toBe(0.5)
  })

  it('returns 0 when no fights', () => {
    expect(koRate(0, 0)).toBe(0)
  })

  it('returns 1 with all KOs', () => {
    expect(koRate(5, 5)).toBe(1)
  })
})

describe('stoppageRate', () => {
  it('returns stoppage ratio', () => {
    expect(stoppageRate(15, 30)).toBe(0.5)
  })

  it('returns 0 when no fights', () => {
    expect(stoppageRate(0, 0)).toBe(0)
  })
})

describe('decisionRate', () => {
  it('returns decision ratio', () => {
    expect(decisionRate(8, 20)).toBe(0.4)
  })

  it('returns 0 when no fights', () => {
    expect(decisionRate(0, 0)).toBe(0)
  })
})

describe('activityScore', () => {
  it('computes correctly with punches and knockdowns', () => {
    // (100/10) * 0.7 + 2 * 5 = 7 + 10 = 17
    expect(activityScore(100, 10, 2)).toBeCloseTo(17)
  })

  it('returns 0 when rounds is 0', () => {
    expect(activityScore(100, 0, 5)).toBe(0)
  })

  it('works with zero knockdowns', () => {
    expect(activityScore(70, 10, 0)).toBeCloseTo(4.9)
  })
})

describe('aggressivenessRating', () => {
  it('computes correctly', () => {
    // (10 * 2 + 50 * 0.1) / (5 + 1) = (20 + 5) / 6 ≈ 4.167
    expect(aggressivenessRating(10, 5, 50)).toBeCloseTo(4.167)
  })

  it('handles zero clinches (denominator becomes 1)', () => {
    // (5 * 2 + 0 * 0.1) / (0 + 1) = 10
    expect(aggressivenessRating(5, 0, 0)).toBe(10)
  })

  it('returns 0 when all inputs are 0', () => {
    expect(aggressivenessRating(0, 0, 0)).toBe(0)
  })
})

describe('defensiveRating', () => {
  it('computes correctly without knockdowns', () => {
    // 100 * (1 - 30/100) - 0 * 10 = 70
    expect(defensiveRating(30, 100, 0)).toBeCloseTo(70)
  })

  it('deducts 10 per knockdown suffered', () => {
    // 100 * (1 - 30/100) - 2 * 10 = 70 - 20 = 50
    expect(defensiveRating(30, 100, 2)).toBeCloseTo(50)
  })

  it('clamps at 0', () => {
    expect(defensiveRating(200, 100, 5)).toBe(0)
  })

  it('clamps at 100', () => {
    expect(defensiveRating(0, 100, 0)).toBe(100)
  })

  it('uses max(punchesThrown, 1) when punchesThrown is 0', () => {
    // 100 * (1 - 0/1) - 0 = 100
    expect(defensiveRating(0, 0, 0)).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 4. KO probability model
// ---------------------------------------------------------------------------

describe('koProbabilityModel', () => {
  it('computes base probability', () => {
    const fighter = makeKOProfile({ koRate: 0.5, powerPunchLanded: 60, knockdownsScored: 5, fights: 20 })
    const opponent = makeOpponent({ chinDurability: 0.5 })
    // 0.5*0.5 + (60/100)*0.3 + (5/20)*0.2 = 0.25 + 0.18 + 0.05 = 0.48
    const p = koProbabilityModel(fighter, opponent)
    expect(p).toBeCloseTo(0.48)
  })

  it('adjusts down when chin durability > 0.8', () => {
    const fighter = makeKOProfile({ koRate: 0.5, powerPunchLanded: 60, knockdownsScored: 5, fights: 20 })
    const opponent = makeOpponent({ chinDurability: 0.9 })
    const p = koProbabilityModel(fighter, opponent)
    // base = 0.48, adjust * (1 - 0.1) = 0.432
    expect(p).toBeCloseTo(0.432)
  })

  it('clamps at 0', () => {
    const fighter = makeKOProfile({ koRate: 0, powerPunchLanded: 0, knockdownsScored: 0, fights: 10 })
    const opponent = makeOpponent({ chinDurability: 1 })
    expect(koProbabilityModel(fighter, opponent)).toBeGreaterThanOrEqual(0)
    expect(koProbabilityModel(fighter, opponent)).toBeLessThanOrEqual(1)
  })

  it('clamps at 1 for very high KO profile', () => {
    const fighter = makeKOProfile({ koRate: 1, powerPunchLanded: 200, knockdownsScored: 20, fights: 10 })
    const opponent = makeOpponent({ chinDurability: 0.1 })
    expect(koProbabilityModel(fighter, opponent)).toBe(1)
  })

  it('handles fights=0 without division by zero', () => {
    const fighter = makeKOProfile({ koRate: 0.5, powerPunchLanded: 50, knockdownsScored: 0, fights: 0 })
    const opponent = makeOpponent()
    expect(() => koProbabilityModel(fighter, opponent)).not.toThrow()
  })
})

describe('earlyKoProbability', () => {
  it('returns proportion of early KOs', () => {
    expect(earlyKoProbability(0.8, 0.4)).toBe(0.5)
  })

  it('returns 0 when koRate is 0', () => {
    expect(earlyKoProbability(0, 0)).toBe(0)
  })

  it('returns 1 when all KOs are early', () => {
    expect(earlyKoProbability(0.5, 0.5)).toBe(1)
  })
})

describe('sustainedPressureKO', () => {
  it('computes late stoppage probability', () => {
    // 0.6 * (1 - 0.7) / (5 + 1) = 0.6 * 0.3 / 6 = 0.03
    expect(sustainedPressureKO(5, 0.6, 0.7)).toBeCloseTo(0.03)
  })

  it('clamps at 0', () => {
    expect(sustainedPressureKO(10, 0, 1)).toBe(0)
  })

  it('clamps at 1 for extreme values', () => {
    expect(sustainedPressureKO(0, 100, 0)).toBe(1)
  })

  it('rounds 0 create denominator 1', () => {
    // 1.0 * (1 - 0) / (0 + 1) = 1.0
    expect(sustainedPressureKO(0, 1, 0)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 5. Round scoring (10-point must)
// ---------------------------------------------------------------------------

describe('scoreRound', () => {
  it('fighter 1 wins a clear round 10-9', () => {
    const f1 = makeFighter({ punches: 60, knockdowns: 0, aggression: 8, defense: 7 })
    const f2 = makeFighter({ punches: 30, knockdowns: 0, aggression: 3, defense: 3 })
    const result = scoreRound(f1, f2)
    expect(result.winner).toBe(1)
    expect(result.scores[0]).toBe(10)
    expect(result.scores[1]).toBe(9)
  })

  it('fighter 2 wins a clear round 10-9', () => {
    const f1 = makeFighter({ punches: 20, knockdowns: 0, aggression: 2, defense: 2 })
    const f2 = makeFighter({ punches: 70, knockdowns: 0, aggression: 9, defense: 8 })
    const result = scoreRound(f1, f2)
    expect(result.winner).toBe(2)
    expect(result.scores[1]).toBe(10)
    expect(result.scores[0]).toBe(9)
  })

  it('exactly equal round scores 10-10', () => {
    const f1 = makeFighter({ punches: 30, knockdowns: 0, aggression: 5, defense: 5 })
    const f2 = makeFighter({ punches: 30, knockdowns: 0, aggression: 5, defense: 5 })
    const result = scoreRound(f1, f2)
    expect(result.winner).toBe('even')
    expect(result.scores).toEqual([10, 10])
  })

  it('knockdown gives 10-8', () => {
    const f1 = makeFighter({ punches: 40, knockdowns: 1, aggression: 5, defense: 5 })
    const f2 = makeFighter({ punches: 20, knockdowns: 0, aggression: 3, defense: 3 })
    const result = scoreRound(f1, f2)
    expect(result.winner).toBe(1)
    expect(result.scores[0]).toBe(10)
    expect(result.scores[1]).toBe(8)
  })

  it('two knockdowns give 10-7 (base 9 - 2 net KDs)', () => {
    const f1 = makeFighter({ punches: 40, knockdowns: 2, aggression: 5, defense: 5 })
    const f2 = makeFighter({ punches: 10, knockdowns: 0, aggression: 2, defense: 2 })
    const result = scoreRound(f1, f2)
    expect(result.winner).toBe(1)
    expect(result.scores[0]).toBe(10)
    // base 9 - 2 net KDs = 7 (also the floor)
    expect(result.scores[1]).toBe(7)
  })

  it('three knockdowns floor at 7', () => {
    const f1 = makeFighter({ punches: 50, knockdowns: 3, aggression: 8, defense: 8 })
    const f2 = makeFighter({ punches: 5, knockdowns: 0, aggression: 1, defense: 1 })
    const result = scoreRound(f1, f2)
    expect(result.winner).toBe(1)
    expect(result.scores[1]).toBeGreaterThanOrEqual(7)
  })
})

describe('scorecardTotal', () => {
  it('sums all rounds correctly', () => {
    const rounds: ScorecardRound[] = [
      { scores: [10, 9] },
      { scores: [9, 10] },
      { scores: [10, 9] },
    ]
    const result = scorecardTotal(rounds)
    expect(result.total).toEqual([29, 28])
    expect(result.winner).toBe(1)
  })

  it('fighter 2 wins scorecard', () => {
    const rounds: ScorecardRound[] = [
      { scores: [9, 10] },
      { scores: [9, 10] },
      { scores: [9, 10] },
    ]
    const result = scorecardTotal(rounds)
    expect(result.winner).toBe(2)
    expect(result.total).toEqual([27, 30])
  })

  it('draw when totals are equal', () => {
    const rounds: ScorecardRound[] = [
      { scores: [10, 9] },
      { scores: [9, 10] },
    ]
    const result = scorecardTotal(rounds)
    expect(result.winner).toBe('draw')
    expect(result.total).toEqual([19, 19])
  })

  it('clean sweep for fighter 1', () => {
    const rounds: ScorecardRound[] = Array(12).fill({ scores: [10, 9] })
    const result = scorecardTotal(rounds)
    expect(result.winner).toBe(1)
    expect(result.total).toEqual([120, 108])
  })

  it('handles empty rounds', () => {
    const result = scorecardTotal([])
    expect(result.total).toEqual([0, 0])
    expect(result.winner).toBe('draw')
  })
})

describe('judgeVariance', () => {
  it('returns 0 with fewer than 2 judges', () => {
    expect(judgeVariance([[10, 9, 10]])).toBe(0)
    expect(judgeVariance([])).toBe(0)
  })

  it('returns 0 when judges agree exactly', () => {
    const judges = [[10, 9, 10], [10, 9, 10], [10, 9, 10]]
    expect(judgeVariance(judges)).toBe(0)
  })

  it('returns positive variance when judges differ', () => {
    const judges = [[10, 9, 10], [9, 10, 9]]
    expect(judgeVariance(judges)).toBeGreaterThan(0)
  })

  it('computes variance between 2 judges', () => {
    // judge1: [10, 10] judge2: [8, 9] — diffs: 2 + 1 = 3
    const judges = [[10, 10], [8, 9]]
    expect(judgeVariance(judges)).toBeCloseTo(3)
  })
})

describe('controversialDecision', () => {
  it('returns false with unanimous scoring', () => {
    // All judges have net positive (fighter1 ahead)
    const judges = [[10, 9, 10], [10, 9, 10], [10, 9, 10]]
    expect(controversialDecision(judges)).toBe(false)
  })

  it('returns true when one judge scores against majority', () => {
    // 2 judges: fighter1 total positive, 1: fighter2 (negative total)
    const judges = [[1], [1], [-1]]
    expect(controversialDecision(judges)).toBe(true)
  })

  it('returns false with fewer than 2 judges', () => {
    expect(controversialDecision([[10, 9]])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 6. Historical analysis
// ---------------------------------------------------------------------------

describe('winStreakCurrent', () => {
  it('counts consecutive wins from most recent', () => {
    expect(winStreakCurrent(['L', 'W', 'W', 'W'])).toBe(3)
  })

  it('returns 0 when latest is not a win', () => {
    expect(winStreakCurrent(['W', 'W', 'L'])).toBe(0)
  })

  it('returns 0 for empty results', () => {
    expect(winStreakCurrent([])).toBe(0)
  })

  it('returns total length when all wins', () => {
    expect(winStreakCurrent(['W', 'W', 'W', 'W'])).toBe(4)
  })

  it('stops at draw', () => {
    expect(winStreakCurrent(['W', 'D', 'W', 'W'])).toBe(2)
  })
})

describe('lossStreakCurrent', () => {
  it('counts consecutive losses from most recent', () => {
    expect(lossStreakCurrent(['W', 'L', 'L', 'L'])).toBe(3)
  })

  it('returns 0 when latest is not a loss', () => {
    expect(lossStreakCurrent(['L', 'W'])).toBe(0)
  })

  it('returns 0 for empty', () => {
    expect(lossStreakCurrent([])).toBe(0)
  })

  it('stops at win', () => {
    expect(lossStreakCurrent(['L', 'W', 'L'])).toBe(1)
  })
})

describe('formRating', () => {
  it('returns 0 for empty results', () => {
    expect(formRating([])).toBe(0)
  })

  it('returns 1 for all wins', () => {
    expect(formRating(['W', 'W', 'W'])).toBe(1)
  })

  it('returns 0 for all losses', () => {
    expect(formRating(['L', 'L', 'L'])).toBe(0)
  })

  it('returns 0.5 for all draws', () => {
    expect(formRating(['D', 'D', 'D'])).toBe(0.5)
  })

  it('weights most recent higher when weights provided', () => {
    // Latest (W) has weight 3, older (L) has weight 1
    // W=1, L=0 → (1*3 + 0*1) / 4 = 0.75
    const rating = formRating(['L', 'W'], [3, 1])
    expect(rating).toBeCloseTo(0.75)
  })

  it('handles NC as 0.5', () => {
    expect(formRating(['NC'])).toBe(0.5)
  })

  it('mixed results with equal weights', () => {
    // W=1, L=0, D=0.5 → (1 + 0 + 0.5) / 3 ≈ 0.5
    expect(formRating(['W', 'L', 'D'])).toBeCloseTo(0.5)
  })

  it('single W returns 1', () => {
    expect(formRating(['W'])).toBe(1)
  })
})

describe('opponentStrengthRating', () => {
  it('returns 0 for empty records', () => {
    expect(opponentStrengthRating([])).toBe(0)
  })

  it('averages win percentages', () => {
    // opp1: 10/20=0.5, opp2: 15/20=0.75 → avg = 0.625
    const rating = opponentStrengthRating([
      { wins: 10, losses: 10 },
      { wins: 15, losses: 5 },
    ])
    expect(rating).toBeCloseTo(0.625)
  })

  it('handles opponent with no fights (0/0)', () => {
    const rating = opponentStrengthRating([{ wins: 0, losses: 0 }])
    expect(rating).toBe(0)
  })

  it('handles perfect record opponents', () => {
    const rating = opponentStrengthRating([{ wins: 20, losses: 0 }])
    expect(rating).toBe(1)
  })

  it('handles single opponent', () => {
    const rating = opponentStrengthRating([{ wins: 3, losses: 7 }])
    expect(rating).toBe(0.3)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy
// ---------------------------------------------------------------------------

describe('dkBoxingPoints', () => {
  it('KO win = 100 base', () => {
    const result = dkBoxingPoints({ outcome: 'KO', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(100)
  })

  it('TKO win = 90 base', () => {
    const result = dkBoxingPoints({ outcome: 'TKO', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(90)
  })

  it('UD win = 70 base', () => {
    const result = dkBoxingPoints({ outcome: 'UD', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(70)
  })

  it('MD win = 67 base', () => {
    const result = dkBoxingPoints({ outcome: 'MD', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(67)
  })

  it('SD win = 65 base', () => {
    const result = dkBoxingPoints({ outcome: 'SD', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(65)
  })

  it('DQ win = 50 base', () => {
    const result = dkBoxingPoints({ outcome: 'DQ', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(50)
  })

  it('loss = 0', () => {
    const result = dkBoxingPoints({ outcome: 'loss', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(0)
  })

  it('NC = 0', () => {
    const result = dkBoxingPoints({ outcome: 'NC', roundsWon: 0, knockdowns: 0, totalPunches: 0 })
    expect(result).toBe(0)
  })

  it('adds +5 per knockdown', () => {
    const result = dkBoxingPoints({ outcome: 'UD', roundsWon: 0, knockdowns: 3, totalPunches: 0 })
    expect(result).toBe(70 + 15)
  })

  it('adds +0.1 per punch up to 200 punches (20 bonus cap)', () => {
    const result = dkBoxingPoints({ outcome: 'UD', roundsWon: 0, knockdowns: 0, totalPunches: 200 })
    expect(result).toBe(70 + 20)
  })

  it('caps punch bonus at 20', () => {
    const result = dkBoxingPoints({ outcome: 'UD', roundsWon: 0, knockdowns: 0, totalPunches: 500 })
    expect(result).toBe(70 + 20)
  })

  it('combines knockdown bonus and punch bonus', () => {
    // KO + 2 KD + 100 punches = 100 + 10 + 10 = 120
    const result = dkBoxingPoints({ outcome: 'KO', roundsWon: 0, knockdowns: 2, totalPunches: 100 })
    expect(result).toBe(120)
  })

  it('partial punch bonus below cap', () => {
    // UD + 0 KD + 50 punches = 70 + 0 + 5 = 75
    const result = dkBoxingPoints({ outcome: 'UD', roundsWon: 0, knockdowns: 0, totalPunches: 50 })
    expect(result).toBe(75)
  })
})

describe('dkBoxingProjection', () => {
  it('returns 0 for empty fights', () => {
    expect(dkBoxingProjection([])).toBe(0)
  })

  it('returns base points for single fight (most recent = 3x, total weight 3)', () => {
    // Single fight: KO = 100. Weight = 3. Total weight = 3. Avg = 100.
    const result = dkBoxingProjection([{ outcome: 'KO', roundsWon: 0, knockdowns: 0, totalPunches: 0 }])
    expect(result).toBe(100)
  })

  it('weights most recent 3x, others 1x', () => {
    // Fight 1 (oldest): UD = 70 (weight 1)
    // Fight 2 (most recent): KO = 100 (weight 3)
    // Weighted avg = (70*1 + 100*3) / (1 + 3) = (70 + 300) / 4 = 92.5
    const fights: DKBoxingFight[] = [
      { outcome: 'UD', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
      { outcome: 'KO', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
    ]
    expect(dkBoxingProjection(fights)).toBeCloseTo(92.5)
  })

  it('handles all losses', () => {
    const fights: DKBoxingFight[] = [
      { outcome: 'loss', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
      { outcome: 'loss', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
      { outcome: 'loss', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
    ]
    expect(dkBoxingProjection(fights)).toBe(0)
  })

  it('three fights: most recent weighted 3x', () => {
    // Fight 1: loss=0, Fight 2: UD=70, Fight 3 (most recent): KO=100
    // Weights in reversed order: 3 (KO), 1 (UD), 1 (loss)
    // = (100*3 + 70*1 + 0*1) / (3 + 1 + 1) = (300 + 70 + 0) / 5 = 74
    const fights: DKBoxingFight[] = [
      { outcome: 'loss', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
      { outcome: 'UD', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
      { outcome: 'KO', roundsWon: 0, knockdowns: 0, totalPunches: 0 },
    ]
    expect(dkBoxingProjection(fights)).toBeCloseTo(74)
  })

  it('includes knockdown and punch bonuses in projection', () => {
    // UD with 2 KD and 100 punches = 70 + 10 + 10 = 90
    // Single fight: projection = 90
    const fights: DKBoxingFight[] = [
      { outcome: 'UD', roundsWon: 0, knockdowns: 2, totalPunches: 100 },
    ]
    expect(dkBoxingProjection(fights)).toBe(90)
  })
})
