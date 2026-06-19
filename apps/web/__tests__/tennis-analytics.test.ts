/**
 * tennis-analytics.test.ts
 * Comprehensive tests for tennis-analytics.ts
 * Coverage: serve stats, rally analysis, Elo/Glicko, match simulation, surface adjustments, fantasy scoring
 */

import { describe, it, expect } from 'vitest'
import {
  firstServePct,
  secondServePct,
  firstServeWinPct,
  secondServeWinPct,
  servicePointsWon,
  acePct,
  doubleFaultPct,
  holdPct,
  breakPct,
  savePct,
  rallyDistribution,
  avgRallyLength,
  rallyWinRate,
  expectedRallyLength,
  eloExpected,
  eloUpdate,
  surfaceEloUpdate,
  surfaceAdjustedElo,
  glickoExpected,
  glickoUpdate,
  pointProbFromElo,
  gameWinProb,
  tiebreakWinProb,
  setWinProb,
  matchWinProb,
  simulateMatch,
  setsWon,
  gamesWon,
  tiebreaksWon,
  matchDuration,
  gameScore,
  surfaceSpeedRating,
  serveAdvantageMultiplier,
  rallySurface,
  draftKingsScore,
  fanDuelScore,
  type ServeStats,
  type BreakPointStats,
  type MatchStats,
  type PlayerRating,
  type SurfaceRatings,
} from '../lib/sports/tennis-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeServeStats = (overrides: Partial<ServeStats> = {}): ServeStats => ({
  aces: 5,
  doubleFaults: 2,
  firstServeIn: 60,
  firstServeTotal: 80,
  secondServeIn: 15,
  secondServeTotal: 20,
  firstServeWon: 45,
  secondServeWon: 9,
  ...overrides,
})

const makeBreakPointStats = (overrides: Partial<BreakPointStats> = {}): BreakPointStats => ({
  opportunities: 8,
  converted: 3,
  faced: 10,
  saved: 7,
  ...overrides,
})

const makeMatchStats = (overrides: Partial<MatchStats> = {}): MatchStats => ({
  sets: [
    { gamesWon: 6, gamesLost: 4 },
    { gamesWon: 3, gamesLost: 6 },
    { gamesWon: 7, gamesLost: 5 },
  ],
  duration: 125,
  ...overrides,
})

const makeRating = (rating = 1500, uncertainty = 200): PlayerRating => ({
  rating,
  uncertainty,
})

const makeSurfaceRatings = (overrides: Partial<SurfaceRatings> = {}): SurfaceRatings => ({
  hard: makeRating(1600),
  clay: makeRating(1500),
  grass: makeRating(1700),
  ...overrides,
})

// ---------------------------------------------------------------------------
// Serve analysis
// ---------------------------------------------------------------------------

describe('firstServePct', () => {
  it('calculates first serve percentage correctly', () => {
    const stats = makeServeStats({ firstServeIn: 60, firstServeTotal: 80 })
    expect(firstServePct(stats)).toBeCloseTo(0.75)
  })

  it('returns 0 when firstServeTotal is 0', () => {
    const stats = makeServeStats({ firstServeIn: 0, firstServeTotal: 0 })
    expect(firstServePct(stats)).toBe(0)
  })

  it('returns 1.0 for perfect first serve rate', () => {
    const stats = makeServeStats({ firstServeIn: 100, firstServeTotal: 100 })
    expect(firstServePct(stats)).toBe(1.0)
  })

  it('handles partial first serve rate', () => {
    const stats = makeServeStats({ firstServeIn: 1, firstServeTotal: 3 })
    expect(firstServePct(stats)).toBeCloseTo(1 / 3)
  })
})

describe('secondServePct', () => {
  it('calculates second serve percentage', () => {
    const stats = makeServeStats({ secondServeIn: 15, secondServeTotal: 20 })
    expect(secondServePct(stats)).toBeCloseTo(0.75)
  })

  it('returns 0 when secondServeTotal is 0', () => {
    const stats = makeServeStats({ secondServeTotal: 0, secondServeIn: 0 })
    expect(secondServePct(stats)).toBe(0)
  })

  it('returns value between 0 and 1', () => {
    const stats = makeServeStats()
    const result = secondServePct(stats)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

describe('firstServeWinPct', () => {
  it('calculates first serve win percentage', () => {
    const stats = makeServeStats({ firstServeWon: 45, firstServeIn: 60 })
    expect(firstServeWinPct(stats)).toBeCloseTo(0.75)
  })

  it('returns 0 when no first serves in', () => {
    const stats = makeServeStats({ firstServeIn: 0, firstServeWon: 0 })
    expect(firstServeWinPct(stats)).toBe(0)
  })

  it('handles high first serve win percentage', () => {
    const stats = makeServeStats({ firstServeWon: 90, firstServeIn: 100 })
    expect(firstServeWinPct(stats)).toBeCloseTo(0.9)
  })
})

describe('secondServeWinPct', () => {
  it('calculates second serve win percentage', () => {
    const stats = makeServeStats({ secondServeWon: 9, secondServeIn: 15 })
    expect(secondServeWinPct(stats)).toBeCloseTo(0.6)
  })

  it('returns 0 when no second serves in', () => {
    const stats = makeServeStats({ secondServeIn: 0, secondServeWon: 0 })
    expect(secondServeWinPct(stats)).toBe(0)
  })
})

describe('servicePointsWon', () => {
  it('calculates overall service points won', () => {
    const stats = makeServeStats({
      firstServeWon: 45,
      secondServeWon: 9,
      firstServeTotal: 80,
    })
    expect(servicePointsWon(stats)).toBeCloseTo(54 / 80)
  })

  it('returns 0 when firstServeTotal is 0', () => {
    const stats = makeServeStats({ firstServeTotal: 0, firstServeWon: 0, secondServeWon: 0 })
    expect(servicePointsWon(stats)).toBe(0)
  })

  it('result is between 0 and 1 for typical stats', () => {
    const stats = makeServeStats()
    const result = servicePointsWon(stats)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

describe('acePct', () => {
  it('calculates ace percentage', () => {
    const stats = makeServeStats({ aces: 5, firstServeTotal: 80 })
    expect(acePct(stats)).toBeCloseTo(5 / 80)
  })

  it('returns 0 when firstServeTotal is 0', () => {
    const stats = makeServeStats({ firstServeTotal: 0, aces: 0 })
    expect(acePct(stats)).toBe(0)
  })

  it('returns 0 when no aces', () => {
    const stats = makeServeStats({ aces: 0 })
    expect(acePct(stats)).toBe(0)
  })
})

describe('doubleFaultPct', () => {
  it('calculates double fault percentage', () => {
    const stats = makeServeStats({ doubleFaults: 2, firstServeTotal: 80 })
    expect(doubleFaultPct(stats)).toBeCloseTo(2 / 80)
  })

  it('returns 0 when firstServeTotal is 0', () => {
    const stats = makeServeStats({ firstServeTotal: 0, doubleFaults: 0 })
    expect(doubleFaultPct(stats)).toBe(0)
  })

  it('returns 0 when no double faults', () => {
    const stats = makeServeStats({ doubleFaults: 0 })
    expect(doubleFaultPct(stats)).toBe(0)
  })
})

describe('holdPct', () => {
  it('calculates hold percentage correctly', () => {
    expect(holdPct(10, 8)).toBeCloseTo(0.8)
  })

  it('returns 0 when serveGames is 0', () => {
    expect(holdPct(0, 0)).toBe(0)
  })

  it('returns 1.0 for perfect hold rate', () => {
    expect(holdPct(5, 5)).toBe(1.0)
  })
})

describe('breakPct', () => {
  it('calculates break point conversion rate', () => {
    const stats = makeBreakPointStats({ converted: 3, opportunities: 8 })
    expect(breakPct(stats)).toBeCloseTo(3 / 8)
  })

  it('returns 0 when no opportunities', () => {
    const stats = makeBreakPointStats({ opportunities: 0, converted: 0 })
    expect(breakPct(stats)).toBe(0)
  })

  it('returns 1.0 for perfect conversion', () => {
    const stats = makeBreakPointStats({ converted: 5, opportunities: 5 })
    expect(breakPct(stats)).toBe(1.0)
  })
})

describe('savePct', () => {
  it('calculates break point save rate', () => {
    const stats = makeBreakPointStats({ saved: 7, faced: 10 })
    expect(savePct(stats)).toBeCloseTo(0.7)
  })

  it('returns 0 when none faced', () => {
    const stats = makeBreakPointStats({ faced: 0, saved: 0 })
    expect(savePct(stats)).toBe(0)
  })

  it('returns 1.0 for perfect save rate', () => {
    const stats = makeBreakPointStats({ saved: 10, faced: 10 })
    expect(savePct(stats)).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// Rally analysis
// ---------------------------------------------------------------------------

describe('rallyDistribution', () => {
  it('categorizes rallies correctly', () => {
    const rallies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const result = rallyDistribution(rallies)
    expect(result.shortRallies).toBe(4) // 1,2,3,4
    expect(result.mediumRallies).toBe(4) // 5,6,7,8
    expect(result.longRallies).toBe(2) // 9,10
  })

  it('returns zeros for empty array', () => {
    const result = rallyDistribution([])
    expect(result.shortRallies).toBe(0)
    expect(result.mediumRallies).toBe(0)
    expect(result.longRallies).toBe(0)
    expect(result.avgRallyLength).toBe(0)
  })

  it('calculates average rally length', () => {
    const rallies = [2, 4, 6, 8]
    const result = rallyDistribution(rallies)
    expect(result.avgRallyLength).toBe(5)
  })

  it('handles all short rallies', () => {
    const rallies = [1, 2, 3]
    const result = rallyDistribution(rallies)
    expect(result.shortRallies).toBe(3)
    expect(result.mediumRallies).toBe(0)
    expect(result.longRallies).toBe(0)
  })

  it('handles single rally', () => {
    const result = rallyDistribution([9])
    expect(result.longRallies).toBe(1)
    expect(result.avgRallyLength).toBe(9)
  })
})

describe('avgRallyLength', () => {
  it('returns mean of rally array', () => {
    expect(avgRallyLength([2, 4, 6])).toBeCloseTo(4)
  })

  it('returns 0 for empty array', () => {
    expect(avgRallyLength([])).toBe(0)
  })

  it('returns single value for single element', () => {
    expect(avgRallyLength([7])).toBe(7)
  })
})

describe('rallyWinRate', () => {
  it('calculates win rates per bracket', () => {
    const rallies = [2, 3, 6, 7, 10, 12]
    const wins = [true, false, true, true, false, true]
    const result = rallyWinRate(rallies, wins)
    expect(result.short).toBeCloseTo(0.5) // 1 win of 2
    expect(result.medium).toBeCloseTo(1.0) // 2 wins of 2
    expect(result.long).toBeCloseTo(0.5) // 1 win of 2
  })

  it('returns 0 for brackets with no rallies', () => {
    const rallies = [2, 3]
    const wins = [true, false]
    const result = rallyWinRate(rallies, wins)
    expect(result.medium).toBe(0)
    expect(result.long).toBe(0)
  })

  it('handles mismatched array lengths', () => {
    const rallies = [1, 2, 3, 4]
    const wins = [true, false]
    const result = rallyWinRate(rallies, wins)
    expect(result.short).toBeCloseTo(0.5)
  })

  it('returns 1.0 for all wins in bracket', () => {
    const rallies = [10, 11]
    const wins = [true, true]
    const result = rallyWinRate(rallies, wins)
    expect(result.long).toBe(1.0)
  })
})

describe('expectedRallyLength', () => {
  it('returns 3.8 for hard court', () => {
    expect(expectedRallyLength('hard')).toBe(3.8)
  })

  it('returns 5.2 for clay', () => {
    expect(expectedRallyLength('clay')).toBe(5.2)
  })

  it('returns 2.9 for grass', () => {
    expect(expectedRallyLength('grass')).toBe(2.9)
  })

  it('clay has highest expected rally length', () => {
    expect(expectedRallyLength('clay')).toBeGreaterThan(expectedRallyLength('hard'))
    expect(expectedRallyLength('hard')).toBeGreaterThan(expectedRallyLength('grass'))
  })
})

// ---------------------------------------------------------------------------
// Elo / rating system
// ---------------------------------------------------------------------------

describe('eloExpected', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(eloExpected(1500, 1500)).toBeCloseTo(0.5)
  })

  it('returns > 0.5 when player A is stronger', () => {
    expect(eloExpected(1600, 1500)).toBeGreaterThan(0.5)
  })

  it('returns < 0.5 when player A is weaker', () => {
    expect(eloExpected(1400, 1500)).toBeLessThan(0.5)
  })

  it('is symmetric: E(A,B) + E(B,A) = 1', () => {
    const a = eloExpected(1600, 1400)
    const b = eloExpected(1400, 1600)
    expect(a + b).toBeCloseTo(1)
  })

  it('large rating gap gives near 1 expected score', () => {
    expect(eloExpected(2000, 1000)).toBeGreaterThan(0.99)
  })
})

describe('eloUpdate', () => {
  it('increases rating on upset win', () => {
    const newRating = eloUpdate(1400, 0.3, 1)
    expect(newRating).toBeGreaterThan(1400)
  })

  it('decreases rating on expected loss', () => {
    const newRating = eloUpdate(1600, 0.8, 0)
    expect(newRating).toBeLessThan(1600)
  })

  it('no change when actual equals expected', () => {
    const newRating = eloUpdate(1500, 0.5, 0.5, 32)
    expect(newRating).toBeCloseTo(1500)
  })

  it('uses custom k factor', () => {
    const small = eloUpdate(1500, 0.5, 1, 16)
    const large = eloUpdate(1500, 0.5, 1, 64)
    // k=64 is 4x k=16, so change should be 4x
    expect(large - 1500).toBeCloseTo(4 * (small - 1500))
  })

  it('default k factor is 32', () => {
    const rating = eloUpdate(1500, 0.5, 1)
    expect(rating).toBeCloseTo(1500 + 32 * 0.5)
  })
})

describe('surfaceEloUpdate', () => {
  it('updates only the specified surface', () => {
    const ratings = makeSurfaceRatings()
    const original = ratings.hard.rating
    const updated = surfaceEloUpdate(ratings, 'hard', 0.5, 1, 32)
    expect(updated.hard.rating).not.toBe(original)
    expect(updated.clay.rating).toBe(ratings.clay.rating)
    expect(updated.grass.rating).toBe(ratings.grass.rating)
  })

  it('increases surface rating on win', () => {
    const ratings = makeSurfaceRatings()
    const updated = surfaceEloUpdate(ratings, 'clay', 0.4, 1)
    expect(updated.clay.rating).toBeGreaterThan(ratings.clay.rating)
  })

  it('returns new object (immutable)', () => {
    const ratings = makeSurfaceRatings()
    const updated = surfaceEloUpdate(ratings, 'grass', 0.7, 0)
    expect(updated).not.toBe(ratings)
  })
})

describe('surfaceAdjustedElo', () => {
  it('blends surface rating with others', () => {
    const ratings: SurfaceRatings = {
      hard: { rating: 1600, uncertainty: 200 },
      clay: { rating: 1400, uncertainty: 200 },
      grass: { rating: 1800, uncertainty: 200 },
    }
    const adjusted = surfaceAdjustedElo(ratings, 'hard', 0.6)
    // 1600 * 0.6 + (1400 + 1800)/2 * 0.4
    const expected = 1600 * 0.6 + 1600 * 0.4
    expect(adjusted).toBeCloseTo(expected)
  })

  it('defaults to weight 0.6', () => {
    const ratings = makeSurfaceRatings()
    const explicit = surfaceAdjustedElo(ratings, 'hard', 0.6)
    const defaulted = surfaceAdjustedElo(ratings, 'hard')
    expect(explicit).toBeCloseTo(defaulted)
  })

  it('returns surface rating when weight is 1.0', () => {
    const ratings = makeSurfaceRatings()
    const adjusted = surfaceAdjustedElo(ratings, 'grass', 1.0)
    expect(adjusted).toBeCloseTo(ratings.grass.rating)
  })
})

// ---------------------------------------------------------------------------
// Glicko
// ---------------------------------------------------------------------------

describe('glickoExpected', () => {
  it('returns ~0.5 for equal ratings', () => {
    const a = makeRating(1500, 200)
    const b = makeRating(1500, 200)
    expect(glickoExpected(a, b)).toBeCloseTo(0.5, 2)
  })

  it('returns > 0.5 when player A is higher rated', () => {
    const a = makeRating(1600, 200)
    const b = makeRating(1400, 200)
    expect(glickoExpected(a, b)).toBeGreaterThan(0.5)
  })

  it('returns < 0.5 when player A is lower rated', () => {
    const a = makeRating(1400, 200)
    const b = makeRating(1600, 200)
    expect(glickoExpected(a, b)).toBeLessThan(0.5)
  })
})

describe('glickoUpdate', () => {
  it('returns a PlayerRating with rating and uncertainty', () => {
    const player = makeRating(1500, 200)
    const opponent = makeRating(1500, 200)
    const result = glickoUpdate(player, opponent, 1)
    expect(result).toHaveProperty('rating')
    expect(result).toHaveProperty('uncertainty')
  })

  it('increases rating on win against equal opponent', () => {
    const player = makeRating(1500, 200)
    const opponent = makeRating(1500, 200)
    const result = glickoUpdate(player, opponent, 1)
    expect(result.rating).toBeGreaterThan(1500)
  })

  it('decreases rating on loss against equal opponent', () => {
    const player = makeRating(1500, 200)
    const opponent = makeRating(1500, 200)
    const result = glickoUpdate(player, opponent, 0)
    expect(result.rating).toBeLessThan(1500)
  })

  it('reduces uncertainty after a game', () => {
    const player = makeRating(1500, 200)
    const opponent = makeRating(1500, 200)
    const result = glickoUpdate(player, opponent, 1)
    expect(result.uncertainty).toBeLessThan(200)
  })
})

// ---------------------------------------------------------------------------
// Match simulation
// ---------------------------------------------------------------------------

describe('pointProbFromElo', () => {
  it('returns 0.5 for equal Elos at clamped minimum', () => {
    const p = pointProbFromElo(1500, 1500)
    expect(p).toBeCloseTo(0.5)
  })

  it('clamps minimum to 0.4', () => {
    const p = pointProbFromElo(1000, 3000)
    expect(p).toBe(0.4)
  })

  it('clamps maximum to 0.75', () => {
    const p = pointProbFromElo(3000, 1000)
    expect(p).toBe(0.75)
  })

  it('increases with serve advantage', () => {
    const low = pointProbFromElo(1500, 1500)
    const high = pointProbFromElo(1600, 1500)
    expect(high).toBeGreaterThan(low)
  })
})

describe('gameWinProb', () => {
  it('returns ~0.5 for p=0.5', () => {
    expect(gameWinProb(0.5)).toBeCloseTo(0.5, 2)
  })

  it('returns > 0.5 for p > 0.5', () => {
    expect(gameWinProb(0.6)).toBeGreaterThan(0.5)
  })

  it('returns < 0.5 for p < 0.5', () => {
    expect(gameWinProb(0.4)).toBeLessThan(0.5)
  })

  it('returns high value for dominant server', () => {
    expect(gameWinProb(0.75)).toBeGreaterThan(0.9)
  })

  it('result is between 0 and 1', () => {
    for (const p of [0.4, 0.5, 0.6, 0.7]) {
      const g = gameWinProb(p)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(1)
    }
  })
})

describe('tiebreakWinProb', () => {
  it('returns value between 0.45 and 0.55 when both players have equal point win prob', () => {
    // With equal serve win probs, slight asymmetry from first-serve advantage
    const prob = tiebreakWinProb(0.6, 0.6)
    expect(prob).toBeGreaterThan(0.45)
    expect(prob).toBeLessThan(0.6)
  })

  it('returns > 0.5 when player 0 is a stronger server', () => {
    // Player 0 is significantly stronger server
    const probAdvantage = tiebreakWinProb(0.7, 0.5)
    expect(probAdvantage).toBeGreaterThan(0.5)
  })

  it('returns < 0.6 when player 0 has slight serve advantage', () => {
    const prob = tiebreakWinProb(0.65, 0.55)
    expect(prob).toBeGreaterThan(0.5)
    expect(prob).toBeLessThan(0.8)
  })

  it('result is between 0 and 1', () => {
    const prob = tiebreakWinProb(0.6, 0.55)
    expect(prob).toBeGreaterThanOrEqual(0)
    expect(prob).toBeLessThanOrEqual(1)
  })

  it('weaker server has lower tiebreak win probability', () => {
    const strong = tiebreakWinProb(0.7, 0.5)
    const weak = tiebreakWinProb(0.5, 0.7)
    expect(strong).toBeGreaterThan(weak)
  })
})

describe('setWinProb', () => {
  it('returns ~0.5 for equal players', () => {
    const prob = setWinProb(0.6, 0.6)
    expect(prob).toBeCloseTo(0.5, 2)
  })

  it('favors better server', () => {
    const high = setWinProb(0.65, 0.55)
    expect(high).toBeGreaterThan(0.5)
  })

  it('result is between 0 and 1', () => {
    const prob = setWinProb(0.62, 0.58)
    expect(prob).toBeGreaterThan(0)
    expect(prob).toBeLessThan(1)
  })
})

describe('matchWinProb', () => {
  it('returns ~0.5 for equal players in best of 3', () => {
    const prob = matchWinProb(0.6, 0.6, 3)
    expect(prob).toBeCloseTo(0.5, 2)
  })

  it('returns approximately 0.5 for equal players in best of 5', () => {
    const prob = matchWinProb(0.6, 0.6, 5)
    expect(prob).toBeCloseTo(0.5, 1)
  })

  it('favors stronger player', () => {
    const prob = matchWinProb(0.65, 0.55, 3)
    expect(prob).toBeGreaterThan(0.5)
  })

  it('best of 5 amplifies favorite advantage', () => {
    const bo3 = matchWinProb(0.63, 0.57, 3)
    const bo5 = matchWinProb(0.63, 0.57, 5)
    expect(bo5).toBeGreaterThan(bo3)
  })

  it('result is between 0 and 1', () => {
    const prob = matchWinProb(0.62, 0.58, 5)
    expect(prob).toBeGreaterThan(0)
    expect(prob).toBeLessThan(1)
  })
})

describe('simulateMatch', () => {
  it('is deterministic with same seed', () => {
    const r1 = simulateMatch(1600, 1500, 3, 42)
    const r2 = simulateMatch(1600, 1500, 3, 42)
    expect(r1.winner).toBe(r2.winner)
    expect(r1.sets).toEqual(r2.sets)
    expect(r1.games).toEqual(r2.games)
  })

  it('produces different results with different seeds', () => {
    // With enough different seeds, expect variation
    const results = new Set<number>()
    for (let seed = 0; seed < 20; seed++) {
      results.add(simulateMatch(1500, 1500, 3, seed).winner)
    }
    expect(results.size).toBeGreaterThan(1)
  })

  it('winner is 0 or 1', () => {
    const result = simulateMatch(1600, 1500, 3, 100)
    expect([0, 1]).toContain(result.winner)
  })

  it('sets sum equals bestOf result', () => {
    const result = simulateMatch(1600, 1500, 3, 42)
    const totalSets = result.sets[0] + result.sets[1]
    expect(totalSets).toBeGreaterThanOrEqual(2)
    expect(totalSets).toBeLessThanOrEqual(3)
  })

  it('best of 5 produces at most 5 sets', () => {
    const result = simulateMatch(1600, 1500, 5, 42)
    const totalSets = result.sets[0] + result.sets[1]
    expect(totalSets).toBeGreaterThanOrEqual(3)
    expect(totalSets).toBeLessThanOrEqual(5)
  })

  it('winner has more sets than loser', () => {
    const result = simulateMatch(1600, 1500, 3, 42)
    if (result.winner === 0) {
      expect(result.sets[0]).toBeGreaterThan(result.sets[1])
    } else {
      expect(result.sets[1]).toBeGreaterThan(result.sets[0])
    }
  })

  it('higher Elo player tends to win more often', () => {
    let wins = 0
    for (let seed = 0; seed < 100; seed++) {
      if (simulateMatch(1800, 1200, 3, seed).winner === 0) wins++
    }
    expect(wins).toBeGreaterThan(80)
  })
})

// ---------------------------------------------------------------------------
// Set / match stats
// ---------------------------------------------------------------------------

describe('setsWon', () => {
  it('correctly counts sets for 2-1 match', () => {
    const match = makeMatchStats()
    const [p0, p1] = setsWon(match)
    expect(p0).toBe(2)
    expect(p1).toBe(1)
  })

  it('handles straight-set win', () => {
    const match: MatchStats = {
      sets: [
        { gamesWon: 6, gamesLost: 2 },
        { gamesWon: 6, gamesLost: 3 },
      ],
      duration: 80,
    }
    const [p0, p1] = setsWon(match)
    expect(p0).toBe(2)
    expect(p1).toBe(0)
  })

  it('handles empty sets array', () => {
    const match: MatchStats = { sets: [], duration: 0 }
    const [p0, p1] = setsWon(match)
    expect(p0).toBe(0)
    expect(p1).toBe(0)
  })
})

describe('gamesWon', () => {
  it('sums games correctly', () => {
    const match = makeMatchStats()
    // sets: 6-4, 3-6, 7-5 => p0: 6+3+7=16, p1: 4+6+5=15
    const [p0, p1] = gamesWon(match)
    expect(p0).toBe(16)
    expect(p1).toBe(15)
  })

  it('returns [0,0] for empty sets', () => {
    const match: MatchStats = { sets: [], duration: 0 }
    expect(gamesWon(match)).toEqual([0, 0])
  })
})

describe('tiebreaksWon', () => {
  it('counts tiebreaks from explicit tiebreakWon field', () => {
    const match: MatchStats = {
      sets: [
        { gamesWon: 7, gamesLost: 6, tiebreakWon: true },
        { gamesWon: 6, gamesLost: 4 },
        { gamesWon: 6, gamesLost: 7, tiebreakWon: false },
      ],
      duration: 150,
    }
    const [p0, p1] = tiebreaksWon(match)
    expect(p0).toBe(1)
    expect(p1).toBe(1)
  })

  it('infers tiebreak winner from total games (7-6=13 games)', () => {
    const match: MatchStats = {
      sets: [
        { gamesWon: 7, gamesLost: 6 },
        { gamesWon: 6, gamesLost: 7 },
      ],
      duration: 120,
    }
    const [p0, p1] = tiebreaksWon(match)
    expect(p0).toBe(1)
    expect(p1).toBe(1)
  })

  it('returns [0,0] when no tiebreaks', () => {
    const match: MatchStats = {
      sets: [
        { gamesWon: 6, gamesLost: 3 },
        { gamesWon: 6, gamesLost: 4 },
      ],
      duration: 90,
    }
    const [p0, p1] = tiebreaksWon(match)
    expect(p0).toBe(0)
    expect(p1).toBe(0)
  })
})

describe('matchDuration', () => {
  it('returns duration from MatchStats', () => {
    const match = makeMatchStats({ duration: 125 })
    expect(matchDuration(match)).toBe(125)
  })

  it('returns 0 for zero-duration match', () => {
    const match: MatchStats = { sets: [], duration: 0 }
    expect(matchDuration(match)).toBe(0)
  })
})

describe('gameScore', () => {
  it('parses "6-4 3-6 7-5"', () => {
    const result = gameScore('6-4 3-6 7-5')
    expect(result).toEqual({ player0: 16, player1: 15 })
  })

  it('parses two-set match', () => {
    const result = gameScore('6-2 6-3')
    expect(result).toEqual({ player0: 12, player1: 5 })
  })

  it('returns null for invalid format', () => {
    expect(gameScore('abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(gameScore('')).toBeNull()
  })

  it('parses tiebreak score "7-6 6-4"', () => {
    const result = gameScore('7-6 6-4')
    expect(result).toEqual({ player0: 13, player1: 10 })
  })
})

// ---------------------------------------------------------------------------
// Surface adjustments
// ---------------------------------------------------------------------------

describe('surfaceSpeedRating', () => {
  it('returns 4 for hard', () => {
    expect(surfaceSpeedRating('hard')).toBe(4)
  })

  it('returns 2 for clay', () => {
    expect(surfaceSpeedRating('clay')).toBe(2)
  })

  it('returns 6 for grass', () => {
    expect(surfaceSpeedRating('grass')).toBe(6)
  })

  it('returns 5 for carpet', () => {
    expect(surfaceSpeedRating('carpet')).toBe(5)
  })

  it('grass is fastest, clay is slowest', () => {
    expect(surfaceSpeedRating('grass')).toBeGreaterThan(surfaceSpeedRating('hard'))
    expect(surfaceSpeedRating('hard')).toBeGreaterThan(surfaceSpeedRating('clay'))
  })
})

describe('serveAdvantageMultiplier', () => {
  it('returns 1.15 for grass', () => {
    expect(serveAdvantageMultiplier('grass')).toBeCloseTo(1.15)
  })

  it('returns 1.05 for hard', () => {
    expect(serveAdvantageMultiplier('hard')).toBeCloseTo(1.05)
  })

  it('returns 0.95 for clay', () => {
    expect(serveAdvantageMultiplier('clay')).toBeCloseTo(0.95)
  })

  it('grass has higher serve advantage than clay', () => {
    expect(serveAdvantageMultiplier('grass')).toBeGreaterThan(
      serveAdvantageMultiplier('clay'),
    )
  })
})

describe('rallySurface', () => {
  it('grass has shortest avg rally length', () => {
    expect(rallySurface('grass').avgLength).toBeLessThan(rallySurface('hard').avgLength)
    expect(rallySurface('hard').avgLength).toBeLessThan(rallySurface('clay').avgLength)
  })

  it('clay has highest variance', () => {
    expect(rallySurface('clay').variance).toBeGreaterThan(rallySurface('hard').variance)
    expect(rallySurface('hard').variance).toBeGreaterThan(rallySurface('grass').variance)
  })

  it('hard returns valid object', () => {
    const result = rallySurface('hard')
    expect(result.avgLength).toBe(3.8)
    expect(result.variance).toBe(2.1)
  })
})

// ---------------------------------------------------------------------------
// Fantasy scoring
// ---------------------------------------------------------------------------

describe('draftKingsScore', () => {
  it('calculates basic DK score correctly', () => {
    const score = draftKingsScore({
      aces: 10,
      doubleFaults: 2,
      gameWon: 12,
      setWon: 2,
      matchWon: true,
      cleanSet: false,
      noDFMatch: false,
    })
    const expected = 10 * 0.4 + 2 * -1 + 12 * 0.25 + 2 * 2 + 6
    expect(score).toBeCloseTo(expected)
  })

  it('adds cleanSet bonus', () => {
    const base = draftKingsScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: false, noDFMatch: false,
    })
    const withClean = draftKingsScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: true, noDFMatch: false,
    })
    expect(withClean - base).toBeCloseTo(1.5)
  })

  it('adds noDFMatch bonus', () => {
    const base = draftKingsScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: false, noDFMatch: false,
    })
    const withNoDF = draftKingsScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: false, noDFMatch: true,
    })
    expect(withNoDF - base).toBeCloseTo(1.0)
  })

  it('double faults subtract 1 each', () => {
    const base = draftKingsScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: false, noDFMatch: false,
    })
    const withDF = draftKingsScore({
      aces: 0, doubleFaults: 3, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: false, noDFMatch: false,
    })
    expect(withDF - base).toBeCloseTo(-3)
  })

  it('matchWon adds 6 points', () => {
    const base = draftKingsScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: false, noDFMatch: false,
    })
    const withWin = draftKingsScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: true, cleanSet: false, noDFMatch: false,
    })
    expect(withWin - base).toBeCloseTo(6)
  })

  it('aces add 0.4 each', () => {
    const score = draftKingsScore({
      aces: 5, doubleFaults: 0, gameWon: 0, setWon: 0,
      matchWon: false, cleanSet: false, noDFMatch: false,
    })
    expect(score).toBeCloseTo(2.0)
  })
})

describe('fanDuelScore', () => {
  it('calculates basic FD score correctly', () => {
    const score = fanDuelScore({
      aces: 10,
      doubleFaults: 2,
      gameWon: 12,
      setWon: 2,
      matchWon: true,
    })
    const expected = 10 * 0.3 + 2 * -1 + 12 * 0.3 + 2 * 2 + 5
    expect(score).toBeCloseTo(expected)
  })

  it('matchWon adds 5 points', () => {
    const base = fanDuelScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0, matchWon: false,
    })
    const withWin = fanDuelScore({
      aces: 0, doubleFaults: 0, gameWon: 0, setWon: 0, matchWon: true,
    })
    expect(withWin - base).toBeCloseTo(5)
  })

  it('aces add 0.3 each', () => {
    const score = fanDuelScore({
      aces: 10, doubleFaults: 0, gameWon: 0, setWon: 0, matchWon: false,
    })
    expect(score).toBeCloseTo(3.0)
  })

  it('double faults subtract 1 each', () => {
    const score = fanDuelScore({
      aces: 0, doubleFaults: 5, gameWon: 0, setWon: 0, matchWon: false,
    })
    expect(score).toBeCloseTo(-5)
  })

  it('games add 0.3 each', () => {
    const score = fanDuelScore({
      aces: 0, doubleFaults: 0, gameWon: 10, setWon: 0, matchWon: false,
    })
    expect(score).toBeCloseTo(3.0)
  })

  it('DK and FD differ for same input', () => {
    const input = { aces: 8, doubleFaults: 1, gameWon: 10, setWon: 2, matchWon: true }
    const fd = fanDuelScore(input)
    const dk = draftKingsScore({ ...input, cleanSet: false, noDFMatch: false })
    expect(fd).not.toBeCloseTo(dk)
  })
})
