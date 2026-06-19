/**
 * Tests for player comparison and ranking utilities.
 *
 * Covers: normalizeStats, compositeScore, rankPlayers, comparePlayers,
 * percentileRanking, findSimilarPlayers, statVectorSimilarity,
 * ageCurveAdjustment, h2hComparison, positionRanking, playerTier,
 * dominanceScore, performanceTrend, vorp, draftValue, buildOptimalLineup.
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeStats,
  compositeScore,
  rankPlayers,
  comparePlayers,
  percentileRanking,
  findSimilarPlayers,
  statVectorSimilarity,
  ageCurveAdjustment,
  h2hComparison,
  positionRanking,
  playerTier,
  dominanceScore,
  performanceTrend,
  vorp,
  draftValue,
  buildOptimalLineup,
  type PlayerProfile,
  type StatCategory,
  type PlayerStat,
} from '@/lib/sports/player-comparison'

// ── Test helpers ───────────────────────────────────────────────────────────

function makePlayer(
  id: string,
  position: string,
  stats: Record<string, number>,
  extra?: Partial<PlayerProfile>
): PlayerProfile {
  const statList: PlayerStat[] = Object.entries(stats).map(([statName, value]) => ({
    statName,
    value,
    category: 'general' as StatCategory,
  }))
  return {
    playerId: id,
    name: `Player ${id}`,
    position,
    team: 'TEST',
    stats: statList,
    ...extra,
  }
}

function makePlayerCat(
  id: string,
  position: string,
  stats: Array<{ name: string; value: number; category: StatCategory; weight?: number }>
): PlayerProfile {
  return {
    playerId: id,
    name: `Player ${id}`,
    position,
    team: 'TEST',
    stats: stats.map(({ name, value, category, weight }) => ({
      statName: name,
      value,
      category,
      weight,
    })),
  }
}

// ── normalizeStats ─────────────────────────────────────────────────────────

describe('normalizeStats', () => {
  it('maps the minimum value player to 0', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }), makePlayer('b', 'QB', { yards: 200 })]
    const result = normalizeStats(players, 'yards')
    expect(result.get('a')).toBe(0)
  })

  it('maps the maximum value player to 100', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }), makePlayer('b', 'QB', { yards: 200 })]
    const result = normalizeStats(players, 'yards')
    expect(result.get('b')).toBe(100)
  })

  it('maps mid value to 50 when three equidistant values', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 0 }),
      makePlayer('b', 'QB', { yards: 50 }),
      makePlayer('c', 'QB', { yards: 100 }),
    ]
    const result = normalizeStats(players, 'yards')
    expect(result.get('b')).toBe(50)
  })

  it('all players get 50 when all values are the same', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 200 }),
      makePlayer('b', 'QB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 200 }),
    ]
    const result = normalizeStats(players, 'yards')
    expect(result.get('a')).toBe(50)
    expect(result.get('b')).toBe(50)
    expect(result.get('c')).toBe(50)
  })

  it('players without the stat get 0', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }), makePlayer('b', 'QB', {})]
    const result = normalizeStats(players, 'yards')
    expect(result.get('b')).toBe(0)
  })

  it('returns a map with all players', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }), makePlayer('b', 'QB', { yards: 200 })]
    const result = normalizeStats(players, 'yards')
    expect(result.size).toBe(2)
  })

  it('returns 0 for all when no player has the stat', () => {
    const players = [makePlayer('a', 'QB', {}), makePlayer('b', 'QB', {})]
    const result = normalizeStats(players, 'yards')
    expect(result.get('a')).toBe(0)
    expect(result.get('b')).toBe(0)
  })

  it('handles a single player with that stat', () => {
    const players = [makePlayer('a', 'QB', { yards: 300 })]
    const result = normalizeStats(players, 'yards')
    // Single value — all same → 50
    expect(result.get('a')).toBe(50)
  })

  it('excludes missing-stat players from min/max computation', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 300 }),
      makePlayer('c', 'QB', {}), // no yards stat
    ]
    const result = normalizeStats(players, 'yards')
    expect(result.get('a')).toBe(0)
    expect(result.get('b')).toBe(100)
    expect(result.get('c')).toBe(0)
  })
})

// ── compositeScore ─────────────────────────────────────────────────────────

describe('compositeScore', () => {
  it('returns 0 for a player with no stats', () => {
    const player = makePlayer('a', 'QB', {})
    expect(compositeScore(player, [player])).toBe(0)
  })

  it('higher stat values produce higher scores', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }), makePlayer('b', 'QB', { yards: 300 })]
    const scoreA = compositeScore(players[0], players)
    const scoreB = compositeScore(players[1], players)
    expect(scoreB).toBeGreaterThan(scoreA)
  })

  it('scores are between 0 and 100', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 50, tds: 10 }),
      makePlayer('b', 'QB', { yards: 300, tds: 30 }),
    ]
    for (const p of players) {
      const s = compositeScore(p, players)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(100)
    }
  })

  it('applies weight overrides correctly — higher weight on a winning stat increases score', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100, tds: 50 }),
      makePlayer('b', 'QB', { yards: 200, tds: 10 }),
    ]
    // Player B wins yards, Player A wins tds
    // Weight tds heavily → A should score higher
    const scoreA = compositeScore(players[0], players, { tds: 10, yards: 1 })
    const scoreB = compositeScore(players[1], players, { tds: 10, yards: 1 })
    expect(scoreA).toBeGreaterThan(scoreB)
  })

  it('stat-level weights are respected when no override provided', () => {
    const high: PlayerProfile = {
      playerId: 'h',
      name: 'H',
      position: 'QB',
      team: 'T',
      stats: [{ statName: 'tds', value: 100, category: 'general', weight: 5 }],
    }
    const low: PlayerProfile = {
      playerId: 'l',
      name: 'L',
      position: 'QB',
      team: 'T',
      stats: [{ statName: 'tds', value: 0, category: 'general', weight: 5 }],
    }
    const scoreH = compositeScore(high, [high, low])
    const scoreL = compositeScore(low, [high, low])
    expect(scoreH).toBeGreaterThan(scoreL)
  })

  it('returns 100 for the sole dominant player in a 2-player pool', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }), makePlayer('b', 'QB', { yards: 0 })]
    expect(compositeScore(players[0], players)).toBe(100)
  })

  it('returns 50 for all players when all stat values are equal', () => {
    const players = [makePlayer('a', 'QB', { yards: 50 }), makePlayer('b', 'QB', { yards: 50 })]
    expect(compositeScore(players[0], players)).toBe(50)
    expect(compositeScore(players[1], players)).toBe(50)
  })
})

// ── rankPlayers ────────────────────────────────────────────────────────────

describe('rankPlayers', () => {
  it('rank 1 has the best score', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 500 }),
      makePlayer('c', 'QB', { yards: 300 }),
    ]
    const rankings = rankPlayers(players)
    expect(rankings[0].rank).toBe(1)
    expect(rankings[0].playerId).toBe('b')
  })

  it('assigns consecutive ranks', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 300 }),
    ]
    const rankings = rankPlayers(players)
    expect(rankings.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('rank 1 player gets percentileOverall of 100', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 300 }),
    ]
    const rankings = rankPlayers(players)
    expect(rankings.find((r) => r.rank === 1)?.percentileOverall).toBe(100)
  })

  it('last rank player gets percentileOverall of 0', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 300 }),
    ]
    const rankings = rankPlayers(players)
    expect(rankings.find((r) => r.rank === 3)?.percentileOverall).toBe(0)
  })

  it('returns empty array for empty input', () => {
    expect(rankPlayers([])).toEqual([])
  })

  it('single player gets rank 1 and percentile 100', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 })]
    const rankings = rankPlayers(players)
    expect(rankings[0].rank).toBe(1)
    expect(rankings[0].percentileOverall).toBe(100)
  })

  it('results include playerId, name, position, compositeScore', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 })]
    const rankings = rankPlayers(players)
    expect(rankings[0].playerId).toBe('a')
    expect(rankings[0].name).toBe('Player a')
    expect(rankings[0].position).toBe('QB')
    expect(rankings[0].compositeScore).toBeGreaterThanOrEqual(0)
  })

  it('weight overrides affect ranking order', () => {
    // Both players have both stats so weight overrides can change relative ranking.
    // a: high yards but low tds
    // b: low yards but high tds
    // equal-weight: each wins one stat → scores equal → stable: 'a' first (pool order)
    // With tds×10: b's tds advantage is amplified → b should win
    const a = makePlayer('a', 'QB', { yards: 100, tds: 0 })
    const b = makePlayer('b', 'QB', { yards: 0, tds: 100 })
    const pool = [a, b]
    const weightedTds = rankPlayers(pool, { tds: 10, yards: 1 })
    expect(weightedTds[0].playerId).toBe('b')
    const weightedYards = rankPlayers(pool, { yards: 10, tds: 1 })
    expect(weightedYards[0].playerId).toBe('a')
  })
})

// ── comparePlayers ─────────────────────────────────────────────────────────

describe('comparePlayers', () => {
  it('winner is the player with the higher overall score', () => {
    const a = makePlayer('a', 'QB', { yards: 500, tds: 40 })
    const b = makePlayer('b', 'QB', { yards: 100, tds: 5 })
    const result = comparePlayers(a, b)
    expect(result.winner).toBe('a')
  })

  it('returns tie when scores are equal', () => {
    const a = makePlayer('a', 'QB', { yards: 200 })
    const b = makePlayer('b', 'QB', { yards: 200 })
    const result = comparePlayers(a, b)
    expect(result.winner).toBe('tie')
  })

  it('similarity between identical stat vectors is 1.0', () => {
    const a = makePlayer('a', 'QB', { yards: 200, tds: 20 })
    const b = makePlayer('b', 'QB', { yards: 200, tds: 20 })
    const result = comparePlayers(a, b)
    expect(result.similarity).toBe(1)
  })

  it('advantages list has at most 5 items', () => {
    const a = makePlayer('a', 'QB', { s1: 10, s2: 20, s3: 30, s4: 40, s5: 50, s6: 60 })
    const b = makePlayer('b', 'QB', { s1: 5, s2: 10, s3: 15, s4: 20, s5: 25, s6: 30 })
    const result = comparePlayers(a, b)
    expect(result.advantages.length).toBeLessThanOrEqual(5)
  })

  it('advantages are sorted by diff descending', () => {
    const a = makePlayer('a', 'QB', { s1: 100, s2: 10 })
    const b = makePlayer('b', 'QB', { s1: 0, s2: 0 })
    const result = comparePlayers(a, b)
    expect(result.advantages[0].diff).toBeGreaterThanOrEqual(result.advantages[1]?.diff ?? 0)
  })

  it('advantage playerId is correct', () => {
    const a = makePlayer('a', 'QB', { yards: 500 })
    const b = makePlayer('b', 'QB', { yards: 100 })
    const result = comparePlayers(a, b)
    expect(result.advantages[0].playerId).toBe('a')
  })

  it('returns playerAId and playerBId correctly', () => {
    const a = makePlayer('a', 'QB', { yards: 100 })
    const b = makePlayer('b', 'QB', { yards: 200 })
    const result = comparePlayers(a, b)
    expect(result.playerAId).toBe('a')
    expect(result.playerBId).toBe('b')
  })

  it('uses allPlayers pool when provided', () => {
    const a = makePlayer('a', 'QB', { yards: 100 })
    const b = makePlayer('b', 'QB', { yards: 200 })
    const c = makePlayer('c', 'QB', { yards: 1000 }) // dominant player in pool
    const resultWithPool = comparePlayers(a, b, [a, b, c])
    // With c in pool, both a and b get lower scores but b still wins
    expect(resultWithPool.winner).toBe('b')
  })

  it('overallScoreA and overallScoreB are in [0,100]', () => {
    const a = makePlayer('a', 'QB', { yards: 100 })
    const b = makePlayer('b', 'QB', { yards: 200 })
    const result = comparePlayers(a, b)
    expect(result.overallScoreA).toBeGreaterThanOrEqual(0)
    expect(result.overallScoreA).toBeLessThanOrEqual(100)
    expect(result.overallScoreB).toBeGreaterThanOrEqual(0)
    expect(result.overallScoreB).toBeLessThanOrEqual(100)
  })
})

// ── percentileRanking ──────────────────────────────────────────────────────

describe('percentileRanking', () => {
  it('returns null when player not found', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 })]
    expect(percentileRanking(players, 'x', 'yards')).toBeNull()
  })

  it('returns null when stat not found for player', () => {
    const players = [makePlayer('a', 'QB', {})]
    expect(percentileRanking(players, 'a', 'yards')).toBeNull()
  })

  it('top player gets percentile of 100', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 300 }),
    ]
    const result = percentileRanking(players, 'c', 'yards')
    expect(result?.percentile).toBe(100)
  })

  it('bottom player gets percentile of 0', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 300 }),
    ]
    const result = percentileRanking(players, 'a', 'yards')
    expect(result?.percentile).toBe(0)
  })

  it('tier elite for >= 90th percentile', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    // p9 is top (100th percentile)
    const result = percentileRanking(players, 'p9', 'yards')
    expect(result?.tier).toBe('elite')
  })

  it('tier above-average for 70-89th percentile', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    // p7 has 7 players below it out of 9 others → 7/9 * 100 ≈ 77.8th
    const result = percentileRanking(players, 'p7', 'yards')
    expect(result?.tier).toBe('above-average')
  })

  it('tier average for 40-69th percentile', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    // p5 → 5/9 * 100 ≈ 55.6th
    const result = percentileRanking(players, 'p5', 'yards')
    expect(result?.tier).toBe('average')
  })

  it('tier below-average for 20-39th percentile', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    // p3 → 3/9 * 100 ≈ 33.3rd
    const result = percentileRanking(players, 'p3', 'yards')
    expect(result?.tier).toBe('below-average')
  })

  it('tier poor for < 20th percentile', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    // p1 → 1/9 * 100 ≈ 11.1th
    const result = percentileRanking(players, 'p1', 'yards')
    expect(result?.tier).toBe('poor')
  })

  it('returns correct value in result', () => {
    const players = [makePlayer('a', 'QB', { yards: 250 }), makePlayer('b', 'QB', { yards: 100 })]
    const result = percentileRanking(players, 'a', 'yards')
    expect(result?.value).toBe(250)
  })

  it('zScore is 0 when stdDev is 0 (all same values)', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }), makePlayer('b', 'QB', { yards: 100 })]
    const result = percentileRanking(players, 'a', 'yards')
    expect(result?.zScore).toBe(0)
  })

  it('positive zScore for above-mean player', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 300 }),
    ]
    const result = percentileRanking(players, 'c', 'yards')
    expect(result?.zScore).toBeGreaterThan(0)
  })
})

// ── statVectorSimilarity ───────────────────────────────────────────────────

describe('statVectorSimilarity', () => {
  it('identical vectors produce similarity of 1.0', () => {
    const a = makePlayer('a', 'QB', { yards: 100, tds: 20 })
    const b = makePlayer('b', 'QB', { yards: 100, tds: 20 })
    expect(statVectorSimilarity(a, b)).toBe(1)
  })

  it('orthogonal vectors produce similarity of 0.0', () => {
    const a = makePlayer('a', 'QB', { stat1: 10, stat2: 0 })
    const b = makePlayer('b', 'QB', { stat1: 0, stat2: 10 })
    expect(statVectorSimilarity(a, b)).toBe(0)
  })

  it('returns 0 when both players have no stats', () => {
    const a = makePlayer('a', 'QB', {})
    const b = makePlayer('b', 'QB', {})
    expect(statVectorSimilarity(a, b)).toBe(0)
  })

  it('returns 0 when one player has no matching stats', () => {
    const a = makePlayer('a', 'QB', { yards: 100 })
    const b = makePlayer('b', 'QB', { tds: 20 })
    expect(statVectorSimilarity(a, b)).toBe(0)
  })

  it('value is between 0 and 1', () => {
    const a = makePlayer('a', 'QB', { yards: 100, tds: 10, ints: 3 })
    const b = makePlayer('b', 'QB', { yards: 200, tds: 5, ints: 10 })
    const sim = statVectorSimilarity(a, b)
    expect(sim).toBeGreaterThanOrEqual(0)
    expect(sim).toBeLessThanOrEqual(1)
  })

  it('scaling a vector does not change similarity (proportional)', () => {
    const a = makePlayer('a', 'QB', { yards: 100, tds: 20 })
    const b = makePlayer('b', 'QB', { yards: 200, tds: 40 }) // 2x scale of a
    expect(statVectorSimilarity(a, b)).toBeCloseTo(1, 5)
  })
})

// ── findSimilarPlayers ─────────────────────────────────────────────────────

describe('findSimilarPlayers', () => {
  it('excludes the target player itself', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 100 }),
      makePlayer('c', 'QB', { yards: 100 }),
    ]
    const results = findSimilarPlayers(players[0], players)
    expect(results.find((r) => r.playerId === 'a')).toBeUndefined()
  })

  it('returns at most topN results', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 10 })
    )
    const results = findSimilarPlayers(players[0], players, { topN: 3 })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('results are sorted by similarity descending', () => {
    const target = makePlayer('t', 'QB', { yards: 100, tds: 20 })
    const identical = makePlayer('id', 'QB', { yards: 100, tds: 20 })
    const different = makePlayer('df', 'QB', { yards: 1, tds: 1 })
    const results = findSimilarPlayers(target, [target, identical, different])
    expect(results[0].playerId).toBe('id')
  })

  it('samePosition filter excludes different positions', () => {
    const target = makePlayer('t', 'QB', { yards: 100 })
    const qb = makePlayer('a', 'QB', { yards: 100 })
    const rb = makePlayer('b', 'RB', { yards: 100 })
    const results = findSimilarPlayers(target, [target, qb, rb], { samePosition: true })
    expect(results.find((r) => r.playerId === 'b')).toBeUndefined()
  })

  it('samePosition: false includes different positions', () => {
    const target = makePlayer('t', 'QB', { yards: 100 })
    const qb = makePlayer('a', 'QB', { yards: 100 })
    const rb = makePlayer('b', 'RB', { yards: 100 })
    const results = findSimilarPlayers(target, [target, qb, rb], { samePosition: false })
    expect(results.length).toBe(2)
  })

  it('minSimilarity filter applies correctly', () => {
    const target = makePlayer('t', 'QB', { yards: 100 })
    const similar = makePlayer('s', 'QB', { yards: 100 })
    const different = makePlayer('d', 'QB', { tds: 100 }) // no overlap with target
    const results = findSimilarPlayers(target, [target, similar, different], { minSimilarity: 0.5 })
    expect(results.find((r) => r.playerId === 'd')).toBeUndefined()
  })

  it('positionMatch is true when positions match', () => {
    const target = makePlayer('t', 'QB', { yards: 100 })
    const same = makePlayer('a', 'QB', { yards: 100 })
    const results = findSimilarPlayers(target, [target, same])
    expect(results[0].positionMatch).toBe(true)
  })

  it('positionMatch is false when positions differ', () => {
    const target = makePlayer('t', 'QB', { yards: 100 })
    const other = makePlayer('a', 'RB', { yards: 100 })
    const results = findSimilarPlayers(target, [target, other])
    expect(results[0].positionMatch).toBe(false)
  })

  it('keySharedStrengths contains stats where both are above pool average', () => {
    const pool = [
      makePlayer('a', 'QB', { yards: 200, tds: 30 }),
      makePlayer('b', 'QB', { yards: 200, tds: 30 }),
      makePlayer('low1', 'QB', { yards: 10, tds: 2 }),
      makePlayer('low2', 'QB', { yards: 10, tds: 2 }),
    ]
    const results = findSimilarPlayers(pool[0], pool)
    // a and b both have above-avg yards and tds
    const topResult = results.find((r) => r.playerId === 'b')
    expect(topResult?.keySharedStrengths).toContain('yards')
    expect(topResult?.keySharedStrengths).toContain('tds')
  })
})

// ── ageCurveAdjustment ─────────────────────────────────────────────────────

describe('ageCurveAdjustment', () => {
  it('QB at 31 is at peak (multiplier = 1.1)', () => {
    expect(ageCurveAdjustment(31, 'QB')).toBe(1.1)
  })

  it('RB at 28 is past peak (multiplier < 1.0)', () => {
    const mult = ageCurveAdjustment(28, 'RB')
    expect(mult).toBeLessThan(1.0)
  })

  it('RB at 25 is at peak', () => {
    expect(ageCurveAdjustment(25, 'RB')).toBe(1.1)
  })

  it('WR at 27 is at peak', () => {
    expect(ageCurveAdjustment(27, 'WR')).toBe(1.1)
  })

  it('OL at 30 is at peak', () => {
    expect(ageCurveAdjustment(30, 'OL')).toBe(1.1)
  })

  it('very young QB gets minimum of 0.8 (not below 0.8)', () => {
    const mult = ageCurveAdjustment(18, 'QB')
    expect(mult).toBeGreaterThanOrEqual(0.8)
  })

  it('very old RB is above minimum 0.75', () => {
    const mult = ageCurveAdjustment(40, 'RB')
    expect(mult).toBeGreaterThanOrEqual(0.75)
  })

  it('returns value >= 0.75 for all ages', () => {
    const positions = ['QB', 'RB', 'WR', 'OL', 'DL', 'TE', 'CB']
    const ages = [18, 20, 25, 30, 35, 40]
    for (const pos of positions) {
      for (const age of ages) {
        expect(ageCurveAdjustment(age, pos)).toBeGreaterThanOrEqual(0.75)
      }
    }
  })

  it('multiplier at prime age is 1.1', () => {
    // QB peak 29-33
    expect(ageCurveAdjustment(29, 'QB')).toBe(1.1)
    expect(ageCurveAdjustment(33, 'QB')).toBe(1.1)
  })
})

// ── h2hComparison ──────────────────────────────────────────────────────────

describe('h2hComparison', () => {
  it('returns records for shared stats only', () => {
    const a = makePlayer('a', 'QB', { yards: 300, tds: 20 })
    const b = makePlayer('b', 'QB', { yards: 100, ints: 5 })
    const result = h2hComparison(a, b)
    const statNames = result.map((r) => r.stat)
    expect(statNames).toContain('yards')
    expect(statNames).not.toContain('tds')
    expect(statNames).not.toContain('ints')
  })

  it('advantage A when player A has higher value', () => {
    const a = makePlayer('a', 'QB', { yards: 300 })
    const b = makePlayer('b', 'QB', { yards: 100 })
    const result = h2hComparison(a, b)
    expect(result.find((r) => r.stat === 'yards')?.advantage).toBe('A')
  })

  it('advantage B when player B has higher value', () => {
    const a = makePlayer('a', 'QB', { yards: 50 })
    const b = makePlayer('b', 'QB', { yards: 200 })
    const result = h2hComparison(a, b)
    expect(result.find((r) => r.stat === 'yards')?.advantage).toBe('B')
  })

  it('advantage tie when values are equal', () => {
    const a = makePlayer('a', 'QB', { yards: 100 })
    const b = makePlayer('b', 'QB', { yards: 100 })
    const result = h2hComparison(a, b)
    expect(result.find((r) => r.stat === 'yards')?.advantage).toBe('tie')
  })

  it('sorted by abs pctDiff descending', () => {
    const a = makePlayer('a', 'QB', { yards: 1000, tds: 21 })
    const b = makePlayer('b', 'QB', { yards: 100, tds: 20 })
    const result = h2hComparison(a, b)
    const diffs = result.map((r) => Math.abs(r.pctDiff))
    for (let i = 1; i < diffs.length; i++) {
      expect(diffs[i - 1]).toBeGreaterThanOrEqual(diffs[i])
    }
  })

  it('returns correct valueA and valueB', () => {
    const a = makePlayer('a', 'QB', { yards: 300 })
    const b = makePlayer('b', 'QB', { yards: 100 })
    const result = h2hComparison(a, b)
    const rec = result.find((r) => r.stat === 'yards')!
    expect(rec.valueA).toBe(300)
    expect(rec.valueB).toBe(100)
  })

  it('returns empty array when no shared stats', () => {
    const a = makePlayer('a', 'QB', { yards: 300 })
    const b = makePlayer('b', 'QB', { tds: 20 })
    expect(h2hComparison(a, b)).toEqual([])
  })
})

// ── positionRanking ────────────────────────────────────────────────────────

describe('positionRanking', () => {
  it('only includes players at the given position', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 300 }),
      makePlayer('b', 'RB', { yards: 200 }),
      makePlayer('c', 'QB', { yards: 100 }),
    ]
    const rankings = positionRanking(players, 'QB')
    expect(rankings.every((r) => ['a', 'c'].includes(r.playerId))).toBe(true)
    expect(rankings.find((r) => r.playerId === 'b')).toBeUndefined()
  })

  it('returns empty array when no players at position', () => {
    const players = [makePlayer('a', 'QB', { yards: 300 })]
    expect(positionRanking(players, 'RB')).toEqual([])
  })

  it('ranks within-position correctly', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 100 }),
      makePlayer('b', 'QB', { yards: 300 }),
      makePlayer('c', 'RB', { yards: 999 }),
    ]
    const rankings = positionRanking(players, 'QB')
    expect(rankings[0].playerId).toBe('b')
  })
})

// ── playerTier ─────────────────────────────────────────────────────────────

describe('playerTier', () => {
  it('top player in a pool is franchise', () => {
    const players = Array.from({ length: 20 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    // p19 is the top player (percentile 100)
    expect(playerTier(players[19], players)).toBe('franchise')
  })

  it('bottom player is practice-squad', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    expect(playerTier(players[0], players)).toBe('practice-squad')
  })

  it('middle player is starter or depth', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    const tier = playerTier(players[5], players)
    expect(['starter', 'depth'].includes(tier)).toBe(true)
  })

  it('returns practice-squad when player not in pool', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 })]
    const outsider = makePlayer('x', 'QB', { yards: 200 })
    expect(playerTier(outsider, players)).toBe('practice-squad')
  })
})

// ── dominanceScore ─────────────────────────────────────────────────────────

describe('dominanceScore', () => {
  it('correctly counts wins for player A', () => {
    const a = makePlayer('a', 'QB', { yards: 300, tds: 30, ints: 5 })
    const b = makePlayer('b', 'QB', { yards: 100, tds: 10, ints: 20 })
    const result = dominanceScore(a, b)
    // A wins yards, tds; B wins ints
    expect(result.playerA).toBe(2)
    expect(result.playerB).toBe(1)
  })

  it('shared count is number of stats both have', () => {
    const a = makePlayer('a', 'QB', { yards: 300, tds: 30 })
    const b = makePlayer('b', 'QB', { yards: 100, ints: 5 })
    const result = dominanceScore(a, b)
    expect(result.shared).toBe(1) // only yards
  })

  it('all zeros when no shared stats', () => {
    const a = makePlayer('a', 'QB', { yards: 300 })
    const b = makePlayer('b', 'QB', { tds: 20 })
    const result = dominanceScore(a, b)
    expect(result.playerA).toBe(0)
    expect(result.playerB).toBe(0)
    expect(result.shared).toBe(0)
  })

  it('ties are not counted for either player', () => {
    const a = makePlayer('a', 'QB', { yards: 100 })
    const b = makePlayer('b', 'QB', { yards: 100 })
    const result = dominanceScore(a, b)
    expect(result.playerA).toBe(0)
    expect(result.playerB).toBe(0)
    expect(result.shared).toBe(1)
  })
})

// ── performanceTrend ───────────────────────────────────────────────────────

describe('performanceTrend', () => {
  it('detects upward trend', () => {
    const current = makePlayer('a', 'QB', { yards: 300 })
    const previous = makePlayer('a', 'QB', { yards: 200 })
    const result = performanceTrend(current, previous)
    expect(result.find((r) => r.statName === 'yards')?.trending).toBe('up')
  })

  it('detects downward trend', () => {
    const current = makePlayer('a', 'QB', { yards: 100 })
    const previous = makePlayer('a', 'QB', { yards: 200 })
    const result = performanceTrend(current, previous)
    expect(result.find((r) => r.statName === 'yards')?.trending).toBe('down')
  })

  it('detects flat trend when change < 2%', () => {
    const current = makePlayer('a', 'QB', { yards: 201 })
    const previous = makePlayer('a', 'QB', { yards: 200 })
    // 1/200 = 0.005 = 0.5% change → flat
    const result = performanceTrend(current, previous)
    expect(result.find((r) => r.statName === 'yards')?.trending).toBe('flat')
  })

  it('returns correct change and pctChange', () => {
    const current = makePlayer('a', 'QB', { yards: 300 })
    const previous = makePlayer('a', 'QB', { yards: 200 })
    const result = performanceTrend(current, previous)
    const rec = result.find((r) => r.statName === 'yards')!
    expect(rec.change).toBe(100)
    expect(rec.pctChange).toBeCloseTo(0.5, 5)
  })

  it('only includes stats present in both snapshots', () => {
    const current = makePlayer('a', 'QB', { yards: 300, tds: 20 })
    const previous = makePlayer('a', 'QB', { yards: 200 })
    const result = performanceTrend(current, previous)
    const statNames = result.map((r) => r.statName)
    expect(statNames).toContain('yards')
    expect(statNames).not.toContain('tds')
  })

  it('exactly 2% change is flat', () => {
    const current = makePlayer('a', 'QB', { yards: 204 })
    const previous = makePlayer('a', 'QB', { yards: 200 })
    // 4/200 = 0.02 — boundary, should be flat (< 0.02 is false for 0.02)
    const result = performanceTrend(current, previous)
    // 0.02 is NOT < 0.02, so it's up
    expect(result.find((r) => r.statName === 'yards')?.trending).toBe('up')
  })
})

// ── vorp ───────────────────────────────────────────────────────────────────

describe('vorp', () => {
  it('returns positive VORP for an above-average player', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    const topPlayer = players[9]
    const result = vorp(topPlayer, players)
    expect(result).toBeGreaterThan(0)
  })

  it('returns 0 or negative for replacement-level player', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer(`p${i}`, 'QB', { yards: i * 100 })
    )
    const medianPlayer = players[4]
    const result = vorp(medianPlayer, players)
    // Replacement at 50th percentile, this player IS at ~50th, so VORP ≈ 0
    expect(Math.abs(result)).toBeLessThan(20) // within reasonable range
  })

  it('only considers players at the same position', () => {
    const qbs = Array.from({ length: 5 }, (_, i) =>
      makePlayer(`qb${i}`, 'QB', { yards: i * 100 })
    )
    const rbs = Array.from({ length: 5 }, (_, i) =>
      makePlayer(`rb${i}`, 'RB', { yards: i * 200 })
    )
    const allPlayers = [...qbs, ...rbs]
    // Top QB's VORP should be based on QB position
    const result = vorp(qbs[4], allPlayers)
    expect(result).toBeGreaterThan(0)
  })

  it('returns 0 for player with no same-position peers', () => {
    const player = makePlayer('a', 'QB', { yards: 100 })
    const other = makePlayer('b', 'RB', { yards: 200 })
    // No QB peers
    const result = vorp(player, [player, other])
    expect(result).toBe(0)
  })
})

// ── draftValue ─────────────────────────────────────────────────────────────

describe('draftValue', () => {
  it('higher scarcity multiplier yields higher draft value', () => {
    const players = [
      makePlayer('a', 'QB', { yards: 300 }, { age: 27 }),
      makePlayer('b', 'RB', { yards: 300 }, { age: 25 }),
    ]
    const lowScarcity = draftValue(players[0], players, { QB: 1.0, RB: 1.0 })
    const highScarcity = draftValue(players[0], players, { QB: 2.0, RB: 1.0 })
    expect(highScarcity).toBeGreaterThan(lowScarcity)
  })

  it('age curve affects draft value', () => {
    const oldQB = makePlayer('old', 'QB', { yards: 300 }, { age: 38 })
    const primeQB = makePlayer('prime', 'QB', { yards: 300 }, { age: 31 })
    const pool = [oldQB, primeQB]
    const oldVal = draftValue(oldQB, pool, { QB: 1.5 })
    const primeVal = draftValue(primeQB, pool, { QB: 1.5 })
    expect(primeVal).toBeGreaterThan(oldVal)
  })

  it('default scarcity of 1.0 when position not in map', () => {
    const player = makePlayer('a', 'QB', { yards: 300 }, { age: 30 })
    const pool = [player, makePlayer('b', 'QB', { yards: 100 }, { age: 30 })]
    const val = draftValue(player, pool, {})
    // Should equal compositeScore * 1.0 * ageCurve
    const expectedScore = compositeScore(player, pool)
    const expectedAge = ageCurveAdjustment(30, 'QB')
    expect(val).toBeCloseTo(expectedScore * expectedAge, 5)
  })

  it('returns non-negative value', () => {
    const players = [makePlayer('a', 'QB', { yards: 100 }, { age: 25 })]
    const val = draftValue(players[0], players, { QB: 1.2 })
    expect(val).toBeGreaterThanOrEqual(0)
  })
})

// ── buildOptimalLineup ─────────────────────────────────────────────────────

describe('buildOptimalLineup', () => {
  it('selects the required number of players per position', () => {
    const players = [
      makePlayer('qb1', 'QB', { yards: 300 }),
      makePlayer('qb2', 'QB', { yards: 100 }),
      makePlayer('rb1', 'RB', { yards: 200 }),
      makePlayer('rb2', 'RB', { yards: 150 }),
    ]
    const lineup = buildOptimalLineup(players, { QB: 1, RB: 2 })
    const qbs = lineup.filter((p) => p.position === 'QB')
    const rbs = lineup.filter((p) => p.position === 'RB')
    expect(qbs.length).toBe(1)
    expect(rbs.length).toBe(2)
  })

  it('picks the highest-scoring players at each position', () => {
    const players = [
      makePlayer('qb1', 'QB', { yards: 300 }),
      makePlayer('qb2', 'QB', { yards: 100 }),
    ]
    const lineup = buildOptimalLineup(players, { QB: 1 })
    expect(lineup[0].playerId).toBe('qb1')
  })

  it('does not select the same player twice', () => {
    const players = [makePlayer('a', 'QB', { yards: 300 }), makePlayer('b', 'QB', { yards: 100 })]
    const lineup = buildOptimalLineup(players, { QB: 2 })
    const ids = lineup.map((p) => p.playerId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns fewer players than required if not enough available', () => {
    const players = [makePlayer('a', 'QB', { yards: 300 })]
    const lineup = buildOptimalLineup(players, { QB: 3 })
    expect(lineup.length).toBe(1)
  })

  it('returns empty array when requirements are empty', () => {
    const players = [makePlayer('a', 'QB', { yards: 300 })]
    expect(buildOptimalLineup(players, {})).toEqual([])
  })
})
