import { describe, it, expect } from 'vitest'
import {
  goalDifferential,
  shootoutResult,
  advantageSwim,
  periodScore,
  teamPoints,
  quarterTimeRemaining,
  shootingPercentage,
  shotsByPosition,
  goalKeeperSavePercentage,
  counterAttackRate,
  exclusionToGoalConversion,
  driverVsPerimeter,
  playerEfficiencyRating,
  assistToGoalRatio,
  exclusionRate,
  swimSpeed,
  sprintCapacity,
  goalieReactionScore,
  extraManEfficiency,
  pressureDefenseRating,
  offensiveEfficiency,
  defensiveEfficiency,
  netRating,
  transitionRate,
  penaltyShotRate,
  penaltyConversionRate,
  cornerThrowSuccess,
  sixMeterShotRate,
  pressureDefense,
  possessionTime,
  homeAdvantage,
  momentumIndex,
  fatigueAdjustedRating,
  divingPenaltyRate,
  dkWaterPoloPoints,
  dkProjection,
} from '@/lib/sports/water-polo-analytics'

// ---------------------------------------------------------------------------
// 1. Scoring and game rules
// ---------------------------------------------------------------------------

describe('goalDifferential', () => {
  it('returns positive when goalsFor > goalsAgainst', () => {
    expect(goalDifferential(8, 5)).toBe(3)
  })

  it('returns negative when goalsFor < goalsAgainst', () => {
    expect(goalDifferential(3, 7)).toBe(-4)
  })

  it('returns 0 for equal goals', () => {
    expect(goalDifferential(4, 4)).toBe(0)
  })

  it('returns 0 for both 0', () => {
    expect(goalDifferential(0, 0)).toBe(0)
  })
})

describe('shootoutResult', () => {
  const mkTeam = (scored: boolean[]): { player: number; scored: boolean }[] =>
    scored.map((s, i) => ({ player: i + 1, scored: s }))

  it('team1 wins with more goals in 5 shots', () => {
    const t1 = mkTeam([true, true, true, false, false])
    const t2 = mkTeam([false, true, false, true, false])
    const r = shootoutResult([t1, t2])
    expect(r.winner).toBe(1)
    expect(r.team1).toBe(3)
    expect(r.team2).toBe(2)
  })

  it('team2 wins when ahead after 5 shots', () => {
    const t1 = mkTeam([true, false, false, false, false])
    const t2 = mkTeam([true, true, true, false, false])
    const r = shootoutResult([t1, t2])
    expect(r.winner).toBe(2)
  })

  it('draw when tied after 5 shots and no sudden death shots', () => {
    const t1 = mkTeam([true, true, false, false, false])
    const t2 = mkTeam([true, true, false, false, false])
    const r = shootoutResult([t1, t2])
    expect(r.winner).toBe('draw')
    expect(r.team1).toBe(2)
    expect(r.team2).toBe(2)
  })

  it('sudden death: team1 wins on 6th shot', () => {
    const t1 = mkTeam([true, true, false, false, false, true])
    const t2 = mkTeam([true, true, false, false, false, false])
    const r = shootoutResult([t1, t2])
    expect(r.winner).toBe(1)
  })

  it('sudden death: team2 wins when team1 misses and team2 scores', () => {
    const t1 = mkTeam([true, true, true, false, false, false])
    const t2 = mkTeam([true, true, true, false, false, true])
    const r = shootoutResult([t1, t2])
    expect(r.winner).toBe(2)
  })

  it('early termination: stops when winner guaranteed mid-5', () => {
    // team1 scores 3 in a row; team2 misses 3 → after round 3, team1 leads 3-0
    // with 2 shots remaining team2 can only score 2 more → team1 guaranteed
    const t1 = mkTeam([true, true, true, false, false])
    const t2 = mkTeam([false, false, false, true, true])
    const r = shootoutResult([t1, t2])
    expect(r.winner).toBe(1)
  })

  it('handles empty attempt arrays gracefully', () => {
    const r = shootoutResult([[], []])
    expect(r.winner).toBe('draw')
    expect(r.team1).toBe(0)
    expect(r.team2).toBe(0)
  })

  it('handles missing teams array gracefully', () => {
    const r = shootoutResult([[]])
    expect(r.winner).toBe('draw')
  })

  it('all 5 shots scored by both is a draw entering SD', () => {
    const t1 = mkTeam([true, true, true, true, true, false])
    const t2 = mkTeam([true, true, true, true, true, false])
    const r = shootoutResult([t1, t2])
    expect(r.winner).toBe('draw')
  })
})

describe('advantageSwim', () => {
  it('returns team 1 possession when team1 wins', () => {
    const r = advantageSwim(1)
    expect(r.possession).toBe(1)
    expect(r.advantage).toBe('advantage')
  })

  it('returns team 2 possession when team2 wins', () => {
    const r = advantageSwim(2)
    expect(r.possession).toBe(2)
    expect(r.advantage).toBe('advantage')
  })
})

describe('periodScore', () => {
  it('distributes goals across 4 periods correctly', () => {
    const goals = [
      { period: 1 as const, team: 1 as const },
      { period: 1 as const, team: 2 as const },
      { period: 2 as const, team: 1 as const },
      { period: 3 as const, team: 2 as const },
      { period: 4 as const, team: 1 as const },
      { period: 4 as const, team: 1 as const },
    ]
    const r = periodScore(goals)
    expect(r.p1[0]).toBe(1) // p1 period 1
    expect(r.p2[0]).toBe(1) // p2 period 1
    expect(r.p1[1]).toBe(1) // p1 period 2
    expect(r.p2[2]).toBe(1) // p2 period 3
    expect(r.p1[3]).toBe(2) // p1 period 4
    expect(r.total).toEqual([4, 2])
  })

  it('handles OT goals (period 5)', () => {
    const goals = [
      { period: 5 as const, team: 1 as const },
      { period: 5 as const, team: 2 as const },
      { period: 5 as const, team: 1 as const },
    ]
    const r = periodScore(goals)
    expect(r.p1[4]).toBe(2)
    expect(r.p2[4]).toBe(1)
    expect(r.total).toEqual([2, 1])
  })

  it('returns all zeros for empty array', () => {
    const r = periodScore([])
    expect(r.total).toEqual([0, 0])
    expect(r.p1.every((v) => v === 0)).toBe(true)
    expect(r.p2.every((v) => v === 0)).toBe(true)
  })

  it('period arrays have 5 entries', () => {
    const r = periodScore([])
    expect(r.p1).toHaveLength(5)
    expect(r.p2).toHaveLength(5)
  })
})

describe('teamPoints', () => {
  it('3 wins = 9 points', () => {
    expect(teamPoints(3, 0, 0)).toBe(9)
  })

  it('draws give 1 point each', () => {
    expect(teamPoints(0, 0, 3)).toBe(3)
  })

  it('losses contribute 0', () => {
    expect(teamPoints(0, 10, 0)).toBe(0)
  })

  it('mixed record', () => {
    expect(teamPoints(2, 1, 2)).toBe(8)
  })
})

describe('quarterTimeRemaining', () => {
  it('returns full duration at quarter start', () => {
    expect(quarterTimeRemaining(0, 0)).toBe(480_000)
  })

  it('returns 0 when quarter has elapsed', () => {
    expect(quarterTimeRemaining(0, 480_000)).toBe(0)
  })

  it('returns remainder mid-quarter', () => {
    expect(quarterTimeRemaining(1000, 61_000)).toBe(420_000)
  })

  it('clamps to 0 if now > start + duration', () => {
    expect(quarterTimeRemaining(0, 600_000)).toBe(0)
  })

  it('respects custom quarter duration', () => {
    expect(quarterTimeRemaining(0, 60_000, 300_000)).toBe(240_000)
  })
})

// ---------------------------------------------------------------------------
// 2. Shot analytics
// ---------------------------------------------------------------------------

describe('shootingPercentage', () => {
  it('returns ratio when shots > 0', () => {
    expect(shootingPercentage(4, 10)).toBeCloseTo(0.4)
  })

  it('returns 0 when shots = 0', () => {
    expect(shootingPercentage(0, 0)).toBe(0)
  })

  it('returns 1.0 when all shots scored', () => {
    expect(shootingPercentage(5, 5)).toBe(1)
  })
})

describe('shotsByPosition', () => {
  it('groups shots by position correctly', () => {
    const shots = [
      { position: 'left' as const, scored: true },
      { position: 'left' as const, scored: false },
      { position: 'center' as const, scored: true },
      { position: 'penalty' as const, scored: true },
    ]
    const map = shotsByPosition(shots)
    expect(map.get('left')?.attempts).toBe(2)
    expect(map.get('left')?.goals).toBe(1)
    expect(map.get('left')?.pct).toBeCloseTo(0.5)
    expect(map.get('center')?.attempts).toBe(1)
    expect(map.get('penalty')?.goals).toBe(1)
  })

  it('returns empty map for no shots', () => {
    expect(shotsByPosition([])).toHaveProperty('size', 0)
  })

  it('computes 100% pct when all scored', () => {
    const shots = [
      { position: 'extra_man' as const, scored: true },
      { position: 'extra_man' as const, scored: true },
    ]
    const map = shotsByPosition(shots)
    expect(map.get('extra_man')?.pct).toBe(1)
  })

  it('handles all 5 position types', () => {
    const positions = ['left', 'right', 'center', 'penalty', 'extra_man'] as const
    const shots = positions.map((p) => ({ position: p, scored: false }))
    const map = shotsByPosition(shots)
    expect(map.size).toBe(5)
  })
})

describe('goalKeeperSavePercentage', () => {
  it('computes correct percentage', () => {
    expect(goalKeeperSavePercentage(7, 10)).toBeCloseTo(0.7)
  })

  it('returns 0 when no shots on goal', () => {
    expect(goalKeeperSavePercentage(0, 0)).toBe(0)
  })

  it('returns 1.0 when all shots saved', () => {
    expect(goalKeeperSavePercentage(5, 5)).toBe(1)
  })
})

describe('counterAttackRate', () => {
  it('returns ratio', () => {
    expect(counterAttackRate(3, 10)).toBeCloseTo(0.3)
  })

  it('returns 0 when no goals', () => {
    expect(counterAttackRate(0, 0)).toBe(0)
  })
})

describe('exclusionToGoalConversion', () => {
  it('computes goals per exclusion', () => {
    expect(exclusionToGoalConversion(4, 8)).toBeCloseTo(0.5)
  })

  it('returns 0 when no exclusions', () => {
    expect(exclusionToGoalConversion(3, 0)).toBe(0)
  })
})

describe('driverVsPerimeter', () => {
  it('returns driver ratio', () => {
    expect(driverVsPerimeter(6, 4)).toBeCloseTo(0.6)
  })

  it('returns 0 when both 0', () => {
    expect(driverVsPerimeter(0, 0)).toBe(0)
  })

  it('returns 1.0 when all driver goals', () => {
    expect(driverVsPerimeter(5, 0)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Player analytics
// ---------------------------------------------------------------------------

describe('playerEfficiencyRating', () => {
  it('computes PER correctly', () => {
    // goals*3 + assists*2 + steals*2 + exclusionsCaused = 2*3+3*2+1*2+1 = 6+6+2+1=15
    expect(playerEfficiencyRating(2, 3, 1, 1, 15)).toBeCloseTo(15 / 15)
  })

  it('uses max(minutes, 1) to avoid division by zero', () => {
    expect(playerEfficiencyRating(1, 0, 0, 0, 0)).toBe(3) // 1*3 / 1
  })

  it('returns 0 for player with no stats', () => {
    expect(playerEfficiencyRating(0, 0, 0, 0, 10)).toBe(0)
  })
})

describe('assistToGoalRatio', () => {
  it('computes ratio', () => {
    expect(assistToGoalRatio(6, 3)).toBe(2)
  })

  it('returns 0 when goals = 0', () => {
    expect(assistToGoalRatio(3, 0)).toBe(0)
  })

  it('returns 0 when both 0', () => {
    expect(assistToGoalRatio(0, 0)).toBe(0)
  })
})

describe('exclusionRate', () => {
  it('normalizes to 32-minute game', () => {
    // 4 exclusions in 16 min → 8 per 32 min
    expect(exclusionRate(4, 16)).toBeCloseTo(8)
  })

  it('returns 0 when minutes = 0', () => {
    expect(exclusionRate(5, 0)).toBe(0)
  })

  it('1 exclusion in 32 min = 1.0 rate', () => {
    expect(exclusionRate(1, 32)).toBeCloseTo(1)
  })
})

describe('swimSpeed', () => {
  it('returns m/s', () => {
    expect(swimSpeed(50, 25)).toBe(2)
  })

  it('returns 0 when time is 0', () => {
    expect(swimSpeed(50, 0)).toBe(0)
  })
})

describe('sprintCapacity', () => {
  it('returns 0 for empty sprints', () => {
    expect(sprintCapacity([], 30)).toBe(0)
  })

  it('returns 0 when restSeconds = 0', () => {
    expect(sprintCapacity([5, 5], 0)).toBe(0)
  })

  it('computes decayed average for a single sprint', () => {
    // sprint 0: 15/3=5 m/s * (1 - 0.02*0) = 5
    const result = sprintCapacity([3], 30)
    expect(result).toBeCloseTo(5)
  })

  it('applies decay to subsequent sprints', () => {
    // sprint 0: 15/3=5 * 1.0 = 5
    // sprint 1: 15/3=5 * 0.98 = 4.9
    // avg = 9.9/2 = 4.95
    const result = sprintCapacity([3, 3], 30)
    expect(result).toBeCloseTo(4.95)
  })

  it('handles zero-time sprint gracefully', () => {
    // time=0 → speed=0
    const result = sprintCapacity([0, 3], 30)
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

describe('goalieReactionScore', () => {
  it('returns 0 for empty saves array', () => {
    expect(goalieReactionScore([])).toBe(0)
  })

  it('averages reaction quotient', () => {
    // (5/25 + 4/20) / 2 = (0.2 + 0.2) / 2 = 0.2
    const saves = [
      { shotSpeed: 25, distanceM: 5 },
      { shotSpeed: 20, distanceM: 4 },
    ]
    expect(goalieReactionScore(saves)).toBeCloseTo(0.2)
  })

  it('returns 0 for zero shotSpeed', () => {
    const saves = [{ shotSpeed: 0, distanceM: 5 }]
    expect(goalieReactionScore(saves)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Tactical analytics
// ---------------------------------------------------------------------------

describe('extraManEfficiency', () => {
  it('returns 0s for empty array', () => {
    const r = extraManEfficiency([])
    expect(r.conversionRate).toBe(0)
    expect(r.avgDuration).toBe(0)
  })

  it('computes conversion rate and avg duration', () => {
    const plays = [
      { duration: 30, scored: true },
      { duration: 20, scored: false },
      { duration: 25, scored: true },
    ]
    const r = extraManEfficiency(plays)
    expect(r.conversionRate).toBeCloseTo(2 / 3)
    expect(r.avgDuration).toBeCloseTo(25)
  })

  it('100% conversion when all scored', () => {
    const plays = [
      { duration: 20, scored: true },
      { duration: 20, scored: true },
    ]
    const r = extraManEfficiency(plays)
    expect(r.conversionRate).toBe(1)
  })
})

describe('pressureDefenseRating', () => {
  it('computes correctly', () => {
    expect(pressureDefenseRating(5, 3, 20)).toBeCloseTo(0.4)
  })

  it('uses 1 as divisor floor', () => {
    expect(pressureDefenseRating(2, 1, 0)).toBe(3)
  })
})

describe('offensiveEfficiency', () => {
  it('returns goals per 100 possessions', () => {
    expect(offensiveEfficiency(10, 50)).toBeCloseTo(20)
  })

  it('returns 0 when possessions = 0', () => {
    expect(offensiveEfficiency(5, 0)).toBe(0)
  })
})

describe('defensiveEfficiency', () => {
  it('returns goals allowed per 100 possessions', () => {
    expect(defensiveEfficiency(5, 50)).toBeCloseTo(10)
  })

  it('returns 0 when possessionsDefended = 0', () => {
    expect(defensiveEfficiency(3, 0)).toBe(0)
  })
})

describe('netRating', () => {
  it('positive when offEff > defEff', () => {
    expect(netRating(110, 100)).toBe(10)
  })

  it('negative when defEff > offEff', () => {
    expect(netRating(90, 105)).toBe(-15)
  })

  it('zero when equal', () => {
    expect(netRating(100, 100)).toBe(0)
  })
})

describe('transitionRate', () => {
  it('returns ratio', () => {
    expect(transitionRate(4, 16)).toBeCloseTo(0.25)
  })

  it('returns 0 when totalGoals = 0', () => {
    expect(transitionRate(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Set play analytics
// ---------------------------------------------------------------------------

describe('penaltyShotRate', () => {
  it('returns rate per possession', () => {
    expect(penaltyShotRate(5, 50)).toBeCloseTo(0.1)
  })

  it('returns 0 when totalPossessions = 0', () => {
    expect(penaltyShotRate(3, 0)).toBe(0)
  })
})

describe('penaltyConversionRate', () => {
  it('computes conversion', () => {
    expect(penaltyConversionRate(4, 5)).toBeCloseTo(0.8)
  })

  it('returns 0 when no attempts', () => {
    expect(penaltyConversionRate(0, 0)).toBe(0)
  })
})

describe('cornerThrowSuccess', () => {
  it('computes success rate', () => {
    expect(cornerThrowSuccess(3, 10)).toBeCloseTo(0.3)
  })

  it('returns 0 when no corners', () => {
    expect(cornerThrowSuccess(0, 0)).toBe(0)
  })
})

describe('sixMeterShotRate', () => {
  it('computes rate', () => {
    expect(sixMeterShotRate(3, 6)).toBeCloseTo(0.5)
  })

  it('returns 0 when no attempts', () => {
    expect(sixMeterShotRate(0, 0)).toBe(0)
  })
})

describe('pressureDefense', () => {
  it('applies weights correctly', () => {
    // 2*2 + 3*1.5 - 1*0.5 = 4 + 4.5 - 0.5 = 8
    expect(pressureDefense(2, 3, 1)).toBeCloseTo(8)
  })

  it('negative with many fouls', () => {
    expect(pressureDefense(0, 0, 10)).toBe(-5)
  })

  it('zero with no activity', () => {
    expect(pressureDefense(0, 0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Team analysis
// ---------------------------------------------------------------------------

describe('possessionTime', () => {
  it('returns percentage', () => {
    expect(possessionTime(100, 60)).toBeCloseTo(60)
  })

  it('returns 0 when totalSeconds = 0', () => {
    expect(possessionTime(0, 0)).toBe(0)
  })

  it('returns 50 for equal possession', () => {
    expect(possessionTime(200, 100)).toBe(50)
  })
})

describe('homeAdvantage', () => {
  it('computes win% difference', () => {
    // home: 8/10 = 0.8, away: 4/10 = 0.4 → 0.4
    expect(homeAdvantage(8, 10, 4, 10)).toBeCloseTo(0.4)
  })

  it('returns 0 if homeGames = 0', () => {
    expect(homeAdvantage(0, 0, 4, 10)).toBe(0)
  })

  it('returns 0 if awayGames = 0', () => {
    expect(homeAdvantage(4, 10, 0, 0)).toBe(0)
  })

  it('returns negative when away performs better', () => {
    expect(homeAdvantage(2, 10, 8, 10)).toBeLessThan(0)
  })
})

describe('momentumIndex', () => {
  it('returns 0 for empty sequence', () => {
    expect(momentumIndex([])).toBe(0)
  })

  it('counts team 1 goals in last window', () => {
    const seq: (1 | 2)[] = [1, 2, 1, 2, 1, 1, 1]
    // last 3: [1, 1, 1] → 3
    expect(momentumIndex(seq)).toBe(3)
  })

  it('respects custom window size', () => {
    const seq: (1 | 2)[] = [1, 1, 2, 2, 1]
    // last 5: [1, 1, 2, 2, 1] → 3 team1 goals
    expect(momentumIndex(seq, 5)).toBe(3)
  })

  it('returns 0 when all goals by team 2 in window', () => {
    const seq: (1 | 2)[] = [1, 1, 2, 2, 2]
    expect(momentumIndex(seq, 3)).toBe(0)
  })

  it('handles sequence shorter than window', () => {
    const seq: (1 | 2)[] = [1, 2]
    expect(momentumIndex(seq, 5)).toBe(1)
  })
})

describe('fatigueAdjustedRating', () => {
  it('reduces rating by 3% per game', () => {
    // 100 * (1 - 2 * 0.03) = 94
    expect(fatigueAdjustedRating(100, 2)).toBeCloseTo(94)
  })

  it('returns 0 when heavily fatigued', () => {
    // 100 * (1 - 100 * 0.03) = negative → clamped to 0
    expect(fatigueAdjustedRating(100, 100)).toBe(0)
  })

  it('returns base rating when no games', () => {
    expect(fatigueAdjustedRating(85, 0)).toBe(85)
  })

  it('clamps at 0 not negative', () => {
    expect(fatigueAdjustedRating(50, 40)).toBeGreaterThanOrEqual(0)
  })
})

describe('divingPenaltyRate', () => {
  it('returns ratio', () => {
    expect(divingPenaltyRate(3, 15)).toBeCloseTo(0.2)
  })

  it('returns 0 when no fouls', () => {
    expect(divingPenaltyRate(2, 0)).toBe(0)
  })

  it('returns 0 for both 0', () => {
    expect(divingPenaltyRate(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy
// ---------------------------------------------------------------------------

describe('dkWaterPoloPoints', () => {
  it('scores goals at 10 pts each', () => {
    const r = dkWaterPoloPoints({ goals: 3, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 })
    expect(r).toBe(30)
  })

  it('scores assists at 5 pts each', () => {
    const r = dkWaterPoloPoints({ goals: 0, assists: 2, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 })
    expect(r).toBe(10)
  })

  it('scores saves at 5 pts each', () => {
    const r = dkWaterPoloPoints({ goals: 0, assists: 0, saves: 4, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 })
    expect(r).toBe(20)
  })

  it('scores steals at 4 pts each', () => {
    const r = dkWaterPoloPoints({ goals: 0, assists: 0, saves: 0, steals: 3, exclusionsCaused: 0, minutesPlayed: 0 })
    expect(r).toBe(12)
  })

  it('scores exclusionsCaused at 3 pts each', () => {
    const r = dkWaterPoloPoints({ goals: 0, assists: 0, saves: 0, steals: 0, exclusionsCaused: 5, minutesPlayed: 0 })
    expect(r).toBe(15)
  })

  it('awards +2 per 5 min played', () => {
    // 25 min → 5 intervals → +10
    const r = dkWaterPoloPoints({ goals: 0, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 25 })
    expect(r).toBe(10)
  })

  it('does not award partial 5-min interval', () => {
    // 28 min → 5 full intervals → +10 (not +12)
    const r = dkWaterPoloPoints({ goals: 0, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 28 })
    expect(r).toBe(10)
  })

  it('scores all fields together', () => {
    // 2*10 + 1*5 + 3*5 + 1*4 + 2*3 + floor(30/5)*2 = 20+5+15+4+6+12 = 62
    const r = dkWaterPoloPoints({ goals: 2, assists: 1, saves: 3, steals: 1, exclusionsCaused: 2, minutesPlayed: 30 })
    expect(r).toBe(62)
  })

  it('returns 0 for all-zero result', () => {
    const r = dkWaterPoloPoints({ goals: 0, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 })
    expect(r).toBe(0)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty array', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('returns single result score when only one entry', () => {
    const results = [{ goals: 1, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 }]
    expect(dkProjection(results)).toBe(10)
  })

  it('weights most recent 3x', () => {
    // result1 → 10pts, result2 → 20pts
    // (20*3 + 10) / (3+1) = 70/4 = 17.5
    const result1 = { goals: 1, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 }
    const result2 = { goals: 2, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 }
    expect(dkProjection([result1, result2])).toBeCloseTo(17.5)
  })

  it('handles multiple historic results', () => {
    // all score 10 pts → projection = 10
    const base = { goals: 1, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 }
    const results = [base, base, base, base]
    expect(dkProjection(results)).toBeCloseTo(10)
  })

  it('gives higher projection when recent results are stronger', () => {
    const weak = { goals: 0, assists: 0, saves: 0, steals: 0, exclusionsCaused: 0, minutesPlayed: 0 }
    const strong = { goals: 5, assists: 2, saves: 3, steals: 1, exclusionsCaused: 1, minutesPlayed: 25 }
    const weakOnly = dkProjection([weak, weak, weak])
    const strongRecent = dkProjection([weak, weak, strong])
    expect(strongRecent).toBeGreaterThan(weakOnly)
  })
})
