/**
 * Tests for fantasy scoring rules utilities.
 * Requires at least 80 tests.
 */
import { describe, it, expect } from 'vitest'
import {
  scoreNflQb,
  scoreNflSkill,
  scoreNflDst,
  scoreNflKicker,
  scoreNba,
  nbaDoubleDouble,
  nbaTripleDouble,
  scoreMlbBatter,
  scoreMlbPitcher,
  validateDfsRoster,
  valueScore,
  formatFantasyPoints,
  scoringSummary,
  liveProjection,
  projectPoints,
  optimalLineup,
} from '@/lib/sports/scoring-rules'
import type {
  NflQbStats,
  NflSkillStats,
  NflDstStats,
  NflKickerStats,
  NbaStats,
  MlbBatterStats,
  MlbPitcherStats,
  ScoringConfig,
  DfsRoster,
} from '@/lib/sports/scoring-rules'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DK_NFL: ScoringConfig = { platform: 'draftkings', sport: 'NFL' }
const FD_NFL: ScoringConfig = { platform: 'fanduel', sport: 'NFL' }
const YH_NFL: ScoringConfig = { platform: 'yahoo', sport: 'NFL' }
const DK_NBA: ScoringConfig = { platform: 'draftkings', sport: 'NBA' }
const FD_NBA: ScoringConfig = { platform: 'fanduel', sport: 'NBA' }
const YH_NBA: ScoringConfig = { platform: 'yahoo', sport: 'NBA' }
const DK_MLB: ScoringConfig = { platform: 'draftkings', sport: 'MLB' }
const FD_MLB: ScoringConfig = { platform: 'fanduel', sport: 'MLB' }
const YH_MLB: ScoringConfig = { platform: 'yahoo', sport: 'MLB' }

const BASE_QB: NflQbStats = {
  passingYards: 250,
  passingTDs: 2,
  interceptions: 0,
  rushingYards: 0,
  rushingTDs: 0,
  fumblesLost: 0,
}

const BASE_SKILL: NflSkillStats = {
  receptions: 5,
  receivingYards: 60,
  receivingTDs: 1,
  rushingYards: 20,
  rushingTDs: 0,
  fumblesLost: 0,
}

const BASE_DST: NflDstStats = {
  sacks: 2,
  interceptions: 1,
  fumblesRecovered: 1,
  defensiveTDs: 0,
  safeties: 0,
  blockedKicks: 0,
  pointsAllowed: 17,
}

const BASE_KICKER: NflKickerStats = {
  fgMade: { '0-39': 1, '40-49': 1 },
  fgMissed: 0,
  xpMade: 3,
  xpMissed: 0,
}

const BASE_NBA: NbaStats = {
  points: 20,
  rebounds: 5,
  assists: 7,
  steals: 1,
  blocks: 1,
  turnovers: 2,
  threePointersMade: 2,
}

const BASE_BATTER: MlbBatterStats = {
  singles: 2,
  doubles: 1,
  triples: 0,
  homeRuns: 1,
  rbi: 3,
  runs: 2,
  stolenBases: 0,
  walks: 1,
  hitByPitch: 0,
  strikeouts: 1,
}

const BASE_PITCHER: MlbPitcherStats = {
  inningsPitched: 6,
  strikeouts: 7,
  wins: 1,
  earnedRuns: 2,
  hitsAllowed: 5,
  walksAllowed: 2,
}

// ---------------------------------------------------------------------------
// scoreNflQb
// ---------------------------------------------------------------------------

describe('scoreNflQb', () => {
  it('DK: basic passing yards (250 / 25 = 10 pts)', () => {
    const stats: NflQbStats = { ...BASE_QB, passingTDs: 0 }
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(10, 1)
  })

  it('DK: passing TDs score 4 pts each', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 3 }
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(12, 1)
  })

  it('DK: interception costs -1 pt', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, interceptions: 1 }
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(-1, 1)
  })

  it('DK: fumble lost costs -1 pt', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, fumblesLost: 1 }
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(-1, 1)
  })

  it('DK: rushing yards score 1 pt per 10 yds', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, rushingYards: 40 }
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(4, 1)
  })

  it('DK: rushing TD scores 6 pts', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, rushingTDs: 1 }
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(6, 1)
  })

  it('DK: 300+ passing yards bonus is +3 pts', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 300, passingTDs: 0 }
    // 300/25 = 12 + 3 bonus = 15
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(15, 1)
  })

  it('DK: 400+ passing yards bonus is cumulative +6', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 400, passingTDs: 0 }
    // 400/25 = 16 + 3 (300+) + 3 (400+) = 22
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(22, 1)
  })

  it('DK: 100+ rushing yards bonus is +3 pts', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, rushingYards: 100 }
    // 100/10 = 10 + 3 = 13
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(13, 1)
  })

  it('DK: 2-point conversion is worth 2 pts', () => {
    const stats: NflQbStats = {
      ...BASE_QB, passingYards: 0, passingTDs: 0, twoPointConversions: 2,
    }
    expect(scoreNflQb(stats, DK_NFL)).toBeCloseTo(4, 1)
  })

  it('FD: interception costs -1 pt (same as DK)', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, interceptions: 1 }
    expect(scoreNflQb(stats, FD_NFL)).toBeCloseTo(-1, 1)
  })

  it('FD: fumble lost costs -2 pts (different from DK)', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, fumblesLost: 1 }
    expect(scoreNflQb(stats, FD_NFL)).toBeCloseTo(-2, 1)
  })

  it('FD: 300+ bonus is +3 pts', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 300, passingTDs: 0 }
    expect(scoreNflQb(stats, FD_NFL)).toBeCloseTo(15, 1)
  })

  it('FD: no 400+ extra bonus (only +3 total at 400+)', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 400, passingTDs: 0 }
    // FD: 400/25=16 + 3 = 19 (no second bonus)
    expect(scoreNflQb(stats, FD_NFL)).toBeCloseTo(19, 1)
  })

  it('Yahoo: interception costs -2 pts', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, interceptions: 1 }
    expect(scoreNflQb(stats, YH_NFL)).toBeCloseTo(-2, 1)
  })

  it('Yahoo: fumble lost costs -2 pts', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 0, passingTDs: 0, fumblesLost: 1 }
    expect(scoreNflQb(stats, YH_NFL)).toBeCloseTo(-2, 1)
  })

  it('Yahoo: no passing bonus at 300 yards', () => {
    const stats: NflQbStats = { ...BASE_QB, passingYards: 300, passingTDs: 0 }
    expect(scoreNflQb(stats, YH_NFL)).toBeCloseTo(12, 1)
  })

  it('custom platform uses customRules', () => {
    const config: ScoringConfig = {
      platform: 'custom',
      sport: 'NFL',
      customRules: { passingYardsPerUnit: 1, passingTD: 6, interception: -3, fumbleLost: 0, rushingYardsPerUnit: 0, rushingTD: 0, twoPointConversion: 0 },
    }
    // 250 * 1 + 2 * 6 = 262
    const stats: NflQbStats = { ...BASE_QB }
    expect(scoreNflQb(stats, config)).toBeCloseTo(262, 1)
  })
})

// ---------------------------------------------------------------------------
// scoreNflSkill
// ---------------------------------------------------------------------------

describe('scoreNflSkill', () => {
  it('PPR: receptions score 1 pt each', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receivingYards: 0, receivingTDs: 0, rushingYards: 0 }
    expect(scoreNflSkill(stats, DK_NFL, 'ppr')).toBeCloseTo(5, 1)
  })

  it('half-ppr: receptions score 0.5 pts each', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receivingYards: 0, receivingTDs: 0, rushingYards: 0 }
    expect(scoreNflSkill(stats, DK_NFL, 'half-ppr')).toBeCloseTo(2.5, 1)
  })

  it('standard: receptions score 0 pts', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receivingYards: 0, receivingTDs: 0, rushingYards: 0 }
    expect(scoreNflSkill(stats, DK_NFL, 'standard')).toBeCloseTo(0, 1)
  })

  it('receiving yards score 1 pt per 10 yds', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receptions: 0, receivingYards: 100, receivingTDs: 0, rushingYards: 0 }
    // DK: 100/10 + 3 bonus = 13
    expect(scoreNflSkill(stats, DK_NFL, 'standard')).toBeCloseTo(13, 1)
  })

  it('receiving TD scores 6 pts', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receptions: 0, receivingYards: 0, rushingYards: 0, receivingTDs: 1 }
    expect(scoreNflSkill(stats, DK_NFL, 'standard')).toBeCloseTo(6, 1)
  })

  it('DK: 100+ receiving yards gives +3 bonus', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receptions: 0, receivingYards: 120, receivingTDs: 0, rushingYards: 0 }
    // 120/10 = 12 + 3 = 15
    expect(scoreNflSkill(stats, DK_NFL, 'standard')).toBeCloseTo(15, 1)
  })

  it('DK: 100+ rushing yards gives +3 bonus', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receptions: 0, receivingYards: 0, receivingTDs: 0, rushingYards: 110 }
    // 110/10 = 11 + 3 = 14
    expect(scoreNflSkill(stats, DK_NFL, 'standard')).toBeCloseTo(14, 1)
  })

  it('DK: 2-point conversion scores 2 pts', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receptions: 0, receivingYards: 0, receivingTDs: 0, rushingYards: 0, twoPointConversions: 1 }
    expect(scoreNflSkill(stats, DK_NFL, 'standard')).toBeCloseTo(2, 1)
  })

  it('FD: fumble lost costs -2 pts', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receptions: 0, receivingYards: 0, receivingTDs: 0, rushingYards: 0, fumblesLost: 1 }
    expect(scoreNflSkill(stats, FD_NFL, 'standard')).toBeCloseTo(-2, 1)
  })

  it('DK: fumble lost costs -1 pt', () => {
    const stats: NflSkillStats = { ...BASE_SKILL, receptions: 0, receivingYards: 0, receivingTDs: 0, rushingYards: 0, fumblesLost: 1 }
    expect(scoreNflSkill(stats, DK_NFL, 'standard')).toBeCloseTo(-1, 1)
  })

  it('uses config.format when format param not provided', () => {
    const config: ScoringConfig = { platform: 'draftkings', sport: 'NFL', format: 'ppr' }
    const stats: NflSkillStats = { ...BASE_SKILL, receivingYards: 0, receivingTDs: 0, rushingYards: 0 }
    expect(scoreNflSkill(stats, config)).toBeCloseTo(5, 1)
  })
})

// ---------------------------------------------------------------------------
// scoreNflDst
// ---------------------------------------------------------------------------

describe('scoreNflDst', () => {
  it('DK: sack scores 1 pt', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 1, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 21 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(1, 1)
  })

  it('DK: interception scores 2 pts', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 1, fumblesRecovered: 0, pointsAllowed: 21 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(2, 1)
  })

  it('DK: fumble recovered scores 2 pts', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 1, pointsAllowed: 21 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(2, 1)
  })

  it('DK: defensive TD scores 6 pts', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, defensiveTDs: 1, pointsAllowed: 21 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(6, 1)
  })

  it('DK: safety scores 2 pts', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, safeties: 1, pointsAllowed: 21 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(2, 1)
  })

  it('DK: blocked kick scores 2 pts', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, blockedKicks: 1, pointsAllowed: 21 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(2, 1)
  })

  it('DK: points allowed 0 = +10 tier', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 0 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(10, 1)
  })

  it('DK: points allowed 7-13 = +4 tier', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 10 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(4, 1)
  })

  it('DK: points allowed 21-27 = 0 tier', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 24 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(0, 1)
  })

  it('DK: points allowed 28-34 = -1 tier', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 30 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(-1, 1)
  })

  it('DK: points allowed 35+ = -4 tier', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 42 }
    expect(scoreNflDst(stats, DK_NFL)).toBeCloseTo(-4, 1)
  })

  it('Yahoo: points allowed 0 = +12 tier', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 0 }
    expect(scoreNflDst(stats, { platform: 'yahoo', sport: 'NFL' })).toBeCloseTo(12, 1)
  })

  it('Yahoo: points allowed 35+ = -2 tier', () => {
    const stats: NflDstStats = { ...BASE_DST, sacks: 0, interceptions: 0, fumblesRecovered: 0, pointsAllowed: 40 }
    expect(scoreNflDst(stats, { platform: 'yahoo', sport: 'NFL' })).toBeCloseTo(-2, 1)
  })
})

// ---------------------------------------------------------------------------
// scoreNflKicker
// ---------------------------------------------------------------------------

describe('scoreNflKicker', () => {
  it('DK: 0-39 FG = 3 pts', () => {
    const stats: NflKickerStats = { fgMade: { '0-39': 1 }, fgMissed: 0, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, DK_NFL)).toBeCloseTo(3, 1)
  })

  it('DK: 40-49 FG = 4 pts', () => {
    const stats: NflKickerStats = { fgMade: { '40-49': 1 }, fgMissed: 0, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, DK_NFL)).toBeCloseTo(4, 1)
  })

  it('DK: 50-59 FG = 5 pts', () => {
    const stats: NflKickerStats = { fgMade: { '50-59': 1 }, fgMissed: 0, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, DK_NFL)).toBeCloseTo(5, 1)
  })

  it('DK: 60+ FG = 6 pts (bonus bucket)', () => {
    const stats: NflKickerStats = { fgMade: { '60+': 1 }, fgMissed: 0, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, DK_NFL)).toBeCloseTo(6, 1)
  })

  it('DK: missed FG costs -1 pt', () => {
    const stats: NflKickerStats = { fgMade: {}, fgMissed: 1, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, DK_NFL)).toBeCloseTo(-1, 1)
  })

  it('DK: XP made scores 1 pt', () => {
    const stats: NflKickerStats = { fgMade: {}, fgMissed: 0, xpMade: 3, xpMissed: 0 }
    expect(scoreNflKicker(stats, DK_NFL)).toBeCloseTo(3, 1)
  })

  it('DK: missed XP costs -1 pt', () => {
    const stats: NflKickerStats = { fgMade: {}, fgMissed: 0, xpMade: 0, xpMissed: 1 }
    expect(scoreNflKicker(stats, DK_NFL)).toBeCloseTo(-1, 1)
  })

  it('Yahoo: no missed FG penalty', () => {
    const stats: NflKickerStats = { fgMade: {}, fgMissed: 2, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, YH_NFL)).toBeCloseTo(0, 1)
  })

  it('Yahoo: 50+ FG = 5 pts (no 60+ distinction)', () => {
    const stats: NflKickerStats = { fgMade: { '60+': 1 }, fgMissed: 0, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, YH_NFL)).toBeCloseTo(5, 1)
  })

  it('FD: same as DK for 60+ FG', () => {
    const stats: NflKickerStats = { fgMade: { '60+': 2 }, fgMissed: 0, xpMade: 0, xpMissed: 0 }
    expect(scoreNflKicker(stats, FD_NFL)).toBeCloseTo(12, 1)
  })
})

// ---------------------------------------------------------------------------
// nbaDoubleDouble / nbaTripleDouble
// ---------------------------------------------------------------------------

describe('nbaDoubleDouble', () => {
  it('returns false when only 1 stat is 10+', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 10, rebounds: 5, assists: 5, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaDoubleDouble(stats)).toBe(false)
  })

  it('returns true when exactly 2 stats are 10+', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 10, rebounds: 10, assists: 5, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaDoubleDouble(stats)).toBe(true)
  })

  it('returns true for pts + ast double-double', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 22, rebounds: 3, assists: 11, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaDoubleDouble(stats)).toBe(true)
  })

  it('boundary: exactly 10 counts', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 10, rebounds: 10, assists: 0, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaDoubleDouble(stats)).toBe(true)
  })

  it('returns false for 9+9', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 9, rebounds: 9, assists: 0, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaDoubleDouble(stats)).toBe(false)
  })
})

describe('nbaTripleDouble', () => {
  it('returns false when only 2 stats are 10+', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 10, rebounds: 10, assists: 5, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaTripleDouble(stats)).toBe(false)
  })

  it('returns true when exactly 3 stats are 10+', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 10, rebounds: 10, assists: 10, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaTripleDouble(stats)).toBe(true)
  })

  it('returns true for pts + reb + ast', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 30, rebounds: 12, assists: 10, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaTripleDouble(stats)).toBe(true)
  })

  it('boundary: 10/10/10/0/0', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 10, rebounds: 10, assists: 10, steals: 0, blocks: 0, turnovers: 0 }
    expect(nbaTripleDouble(stats)).toBe(true)
  })

  it('returns true for 5 categories all 10+', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 10, rebounds: 10, assists: 10, steals: 10, blocks: 10, turnovers: 0 }
    expect(nbaTripleDouble(stats)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// scoreNba
// ---------------------------------------------------------------------------

describe('scoreNba', () => {
  it('DK: points score 1 pt each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 20, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 0 }
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(20, 1)
  })

  it('DK: rebounds score 1.25 pts each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 8, assists: 0, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 0 }
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(10, 1)
  })

  it('DK: assists score 1.5 pts each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 6, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 0 }
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(9, 1)
  })

  it('DK: steals score 2 pts each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 0, steals: 3, blocks: 0, turnovers: 0, threePointersMade: 0 }
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(6, 1)
  })

  it('DK: blocks score 2 pts each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 4, turnovers: 0, threePointersMade: 0 }
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(8, 1)
  })

  it('DK: turnovers cost -0.5 pts each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 4, threePointersMade: 0 }
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(-2, 1)
  })

  it('DK: 3-pointers made score 0.5 pts each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 4 }
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(2, 1)
  })

  it('DK: double-double bonus +1.5 pts', () => {
    const stats: NbaStats = { points: 10, rebounds: 10, assists: 0, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 0 }
    // 10*1 + 10*1.25 + 1.5(dd) = 24
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(24, 1)
  })

  it('DK: triple-double bonus +3 pts (in addition to dd bonus)', () => {
    const stats: NbaStats = { points: 10, rebounds: 10, assists: 10, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 0 }
    // pts(10) + reb(12.5) + ast(15) + dd(1.5) + td(3) = 42
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(42, 1)
  })

  it('DK: provided doubleDouble=true uses that value', () => {
    const stats: NbaStats = { points: 5, rebounds: 5, assists: 0, steals: 0, blocks: 0, turnovers: 0, doubleDouble: true, threePointersMade: 0 }
    // 5 + 6.25 + 1.5 = 12.75
    expect(scoreNba(stats, DK_NBA)).toBeCloseTo(12.75, 1)
  })

  it('FD: turnovers cost -1 pt (stricter than DK)', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 3, threePointersMade: 0 }
    expect(scoreNba(stats, FD_NBA)).toBeCloseTo(-3, 1)
  })

  it('FD: no 3pm bonus', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 5 }
    expect(scoreNba(stats, FD_NBA)).toBeCloseTo(0, 1)
  })

  it('FD: rebounds score 1.2 pts each', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 10, assists: 0, steals: 0, blocks: 0, turnovers: 0, threePointersMade: 0 }
    expect(scoreNba(stats, FD_NBA)).toBeCloseTo(12, 1)
  })

  it('Yahoo: assists score 1 pt each (not 1.5)', () => {
    const stats: NbaStats = { ...BASE_NBA, points: 0, rebounds: 0, assists: 8, steals: 0, blocks: 0, turnovers: 0 }
    expect(scoreNba(stats, YH_NBA)).toBeCloseTo(8, 1)
  })
})

// ---------------------------------------------------------------------------
// scoreMlbBatter
// ---------------------------------------------------------------------------

describe('scoreMlbBatter', () => {
  it('DK: single scores 3 pts', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 1, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 0 }
    expect(scoreMlbBatter(stats, DK_MLB)).toBeCloseTo(3, 1)
  })

  it('DK: double scores 5 pts', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 1, triples: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 0 }
    expect(scoreMlbBatter(stats, DK_MLB)).toBeCloseTo(5, 1)
  })

  it('DK: triple scores 8 pts', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 0, triples: 1, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 0 }
    expect(scoreMlbBatter(stats, DK_MLB)).toBeCloseTo(8, 1)
  })

  it('DK: HR scores 10 pts', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 0, triples: 0, homeRuns: 1, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 0 }
    expect(scoreMlbBatter(stats, DK_MLB)).toBeCloseTo(10, 1)
  })

  it('DK: strikeout costs -0.5 pts', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 2 }
    expect(scoreMlbBatter(stats, DK_MLB)).toBeCloseTo(-1, 1)
  })

  it('DK: stolen base scores 5 pts', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 1, walks: 0, hitByPitch: 0, strikeouts: 0 }
    expect(scoreMlbBatter(stats, DK_MLB)).toBeCloseTo(5, 1)
  })

  it('FD: HR scores 12 pts (more than DK)', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 0, triples: 0, homeRuns: 1, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 0 }
    expect(scoreMlbBatter(stats, FD_MLB)).toBeCloseTo(12, 1)
  })

  it('FD: no strikeout penalty', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 0, triples: 0, homeRuns: 0, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 3 }
    expect(scoreMlbBatter(stats, FD_MLB)).toBeCloseTo(0, 1)
  })

  it('Yahoo: HR scores 10.4 pts', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER, singles: 0, doubles: 0, triples: 0, homeRuns: 1, rbi: 0, runs: 0, stolenBases: 0, walks: 0, hitByPitch: 0, strikeouts: 0 }
    expect(scoreMlbBatter(stats, YH_MLB)).toBeCloseTo(10.4, 1)
  })
})

// ---------------------------------------------------------------------------
// scoreMlbPitcher
// ---------------------------------------------------------------------------

describe('scoreMlbPitcher', () => {
  it('DK: innings pitched score 2.25 pts per IP', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 6, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0 }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(13.5, 1)
  })

  it('DK: strikeout scores 2 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 5, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0 }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(10, 1)
  })

  it('DK: win scores 4 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 1, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0 }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(4, 1)
  })

  it('DK: earned run costs -2 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 0, earnedRuns: 3, hitsAllowed: 0, walksAllowed: 0 }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(-6, 1)
  })

  it('DK: hit allowed costs -0.6 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 5, walksAllowed: 0 }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(-3, 1)
  })

  it('DK: quality start bonus +4 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0, qualityStart: true }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(4, 1)
  })

  it('DK: no-hitter bonus +5 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0, noHitter: true }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(5, 1)
  })

  it('DK: complete game bonus +2.5 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0, completeGame: true }
    expect(scoreMlbPitcher(stats, DK_MLB)).toBeCloseTo(2.5, 1)
  })

  it('FD: innings pitched score 3 pts per IP', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 7, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0 }
    expect(scoreMlbPitcher(stats, FD_MLB)).toBeCloseTo(21, 1)
  })

  it('FD: no hit/walk penalty', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 5, walksAllowed: 4 }
    expect(scoreMlbPitcher(stats, FD_MLB)).toBeCloseTo(0, 1)
  })

  it('FD: no-hitter bonus +10 pts', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 0, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0, noHitter: true }
    expect(scoreMlbPitcher(stats, FD_MLB)).toBeCloseTo(10, 1)
  })

  it('Yahoo: innings pitched score 1 pt per IP', () => {
    const stats: MlbPitcherStats = { ...BASE_PITCHER, inningsPitched: 7, strikeouts: 0, wins: 0, earnedRuns: 0, hitsAllowed: 0, walksAllowed: 0 }
    expect(scoreMlbPitcher(stats, YH_MLB)).toBeCloseTo(7, 1)
  })
})

// ---------------------------------------------------------------------------
// validateDfsRoster
// ---------------------------------------------------------------------------

describe('validateDfsRoster', () => {
  it('valid DK NFL lineup passes', () => {
    const roster: DfsRoster = {
      platform: 'draftkings',
      sport: 'NFL',
      slots: [
        { position: 'QB', playerId: 'p1', salary: 7500 },
        { position: 'RB', playerId: 'p2', salary: 6500 },
        { position: 'RB', playerId: 'p3', salary: 5500 },
        { position: 'WR', playerId: 'p4', salary: 7000 },
        { position: 'WR', playerId: 'p5', salary: 6000 },
        { position: 'WR', playerId: 'p6', salary: 5000 },
        { position: 'TE', playerId: 'p7', salary: 4500 },
        { position: 'RB', playerId: 'p8', salary: 4000 },
        { position: 'DST', playerId: 'p9', salary: 3000 },
      ],
    }
    const result = validateDfsRoster(roster)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('over salary cap returns error', () => {
    const roster: DfsRoster = {
      platform: 'draftkings',
      sport: 'NFL',
      slots: [
        { position: 'QB', playerId: 'p1', salary: 10000 },
        { position: 'RB', playerId: 'p2', salary: 9000 },
        { position: 'RB', playerId: 'p3', salary: 8000 },
        { position: 'WR', playerId: 'p4', salary: 8000 },
        { position: 'WR', playerId: 'p5', salary: 7000 },
        { position: 'WR', playerId: 'p6', salary: 6000 },
        { position: 'TE', playerId: 'p7', salary: 5000 },
        { position: 'RB', playerId: 'p8', salary: 4500 },
        { position: 'DST', playerId: 'p9', salary: 3500 },
      ],
    }
    const result = validateDfsRoster(roster)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('cap'))).toBe(true)
  })

  it('duplicate player returns error', () => {
    const roster: DfsRoster = {
      platform: 'draftkings',
      sport: 'NFL',
      slots: [
        { position: 'QB', playerId: 'p1', salary: 7500 },
        { position: 'RB', playerId: 'p1', salary: 6500 }, // duplicate
        { position: 'RB', playerId: 'p3', salary: 5500 },
        { position: 'WR', playerId: 'p4', salary: 7000 },
        { position: 'WR', playerId: 'p5', salary: 6000 },
        { position: 'WR', playerId: 'p6', salary: 5000 },
        { position: 'TE', playerId: 'p7', salary: 4500 },
        { position: 'RB', playerId: 'p8', salary: 4000 },
        { position: 'DST', playerId: 'p9', salary: 3000 },
      ],
    }
    const result = validateDfsRoster(roster)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.toLowerCase().includes('duplicate'))).toBe(true)
  })

  it('wrong position in slot returns error', () => {
    const roster: DfsRoster = {
      platform: 'draftkings',
      sport: 'NFL',
      slots: [
        { position: 'WR', playerId: 'p1', salary: 7500 }, // QB slot with WR
        { position: 'RB', playerId: 'p2', salary: 6500 },
        { position: 'RB', playerId: 'p3', salary: 5500 },
        { position: 'WR', playerId: 'p4', salary: 7000 },
        { position: 'WR', playerId: 'p5', salary: 6000 },
        { position: 'WR', playerId: 'p6', salary: 5000 },
        { position: 'TE', playerId: 'p7', salary: 4500 },
        { position: 'RB', playerId: 'p8', salary: 4000 },
        { position: 'DST', playerId: 'p9', salary: 3000 },
      ],
    }
    const result = validateDfsRoster(roster)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('QB'))).toBe(true)
  })

  it('unknown platform returns error', () => {
    const roster: DfsRoster = {
      platform: 'custom',
      sport: 'NFL',
      slots: [],
    }
    const result = validateDfsRoster(roster)
    expect(result.valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// valueScore
// ---------------------------------------------------------------------------

describe('valueScore', () => {
  it('calculates pts per $1000', () => {
    expect(valueScore(25, 5000)).toBeCloseTo(5.0, 2)
  })

  it('handles different salary', () => {
    expect(valueScore(30, 7500)).toBeCloseTo(4.0, 2)
  })

  it('returns 0 when salary is 0', () => {
    expect(valueScore(10, 0)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    // 15 / 6000 * 1000 = 2.5
    expect(valueScore(15, 6000)).toBeCloseTo(2.5, 2)
  })
})

// ---------------------------------------------------------------------------
// formatFantasyPoints
// ---------------------------------------------------------------------------

describe('formatFantasyPoints', () => {
  it('formats positive points', () => {
    expect(formatFantasyPoints(12.5)).toBe('12.50 pts')
  })

  it('formats negative points', () => {
    expect(formatFantasyPoints(-3.5)).toBe('-3.50 pts')
  })

  it('formats zero', () => {
    expect(formatFantasyPoints(0)).toBe('0.00 pts')
  })

  it('formats integer points with two decimals', () => {
    expect(formatFantasyPoints(20)).toBe('20.00 pts')
  })
})

// ---------------------------------------------------------------------------
// scoringSummary
// ---------------------------------------------------------------------------

describe('scoringSummary', () => {
  it('only includes non-zero contributions', () => {
    const stats: NflQbStats = {
      passingYards: 300,
      passingTDs: 2,
      interceptions: 0,
      rushingYards: 0,
      rushingTDs: 0,
      fumblesLost: 0,
    }
    const rows = scoringSummary(stats, DK_NFL)
    const labels = rows.map(r => r.stat)
    expect(labels).not.toContain('Interceptions')
    expect(labels).not.toContain('Rushing Yards')
    expect(labels).toContain('Passing Yards')
    expect(labels).toContain('Passing TDs')
    expect(labels).toContain('Bonus 300+ Pass Yds')
  })

  it('includes fumble row only when non-zero', () => {
    const stats: NflQbStats = {
      passingYards: 0,
      passingTDs: 0,
      interceptions: 0,
      rushingYards: 0,
      rushingTDs: 0,
      fumblesLost: 1,
    }
    const rows = scoringSummary(stats, DK_NFL)
    const labels = rows.map(r => r.stat)
    expect(labels).toContain('Fumbles Lost')
  })

  it('each row has stat, value, points properties', () => {
    const stats: NflQbStats = { ...BASE_QB }
    const rows = scoringSummary(stats, DK_NFL)
    for (const row of rows) {
      expect(row).toHaveProperty('stat')
      expect(row).toHaveProperty('value')
      expect(row).toHaveProperty('points')
    }
  })

  it('points in rows sum to total score', () => {
    const stats: NflQbStats = { ...BASE_QB }
    const rows = scoringSummary(stats, DK_NFL)
    const total = rows.reduce((s, r) => s + r.points, 0)
    expect(total).toBeCloseTo(scoreNflQb(stats, DK_NFL), 1)
  })
})

// ---------------------------------------------------------------------------
// liveProjection
// ---------------------------------------------------------------------------

describe('liveProjection', () => {
  it('scales half-game stats to full game', () => {
    const partial = { passingYards: 150, passingTDs: 1 }
    const projected = liveProjection(partial, 30, 60)
    expect(projected.passingYards).toBe(300)
    expect(projected.passingTDs).toBe(2)
  })

  it('fills missing fields with 0', () => {
    const partial = { passingYards: 200 }
    const projected = liveProjection(partial, 30, 60)
    expect(projected.interceptions).toBe(0)
    expect(projected.fumblesLost).toBe(0)
    expect(projected.rushingTDs).toBe(0)
  })

  it('returns zeros when minutesPlayed is 0', () => {
    const partial = { passingYards: 100 }
    const projected = liveProjection(partial, 0)
    expect(projected.passingYards).toBe(0)
  })

  it('uses default 60 minutes when totalMinutes not given', () => {
    const partial = { passingYards: 120 }
    const projected = liveProjection(partial, 40)
    // 120 * (60/40) = 180
    expect(projected.passingYards).toBe(180)
  })

  it('handles quarter-game scaling', () => {
    const partial = { passingYards: 75, passingTDs: 1 }
    const projected = liveProjection(partial, 15, 60)
    expect(projected.passingYards).toBe(300)
    expect(projected.passingTDs).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// projectPoints dispatcher
// ---------------------------------------------------------------------------

describe('projectPoints', () => {
  it('dispatches to qb scoring', () => {
    const stats: NflQbStats = { ...BASE_QB }
    expect(projectPoints(stats, DK_NFL, 'qb')).toBeCloseTo(scoreNflQb(stats, DK_NFL), 2)
  })

  it('dispatches to skill scoring', () => {
    const stats: NflSkillStats = { ...BASE_SKILL }
    expect(projectPoints(stats, DK_NFL, 'skill', 'ppr')).toBeCloseTo(
      scoreNflSkill(stats, DK_NFL, 'ppr'),
      2
    )
  })

  it('dispatches to nba scoring', () => {
    const stats: NbaStats = { ...BASE_NBA }
    expect(projectPoints(stats, DK_NBA, 'nba')).toBeCloseTo(scoreNba(stats, DK_NBA), 2)
  })

  it('dispatches to mlb batter scoring', () => {
    const stats: MlbBatterStats = { ...BASE_BATTER }
    expect(projectPoints(stats, DK_MLB, 'mlb-batter')).toBeCloseTo(
      scoreMlbBatter(stats, DK_MLB),
      2
    )
  })
})

// ---------------------------------------------------------------------------
// optimalLineup
// ---------------------------------------------------------------------------

describe('optimalLineup', () => {
  it('returns null when requirements cannot be met', () => {
    const players = [{ id: 'p1', position: 'QB', salary: 5000, projectedPoints: 30 }]
    const result = optimalLineup(players, 50000, { QB: 1, RB: 1 })
    expect(result).toBeNull()
  })

  it('returns lineup when requirements can be met', () => {
    const players = [
      { id: 'p1', position: 'QB', salary: 8000, projectedPoints: 30 },
      { id: 'p2', position: 'RB', salary: 6000, projectedPoints: 25 },
    ]
    const result = optimalLineup(players, 50000, { QB: 1, RB: 1 })
    expect(result).not.toBeNull()
    expect(result!.players).toContain('p1')
    expect(result!.players).toContain('p2')
  })

  it('respects salary cap', () => {
    const players = [
      { id: 'p1', position: 'QB', salary: 45000, projectedPoints: 30 },
      { id: 'p2', position: 'RB', salary: 45000, projectedPoints: 25 },
    ]
    const result = optimalLineup(players, 50000, { QB: 1, RB: 1 })
    expect(result).toBeNull()
  })

  it('returns totalSalary and totalPoints', () => {
    const players = [
      { id: 'p1', position: 'QB', salary: 8000, projectedPoints: 32 },
      { id: 'p2', position: 'RB', salary: 6000, projectedPoints: 24 },
    ]
    const result = optimalLineup(players, 50000, { QB: 1, RB: 1 })
    expect(result!.totalSalary).toBe(14000)
    expect(result!.totalPoints).toBeCloseTo(56, 1)
  })
})
