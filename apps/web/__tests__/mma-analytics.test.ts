import { describe, it, expect } from 'vitest'
import {
  significantStrikeAccuracy,
  significantStrikesPerMinute,
  totalStrikeAccuracy,
  headStrikeRatio,
  bodyStrikeRatio,
  legStrikeRatio,
  knockdownRate,
  strikeVolume,
  offensiveOutput,
  takedownAccuracy,
  takedownDefensePct,
  controlTimePercentage,
  submissionAttemptRate,
  grapplingScore,
  groundControlRatio,
  distanceTimeRatio,
  clinchTimeRatio,
  groundTimeRatio,
  fighterStyle,
  scoreRound,
  judgeScorecard,
  decisionWinner,
  unanimousDecision,
  winLossRecord,
  winRate,
  finishRate,
  activeStreak,
  averageFightTime,
  knockoutPowerRating,
  strikingAdvantage,
  grapplingAdvantage,
  styleMatchup,
  oddsImpliedProbability,
  weightClassLimit,
  draftKingsMMAScore,
  type StrikingStats,
  type GrapplingStats,
  type FightStats,
  type RoundScore,
  type FighterProfile,
} from '../lib/sports/mma-analytics'

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

function makeStriking(overrides: Partial<StrikingStats> = {}): StrikingStats {
  return {
    significant_strikes_landed: 50,
    significant_strikes_attempted: 100,
    total_strikes_landed: 80,
    total_strikes_attempted: 130,
    head_strikes_landed: 30,
    body_strikes_landed: 12,
    leg_strikes_landed: 8,
    knockdowns: 1,
    ...overrides,
  }
}

function makeGrappling(overrides: Partial<GrapplingStats> = {}): GrapplingStats {
  return {
    takedowns_landed: 3,
    takedowns_attempted: 6,
    takedown_defense: 0.75,
    submissions_attempted: 1,
    control_time: 120,
    reversals: 0,
    ...overrides,
  }
}

function makeFightStats(overrides: Partial<FightStats> = {}): FightStats {
  return {
    fighter: 'Fighter A',
    round: 3,
    striking: makeStriking(),
    grappling: makeGrappling(),
    distance_time: 600,
    clinch_time: 120,
    ground_time: 180,
    ...overrides,
  }
}

function makeProfile(overrides: Partial<FighterProfile> = {}): FighterProfile {
  return {
    name: 'Test Fighter',
    wins: 15,
    losses: 3,
    draws: 1,
    noContests: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Striking analytics
// ---------------------------------------------------------------------------

describe('significantStrikeAccuracy', () => {
  it('returns landed / attempted', () => {
    const stats = makeStriking({ significant_strikes_landed: 50, significant_strikes_attempted: 100 })
    expect(significantStrikeAccuracy(stats)).toBe(0.5)
  })

  it('returns 0 when no attempts', () => {
    const stats = makeStriking({ significant_strikes_landed: 0, significant_strikes_attempted: 0 })
    expect(significantStrikeAccuracy(stats)).toBe(0)
  })

  it('handles perfect accuracy', () => {
    const stats = makeStriking({ significant_strikes_landed: 20, significant_strikes_attempted: 20 })
    expect(significantStrikeAccuracy(stats)).toBe(1)
  })

  it('handles fractional results', () => {
    const stats = makeStriking({ significant_strikes_landed: 1, significant_strikes_attempted: 3 })
    expect(significantStrikeAccuracy(stats)).toBeCloseTo(1 / 3)
  })
})

describe('significantStrikesPerMinute', () => {
  it('divides landed by minutes', () => {
    const stats = makeStriking({ significant_strikes_landed: 30 })
    expect(significantStrikesPerMinute(stats, 5)).toBe(6)
  })

  it('returns 0 for zero minutes', () => {
    const stats = makeStriking({ significant_strikes_landed: 30 })
    expect(significantStrikesPerMinute(stats, 0)).toBe(0)
  })

  it('handles fractional minutes', () => {
    const stats = makeStriking({ significant_strikes_landed: 10 })
    expect(significantStrikesPerMinute(stats, 2.5)).toBe(4)
  })
})

describe('totalStrikeAccuracy', () => {
  it('returns total_landed / total_attempted', () => {
    const stats = makeStriking({ total_strikes_landed: 80, total_strikes_attempted: 130 })
    expect(totalStrikeAccuracy(stats)).toBeCloseTo(80 / 130)
  })

  it('returns 0 when no attempts', () => {
    const stats = makeStriking({ total_strikes_landed: 0, total_strikes_attempted: 0 })
    expect(totalStrikeAccuracy(stats)).toBe(0)
  })
})

describe('headStrikeRatio', () => {
  it('returns head / (head+body+leg)', () => {
    const stats = makeStriking({ head_strikes_landed: 30, body_strikes_landed: 12, leg_strikes_landed: 8 })
    expect(headStrikeRatio(stats)).toBeCloseTo(30 / 50)
  })

  it('returns 0 when all zeros', () => {
    const stats = makeStriking({ head_strikes_landed: 0, body_strikes_landed: 0, leg_strikes_landed: 0 })
    expect(headStrikeRatio(stats)).toBe(0)
  })

  it('returns 1 when only head strikes', () => {
    const stats = makeStriking({ head_strikes_landed: 10, body_strikes_landed: 0, leg_strikes_landed: 0 })
    expect(headStrikeRatio(stats)).toBe(1)
  })
})

describe('bodyStrikeRatio', () => {
  it('returns body / (head+body+leg)', () => {
    const stats = makeStriking({ head_strikes_landed: 30, body_strikes_landed: 12, leg_strikes_landed: 8 })
    expect(bodyStrikeRatio(stats)).toBeCloseTo(12 / 50)
  })

  it('returns 0 when no strikes', () => {
    const stats = makeStriking({ head_strikes_landed: 0, body_strikes_landed: 0, leg_strikes_landed: 0 })
    expect(bodyStrikeRatio(stats)).toBe(0)
  })
})

describe('legStrikeRatio', () => {
  it('returns leg / (head+body+leg)', () => {
    const stats = makeStriking({ head_strikes_landed: 30, body_strikes_landed: 12, leg_strikes_landed: 8 })
    expect(legStrikeRatio(stats)).toBeCloseTo(8 / 50)
  })

  it('ratios sum to 1 when all > 0', () => {
    const stats = makeStriking({ head_strikes_landed: 5, body_strikes_landed: 3, leg_strikes_landed: 2 })
    const total = headStrikeRatio(stats) + bodyStrikeRatio(stats) + legStrikeRatio(stats)
    expect(total).toBeCloseTo(1)
  })
})

describe('knockdownRate', () => {
  it('returns knockdowns / fights', () => {
    const stats = makeStriking({ knockdowns: 3 })
    expect(knockdownRate(stats, 10)).toBeCloseTo(0.3)
  })

  it('returns 0 when fights is 0', () => {
    const stats = makeStriking({ knockdowns: 5 })
    expect(knockdownRate(stats, 0)).toBe(0)
  })

  it('returns 0 when no knockdowns', () => {
    const stats = makeStriking({ knockdowns: 0 })
    expect(knockdownRate(stats, 10)).toBe(0)
  })
})

describe('strikeVolume', () => {
  it('returns per-minute rates for both sig and total', () => {
    const stats = makeStriking({ significant_strikes_landed: 60, total_strikes_landed: 90 })
    const vol = strikeVolume(stats, 10)
    expect(vol.significant).toBe(6)
    expect(vol.total).toBe(9)
  })

  it('returns zeros when minutes is 0', () => {
    const stats = makeStriking()
    const vol = strikeVolume(stats, 0)
    expect(vol.significant).toBe(0)
    expect(vol.total).toBe(0)
  })
})

describe('offensiveOutput', () => {
  it('is slpm × accuracy', () => {
    const stats = makeStriking({ significant_strikes_landed: 50, significant_strikes_attempted: 100 })
    // slpm = 50/10 = 5; accuracy = 0.5; output = 2.5
    expect(offensiveOutput(stats, 10)).toBeCloseTo(2.5)
  })

  it('returns 0 when minutes is 0', () => {
    const stats = makeStriking()
    expect(offensiveOutput(stats, 0)).toBe(0)
  })

  it('returns 0 when accuracy is 0', () => {
    const stats = makeStriking({ significant_strikes_landed: 0, significant_strikes_attempted: 0 })
    expect(offensiveOutput(stats, 5)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Grappling analytics
// ---------------------------------------------------------------------------

describe('takedownAccuracy', () => {
  it('returns landed / attempted', () => {
    const stats = makeGrappling({ takedowns_landed: 3, takedowns_attempted: 6 })
    expect(takedownAccuracy(stats)).toBe(0.5)
  })

  it('returns 0 when no attempts', () => {
    const stats = makeGrappling({ takedowns_landed: 0, takedowns_attempted: 0 })
    expect(takedownAccuracy(stats)).toBe(0)
  })

  it('handles perfect accuracy', () => {
    const stats = makeGrappling({ takedowns_landed: 4, takedowns_attempted: 4 })
    expect(takedownAccuracy(stats)).toBe(1)
  })
})

describe('takedownDefensePct', () => {
  it('returns the raw takedown_defense value', () => {
    const stats = makeGrappling({ takedown_defense: 0.75 })
    expect(takedownDefensePct(stats)).toBe(0.75)
  })

  it('handles 0', () => {
    const stats = makeGrappling({ takedown_defense: 0 })
    expect(takedownDefensePct(stats)).toBe(0)
  })

  it('handles 1', () => {
    const stats = makeGrappling({ takedown_defense: 1 })
    expect(takedownDefensePct(stats)).toBe(1)
  })
})

describe('controlTimePercentage', () => {
  it('returns controlTime / totalSeconds', () => {
    expect(controlTimePercentage(600, 120)).toBe(0.2)
  })

  it('returns 0 when totalSeconds is 0', () => {
    expect(controlTimePercentage(0, 0)).toBe(0)
  })

  it('returns 1 when full control', () => {
    expect(controlTimePercentage(300, 300)).toBe(1)
  })
})

describe('submissionAttemptRate', () => {
  it('returns attempts / fights', () => {
    const stats = makeGrappling({ submissions_attempted: 5 })
    expect(submissionAttemptRate(stats, 10)).toBe(0.5)
  })

  it('returns 0 when fights is 0', () => {
    const stats = makeGrappling({ submissions_attempted: 3 })
    expect(submissionAttemptRate(stats, 0)).toBe(0)
  })
})

describe('grapplingScore', () => {
  it('sums weighted components correctly', () => {
    const stats = makeGrappling({
      takedowns_landed: 5,
      takedowns_attempted: 10, // accuracy = 0.5
      takedown_defense: 0.8,
      control_time: 200,       // 200/1000 = 0.2 control pct
      submissions_attempted: 1,
    })
    const totalSecs = 1000
    // 0.5×0.3 + 0.8×0.3 + 0.2×0.2 + 0.2 = 0.15 + 0.24 + 0.04 + 0.2 = 0.63
    expect(grapplingScore(stats, totalSecs)).toBeCloseTo(0.63)
  })

  it('gives 0.2 sub bonus when submissions > 0', () => {
    const statsNoSub = makeGrappling({ submissions_attempted: 0, takedowns_landed: 0, takedowns_attempted: 0, takedown_defense: 0, control_time: 0 })
    const statsSub = makeGrappling({ submissions_attempted: 1, takedowns_landed: 0, takedowns_attempted: 0, takedown_defense: 0, control_time: 0 })
    expect(grapplingScore(statsSub, 600) - grapplingScore(statsNoSub, 600)).toBeCloseTo(0.2)
  })

  it('returns 0 for all zero stats', () => {
    const stats = makeGrappling({ takedowns_landed: 0, takedowns_attempted: 0, takedown_defense: 0, control_time: 0, submissions_attempted: 0 })
    expect(grapplingScore(stats, 600)).toBe(0)
  })
})

describe('groundControlRatio', () => {
  it('returns control_time / totalFightSeconds', () => {
    const stats = makeGrappling({ control_time: 150 })
    expect(groundControlRatio(stats, 600)).toBeCloseTo(0.25)
  })

  it('returns 0 when totalFightSeconds is 0', () => {
    const stats = makeGrappling({ control_time: 100 })
    expect(groundControlRatio(stats, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Fight position time
// ---------------------------------------------------------------------------

describe('distanceTimeRatio', () => {
  it('returns distance / total', () => {
    const stats = makeFightStats({ distance_time: 600, clinch_time: 120, ground_time: 180 })
    expect(distanceTimeRatio(stats)).toBeCloseTo(600 / 900)
  })

  it('returns 0 when all zero', () => {
    const stats = makeFightStats({ distance_time: 0, clinch_time: 0, ground_time: 0 })
    expect(distanceTimeRatio(stats)).toBe(0)
  })
})

describe('clinchTimeRatio', () => {
  it('returns clinch / total', () => {
    const stats = makeFightStats({ distance_time: 600, clinch_time: 120, ground_time: 180 })
    expect(clinchTimeRatio(stats)).toBeCloseTo(120 / 900)
  })
})

describe('groundTimeRatio', () => {
  it('returns ground / total', () => {
    const stats = makeFightStats({ distance_time: 600, clinch_time: 120, ground_time: 180 })
    expect(groundTimeRatio(stats)).toBeCloseTo(180 / 900)
  })

  it('all three ratios sum to 1', () => {
    const stats = makeFightStats({ distance_time: 300, clinch_time: 200, ground_time: 100 })
    const sum = distanceTimeRatio(stats) + clinchTimeRatio(stats) + groundTimeRatio(stats)
    expect(sum).toBeCloseTo(1)
  })
})

describe('fighterStyle', () => {
  it('returns striker when distanceRatio > 0.6', () => {
    const stats = makeFightStats({
      distance_time: 700,
      clinch_time: 100,
      ground_time: 200,
    })
    expect(fighterStyle(stats)).toBe('striker')
  })

  it('returns wrestler when groundRatio > 0.4 AND takedownAccuracy > 0.5', () => {
    const stats = makeFightStats({
      distance_time: 100,
      clinch_time: 50,
      ground_time: 350, // 350/500 = 0.7 > 0.4
      grappling: makeGrappling({
        takedowns_landed: 6,
        takedowns_attempted: 10, // accuracy = 0.6 > 0.5
        submissions_attempted: 0,
      }),
    })
    expect(fighterStyle(stats)).toBe('wrestler')
  })

  it('returns grappler when groundRatio > 0.4 AND submissions > 0', () => {
    const stats = makeFightStats({
      distance_time: 100,
      clinch_time: 50,
      ground_time: 350,
      grappling: makeGrappling({
        takedowns_landed: 2,
        takedowns_attempted: 10, // accuracy = 0.2, not > 0.5
        submissions_attempted: 3,
      }),
    })
    expect(fighterStyle(stats)).toBe('grappler')
  })

  it('returns all-around otherwise', () => {
    const stats = makeFightStats({
      distance_time: 300,
      clinch_time: 200,
      ground_time: 100, // groundRatio = 0.167, distanceRatio = 0.5
      grappling: makeGrappling({ submissions_attempted: 0, takedowns_landed: 1, takedowns_attempted: 4 }),
    })
    expect(fighterStyle(stats)).toBe('all-around')
  })
})

// ---------------------------------------------------------------------------
// Round scoring
// ---------------------------------------------------------------------------

describe('scoreRound', () => {
  it('gives 10-9 to dominant fighter (more sig strikes)', () => {
    const f1 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const f2 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 10, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const result = scoreRound(f1, f2)
    expect(result.fighter1).toBe(10)
    expect(result.fighter2).toBe(9)
  })

  it('gives 10-8 when dominant fighter has knockdown', () => {
    const f1 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 1 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const f2 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 10, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const result = scoreRound(f1, f2)
    expect(result.fighter1).toBe(10)
    expect(result.fighter2).toBe(8)
  })

  it('gives 9-10 when f2 dominates with knockdown', () => {
    const f1 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 10, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const f2 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 1 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const result = scoreRound(f1, f2)
    expect(result.fighter1).toBe(8)
    expect(result.fighter2).toBe(10)
  })

  it('takedowns weighted by 1.5 can swing the score', () => {
    // f1: 20 sig strikes + 3 tds (3*1.5=4.5) = 24.5
    // f2: 25 sig strikes + 0 tds = 25
    // f2 dominates
    const f1 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 20, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 3, control_time: 0 }),
    })
    const f2 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 25, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const result = scoreRound(f1, f2)
    expect(result.fighter2).toBe(10)
    expect(result.fighter1).toBe(9)
  })

  it('control time factors into scoring at 1/60 per second', () => {
    // f1: 10 sig strikes + 120s control = 10 + 2 = 12
    // f2: 11 sig strikes = 11
    // f1 wins
    const f1 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 10, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 120 }),
    })
    const f2 = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 11, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const result = scoreRound(f1, f2)
    expect(result.fighter1).toBe(10)
    expect(result.fighter2).toBe(9)
  })

  it('gives 10-10 for an even round', () => {
    const f = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 15, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const result = scoreRound(f, { ...f })
    expect(result.fighter1).toBe(10)
    expect(result.fighter2).toBe(10)
  })
})

describe('judgeScorecard', () => {
  it('sums all round scores', () => {
    const f1Dominant = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const f2Weak = makeFightStats({
      striking: makeStriking({ significant_strikes_landed: 5, knockdowns: 0 }),
      grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }),
    })
    const rounds = [
      { f1: f1Dominant, f2: f2Weak },
      { f1: f1Dominant, f2: f2Weak },
      { f1: f1Dominant, f2: f2Weak },
    ]
    const card = judgeScorecard(rounds)
    expect(card.fighter1).toBe(30)
    expect(card.fighter2).toBe(27)
  })

  it('handles split rounds', () => {
    const f1Dominant = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    const f2Dominant = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    // Round where f2 beats f1
    const f1Weak = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 5, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    const rounds = [
      { f1: f1Dominant, f2: f1Weak },
      { f1: f1Weak, f2: f2Dominant },
      { f1: f1Dominant, f2: f1Weak },
    ]
    const card = judgeScorecard(rounds)
    expect(card.fighter1).toBe(29) // 10+9+10
    expect(card.fighter2).toBe(28) // 9+10+9
  })
})

describe('decisionWinner', () => {
  it('returns fighter1 when f1 total is higher', () => {
    const f1Strong = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    const f2Weak = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 5, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    expect(decisionWinner([
      { f1: f1Strong, f2: f2Weak },
      { f1: f1Strong, f2: f2Weak },
      { f1: f1Strong, f2: f2Weak },
    ])).toBe('fighter1')
  })

  it('returns fighter2 when f2 total is higher', () => {
    const f2Strong = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 30, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    const f1Weak = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 5, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    expect(decisionWinner([
      { f1: f1Weak, f2: f2Strong },
      { f1: f1Weak, f2: f2Strong },
      { f1: f1Weak, f2: f2Strong },
    ])).toBe('fighter2')
  })

  it('returns draw on equal totals', () => {
    const even = makeFightStats({ striking: makeStriking({ significant_strikes_landed: 15, knockdowns: 0 }), grappling: makeGrappling({ takedowns_landed: 0, control_time: 0 }) })
    expect(decisionWinner([
      { f1: even, f2: { ...even } },
    ])).toBe('draw')
  })
})

describe('unanimousDecision', () => {
  const allF1: RoundScore[] = [
    { fighter1: 10, fighter2: 9 },
    { fighter1: 10, fighter2: 9 },
    { fighter1: 10, fighter2: 9 },
  ]

  it('returns true when target fighter won all rounds', () => {
    expect(unanimousDecision(allF1, 'fighter1')).toBe(true)
  })

  it('returns false when opponent key checked instead', () => {
    expect(unanimousDecision(allF1, 'fighter2')).toBe(false)
  })

  it('returns false when one round was lost', () => {
    const mixed: RoundScore[] = [
      { fighter1: 10, fighter2: 9 },
      { fighter1: 9, fighter2: 10 },
      { fighter1: 10, fighter2: 9 },
    ]
    expect(unanimousDecision(mixed, 'fighter1')).toBe(false)
  })

  it('returns false on 10-10 even rounds', () => {
    const even: RoundScore[] = [{ fighter1: 10, fighter2: 10 }]
    expect(unanimousDecision(even, 'fighter1')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Career statistics
// ---------------------------------------------------------------------------

describe('winLossRecord', () => {
  it('formats W-L-D', () => {
    const profile = makeProfile({ wins: 15, losses: 3, draws: 1, noContests: 0 })
    expect(winLossRecord(profile)).toBe('15-3-1')
  })

  it('appends -NC when noContests > 0', () => {
    const profile = makeProfile({ wins: 10, losses: 2, draws: 0, noContests: 1 })
    expect(winLossRecord(profile)).toBe('10-2-0-NC')
  })

  it('does not append NC when noContests is 0', () => {
    const profile = makeProfile({ noContests: 0 })
    expect(winLossRecord(profile)).not.toContain('NC')
  })

  it('handles undefeated fighter', () => {
    const profile = makeProfile({ wins: 10, losses: 0, draws: 0, noContests: 0 })
    expect(winLossRecord(profile)).toBe('10-0-0')
  })
})

describe('winRate', () => {
  it('returns wins / (wins + losses)', () => {
    const profile = makeProfile({ wins: 15, losses: 5 })
    expect(winRate(profile)).toBe(0.75)
  })

  it('returns 0 when both wins and losses are 0', () => {
    const profile = makeProfile({ wins: 0, losses: 0 })
    expect(winRate(profile)).toBe(0)
  })

  it('returns 1 for undefeated', () => {
    const profile = makeProfile({ wins: 10, losses: 0 })
    expect(winRate(profile)).toBe(1)
  })
})

describe('finishRate', () => {
  it('returns finishWins / wins', () => {
    expect(finishRate(10, 6)).toBe(0.6)
  })

  it('returns 0 when wins is 0', () => {
    expect(finishRate(0, 0)).toBe(0)
  })

  it('returns 1 when all wins are finishes', () => {
    expect(finishRate(8, 8)).toBe(1)
  })
})

describe('activeStreak', () => {
  it('detects win streak from end', () => {
    const results = ['L', 'W', 'W', 'W'] as const
    const streak = activeStreak([...results])
    expect(streak.type).toBe('W')
    expect(streak.count).toBe(3)
  })

  it('detects loss streak', () => {
    const results = ['W', 'L', 'L'] as const
    const streak = activeStreak([...results])
    expect(streak.type).toBe('L')
    expect(streak.count).toBe(2)
  })

  it('skips NC when counting streak', () => {
    const results = ['L', 'W', 'W', 'NC', 'W'] as const
    const streak = activeStreak([...results])
    expect(streak.type).toBe('W')
    expect(streak.count).toBe(3)
  })

  it('handles all NC returns 0 count', () => {
    const streak = activeStreak(['NC', 'NC'])
    expect(streak.count).toBe(0)
  })

  it('handles single result', () => {
    const streak = activeStreak(['D'])
    expect(streak.type).toBe('D')
    expect(streak.count).toBe(1)
  })

  it('returns 0 for empty array', () => {
    const streak = activeStreak([])
    expect(streak.count).toBe(0)
  })

  it('stops at first different result', () => {
    const results = ['W', 'L', 'W'] as const
    const streak = activeStreak([...results])
    expect(streak.type).toBe('W')
    expect(streak.count).toBe(1)
  })
})

describe('averageFightTime', () => {
  it('calculates average using default 300s rounds', () => {
    // Round 2, 1:30 => 300 + 90 = 390s
    // Round 1, 2:00 => 0 + 120 = 120s
    // average = 255
    const fights = [
      { round: 2, timeStr: '1:30' },
      { round: 1, timeStr: '2:00' },
    ]
    expect(averageFightTime(fights)).toBe(255)
  })

  it('uses custom round length', () => {
    // Round 2 at "0:00" with 240s rounds => 240 + 0 = 240s
    const fights = [{ round: 2, timeStr: '0:00' }]
    expect(averageFightTime(fights, 240)).toBe(240)
  })

  it('handles round 3 at 5:00 with default rounds', () => {
    // 2 complete rounds (600s) + 300s in round 3 = 900s
    const fights = [{ round: 3, timeStr: '5:00' }]
    expect(averageFightTime(fights)).toBe(900)
  })

  it('returns 0 for empty array', () => {
    expect(averageFightTime([])).toBe(0)
  })
})

describe('knockoutPowerRating', () => {
  it('computes (kd/fights) × accuracy × 100', () => {
    // knockdowns=2, fights=10, accuracy=0.5 => (0.2)(0.5)(100) = 10
    const stats = makeStriking({ knockdowns: 2, significant_strikes_landed: 50, significant_strikes_attempted: 100 })
    expect(knockoutPowerRating(stats, 10)).toBeCloseTo(10)
  })

  it('clamps to 0 minimum', () => {
    const stats = makeStriking({ knockdowns: 0 })
    expect(knockoutPowerRating(stats, 10)).toBeGreaterThanOrEqual(0)
  })

  it('clamps to 100 maximum', () => {
    // Extremely high: 1000 knockdowns per 1 fight, 100% accuracy
    const stats = makeStriking({ knockdowns: 1000, significant_strikes_landed: 100, significant_strikes_attempted: 100 })
    expect(knockoutPowerRating(stats, 1)).toBeLessThanOrEqual(100)
  })

  it('returns 0 when no knockdowns', () => {
    const stats = makeStriking({ knockdowns: 0, significant_strikes_landed: 50, significant_strikes_attempted: 100 })
    expect(knockoutPowerRating(stats, 10)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Matchup analytics
// ---------------------------------------------------------------------------

describe('strikingAdvantage', () => {
  it('returns positive when f1 output > f2 output', () => {
    // f1: 60/100 accuracy=0.6, slpm=60/10=6, output=3.6
    // f2: 30/100 accuracy=0.3, slpm=30/10=3, output=0.9
    const f1 = makeStriking({ significant_strikes_landed: 60, significant_strikes_attempted: 100 })
    const f2 = makeStriking({ significant_strikes_landed: 30, significant_strikes_attempted: 100 })
    const adv = strikingAdvantage(f1, f2, 10, 10)
    expect(adv).toBeGreaterThan(0)
  })

  it('returns negative when f2 output > f1 output', () => {
    const f1 = makeStriking({ significant_strikes_landed: 30, significant_strikes_attempted: 100 })
    const f2 = makeStriking({ significant_strikes_landed: 60, significant_strikes_attempted: 100 })
    const adv = strikingAdvantage(f1, f2, 10, 10)
    expect(adv).toBeLessThan(0)
  })

  it('returns 0 for equal fighters', () => {
    const stats = makeStriking({ significant_strikes_landed: 50, significant_strikes_attempted: 100 })
    expect(strikingAdvantage(stats, stats, 10, 10)).toBeCloseTo(0)
  })
})

describe('grapplingAdvantage', () => {
  it('returns f1 accuracy minus f2 defense', () => {
    const f1 = makeGrappling({ takedowns_landed: 7, takedowns_attempted: 10 }) // 0.7
    const f2 = makeGrappling({ takedown_defense: 0.5 })
    expect(grapplingAdvantage(f1, f2)).toBeCloseTo(0.2)
  })

  it('returns negative when f2 defense > f1 accuracy', () => {
    const f1 = makeGrappling({ takedowns_landed: 3, takedowns_attempted: 10 }) // 0.3
    const f2 = makeGrappling({ takedown_defense: 0.9 })
    expect(grapplingAdvantage(f1, f2)).toBeCloseTo(-0.6)
  })
})

describe('styleMatchup', () => {
  it('returns styles and prediction for striker vs wrestler', () => {
    const striker = makeFightStats({ distance_time: 700, clinch_time: 100, ground_time: 100, grappling: makeGrappling({ submissions_attempted: 0 }) })
    const wrestler = makeFightStats({
      distance_time: 100, clinch_time: 50, ground_time: 350,
      grappling: makeGrappling({ takedowns_landed: 6, takedowns_attempted: 10, submissions_attempted: 0 }),
    })
    const result = styleMatchup(striker, wrestler)
    expect(result.f1Style).toBe('striker')
    expect(result.f2Style).toBe('wrestler')
    expect(result.prediction).toBe('grappling-likely')
  })

  it('returns striking-likely for striker vs striker', () => {
    const striker = makeFightStats({ distance_time: 700, clinch_time: 100, ground_time: 100, grappling: makeGrappling({ submissions_attempted: 0 }) })
    const result = styleMatchup(striker, { ...striker, fighter: 'B' })
    expect(result.prediction).toBe('striking-likely')
  })

  it('returns all-around style when applicable', () => {
    const balanced = makeFightStats({
      distance_time: 300, clinch_time: 200, ground_time: 100,
      grappling: makeGrappling({ submissions_attempted: 0, takedowns_landed: 1, takedowns_attempted: 4 }),
    })
    const result = styleMatchup(balanced, { ...balanced, fighter: 'B' })
    expect(result.f1Style).toBe('all-around')
  })
})

describe('oddsImpliedProbability', () => {
  it('handles negative odds (favorite)', () => {
    // -200: 200/300 = 0.6667
    expect(oddsImpliedProbability(-200)).toBeCloseTo(2 / 3)
  })

  it('handles positive odds (underdog)', () => {
    // +200: 100/300 = 0.3333
    expect(oddsImpliedProbability(200)).toBeCloseTo(1 / 3)
  })

  it('handles -110 (standard line)', () => {
    // -110: 110/210 = 0.5238
    expect(oddsImpliedProbability(-110)).toBeCloseTo(110 / 210)
  })

  it('handles +100 (even money)', () => {
    // +100: 100/200 = 0.5
    expect(oddsImpliedProbability(100)).toBeCloseTo(0.5)
  })

  it('handles heavy favorite -500', () => {
    expect(oddsImpliedProbability(-500)).toBeCloseTo(500 / 600)
  })
})

describe('weightClassLimit', () => {
  it('returns 115 for strawweight', () => {
    expect(weightClassLimit('strawweight')).toBe(115)
  })

  it('returns 125 for flyweight', () => {
    expect(weightClassLimit('flyweight')).toBe(125)
  })

  it('returns 135 for bantamweight', () => {
    expect(weightClassLimit('bantamweight')).toBe(135)
  })

  it('returns 145 for featherweight', () => {
    expect(weightClassLimit('featherweight')).toBe(145)
  })

  it('returns 155 for lightweight', () => {
    expect(weightClassLimit('lightweight')).toBe(155)
  })

  it('returns 170 for welterweight', () => {
    expect(weightClassLimit('welterweight')).toBe(170)
  })

  it('returns 185 for middleweight', () => {
    expect(weightClassLimit('middleweight')).toBe(185)
  })

  it('returns 205 for lightheavyweight', () => {
    expect(weightClassLimit('lightheavyweight')).toBe(205)
  })

  it('returns 265 for heavyweight', () => {
    expect(weightClassLimit('heavyweight')).toBe(265)
  })

  it('returns Infinity for superheavyweight', () => {
    expect(weightClassLimit('superheavyweight')).toBe(Infinity)
  })

  it('returns Infinity for unknown weight class', () => {
    expect(weightClassLimit('unknownclass')).toBe(Infinity)
  })

  it('is case-insensitive', () => {
    expect(weightClassLimit('Lightweight')).toBe(155)
    expect(weightClassLimit('HEAVYWEIGHT')).toBe(265)
  })
})

// ---------------------------------------------------------------------------
// DraftKings MMA fantasy scoring
// ---------------------------------------------------------------------------

describe('draftKingsMMAScore', () => {
  it('awards 30 for a win', () => {
    const score = draftKingsMMAScore({
      wins: true,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(30)
  })

  it('awards 0 points for loss with no stats', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(0)
  })

  it('awards 25 bonus for KO/TKO win', () => {
    const score = draftKingsMMAScore({
      wins: true,
      method: 'KO/TKO',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(55) // 30 + 25
  })

  it('awards 20 bonus for Submission win', () => {
    const score = draftKingsMMAScore({
      wins: true,
      method: 'Submission',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(50) // 30 + 20
  })

  it('awards +5 for round 1 finish', () => {
    const score = draftKingsMMAScore({
      wins: true,
      method: 'KO/TKO',
      round: 1,
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(60) // 30 + 25 + 5
  })

  it('awards +3 for round 2 finish', () => {
    const score = draftKingsMMAScore({
      wins: true,
      method: 'Submission',
      round: 2,
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(53) // 30 + 20 + 3
  })

  it('does not apply round bonus for round 3 finish', () => {
    const score = draftKingsMMAScore({
      wins: true,
      method: 'KO/TKO',
      round: 3,
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(55) // 30 + 25
  })

  it('awards 0.3 per sig strike', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 10,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBeCloseTo(3)
  })

  it('awards +5 for sig accuracy >= 60%', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0.6,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(5)
  })

  it('does not award sig accuracy bonus below 60%', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0.59,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(0)
  })

  it('awards 3 per takedown', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 3,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(9)
  })

  it('awards +2 for td accuracy >= 50%', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0.5,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(2)
  })

  it('awards 2 per submission attempt', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 3,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(6)
  })

  it('awards 2 per reversal', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 4,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(score).toBe(8)
  })

  it('awards 5 per knockdown', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 2,
      controlTime: 0,
    })
    expect(score).toBe(10)
  })

  it('awards 0.03 per second of control time', () => {
    const score = draftKingsMMAScore({
      wins: false,
      method: 'Decision',
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 100,
    })
    expect(score).toBeCloseTo(3)
  })

  it('computes a composite high-score correctly', () => {
    // Win(30) + KO/TKO(25) + R1(5) + 20sig(6) + acc60%(5) + 2td(6) + td50%(2) + 1sub(2) + 1kd(5) + 60s ctrl(1.8) = 87.8
    const score = draftKingsMMAScore({
      wins: true,
      method: 'KO/TKO',
      round: 1,
      sigStrikes: 20,
      sigStrikeAccuracy: 0.6,
      takedowns: 2,
      takedownAccuracy: 0.5,
      submissions: 1,
      reversals: 0,
      knockdowns: 1,
      controlTime: 60,
    })
    expect(score).toBeCloseTo(87.8)
  })

  it('does not apply method/round bonus for a loss', () => {
    const scoreLoss = draftKingsMMAScore({
      wins: false,
      method: 'KO/TKO',
      round: 1,
      sigStrikes: 0,
      sigStrikeAccuracy: 0,
      takedowns: 0,
      takedownAccuracy: 0,
      submissions: 0,
      reversals: 0,
      knockdowns: 0,
      controlTime: 0,
    })
    expect(scoreLoss).toBe(0)
  })
})
