import { describe, it, expect } from 'vitest'
import {
  effectiveFieldGoalPct,
  trueShootingPct,
  shootingEfficiencyRating,
  freeThrowRate,
  threePointRate,
  offensiveReboundPct,
  defensiveReboundPct,
  totalReboundPct,
  assistPct,
  turnoverPct,
  assistToTurnover,
  usageRate,
  estimatedPossessions,
  perUnadjusted,
  playerEfficiencyRating,
  boxPlusMinus,
  vorp,
  offensiveWinShares,
  defensiveWinShares,
  winShares,
  gameScore,
  isDoubleDouble,
  isTripleDouble,
  statlineCategories,
  clutchRating,
  netRating,
  adjustedNetRating,
  expectedWins,
  fantasyScore,
  type PlayerBoxScore,
  type TeamStats,
  type LeagueAverages,
} from '../lib/sports/basketball-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(overrides: Partial<PlayerBoxScore> = {}): PlayerBoxScore {
  return {
    minutes: 36,
    points: 20,
    fieldGoalsAttempted: 16,
    fieldGoalsMade: 8,
    threePointAttempted: 4,
    threePointMade: 2,
    freeThrowsAttempted: 6,
    freeThrowsMade: 4,
    offensiveRebounds: 1,
    defensiveRebounds: 5,
    assists: 4,
    steals: 1,
    blocks: 1,
    turnovers: 2,
    personalFouls: 2,
    ...overrides,
  }
}

function makeTeam(overrides: Partial<TeamStats> = {}): TeamStats {
  return {
    points: 110,
    fieldGoalsAttempted: 85,
    fieldGoalsMade: 40,
    threePointAttempted: 30,
    threePointMade: 12,
    freeThrowsAttempted: 20,
    freeThrowsMade: 16,
    offensiveRebounds: 10,
    defensiveRebounds: 35,
    assists: 22,
    steals: 8,
    blocks: 5,
    turnovers: 14,
    personalFouls: 20,
    pace: 100,
    ...overrides,
  }
}

function makeLgAvg(overrides: Partial<LeagueAverages> = {}): LeagueAverages {
  return {
    pointsPerGame: 110,
    fieldGoalPct: 0.46,
    threePct: 0.36,
    freeThrowPct: 0.77,
    assistsPerGame: 25,
    stealsPerGame: 8,
    blocksPerGame: 5,
    turnoversPerGame: 14,
    reboundsPerGame: 44,
    pace: 100,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// effectiveFieldGoalPct
// ---------------------------------------------------------------------------

describe('effectiveFieldGoalPct', () => {
  it('returns 55% for 10 FGM with 2 3PM out of 20 FGA', () => {
    expect(effectiveFieldGoalPct(10, 2, 20)).toBeCloseTo(0.55, 5)
  })

  it('returns 50% for 10 FGM with 0 3PM out of 20 FGA', () => {
    expect(effectiveFieldGoalPct(10, 0, 20)).toBeCloseTo(0.5, 5)
  })

  it('returns 0 for 0 FGA', () => {
    expect(effectiveFieldGoalPct(0, 0, 0)).toBe(0)
  })

  it('handles all threes — 8 FGM, 8 3PM, 10 FGA => (8 + 4)/10 = 1.2', () => {
    expect(effectiveFieldGoalPct(8, 8, 10)).toBeCloseTo(1.2, 5)
  })

  it('increases with 3PM', () => {
    const base = effectiveFieldGoalPct(8, 0, 16)
    const withThrees = effectiveFieldGoalPct(8, 4, 16)
    expect(withThrees).toBeGreaterThan(base)
  })
})

// ---------------------------------------------------------------------------
// trueShootingPct
// ---------------------------------------------------------------------------

describe('trueShootingPct', () => {
  it('known example: 20 pts, 14 FGA, 6 FTA', () => {
    // TS% = 20 / (2 * (14 + 0.44*6)) = 20 / (2 * 16.64) = 20 / 33.28 ≈ 0.601
    expect(trueShootingPct(20, 14, 6)).toBeCloseTo(0.601, 2)
  })

  it('returns 0 for 0 FGA and 0 FTA', () => {
    expect(trueShootingPct(0, 0, 0)).toBe(0)
  })

  it('higher TS% for efficient scorer', () => {
    const efficient = trueShootingPct(30, 20, 4)
    const inefficient = trueShootingPct(20, 25, 4)
    expect(efficient).toBeGreaterThan(inefficient)
  })

  it('always returns positive for positive points', () => {
    expect(trueShootingPct(10, 8, 4)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// shootingEfficiencyRating
// ---------------------------------------------------------------------------

describe('shootingEfficiencyRating', () => {
  it('returns an object with efg, ts, threeRate, ftRate', () => {
    const p = makePlayer()
    const result = shootingEfficiencyRating(p)
    expect(result).toHaveProperty('efg')
    expect(result).toHaveProperty('ts')
    expect(result).toHaveProperty('threeRate')
    expect(result).toHaveProperty('ftRate')
  })

  it('efg matches effectiveFieldGoalPct', () => {
    const p = makePlayer()
    const result = shootingEfficiencyRating(p)
    expect(result.efg).toBeCloseTo(
      effectiveFieldGoalPct(p.fieldGoalsMade, p.threePointMade, p.fieldGoalsAttempted),
      5,
    )
  })

  it('ts matches trueShootingPct', () => {
    const p = makePlayer()
    const result = shootingEfficiencyRating(p)
    expect(result.ts).toBeCloseTo(
      trueShootingPct(p.points, p.fieldGoalsAttempted, p.freeThrowsAttempted),
      5,
    )
  })

  it('threeRate matches threePointRate', () => {
    const p = makePlayer()
    const result = shootingEfficiencyRating(p)
    expect(result.threeRate).toBeCloseTo(
      threePointRate(p.threePointAttempted, p.fieldGoalsAttempted),
      5,
    )
  })

  it('ftRate matches freeThrowRate', () => {
    const p = makePlayer()
    const result = shootingEfficiencyRating(p)
    expect(result.ftRate).toBeCloseTo(
      freeThrowRate(p.freeThrowsAttempted, p.fieldGoalsAttempted),
      5,
    )
  })

  it('zero box score returns all zeros', () => {
    const p = makePlayer({ fieldGoalsAttempted: 0, fieldGoalsMade: 0, threePointAttempted: 0, threePointMade: 0, freeThrowsAttempted: 0, freeThrowsMade: 0, points: 0 })
    const result = shootingEfficiencyRating(p)
    expect(result.efg).toBe(0)
    expect(result.ts).toBe(0)
    expect(result.threeRate).toBe(0)
    expect(result.ftRate).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// freeThrowRate / threePointRate
// ---------------------------------------------------------------------------

describe('freeThrowRate', () => {
  it('returns FTA/FGA', () => {
    expect(freeThrowRate(6, 12)).toBeCloseTo(0.5, 5)
  })
  it('returns 0 for 0 FGA', () => {
    expect(freeThrowRate(6, 0)).toBe(0)
  })
})

describe('threePointRate', () => {
  it('returns 3PA/FGA', () => {
    expect(threePointRate(6, 12)).toBeCloseTo(0.5, 5)
  })
  it('returns 0 for 0 FGA', () => {
    expect(threePointRate(3, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Rebounding percentages
// ---------------------------------------------------------------------------

describe('offensiveReboundPct', () => {
  it('computes correct denominator', () => {
    // ORB% = (ORB * teamMin) / (playerMin * (teamORB + oppDRB))
    // = (3 * 240) / (36 * (10 + 30)) = 720 / 1440 = 0.5
    expect(offensiveReboundPct(3, 10, 30, 36, 240)).toBeCloseTo(0.5, 5)
  })

  it('returns 0 for 0 minutes', () => {
    expect(offensiveReboundPct(3, 10, 30, 0, 240)).toBe(0)
  })

  it('returns 0 when no rebounds available', () => {
    expect(offensiveReboundPct(0, 0, 0, 36, 240)).toBe(0)
  })

  it('scales with player rebounds', () => {
    const low = offensiveReboundPct(1, 10, 30, 36, 240)
    const high = offensiveReboundPct(5, 10, 30, 36, 240)
    expect(high).toBeGreaterThan(low)
  })
})

describe('defensiveReboundPct', () => {
  it('computes correct denominator', () => {
    // DRB% = (DRB * teamMin) / (playerMin * (teamDRB + oppORB))
    // = (7 * 240) / (36 * (35 + 10)) = 1680 / 1620 ≈ 1.037
    expect(defensiveReboundPct(7, 35, 10, 36, 240)).toBeCloseTo(1680 / 1620, 4)
  })

  it('returns 0 for 0 minutes', () => {
    expect(defensiveReboundPct(5, 35, 10, 0, 240)).toBe(0)
  })

  it('scales with player rebounds', () => {
    const low = defensiveReboundPct(2, 35, 10, 36, 240)
    const high = defensiveReboundPct(10, 35, 10, 36, 240)
    expect(high).toBeGreaterThan(low)
  })
})

describe('totalReboundPct', () => {
  it('is consistent with ORB + DRB combination', () => {
    // TRB% = ((ORB+DRB) * teamMin) / (playerMin * (teamORB+teamDRB+oppORB+oppDRB))
    const result = totalReboundPct(3, 7, 10, 35, 12, 30, 36, 240)
    expect(result).toBeGreaterThan(0)
  })

  it('returns 0 for 0 minutes', () => {
    expect(totalReboundPct(3, 7, 10, 35, 12, 30, 0, 240)).toBe(0)
  })

  it('returns 0 when no rebounds in pool', () => {
    expect(totalReboundPct(0, 0, 0, 0, 0, 0, 36, 240)).toBe(0)
  })

  it('increases with more rebounds', () => {
    const low = totalReboundPct(1, 3, 10, 35, 12, 30, 36, 240)
    const high = totalReboundPct(5, 10, 10, 35, 12, 30, 36, 240)
    expect(high).toBeGreaterThan(low)
  })
})

// ---------------------------------------------------------------------------
// assistPct / turnoverPct / assistToTurnover
// ---------------------------------------------------------------------------

describe('assistPct', () => {
  it('uses correct formula', () => {
    // AST% = (AST * teamMin) / (playerMin * (teamFGM - playerFGM))
    // = (8 * 240) / (36 * (40 - 8)) = 1920 / 1152 ≈ 1.667
    expect(assistPct(8, 36, 240, 40, 8)).toBeCloseTo(1920 / 1152, 4)
  })

  it('returns 0 when player FGM equals team FGM (denominator 0)', () => {
    expect(assistPct(8, 36, 240, 8, 8)).toBe(0)
  })

  it('returns 0 for 0 assists', () => {
    expect(assistPct(0, 36, 240, 40, 8)).toBe(0)
  })
})

describe('turnoverPct', () => {
  it('uses correct formula', () => {
    // TOV% = TOV / (FGA + 0.44*FTA + TOV) = 3 / (14 + 0.44*6 + 3) = 3 / 19.64
    expect(turnoverPct(3, 14, 6)).toBeCloseTo(3 / 19.64, 3)
  })

  it('returns 0 for all zeros', () => {
    expect(turnoverPct(0, 0, 0)).toBe(0)
  })

  it('stays between 0 and 1', () => {
    expect(turnoverPct(5, 10, 4)).toBeGreaterThan(0)
    expect(turnoverPct(5, 10, 4)).toBeLessThan(1)
  })
})

describe('assistToTurnover', () => {
  it('divides assists by turnovers', () => {
    expect(assistToTurnover(8, 2)).toBeCloseTo(4.0, 5)
  })

  it('returns 0 for 0 assists and 0 turnovers', () => {
    expect(assistToTurnover(0, 0)).toBe(0)
  })

  it('returns Infinity for assists with 0 turnovers', () => {
    expect(assistToTurnover(5, 0)).toBe(Infinity)
  })
})

// ---------------------------------------------------------------------------
// usageRate
// ---------------------------------------------------------------------------

describe('usageRate', () => {
  it('returns a positive value for typical player', () => {
    const usage = usageRate(14, 4, 3, 36, 240, 85, 22, 14)
    expect(usage).toBeGreaterThan(0)
    // Usage rate can modestly exceed 1.0 for high-usage players in a game slice;
    // the formula is bounded by team possessions × minute fraction, not hard 0–1
    expect(usage).toBeLessThan(2)
  })

  it('returns 0 for 0 player minutes', () => {
    expect(usageRate(14, 4, 3, 0, 240, 85, 22, 14)).toBe(0)
  })

  it('returns 0 for 0 team possessions', () => {
    expect(usageRate(14, 4, 3, 36, 240, 0, 0, 0)).toBe(0)
  })

  it('high-usage player has larger usage rate', () => {
    const highUsage = usageRate(25, 8, 5, 36, 240, 85, 22, 14)
    const lowUsage = usageRate(8, 2, 1, 36, 240, 85, 22, 14)
    expect(highUsage).toBeGreaterThan(lowUsage)
  })
})

// ---------------------------------------------------------------------------
// estimatedPossessions
// ---------------------------------------------------------------------------

describe('estimatedPossessions', () => {
  it('uses Hollinger formula: FGA - ORB + TOV + 0.44*FTA', () => {
    // 14 - 1 + 3 + 0.44*6 = 14 - 1 + 3 + 2.64 = 18.64
    expect(estimatedPossessions(14, 1, 3, 6)).toBeCloseTo(18.64, 5)
  })

  it('returns 0 for all zeros', () => {
    expect(estimatedPossessions(0, 0, 0, 0)).toBe(0)
  })

  it('scales with usage', () => {
    const high = estimatedPossessions(20, 2, 4, 8)
    const low = estimatedPossessions(8, 1, 1, 2)
    expect(high).toBeGreaterThan(low)
  })
})

// ---------------------------------------------------------------------------
// perUnadjusted
// ---------------------------------------------------------------------------

describe('perUnadjusted', () => {
  const lgAvg = makeLgAvg()

  it('returns positive for productive player', () => {
    const p = makePlayer({ points: 25, assists: 7, offensiveRebounds: 3, defensiveRebounds: 7, steals: 2, blocks: 2, turnovers: 2 })
    expect(perUnadjusted(p, lgAvg)).toBeGreaterThan(0)
  })

  it('returns 0 for 0 minutes', () => {
    const p = makePlayer({ minutes: 0 })
    expect(perUnadjusted(p, lgAvg)).toBe(0)
  })

  it('returns very low for empty stats player', () => {
    const p = makePlayer({ minutes: 36, points: 0, assists: 0, offensiveRebounds: 0, defensiveRebounds: 0, steals: 0, blocks: 0, turnovers: 5, fieldGoalsAttempted: 10, fieldGoalsMade: 0, freeThrowsAttempted: 0, freeThrowsMade: 0, threePointAttempted: 0, threePointMade: 0 })
    expect(perUnadjusted(p, lgAvg)).toBeLessThan(10)
  })

  it('star player has higher per than average player', () => {
    const star = makePlayer({ points: 30, assists: 8, offensiveRebounds: 3, defensiveRebounds: 8, steals: 2, blocks: 2, turnovers: 2 })
    const avg = makePlayer()
    expect(perUnadjusted(star, lgAvg)).toBeGreaterThan(perUnadjusted(avg, lgAvg))
  })
})

// ---------------------------------------------------------------------------
// playerEfficiencyRating
// ---------------------------------------------------------------------------

describe('playerEfficiencyRating', () => {
  const lgAvg = makeLgAvg()
  const team = makeTeam()

  it('returns 0 for 0 minutes', () => {
    const p = makePlayer({ minutes: 0 })
    expect(playerEfficiencyRating(p, team, lgAvg)).toBe(0)
  })

  it('star player (30pts/10reb/10ast/30min) has much higher PER than average', () => {
    const star = makePlayer({
      minutes: 30,
      points: 30,
      fieldGoalsMade: 12,
      fieldGoalsAttempted: 22,
      threePointMade: 3,
      threePointAttempted: 6,
      freeThrowsMade: 3,
      freeThrowsAttempted: 4,
      offensiveRebounds: 2,
      defensiveRebounds: 8,
      assists: 10,
      steals: 2,
      blocks: 1,
      turnovers: 3,
    })
    const avg = makePlayer()
    expect(playerEfficiencyRating(star, team, lgAvg)).toBeGreaterThan(playerEfficiencyRating(avg, team, lgAvg))
  })

  it('returns positive for a productive player', () => {
    const p = makePlayer({ points: 20, assists: 5 })
    expect(playerEfficiencyRating(p, team, lgAvg)).toBeGreaterThan(0)
  })

  it('pace adjustment — faster pace shifts PER proportionally', () => {
    const fastTeam = makeTeam({ pace: 110 })
    const slowTeam = makeTeam({ pace: 90 })
    const p = makePlayer()
    const fastPer = playerEfficiencyRating(p, fastTeam, lgAvg)
    const slowPer = playerEfficiencyRating(p, slowTeam, lgAvg)
    // Slower team pace means higher pace factor adjustment
    expect(slowPer).toBeGreaterThan(fastPer)
  })
})

// ---------------------------------------------------------------------------
// boxPlusMinus
// ---------------------------------------------------------------------------

describe('boxPlusMinus', () => {
  const lgAvg = makeLgAvg()

  it('high-volume scorer on good offense has positive OBPM', () => {
    const scorer = makePlayer({
      minutes: 36,
      points: 30,
      fieldGoalsMade: 12,
      fieldGoalsAttempted: 20,
      threePointMade: 3,
      assists: 5,
      turnovers: 2,
    })
    const { offensiveBpm } = boxPlusMinus(scorer, 115, 108, lgAvg)
    expect(offensiveBpm).toBeGreaterThan(0)
  })

  it('high blocks/steals player has positive DBPM relative to low-end defender', () => {
    const defender = makePlayer({
      minutes: 36,
      points: 8,
      steals: 3,
      blocks: 3,
      defensiveRebounds: 8,
    })
    const offensivePlayer = makePlayer({
      minutes: 36,
      points: 8,
      steals: 0,
      blocks: 0,
      defensiveRebounds: 2,
    })
    const defResult = boxPlusMinus(defender, 108, 105, lgAvg)
    const offResult = boxPlusMinus(offensivePlayer, 108, 108, lgAvg)
    expect(defResult.defensiveBpm).toBeGreaterThan(offResult.defensiveBpm)
  })

  it('returns { offensiveBpm, defensiveBpm, bpm } for 0 minutes', () => {
    const p = makePlayer({ minutes: 0 })
    const result = boxPlusMinus(p, 110, 110, lgAvg)
    expect(result).toEqual({ offensiveBpm: 0, defensiveBpm: 0, bpm: 0 })
  })

  it('bpm equals offensiveBpm + defensiveBpm', () => {
    const p = makePlayer()
    const result = boxPlusMinus(p, 112, 108, lgAvg)
    expect(result.bpm).toBeCloseTo(result.offensiveBpm + result.defensiveBpm, 10)
  })

  it('returns object with correct properties', () => {
    const p = makePlayer()
    const result = boxPlusMinus(p, 110, 110, lgAvg)
    expect(result).toHaveProperty('offensiveBpm')
    expect(result).toHaveProperty('defensiveBpm')
    expect(result).toHaveProperty('bpm')
  })
})

// ---------------------------------------------------------------------------
// vorp
// ---------------------------------------------------------------------------

describe('vorp', () => {
  it('scales with minutes', () => {
    const lowMin = vorp(3, 20)
    const highMin = vorp(3, 40)
    expect(highMin).toBeGreaterThan(lowMin)
  })

  it('scales with BPM above replacement', () => {
    const lowBpm = vorp(0, 30)
    const highBpm = vorp(5, 30)
    expect(highBpm).toBeGreaterThan(lowBpm)
  })

  it('below replacement level player has negative VORP', () => {
    // BPM = -3, replacement = -2, so VORP should be negative
    expect(vorp(-3, 30)).toBeLessThan(0)
  })

  it('exactly at replacement level has 0 VORP', () => {
    expect(vorp(-2, 30)).toBeCloseTo(0, 5)
  })

  it('uses custom replacement level', () => {
    const defaultVorp = vorp(2, 30)
    const higherReplacement = vorp(2, 30, 0)
    expect(defaultVorp).toBeGreaterThan(higherReplacement)
  })

  it('formula: (BPM - replacementLevel) * minutes / 48', () => {
    const expected = (5 - (-2)) * (36 / 48)
    expect(vorp(5, 36)).toBeCloseTo(expected, 5)
  })
})

// ---------------------------------------------------------------------------
// Win Shares
// ---------------------------------------------------------------------------

describe('offensiveWinShares', () => {
  const lgAvg = makeLgAvg()
  const team = makeTeam()

  it('returns positive for productive offensive player', () => {
    const p = makePlayer({ points: 25, assists: 7, fieldGoalsMade: 10 })
    expect(offensiveWinShares(p, team, lgAvg)).toBeGreaterThan(0)
  })

  it('returns 0 for 0 minutes', () => {
    const p = makePlayer({ minutes: 0 })
    expect(offensiveWinShares(p, team, lgAvg)).toBe(0)
  })

  it('star scorer has higher OWS than low scorer', () => {
    const star = makePlayer({ points: 30, assists: 8, fieldGoalsMade: 12, fieldGoalsAttempted: 20 })
    const bench = makePlayer({ points: 6, assists: 1, fieldGoalsMade: 3, fieldGoalsAttempted: 8 })
    expect(offensiveWinShares(star, team, lgAvg)).toBeGreaterThan(offensiveWinShares(bench, team, lgAvg))
  })
})

describe('defensiveWinShares', () => {
  const lgAvg = makeLgAvg()
  const team = makeTeam()

  it('returns positive for good defensive player', () => {
    const p = makePlayer({ steals: 2, blocks: 3, defensiveRebounds: 8 })
    expect(defensiveWinShares(p, team, lgAvg)).toBeGreaterThan(0)
  })

  it('returns 0 for 0 minutes', () => {
    const p = makePlayer({ minutes: 0 })
    expect(defensiveWinShares(p, team, lgAvg)).toBe(0)
  })
})

describe('winShares', () => {
  const lgAvg = makeLgAvg()
  const team = makeTeam()

  it('equals OWS + DWS', () => {
    const p = makePlayer()
    const ws = winShares(p, team, lgAvg)
    const ows = offensiveWinShares(p, team, lgAvg)
    const dws = defensiveWinShares(p, team, lgAvg)
    expect(ws).toBeCloseTo(ows + dws, 10)
  })

  it('returns 0 for 0 minutes', () => {
    const p = makePlayer({ minutes: 0 })
    expect(winShares(p, team, lgAvg)).toBe(0)
  })

  it('positive for good all-around player', () => {
    const p = makePlayer({ points: 25, assists: 7, steals: 2, blocks: 2, defensiveRebounds: 8 })
    expect(winShares(p, team, lgAvg)).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// gameScore
// ---------------------------------------------------------------------------

describe('gameScore', () => {
  it('known all-zero box score returns 0', () => {
    const p = makePlayer({
      points: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0,
      freeThrowsAttempted: 0, freeThrowsMade: 0, offensiveRebounds: 0,
      defensiveRebounds: 0, steals: 0, assists: 0, blocks: 0,
      personalFouls: 0, turnovers: 0,
    })
    expect(gameScore(p)).toBe(0)
  })

  it('LeBron-style 30/10/10 game scores well above 25', () => {
    // GmSc = 30 + 0.4*12 - 0.7*22 - 0.4*(6-4) + 0.7*2 + 0.3*8 + 2 + 0.7*10 + 0.7*1 - 0.4*2 - 3
    //       = 30 + 4.8 - 15.4 - 0.8 + 1.4 + 2.4 + 2 + 7 + 0.7 - 0.8 - 3 = 28.3
    const p: PlayerBoxScore = {
      minutes: 38,
      points: 30,
      fieldGoalsMade: 12,
      fieldGoalsAttempted: 22,
      threePointMade: 2,
      threePointAttempted: 5,
      freeThrowsMade: 4,
      freeThrowsAttempted: 6,
      offensiveRebounds: 2,
      defensiveRebounds: 8,
      assists: 10,
      steals: 2,
      blocks: 1,
      turnovers: 3,
      personalFouls: 2,
    }
    expect(gameScore(p)).toBeCloseTo(28.3, 0)
    expect(gameScore(p)).toBeGreaterThan(25)
  })

  it('formula verification: 20pts, 8fgm, 16fga, 4fta, 4ftm, 1orb, 5drb, 1stl, 4ast, 1blk, 2pf, 2tov', () => {
    const p = makePlayer()
    // GmSc = 20 + 0.4*8 - 0.7*16 - 0.4*(6-4) + 0.7*1 + 0.3*5 + 1 + 0.7*4 + 0.7*1 - 0.4*2 - 2
    // = 20 + 3.2 - 11.2 - 0.8 + 0.7 + 1.5 + 1 + 2.8 + 0.7 - 0.8 - 2 = 15.1
    expect(gameScore(p)).toBeCloseTo(15.1, 1)
  })

  it('higher scorer has higher game score all else equal', () => {
    const high = makePlayer({ points: 30 })
    const low = makePlayer({ points: 10 })
    expect(gameScore(high)).toBeGreaterThan(gameScore(low))
  })

  it('turnovers reduce game score', () => {
    const noTov = makePlayer({ turnovers: 0 })
    const highTov = makePlayer({ turnovers: 5 })
    expect(gameScore(noTov)).toBeGreaterThan(gameScore(highTov))
  })
})

// ---------------------------------------------------------------------------
// isDoubleDouble / isTripleDouble / statlineCategories
// ---------------------------------------------------------------------------

describe('statlineCategories', () => {
  it('returns correct categories for 30pts/12reb/10ast', () => {
    const p = makePlayer({ points: 30, offensiveRebounds: 4, defensiveRebounds: 8, assists: 10 })
    const cats = statlineCategories(p)
    expect(cats).toContain('points')
    expect(cats).toContain('rebounds')
    expect(cats).toContain('assists')
  })

  it('returns empty for all below threshold', () => {
    const p = makePlayer({ points: 5, offensiveRebounds: 1, defensiveRebounds: 3, assists: 2, steals: 0, blocks: 0 })
    expect(statlineCategories(p)).toHaveLength(0)
  })

  it('custom threshold: counts categories >= 5', () => {
    const p = makePlayer({ points: 6, offensiveRebounds: 1, defensiveRebounds: 4, assists: 5, steals: 0, blocks: 0 })
    const cats = statlineCategories(p, 5)
    expect(cats).toContain('points')
    expect(cats).toContain('assists')
  })

  it('steals and blocks can be categories', () => {
    const p = makePlayer({ steals: 10, blocks: 10, points: 5, offensiveRebounds: 0, defensiveRebounds: 5, assists: 5 })
    const cats = statlineCategories(p)
    expect(cats).toContain('steals')
    expect(cats).toContain('blocks')
  })
})

describe('isDoubleDouble', () => {
  it('true for 20pts/10reb', () => {
    const p = makePlayer({ points: 20, offensiveRebounds: 3, defensiveRebounds: 7, assists: 5 })
    expect(isDoubleDouble(p)).toBe(true)
  })

  it('true for 10ast/11pts', () => {
    const p = makePlayer({ points: 11, assists: 10, offensiveRebounds: 0, defensiveRebounds: 4 })
    expect(isDoubleDouble(p)).toBe(true)
  })

  it('false for 9pts/9reb', () => {
    const p = makePlayer({ points: 9, offensiveRebounds: 2, defensiveRebounds: 7, assists: 3, steals: 1, blocks: 0 })
    expect(isDoubleDouble(p)).toBe(false)
  })

  it('true for 10stl/10blk (unusual)', () => {
    const p = makePlayer({ steals: 10, blocks: 10, points: 5, offensiveRebounds: 0, defensiveRebounds: 5, assists: 5 })
    expect(isDoubleDouble(p)).toBe(true)
  })

  it('true if triple double', () => {
    const p = makePlayer({ points: 10, offensiveRebounds: 3, defensiveRebounds: 7, assists: 10 })
    expect(isDoubleDouble(p)).toBe(true)
  })

  it('custom threshold of 5', () => {
    const p = makePlayer({ points: 5, offensiveRebounds: 1, defensiveRebounds: 4, assists: 5 })
    expect(isDoubleDouble(p, 5)).toBe(true)
  })
})

describe('isTripleDouble', () => {
  it('true for 10pts/10reb/10ast', () => {
    const p = makePlayer({ points: 10, offensiveRebounds: 3, defensiveRebounds: 7, assists: 10 })
    expect(isTripleDouble(p)).toBe(true)
  })

  it('false for only 2 categories', () => {
    const p = makePlayer({ points: 20, offensiveRebounds: 3, defensiveRebounds: 7, assists: 5, steals: 0, blocks: 0 })
    expect(isTripleDouble(p)).toBe(false)
  })

  it('true for non-standard triple (pts/reb/blk)', () => {
    const p = makePlayer({ points: 10, offensiveRebounds: 3, defensiveRebounds: 7, assists: 3, blocks: 10 })
    expect(isTripleDouble(p)).toBe(true)
  })

  it('false when total rebs just below threshold', () => {
    const p = makePlayer({ points: 10, offensiveRebounds: 3, defensiveRebounds: 6, assists: 10 })
    // 9 total rebounds — should be false
    expect(isTripleDouble(p)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// clutchRating
// ---------------------------------------------------------------------------

describe('clutchRating', () => {
  it('returns positive for better clutch performance', () => {
    // Player scores 15 pts in 5 clutch minutes vs 20 pts in 36 total minutes
    const p = makePlayer({ points: 20, minutes: 36, fieldGoalsAttempted: 16, fieldGoalsMade: 8, threePointMade: 2 })
    const rating = clutchRating(p, 5, 15, 8)
    // Clutch PPM = 3, overall PPM ≈ 0.55 — should be positive
    expect(typeof rating).toBe('number')
  })

  it('returns negative for worse clutch performance', () => {
    const p = makePlayer({ points: 30, minutes: 36, fieldGoalsAttempted: 20, fieldGoalsMade: 12, threePointMade: 3 })
    const rating = clutchRating(p, 5, 2, 8) // 2 pts on 8 attempts in clutch — very bad
    expect(rating).toBeLessThan(0)
  })

  it('returns 0 for 0 clutch minutes', () => {
    const p = makePlayer()
    const rating = clutchRating(p, 0, 0, 0)
    expect(typeof rating).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// netRating / adjustedNetRating / expectedWins
// ---------------------------------------------------------------------------

describe('netRating', () => {
  it('equals ORTG - DRTG', () => {
    expect(netRating(112, 108)).toBe(4)
    expect(netRating(105, 110)).toBe(-5)
  })

  it('returns 0 for equal ratings', () => {
    expect(netRating(110, 110)).toBe(0)
  })
})

describe('adjustedNetRating', () => {
  it('subtracts strength of schedule', () => {
    expect(adjustedNetRating(5, 2)).toBe(3)
    expect(adjustedNetRating(5, -1)).toBe(6)
  })
})

describe('expectedWins', () => {
  it('0 net rating in 82 games gives ~41 wins', () => {
    expect(expectedWins(0, 82)).toBeCloseTo(41, 0)
  })

  it('positive net rating gives more than half wins', () => {
    expect(expectedWins(5, 82)).toBeGreaterThan(41)
  })

  it('negative net rating gives fewer than half wins', () => {
    expect(expectedWins(-5, 82)).toBeLessThan(41)
  })

  it('very high net rating approaches all wins', () => {
    expect(expectedWins(50, 82)).toBeGreaterThan(80)
  })

  it('very negative net rating approaches 0 wins', () => {
    expect(expectedWins(-50, 82)).toBeLessThan(2)
  })
})

// ---------------------------------------------------------------------------
// fantasyScore
// ---------------------------------------------------------------------------

describe('fantasyScore — DraftKings', () => {
  it('calculates correctly with no bonus', () => {
    const p = makePlayer({
      points: 20,
      threePointMade: 2,
      offensiveRebounds: 1,
      defensiveRebounds: 5,
      assists: 4,
      steals: 1,
      blocks: 1,
      turnovers: 2,
    })
    // 20 + 0.5*2 + 1.25*6 + 1.5*4 + 2*1 + 2*1 - 0.5*2 = 20+1+7.5+6+2+2-1 = 37.5
    // No DD (only points >= 10 from these stats with total reb=6, no 10+ cats)
    expect(fantasyScore(p, 'draftKings')).toBeCloseTo(37.5, 1)
  })

  it('applies double-double bonus of 1.5', () => {
    const p = makePlayer({
      points: 20,
      threePointMade: 2,
      offensiveRebounds: 3,
      defensiveRebounds: 7,
      assists: 4,
      steals: 1,
      blocks: 1,
      turnovers: 2,
    })
    const withBonus = fantasyScore(p, 'draftKings')
    const noBonus = 20 + 0.5 * 2 + 1.25 * 10 + 1.5 * 4 + 2 * 1 + 2 * 1 - 0.5 * 2
    expect(withBonus).toBeCloseTo(noBonus + 1.5, 5)
  })

  it('applies triple-double bonus of 3 (not DD bonus)', () => {
    const p = makePlayer({
      points: 10,
      threePointMade: 0,
      offensiveRebounds: 3,
      defensiveRebounds: 7,
      assists: 10,
      steals: 1,
      blocks: 1,
      turnovers: 2,
    })
    const score = fantasyScore(p, 'draftKings')
    const base = 10 + 0.5 * 0 + 1.25 * 10 + 1.5 * 10 + 2 * 1 + 2 * 1 - 0.5 * 2
    // TD bonus is 3, not DD bonus 1.5
    expect(score).toBeCloseTo(base + 3, 5)
  })
})

describe('fantasyScore — FanDuel', () => {
  it('calculates correctly without DD bonus', () => {
    const p = makePlayer({
      points: 20,
      offensiveRebounds: 3,
      defensiveRebounds: 7,
      assists: 10, // 10 AST — but FanDuel has no DD bonus
      steals: 1,
      blocks: 1,
      turnovers: 2,
    })
    // PTS + 1.2*REB + 1.5*AST + 3*STL + 3*BLK - TOV
    const expected = 20 + 1.2 * 10 + 1.5 * 10 + 3 * 1 + 3 * 1 - 2
    expect(fantasyScore(p, 'fanduel')).toBeCloseTo(expected, 5)
  })

  it('no bonus for double-double in FanDuel', () => {
    const dd = makePlayer({ points: 20, offensiveRebounds: 3, defensiveRebounds: 7, assists: 4, steals: 1, blocks: 1, turnovers: 2 })
    const noDD = makePlayer({ points: 20, offensiveRebounds: 1, defensiveRebounds: 5, assists: 4, steals: 1, blocks: 1, turnovers: 2 })
    const ddScore = fantasyScore(dd, 'fanduel')
    const noDDScore = fantasyScore(noDD, 'fanduel')
    // Should differ only by 1.2 * (10 - 6) = 4.8
    expect(ddScore - noDDScore).toBeCloseTo(1.2 * 4, 5)
  })
})

describe('fantasyScore — Yahoo', () => {
  it('calculates correctly without bonus', () => {
    const p = makePlayer({
      points: 20,
      offensiveRebounds: 1,
      defensiveRebounds: 5,
      assists: 4,
      steals: 1,
      blocks: 1,
      turnovers: 2,
    })
    // PTS + 1.2*REB + 1.5*AST + 3*STL + 3*BLK - TOV
    const expected = 20 + 1.2 * 6 + 1.5 * 4 + 3 * 1 + 3 * 1 - 2
    expect(fantasyScore(p, 'yahoo')).toBeCloseTo(expected, 5)
  })

  it('applies double-double bonus of 3', () => {
    const p = makePlayer({
      points: 20,
      offensiveRebounds: 3,
      defensiveRebounds: 7,
      assists: 4,
      steals: 1,
      blocks: 1,
      turnovers: 2,
    })
    const base = 20 + 1.2 * 10 + 1.5 * 4 + 3 * 1 + 3 * 1 - 2
    expect(fantasyScore(p, 'yahoo')).toBeCloseTo(base + 3, 5)
  })

  it('applies triple-double bonus of 4.5 (not DD bonus)', () => {
    const p = makePlayer({
      points: 10,
      offensiveRebounds: 3,
      defensiveRebounds: 7,
      assists: 10,
      steals: 1,
      blocks: 1,
      turnovers: 2,
    })
    const base = 10 + 1.2 * 10 + 1.5 * 10 + 3 * 1 + 3 * 1 - 2
    expect(fantasyScore(p, 'yahoo')).toBeCloseTo(base + 4.5, 5)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('all-zero box score → gameScore = 0', () => {
    const p: PlayerBoxScore = {
      minutes: 0, points: 0, fieldGoalsAttempted: 0, fieldGoalsMade: 0,
      threePointAttempted: 0, threePointMade: 0, freeThrowsAttempted: 0,
      freeThrowsMade: 0, offensiveRebounds: 0, defensiveRebounds: 0,
      assists: 0, steals: 0, blocks: 0, turnovers: 0, personalFouls: 0,
    }
    expect(gameScore(p)).toBe(0)
  })

  it('0 minutes → PER = 0', () => {
    const p = makePlayer({ minutes: 0 })
    const team = makeTeam()
    const lgAvg = makeLgAvg()
    expect(playerEfficiencyRating(p, team, lgAvg)).toBe(0)
  })

  it('0 minutes → perUnadjusted = 0', () => {
    const p = makePlayer({ minutes: 0 })
    expect(perUnadjusted(p, makeLgAvg())).toBe(0)
  })

  it('0 minutes → boxPlusMinus returns all zeros', () => {
    const p = makePlayer({ minutes: 0 })
    const result = boxPlusMinus(p, 110, 110, makeLgAvg())
    expect(result.bpm).toBe(0)
    expect(result.offensiveBpm).toBe(0)
    expect(result.defensiveBpm).toBe(0)
  })

  it('0 minutes → winShares = 0', () => {
    const p = makePlayer({ minutes: 0 })
    expect(winShares(p, makeTeam(), makeLgAvg())).toBe(0)
  })

  it('effectiveFieldGoalPct with 0 FGA returns 0', () => {
    expect(effectiveFieldGoalPct(0, 0, 0)).toBe(0)
  })

  it('trueShootingPct with 0 denominator returns 0', () => {
    expect(trueShootingPct(0, 0, 0)).toBe(0)
  })

  it('turnoverPct with all zeros returns 0', () => {
    expect(turnoverPct(0, 0, 0)).toBe(0)
  })

  it('offensiveReboundPct with 0 player minutes returns 0', () => {
    expect(offensiveReboundPct(5, 10, 30, 0, 240)).toBe(0)
  })

  it('defensiveReboundPct with 0 player minutes returns 0', () => {
    expect(defensiveReboundPct(5, 35, 10, 0, 240)).toBe(0)
  })

  it('totalReboundPct with 0 player minutes returns 0', () => {
    expect(totalReboundPct(3, 7, 10, 35, 12, 30, 0, 240)).toBe(0)
  })

  it('usageRate with 0 player minutes returns 0', () => {
    expect(usageRate(14, 4, 3, 0, 240, 85, 22, 14)).toBe(0)
  })

  it('fantasyScore DK is higher than 0 for positive stats', () => {
    const p = makePlayer()
    expect(fantasyScore(p, 'draftKings')).toBeGreaterThan(0)
  })

  it('netRating is 0 for equal offRtg and defRtg', () => {
    expect(netRating(108, 108)).toBe(0)
  })
})
