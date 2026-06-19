/**
 * handball-analytics.test.ts
 * 140+ tests for the team/Olympic handball analytics library.
 */
import { describe, it, expect } from 'vitest'
import {
  shootingPercentage,
  shotsByZone,
  sevenMeterEfficiency,
  fastBreakRate,
  shotEfficiencyIndex,
  savePercentage,
  savesByZone,
  goalsAgainstAverage,
  sevenMeterSaveRate,
  playerEfficiency,
  goalContribution,
  attackEfficiency,
  twoMinutePenaltyRate,
  playerRating,
  possessionEfficiency,
  defensiveEfficiency,
  tempoRating,
  pivotEffectiveness,
  transitionRate,
  goalDifferential,
  halfTimeScore,
  comebackIndex,
  winProbabilityFromLead,
  expectedGoals,
  disciplineScore,
  formIndex,
  streakLength,
  dkHandballPoints,
  dkProjection,
} from '@/lib/sports/handball-analytics'
import type { DKHandballStats } from '@/lib/sports/handball-analytics'

// ---------------------------------------------------------------------------
// 1. Shooting analytics
// ---------------------------------------------------------------------------

describe('shootingPercentage', () => {
  it('returns 0 when shots is 0', () => {
    expect(shootingPercentage(0, 0)).toBe(0)
  })
  it('returns 0 when shots is 0 even with goals (defensive)', () => {
    expect(shootingPercentage(5, 0)).toBe(0)
  })
  it('computes ratio for half conversion', () => {
    expect(shootingPercentage(5, 10)).toBe(0.5)
  })
  it('computes perfect conversion', () => {
    expect(shootingPercentage(10, 10)).toBe(1)
  })
  it('computes zero conversion', () => {
    expect(shootingPercentage(0, 8)).toBe(0)
  })
  it('computes a typical handball clip ~0.6', () => {
    expect(shootingPercentage(30, 50)).toBe(0.6)
  })
  it('handles single shot scored', () => {
    expect(shootingPercentage(1, 1)).toBe(1)
  })
  it('handles single shot missed', () => {
    expect(shootingPercentage(0, 1)).toBe(0)
  })
})

describe('shotsByZone', () => {
  it('returns an empty map for no shots', () => {
    const m = shotsByZone([])
    expect(m.size).toBe(0)
  })
  it('aggregates a single wing goal', () => {
    const m = shotsByZone([{ zone: 'wing', scored: true }])
    expect(m.get('wing')).toEqual({ attempts: 1, goals: 1, pct: 1 })
  })
  it('aggregates a single wing miss', () => {
    const m = shotsByZone([{ zone: 'wing', scored: false }])
    expect(m.get('wing')).toEqual({ attempts: 1, goals: 0, pct: 0 })
  })
  it('aggregates multiple zones independently', () => {
    const m = shotsByZone([
      { zone: 'wing', scored: true },
      { zone: 'wing', scored: false },
      { zone: 'line', scored: true },
      { zone: 'back', scored: false },
    ])
    expect(m.get('wing')).toEqual({ attempts: 2, goals: 1, pct: 0.5 })
    expect(m.get('line')).toEqual({ attempts: 1, goals: 1, pct: 1 })
    expect(m.get('back')).toEqual({ attempts: 1, goals: 0, pct: 0 })
  })
  it('counts total attempts correctly', () => {
    const m = shotsByZone([
      { zone: '7m', scored: true },
      { zone: '7m', scored: true },
      { zone: '7m', scored: false },
    ])
    expect(m.get('7m')?.attempts).toBe(3)
    expect(m.get('7m')?.goals).toBe(2)
    expect(m.get('7m')?.pct).toBeCloseTo(2 / 3, 10)
  })
  it('handles fastbreak zone', () => {
    const m = shotsByZone([
      { zone: 'fastbreak', scored: true },
      { zone: 'fastbreak', scored: true },
    ])
    expect(m.get('fastbreak')).toEqual({ attempts: 2, goals: 2, pct: 1 })
  })
  it('handles breakthrough zone', () => {
    const m = shotsByZone([{ zone: 'breakthrough', scored: false }])
    expect(m.get('breakthrough')?.pct).toBe(0)
  })
  it('produces correct number of distinct zones', () => {
    const m = shotsByZone([
      { zone: 'wing', scored: true },
      { zone: 'line', scored: true },
      { zone: 'back', scored: true },
    ])
    expect(m.size).toBe(3)
  })
  it('only counts goals when scored is true', () => {
    const m = shotsByZone([
      { zone: 'back', scored: false },
      { zone: 'back', scored: false },
      { zone: 'back', scored: true },
    ])
    expect(m.get('back')?.goals).toBe(1)
    expect(m.get('back')?.attempts).toBe(3)
  })
})

describe('sevenMeterEfficiency', () => {
  it('returns 0 when attempts is 0', () => {
    expect(sevenMeterEfficiency(0, 0)).toBe(0)
  })
  it('returns 0 when attempts is 0 even with scored', () => {
    expect(sevenMeterEfficiency(3, 0)).toBe(0)
  })
  it('computes full conversion', () => {
    expect(sevenMeterEfficiency(5, 5)).toBe(1)
  })
  it('computes 80% conversion', () => {
    expect(sevenMeterEfficiency(4, 5)).toBe(0.8)
  })
  it('computes zero conversion', () => {
    expect(sevenMeterEfficiency(0, 4)).toBe(0)
  })
  it('handles single penalty made', () => {
    expect(sevenMeterEfficiency(1, 1)).toBe(1)
  })
})

describe('fastBreakRate', () => {
  it('returns 0 when totalGoals is 0', () => {
    expect(fastBreakRate(0, 0)).toBe(0)
  })
  it('returns 0 when totalGoals is 0 even with fast break goals', () => {
    expect(fastBreakRate(3, 0)).toBe(0)
  })
  it('computes 30% fast break share', () => {
    expect(fastBreakRate(9, 30)).toBe(0.3)
  })
  it('computes all goals from fast break', () => {
    expect(fastBreakRate(10, 10)).toBe(1)
  })
  it('computes none from fast break', () => {
    expect(fastBreakRate(0, 25)).toBe(0)
  })
  it('computes half from fast break', () => {
    expect(fastBreakRate(10, 20)).toBe(0.5)
  })
})

describe('shotEfficiencyIndex', () => {
  it('returns 0 with no zones', () => {
    expect(shotEfficiencyIndex([])).toBe(0)
  })
  it('returns 0 when all attempts are 0', () => {
    expect(
      shotEfficiencyIndex([
        { zone: 'wing', goals: 0, attempts: 0 },
        { zone: 'line', goals: 0, attempts: 0 },
      ]),
    ).toBe(0)
  })
  it('computes weighted efficiency across zones', () => {
    expect(
      shotEfficiencyIndex([
        { zone: 'wing', goals: 5, attempts: 10 },
        { zone: 'line', goals: 5, attempts: 10 },
      ]),
    ).toBe(0.5)
  })
  it('weights zones by total attempts (not simple average)', () => {
    // 9 goals / 30 attempts = 0.3 overall even though one zone is 1.0
    expect(
      shotEfficiencyIndex([
        { zone: 'fastbreak', goals: 8, attempts: 10 },
        { zone: 'back', goals: 1, attempts: 20 },
      ]),
    ).toBeCloseTo(9 / 30, 10)
  })
  it('handles a single zone', () => {
    expect(
      shotEfficiencyIndex([{ zone: 'line', goals: 7, attempts: 10 }]),
    ).toBe(0.7)
  })
  it('returns 1 when every shot scores', () => {
    expect(
      shotEfficiencyIndex([
        { zone: 'wing', goals: 3, attempts: 3 },
        { zone: '7m', goals: 2, attempts: 2 },
      ]),
    ).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Goalkeeper analytics
// ---------------------------------------------------------------------------

describe('savePercentage', () => {
  it('returns 0 when shotsOnGoal is 0', () => {
    expect(savePercentage(0, 0)).toBe(0)
  })
  it('returns 0 when shotsOnGoal is 0 even with saves', () => {
    expect(savePercentage(5, 0)).toBe(0)
  })
  it('computes 30% save rate', () => {
    expect(savePercentage(6, 20)).toBe(0.3)
  })
  it('computes a strong 40% save rate', () => {
    expect(savePercentage(8, 20)).toBe(0.4)
  })
  it('computes perfect save rate', () => {
    expect(savePercentage(10, 10)).toBe(1)
  })
  it('computes zero save rate', () => {
    expect(savePercentage(0, 15)).toBe(0)
  })
})

describe('savesByZone', () => {
  it('returns empty map for no saves', () => {
    expect(savesByZone([]).size).toBe(0)
  })
  it('computes save % for a single zone', () => {
    const m = savesByZone([
      { zone: 'wing', saved: true },
      { zone: 'wing', saved: false },
    ])
    expect(m.get('wing')).toBe(0.5)
  })
  it('computes per-zone independently', () => {
    const m = savesByZone([
      { zone: 'wing', saved: true },
      { zone: 'wing', saved: true },
      { zone: 'back', saved: false },
      { zone: 'back', saved: false },
    ])
    expect(m.get('wing')).toBe(1)
    expect(m.get('back')).toBe(0)
  })
  it('computes 7m save zone', () => {
    const m = savesByZone([
      { zone: '7m', saved: true },
      { zone: '7m', saved: false },
      { zone: '7m', saved: false },
    ])
    expect(m.get('7m')).toBeCloseTo(1 / 3, 10)
  })
  it('returns correct number of zones', () => {
    const m = savesByZone([
      { zone: 'wing', saved: true },
      { zone: 'line', saved: false },
      { zone: 'back', saved: true },
    ])
    expect(m.size).toBe(3)
  })
  it('handles a zone where none were saved', () => {
    const m = savesByZone([
      { zone: 'fastbreak', saved: false },
      { zone: 'fastbreak', saved: false },
    ])
    expect(m.get('fastbreak')).toBe(0)
  })
  it('handles a zone where all were saved', () => {
    const m = savesByZone([{ zone: 'line', saved: true }])
    expect(m.get('line')).toBe(1)
  })
})

describe('goalsAgainstAverage', () => {
  it('returns 0 when minutesPlayed is 0', () => {
    expect(goalsAgainstAverage(10, 0)).toBe(0)
  })
  it('normalizes 30 goals in 30 minutes to 60 GAA', () => {
    expect(goalsAgainstAverage(30, 30)).toBe(60)
  })
  it('keeps full-game GAA equal to goals allowed', () => {
    expect(goalsAgainstAverage(25, 60)).toBe(25)
  })
  it('doubles GAA for a half game', () => {
    expect(goalsAgainstAverage(12, 30)).toBe(24)
  })
  it('respects a custom game length', () => {
    expect(goalsAgainstAverage(10, 30, 30)).toBe(10)
  })
  it('uses default of 60 minutes', () => {
    expect(goalsAgainstAverage(5, 15)).toBe(20)
  })
  it('returns 0 for 0 goals allowed', () => {
    expect(goalsAgainstAverage(0, 60)).toBe(0)
  })
})

describe('sevenMeterSaveRate', () => {
  it('returns 0 when faced is 0', () => {
    expect(sevenMeterSaveRate(0, 0)).toBe(0)
  })
  it('returns 0 when faced is 0 even with saves', () => {
    expect(sevenMeterSaveRate(2, 0)).toBe(0)
  })
  it('computes 25% penalty save rate', () => {
    expect(sevenMeterSaveRate(1, 4)).toBe(0.25)
  })
  it('computes a full penalty save rate', () => {
    expect(sevenMeterSaveRate(3, 3)).toBe(1)
  })
  it('computes zero penalty saves', () => {
    expect(sevenMeterSaveRate(0, 5)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Player performance
// ---------------------------------------------------------------------------

describe('playerEfficiency', () => {
  it('returns 0 with all zeros', () => {
    expect(playerEfficiency(0, 0, 0, 0, 0)).toBe(0)
  })
  it('counts goals fully', () => {
    expect(playerEfficiency(5, 0, 0, 0, 0)).toBe(5)
  })
  it('counts assists at half weight', () => {
    expect(playerEfficiency(0, 4, 0, 0, 0)).toBe(2)
  })
  it('subtracts turnovers', () => {
    expect(playerEfficiency(0, 0, 3, 0, 0)).toBe(-3)
  })
  it('adds steals and blocks', () => {
    expect(playerEfficiency(0, 0, 0, 2, 3)).toBe(5)
  })
  it('combines all components', () => {
    // 6 + 2*0.5 + 1 + 2 - 3 = 6 + 1 + 1 + 2 - 3 = 7
    expect(playerEfficiency(6, 2, 3, 1, 2)).toBe(7)
  })
  it('can be negative', () => {
    expect(playerEfficiency(0, 0, 10, 0, 0)).toBe(-10)
  })
})

describe('goalContribution', () => {
  it('returns 0 with no goals or assists', () => {
    expect(goalContribution(0, 0)).toBe(0)
  })
  it('sums goals and assists', () => {
    expect(goalContribution(7, 3)).toBe(10)
  })
  it('handles assists only', () => {
    expect(goalContribution(0, 5)).toBe(5)
  })
  it('handles goals only', () => {
    expect(goalContribution(9, 0)).toBe(9)
  })
})

describe('attackEfficiency', () => {
  it('returns 0 when possessions is 0', () => {
    expect(attackEfficiency(0, 0)).toBe(0)
  })
  it('returns 0 when possessions is 0 even with goals', () => {
    expect(attackEfficiency(5, 0)).toBe(0)
  })
  it('computes goals per possession', () => {
    expect(attackEfficiency(30, 50)).toBe(0.6)
  })
  it('computes a perfect possession conversion', () => {
    expect(attackEfficiency(10, 10)).toBe(1)
  })
  it('computes zero conversion', () => {
    expect(attackEfficiency(0, 40)).toBe(0)
  })
})

describe('twoMinutePenaltyRate', () => {
  it('returns 0 when minutesPlayed is 0', () => {
    expect(twoMinutePenaltyRate(2, 0)).toBe(0)
  })
  it('normalizes 1 penalty in 30 minutes to 2 per 60', () => {
    expect(twoMinutePenaltyRate(1, 30)).toBe(2)
  })
  it('keeps full-game rate equal to penalties', () => {
    expect(twoMinutePenaltyRate(3, 60)).toBe(3)
  })
  it('returns 0 with no penalties', () => {
    expect(twoMinutePenaltyRate(0, 60)).toBe(0)
  })
  it('scales for partial minutes', () => {
    expect(twoMinutePenaltyRate(2, 20)).toBe(6)
  })
})

describe('playerRating', () => {
  it('returns 0 with all zeros', () => {
    expect(
      playerRating({
        goals: 0,
        assists: 0,
        saves: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        technicalFaults: 0,
      }),
    ).toBe(0)
  })
  it('counts goals fully', () => {
    expect(
      playerRating({
        goals: 8,
        assists: 0,
        saves: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        technicalFaults: 0,
      }),
    ).toBe(8)
  })
  it('weights assists and saves at half', () => {
    expect(
      playerRating({
        goals: 0,
        assists: 4,
        saves: 6,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        technicalFaults: 0,
      }),
    ).toBe(2 + 3)
  })
  it('subtracts turnovers and technical faults', () => {
    expect(
      playerRating({
        goals: 0,
        assists: 0,
        saves: 0,
        steals: 0,
        blocks: 0,
        turnovers: 2,
        technicalFaults: 3,
      }),
    ).toBe(-5)
  })
  it('combines all components', () => {
    // 5 + 2*0.5 + 4*0.5 + 1 + 1 - 1 - 1 = 5 + 1 + 2 + 1 + 1 - 1 - 1 = 8
    expect(
      playerRating({
        goals: 5,
        assists: 2,
        saves: 4,
        steals: 1,
        blocks: 1,
        turnovers: 1,
        technicalFaults: 1,
      }),
    ).toBe(8)
  })
  it('can be negative when faults dominate', () => {
    expect(
      playerRating({
        goals: 0,
        assists: 0,
        saves: 0,
        steals: 0,
        blocks: 0,
        turnovers: 5,
        technicalFaults: 5,
      }),
    ).toBe(-10)
  })
})

// ---------------------------------------------------------------------------
// 4. Team analytics
// ---------------------------------------------------------------------------

describe('possessionEfficiency', () => {
  it('returns 0 when possessions is 0', () => {
    expect(possessionEfficiency(0, 0)).toBe(0)
  })
  it('computes team goals per possession', () => {
    expect(possessionEfficiency(28, 50)).toBe(0.56)
  })
  it('computes perfect efficiency', () => {
    expect(possessionEfficiency(50, 50)).toBe(1)
  })
  it('returns 0 with no goals', () => {
    expect(possessionEfficiency(0, 55)).toBe(0)
  })
})

describe('defensiveEfficiency', () => {
  it('returns 0 when opponentPossessions is 0', () => {
    expect(defensiveEfficiency(0, 0)).toBe(0)
  })
  it('returns 0 when opponentPossessions is 0 even with goals allowed', () => {
    expect(defensiveEfficiency(10, 0)).toBe(0)
  })
  it('computes goals allowed per possession', () => {
    expect(defensiveEfficiency(25, 50)).toBe(0.5)
  })
  it('returns 0 with no goals allowed', () => {
    expect(defensiveEfficiency(0, 48)).toBe(0)
  })
  it('computes a leaky defense', () => {
    expect(defensiveEfficiency(40, 50)).toBe(0.8)
  })
})

describe('tempoRating', () => {
  it('classifies below 50 as slow', () => {
    expect(tempoRating(49)).toBe('slow')
  })
  it('classifies exactly 50 as moderate (boundary)', () => {
    expect(tempoRating(50)).toBe('moderate')
  })
  it('classifies mid-range as moderate', () => {
    expect(tempoRating(55)).toBe('moderate')
  })
  it('classifies exactly 60 as moderate (boundary)', () => {
    expect(tempoRating(60)).toBe('moderate')
  })
  it('classifies above 60 as fast', () => {
    expect(tempoRating(61)).toBe('fast')
  })
  it('classifies far above 60 as fast', () => {
    expect(tempoRating(80)).toBe('fast')
  })
  it('classifies very low as slow', () => {
    expect(tempoRating(30)).toBe('slow')
  })
  it('normalizes against a custom game length (30 min)', () => {
    // 30 possessions in 30 min -> 60 per 60 -> moderate
    expect(tempoRating(30, 30)).toBe('moderate')
  })
  it('classifies fast with custom game length', () => {
    // 40 possessions in 30 min -> 80 per 60 -> fast
    expect(tempoRating(40, 30)).toBe('fast')
  })
  it('returns slow for 0 game minutes (guard)', () => {
    expect(tempoRating(50, 0)).toBe('slow')
  })
})

describe('pivotEffectiveness', () => {
  it('returns 0 when lineAttempts is 0', () => {
    expect(pivotEffectiveness(0, 0)).toBe(0)
  })
  it('returns 0 when lineAttempts is 0 even with goals', () => {
    expect(pivotEffectiveness(3, 0)).toBe(0)
  })
  it('computes line conversion', () => {
    expect(pivotEffectiveness(7, 10)).toBe(0.7)
  })
  it('computes perfect line conversion', () => {
    expect(pivotEffectiveness(5, 5)).toBe(1)
  })
  it('computes zero conversion', () => {
    expect(pivotEffectiveness(0, 6)).toBe(0)
  })
})

describe('transitionRate', () => {
  it('returns 0 when totalPossessions is 0', () => {
    expect(transitionRate(0, 0)).toBe(0)
  })
  it('returns 0 when totalPossessions is 0 even with fast breaks', () => {
    expect(transitionRate(5, 0)).toBe(0)
  })
  it('computes 20% transition rate', () => {
    expect(transitionRate(10, 50)).toBe(0.2)
  })
  it('computes all transition', () => {
    expect(transitionRate(50, 50)).toBe(1)
  })
  it('returns 0 with no fast breaks', () => {
    expect(transitionRate(0, 45)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Match analytics
// ---------------------------------------------------------------------------

describe('goalDifferential', () => {
  it('returns positive for a home win', () => {
    expect(goalDifferential(30, 25)).toBe(5)
  })
  it('returns negative for a home loss', () => {
    expect(goalDifferential(24, 28)).toBe(-4)
  })
  it('returns 0 for a draw', () => {
    expect(goalDifferential(27, 27)).toBe(0)
  })
  it('handles a shutout-style margin', () => {
    expect(goalDifferential(20, 0)).toBe(20)
  })
})

describe('halfTimeScore', () => {
  it('returns 0 for an empty array', () => {
    expect(halfTimeScore([])).toBe(0)
  })
  it('sums first-half goals', () => {
    expect(halfTimeScore([5, 4, 6])).toBe(15)
  })
  it('handles a single interval', () => {
    expect(halfTimeScore([14])).toBe(14)
  })
  it('handles all zeros', () => {
    expect(halfTimeScore([0, 0, 0])).toBe(0)
  })
  it('handles many intervals', () => {
    expect(halfTimeScore([2, 2, 2, 2, 2])).toBe(10)
  })
})

describe('comebackIndex', () => {
  it('returns 0 on a loss regardless of deficits', () => {
    expect(comebackIndex([5, 7, 3], 'loss')).toBe(0)
  })
  it('returns max deficit overcome on a win', () => {
    expect(comebackIndex([2, 5, 3, 1], 'win')).toBe(5)
  })
  it('returns max deficit overcome on a draw', () => {
    expect(comebackIndex([4, 6, 2], 'draw')).toBe(6)
  })
  it('returns 0 on a win with no deficit', () => {
    expect(comebackIndex([], 'win')).toBe(0)
  })
  it('returns 0 on a win with only non-positive deficits', () => {
    expect(comebackIndex([0, 0], 'win')).toBe(0)
  })
  it('handles a single deficit value on a win', () => {
    expect(comebackIndex([8], 'win')).toBe(8)
  })
  it('returns 0 on loss even with a large deficit', () => {
    expect(comebackIndex([10], 'loss')).toBe(0)
  })
})

describe('winProbabilityFromLead', () => {
  it('returns 0.5 for a tied game with time remaining', () => {
    expect(winProbabilityFromLead(0, 30)).toBeCloseTo(0.5, 10)
  })
  it('returns 0.5 for a tied game with no time remaining', () => {
    expect(winProbabilityFromLead(0, 0)).toBeCloseTo(0.5, 10)
  })
  it('gives probability above 0.5 for a positive lead', () => {
    expect(winProbabilityFromLead(3, 20)).toBeGreaterThan(0.5)
  })
  it('gives probability below 0.5 for a negative lead', () => {
    expect(winProbabilityFromLead(-3, 20)).toBeLessThan(0.5)
  })
  it('stays within [0, 1]', () => {
    const p = winProbabilityFromLead(15, 1)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
  it('clamps a huge lead to at most 1', () => {
    expect(winProbabilityFromLead(100, 0)).toBeLessThanOrEqual(1)
  })
  it('clamps a huge deficit to at least 0', () => {
    expect(winProbabilityFromLead(-100, 0)).toBeGreaterThanOrEqual(0)
  })
  it('a lead is more decisive with less time remaining', () => {
    const early = winProbabilityFromLead(3, 50)
    const late = winProbabilityFromLead(3, 2)
    expect(late).toBeGreaterThan(early)
  })
  it('a deficit is more dire with less time remaining', () => {
    const early = winProbabilityFromLead(-3, 50)
    const late = winProbabilityFromLead(-3, 2)
    expect(late).toBeLessThan(early)
  })
  it('is symmetric around 0.5 for opposite leads', () => {
    const pos = winProbabilityFromLead(4, 10)
    const neg = winProbabilityFromLead(-4, 10)
    expect(pos + neg).toBeCloseTo(1, 10)
  })
})

describe('expectedGoals', () => {
  it('returns 0 for no shots', () => {
    expect(expectedGoals([])).toBe(0)
  })
  it('applies the wing weight 0.55', () => {
    expect(expectedGoals([{ zone: 'wing', attempts: 10 }])).toBeCloseTo(5.5, 10)
  })
  it('applies the line weight 0.65', () => {
    expect(expectedGoals([{ zone: 'line', attempts: 10 }])).toBeCloseTo(6.5, 10)
  })
  it('applies the back weight 0.45', () => {
    expect(expectedGoals([{ zone: 'back', attempts: 10 }])).toBeCloseTo(4.5, 10)
  })
  it('applies the fastbreak weight 0.75', () => {
    expect(expectedGoals([{ zone: 'fastbreak', attempts: 10 }])).toBeCloseTo(
      7.5,
      10,
    )
  })
  it('applies the breakthrough weight 0.7', () => {
    expect(
      expectedGoals([{ zone: 'breakthrough', attempts: 10 }]),
    ).toBeCloseTo(7, 10)
  })
  it('applies the 7m weight 0.78', () => {
    expect(expectedGoals([{ zone: '7m', attempts: 10 }])).toBeCloseTo(7.8, 10)
  })
  it('applies the default 0.5 to an unknown zone', () => {
    expect(expectedGoals([{ zone: 'mystery', attempts: 10 }])).toBeCloseTo(
      5,
      10,
    )
  })
  it('sums across multiple zones', () => {
    // 10*0.55 + 10*0.75 = 5.5 + 7.5 = 13
    expect(
      expectedGoals([
        { zone: 'wing', attempts: 10 },
        { zone: 'fastbreak', attempts: 10 },
      ]),
    ).toBeCloseTo(13, 10)
  })
  it('returns 0 when all attempts are 0', () => {
    expect(
      expectedGoals([
        { zone: 'wing', attempts: 0 },
        { zone: 'line', attempts: 0 },
      ]),
    ).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Discipline & form
// ---------------------------------------------------------------------------

describe('disciplineScore', () => {
  it('returns 0 with no penalties', () => {
    expect(disciplineScore(0, 0, 0)).toBe(0)
  })
  it('weights 2-minute suspensions at 1', () => {
    expect(disciplineScore(3, 0, 0)).toBe(3)
  })
  it('weights red cards at 3', () => {
    expect(disciplineScore(0, 2, 0)).toBe(6)
  })
  it('weights blue cards at 5', () => {
    expect(disciplineScore(0, 0, 1)).toBe(5)
  })
  it('combines all penalty types', () => {
    // 2*1 + 1*3 + 1*5 = 10
    expect(disciplineScore(2, 1, 1)).toBe(10)
  })
  it('scales with multiple of each', () => {
    expect(disciplineScore(4, 2, 2)).toBe(4 + 6 + 10)
  })
})

describe('formIndex', () => {
  it('returns 0 for an empty list', () => {
    expect(formIndex([])).toBe(0)
  })
  it('weights the most recent result 2x (single win)', () => {
    // single element is also most recent -> 3*2 = 6
    expect(formIndex(['W'])).toBe(6)
  })
  it('weights the most recent result 2x (single loss)', () => {
    expect(formIndex(['L'])).toBe(0)
  })
  it('weights the most recent draw 2x', () => {
    expect(formIndex(['D'])).toBe(2)
  })
  it('combines older results at 1x with recent at 2x', () => {
    // W(1x)=3, D(1x)=1, W(2x most recent)=6 => 10
    expect(formIndex(['W', 'D', 'W'])).toBe(10)
  })
  it('handles all losses', () => {
    expect(formIndex(['L', 'L', 'L'])).toBe(0)
  })
  it('handles all wins (oldest 1x, recent 2x)', () => {
    // 3 + 3 + 6 = 12
    expect(formIndex(['W', 'W', 'W'])).toBe(12)
  })
  it('treats most recent loss with no boost effect', () => {
    // W(1x)=3, L(2x)=0 => 3
    expect(formIndex(['W', 'L'])).toBe(3)
  })
})

describe('streakLength', () => {
  it('returns none/0 for an empty list', () => {
    expect(streakLength([])).toEqual({ type: 'none', length: 0 })
  })
  it('detects a single-result streak', () => {
    expect(streakLength(['W'])).toEqual({ type: 'W', length: 1 })
  })
  it('measures a win streak from the end', () => {
    expect(streakLength(['L', 'W', 'W', 'W'])).toEqual({ type: 'W', length: 3 })
  })
  it('measures a loss streak from the end', () => {
    expect(streakLength(['W', 'W', 'L', 'L'])).toEqual({ type: 'L', length: 2 })
  })
  it('measures a draw streak from the end', () => {
    expect(streakLength(['W', 'D', 'D'])).toEqual({ type: 'D', length: 2 })
  })
  it('stops at the first differing result', () => {
    expect(streakLength(['W', 'W', 'W', 'L'])).toEqual({ type: 'L', length: 1 })
  })
  it('handles a full uniform streak', () => {
    expect(streakLength(['W', 'W', 'W', 'W'])).toEqual({ type: 'W', length: 4 })
  })
  it('uses only the trailing run, ignoring earlier matches', () => {
    expect(streakLength(['W', 'L', 'W', 'W'])).toEqual({ type: 'W', length: 2 })
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy (Handball)
// ---------------------------------------------------------------------------

const emptyStats: DKHandballStats = {
  goals: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  saves: 0,
  twoMinutes: 0,
  turnovers: 0,
  sevenMeterGoals: 0,
}

describe('dkHandballPoints', () => {
  it('returns 0 for all-zero stats', () => {
    expect(dkHandballPoints(emptyStats)).toBe(0)
  })
  it('scores goals at 8', () => {
    expect(dkHandballPoints({ ...emptyStats, goals: 3 })).toBe(24)
  })
  it('scores assists at 4', () => {
    expect(dkHandballPoints({ ...emptyStats, assists: 2 })).toBe(8)
  })
  it('scores steals at 3', () => {
    expect(dkHandballPoints({ ...emptyStats, steals: 2 })).toBe(6)
  })
  it('scores blocks at 3', () => {
    expect(dkHandballPoints({ ...emptyStats, blocks: 2 })).toBe(6)
  })
  it('scores saves at 3', () => {
    expect(dkHandballPoints({ ...emptyStats, saves: 5 })).toBe(15)
  })
  it('scores 7m goal bonus at 2', () => {
    expect(dkHandballPoints({ ...emptyStats, sevenMeterGoals: 2 })).toBe(4)
  })
  it('penalizes 2-minute suspensions at -1', () => {
    expect(dkHandballPoints({ ...emptyStats, twoMinutes: 3 })).toBe(-3)
  })
  it('penalizes turnovers at -1', () => {
    expect(dkHandballPoints({ ...emptyStats, turnovers: 4 })).toBe(-4)
  })
  it('combines all components', () => {
    // goals 5*8=40, assists 3*4=12, steals 2*3=6, blocks 1*3=3,
    // saves 0, 7m goals 2*2=4, 2min 1*-1=-1, turnovers 2*-1=-2
    // total = 40+12+6+3+0+4-1-2 = 62
    expect(
      dkHandballPoints({
        goals: 5,
        assists: 3,
        steals: 2,
        blocks: 1,
        saves: 0,
        twoMinutes: 1,
        turnovers: 2,
        sevenMeterGoals: 2,
      }),
    ).toBe(62)
  })
  it('adds the 7m bonus on top of goal value (goals counts all)', () => {
    // a goalkeeper-line stat line stressing saves + goals
    // goals 2*8=16, saves 8*3=24, 7m goals 1*2=2 => 42
    expect(
      dkHandballPoints({
        ...emptyStats,
        goals: 2,
        saves: 8,
        sevenMeterGoals: 1,
      }),
    ).toBe(42)
  })
  it('can be negative when penalties dominate', () => {
    expect(
      dkHandballPoints({ ...emptyStats, twoMinutes: 5, turnovers: 5 }),
    ).toBe(-10)
  })
})

describe('dkProjection', () => {
  it('returns 0 for an empty array', () => {
    expect(dkProjection([])).toBe(0)
  })
  it('returns the single game value for one game', () => {
    const g: DKHandballStats = { ...emptyStats, goals: 5 }
    // only game is also most recent: (40*3)/3 = 40
    expect(dkProjection([g])).toBe(40)
  })
  it('weights the most recent game 3x', () => {
    const older: DKHandballStats = { ...emptyStats, goals: 1 } // 8
    const recent: DKHandballStats = { ...emptyStats, goals: 5 } // 40
    // (8*1 + 40*3) / (1 + 3) = (8 + 120) / 4 = 32
    expect(dkProjection([older, recent])).toBe(32)
  })
  it('averages identical games to that value', () => {
    const g: DKHandballStats = { ...emptyStats, goals: 2 } // 16
    expect(dkProjection([g, g, g])).toBe(16)
  })
  it('weights correctly across three games', () => {
    const a: DKHandballStats = { ...emptyStats, goals: 1 } // 8
    const b: DKHandballStats = { ...emptyStats, goals: 2 } // 16
    const c: DKHandballStats = { ...emptyStats, goals: 3 } // 24 (recent, 3x)
    // (8 + 16 + 24*3) / (1 + 1 + 3) = (8 + 16 + 72) / 5 = 96 / 5 = 19.2
    expect(dkProjection([a, b, c])).toBeCloseTo(19.2, 10)
  })
  it('handles negative-scoring games', () => {
    const a: DKHandballStats = { ...emptyStats, turnovers: 2 } // -2
    const b: DKHandballStats = { ...emptyStats, goals: 1 } // 8 (recent, 3x)
    // (-2*1 + 8*3) / 4 = (-2 + 24) / 4 = 22 / 4 = 5.5
    expect(dkProjection([a, b])).toBeCloseTo(5.5, 10)
  })
})
