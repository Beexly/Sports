/**
 * badminton-analytics.test.ts
 * 150+ tests for the badminton analytics library.
 */
import { describe, it, expect } from 'vitest'
import {
  gamePoint,
  gameWinner,
  matchWinner,
  setsScore,
  deuceReached,
  rallyLength,
  avgRallyLength,
  winnersToErrorsRatio,
  pointEfficiency,
  attackSuccessRate,
  shotDistribution,
  smashSpeed,
  netPointRate,
  clearAccuracy,
  dropShotEffectiveness,
  serviceWinRate,
  receiveWinRate,
  consistencyIndex,
  dominanceRatio,
  staminaIndex,
  rotationEfficiency,
  partnerSyncScore,
  doublesAttackRate,
  momentumShifts,
  comebackIndex,
  closeGameRate,
  pressurePointConversion,
  dkBadmintonPoints,
  dkProjection,
  type BadmintonStatLine,
  type Side,
  type GameScore,
} from '@/lib/sports/badminton-analytics'

// ---------------------------------------------------------------------------
// 1. Scoring & match
// ---------------------------------------------------------------------------

describe('gamePoint', () => {
  it('true at 20-18', () => {
    expect(gamePoint(20, 18)).toBe(true)
  })
  it('true at 20-19', () => {
    expect(gamePoint(20, 19)).toBe(true)
  })
  it('false at 20-20 (deuce, no lead)', () => {
    expect(gamePoint(20, 20)).toBe(false)
  })
  it('false at 20-21 (trailing)', () => {
    expect(gamePoint(20, 21)).toBe(false)
  })
  it('true at 21-20', () => {
    expect(gamePoint(21, 20)).toBe(true)
  })
  it('true at 22-20', () => {
    expect(gamePoint(22, 20)).toBe(true)
  })
  it('true at 29-29 (hard cap)', () => {
    expect(gamePoint(29, 29)).toBe(true)
  })
  it('true at 29-28', () => {
    expect(gamePoint(29, 28)).toBe(true)
  })
  it('false at 28-29 for trailing side', () => {
    expect(gamePoint(28, 29)).toBe(false)
  })
  it('false below 20', () => {
    expect(gamePoint(19, 10)).toBe(false)
  })
  it('false at 19-18', () => {
    expect(gamePoint(19, 18)).toBe(false)
  })
  it('false when tied below cap, e.g. 24-24', () => {
    expect(gamePoint(24, 24)).toBe(false)
  })
  it('true at 25-23', () => {
    expect(gamePoint(25, 23)).toBe(true)
  })
  it('false at 0-0', () => {
    expect(gamePoint(0, 0)).toBe(false)
  })
})

describe('gameWinner', () => {
  it('a wins at 21-19', () => {
    expect(gameWinner(21, 19)).toBe('a')
  })
  it('b wins at 19-21', () => {
    expect(gameWinner(19, 21)).toBe('b')
  })
  it('null at 21-20 (only 1 ahead)', () => {
    expect(gameWinner(21, 20)).toBe(null)
  })
  it('null at 20-20', () => {
    expect(gameWinner(20, 20)).toBe(null)
  })
  it('a wins 22-20 (win by 2 in deuce)', () => {
    expect(gameWinner(22, 20)).toBe('a')
  })
  it('null at 21-21 (continues past 21)', () => {
    expect(gameWinner(21, 21)).toBe(null)
  })
  it('a wins at hard cap 30-29', () => {
    expect(gameWinner(30, 29)).toBe('a')
  })
  it('b wins at hard cap 29-30', () => {
    expect(gameWinner(29, 30)).toBe('b')
  })
  it('a wins 30-28 (still valid at cap)', () => {
    expect(gameWinner(30, 28)).toBe('a')
  })
  it('null mid-game 15-12', () => {
    expect(gameWinner(15, 12)).toBe(null)
  })
  it('null at 0-0', () => {
    expect(gameWinner(0, 0)).toBe(null)
  })
  it('a wins 21-0', () => {
    expect(gameWinner(21, 0)).toBe('a')
  })
  it('null at 29-29', () => {
    expect(gameWinner(29, 29)).toBe(null)
  })
  it('a wins 23-21', () => {
    expect(gameWinner(23, 21)).toBe('a')
  })
})

describe('matchWinner', () => {
  it('a wins straight games', () => {
    expect(matchWinner([['a'], ['a']])).toBe('a')
  })
  it('b wins straight games', () => {
    expect(matchWinner([['b'], ['b']])).toBe('b')
  })
  it('a wins in three', () => {
    expect(matchWinner([['a'], ['b'], ['a']])).toBe('a')
  })
  it('b wins in three', () => {
    expect(matchWinner([['b'], ['a'], ['b']])).toBe('b')
  })
  it('null after one game', () => {
    expect(matchWinner([['a']])).toBe(null)
  })
  it('null with empty input', () => {
    expect(matchWinner([])).toBe(null)
  })
  it('null at one game each', () => {
    expect(matchWinner([['a'], ['b']])).toBe(null)
  })
  it('stops at two wins, ignoring extra', () => {
    expect(matchWinner([['a'], ['a'], ['b']])).toBe('a')
  })
  it('handles empty game arrays gracefully', () => {
    expect(matchWinner([[], ['a'], ['a']])).toBe('a')
  })
})

describe('setsScore', () => {
  it('counts a clean sweep', () => {
    expect(setsScore(['a', 'a'])).toEqual({ a: 2, b: 0 })
  })
  it('counts split games', () => {
    expect(setsScore(['a', 'b', 'a'])).toEqual({ a: 2, b: 1 })
  })
  it('empty returns zeros', () => {
    expect(setsScore([])).toEqual({ a: 0, b: 0 })
  })
  it('all b', () => {
    expect(setsScore(['b', 'b'])).toEqual({ a: 0, b: 2 })
  })
  it('single game', () => {
    expect(setsScore(['a'])).toEqual({ a: 1, b: 0 })
  })
})

describe('deuceReached', () => {
  it('true at 20-20', () => {
    expect(deuceReached(20, 20)).toBe(true)
  })
  it('true at 22-21', () => {
    expect(deuceReached(22, 21)).toBe(true)
  })
  it('false at 20-19', () => {
    expect(deuceReached(20, 19)).toBe(false)
  })
  it('false at 19-20', () => {
    expect(deuceReached(19, 20)).toBe(false)
  })
  it('false at 0-0', () => {
    expect(deuceReached(0, 0)).toBe(false)
  })
  it('true at 25-25', () => {
    expect(deuceReached(25, 25)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. Rally analytics
// ---------------------------------------------------------------------------

describe('rallyLength', () => {
  it('classifies 0 as short', () => {
    expect(rallyLength(0)).toBe('short')
  })
  it('classifies 4 as short', () => {
    expect(rallyLength(4)).toBe('short')
  })
  it('classifies exactly 5 as medium', () => {
    expect(rallyLength(5)).toBe('medium')
  })
  it('classifies 9 as medium', () => {
    expect(rallyLength(9)).toBe('medium')
  })
  it('classifies exactly 10 as long', () => {
    expect(rallyLength(10)).toBe('long')
  })
  it('classifies 25 as long', () => {
    expect(rallyLength(25)).toBe('long')
  })
})

describe('avgRallyLength', () => {
  it('averages a set', () => {
    expect(avgRallyLength([2, 4, 6])).toBe(4)
  })
  it('empty returns 0', () => {
    expect(avgRallyLength([])).toBe(0)
  })
  it('single value', () => {
    expect(avgRallyLength([10])).toBe(10)
  })
  it('handles fractional mean', () => {
    expect(avgRallyLength([1, 2])).toBe(1.5)
  })
  it('handles zeros', () => {
    expect(avgRallyLength([0, 0, 0])).toBe(0)
  })
})

describe('winnersToErrorsRatio', () => {
  it('computes a ratio', () => {
    expect(winnersToErrorsRatio(10, 5)).toBe(2)
  })
  it('Infinity when errors=0 and winners>0', () => {
    expect(winnersToErrorsRatio(7, 0)).toBe(Infinity)
  })
  it('0 when both are 0', () => {
    expect(winnersToErrorsRatio(0, 0)).toBe(0)
  })
  it('0 when no winners', () => {
    expect(winnersToErrorsRatio(0, 5)).toBe(0)
  })
  it('fractional ratio', () => {
    expect(winnersToErrorsRatio(3, 6)).toBe(0.5)
  })
})

describe('pointEfficiency', () => {
  it('computes a fraction', () => {
    expect(pointEfficiency(15, 30)).toBe(0.5)
  })
  it('0 rallies returns 0', () => {
    expect(pointEfficiency(0, 0)).toBe(0)
  })
  it('all won returns 1', () => {
    expect(pointEfficiency(20, 20)).toBe(1)
  })
  it('none won returns 0', () => {
    expect(pointEfficiency(0, 10)).toBe(0)
  })
})

describe('attackSuccessRate', () => {
  it('computes a rate', () => {
    expect(attackSuccessRate(8, 10)).toBe(0.8)
  })
  it('no attempts returns 0', () => {
    expect(attackSuccessRate(0, 0)).toBe(0)
  })
  it('perfect rate', () => {
    expect(attackSuccessRate(5, 5)).toBe(1)
  })
  it('zero won', () => {
    expect(attackSuccessRate(0, 4)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Shot analytics
// ---------------------------------------------------------------------------

describe('shotDistribution', () => {
  it('counts shot types', () => {
    const dist = shotDistribution([
      { type: 'smash' },
      { type: 'clear' },
      { type: 'smash' },
      { type: 'drop' },
    ])
    expect(dist.get('smash')).toBe(2)
    expect(dist.get('clear')).toBe(1)
    expect(dist.get('drop')).toBe(1)
  })
  it('empty returns empty map', () => {
    expect(shotDistribution([]).size).toBe(0)
  })
  it('single type', () => {
    const dist = shotDistribution([{ type: 'net' }, { type: 'net' }])
    expect(dist.get('net')).toBe(2)
    expect(dist.size).toBe(1)
  })
  it('unknown type returns undefined', () => {
    const dist = shotDistribution([{ type: 'lift' }])
    expect(dist.get('smash')).toBeUndefined()
  })
})

describe('smashSpeed', () => {
  it('computes m/s', () => {
    expect(smashSpeed(100, 2)).toBe(50)
  })
  it('0 time returns 0', () => {
    expect(smashSpeed(100, 0)).toBe(0)
  })
  it('0 distance returns 0', () => {
    expect(smashSpeed(0, 2)).toBe(0)
  })
  it('fractional speed', () => {
    expect(smashSpeed(13.4, 0.2)).toBeCloseTo(67, 5)
  })
})

describe('netPointRate', () => {
  it('computes a rate', () => {
    expect(netPointRate(6, 8)).toBe(0.75)
  })
  it('0 rallies returns 0', () => {
    expect(netPointRate(0, 0)).toBe(0)
  })
  it('perfect rate', () => {
    expect(netPointRate(4, 4)).toBe(1)
  })
})

describe('clearAccuracy', () => {
  it('computes accuracy', () => {
    expect(clearAccuracy(9, 10)).toBe(0.9)
  })
  it('0 clears returns 0', () => {
    expect(clearAccuracy(0, 0)).toBe(0)
  })
  it('perfect accuracy', () => {
    expect(clearAccuracy(5, 5)).toBe(1)
  })
})

describe('dropShotEffectiveness', () => {
  it('computes effectiveness', () => {
    expect(dropShotEffectiveness(3, 12)).toBe(0.25)
  })
  it('0 total returns 0', () => {
    expect(dropShotEffectiveness(0, 0)).toBe(0)
  })
  it('all winning', () => {
    expect(dropShotEffectiveness(6, 6)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 4. Player performance
// ---------------------------------------------------------------------------

describe('serviceWinRate', () => {
  it('computes a rate', () => {
    expect(serviceWinRate(12, 20)).toBe(0.6)
  })
  it('0 serves returns 0', () => {
    expect(serviceWinRate(0, 0)).toBe(0)
  })
  it('perfect rate', () => {
    expect(serviceWinRate(10, 10)).toBe(1)
  })
})

describe('receiveWinRate', () => {
  it('computes a rate', () => {
    expect(receiveWinRate(7, 14)).toBe(0.5)
  })
  it('0 receives returns 0', () => {
    expect(receiveWinRate(0, 0)).toBe(0)
  })
  it('perfect rate', () => {
    expect(receiveWinRate(8, 8)).toBe(1)
  })
})

describe('consistencyIndex', () => {
  it('1 minus error rate', () => {
    expect(consistencyIndex(10, 100)).toBe(0.9)
  })
  it('0 shots returns 1', () => {
    expect(consistencyIndex(0, 0)).toBe(1)
  })
  it('no errors returns 1', () => {
    expect(consistencyIndex(0, 50)).toBe(1)
  })
  it('all errors returns 0', () => {
    expect(consistencyIndex(20, 20)).toBe(0)
  })
})

describe('dominanceRatio', () => {
  it('share of total points', () => {
    expect(dominanceRatio(20, 10, 60)).toBe(0.5)
  })
  it('0 total returns 0', () => {
    expect(dominanceRatio(0, 0, 0)).toBe(0)
  })
  it('all points won', () => {
    expect(dominanceRatio(30, 10, 40)).toBe(1)
  })
  it('no points won', () => {
    expect(dominanceRatio(0, 0, 40)).toBe(0)
  })
})

describe('staminaIndex', () => {
  it('multiplies games and rally length', () => {
    expect(staminaIndex(3, 8)).toBe(24)
  })
  it('0 games returns 0', () => {
    expect(staminaIndex(0, 10)).toBe(0)
  })
  it('0 rally length returns 0', () => {
    expect(staminaIndex(3, 0)).toBe(0)
  })
  it('fractional rally length', () => {
    expect(staminaIndex(2, 7.5)).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// 5. Doubles analytics
// ---------------------------------------------------------------------------

describe('rotationEfficiency', () => {
  it('splits front and back share', () => {
    expect(rotationEfficiency(12, 8, 40)).toEqual({ front: 0.3, back: 0.2 })
  })
  it('0 total returns zeros', () => {
    expect(rotationEfficiency(0, 0, 0)).toEqual({ front: 0, back: 0 })
  })
  it('front only', () => {
    expect(rotationEfficiency(10, 0, 20)).toEqual({ front: 0.5, back: 0 })
  })
  it('back only', () => {
    expect(rotationEfficiency(0, 10, 20)).toEqual({ front: 0, back: 0.5 })
  })
})

describe('partnerSyncScore', () => {
  it('1 minus error rate', () => {
    expect(partnerSyncScore(5, 50)).toBe(0.9)
  })
  it('0 rallies returns 1', () => {
    expect(partnerSyncScore(0, 0)).toBe(1)
  })
  it('no errors returns 1', () => {
    expect(partnerSyncScore(0, 30)).toBe(1)
  })
  it('all errors returns 0', () => {
    expect(partnerSyncScore(10, 10)).toBe(0)
  })
})

describe('doublesAttackRate', () => {
  it('computes a rate', () => {
    expect(doublesAttackRate(15, 20)).toBe(0.75)
  })
  it('0 rallies returns 0', () => {
    expect(doublesAttackRate(0, 0)).toBe(0)
  })
  it('perfect rate', () => {
    expect(doublesAttackRate(6, 6)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Match dynamics
// ---------------------------------------------------------------------------

describe('momentumShifts', () => {
  it('no shifts when one side dominates', () => {
    expect(momentumShifts(['a', 'a', 'a'])).toBe(0)
  })
  it('counts a single lead change', () => {
    // a leads, then b overtakes -> one shift
    expect(momentumShifts(['a', 'b', 'b'])).toBe(1)
  })
  it('counts multiple lead changes', () => {
    // a (a leads), b (tie), b (b leads -> shift 1), a (tie), a (a leads -> shift 2)
    expect(momentumShifts(['a', 'b', 'b', 'a', 'a'])).toBe(2)
  })
  it('empty sequence has 0 shifts', () => {
    expect(momentumShifts([])).toBe(0)
  })
  it('tie at start, then a leads, no shift yet', () => {
    expect(momentumShifts(['a', 'b', 'a'])).toBe(0)
  })
  it('single point has 0 shifts', () => {
    expect(momentumShifts(['a'])).toBe(0)
  })
  it('alternating points stay tied, no shifts', () => {
    expect(momentumShifts(['a', 'b', 'a', 'b'])).toBe(0)
  })
  it('counts b-to-a shift', () => {
    expect(momentumShifts(['b', 'a', 'a'])).toBe(1)
  })
  it('three shifts back and forth', () => {
    // a -> b leads(1) -> a leads(2) -> b leads(3)
    expect(momentumShifts(['a', 'b', 'b', 'a', 'a', 'b', 'b'])).toBe(3)
  })
})

describe('comebackIndex', () => {
  it('returns deficit when won', () => {
    expect(comebackIndex(8, true)).toBe(8)
  })
  it('returns 0 when lost', () => {
    expect(comebackIndex(8, false)).toBe(0)
  })
  it('0 deficit won returns 0', () => {
    expect(comebackIndex(0, true)).toBe(0)
  })
  it('negative deficit clamped to 0', () => {
    expect(comebackIndex(-3, true)).toBe(0)
  })
})

describe('closeGameRate', () => {
  const games: GameScore[] = [
    { a: 21, b: 19 }, // margin 2 -> close
    { a: 21, b: 10 }, // margin 11 -> not close
    { a: 22, b: 20 }, // margin 2 -> close
    { a: 19, b: 21 }, // margin 2 -> close
  ]
  it('share decided by <=2', () => {
    expect(closeGameRate(games)).toBe(0.75)
  })
  it('empty returns 0', () => {
    expect(closeGameRate([])).toBe(0)
  })
  it('margin exactly 2 counts as close', () => {
    expect(closeGameRate([{ a: 21, b: 19 }])).toBe(1)
  })
  it('margin 3 not close', () => {
    expect(closeGameRate([{ a: 21, b: 18 }])).toBe(0)
  })
  it('margin 1 close', () => {
    expect(closeGameRate([{ a: 30, b: 29 }])).toBe(1)
  })
  it('all blowouts return 0', () => {
    expect(closeGameRate([{ a: 21, b: 5 }, { a: 21, b: 8 }])).toBe(0)
  })
})

describe('pressurePointConversion', () => {
  it('computes conversion', () => {
    expect(pressurePointConversion(3, 6)).toBe(0.5)
  })
  it('0 faced returns 0', () => {
    expect(pressurePointConversion(0, 0)).toBe(0)
  })
  it('perfect conversion', () => {
    expect(pressurePointConversion(4, 4)).toBe(1)
  })
  it('no conversions', () => {
    expect(pressurePointConversion(0, 5)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy
// ---------------------------------------------------------------------------

describe('dkBadmintonPoints', () => {
  const base: BadmintonStatLine = {
    pointsWon: 0,
    smashWinners: 0,
    netWinners: 0,
    aces: 0,
    unforcedErrors: 0,
    gameWon: false,
    matchWon: false,
  }

  it('all zeros returns 0', () => {
    expect(dkBadmintonPoints(base)).toBe(0)
  })
  it('point worth 1', () => {
    expect(dkBadmintonPoints({ ...base, pointsWon: 10 })).toBe(10)
  })
  it('smash winner worth 2', () => {
    expect(dkBadmintonPoints({ ...base, smashWinners: 3 })).toBe(6)
  })
  it('net winner worth 1.5', () => {
    expect(dkBadmintonPoints({ ...base, netWinners: 4 })).toBe(6)
  })
  it('ace worth 2', () => {
    expect(dkBadmintonPoints({ ...base, aces: 2 })).toBe(4)
  })
  it('unforced error worth -0.5', () => {
    expect(dkBadmintonPoints({ ...base, unforcedErrors: 4 })).toBe(-2)
  })
  it('game won worth +5', () => {
    expect(dkBadmintonPoints({ ...base, gameWon: true })).toBe(5)
  })
  it('match won worth +10', () => {
    expect(dkBadmintonPoints({ ...base, matchWon: true })).toBe(10)
  })
  it('combines all components', () => {
    const stat: BadmintonStatLine = {
      pointsWon: 21, // 21
      smashWinners: 5, // 10
      netWinners: 4, // 6
      aces: 2, // 4
      unforcedErrors: 6, // -3
      gameWon: true, // 5
      matchWon: true, // 10
    }
    // 21 + 10 + 6 + 4 - 3 + 5 + 10 = 53
    expect(dkBadmintonPoints(stat)).toBe(53)
  })
  it('errors can drive negative totals', () => {
    expect(dkBadmintonPoints({ ...base, unforcedErrors: 10 })).toBe(-5)
  })
})

describe('dkProjection', () => {
  const make = (pointsWon: number): BadmintonStatLine => ({
    pointsWon,
    smashWinners: 0,
    netWinners: 0,
    aces: 0,
    unforcedErrors: 0,
    gameWon: false,
    matchWon: false,
  })

  it('empty returns 0', () => {
    expect(dkProjection([])).toBe(0)
  })
  it('single match equals its score', () => {
    expect(dkProjection([make(10)])).toBe(10)
  })
  it('two matches both weighted equally (both within most-recent-3)', () => {
    // both weighted 3x -> mean of 10 and 20 = 15
    expect(dkProjection([make(10), make(20)])).toBe(15)
  })
  it('three matches all weighted 3x -> simple mean', () => {
    expect(dkProjection([make(6), make(9), make(12)])).toBe(9)
  })
  it('weights most recent 3 at 3x over older matches', () => {
    // scores: older=0 (weight 1), then 10,10,10 (weight 3 each)
    // weightedSum = 0*1 + 10*3 + 10*3 + 10*3 = 90; weightTotal = 1+3+3+3 = 10
    expect(dkProjection([make(0), make(10), make(10), make(10)])).toBe(9)
  })
  it('older match pulls projection toward its value', () => {
    // older=30 (w1), recent 0,0,0 (w3) -> 30/10 = 3
    expect(dkProjection([make(30), make(0), make(0), make(0)])).toBe(3)
  })
  it('all identical returns that value', () => {
    expect(dkProjection([make(15), make(15), make(15), make(15)])).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// Type sanity
// ---------------------------------------------------------------------------

describe('type usage', () => {
  it('Side type accepts a and b', () => {
    const sides: Side[] = ['a', 'b']
    expect(sides.length).toBe(2)
  })
})
