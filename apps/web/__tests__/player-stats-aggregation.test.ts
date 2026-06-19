import { describe, it, expect } from 'vitest'
import {
  aggregateTotals,
  rollingAvg,
  rollingStats,
  weightedRecentForm,
  trendDirection,
  homeAwaySplit,
  winLossSplit,
  opponentSplit,
  monthSplit,
  lastNGames,
  lastNGamesStats,
  statConsistency,
  bigGameRate,
  doubleDoubleRate,
  resultStreak,
  statStreak,
  per36Minutes,
  standardScore,
  compareSeasons,
  buildPlayerProfile,
  type GameLog,
} from '../lib/sports/player-stats-aggregation'

// ---------------------------------------------------------------------------
// Test fixture helper
// ---------------------------------------------------------------------------

function makeGame(
  overrides: Partial<GameLog> & { stats?: Record<string, number> } = {},
): GameLog {
  return {
    date: '2024-01-15',
    opponent: 'TeamA',
    homeAway: 'home',
    minutesPlayed: 30,
    result: 'W',
    pointsFor: 110,
    pointsAgainst: 100,
    ...overrides,
    stats: { points: 20, rebounds: 5, assists: 4, possessions: 80, ...overrides.stats },
  }
}

// Sequence helpers
function makeGames(n: number, statOverrides: (i: number) => Record<string, number> = () => ({})): GameLog[] {
  return Array.from({ length: n }, (_, i) =>
    makeGame({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      opponent: `Team${String.fromCharCode(65 + (i % 5))}`,
      homeAway: i % 2 === 0 ? 'home' : 'away',
      result: i % 3 === 0 ? 'L' : 'W',
      stats: { points: 10 + i, rebounds: 5, assists: 3, possessions: 80, ...statOverrides(i) },
    }),
  )
}

// ---------------------------------------------------------------------------
// aggregateTotals
// ---------------------------------------------------------------------------

describe('aggregateTotals', () => {
  it('returns zero gamesPlayed and empty totals for empty array', () => {
    const result = aggregateTotals([])
    expect(result.gamesPlayed).toBe(0)
    expect(result.totals).toEqual({})
    expect(result.perGame).toEqual({})
  })

  it('computes gamesPlayed correctly', () => {
    const games = makeGames(5)
    expect(aggregateTotals(games).gamesPlayed).toBe(5)
  })

  it('sums stats across all games', () => {
    const games = [
      makeGame({ stats: { points: 20, rebounds: 5 } }),
      makeGame({ stats: { points: 30, rebounds: 10 } }),
    ]
    const { totals } = aggregateTotals(games)
    expect(totals['points']).toBe(50)
    expect(totals['rebounds']).toBe(15)
  })

  it('computes perGame correctly', () => {
    const games = [
      makeGame({ stats: { points: 20, rebounds: 5 } }),
      makeGame({ stats: { points: 30, rebounds: 10 } }),
    ]
    const { perGame } = aggregateTotals(games)
    expect(perGame['points']).toBeCloseTo(25)
    expect(perGame['rebounds']).toBeCloseTo(7.5)
  })

  it('computes per36 when minutesPlayed is present', () => {
    const games = [
      makeGame({ minutesPlayed: 36, stats: { points: 36, rebounds: 9 } }),
      makeGame({ minutesPlayed: 36, stats: { points: 36, rebounds: 9 } }),
    ]
    const { per36 } = aggregateTotals(games)
    expect(per36).toBeDefined()
    expect(per36!['points']).toBeCloseTo(36)
    expect(per36!['rebounds']).toBeCloseTo(9)
  })

  it('per36 scales correctly for different minute totals', () => {
    const games = [makeGame({ minutesPlayed: 18, stats: { points: 18, rebounds: 4 } })]
    const { per36 } = aggregateTotals(games)
    expect(per36!['points']).toBeCloseTo(36)
  })

  it('computes per100Possessions when possessions key exists', () => {
    const games = [
      makeGame({ stats: { points: 100, possessions: 100 } }),
    ]
    const { per100Possessions } = aggregateTotals(games)
    expect(per100Possessions).toBeDefined()
    expect(per100Possessions!['points']).toBeCloseTo(100)
  })

  it('handles single game correctly', () => {
    const game = makeGame({ minutesPlayed: 30, stats: { points: 25, rebounds: 7 } })
    const { gamesPlayed, totals, perGame } = aggregateTotals([game])
    expect(gamesPlayed).toBe(1)
    expect(totals['points']).toBe(25)
    expect(perGame['points']).toBe(25)
  })

  it('omits per36 when all minutesPlayed are 0', () => {
    const games = [makeGame({ minutesPlayed: 0, stats: { points: 10 } })]
    const result = aggregateTotals(games)
    // per36 may be undefined or present with 0
    if (result.per36) {
      expect(result.per36['points']).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// rollingAvg
// ---------------------------------------------------------------------------

describe('rollingAvg', () => {
  it('returns empty array for empty input', () => {
    expect(rollingAvg([], 'points', 3)).toEqual([])
  })

  it('returns expanding window for first entries', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20 } }),
      makeGame({ date: '2024-01-03', stats: { points: 30 } }),
    ]
    const result = rollingAvg(games, 'points', 3)
    expect(result[0]).toBeCloseTo(10)   // only game 1
    expect(result[1]).toBeCloseTo(15)   // games 1,2
    expect(result[2]).toBeCloseTo(20)   // games 1,2,3
  })

  it('slides the window correctly beyond window size', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20 } }),
      makeGame({ date: '2024-01-03', stats: { points: 30 } }),
      makeGame({ date: '2024-01-04', stats: { points: 40 } }),
    ]
    const result = rollingAvg(games, 'points', 3)
    // index 3: games 2,3,4 → avg(20,30,40)=30
    expect(result[3]).toBeCloseTo(30)
  })

  it('returns same length as input', () => {
    const games = makeGames(10)
    expect(rollingAvg(games, 'points', 3)).toHaveLength(10)
  })

  it('handles missing stat key as 0', () => {
    const games = [makeGame({ stats: {} }), makeGame({ stats: {} })]
    const result = rollingAvg(games, 'nonexistent', 2)
    expect(result).toEqual([0, 0])
  })
})

// ---------------------------------------------------------------------------
// rollingStats
// ---------------------------------------------------------------------------

describe('rollingStats', () => {
  it('returns empty array for empty input', () => {
    expect(rollingStats([], ['points'], 3)).toEqual([])
  })

  it('computes multiple stats simultaneously', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10, rebounds: 5 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20, rebounds: 10 } }),
    ]
    const result = rollingStats(games, ['points', 'rebounds'], 2)
    expect(result[1]!['points']).toBeCloseTo(15)
    expect(result[1]!['rebounds']).toBeCloseTo(7.5)
  })

  it('returns records with all requested keys', () => {
    const games = makeGames(3)
    const result = rollingStats(games, ['points', 'rebounds'], 2)
    expect(result[0]).toHaveProperty('points')
    expect(result[0]).toHaveProperty('rebounds')
  })

  it('length matches games array', () => {
    const games = makeGames(5)
    expect(rollingStats(games, ['points'], 3)).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// weightedRecentForm
// ---------------------------------------------------------------------------

describe('weightedRecentForm', () => {
  it('returns 0 for empty games', () => {
    expect(weightedRecentForm([], 'points')).toBe(0)
  })

  it('returns the stat value for a single game', () => {
    const games = [makeGame({ stats: { points: 25 } })]
    expect(weightedRecentForm(games, 'points')).toBeCloseTo(25)
  })

  it('most recent game dominates with decay < 1', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 5 } }),
      makeGame({ date: '2024-01-02', stats: { points: 5 } }),
      makeGame({ date: '2024-01-03', stats: { points: 100 } }), // most recent
    ]
    const result = weightedRecentForm(games, 'points', 0.5)
    // With heavy decay, recent dominates
    expect(result).toBeGreaterThan(40)
  })

  it('with decay=1 gives equal weight (simple average)', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20 } }),
      makeGame({ date: '2024-01-03', stats: { points: 30 } }),
    ]
    const result = weightedRecentForm(games, 'points', 1)
    expect(result).toBeCloseTo(20) // (10+20+30)/3
  })

  it('uses default decay of 0.9', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 0 } }),
      makeGame({ date: '2024-01-02', stats: { points: 100 } }),
    ]
    // recent (100) gets weight 1, older (0) gets weight 0.9
    const result = weightedRecentForm(games, 'points')
    expect(result).toBeGreaterThan(50)
  })
})

// ---------------------------------------------------------------------------
// trendDirection
// ---------------------------------------------------------------------------

describe('trendDirection', () => {
  it('returns stable for single game', () => {
    expect(trendDirection([makeGame()], 'points')).toBe('stable')
  })

  it('returns stable for empty array', () => {
    expect(trendDirection([], 'points')).toBe('stable')
  })

  it('detects improving trend', () => {
    // Second half clearly higher
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10 } }),
      makeGame({ date: '2024-01-02', stats: { points: 10 } }),
      makeGame({ date: '2024-01-03', stats: { points: 20 } }),
      makeGame({ date: '2024-01-04', stats: { points: 20 } }),
    ]
    expect(trendDirection(games, 'points')).toBe('improving')
  })

  it('detects declining trend', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 20 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20 } }),
      makeGame({ date: '2024-01-03', stats: { points: 10 } }),
      makeGame({ date: '2024-01-04', stats: { points: 10 } }),
    ]
    expect(trendDirection(games, 'points')).toBe('declining')
  })

  it('returns stable when difference is within 5%', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 20 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20 } }),
      makeGame({ date: '2024-01-03', stats: { points: 21 } }),
      makeGame({ date: '2024-01-04', stats: { points: 21 } }),
    ]
    expect(trendDirection(games, 'points')).toBe('stable')
  })

  it('respects window parameter', () => {
    // 8 games: first 4 improving, last 4 declining
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10 } }),
      makeGame({ date: '2024-01-02', stats: { points: 10 } }),
      makeGame({ date: '2024-01-03', stats: { points: 20 } }),
      makeGame({ date: '2024-01-04', stats: { points: 20 } }),
      makeGame({ date: '2024-01-05', stats: { points: 20 } }),
      makeGame({ date: '2024-01-06', stats: { points: 20 } }),
      makeGame({ date: '2024-01-07', stats: { points: 10 } }),
      makeGame({ date: '2024-01-08', stats: { points: 10 } }),
    ]
    // Looking at only last 4 games (all 20 then 10, declining)
    expect(trendDirection(games, 'points', 4)).toBe('declining')
  })
})

// ---------------------------------------------------------------------------
// homeAwaySplit
// ---------------------------------------------------------------------------

describe('homeAwaySplit', () => {
  it('correctly separates home and away games', () => {
    const games = [
      makeGame({ homeAway: 'home', stats: { points: 30 } }),
      makeGame({ homeAway: 'away', stats: { points: 20 } }),
      makeGame({ homeAway: 'home', stats: { points: 25 } }),
    ]
    const { home, away } = homeAwaySplit(games, 'points')
    expect(home.games).toBe(2)
    expect(away.games).toBe(1)
    expect(home.perGame['points']).toBeCloseTo(27.5)
    expect(away.perGame['points']).toBeCloseTo(20)
  })

  it('handles all home games', () => {
    const games = [
      makeGame({ homeAway: 'home', stats: { points: 20 } }),
    ]
    const { home, away } = homeAwaySplit(games, 'points')
    expect(home.games).toBe(1)
    expect(away.games).toBe(0)
  })

  it('handles empty game list', () => {
    const { home, away } = homeAwaySplit([], 'points')
    expect(home.games).toBe(0)
    expect(away.games).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// winLossSplit
// ---------------------------------------------------------------------------

describe('winLossSplit', () => {
  it('correctly separates wins and losses', () => {
    const games = [
      makeGame({ result: 'W', stats: { points: 30 } }),
      makeGame({ result: 'L', stats: { points: 15 } }),
      makeGame({ result: 'W', stats: { points: 25 } }),
    ]
    const { wins, losses } = winLossSplit(games, 'points')
    expect(wins.games).toBe(2)
    expect(losses.games).toBe(1)
    expect(wins.perGame['points']).toBeCloseTo(27.5)
    expect(losses.perGame['points']).toBeCloseTo(15)
  })

  it('handles all wins', () => {
    const games = [makeGame({ result: 'W' }), makeGame({ result: 'W' })]
    const { wins, losses } = winLossSplit(games, 'points')
    expect(wins.games).toBe(2)
    expect(losses.games).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// opponentSplit
// ---------------------------------------------------------------------------

describe('opponentSplit', () => {
  it('groups by opponent and sorts by games desc', () => {
    const games = [
      makeGame({ opponent: 'Lakers', stats: { points: 25 } }),
      makeGame({ opponent: 'Celtics', stats: { points: 30 } }),
      makeGame({ opponent: 'Lakers', stats: { points: 20 } }),
      makeGame({ opponent: 'Lakers', stats: { points: 22 } }),
    ]
    const splits = opponentSplit(games, 'points')
    expect(splits[0]!.label).toBe('Lakers')
    expect(splits[0]!.games).toBe(3)
    expect(splits[1]!.label).toBe('Celtics')
    expect(splits[1]!.games).toBe(1)
  })

  it('returns empty array for no games', () => {
    expect(opponentSplit([], 'points')).toEqual([])
  })

  it('one split per unique opponent', () => {
    const games = [
      makeGame({ opponent: 'A' }),
      makeGame({ opponent: 'B' }),
      makeGame({ opponent: 'C' }),
    ]
    expect(opponentSplit(games, 'points')).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// monthSplit
// ---------------------------------------------------------------------------

describe('monthSplit', () => {
  it('groups by YYYY-MM', () => {
    const games = [
      makeGame({ date: '2024-01-10', stats: { points: 20 } }),
      makeGame({ date: '2024-01-20', stats: { points: 30 } }),
      makeGame({ date: '2024-02-05', stats: { points: 15 } }),
    ]
    const splits = monthSplit(games, 'points')
    expect(splits).toHaveLength(2)
    expect(splits[0]!.label).toBe('2024-01')
    expect(splits[0]!.games).toBe(2)
    expect(splits[1]!.label).toBe('2024-02')
    expect(splits[1]!.games).toBe(1)
  })

  it('returns sorted by month ascending', () => {
    const games = [
      makeGame({ date: '2024-03-01' }),
      makeGame({ date: '2024-01-01' }),
      makeGame({ date: '2024-02-01' }),
    ]
    const splits = monthSplit(games, 'points')
    expect(splits.map(s => s.label)).toEqual(['2024-01', '2024-02', '2024-03'])
  })

  it('returns empty for empty input', () => {
    expect(monthSplit([], 'points')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// lastNGames
// ---------------------------------------------------------------------------

describe('lastNGames', () => {
  it('returns the most recent n games in chronological order', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20 } }),
      makeGame({ date: '2024-01-03', stats: { points: 30 } }),
      makeGame({ date: '2024-01-04', stats: { points: 40 } }),
      makeGame({ date: '2024-01-05', stats: { points: 50 } }),
    ]
    const last3 = lastNGames(games, 3)
    expect(last3).toHaveLength(3)
    expect(last3[0]!.stats['points']).toBe(30) // chronologically earliest of last 3
    expect(last3[2]!.stats['points']).toBe(50) // most recent
  })

  it('returns all games when n >= length', () => {
    const games = makeGames(3)
    expect(lastNGames(games, 10)).toHaveLength(3)
  })

  it('returns empty for empty input', () => {
    expect(lastNGames([], 5)).toEqual([])
  })

  it('returns 1 game when n=1', () => {
    const games = makeGames(5)
    const result = lastNGames(games, 1)
    expect(result).toHaveLength(1)
    // Should be the most recent one
    const sorted = [...games].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    expect(result[0]!.date).toBe(sorted[sorted.length - 1]!.date)
  })
})

// ---------------------------------------------------------------------------
// lastNGamesStats
// ---------------------------------------------------------------------------

describe('lastNGamesStats', () => {
  it('aggregates stats over last n games', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 5 } }),
      makeGame({ date: '2024-01-02', stats: { points: 10 } }),
      makeGame({ date: '2024-01-03', stats: { points: 20 } }),
      makeGame({ date: '2024-01-04', stats: { points: 30 } }),
    ]
    const stats = lastNGamesStats(games, 2)
    expect(stats.gamesPlayed).toBe(2)
    expect(stats.totals['points']).toBe(50)
    expect(stats.perGame['points']).toBeCloseTo(25)
  })

  it('returns empty totals for empty input', () => {
    const stats = lastNGamesStats([], 5)
    expect(stats.gamesPlayed).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// statConsistency
// ---------------------------------------------------------------------------

describe('statConsistency', () => {
  it('returns zeros for empty games', () => {
    const result = statConsistency([], 'points')
    expect(result.mean).toBe(0)
    expect(result.stdDev).toBe(0)
    expect(result.cv).toBe(0)
  })

  it('computes mean correctly', () => {
    const games = [
      makeGame({ stats: { points: 10 } }),
      makeGame({ stats: { points: 20 } }),
      makeGame({ stats: { points: 30 } }),
    ]
    expect(statConsistency(games, 'points').mean).toBeCloseTo(20)
  })

  it('computes stdDev correctly', () => {
    const games = [
      makeGame({ stats: { points: 10 } }),
      makeGame({ stats: { points: 10 } }),
      makeGame({ stats: { points: 10 } }),
    ]
    expect(statConsistency(games, 'points').stdDev).toBeCloseTo(0)
  })

  it('cv is stdDev/mean', () => {
    const games = [
      makeGame({ stats: { points: 10 } }),
      makeGame({ stats: { points: 20 } }),
      makeGame({ stats: { points: 30 } }),
    ]
    const { mean, stdDev, cv } = statConsistency(games, 'points')
    expect(cv).toBeCloseTo(stdDev / mean)
  })

  it('cv is 0 when mean is 0', () => {
    const games = [
      makeGame({ stats: { points: 0 } }),
      makeGame({ stats: { points: 0 } }),
    ]
    expect(statConsistency(games, 'points').cv).toBe(0)
  })

  it('computes pctAboveMean correctly', () => {
    const games = [
      makeGame({ stats: { points: 10 } }),
      makeGame({ stats: { points: 20 } }),
      makeGame({ stats: { points: 30 } }),
      makeGame({ stats: { points: 40 } }),
    ]
    // mean = 25, above mean: 30 and 40 → 50%
    expect(statConsistency(games, 'points').pctAboveMean).toBeCloseTo(0.5)
  })

  it('floor is approximately 10th percentile', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    const games = values.map(p => makeGame({ stats: { points: p } }))
    const { floor } = statConsistency(games, 'points')
    // 10th percentile of [10..100] sorted
    expect(floor).toBeGreaterThanOrEqual(10)
    expect(floor).toBeLessThan(25)
  })

  it('ceiling is approximately 90th percentile', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    const games = values.map(p => makeGame({ stats: { points: p } }))
    const { ceiling } = statConsistency(games, 'points')
    expect(ceiling).toBeGreaterThan(75)
    expect(ceiling).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// bigGameRate
// ---------------------------------------------------------------------------

describe('bigGameRate', () => {
  it('returns 0 for empty games', () => {
    expect(bigGameRate([], 'points', 20)).toBe(0)
  })

  it('returns correct fraction', () => {
    const games = [
      makeGame({ stats: { points: 25 } }),
      makeGame({ stats: { points: 15 } }),
      makeGame({ stats: { points: 30 } }),
      makeGame({ stats: { points: 18 } }),
    ]
    // 2 out of 4 >= 20
    expect(bigGameRate(games, 'points', 20)).toBeCloseTo(0.5)
  })

  it('returns 1 when all games meet threshold', () => {
    const games = [
      makeGame({ stats: { points: 20 } }),
      makeGame({ stats: { points: 25 } }),
    ]
    expect(bigGameRate(games, 'points', 20)).toBeCloseTo(1)
  })

  it('returns 0 when no games meet threshold', () => {
    const games = [
      makeGame({ stats: { points: 10 } }),
      makeGame({ stats: { points: 15 } }),
    ]
    expect(bigGameRate(games, 'points', 20)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// doubleDoubleRate
// ---------------------------------------------------------------------------

describe('doubleDoubleRate', () => {
  it('returns 0 for empty games', () => {
    expect(doubleDoubleRate([], 'points', 'rebounds')).toBe(0)
  })

  it('counts double-doubles correctly with default threshold 10', () => {
    const games = [
      makeGame({ stats: { points: 10, rebounds: 10 } }), // DD
      makeGame({ stats: { points: 10, rebounds: 9 } }),  // not DD
      makeGame({ stats: { points: 20, rebounds: 15 } }), // DD
      makeGame({ stats: { points: 9, rebounds: 10 } }),  // not DD
    ]
    expect(doubleDoubleRate(games, 'points', 'rebounds')).toBeCloseTo(0.5)
  })

  it('respects custom threshold', () => {
    const games = [
      makeGame({ stats: { points: 5, rebounds: 5 } }),  // DD at threshold=5
      makeGame({ stats: { points: 4, rebounds: 5 } }),  // not DD at threshold=5
    ]
    expect(doubleDoubleRate(games, 'points', 'rebounds', 5)).toBeCloseTo(0.5)
  })
})

// ---------------------------------------------------------------------------
// resultStreak
// ---------------------------------------------------------------------------

describe('resultStreak', () => {
  it('returns zeros for empty games', () => {
    const result = resultStreak([])
    expect(result.currentStreak).toBe(0)
    expect(result.longestWin).toBe(0)
    expect(result.longestLoss).toBe(0)
  })

  it('current streak is positive for wins', () => {
    const games = [
      makeGame({ date: '2024-01-01', result: 'L' }),
      makeGame({ date: '2024-01-02', result: 'W' }),
      makeGame({ date: '2024-01-03', result: 'W' }),
      makeGame({ date: '2024-01-04', result: 'W' }),
    ]
    expect(resultStreak(games).currentStreak).toBe(3)
  })

  it('current streak is negative for losses', () => {
    const games = [
      makeGame({ date: '2024-01-01', result: 'W' }),
      makeGame({ date: '2024-01-02', result: 'L' }),
      makeGame({ date: '2024-01-03', result: 'L' }),
    ]
    expect(resultStreak(games).currentStreak).toBe(-2)
  })

  it('tracks longest win streak', () => {
    const games = [
      makeGame({ date: '2024-01-01', result: 'W' }),
      makeGame({ date: '2024-01-02', result: 'W' }),
      makeGame({ date: '2024-01-03', result: 'W' }),
      makeGame({ date: '2024-01-04', result: 'L' }),
      makeGame({ date: '2024-01-05', result: 'W' }),
    ]
    expect(resultStreak(games).longestWin).toBe(3)
  })

  it('tracks longest loss streak', () => {
    const games = [
      makeGame({ date: '2024-01-01', result: 'L' }),
      makeGame({ date: '2024-01-02', result: 'L' }),
      makeGame({ date: '2024-01-03', result: 'W' }),
      makeGame({ date: '2024-01-04', result: 'L' }),
    ]
    expect(resultStreak(games).longestLoss).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// statStreak
// ---------------------------------------------------------------------------

describe('statStreak', () => {
  it('returns zeros for empty games', () => {
    expect(statStreak([], 'points', 20)).toEqual({ currentAbove: 0, longestAbove: 0 })
  })

  it('counts consecutive recent games above threshold', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 15 } }),
      makeGame({ date: '2024-01-02', stats: { points: 25 } }),
      makeGame({ date: '2024-01-03', stats: { points: 30 } }),
      makeGame({ date: '2024-01-04', stats: { points: 22 } }),
    ]
    expect(statStreak(games, 'points', 20).currentAbove).toBe(3)
  })

  it('breaks streak when game below threshold', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 25 } }),
      makeGame({ date: '2024-01-02', stats: { points: 25 } }),
      makeGame({ date: '2024-01-03', stats: { points: 10 } }), // breaks streak
      makeGame({ date: '2024-01-04', stats: { points: 25 } }),
    ]
    expect(statStreak(games, 'points', 20).currentAbove).toBe(1)
  })

  it('tracks longest streak', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 25 } }),
      makeGame({ date: '2024-01-02', stats: { points: 25 } }),
      makeGame({ date: '2024-01-03', stats: { points: 25 } }),
      makeGame({ date: '2024-01-04', stats: { points: 5 } }),
      makeGame({ date: '2024-01-05', stats: { points: 25 } }),
    ]
    expect(statStreak(games, 'points', 20).longestAbove).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// per36Minutes
// ---------------------------------------------------------------------------

describe('per36Minutes', () => {
  it('returns empty array for empty games', () => {
    expect(per36Minutes([], 'points')).toEqual([])
  })

  it('returns 0 when minutesPlayed is 0', () => {
    const games = [makeGame({ minutesPlayed: 0, stats: { points: 10 } })]
    expect(per36Minutes(games, 'points')[0]).toBe(0)
  })

  it('normalizes correctly to per-36', () => {
    const games = [makeGame({ minutesPlayed: 18, stats: { points: 18 } })]
    expect(per36Minutes(games, 'points')[0]).toBeCloseTo(36)
  })

  it('handles full 36 minutes', () => {
    const games = [makeGame({ minutesPlayed: 36, stats: { points: 24 } })]
    expect(per36Minutes(games, 'points')[0]).toBeCloseTo(24)
  })

  it('returns array same length as games', () => {
    const games = makeGames(5)
    expect(per36Minutes(games, 'points')).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// standardScore
// ---------------------------------------------------------------------------

describe('standardScore', () => {
  it('returns empty array for empty games', () => {
    expect(standardScore([], 'points')).toEqual([])
  })

  it('returns all zeros when all values are constant', () => {
    const games = [
      makeGame({ stats: { points: 20 } }),
      makeGame({ stats: { points: 20 } }),
      makeGame({ stats: { points: 20 } }),
    ]
    expect(standardScore(games, 'points')).toEqual([0, 0, 0])
  })

  it('scores sum to approximately 0', () => {
    const games = makeGames(6, i => ({ points: i * 5 }))
    const scores = standardScore(games, 'points')
    const sum = scores.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum)).toBeLessThan(1e-10)
  })

  it('score for max value is positive', () => {
    const games = [
      makeGame({ date: '2024-01-01', stats: { points: 10 } }),
      makeGame({ date: '2024-01-02', stats: { points: 20 } }),
      makeGame({ date: '2024-01-03', stats: { points: 30 } }),
    ]
    const scores = standardScore(games, 'points')
    expect(scores[2]).toBeGreaterThan(0) // max value has positive z
  })

  it('returns correct length', () => {
    const games = makeGames(5)
    expect(standardScore(games, 'points')).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// compareSeasons
// ---------------------------------------------------------------------------

describe('compareSeasons', () => {
  it('computes season averages correctly', () => {
    const s1 = [makeGame({ stats: { points: 20 } }), makeGame({ stats: { points: 20 } })]
    const s2 = [makeGame({ stats: { points: 30 } }), makeGame({ stats: { points: 30 } })]
    const result = compareSeasons(s1, s2, 'points')
    expect(result.season1Avg).toBeCloseTo(20)
    expect(result.season2Avg).toBeCloseTo(30)
  })

  it('computes delta', () => {
    const s1 = [makeGame({ stats: { points: 20 } })]
    const s2 = [makeGame({ stats: { points: 25 } })]
    expect(compareSeasons(s1, s2, 'points').delta).toBeCloseTo(5)
  })

  it('computes pctChange', () => {
    const s1 = [makeGame({ stats: { points: 20 } })]
    const s2 = [makeGame({ stats: { points: 25 } })]
    expect(compareSeasons(s1, s2, 'points').pctChange).toBeCloseTo(0.25)
  })

  it('improved is true when season2 > season1', () => {
    const s1 = [makeGame({ stats: { points: 20 } })]
    const s2 = [makeGame({ stats: { points: 25 } })]
    expect(compareSeasons(s1, s2, 'points').improved).toBe(true)
  })

  it('improved is false when season2 < season1', () => {
    const s1 = [makeGame({ stats: { points: 25 } })]
    const s2 = [makeGame({ stats: { points: 20 } })]
    expect(compareSeasons(s1, s2, 'points').improved).toBe(false)
  })

  it('handles empty season1', () => {
    const s2 = [makeGame({ stats: { points: 25 } })]
    const result = compareSeasons([], s2, 'points')
    expect(result.season1Avg).toBe(0)
  })

  it('pctChange is 0 when season1 avg is 0', () => {
    const s1 = [makeGame({ stats: { points: 0 } })]
    const s2 = [makeGame({ stats: { points: 10 } })]
    expect(compareSeasons(s1, s2, 'points').pctChange).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// buildPlayerProfile
// ---------------------------------------------------------------------------

describe('buildPlayerProfile', () => {
  const games = [
    makeGame({ date: '2024-01-01', homeAway: 'home', result: 'W', stats: { points: 20, rebounds: 5, assists: 4 } }),
    makeGame({ date: '2024-01-02', homeAway: 'away', result: 'L', stats: { points: 15, rebounds: 3, assists: 6 } }),
    makeGame({ date: '2024-01-03', homeAway: 'home', result: 'W', stats: { points: 25, rebounds: 8, assists: 3 } }),
    makeGame({ date: '2024-01-04', homeAway: 'away', result: 'W', stats: { points: 30, rebounds: 7, assists: 2 } }),
    makeGame({ date: '2024-01-05', homeAway: 'home', result: 'L', stats: { points: 10, rebounds: 4, assists: 5 } }),
    makeGame({ date: '2024-01-06', homeAway: 'away', result: 'W', stats: { points: 28, rebounds: 6, assists: 7 } }),
  ]

  it('returns correct gamesPlayed', () => {
    const profile = buildPlayerProfile(games, ['points', 'rebounds'])
    expect(profile.gamesPlayed).toBe(6)
  })

  it('season averages include all primary stats', () => {
    const profile = buildPlayerProfile(games, ['points', 'rebounds'])
    expect(profile.seasonAverages).toHaveProperty('points')
    expect(profile.seasonAverages).toHaveProperty('rebounds')
  })

  it('lastFiveAvg is based on 5 most recent games', () => {
    const profile = buildPlayerProfile(games, ['points'])
    // last 5 games: Jan 2-6 → 15+25+30+10+28 = 108 / 5 = 21.6
    expect(profile.lastFiveAvg['points']).toBeCloseTo(21.6)
  })

  it('homeAvg includes only home games', () => {
    const profile = buildPlayerProfile(games, ['points'])
    // home: 20+25+10 = 55 / 3 = 18.33
    expect(profile.homeAvg['points']).toBeCloseTo(18.33, 1)
  })

  it('awayAvg includes only away games', () => {
    const profile = buildPlayerProfile(games, ['points'])
    // away: 15+30+28 = 73 / 3 = 24.33
    expect(profile.awayAvg['points']).toBeCloseTo(24.33, 1)
  })

  it('consistency map has CV for each stat', () => {
    const profile = buildPlayerProfile(games, ['points', 'rebounds'])
    expect(profile.consistency).toHaveProperty('points')
    expect(profile.consistency).toHaveProperty('rebounds')
    expect(typeof profile.consistency['points']).toBe('number')
  })

  it('trend map has trend for each stat', () => {
    const profile = buildPlayerProfile(games, ['points', 'rebounds'])
    expect(profile.trend).toHaveProperty('points')
    expect(['improving', 'declining', 'stable']).toContain(profile.trend['points'])
  })

  it('returns gamesPlayed=0 for empty games', () => {
    const profile = buildPlayerProfile([], ['points'])
    expect(profile.gamesPlayed).toBe(0)
  })

  it('handles single game', () => {
    const profile = buildPlayerProfile([games[0]!], ['points'])
    expect(profile.gamesPlayed).toBe(1)
    expect(profile.seasonAverages['points']).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// Edge cases: all zeros
// ---------------------------------------------------------------------------

describe('edge cases: all zeros', () => {
  const zeroGames = [
    makeGame({ stats: { points: 0, rebounds: 0 } }),
    makeGame({ stats: { points: 0, rebounds: 0 } }),
  ]

  it('aggregateTotals handles all-zero stats', () => {
    const { totals, perGame } = aggregateTotals(zeroGames)
    expect(totals['points']).toBe(0)
    expect(perGame['points']).toBe(0)
  })

  it('weightedRecentForm handles all-zero stats', () => {
    expect(weightedRecentForm(zeroGames, 'points')).toBe(0)
  })

  it('bigGameRate with zero threshold returns 1', () => {
    expect(bigGameRate(zeroGames, 'points', 0)).toBeCloseTo(1)
  })

  it('statConsistency cv is 0 for all-zero', () => {
    expect(statConsistency(zeroGames, 'points').cv).toBe(0)
  })
})
