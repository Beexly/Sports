/**
 * Tests for pace-analytics.ts
 *
 * Covers: possession estimation, pace, ratings, four factors, shot quality,
 * offensive breakdown, pace classification, efficiency comparison, and more.
 */

import { describe, it, expect } from 'vitest'
import {
  estimatePossessions,
  gamePossessions,
  pace,
  ortg,
  drtg,
  netRtg,
  computePaceMetrics,
  computeFourFactors,
  compareEfficiency,
  trueShooting,
  astToRatio,
  usageRate,
  boxScoreComponents,
  shotQualityBreakdown,
  offensiveBreakdown,
  paceClassification,
  expectedPPP,
  adjustedOrtg,
  floorPct,
  secondChanceRate,
  transitionRate,
} from '@/lib/sports/pace-analytics'
import type { NbaBoxScore, NbaPossessions, ShotQuality } from '@/lib/sports/pace-analytics'

// ── Helper ────────────────────────────────────────────────────────────────

function makeBox(overrides: Partial<NbaBoxScore> = {}): NbaBoxScore {
  return {
    teamId: 'TEAM',
    pts: 110,
    fgm: 42,
    fga: 88,
    fg3m: 12,
    fg3a: 30,
    ftm: 14,
    fta: 18,
    oreb: 10,
    dreb: 32,
    ast: 25,
    to: 13,
    stl: 7,
    blk: 4,
    pf: 19,
    minutes: 240,
    ...overrides,
  }
}

function makePoss(overrides: Partial<NbaPossessions> = {}): NbaPossessions {
  return {
    fga: 88,
    fta: 18,
    fgm: 42,
    oreb: 10,
    to: 13,
    ...overrides,
  }
}

// ── estimatePossessions ───────────────────────────────────────────────────

describe('estimatePossessions', () => {
  it('uses the Dean Oliver formula: FGA - OREB + TO + 0.44 * FTA', () => {
    const stats = makePoss({ fga: 80, oreb: 10, to: 12, fta: 20 })
    // 80 - 10 + 12 + 0.44 * 20 = 80 - 10 + 12 + 8.8 = 90.8
    expect(estimatePossessions(stats)).toBeCloseTo(90.8, 5)
  })

  it('returns 0 when all stats are 0', () => {
    expect(estimatePossessions({ fga: 0, fta: 0, fgm: 0, oreb: 0, to: 0 })).toBe(0)
  })

  it('increases with more turnovers', () => {
    const base = makePoss({ to: 10 })
    const more = makePoss({ to: 15 })
    expect(estimatePossessions(more)).toBeGreaterThan(estimatePossessions(base))
  })

  it('decreases with more offensive rebounds', () => {
    const base = makePoss({ oreb: 5 })
    const more = makePoss({ oreb: 15 })
    expect(estimatePossessions(more)).toBeLessThan(estimatePossessions(base))
  })

  it('handles typical NBA game totals accurately', () => {
    // Typical team: 88 FGA, 20 FTA, 10 OREB, 13 TO
    // 88 - 10 + 13 + 0.44*20 = 99.8
    const result = estimatePossessions(makePoss({ fga: 88, fta: 20, oreb: 10, to: 13 }))
    expect(result).toBeCloseTo(99.8, 5)
  })

  it('FTA contributes 0.44 per attempt', () => {
    const base = estimatePossessions(makePoss({ fta: 0 }))
    const withFta = estimatePossessions(makePoss({ fta: 10 }))
    expect(withFta - base).toBeCloseTo(4.4, 5)
  })
})

// ── gamePossessions ───────────────────────────────────────────────────────

describe('gamePossessions', () => {
  it('averages both team estimates', () => {
    const home = makePoss({ fga: 80, oreb: 10, to: 12, fta: 20 })
    const away = makePoss({ fga: 85, oreb: 8, to: 14, fta: 16 })
    const homePoss = estimatePossessions(home)
    const awayPoss = estimatePossessions(away)
    expect(gamePossessions(home, away)).toBeCloseTo((homePoss + awayPoss) / 2, 5)
  })

  it('returns same as estimatePossessions when both teams are identical', () => {
    const stats = makePoss()
    expect(gamePossessions(stats, stats)).toBeCloseTo(estimatePossessions(stats), 5)
  })

  it('is symmetric (home/away order should not change result)', () => {
    const home = makePoss({ fga: 82, to: 11 })
    const away = makePoss({ fga: 90, to: 15 })
    expect(gamePossessions(home, away)).toBeCloseTo(gamePossessions(away, home), 5)
  })
})

// ── pace ──────────────────────────────────────────────────────────────────

describe('pace', () => {
  it('returns possessions per standardMinutes', () => {
    // 100 poss in 240 min at standard 240 → pace = 100
    expect(pace(100, 240, 240)).toBeCloseTo(100, 5)
  })

  it('scales up when fewer minutes played', () => {
    // 95 poss in 230 min with standard 240 → 95 * 240 / 230
    expect(pace(95, 230, 240)).toBeCloseTo((95 * 240) / 230, 5)
  })

  it('defaults standardMinutes to 240', () => {
    expect(pace(100, 240)).toBeCloseTo(100, 5)
  })

  it('returns 0 when minutesPlayed is 0', () => {
    expect(pace(100, 0)).toBe(0)
  })

  it('NCAAB standard: 200 minutes (40 min * 5)', () => {
    // 70 poss in 200 min at standard 200 → pace = 70
    expect(pace(70, 200, 200)).toBeCloseTo(70, 5)
  })

  it('higher poss in same minutes yields faster pace', () => {
    expect(pace(110, 240)).toBeGreaterThan(pace(95, 240))
  })
})

// ── ortg ──────────────────────────────────────────────────────────────────

describe('ortg', () => {
  it('100 pts / 100 poss = 100 rating', () => {
    expect(ortg(100, 100)).toBeCloseTo(100, 5)
  })

  it('110 pts / 100 poss = 110 rating', () => {
    expect(ortg(110, 100)).toBeCloseTo(110, 5)
  })

  it('returns 0 when possessions = 0', () => {
    expect(ortg(100, 0)).toBe(0)
  })

  it('scales linearly with points', () => {
    expect(ortg(120, 100)).toBeCloseTo(120, 5)
    expect(ortg(90, 100)).toBeCloseTo(90, 5)
  })
})

// ── drtg ──────────────────────────────────────────────────────────────────

describe('drtg', () => {
  it('105 pts allowed / 100 poss = 105 rating', () => {
    expect(drtg(105, 100)).toBeCloseTo(105, 5)
  })

  it('returns 0 when possessions = 0', () => {
    expect(drtg(105, 0)).toBe(0)
  })
})

// ── netRtg ────────────────────────────────────────────────────────────────

describe('netRtg', () => {
  it('ortg - drtg', () => {
    expect(netRtg(110, 105)).toBeCloseTo(5, 5)
  })

  it('can be negative', () => {
    expect(netRtg(98, 110)).toBeCloseTo(-12, 5)
  })

  it('zero when equal', () => {
    expect(netRtg(108, 108)).toBe(0)
  })
})

// ── computePaceMetrics ────────────────────────────────────────────────────

describe('computePaceMetrics', () => {
  it('returns all required fields', () => {
    const team = makeBox()
    const opp = makeBox({ teamId: 'OPP', pts: 105 })
    const result = computePaceMetrics(team, opp)
    expect(result.teamId).toBe('TEAM')
    expect(typeof result.possessions).toBe('number')
    expect(typeof result.pace).toBe('number')
    expect(typeof result.ortg).toBe('number')
    expect(typeof result.drtg).toBe('number')
    expect(typeof result.netRtg).toBe('number')
  })

  it('netRtg = ortg - drtg', () => {
    const team = makeBox()
    const opp = makeBox({ teamId: 'OPP', pts: 102 })
    const result = computePaceMetrics(team, opp)
    expect(result.netRtg).toBeCloseTo((result.ortg ?? 0) - (result.drtg ?? 0), 5)
  })

  it('possessions are positive for valid inputs', () => {
    const team = makeBox()
    const opp = makeBox({ teamId: 'OPP' })
    const result = computePaceMetrics(team, opp)
    expect(result.possessions).toBeGreaterThan(0)
  })

  it('pace is positive', () => {
    const team = makeBox()
    const opp = makeBox({ teamId: 'OPP' })
    const result = computePaceMetrics(team, opp)
    expect(result.pace).toBeGreaterThan(0)
  })

  it('ortg > 0 when team scores points', () => {
    const team = makeBox({ pts: 110 })
    const opp = makeBox({ teamId: 'OPP', pts: 100 })
    const result = computePaceMetrics(team, opp)
    expect(result.ortg).toBeGreaterThan(0)
  })

  it('uses team.minutes for pace calculation', () => {
    const team = makeBox({ minutes: 240 })
    const opp = makeBox({ teamId: 'OPP', minutes: 240 })
    const result = computePaceMetrics(team, opp)
    // pace = poss * 240 / 240 = poss
    expect(result.pace).toBeCloseTo(result.possessions, 5)
  })
})

// ── computeFourFactors ────────────────────────────────────────────────────

describe('computeFourFactors', () => {
  it('returns all four factors', () => {
    const team = makeBox()
    const opp = makeBox({ teamId: 'OPP' })
    const result = computeFourFactors(team, opp)
    expect(typeof result.efgPct).toBe('number')
    expect(typeof result.tovPct).toBe('number')
    expect(typeof result.orbPct).toBe('number')
    expect(typeof result.ftRate).toBe('number')
  })

  it('efgPct is in [0, 1] for normal inputs', () => {
    const result = computeFourFactors(makeBox(), makeBox({ teamId: 'OPP' }))
    expect(result.efgPct).toBeGreaterThanOrEqual(0)
    expect(result.efgPct).toBeLessThanOrEqual(1)
  })

  it('tovPct is in [0, 1] for normal inputs', () => {
    const result = computeFourFactors(makeBox(), makeBox({ teamId: 'OPP' }))
    expect(result.tovPct).toBeGreaterThanOrEqual(0)
    expect(result.tovPct).toBeLessThanOrEqual(1)
  })

  it('orbPct is in [0, 1] for normal inputs', () => {
    const result = computeFourFactors(makeBox(), makeBox({ teamId: 'OPP' }))
    expect(result.orbPct).toBeGreaterThanOrEqual(0)
    expect(result.orbPct).toBeLessThanOrEqual(1)
  })

  it('ftRate is in [0, 1] for normal inputs', () => {
    const result = computeFourFactors(makeBox(), makeBox({ teamId: 'OPP' }))
    expect(result.ftRate).toBeGreaterThanOrEqual(0)
    expect(result.ftRate).toBeLessThanOrEqual(1)
  })

  it('efgPct formula: (fgm + 0.5*fg3m) / fga', () => {
    const team = makeBox({ fgm: 40, fg3m: 10, fga: 80 })
    const opp = makeBox({ teamId: 'OPP' })
    const result = computeFourFactors(team, opp)
    expect(result.efgPct).toBeCloseTo((40 + 0.5 * 10) / 80, 5)
  })

  it('tovPct formula: to / (fga + 0.44*fta + to)', () => {
    const team = makeBox({ to: 15, fga: 85, fta: 20 })
    const opp = makeBox({ teamId: 'OPP' })
    const result = computeFourFactors(team, opp)
    const expected = 15 / (85 + 0.44 * 20 + 15)
    expect(result.tovPct).toBeCloseTo(expected, 5)
  })

  it('orbPct uses opponent dreb', () => {
    const team = makeBox({ oreb: 12 })
    const opp = makeBox({ teamId: 'OPP', dreb: 28 })
    const result = computeFourFactors(team, opp)
    expect(result.orbPct).toBeCloseTo(12 / (12 + 28), 5)
  })

  it('ftRate = ftm / fga', () => {
    const team = makeBox({ ftm: 16, fga: 80 })
    const opp = makeBox({ teamId: 'OPP' })
    const result = computeFourFactors(team, opp)
    expect(result.ftRate).toBeCloseTo(16 / 80, 5)
  })

  it('handles zero fga gracefully', () => {
    const team = makeBox({ fga: 0, fg3m: 0, fgm: 0, ftm: 0, fta: 0, to: 0 })
    const opp = makeBox({ teamId: 'OPP' })
    const result = computeFourFactors(team, opp)
    expect(result.efgPct).toBe(0)
    expect(result.ftRate).toBe(0)
  })

  it('stores correct teamId', () => {
    const team = makeBox({ teamId: 'LAL' })
    const opp = makeBox({ teamId: 'BOS' })
    expect(computeFourFactors(team, opp).teamId).toBe('LAL')
  })
})

// ── trueShooting ──────────────────────────────────────────────────────────

describe('trueShooting', () => {
  it('standard formula: pts / (2 * (fga + 0.44 * fta))', () => {
    // 110 pts, 88 fga, 20 fta → 110 / (2 * (88 + 8.8)) = 110 / 193.6
    expect(trueShooting(110, 88, 20)).toBeCloseTo(110 / (2 * (88 + 0.44 * 20)), 5)
  })

  it('returns 0 when both fga and fta are 0', () => {
    expect(trueShooting(0, 0, 0)).toBe(0)
  })

  it('returns 0 when denominator is 0', () => {
    expect(trueShooting(10, 0, 0)).toBe(0)
  })

  it('produces reasonable values for typical NBA games', () => {
    // Elite shooter: ~0.60+ TS%
    const ts = trueShooting(30, 20, 8)
    expect(ts).toBeGreaterThan(0.5)
    expect(ts).toBeLessThan(1.2)
  })

  it('increases when more points scored for same attempts', () => {
    expect(trueShooting(120, 88, 20)).toBeGreaterThan(trueShooting(100, 88, 20))
  })
})

// ── astToRatio ────────────────────────────────────────────────────────────

describe('astToRatio', () => {
  it('returns Infinity when to = 0 and ast > 0', () => {
    expect(astToRatio(10, 0)).toBe(Infinity)
  })

  it('returns 0 when both ast and to are 0', () => {
    expect(astToRatio(0, 0)).toBe(0)
  })

  it('returns correct ratio', () => {
    expect(astToRatio(20, 10)).toBeCloseTo(2.0, 5)
  })

  it('handles decimal division', () => {
    expect(astToRatio(7, 3)).toBeCloseTo(7 / 3, 5)
  })

  it('lower ratio when more turnovers', () => {
    expect(astToRatio(20, 5)).toBeGreaterThan(astToRatio(20, 10))
  })
})

// ── usageRate ─────────────────────────────────────────────────────────────

describe('usageRate', () => {
  it('returns 0 when playerMinutes is 0', () => {
    expect(usageRate(10, 4, 2, 240, 0, 100)).toBe(0)
  })

  it('returns 0 when teamPoss is 0', () => {
    expect(usageRate(10, 4, 2, 240, 35, 0)).toBe(0)
  })

  it('produces reasonable range for a starting player (~20-35%)', () => {
    // Typical starter: 15 FGA, 5 FTA, 3 TO, 35 min out of 240, 100 team poss
    const usage = usageRate(15, 5, 3, 240, 35, 100)
    expect(usage).toBeGreaterThan(10)
    expect(usage).toBeLessThan(50)
  })

  it('higher usage with more FGA', () => {
    const low = usageRate(10, 3, 2, 240, 30, 100)
    const high = usageRate(20, 3, 2, 240, 30, 100)
    expect(high).toBeGreaterThan(low)
  })

  it('follows the formula: 100 * ((fga + 0.44*fta + to) * (teamMin/5)) / (playerMin * teamPoss)', () => {
    const fga = 12; const fta = 4; const to = 2
    const teamMin = 240; const playerMin = 32; const teamPoss = 95
    const expected = 100 * ((fga + 0.44 * fta + to) * (teamMin / 5)) / (playerMin * teamPoss)
    expect(usageRate(fga, fta, to, teamMin, playerMin, teamPoss)).toBeCloseTo(expected, 5)
  })
})

// ── shotQualityBreakdown ──────────────────────────────────────────────────

describe('shotQualityBreakdown', () => {
  it('groups shots by location', () => {
    const shots = [
      { location: '3pt' as const, made: true },
      { location: '3pt' as const, made: false },
      { location: 'rim' as const, made: true },
    ]
    const result = shotQualityBreakdown(shots)
    const threePt = result.find(r => r.location === '3pt')
    const rim = result.find(r => r.location === 'rim')
    expect(threePt?.fga).toBe(2)
    expect(threePt?.fgm).toBe(1)
    expect(rim?.fga).toBe(1)
    expect(rim?.fgm).toBe(1)
  })

  it('frequencies sum to 1', () => {
    const shots = [
      { location: '3pt' as const, made: true },
      { location: 'mid-range' as const, made: false },
      { location: 'rim' as const, made: true },
      { location: 'free-throw' as const, made: true },
    ]
    const result = shotQualityBreakdown(shots)
    const totalFreq = result.reduce((sum, s) => sum + s.frequency, 0)
    expect(totalFreq).toBeCloseTo(1, 5)
  })

  it('computes correct ptsPerShot for 3pt shots', () => {
    const shots = [
      { location: '3pt' as const, made: true },
      { location: '3pt' as const, made: false },
    ]
    const result = shotQualityBreakdown(shots)
    const threePt = result.find(r => r.location === '3pt')!
    // 1 made * 3 pts / 2 fga = 1.5
    expect(threePt.ptsPerShot).toBeCloseTo(1.5, 5)
  })

  it('computes correct ptsPerShot for rim shots', () => {
    const shots = [
      { location: 'rim' as const, made: true },
      { location: 'rim' as const, made: true },
      { location: 'rim' as const, made: false },
    ]
    const result = shotQualityBreakdown(shots)
    const rim = result.find(r => r.location === 'rim')!
    // 2 made * 2 pts / 3 fga = 4/3
    expect(rim.ptsPerShot).toBeCloseTo(4 / 3, 5)
  })

  it('computes EFG: 1.5x for 3pt', () => {
    const shots = [
      { location: '3pt' as const, made: true },
      { location: '3pt' as const, made: false },
      { location: '3pt' as const, made: false },
    ]
    const result = shotQualityBreakdown(shots)
    const threePt = result.find(r => r.location === '3pt')!
    // (1 * 1.5) / 3 = 0.5
    expect(threePt.efg).toBeCloseTo(0.5, 5)
  })

  it('computes EFG for non-3pt as simple FG%', () => {
    const shots = [
      { location: 'mid-range' as const, made: true },
      { location: 'mid-range' as const, made: false },
    ]
    const result = shotQualityBreakdown(shots)
    const mid = result.find(r => r.location === 'mid-range')!
    expect(mid.efg).toBeCloseTo(0.5, 5)
  })

  it('returns empty array for empty input', () => {
    expect(shotQualityBreakdown([])).toHaveLength(0)
  })

  it('handles single shot', () => {
    const shots = [{ location: 'free-throw' as const, made: true }]
    const result = shotQualityBreakdown(shots)
    expect(result).toHaveLength(1)
    expect(result[0].frequency).toBe(1)
    expect(result[0].fgm).toBe(1)
  })
})

// ── offensiveBreakdown ────────────────────────────────────────────────────

describe('offensiveBreakdown', () => {
  it('returns all required fields', () => {
    const result = offensiveBreakdown(makeBox())
    expect(typeof result.threePointRate).toBe('number')
    expect(typeof result.midRangeRate).toBe('number')
    expect(typeof result.rimRate).toBe('number')
    expect(typeof result.freeThrowRate).toBe('number')
    expect(typeof result.assistRate).toBe('number')
    expect(typeof result.turnoverRate).toBe('number')
  })

  it('threePointRate = fg3a / fga', () => {
    const box = makeBox({ fg3a: 30, fga: 90 })
    expect(offensiveBreakdown(box).threePointRate).toBeCloseTo(30 / 90, 5)
  })

  it('threePointRate + midRangeRate + rimRate sums to ~1 for field goals', () => {
    const box = makeBox({ fg3a: 30, fga: 90 })
    const bd = offensiveBreakdown(box)
    // These three together should sum to 1
    expect(bd.threePointRate + bd.midRangeRate + bd.rimRate).toBeCloseTo(1, 5)
  })

  it('handles zero fga gracefully', () => {
    const box = makeBox({ fga: 0, fg3a: 0, fgm: 0, ftm: 0, fta: 0, to: 0 })
    const bd = offensiveBreakdown(box)
    expect(bd.threePointRate).toBe(0)
    expect(bd.midRangeRate).toBe(0)
    expect(bd.rimRate).toBe(0)
  })

  it('assistRate = ast / fgm', () => {
    const box = makeBox({ ast: 24, fgm: 40 })
    expect(offensiveBreakdown(box).assistRate).toBeCloseTo(24 / 40, 5)
  })

  it('turnoverRate is in [0, 1]', () => {
    const bd = offensiveBreakdown(makeBox())
    expect(bd.turnoverRate).toBeGreaterThanOrEqual(0)
    expect(bd.turnoverRate).toBeLessThanOrEqual(1)
  })
})

// ── paceClassification ────────────────────────────────────────────────────

describe('paceClassification', () => {
  it('NBA: <95 is slow', () => {
    expect(paceClassification(90, 'NBA')).toBe('slow')
    expect(paceClassification(94.9, 'NBA')).toBe('slow')
  })

  it('NBA: 95-99.99 is moderate', () => {
    expect(paceClassification(95, 'NBA')).toBe('moderate')
    expect(paceClassification(99, 'NBA')).toBe('moderate')
  })

  it('NBA: 100-105 is fast', () => {
    expect(paceClassification(100, 'NBA')).toBe('fast')
    expect(paceClassification(105, 'NBA')).toBe('fast')
  })

  it('NBA: >105 is very-fast', () => {
    expect(paceClassification(105.1, 'NBA')).toBe('very-fast')
    expect(paceClassification(112, 'NBA')).toBe('very-fast')
  })

  it('NCAAB: <65 is slow', () => {
    expect(paceClassification(60, 'NCAAB')).toBe('slow')
    expect(paceClassification(64.9, 'NCAAB')).toBe('slow')
  })

  it('NCAAB: 65-69.99 is moderate', () => {
    expect(paceClassification(65, 'NCAAB')).toBe('moderate')
    expect(paceClassification(69, 'NCAAB')).toBe('moderate')
  })

  it('NCAAB: 70-75 is fast', () => {
    expect(paceClassification(70, 'NCAAB')).toBe('fast')
    expect(paceClassification(75, 'NCAAB')).toBe('fast')
  })

  it('NCAAB: >75 is very-fast', () => {
    expect(paceClassification(76, 'NCAAB')).toBe('very-fast')
  })

  it('NFL: <55 is slow', () => {
    expect(paceClassification(50, 'NFL')).toBe('slow')
    expect(paceClassification(54.9, 'NFL')).toBe('slow')
  })

  it('NFL: 55-61.99 is moderate', () => {
    expect(paceClassification(55, 'NFL')).toBe('moderate')
    expect(paceClassification(61, 'NFL')).toBe('moderate')
  })

  it('NFL: 62-70 is fast', () => {
    expect(paceClassification(62, 'NFL')).toBe('fast')
    expect(paceClassification(70, 'NFL')).toBe('fast')
  })

  it('NFL: >70 is very-fast', () => {
    expect(paceClassification(71, 'NFL')).toBe('very-fast')
  })

  it('defaults to NBA thresholds when sport is omitted', () => {
    expect(paceClassification(90)).toBe('slow')
    expect(paceClassification(97)).toBe('moderate')
    expect(paceClassification(102)).toBe('fast')
    expect(paceClassification(110)).toBe('very-fast')
  })
})

// ── adjustedOrtg ──────────────────────────────────────────────────────────

describe('adjustedOrtg', () => {
  it('formula: teamOrtg * leagueAvg / opponentDrtg', () => {
    // 110 * 108 / 105
    expect(adjustedOrtg(110, 108, 105)).toBeCloseTo((110 * 108) / 105, 5)
  })

  it('returns teamOrtg when opponent is league average', () => {
    // adjustedOrtg(110, 108, 108) = 110 * 108 / 108 = 110
    expect(adjustedOrtg(110, 108, 108)).toBeCloseTo(110, 5)
  })

  it('returns 0 when opponentDrtg is 0', () => {
    expect(adjustedOrtg(110, 108, 0)).toBe(0)
  })

  it('increases when opponent defense is weaker (lower drtg)', () => {
    expect(adjustedOrtg(110, 108, 100)).toBeGreaterThan(adjustedOrtg(110, 108, 115))
  })
})

// ── compareEfficiency ─────────────────────────────────────────────────────

describe('compareEfficiency', () => {
  it('returns named teamA and teamB with correct names', () => {
    const tA = { box: makeBox({ teamId: 'LAL' }), opponent: makeBox({ teamId: 'BOS', pts: 100 }), teamName: 'Lakers' }
    const tB = { box: makeBox({ teamId: 'BOS' }), opponent: makeBox({ teamId: 'LAL', pts: 115 }), teamName: 'Celtics' }
    const result = compareEfficiency(tA, tB)
    expect(result.teamA.name).toBe('Lakers')
    expect(result.teamB.name).toBe('Celtics')
  })

  it('edgeTeamA includes netRtg when A has better net rating', () => {
    // Team A scores 120, allows 100 → positive netRtg
    const tA = {
      box: makeBox({ teamId: 'LAL', pts: 120 }),
      opponent: makeBox({ teamId: 'OPP', pts: 100 }),
      teamName: 'A',
    }
    // Team B scores 100, allows 120 → negative netRtg
    const tB = {
      box: makeBox({ teamId: 'BOS', pts: 100 }),
      opponent: makeBox({ teamId: 'OPP2', pts: 120 }),
      teamName: 'B',
    }
    const result = compareEfficiency(tA, tB)
    expect(result.edgeTeamA).toContain('netRtg')
    expect(result.edgeTeamB).not.toContain('netRtg')
  })

  it('edgeTeamB includes netRtg when B has better net rating', () => {
    const tA = {
      box: makeBox({ teamId: 'A', pts: 95 }),
      opponent: makeBox({ teamId: 'OPP', pts: 115 }),
      teamName: 'A',
    }
    const tB = {
      box: makeBox({ teamId: 'B', pts: 115 }),
      opponent: makeBox({ teamId: 'OPP2', pts: 95 }),
      teamName: 'B',
    }
    const result = compareEfficiency(tA, tB)
    expect(result.edgeTeamB).toContain('netRtg')
  })

  it('edgeTeamA includes efgPct when A shoots more efficiently', () => {
    const tA = {
      box: makeBox({ teamId: 'A', fgm: 50, fg3m: 15, fga: 80 }),
      opponent: makeBox({ teamId: 'OPP' }),
      teamName: 'A',
    }
    const tB = {
      box: makeBox({ teamId: 'B', fgm: 35, fg3m: 8, fga: 88 }),
      opponent: makeBox({ teamId: 'OPP2' }),
      teamName: 'B',
    }
    const result = compareEfficiency(tA, tB)
    expect(result.edgeTeamA).toContain('efgPct')
  })

  it('edgeTeamA includes tovPct advantage when A turns over less', () => {
    const tA = {
      box: makeBox({ teamId: 'A', to: 5 }),  // low turnovers
      opponent: makeBox({ teamId: 'OPP' }),
      teamName: 'A',
    }
    const tB = {
      box: makeBox({ teamId: 'B', to: 18 }),  // high turnovers
      opponent: makeBox({ teamId: 'OPP2' }),
      teamName: 'B',
    }
    const result = compareEfficiency(tA, tB)
    expect(result.edgeTeamA).toContain('tovPct')
  })

  it('includes all four factors fields in results', () => {
    const tA = { box: makeBox({ teamId: 'A' }), opponent: makeBox({ teamId: 'OPP' }), teamName: 'A' }
    const tB = { box: makeBox({ teamId: 'B' }), opponent: makeBox({ teamId: 'OPP2' }), teamName: 'B' }
    const result = compareEfficiency(tA, tB)
    expect(typeof result.teamA.efgPct).toBe('number')
    expect(typeof result.teamA.tovPct).toBe('number')
    expect(typeof result.teamA.orbPct).toBe('number')
    expect(typeof result.teamA.ftRate).toBe('number')
  })
})

// ── floorPct ──────────────────────────────────────────────────────────────

describe('floorPct', () => {
  it('scoringPoss / poss', () => {
    expect(floorPct(100, 55)).toBeCloseTo(0.55, 5)
  })

  it('clamps to 1 when scoringPoss > poss', () => {
    expect(floorPct(100, 120)).toBe(1)
  })

  it('clamps to 0 when scoringPoss is negative', () => {
    expect(floorPct(100, -5)).toBe(0)
  })

  it('returns 0 when poss is 0', () => {
    expect(floorPct(0, 50)).toBe(0)
  })

  it('returns 0 when scoringPoss is 0', () => {
    expect(floorPct(100, 0)).toBe(0)
  })

  it('stays within [0, 1] for normal inputs', () => {
    const result = floorPct(98, 52)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

// ── secondChanceRate ──────────────────────────────────────────────────────

describe('secondChanceRate', () => {
  it('returns oreb / fgaMissed', () => {
    expect(secondChanceRate(10, 40)).toBeCloseTo(0.25, 5)
  })

  it('returns 0 when fgaMissed is 0', () => {
    expect(secondChanceRate(5, 0)).toBe(0)
  })

  it('returns 0 when oreb is 0', () => {
    expect(secondChanceRate(0, 40)).toBe(0)
  })

  it('can exceed 1 in theory (multiple tips)', () => {
    expect(secondChanceRate(50, 40)).toBeCloseTo(1.25, 5)
  })
})

// ── transitionRate ────────────────────────────────────────────────────────

describe('transitionRate', () => {
  it('returns (stl + blk/3) / totalPoss', () => {
    // (7 + 4/3) / 100 = (7 + 1.333) / 100 = 0.08333
    expect(transitionRate(7, 4, 100)).toBeCloseTo((7 + 4 / 3) / 100, 5)
  })

  it('returns 0 when totalPoss is 0', () => {
    expect(transitionRate(7, 4, 0)).toBe(0)
  })

  it('returns 0 when stl and blk are 0', () => {
    expect(transitionRate(0, 0, 100)).toBe(0)
  })

  it('increases with more steals', () => {
    expect(transitionRate(10, 4, 100)).toBeGreaterThan(transitionRate(5, 4, 100))
  })

  it('blk contributes 1/3 of stl value', () => {
    const stlOnly = transitionRate(3, 0, 100)
    const blkOnly = transitionRate(0, 9, 100) // 9/3 = 3 → same as 3 stl
    expect(stlOnly).toBeCloseTo(blkOnly, 5)
  })
})

// ── expectedPPP ───────────────────────────────────────────────────────────

describe('expectedPPP', () => {
  it('returns 0 for empty shots array', () => {
    expect(expectedPPP([])).toBe(0)
  })

  it('returns 0 for zero FGA', () => {
    const shots: ShotQuality[] = [{
      location: '3pt', fga: 0, fgm: 0, ptsPerShot: 0, frequency: 0, efg: 0,
    }]
    expect(expectedPPP(shots)).toBe(0)
  })

  it('computes weighted average of pts * fgPct', () => {
    const shots: ShotQuality[] = [
      { location: '3pt', fga: 10, fgm: 4, ptsPerShot: 1.2, frequency: 0.5, efg: 0.6 },
      { location: 'rim', fga: 10, fgm: 6, ptsPerShot: 1.2, frequency: 0.5, efg: 0.6 },
    ]
    // (10 * 3 * 0.4 + 10 * 2 * 0.6) / 20 = (12 + 12) / 20 = 1.2
    expect(expectedPPP(shots)).toBeCloseTo(1.2, 5)
  })

  it('higher 3pt% increases expectedPPP', () => {
    const lowPct: ShotQuality[] = [
      { location: '3pt', fga: 20, fgm: 6, ptsPerShot: 0.9, frequency: 1, efg: 0.45 },
    ]
    const highPct: ShotQuality[] = [
      { location: '3pt', fga: 20, fgm: 9, ptsPerShot: 1.35, frequency: 1, efg: 0.675 },
    ]
    expect(expectedPPP(highPct)).toBeGreaterThan(expectedPPP(lowPct))
  })
})

// ── boxScoreComponents ────────────────────────────────────────────────────

describe('boxScoreComponents', () => {
  it('returns a number', () => {
    const result = boxScoreComponents({
      pts: 25, reb: 5, ast: 6, stl: 2, blk: 1, to: 3,
      fga: 15, fta: 6, fg3m: 3,
      teamPoss: 100, oppPoss: 100, minutesPlayed: 35, teamMinutes: 240,
    })
    expect(typeof result).toBe('number')
  })

  it('is clamped to [-15, 30]', () => {
    // Absurd positive case
    const high = boxScoreComponents({
      pts: 100, reb: 50, ast: 50, stl: 20, blk: 20, to: 0,
      fga: 1, fta: 0,
      teamPoss: 100, oppPoss: 100, minutesPlayed: 35, teamMinutes: 240,
    })
    expect(high).toBeLessThanOrEqual(30)

    // Absurd negative case
    const low = boxScoreComponents({
      pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 20,
      fga: 1, fta: 0,
      teamPoss: 100, oppPoss: 100, minutesPlayed: 35, teamMinutes: 240,
    })
    expect(low).toBeGreaterThanOrEqual(-15)
  })

  it('better stat line yields higher BPM', () => {
    const elite = boxScoreComponents({
      pts: 30, reb: 8, ast: 10, stl: 3, blk: 2, to: 2,
      fga: 18, fta: 8,
      teamPoss: 100, oppPoss: 100, minutesPlayed: 38, teamMinutes: 240,
    })
    const bench = boxScoreComponents({
      pts: 6, reb: 2, ast: 1, stl: 0, blk: 0, to: 2,
      fga: 6, fta: 2,
      teamPoss: 100, oppPoss: 100, minutesPlayed: 15, teamMinutes: 240,
    })
    expect(elite).toBeGreaterThan(bench)
  })
})
