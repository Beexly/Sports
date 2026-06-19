import { describe, it, expect } from 'vitest'
import {
  playProbabilityFromStatus,
  classifySeverity,
  classifySeverityWithWeeks,
  positionImportanceWeight,
  expectedSnapShare,
  fantasyImpact,
  teamImpactScore,
  spreadImpact,
  injuryRecommendation,
  analyzeInjury,
  analyzeLineup,
  estimateRecovery,
  compareBothTeamInjuries,
  filterSignificantInjuries,
  formatInjuryLine,
  totalSnapShareLoss,
  type InjuredPlayer,
} from '@/lib/sports/injury-impact'

// ----- Helpers -----

function makePlayer(
  overrides: Partial<InjuredPlayer> = {},
): InjuredPlayer {
  return {
    playerId: 'p1',
    name: 'Test Player',
    position: 'WR',
    status: 'healthy',
    bodyPart: 'ankle',
    ...overrides,
  }
}

// ----- playProbabilityFromStatus -----

describe('playProbabilityFromStatus', () => {
  it('returns 0 for out', () => {
    expect(playProbabilityFromStatus('out')).toBe(0)
  })

  it('returns 0.15 for doubtful', () => {
    expect(playProbabilityFromStatus('doubtful')).toBe(0.15)
  })

  it('returns 0.50 for questionable', () => {
    expect(playProbabilityFromStatus('questionable')).toBe(0.5)
  })

  it('returns 0.85 for probable', () => {
    expect(playProbabilityFromStatus('probable')).toBe(0.85)
  })

  it('returns 1.0 for healthy', () => {
    expect(playProbabilityFromStatus('healthy')).toBe(1.0)
  })
})

// ----- classifySeverity -----

describe('classifySeverity', () => {
  it('healthy → minor regardless of body part', () => {
    expect(classifySeverity('knee', 'healthy')).toBe('minor')
  })

  it('probable → minor', () => {
    expect(classifySeverity('knee', 'probable')).toBe('minor')
  })

  it('questionable → minor', () => {
    expect(classifySeverity('ankle', 'questionable')).toBe('minor')
  })

  it('doubtful → moderate', () => {
    expect(classifySeverity('hamstring', 'doubtful')).toBe('moderate')
  })

  it('out + regular body part → moderate', () => {
    expect(classifySeverity('ankle', 'out')).toBe('moderate')
  })

  it('out + knee → severe', () => {
    expect(classifySeverity('knee', 'out')).toBe('severe')
  })

  it('out + concussion → severe', () => {
    expect(classifySeverity('concussion', 'out')).toBe('severe')
  })

  it('out + hamstring → moderate', () => {
    expect(classifySeverity('hamstring', 'out')).toBe('moderate')
  })

  it('out + back → moderate', () => {
    expect(classifySeverity('back', 'out')).toBe('moderate')
  })

  it('out + illness → moderate', () => {
    expect(classifySeverity('illness', 'out')).toBe('moderate')
  })
})

// ----- classifySeverityWithWeeks -----

describe('classifySeverityWithWeeks', () => {
  it('8+ weeks → season-ending regardless of body part and status', () => {
    expect(classifySeverityWithWeeks('ankle', 'questionable', 8)).toBe('season-ending')
  })

  it('8+ weeks → season-ending even for minor status', () => {
    expect(classifySeverityWithWeeks('hamstring', 'probable', 10)).toBe('season-ending')
  })

  it('7 weeks does NOT trigger season-ending', () => {
    expect(classifySeverityWithWeeks('ankle', 'out', 7)).toBe('moderate')
  })

  it('below 8 weeks still uses classifySeverity logic', () => {
    expect(classifySeverityWithWeeks('knee', 'out', 3)).toBe('severe')
  })

  it('exactly 8 weeks → season-ending', () => {
    expect(classifySeverityWithWeeks('shoulder', 'doubtful', 8)).toBe('season-ending')
  })
})

// ----- positionImportanceWeight -----

describe('positionImportanceWeight', () => {
  it('QB = 10', () => expect(positionImportanceWeight('QB')).toBe(10))
  it('WR = 7', () => expect(positionImportanceWeight('WR')).toBe(7))
  it('RB = 6', () => expect(positionImportanceWeight('RB')).toBe(6))
  it('TE = 5', () => expect(positionImportanceWeight('TE')).toBe(5))
  it('OL = 5', () => expect(positionImportanceWeight('OL')).toBe(5))
  it('DL = 5', () => expect(positionImportanceWeight('DL')).toBe(5))
  it('LB = 4', () => expect(positionImportanceWeight('LB')).toBe(4))
  it('DB = 4', () => expect(positionImportanceWeight('DB')).toBe(4))
  it('K = 2',  () => expect(positionImportanceWeight('K')).toBe(2))
  it('P = 1',  () => expect(positionImportanceWeight('P')).toBe(1))
})

// ----- expectedSnapShare -----

describe('expectedSnapShare', () => {
  it('healthy QB with no snapSharePct uses default 95', () => {
    const p = makePlayer({ position: 'QB', status: 'healthy' })
    expect(expectedSnapShare(p)).toBe(95)
  })

  it('out QB returns 0 snaps', () => {
    const p = makePlayer({ position: 'QB', status: 'out' })
    expect(expectedSnapShare(p)).toBe(0)
  })

  it('questionable WR uses default 65 * 0.5', () => {
    const p = makePlayer({ position: 'WR', status: 'questionable' })
    expect(expectedSnapShare(p)).toBeCloseTo(32.5)
  })

  it('uses provided snapSharePct when available', () => {
    const p = makePlayer({ position: 'WR', status: 'questionable', snapSharePct: 80 })
    expect(expectedSnapShare(p)).toBeCloseTo(40)
  })

  it('probable RB with custom snapSharePct', () => {
    const p = makePlayer({ position: 'RB', status: 'probable', snapSharePct: 60 })
    expect(expectedSnapShare(p)).toBeCloseTo(51)  // 60 * 0.85
  })

  it('doubtful DB uses default 85 * 0.15', () => {
    const p = makePlayer({ position: 'DB', status: 'doubtful' })
    expect(expectedSnapShare(p)).toBeCloseTo(12.75)
  })

  it('healthy OL uses default 98', () => {
    const p = makePlayer({ position: 'OL', status: 'healthy' })
    expect(expectedSnapShare(p)).toBe(98)
  })
})

// ----- fantasyImpact -----

describe('fantasyImpact', () => {
  it('returns 0 if no fantasyPoints provided', () => {
    const p = makePlayer({ position: 'QB', status: 'out' })
    expect(fantasyImpact(p)).toBe(0)
  })

  it('healthy player with fantasyPoints returns 0 impact', () => {
    const p = makePlayer({ position: 'QB', status: 'healthy', fantasyPoints: 20 })
    // expectedSnap = 95, positionDefault = 95, ratio = 95/95 = 1, impact = 20*(1-1)=0
    expect(fantasyImpact(p)).toBeCloseTo(0)
  })

  it('out QB with fantasyPoints loses full expected value', () => {
    const p = makePlayer({ position: 'QB', status: 'out', fantasyPoints: 20 })
    // expectedSnap = 0, impact = 20*(1-0/95)=20
    expect(fantasyImpact(p)).toBeCloseTo(20)
  })

  it('questionable WR loses roughly half fantasy value', () => {
    const p = makePlayer({ position: 'WR', status: 'questionable', fantasyPoints: 10 })
    // expectedSnap = 65*0.5=32.5, impact = 10*(1-32.5/65)=10*0.5=5
    expect(fantasyImpact(p)).toBeCloseTo(5)
  })

  it('probable RB with custom snapSharePct loses proportional fantasy value', () => {
    const p = makePlayer({ position: 'RB', status: 'probable', snapSharePct: 30, fantasyPoints: 12 })
    // expectedSnap = 30*0.85=25.5, impact = 12*(1-25.5/45)=12*(19.5/45)
    expect(fantasyImpact(p)).toBeCloseTo(12 * (1 - 25.5 / 45))
  })
})

// ----- teamImpactScore -----

describe('teamImpactScore', () => {
  it('QB out = 10 * 1 * 10 = 100 (clamped)', () => {
    const p = makePlayer({ position: 'QB', status: 'out' })
    expect(teamImpactScore(p)).toBe(100)
  })

  it('QB healthy = 0', () => {
    const p = makePlayer({ position: 'QB', status: 'healthy' })
    expect(teamImpactScore(p)).toBe(0)
  })

  it('WR doubtful = 7 * 0.85 * 10 = 59.5', () => {
    const p = makePlayer({ position: 'WR', status: 'doubtful' })
    expect(teamImpactScore(p)).toBeCloseTo(7 * 0.85 * 10)
  })

  it('K out = 2 * 1 * 10 = 20', () => {
    const p = makePlayer({ position: 'K', status: 'out' })
    expect(teamImpactScore(p)).toBe(20)
  })

  it('P out = 1 * 1 * 10 = 10', () => {
    const p = makePlayer({ position: 'P', status: 'out' })
    expect(teamImpactScore(p)).toBe(10)
  })

  it('clamps at 100 maximum', () => {
    const p = makePlayer({ position: 'QB', status: 'out' })
    expect(teamImpactScore(p)).toBeLessThanOrEqual(100)
  })

  it('clamps at 0 minimum', () => {
    const p = makePlayer({ position: 'P', status: 'healthy' })
    expect(teamImpactScore(p)).toBeGreaterThanOrEqual(0)
  })
})

// ----- spreadImpact -----

describe('spreadImpact', () => {
  it('QB out on offense = -3.5', () => {
    const p = makePlayer({ position: 'QB', status: 'out' })
    expect(spreadImpact(p, true)).toBeCloseTo(-3.5)
  })

  it('QB healthy on offense = 0', () => {
    const p = makePlayer({ position: 'QB', status: 'healthy' })
    expect(spreadImpact(p, true)).toBeCloseTo(0)
  })

  it('WR out on offense = -1.5', () => {
    const p = makePlayer({ position: 'WR', status: 'out' })
    expect(spreadImpact(p, true)).toBeCloseTo(-1.5)
  })

  it('RB out on offense = -1.0', () => {
    const p = makePlayer({ position: 'RB', status: 'out' })
    expect(spreadImpact(p, true)).toBeCloseTo(-1.0)
  })

  it('TE out on offense = -0.75', () => {
    const p = makePlayer({ position: 'TE', status: 'out' })
    expect(spreadImpact(p, true)).toBeCloseTo(-0.75)
  })

  it('OL out on offense = -1.0', () => {
    const p = makePlayer({ position: 'OL', status: 'out' })
    expect(spreadImpact(p, true)).toBeCloseTo(-1.0)
  })

  it('DL out on defense = -1.0', () => {
    const p = makePlayer({ position: 'DL', status: 'out' })
    expect(spreadImpact(p, false)).toBeCloseTo(-1.0)
  })

  it('LB out on defense = -0.75', () => {
    const p = makePlayer({ position: 'LB', status: 'out' })
    expect(spreadImpact(p, false)).toBeCloseTo(-0.75)
  })

  it('DB out on defense = -1.0', () => {
    const p = makePlayer({ position: 'DB', status: 'out' })
    expect(spreadImpact(p, false)).toBeCloseTo(-1.0)
  })

  it('K on defense = 0', () => {
    const p = makePlayer({ position: 'K', status: 'out' })
    expect(spreadImpact(p, false)).toBe(0)
  })

  it('questionable QB on offense = -3.5 * 0.5', () => {
    const p = makePlayer({ position: 'QB', status: 'questionable' })
    expect(spreadImpact(p, true)).toBeCloseTo(-1.75)
  })
})

// ----- injuryRecommendation -----

describe('injuryRecommendation', () => {
  it('out → avoid (probability 0 < 0.15)', () => {
    const p = makePlayer({ position: 'WR', status: 'out' })
    expect(injuryRecommendation(p)).toBe('avoid')
  })

  it('doubtful → avoid (probability 0.15 is NOT < 0.15)', () => {
    // doubtful = 0.15 which is not < 0.15, so it falls to sit check (0.15 < 0.4)
    const p = makePlayer({ position: 'WR', status: 'doubtful' })
    expect(injuryRecommendation(p)).toBe('sit')
  })

  it('questionable → sit when teamImpactScore is not high', () => {
    // questionable = 0.5, which is >=0.4 but <0.55; impact for K is 2*(1-0.5)*10=10 >= 7 → sit
    const p = makePlayer({ position: 'K', status: 'questionable' })
    expect(injuryRecommendation(p)).toBe('sit')
  })

  it('questionable P → monitor (impact < 7)', () => {
    // questionable = 0.5, impact = 1*(1-0.5)*10=5 < 7 → monitor
    const p = makePlayer({ position: 'P', status: 'questionable' })
    expect(injuryRecommendation(p)).toBe('monitor')
  })

  it('probable → start (probability 0.85 >= 0.75)', () => {
    const p = makePlayer({ position: 'WR', status: 'probable' })
    expect(injuryRecommendation(p)).toBe('start')
  })

  it('healthy → start', () => {
    const p = makePlayer({ position: 'QB', status: 'healthy' })
    expect(injuryRecommendation(p)).toBe('start')
  })

  it('questionable WR → sit (impact=3.5*10=35 >=7, prob 0.5 <0.55)', () => {
    const p = makePlayer({ position: 'WR', status: 'questionable' })
    // WR impact = 7*(1-0.5)*10 = 35 >= 7, prob = 0.5 < 0.55 → sit
    expect(injuryRecommendation(p)).toBe('sit')
  })
})

// ----- analyzeInjury -----

describe('analyzeInjury', () => {
  it('returns correct shape with all required fields', () => {
    const p = makePlayer({ position: 'QB', status: 'questionable', fantasyPoints: 25 })
    const result = analyzeInjury(p)
    expect(result).toHaveProperty('playerId')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('position')
    expect(result).toHaveProperty('playProbability')
    expect(result).toHaveProperty('expectedSnaps')
    expect(result).toHaveProperty('fantasyImpact')
    expect(result).toHaveProperty('teamImpactScore')
    expect(result).toHaveProperty('spreadImpact')
    expect(result).toHaveProperty('recommendation')
  })

  it('playProbability equals playProbabilityFromStatus result', () => {
    const p = makePlayer({ position: 'QB', status: 'questionable' })
    const result = analyzeInjury(p)
    expect(result.playProbability).toBe(0.5)
  })

  it('QB out has spreadImpact of -3.5', () => {
    const p = makePlayer({ position: 'QB', status: 'out' })
    const result = analyzeInjury(p)
    expect(result.spreadImpact).toBeCloseTo(-3.5)
  })

  it('preserves playerId and name', () => {
    const p = makePlayer({ playerId: 'abc123', name: 'Pat Mahomes', position: 'QB', status: 'out' })
    const result = analyzeInjury(p)
    expect(result.playerId).toBe('abc123')
    expect(result.name).toBe('Pat Mahomes')
  })

  it('DL on defense gets correct spreadImpact via analyzeInjury', () => {
    const p = makePlayer({ position: 'DL', status: 'out' })
    const result = analyzeInjury(p)
    // DL is defensive — analyzeInjury routes DL to non-offensive path → -1.0
    expect(result.spreadImpact).toBeCloseTo(-1.0)
  })
})

// ----- analyzeLineup -----

describe('analyzeLineup', () => {
  it('handles empty injury list', () => {
    const result = analyzeLineup([])
    expect(result.totalImpactScore).toBe(0)
    expect(result.keyInjuries).toHaveLength(0)
    expect(result.spreadAdjustment).toBe(0)
    expect(result.pickConfidencePenalty).toBe(0)
    expect(result.summary).toMatch(/no significant/i)
  })

  it('single out QB is a key injury', () => {
    const p = makePlayer({ playerId: 'qb1', position: 'QB', status: 'out' })
    const result = analyzeLineup([p])
    expect(result.keyInjuries).toHaveLength(1)
    expect(result.keyInjuries[0]!.playerId).toBe('qb1')
    expect(result.totalImpactScore).toBe(100)
  })

  it('multiple players aggregate totalImpactScore', () => {
    const qb = makePlayer({ playerId: 'qb1', position: 'QB', status: 'out' })
    const wr = makePlayer({ playerId: 'wr1', position: 'WR', status: 'out' })
    const result = analyzeLineup([qb, wr])
    // QB out = 100, WR out = 70
    expect(result.totalImpactScore).toBeCloseTo(170)
  })

  it('pickConfidencePenalty capped at 30', () => {
    const players: InjuredPlayer[] = [
      makePlayer({ playerId: 'a', position: 'QB', status: 'out' }),
      makePlayer({ playerId: 'b', position: 'WR', status: 'out' }),
      makePlayer({ playerId: 'c', position: 'RB', status: 'out' }),
      makePlayer({ playerId: 'd', position: 'TE', status: 'out' }),
    ]
    const result = analyzeLineup(players)
    expect(result.pickConfidencePenalty).toBeLessThanOrEqual(30)
  })

  it('summary lists key player names', () => {
    const p = makePlayer({ playerId: 'qb1', name: 'John Smith', position: 'QB', status: 'out' })
    const result = analyzeLineup([p])
    expect(result.summary).toContain('John Smith')
  })

  it('healthy players do not appear as key injuries', () => {
    const p = makePlayer({ playerId: 'wr1', position: 'WR', status: 'healthy' })
    const result = analyzeLineup([p])
    expect(result.keyInjuries).toHaveLength(0)
  })

  it('spreadAdjustment sums all spreadImpacts', () => {
    const qb = makePlayer({ playerId: 'qb1', position: 'QB', status: 'out' })
    const wr = makePlayer({ playerId: 'wr1', position: 'WR', status: 'out' })
    const result = analyzeLineup([qb, wr])
    // QB: -3.5, WR: -1.5 → total = -5.0
    expect(result.spreadAdjustment).toBeCloseTo(-5.0)
  })
})

// ----- estimateRecovery -----

describe('estimateRecovery', () => {
  it('knee + severe returns correct range', () => {
    const r = estimateRecovery('knee', 'severe')
    expect(r.minWeeks).toBe(8)
    expect(r.maxWeeks).toBe(16)
    expect(r.expectedWeeks).toBe(12)
  })

  it('knee + season-ending returns season-ending range', () => {
    const r = estimateRecovery('knee', 'season-ending')
    expect(r.minWeeks).toBe(16)
    expect(r.maxWeeks).toBe(52)
    expect(r.expectedWeeks).toBe(52)
  })

  it('illness + minor returns short recovery', () => {
    const r = estimateRecovery('illness', 'minor')
    expect(r.minWeeks).toBe(0)
    expect(r.maxWeeks).toBe(1)
    expect(r.expectedWeeks).toBe(0.5)
  })

  it('returnsThisWeek = false when weeksMissed is undefined', () => {
    const r = estimateRecovery('ankle', 'moderate')
    expect(r.returnsThisWeek).toBe(false)
  })

  it('returnsThisWeek = true when weeksMissed >= expectedWeeks', () => {
    const r = estimateRecovery('ankle', 'moderate', 4)
    // expectedWeeks for ankle moderate = 4
    expect(r.returnsThisWeek).toBe(true)
  })

  it('returnsThisWeek = false when weeksMissed < expectedWeeks', () => {
    const r = estimateRecovery('ankle', 'moderate', 2)
    expect(r.returnsThisWeek).toBe(false)
  })

  it('hamstring + minor', () => {
    const r = estimateRecovery('hamstring', 'minor')
    expect(r.minWeeks).toBe(1)
    expect(r.maxWeeks).toBe(2)
    expect(r.expectedWeeks).toBe(1.5)
  })

  it('concussion + moderate', () => {
    const r = estimateRecovery('concussion', 'moderate')
    expect(r.minWeeks).toBe(2)
    expect(r.maxWeeks).toBe(4)
    expect(r.expectedWeeks).toBe(3)
  })

  it('back + severe', () => {
    const r = estimateRecovery('back', 'severe')
    expect(r.minWeeks).toBe(6)
    expect(r.maxWeeks).toBe(16)
    expect(r.expectedWeeks).toBe(11)
  })

  it('foot + moderate', () => {
    const r = estimateRecovery('foot', 'moderate')
    expect(r.minWeeks).toBe(3)
    expect(r.maxWeeks).toBe(8)
    expect(r.expectedWeeks).toBe(5)
  })

  it('hand + severe', () => {
    const r = estimateRecovery('hand', 'severe')
    expect(r.minWeeks).toBe(4)
    expect(r.maxWeeks).toBe(8)
    expect(r.expectedWeeks).toBe(6)
  })

  it('shoulder + moderate', () => {
    const r = estimateRecovery('shoulder', 'moderate')
    expect(r.minWeeks).toBe(2)
    expect(r.maxWeeks).toBe(5)
    expect(r.expectedWeeks).toBe(3)
  })

  it('other + minor', () => {
    const r = estimateRecovery('other', 'minor')
    expect(r.minWeeks).toBe(1)
    expect(r.maxWeeks).toBe(2)
    expect(r.expectedWeeks).toBe(1.5)
  })
})

// ----- compareBothTeamInjuries -----

describe('compareBothTeamInjuries', () => {
  it('no injuries on either side → neutral', () => {
    const result = compareBothTeamInjuries([], [])
    expect(result.favoredTeam).toBe('neutral')
    expect(result.netSpreadAdjustment).toBe(0)
  })

  it('home QB out, no away injuries → favors away', () => {
    const homeQB = makePlayer({ playerId: 'qb1', position: 'QB', status: 'out' })
    const result = compareBothTeamInjuries([homeQB], [])
    // homeSpread = -3.5, awaySpread = 0
    // net = 0 - (-3.5) = 3.5 > 0.5 → away
    expect(result.favoredTeam).toBe('away')
    expect(result.netSpreadAdjustment).toBeGreaterThan(0.5)
  })

  it('away QB out, no home injuries → favors home', () => {
    const awayQB = makePlayer({ playerId: 'qb2', position: 'QB', status: 'out' })
    const result = compareBothTeamInjuries([], [awayQB])
    // net = -3.5 - 0 = -3.5 < -0.5 → home
    expect(result.favoredTeam).toBe('home')
    expect(result.netSpreadAdjustment).toBeLessThan(-0.5)
  })

  it('equal injuries → neutral', () => {
    const homeWR = makePlayer({ playerId: 'wr1', position: 'WR', status: 'probable' })
    const awayWR = makePlayer({ playerId: 'wr2', position: 'WR', status: 'probable' })
    const result = compareBothTeamInjuries([homeWR], [awayWR])
    expect(result.favoredTeam).toBe('neutral')
  })

  it('returns both lineup analyses', () => {
    const result = compareBothTeamInjuries([], [])
    expect(result).toHaveProperty('homeAnalysis')
    expect(result).toHaveProperty('awayAnalysis')
  })

  it('netSpreadAdjustment = awaySpread - homeSpread', () => {
    const homeWR = makePlayer({ playerId: 'wr1', position: 'WR', status: 'out' })
    const awayRB = makePlayer({ playerId: 'rb1', position: 'RB', status: 'out' })
    const result = compareBothTeamInjuries([homeWR], [awayRB])
    // homeSpread = -1.5, awaySpread = -1.0
    // net = -1.0 - (-1.5) = 0.5 → neutral (not > 0.5)
    expect(result.netSpreadAdjustment).toBeCloseTo(0.5)
  })
})

// ----- filterSignificantInjuries -----

describe('filterSignificantInjuries', () => {
  it('default filter excludes healthy and probable players', () => {
    const players: InjuredPlayer[] = [
      makePlayer({ playerId: 'a', status: 'healthy' }),
      makePlayer({ playerId: 'b', status: 'probable' }),
      makePlayer({ playerId: 'c', status: 'questionable' }),
      makePlayer({ playerId: 'd', status: 'doubtful' }),
      makePlayer({ playerId: 'e', status: 'out' }),
    ]
    const result = filterSignificantInjuries(players)
    const ids = result.map((p) => p.playerId)
    expect(ids).not.toContain('a')
    expect(ids).not.toContain('b')
    expect(ids).toContain('c')
    expect(ids).toContain('d')
    expect(ids).toContain('e')
  })

  it('minStatus=out filters to only out players', () => {
    const players: InjuredPlayer[] = [
      makePlayer({ playerId: 'a', status: 'doubtful' }),
      makePlayer({ playerId: 'b', status: 'out' }),
    ]
    const result = filterSignificantInjuries(players, 'out')
    expect(result).toHaveLength(1)
    expect(result[0]!.playerId).toBe('b')
  })

  it('minStatus=probable includes probable, doubtful, out', () => {
    const players: InjuredPlayer[] = [
      makePlayer({ playerId: 'a', status: 'healthy' }),
      makePlayer({ playerId: 'b', status: 'probable' }),
      makePlayer({ playerId: 'c', status: 'questionable' }),
    ]
    const result = filterSignificantInjuries(players, 'probable')
    const ids = result.map((p) => p.playerId)
    expect(ids).not.toContain('a')
    expect(ids).toContain('b')
    expect(ids).toContain('c')
  })

  it('sorts by teamImpactScore descending', () => {
    const players: InjuredPlayer[] = [
      makePlayer({ playerId: 'p1', position: 'WR', status: 'out' }),
      makePlayer({ playerId: 'p2', position: 'QB', status: 'out' }),
    ]
    const result = filterSignificantInjuries(players)
    // QB impact > WR impact
    expect(result[0]!.position).toBe('QB')
  })

  it('empty list returns empty', () => {
    expect(filterSignificantInjuries([])).toHaveLength(0)
  })
})

// ----- formatInjuryLine -----

describe('formatInjuryLine', () => {
  it('formats correctly for a questionable player', () => {
    const p = makePlayer({
      name: 'Patrick Mahomes',
      position: 'QB',
      status: 'questionable',
      bodyPart: 'knee',
    })
    const line = formatInjuryLine(p)
    expect(line).toContain('Patrick Mahomes')
    expect(line).toContain('QB')
    expect(line).toContain('Knee')
    expect(line).toContain('Questionable')
    expect(line).toContain('50%')
  })

  it('formats out player with 0% chance', () => {
    const p = makePlayer({ name: 'Test Player', position: 'WR', status: 'out', bodyPart: 'ankle' })
    const line = formatInjuryLine(p)
    expect(line).toContain('0%')
    expect(line).toContain('Out')
  })

  it('formats healthy player with 100%', () => {
    const p = makePlayer({ name: 'Healthy', position: 'RB', status: 'healthy', bodyPart: 'hamstring' })
    const line = formatInjuryLine(p)
    expect(line).toContain('100%')
    expect(line).toContain('Healthy')
  })

  it('formats doubtful with 15%', () => {
    const p = makePlayer({ name: 'D. Player', position: 'TE', status: 'doubtful', bodyPart: 'back' })
    const line = formatInjuryLine(p)
    expect(line).toContain('15%')
    expect(line).toContain('Doubtful')
  })

  it('capitalizes body part', () => {
    const p = makePlayer({ name: 'Test', position: 'LB', status: 'out', bodyPart: 'concussion' })
    const line = formatInjuryLine(p)
    expect(line).toContain('Concussion')
  })
})

// ----- totalSnapShareLoss -----

describe('totalSnapShareLoss', () => {
  it('returns 0 for empty list', () => {
    expect(totalSnapShareLoss([])).toBe(0)
  })

  it('out QB loses all 95 snaps', () => {
    const p = makePlayer({ position: 'QB', status: 'out' })
    expect(totalSnapShareLoss([p])).toBeCloseTo(95)
  })

  it('healthy player loses 0 snaps', () => {
    const p = makePlayer({ position: 'QB', status: 'healthy' })
    expect(totalSnapShareLoss([p])).toBeCloseTo(0)
  })

  it('questionable WR loses 32.5 snaps (65 * 0.5)', () => {
    const p = makePlayer({ position: 'WR', status: 'questionable' })
    // full=65, actual=65*0.5=32.5, loss=32.5
    expect(totalSnapShareLoss([p])).toBeCloseTo(32.5)
  })

  it('aggregates multiple players', () => {
    const qb = makePlayer({ playerId: 'qb1', position: 'QB', status: 'out' })
    const wr = makePlayer({ playerId: 'wr1', position: 'WR', status: 'out' })
    // QB loss=95, WR loss=65, total=160
    expect(totalSnapShareLoss([qb, wr])).toBeCloseTo(160)
  })

  it('uses provided snapSharePct for custom snap loss', () => {
    const p = makePlayer({ position: 'WR', status: 'out', snapSharePct: 80 })
    // full default = 65, actual = 80*0 = 0, loss = 65-0 = 65
    expect(totalSnapShareLoss([p])).toBeCloseTo(65)
  })
})
