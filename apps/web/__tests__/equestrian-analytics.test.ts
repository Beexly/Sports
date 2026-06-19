import { describe, it, expect } from 'vitest'
import {
  ELIMINATION_FAULTS,
  METERS_PER_FURLONG,
  jumpingFaults,
  timeFaults,
  totalJumpingScore,
  clearRound,
  jumpOffRanking,
  dressagePercentage,
  weightedMovementScore,
  dressageFinalScore,
  collectiveMarks,
  dressageRanking,
  eventingTotal,
  dressageToPenalty,
  crossCountryPenalty,
  eventingRanking,
  furlongsToMeters,
  racePace,
  speedRating,
  weightAdjustedRating,
  marginInLengths,
  impliedProbFromOdds,
  oddsToFractional,
  formFigureScore,
  daysSinceLastRun,
  goingPreference,
  classRating,
  winStrikeRate,
  placeStrikeRate,
  riderConsistency,
  returnOnStakes,
  dkEquestrianPoints,
  dkProjection,
} from '@/lib/sports/equestrian-analytics'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('ELIMINATION_FAULTS is 1000', () => {
    expect(ELIMINATION_FAULTS).toBe(1000)
  })
  it('METERS_PER_FURLONG is 201.168', () => {
    expect(METERS_PER_FURLONG).toBe(201.168)
  })
})

// ---------------------------------------------------------------------------
// 1. Show jumping
// ---------------------------------------------------------------------------

describe('jumpingFaults', () => {
  it('one knockdown = 4', () => {
    expect(jumpingFaults(1, 0, 0)).toBe(4)
  })
  it('two knockdowns = 8', () => {
    expect(jumpingFaults(2, 0, 0)).toBe(8)
  })
  it('three knockdowns = 12', () => {
    expect(jumpingFaults(3, 0, 0)).toBe(12)
  })
  it('zero of everything = 0', () => {
    expect(jumpingFaults(0, 0, 0)).toBe(0)
  })
  it('first refusal = 4', () => {
    expect(jumpingFaults(0, 1, 0)).toBe(4)
  })
  it('knockdown plus first refusal = 8', () => {
    expect(jumpingFaults(1, 1, 0)).toBe(8)
  })
  it('second refusal eliminates (>=1000)', () => {
    expect(jumpingFaults(0, 2, 0)).toBe(ELIMINATION_FAULTS)
  })
  it('three refusals eliminates', () => {
    expect(jumpingFaults(0, 3, 0)).toBe(ELIMINATION_FAULTS)
  })
  it('refusal elimination still adds knockdowns', () => {
    expect(jumpingFaults(1, 2, 0)).toBe(4 + ELIMINATION_FAULTS)
  })
  it('a fall eliminates', () => {
    expect(jumpingFaults(0, 0, 1)).toBe(ELIMINATION_FAULTS)
  })
  it('multiple falls still 1000 (single elimination)', () => {
    expect(jumpingFaults(0, 0, 3)).toBe(ELIMINATION_FAULTS)
  })
  it('knockdown plus fall', () => {
    expect(jumpingFaults(2, 0, 1)).toBe(8 + ELIMINATION_FAULTS)
  })
  it('refusal and fall both eliminate (2000 total)', () => {
    expect(jumpingFaults(0, 2, 1)).toBe(2 * ELIMINATION_FAULTS)
  })
  it('negative inputs clamp to 0', () => {
    expect(jumpingFaults(-3, -1, -2)).toBe(0)
  })
})

describe('timeFaults', () => {
  it('exactly at allowed time = 0', () => {
    expect(timeFaults(60, 60)).toBe(0)
  })
  it('under allowed time = 0', () => {
    expect(timeFaults(55, 60)).toBe(0)
  })
  it('one second over = 1 fault (ceil of 1/4)', () => {
    expect(timeFaults(61, 60)).toBe(1)
  })
  it('four seconds over = 1 fault', () => {
    expect(timeFaults(64, 60)).toBe(1)
  })
  it('five seconds over = 2 faults (ceil of 5/4)', () => {
    expect(timeFaults(65, 60)).toBe(2)
  })
  it('eight seconds over = 2 faults', () => {
    expect(timeFaults(68, 60)).toBe(2)
  })
  it('custom perSecond of 1 = 1 fault per second', () => {
    expect(timeFaults(63, 60, 1)).toBe(3)
  })
  it('perSecond of 0 yields 0', () => {
    expect(timeFaults(100, 60, 0)).toBe(0)
  })
  it('negative perSecond yields 0', () => {
    expect(timeFaults(100, 60, -2)).toBe(0)
  })
})

describe('totalJumpingScore', () => {
  it('sums obstacle and time faults', () => {
    expect(totalJumpingScore(8, 2)).toBe(10)
  })
  it('zero plus zero = 0', () => {
    expect(totalJumpingScore(0, 0)).toBe(0)
  })
  it('clear obstacles with time faults', () => {
    expect(totalJumpingScore(0, 3)).toBe(3)
  })
})

describe('clearRound', () => {
  it('zero faults is clear', () => {
    expect(clearRound(0)).toBe(true)
  })
  it('four faults is not clear', () => {
    expect(clearRound(4)).toBe(false)
  })
  it('one fault is not clear', () => {
    expect(clearRound(1)).toBe(false)
  })
})

describe('jumpOffRanking', () => {
  it('sorts by faults ascending', () => {
    const order = jumpOffRanking([
      { rider: 'A', faults: 4, time: 40 },
      { rider: 'B', faults: 0, time: 45 },
      { rider: 'C', faults: 8, time: 38 },
    ])
    expect(order).toEqual(['B', 'A', 'C'])
  })
  it('breaks ties by time ascending', () => {
    const order = jumpOffRanking([
      { rider: 'A', faults: 0, time: 42.5 },
      { rider: 'B', faults: 0, time: 41.1 },
      { rider: 'C', faults: 0, time: 43.0 },
    ])
    expect(order).toEqual(['B', 'A', 'C'])
  })
  it('faults takes priority over time', () => {
    const order = jumpOffRanking([
      { rider: 'Fast4', faults: 4, time: 30 },
      { rider: 'SlowClear', faults: 0, time: 50 },
    ])
    expect(order).toEqual(['SlowClear', 'Fast4'])
  })
  it('empty rounds yield empty order', () => {
    expect(jumpOffRanking([])).toEqual([])
  })
  it('single round returns that rider', () => {
    expect(jumpOffRanking([{ rider: 'Solo', faults: 0, time: 40 }])).toEqual(['Solo'])
  })
  it('does not mutate input array', () => {
    const input = [
      { rider: 'A', faults: 4, time: 40 },
      { rider: 'B', faults: 0, time: 45 },
    ]
    jumpOffRanking(input)
    expect(input[0]?.rider).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// 2. Dressage
// ---------------------------------------------------------------------------

describe('dressagePercentage', () => {
  it('half of max = 50%', () => {
    expect(dressagePercentage(100, 200)).toBe(50)
  })
  it('full max = 100%', () => {
    expect(dressagePercentage(200, 200)).toBe(100)
  })
  it('max of 0 returns 0', () => {
    expect(dressagePercentage(150, 0)).toBe(0)
  })
  it('zero points = 0%', () => {
    expect(dressagePercentage(0, 200)).toBe(0)
  })
  it('typical grand prix figure', () => {
    expect(dressagePercentage(380, 500)).toBeCloseTo(76, 5)
  })
})

describe('weightedMovementScore', () => {
  it('applies coefficients', () => {
    expect(
      weightedMovementScore([
        { score: 7, coefficient: 2 },
        { score: 8, coefficient: 1 },
      ]),
    ).toBe(22)
  })
  it('coefficient of 1 acts as plain sum', () => {
    expect(
      weightedMovementScore([
        { score: 6, coefficient: 1 },
        { score: 7, coefficient: 1 },
      ]),
    ).toBe(13)
  })
  it('empty movements = 0', () => {
    expect(weightedMovementScore([])).toBe(0)
  })
  it('single movement', () => {
    expect(weightedMovementScore([{ score: 9, coefficient: 2 }])).toBe(18)
  })
  it('fractional coefficient', () => {
    expect(weightedMovementScore([{ score: 8, coefficient: 0.5 }])).toBe(4)
  })
})

describe('dressageFinalScore', () => {
  it('averages a panel', () => {
    expect(dressageFinalScore([70, 72, 74])).toBeCloseTo(72, 5)
  })
  it('single judge returns that value', () => {
    expect(dressageFinalScore([68])).toBe(68)
  })
  it('empty panel = 0', () => {
    expect(dressageFinalScore([])).toBe(0)
  })
  it('two judges', () => {
    expect(dressageFinalScore([60, 80])).toBe(70)
  })
  it('all equal scores', () => {
    expect(dressageFinalScore([75, 75, 75, 75])).toBe(75)
  })
})

describe('collectiveMarks', () => {
  it('sums four categories', () => {
    expect(collectiveMarks(8, 7, 9, 8)).toBe(32)
  })
  it('all zeros = 0', () => {
    expect(collectiveMarks(0, 0, 0, 0)).toBe(0)
  })
  it('all tens = 40', () => {
    expect(collectiveMarks(10, 10, 10, 10)).toBe(40)
  })
})

describe('dressageRanking', () => {
  it('sorts by percentage descending', () => {
    const order = dressageRanking([
      { name: 'A', percentage: 70 },
      { name: 'B', percentage: 80 },
      { name: 'C', percentage: 65 },
    ])
    expect(order).toEqual(['B', 'A', 'C'])
  })
  it('empty list', () => {
    expect(dressageRanking([])).toEqual([])
  })
  it('single competitor', () => {
    expect(dressageRanking([{ name: 'Solo', percentage: 72 }])).toEqual(['Solo'])
  })
  it('does not mutate input', () => {
    const input = [
      { name: 'A', percentage: 70 },
      { name: 'B', percentage: 80 },
    ]
    dressageRanking(input)
    expect(input[0]?.name).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// 3. Eventing
// ---------------------------------------------------------------------------

describe('eventingTotal', () => {
  it('sums three phases', () => {
    expect(eventingTotal(30, 12.4, 4)).toBeCloseTo(46.4, 5)
  })
  it('all zeros = 0', () => {
    expect(eventingTotal(0, 0, 0)).toBe(0)
  })
  it('dressage only', () => {
    expect(eventingTotal(28, 0, 0)).toBe(28)
  })
})

describe('dressageToPenalty', () => {
  it('70% -> 45 penalty', () => {
    expect(dressageToPenalty(70)).toBeCloseTo(45, 5)
  })
  it('100% -> 0 penalty', () => {
    expect(dressageToPenalty(100)).toBe(0)
  })
  it('above 100% clamps to 0', () => {
    expect(dressageToPenalty(110)).toBe(0)
  })
  it('60% -> 60 penalty', () => {
    expect(dressageToPenalty(60)).toBeCloseTo(60, 5)
  })
  it('0% -> 150 penalty', () => {
    expect(dressageToPenalty(0)).toBe(150)
  })
})

describe('crossCountryPenalty', () => {
  it('within optimum time = jumping only', () => {
    expect(crossCountryPenalty(0, 500, 520)).toBe(0)
  })
  it('exactly at optimum time = jumping only', () => {
    expect(crossCountryPenalty(20, 520, 520)).toBe(20)
  })
  it('over time accrues 0.4 per second', () => {
    expect(crossCountryPenalty(0, 530, 520)).toBeCloseTo(4, 5)
  })
  it('jumping plus time penalty', () => {
    expect(crossCountryPenalty(20, 530, 520)).toBeCloseTo(24, 5)
  })
  it('custom perSecond', () => {
    expect(crossCountryPenalty(0, 530, 520, 1)).toBe(10)
  })
  it('under optimum never negative', () => {
    expect(crossCountryPenalty(0, 400, 520)).toBe(0)
  })
})

describe('eventingRanking', () => {
  it('sorts by total penalty ascending', () => {
    const order = eventingRanking([
      { name: 'A', totalPenalty: 46.4 },
      { name: 'B', totalPenalty: 30.0 },
      { name: 'C', totalPenalty: 55.2 },
    ])
    expect(order).toEqual(['B', 'A', 'C'])
  })
  it('empty list', () => {
    expect(eventingRanking([])).toEqual([])
  })
  it('does not mutate input', () => {
    const input = [
      { name: 'A', totalPenalty: 46 },
      { name: 'B', totalPenalty: 30 },
    ]
    eventingRanking(input)
    expect(input[0]?.name).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// 4. Horse racing
// ---------------------------------------------------------------------------

describe('furlongsToMeters', () => {
  it('1 furlong = 201.168 m', () => {
    expect(furlongsToMeters(1)).toBeCloseTo(201.168, 5)
  })
  it('8 furlongs = 1609.344 m (one mile)', () => {
    expect(furlongsToMeters(8)).toBeCloseTo(1609.344, 5)
  })
  it('0 furlongs = 0', () => {
    expect(furlongsToMeters(0)).toBe(0)
  })
  it('5 furlongs', () => {
    expect(furlongsToMeters(5)).toBeCloseTo(1005.84, 5)
  })
})

describe('racePace', () => {
  it('1000 m in 60s = 16.66.. m/s', () => {
    expect(racePace(1000, 60)).toBeCloseTo(16.6667, 4)
  })
  it('time of 0 returns 0', () => {
    expect(racePace(1000, 0)).toBe(0)
  })
  it('zero distance = 0', () => {
    expect(racePace(0, 60)).toBe(0)
  })
  it('one mile in 96s', () => {
    expect(racePace(1609.344, 96)).toBeCloseTo(16.764, 3)
  })
})

describe('speedRating', () => {
  it('matching standard time = 100', () => {
    expect(speedRating(96, 96)).toBe(100)
  })
  it('faster than standard = higher than 100', () => {
    expect(speedRating(95.8, 96)).toBeCloseTo(101, 5)
  })
  it('slower than standard = lower than 100', () => {
    expect(speedRating(96.2, 96)).toBeCloseTo(99, 5)
  })
  it('one full second faster = +5 (default 0.2 per point)', () => {
    expect(speedRating(95, 96)).toBeCloseTo(105, 5)
  })
  it('custom perLength', () => {
    expect(speedRating(94, 96, 1)).toBeCloseTo(102, 5)
  })
  it('perLength of 0 returns 100', () => {
    expect(speedRating(90, 96, 0)).toBe(100)
  })
})

describe('weightAdjustedRating', () => {
  it('par weight = base rating unchanged', () => {
    expect(weightAdjustedRating(100, 57)).toBe(100)
  })
  it('extra weight reduces rating', () => {
    expect(weightAdjustedRating(100, 60)).toBe(94)
  })
  it('less weight raises rating', () => {
    expect(weightAdjustedRating(100, 55)).toBe(104)
  })
  it('custom par weight', () => {
    expect(weightAdjustedRating(100, 62, 60)).toBe(96)
  })
  it('custom perKg', () => {
    expect(weightAdjustedRating(100, 60, 57, 1)).toBe(97)
  })
})

describe('marginInLengths', () => {
  it('zero time gap = 0 lengths', () => {
    expect(marginInLengths(0, 16)).toBe(0)
  })
  it('converts time gap at 16 m/s with 2.4m length', () => {
    // 0.3s * 16 = 4.8m / 2.4 = 2 lengths
    expect(marginInLengths(0.3, 16)).toBeCloseTo(2, 5)
  })
  it('custom length', () => {
    expect(marginInLengths(0.3, 16, 2.0)).toBeCloseTo(2.4, 5)
  })
  it('length of 0 returns 0', () => {
    expect(marginInLengths(0.3, 16, 0)).toBe(0)
  })
})

describe('impliedProbFromOdds', () => {
  it('decimal 2.0 -> 0.5', () => {
    expect(impliedProbFromOdds(2.0)).toBeCloseTo(0.5, 5)
  })
  it('decimal 4.0 -> 0.25', () => {
    expect(impliedProbFromOdds(4.0)).toBeCloseTo(0.25, 5)
  })
  it('decimal 1.0 -> 1.0', () => {
    expect(impliedProbFromOdds(1.0)).toBeCloseTo(1, 5)
  })
  it('decimal 5.0 -> 0.2', () => {
    expect(impliedProbFromOdds(5.0)).toBeCloseTo(0.2, 5)
  })
  it('odds of 0 returns 0', () => {
    expect(impliedProbFromOdds(0)).toBe(0)
  })
  it('negative odds returns 0', () => {
    expect(impliedProbFromOdds(-3)).toBe(0)
  })
})

describe('oddsToFractional', () => {
  it('3.0 -> "2/1"', () => {
    expect(oddsToFractional(3.0)).toBe('2/1')
  })
  it('2.0 -> "1/1" (evens)', () => {
    expect(oddsToFractional(2.0)).toBe('1/1')
  })
  it('1.5 -> "1/2"', () => {
    expect(oddsToFractional(1.5)).toBe('1/2')
  })
  it('5.0 -> "4/1"', () => {
    expect(oddsToFractional(5.0)).toBe('4/1')
  })
  it('1.0 -> "0/1"', () => {
    expect(oddsToFractional(1.0)).toBe('0/1')
  })
  it('below 1 -> "0/1"', () => {
    expect(oddsToFractional(0.5)).toBe('0/1')
  })
  it('2.5 -> "3/2"', () => {
    expect(oddsToFractional(2.5)).toBe('3/2')
  })
  it('11.0 -> "10/1"', () => {
    expect(oddsToFractional(11.0)).toBe('10/1')
  })
})

// ---------------------------------------------------------------------------
// 5. Performance & form (racing)
// ---------------------------------------------------------------------------

describe('formFigureScore', () => {
  it('empty list = 0', () => {
    expect(formFigureScore([])).toBe(0)
  })
  it('all wins (1s) averages to 1', () => {
    expect(formFigureScore([1, 1, 1, 1])).toBeCloseTo(1, 5)
  })
  it('P treated as 10', () => {
    // figures [1, 'P'] -> weights: both recent (only 2), so weight 2 each
    // (1*2 + 10*2) / 4 = 22/4 = 5.5
    expect(formFigureScore([1, 'P'])).toBeCloseTo(5.5, 5)
  })
  it('F treated as 10', () => {
    expect(formFigureScore(['F', 'F'])).toBeCloseTo(10, 5)
  })
  it('U treated as 10', () => {
    expect(formFigureScore(['U'])).toBeCloseTo(10, 5)
  })
  it('single figure', () => {
    expect(formFigureScore([3])).toBeCloseTo(3, 5)
  })
  it('most-recent two weighted 2x', () => {
    // figures oldest->newest [5, 5, 1, 1]
    // weights: idx0=1, idx1=1, idx2=2, idx3=2
    // (5*1 + 5*1 + 1*2 + 1*2) / (1+1+2+2) = (5+5+2+2)/6 = 14/6
    expect(formFigureScore([5, 5, 1, 1])).toBeCloseTo(14 / 6, 5)
  })
  it('mixed numbers and codes', () => {
    // [2, 'P', 1] oldest->newest
    // weights: idx0=1, idx1=2, idx2=2
    // (2*1 + 10*2 + 1*2) / 5 = (2 + 20 + 2)/5 = 24/5 = 4.8
    expect(formFigureScore([2, 'P', 1])).toBeCloseTo(4.8, 5)
  })
  it('lower average means better form', () => {
    const good = formFigureScore([1, 2, 1, 1])
    const bad = formFigureScore([8, 9, 10, 7])
    expect(good).toBeLessThan(bad)
  })
})

describe('daysSinceLastRun', () => {
  const day = 1000 * 60 * 60 * 24
  it('exactly one day', () => {
    expect(daysSinceLastRun(0, day)).toBe(1)
  })
  it('30 days', () => {
    expect(daysSinceLastRun(0, 30 * day)).toBe(30)
  })
  it('same instant = 0', () => {
    expect(daysSinceLastRun(day, day)).toBe(0)
  })
  it('negative diff = 0', () => {
    expect(daysSinceLastRun(2 * day, day)).toBe(0)
  })
  it('partial day floors down', () => {
    expect(daysSinceLastRun(0, day + day / 2)).toBe(1)
  })
})

describe('goingPreference', () => {
  const results = [
    { going: 'good', position: 2 },
    { going: 'good', position: 4 },
    { going: 'soft', position: 1 },
    { going: 'heavy', position: 8 },
  ]
  it('averages positions on a going', () => {
    expect(goingPreference(results, 'good')).toBeCloseTo(3, 5)
  })
  it('single result going', () => {
    expect(goingPreference(results, 'soft')).toBe(1)
  })
  it('no data returns Infinity', () => {
    expect(goingPreference(results, 'firm')).toBe(Infinity)
  })
  it('empty results returns Infinity', () => {
    expect(goingPreference([], 'good')).toBe(Infinity)
  })
})

describe('classRating', () => {
  it('wins weighted 3x plus places over runs', () => {
    // (2*3 + 3) / 10 = 9/10 = 0.9
    expect(classRating(2, 3, 10)).toBeCloseTo(0.9, 5)
  })
  it('runs of 0 returns 0', () => {
    expect(classRating(2, 3, 0)).toBe(0)
  })
  it('all wins', () => {
    // (5*3 + 0) / 5 = 3
    expect(classRating(5, 0, 5)).toBe(3)
  })
  it('no wins or places', () => {
    expect(classRating(0, 0, 8)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Rider / jockey stats
// ---------------------------------------------------------------------------

describe('winStrikeRate', () => {
  it('wins over rides', () => {
    expect(winStrikeRate(20, 100)).toBeCloseTo(0.2, 5)
  })
  it('zero rides = 0', () => {
    expect(winStrikeRate(5, 0)).toBe(0)
  })
  it('all wins = 1', () => {
    expect(winStrikeRate(10, 10)).toBe(1)
  })
  it('no wins = 0', () => {
    expect(winStrikeRate(0, 50)).toBe(0)
  })
})

describe('placeStrikeRate', () => {
  it('placings over rides', () => {
    expect(placeStrikeRate(35, 100)).toBeCloseTo(0.35, 5)
  })
  it('zero rides = 0', () => {
    expect(placeStrikeRate(5, 0)).toBe(0)
  })
  it('all placings = 1', () => {
    expect(placeStrikeRate(8, 8)).toBe(1)
  })
})

describe('riderConsistency', () => {
  it('fewer than 2 positions returns 1', () => {
    expect(riderConsistency([])).toBe(1)
    expect(riderConsistency([3])).toBe(1)
  })
  it('identical positions = perfectly consistent (1)', () => {
    expect(riderConsistency([4, 4, 4, 4])).toBeCloseTo(1, 5)
  })
  it('higher variance lowers consistency', () => {
    const tight = riderConsistency([3, 3, 4, 4])
    const wide = riderConsistency([1, 10, 2, 9])
    expect(tight).toBeGreaterThan(wide)
  })
  it('value is between 0 and 1', () => {
    const c = riderConsistency([1, 5, 2, 8])
    expect(c).toBeGreaterThan(0)
    expect(c).toBeLessThanOrEqual(1)
  })
  it('known stdev case', () => {
    // positions [2,4] -> mean 3, variance = ((-1)^2 + 1^2)/2 = 1, stdev = 1
    // 1/(1+1) = 0.5
    expect(riderConsistency([2, 4])).toBeCloseTo(0.5, 5)
  })
})

describe('returnOnStakes', () => {
  it('profit yields positive ROI', () => {
    expect(returnOnStakes(120, 100)).toBeCloseTo(0.2, 5)
  })
  it('loss yields negative ROI', () => {
    expect(returnOnStakes(80, 100)).toBeCloseTo(-0.2, 5)
  })
  it('break-even = 0', () => {
    expect(returnOnStakes(100, 100)).toBe(0)
  })
  it('staked of 0 returns 0', () => {
    expect(returnOnStakes(100, 0)).toBe(0)
  })
  it('total loss = -1', () => {
    expect(returnOnStakes(0, 100)).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy
// ---------------------------------------------------------------------------

describe('dkEquestrianPoints', () => {
  it('1st place = 40', () => {
    expect(dkEquestrianPoints({ discipline: 'jumping', placement: 1 })).toBe(40)
  })
  it('2nd place = 32', () => {
    expect(dkEquestrianPoints({ discipline: 'dressage', placement: 2 })).toBe(32)
  })
  it('3rd place = 26', () => {
    expect(dkEquestrianPoints({ discipline: 'eventing', placement: 3 })).toBe(26)
  })
  it('4th place = 20', () => {
    expect(dkEquestrianPoints({ discipline: 'racing', placement: 4 })).toBe(20)
  })
  it('5th place = 16', () => {
    expect(dkEquestrianPoints({ discipline: 'jumping', placement: 5 })).toBe(16)
  })
  it('6th place = 10', () => {
    expect(dkEquestrianPoints({ discipline: 'jumping', placement: 6 })).toBe(10)
  })
  it('10th place = 10', () => {
    expect(dkEquestrianPoints({ discipline: 'jumping', placement: 10 })).toBe(10)
  })
  it('11th place = 4', () => {
    expect(dkEquestrianPoints({ discipline: 'jumping', placement: 11 })).toBe(4)
  })
  it('20th place = 4', () => {
    expect(dkEquestrianPoints({ discipline: 'racing', placement: 20 })).toBe(4)
  })
  it('clear round bonus +8', () => {
    expect(
      dkEquestrianPoints({ discipline: 'jumping', placement: 1, clearRound: true }),
    ).toBe(48)
  })
  it('personal best bonus +5', () => {
    expect(
      dkEquestrianPoints({ discipline: 'dressage', placement: 2, personalBest: true }),
    ).toBe(37)
  })
  it('both bonuses stack', () => {
    expect(
      dkEquestrianPoints({
        discipline: 'jumping',
        placement: 3,
        clearRound: true,
        personalBest: true,
      }),
    ).toBe(26 + 8 + 5)
  })
  it('bonuses on a low placement', () => {
    expect(
      dkEquestrianPoints({
        discipline: 'racing',
        placement: 15,
        clearRound: true,
        personalBest: true,
      }),
    ).toBe(4 + 8 + 5)
  })
  it('clearRound false adds nothing', () => {
    expect(
      dkEquestrianPoints({ discipline: 'jumping', placement: 1, clearRound: false }),
    ).toBe(40)
  })
})

describe('dkProjection', () => {
  it('empty list = 0', () => {
    expect(dkProjection([])).toBe(0)
  })
  it('single result returns its points (weighted 3x but alone)', () => {
    // only one result -> weight 3, sum 40*3 / 3 = 40
    expect(dkProjection([{ discipline: 'jumping', placement: 1 }])).toBe(40)
  })
  it('weights most recent 3x', () => {
    // oldest->newest: [placement 11 (4 pts), placement 1 (40 pts)]
    // weights: idx0=1, idx1=3
    // (4*1 + 40*3) / (1+3) = (4 + 120)/4 = 31
    expect(
      dkProjection([
        { discipline: 'jumping', placement: 11 },
        { discipline: 'jumping', placement: 1 },
      ]),
    ).toBeCloseTo(31, 5)
  })
  it('three results weighting', () => {
    // [40, 32, 26] oldest->newest, weights 1,1,3
    // (40 + 32 + 26*3) / 5 = (40 + 32 + 78)/5 = 150/5 = 30
    expect(
      dkProjection([
        { discipline: 'jumping', placement: 1 },
        { discipline: 'jumping', placement: 2 },
        { discipline: 'jumping', placement: 3 },
      ]),
    ).toBeCloseTo(30, 5)
  })
  it('includes bonuses in projection', () => {
    // single recent with clear round: (40+8)*3 / 3 = 48
    expect(
      dkProjection([{ discipline: 'jumping', placement: 1, clearRound: true }]),
    ).toBe(48)
  })
  it('identical results yield that value', () => {
    expect(
      dkProjection([
        { discipline: 'racing', placement: 4 },
        { discipline: 'racing', placement: 4 },
        { discipline: 'racing', placement: 4 },
      ]),
    ).toBe(20)
  })
})
