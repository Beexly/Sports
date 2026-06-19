import { describe, it, expect } from 'vitest'

import {
  // 1. Code of Points
  difficultyScore,
  executionScore,
  totalScore,
  artisanScore,
  connectionBonus,
  // 2. Judge scoring
  judgePanel,
  judgeConsistency,
  artScoreComponent,
  deductionSummary,
  penaltyOverride,
  // 3. Event-specific
  floorExerciseBonus,
  vaultDifficultyValue,
  parallelBarsHoldBonus,
  unevenBarsTransition,
  rhythmicGymnasticsArtistry,
  tramplineHeight,
  // 4. Competition scoring
  allAroundScore,
  teamScore,
  qualificationRanks,
  finalSelectionCriteria,
  countryTeamLimit,
  // 5. Difficulty tracking
  maxPossibleScore,
  unusedDifficulty,
  difficultyGrowth,
  routineComplexity,
  // 6. Training and development
  consistencyIndex,
  peakFormScore,
  formTrend,
  predictionInterval,
  optimalCompetitionSchedule,
  // 7. DraftKings
  dkGymnasticsPoints,
  dkProjection,
} from '@/lib/sports/gymnastics-analytics'

// ---------------------------------------------------------------------------
// 1. Code of Points scoring
// ---------------------------------------------------------------------------

describe('difficultyScore', () => {
  it('sums all element values when 8 or fewer', () => {
    const elements = [{ value: 0.3 }, { value: 0.4 }, { value: 0.5 }]
    expect(difficultyScore(elements)).toBeCloseTo(1.2)
  })

  it('takes only top 8 when more than 8 elements are provided', () => {
    // 10 elements: values 0.1 through 1.0
    const elements = Array.from({ length: 10 }, (_, i) => ({ value: (i + 1) * 0.1 }))
    // Top 8 values: 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0 = 5.2
    expect(difficultyScore(elements)).toBeCloseTo(5.2)
  })

  it('returns 0 for empty array', () => {
    expect(difficultyScore([])).toBe(0)
  })

  it('handles a single element', () => {
    expect(difficultyScore([{ value: 0.6 }])).toBeCloseTo(0.6)
  })

  it('sorts correctly so highest values are selected', () => {
    const elements = [{ value: 0.1 }, { value: 0.9 }, { value: 0.5 }, { value: 0.7 }]
    expect(difficultyScore(elements)).toBeCloseTo(2.2)
  })
})

describe('executionScore', () => {
  it('returns startValue minus sum of deductions', () => {
    expect(executionScore([0.1, 0.3])).toBeCloseTo(9.6)
  })

  it('clamps to 0 when deductions exceed startValue', () => {
    expect(executionScore([5.0, 6.0])).toBe(0)
  })

  it('uses default startValue of 10.0', () => {
    expect(executionScore([])).toBeCloseTo(10.0)
  })

  it('accepts custom startValue', () => {
    expect(executionScore([1.0], 9.0)).toBeCloseTo(8.0)
  })

  it('deductions summing to exactly startValue gives 0', () => {
    expect(executionScore([5.0, 5.0])).toBe(0)
  })

  it('deductions over 10 clamp to 0, never negative', () => {
    expect(executionScore([11.0])).toBe(0)
  })
})

describe('totalScore', () => {
  it('sums D + E with no neutral deductions', () => {
    expect(totalScore(5.8, 8.4)).toBeCloseTo(14.2)
  })

  it('subtracts neutral deductions', () => {
    expect(totalScore(6.0, 8.0, 1.0)).toBeCloseTo(13.0)
  })

  it('defaults neutralDeductions to 0', () => {
    expect(totalScore(4.0, 7.5)).toBeCloseTo(11.5)
  })
})

describe('artisanScore', () => {
  it('sums difficulties with no diversity bonus for single category', () => {
    const els = [
      { category: 'acrobatic' as const, difficulty: 0.3 },
      { category: 'acrobatic' as const, difficulty: 0.4 },
    ]
    expect(artisanScore(els)).toBeCloseTo(0.7)
  })

  it('adds +0.1 per additional unique category', () => {
    const els = [
      { category: 'acrobatic' as const, difficulty: 0.3 },
      { category: 'dance' as const, difficulty: 0.4 },
      { category: 'connection' as const, difficulty: 0.5 },
    ]
    // sum = 1.2, categories = 3 → bonus = 2 * 0.1 = 0.2
    expect(artisanScore(els)).toBeCloseTo(1.4)
  })

  it('returns 0 for empty array', () => {
    expect(artisanScore([])).toBe(0)
  })

  it('four categories gives +0.3 bonus', () => {
    const els = [
      { category: 'acrobatic' as const, difficulty: 0.1 },
      { category: 'dance' as const, difficulty: 0.1 },
      { category: 'connection' as const, difficulty: 0.1 },
      { category: 'dismount' as const, difficulty: 0.1 },
    ]
    expect(artisanScore(els)).toBeCloseTo(0.4 + 0.3)
  })
})

describe('connectionBonus', () => {
  it('C+C returns 0.1', () => {
    expect(connectionBonus(0.3, 0.3, 'C+C')).toBeCloseTo(0.1)
  })
  it('D+C returns 0.2', () => {
    expect(connectionBonus(0.4, 0.3, 'D+C')).toBeCloseTo(0.2)
  })
  it('D+D returns 0.3', () => {
    expect(connectionBonus(0.4, 0.4, 'D+D')).toBeCloseTo(0.3)
  })
  it('E+D returns 0.4', () => {
    expect(connectionBonus(0.5, 0.4, 'E+D')).toBeCloseTo(0.4)
  })
  it('E+E returns 0.5', () => {
    expect(connectionBonus(0.5, 0.5, 'E+E')).toBeCloseTo(0.5)
  })
})

// ---------------------------------------------------------------------------
// 2. Judge scoring
// ---------------------------------------------------------------------------

describe('judgePanel', () => {
  it('drops highest and lowest, returns average of rest', () => {
    // scores: [7, 8, 9] → drop 7 and 9 → [8]
    expect(judgePanel([7, 8, 9])).toBeCloseTo(8)
  })

  it('with 5 judges drops highest+lowest, averages middle 3', () => {
    // [6, 7, 8, 9, 10] → drop 6 and 10 → average(7, 8, 9) = 8
    expect(judgePanel([6, 7, 8, 9, 10])).toBeCloseTo(8)
  })

  it('returns 0 when fewer than 3 judges', () => {
    expect(judgePanel([8, 9])).toBe(0)
  })

  it('does not drop when dropHighLow=false', () => {
    expect(judgePanel([7, 8, 9], false)).toBeCloseTo(8)
  })

  it('handles equal scores', () => {
    expect(judgePanel([8, 8, 8])).toBeCloseTo(8)
  })

  it('with 4 judges drops extreme two and averages middle two', () => {
    // [6, 8, 9, 10] → drop 6 and 10 → average(8, 9) = 8.5
    expect(judgePanel([6, 8, 9, 10])).toBeCloseTo(8.5)
  })
})

describe('judgeConsistency', () => {
  it('returns 1 for perfectly correlated judges', () => {
    const a = [8, 9, 10]
    const b = [8, 9, 10]
    expect(judgeConsistency([a, b])).toBeCloseTo(1)
  })

  it('returns 0 when fewer than 2 judges', () => {
    expect(judgeConsistency([[8, 9, 10]])).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(judgeConsistency([])).toBe(0)
  })

  it('handles negatively correlated judges', () => {
    const a = [1, 2, 3]
    const b = [3, 2, 1]
    expect(judgeConsistency([a, b])).toBeCloseTo(-1)
  })
})

describe('artScoreComponent', () => {
  it('uses default weights [0.4, 0.4, 0.2]', () => {
    // 8*0.4 + 9*0.4 + 10*0.2 = 3.2 + 3.6 + 2.0 = 8.8
    expect(artScoreComponent(8, 9, 10)).toBeCloseTo(8.8)
  })

  it('accepts custom weights', () => {
    expect(artScoreComponent(10, 10, 10, [0.5, 0.3, 0.2])).toBeCloseTo(10)
  })

  it('returns 0 for all-zero inputs', () => {
    expect(artScoreComponent(0, 0, 0)).toBe(0)
  })
})

describe('deductionSummary', () => {
  it('sums deductions by type', () => {
    const deductions = [
      { type: 'fall', amount: 1.0 },
      { type: 'fall', amount: 0.5 },
      { type: 'artistry', amount: 0.1 },
    ]
    const map = deductionSummary(deductions)
    expect(map.get('fall')).toBeCloseTo(1.5)
    expect(map.get('artistry')).toBeCloseTo(0.1)
  })

  it('returns empty map for no deductions', () => {
    expect(deductionSummary([])).toEqual(new Map())
  })

  it('handles single deduction', () => {
    const map = deductionSummary([{ type: 'step_out', amount: 0.1 }])
    expect(map.get('step_out')).toBeCloseTo(0.1)
  })
})

describe('penaltyOverride', () => {
  it('subtracts 1.0 per fall by default', () => {
    expect(penaltyOverride(14.0, 2)).toBeCloseTo(12.0)
  })

  it('clamps to 0 when falls exceed base score', () => {
    expect(penaltyOverride(2.0, 5)).toBe(0)
  })

  it('applies custom fall penalty', () => {
    expect(penaltyOverride(10.0, 3, 0.5)).toBeCloseTo(8.5)
  })

  it('no falls leaves base score unchanged', () => {
    expect(penaltyOverride(13.5, 0)).toBeCloseTo(13.5)
  })

  it('fall penalty accumulation: 3 falls at default 1.0 = -3.0', () => {
    expect(penaltyOverride(15.0, 3)).toBeCloseTo(12.0)
  })
})

// ---------------------------------------------------------------------------
// 3. Event-specific rules
// ---------------------------------------------------------------------------

describe('floorExerciseBonus', () => {
  it('adds correct bonus for each type', () => {
    const els = [
      { type: 'acrobatic_line' as const, count: 1 },
      { type: 'dance_passage' as const, count: 1 },
      { type: 'leap_series' as const, count: 1 },
    ]
    expect(floorExerciseBonus(els)).toBeCloseTo(0.7)
  })

  it('caps each category at 2 bonuses', () => {
    const els = [{ type: 'acrobatic_line' as const, count: 5 }]
    expect(floorExerciseBonus(els)).toBeCloseTo(0.4) // 2 * 0.2
  })

  it('dance_passage is 0.3 each, capped at 2', () => {
    const els = [{ type: 'dance_passage' as const, count: 3 }]
    expect(floorExerciseBonus(els)).toBeCloseTo(0.6) // 2 * 0.3
  })

  it('returns 0 for empty array', () => {
    expect(floorExerciseBonus([])).toBe(0)
  })

  it('correctly sums multiple types', () => {
    const els = [
      { type: 'acrobatic_line' as const, count: 2 },
      { type: 'dance_passage' as const, count: 2 },
    ]
    expect(floorExerciseBonus(els)).toBeCloseTo(1.0) // 0.4 + 0.6
  })
})

describe('vaultDifficultyValue', () => {
  it('Yurchenko = 5.4', () => {
    expect(vaultDifficultyValue('Yurchenko')).toBeCloseTo(5.4)
  })
  it('Yurchenko1.5 = 6.0', () => {
    expect(vaultDifficultyValue('Yurchenko1.5')).toBeCloseTo(6.0)
  })
  it('Yurchenko2.0 = 6.4', () => {
    expect(vaultDifficultyValue('Yurchenko2.0')).toBeCloseTo(6.4)
  })
  it('Tsukahara = 5.2', () => {
    expect(vaultDifficultyValue('Tsukahara')).toBeCloseTo(5.2)
  })
  it('Produnova = 7.0', () => {
    expect(vaultDifficultyValue('Produnova')).toBeCloseTo(7.0)
  })
  it('Amanar = 6.3', () => {
    expect(vaultDifficultyValue('Amanar')).toBeCloseTo(6.3)
  })
  it('Lopez = 6.6', () => {
    expect(vaultDifficultyValue('Lopez')).toBeCloseTo(6.6)
  })
  it('unknown vault code = 5.0', () => {
    expect(vaultDifficultyValue('UnknownVault')).toBeCloseTo(5.0)
  })
})

describe('parallelBarsHoldBonus', () => {
  it('returns 0 when hold meets required duration', () => {
    expect(parallelBarsHoldBonus(2, 2)).toBe(0)
  })

  it('returns negative penalty when hold is short', () => {
    // required=2, hold=1 → -(2-1)*0.1 = -0.1
    expect(parallelBarsHoldBonus(1, 2)).toBeCloseTo(-0.1)
  })

  it('default required=2', () => {
    expect(parallelBarsHoldBonus(1)).toBeCloseTo(-0.1)
  })

  it('hold exceeding required returns 0', () => {
    expect(parallelBarsHoldBonus(5, 2)).toBe(0)
  })

  it('larger deficit = larger penalty', () => {
    // required=3, hold=0 → -(3)*0.1 = -0.3
    expect(parallelBarsHoldBonus(0, 3)).toBeCloseTo(-0.3)
  })
})

describe('unevenBarsTransition', () => {
  it('counts qualifying transitions (>= 0.3), max 2', () => {
    expect(unevenBarsTransition([0.3, 0.4, 0.5])).toBeCloseTo(0.2)
  })

  it('stops counting after 2', () => {
    expect(unevenBarsTransition([0.3, 0.4, 0.5, 0.6])).toBeCloseTo(0.2)
  })

  it('returns 0 when no qualifying transitions', () => {
    expect(unevenBarsTransition([0.1, 0.2, 0.29])).toBe(0)
  })

  it('single qualifying transition = 0.1', () => {
    expect(unevenBarsTransition([0.3])).toBeCloseTo(0.1)
  })

  it('empty array = 0', () => {
    expect(unevenBarsTransition([])).toBe(0)
  })
})

describe('rhythmicGymnasticsArtistry', () => {
  it('returns average of three components', () => {
    expect(rhythmicGymnasticsArtistry(9.0, 8.0, 10.0)).toBeCloseTo(9.0)
  })

  it('all zeros returns 0', () => {
    expect(rhythmicGymnasticsArtistry(0, 0, 0)).toBe(0)
  })

  it('equal components returns same value', () => {
    expect(rhythmicGymnasticsArtistry(8.5, 8.5, 8.5)).toBeCloseTo(8.5)
  })
})

describe('tramplineHeight', () => {
  it('calculates time-of-flight proxy correctly', () => {
    // 2.0 * 0.45 * 10 = 9.0
    expect(tramplineHeight(2.0, 10)).toBeCloseTo(9.0)
  })

  it('returns 0 for zero height', () => {
    expect(tramplineHeight(0, 10)).toBe(0)
  })

  it('returns 0 for zero jumps', () => {
    expect(tramplineHeight(2.0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Competition scoring
// ---------------------------------------------------------------------------

describe('allAroundScore', () => {
  it('sums all event scores', () => {
    const events = [
      { event: 'floor', score: 13.5 },
      { event: 'vault', score: 14.2 },
      { event: 'beam', score: 12.8 },
      { event: 'bars', score: 13.9 },
    ]
    expect(allAroundScore(events)).toBeCloseTo(54.4)
  })

  it('returns 0 for empty events', () => {
    expect(allAroundScore([])).toBe(0)
  })
})

describe('teamScore', () => {
  it('sums all scores with no drops', () => {
    const scores = [[13.0, 14.0], [12.0, 15.0]]
    expect(teamScore(scores)).toBeCloseTo(54.0)
  })

  it('drops bottom n per event when dropsPerEvent specified', () => {
    // Event 1: [13, 14, 15] sorted desc → drop 1 → [15, 14] sum=29
    // Event 2: [10, 11, 12] sorted desc → drop 1 → [12, 11] sum=23
    const scores = [[13, 14, 15], [10, 11, 12]]
    expect(teamScore(scores, 1)).toBeCloseTo(52)
  })

  it('team score with drops=2 for 4 athletes per event', () => {
    // [10, 11, 12, 13] sorted desc [13,12,11,10] drop 2 → [13,12] = 25
    const scores = [[10, 11, 12, 13]]
    expect(teamScore(scores, 2)).toBeCloseTo(25)
  })

  it('returns 0 for empty events', () => {
    expect(teamScore([])).toBe(0)
  })
})

describe('qualificationRanks', () => {
  it('ranks athletes descending by score', () => {
    const athletes = [
      { name: 'Alice', score: 14.0 },
      { name: 'Bob', score: 13.5 },
      { name: 'Carol', score: 15.0 },
    ]
    const result = qualificationRanks(athletes)
    expect(result.find((r) => r.name === 'Carol')?.rank).toBe(1)
    expect(result.find((r) => r.name === 'Alice')?.rank).toBe(2)
    expect(result.find((r) => r.name === 'Bob')?.rank).toBe(3)
  })

  it('ties share the higher rank', () => {
    const athletes = [
      { name: 'Alice', score: 14.0 },
      { name: 'Bob', score: 14.0 },
      { name: 'Carol', score: 13.0 },
    ]
    const result = qualificationRanks(athletes)
    const aliceRank = result.find((r) => r.name === 'Alice')?.rank
    const bobRank = result.find((r) => r.name === 'Bob')?.rank
    expect(aliceRank).toBe(1)
    expect(bobRank).toBe(1)
    expect(result.find((r) => r.name === 'Carol')?.rank).toBe(3)
  })

  it('returns empty array for no athletes', () => {
    expect(qualificationRanks([])).toEqual([])
  })
})

describe('finalSelectionCriteria', () => {
  const scores = [
    { name: 'Alice', allAround: 55.0, eventScores: [14.0, 13.5, 13.0, 14.5] },
    { name: 'Bob', allAround: 53.0, eventScores: [13.0, 14.0, 12.5, 13.5] },
    { name: 'Carol', allAround: 51.0, eventScores: [12.0, 15.0, 13.0, 11.0] },
    { name: 'Dave', allAround: 49.0, eventScores: [14.5, 12.0, 14.0, 8.5] },
  ]

  it('selects top N all-around athletes', () => {
    const result = finalSelectionCriteria(scores, 2)
    expect(result).toContain('Alice')
    expect(result).toContain('Bob')
    expect(result).not.toContain('Carol')
    expect(result.length).toBe(2)
  })

  it('adds event specialists not already selected', () => {
    const result = finalSelectionCriteria(scores, 2, 1)
    expect(result).toContain('Alice')
    expect(result).toContain('Bob')
    // Carol has best vault (15.0), Dave has best vault too — one specialist added
    expect(result.length).toBe(3)
  })
})

describe('countryTeamLimit', () => {
  it('limits to max 2 per country by default', () => {
    const athletes = [
      { country: 'USA', name: 'Alice', score: 15.0 },
      { country: 'USA', name: 'Bob', score: 14.0 },
      { country: 'USA', name: 'Carol', score: 13.0 },
      { country: 'RUS', name: 'Dmitri', score: 12.0 },
    ]
    const result = countryTeamLimit(athletes)
    const usa = result.filter((a) => a.country === 'USA')
    expect(usa.length).toBe(2)
    expect(usa[0]?.name).toBe('Alice')
    expect(usa[1]?.name).toBe('Bob')
  })

  it('respects custom max per country', () => {
    const athletes = [
      { country: 'USA', name: 'Alice', score: 15.0 },
      { country: 'USA', name: 'Bob', score: 14.0 },
      { country: 'USA', name: 'Carol', score: 13.0 },
    ]
    const result = countryTeamLimit(athletes, 3)
    expect(result.length).toBe(3)
  })

  it('returns all athletes when all different countries', () => {
    const athletes = [
      { country: 'USA', name: 'Alice', score: 15.0 },
      { country: 'RUS', name: 'Bob', score: 14.0 },
      { country: 'CHN', name: 'Carol', score: 13.0 },
    ]
    const result = countryTeamLimit(athletes)
    expect(result.length).toBe(3)
  })

  it('selects by score descending within country', () => {
    const athletes = [
      { country: 'USA', name: 'Bob', score: 14.0 },
      { country: 'USA', name: 'Alice', score: 15.0 },
    ]
    const result = countryTeamLimit(athletes, 1)
    expect(result[0]?.name).toBe('Alice')
  })
})

// ---------------------------------------------------------------------------
// 5. Difficulty tracking
// ---------------------------------------------------------------------------

describe('maxPossibleScore', () => {
  it('sums top 8 by default', () => {
    const elements = Array.from({ length: 10 }, (_, i) => ({ value: (i + 1) * 0.1 }))
    // Top 8: 0.3 through 1.0
    expect(maxPossibleScore(elements)).toBeCloseTo(5.2)
  })

  it('respects custom topN', () => {
    const elements = [{ value: 0.5 }, { value: 0.4 }, { value: 0.3 }]
    expect(maxPossibleScore(elements, 2)).toBeCloseTo(0.9)
  })

  it('returns 0 for empty array', () => {
    expect(maxPossibleScore([])).toBe(0)
  })
})

describe('unusedDifficulty', () => {
  it('returns 0 when all planned elements were performed', () => {
    expect(unusedDifficulty([0.3, 0.4, 0.5], [0.3, 0.4, 0.5])).toBe(0)
  })

  it('counts missed elements', () => {
    // planned [0.3, 0.4, 0.5], performed [0.3, 0.5] → missed 0.4
    expect(unusedDifficulty([0.3, 0.4, 0.5], [0.3, 0.5])).toBeCloseTo(0.4)
  })

  it('counts extra planned when performed has fewer', () => {
    // planned [0.3, 0.4], performed [0.3] → unused = 0.4
    expect(unusedDifficulty([0.3, 0.4], [0.3])).toBeCloseTo(0.4)
  })

  it('returns all planned if nothing performed', () => {
    expect(unusedDifficulty([0.5, 0.6], [])).toBeCloseTo(1.1)
  })
})

describe('difficultyGrowth', () => {
  it('returns positive slope for increasing D-scores', () => {
    const result = difficultyGrowth([4.0, 4.5, 5.0, 5.5])
    expect(result).toBeGreaterThan(0)
  })

  it('returns negative slope for decreasing D-scores', () => {
    const result = difficultyGrowth([5.5, 5.0, 4.5, 4.0])
    expect(result).toBeLessThan(0)
  })

  it('returns 0 for < 2 data points', () => {
    expect(difficultyGrowth([])).toBe(0)
    expect(difficultyGrowth([5.0])).toBe(0)
  })

  it('returns 0 for flat scores', () => {
    expect(difficultyGrowth([5.0, 5.0, 5.0])).toBeCloseTo(0)
  })
})

describe('routineComplexity', () => {
  it('sums values and adds 0.1 per connection element', () => {
    const elements = [
      { value: 0.3, connection: true },
      { value: 0.4, connection: false },
      { value: 0.5, connection: true },
    ]
    // 0.3 + 0.1 + 0.4 + 0.5 + 0.1 = 1.4
    expect(routineComplexity(elements)).toBeCloseTo(1.4)
  })

  it('returns 0 for empty array', () => {
    expect(routineComplexity([])).toBe(0)
  })

  it('no connections = just sum of values', () => {
    const elements = [{ value: 0.5, connection: false }, { value: 0.6, connection: false }]
    expect(routineComplexity(elements)).toBeCloseTo(1.1)
  })
})

// ---------------------------------------------------------------------------
// 6. Training and development
// ---------------------------------------------------------------------------

describe('consistencyIndex', () => {
  it('returns 1 for perfectly consistent scores', () => {
    expect(consistencyIndex([14.0, 14.0, 14.0])).toBeCloseTo(1)
  })

  it('returns 0 for empty array', () => {
    expect(consistencyIndex([])).toBe(0)
  })

  it('returns 0 when mean = 0', () => {
    expect(consistencyIndex([0, 0, 0])).toBe(0)
  })

  it('returns value between 0 and 1 for realistic scores', () => {
    const ci = consistencyIndex([13.0, 14.0, 13.5, 14.5])
    expect(ci).toBeGreaterThan(0)
    expect(ci).toBeLessThanOrEqual(1)
  })
})

describe('peakFormScore', () => {
  it('returns the highest score', () => {
    expect(peakFormScore([13.0, 15.0, 14.5])).toBeCloseTo(15.0)
  })

  it('returns 0 for empty array', () => {
    expect(peakFormScore([])).toBe(0)
  })

  it('works with single score', () => {
    expect(peakFormScore([13.5])).toBeCloseTo(13.5)
  })
})

describe('formTrend', () => {
  it('returns stable for <= 1 data point', () => {
    expect(formTrend([])).toBe('stable')
    expect(formTrend([14.0])).toBe('stable')
  })

  it('returns rising for strongly increasing scores', () => {
    expect(formTrend([10.0, 11.5, 13.0, 14.5])).toBe('rising')
  })

  it('returns falling for strongly decreasing scores', () => {
    expect(formTrend([14.5, 13.0, 11.5, 10.0])).toBe('falling')
  })

  it('returns stable for nearly flat scores', () => {
    expect(formTrend([14.0, 14.1, 14.05, 13.95])).toBe('stable')
  })
})

describe('predictionInterval', () => {
  it('returns {low:0, high:0} for empty array', () => {
    expect(predictionInterval([])).toEqual({ low: 0, high: 0 })
  })

  it('mean ± 1.96*std/sqrt(n) at default 0.95', () => {
    const scores = [14.0, 14.0, 14.0, 14.0]
    // std=0, so interval = {low:14, high:14}
    const result = predictionInterval(scores)
    expect(result.low).toBeCloseTo(14.0)
    expect(result.high).toBeCloseTo(14.0)
  })

  it('prediction interval formula: wider with more variance', () => {
    const narrow = predictionInterval([14.0, 14.0, 14.0])
    const wide = predictionInterval([10.0, 14.0, 18.0])
    expect(wide.high - wide.low).toBeGreaterThan(narrow.high - narrow.low)
  })

  it('low < mean and high > mean for non-zero variance', () => {
    const scores = [13.0, 14.0, 15.0]
    const result = predictionInterval(scores)
    const mean = 14.0
    expect(result.low).toBeLessThan(mean)
    expect(result.high).toBeGreaterThan(mean)
  })
})

describe('optimalCompetitionSchedule', () => {
  it('selects top peak indices, returns corresponding slot indices', () => {
    const peaks = [8.0, 9.5, 7.0, 10.0]
    const slots = [1, 2, 3, 4]
    const result = optimalCompetitionSchedule(peaks, slots)
    // Top 2: index 3 (10.0) and index 1 (9.5); slots: [4, 2]
    expect(result).toContain(4) // slot for peak index 3
    expect(result).toContain(2) // slot for peak index 1
    expect(result.length).toBe(slots.length)
  })

  it('returns empty for empty slots', () => {
    expect(optimalCompetitionSchedule([9.0, 10.0], [])).toEqual([])
  })

  it('returns empty for empty peaks', () => {
    expect(optimalCompetitionSchedule([], [1, 2])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy
// ---------------------------------------------------------------------------

describe('dkGymnasticsPoints', () => {
  it('1st place = 50 points', () => {
    const result = dkGymnasticsPoints({ place: 1, apparatus: 'floor', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(50)
  })

  it('2nd place = 40 points', () => {
    const result = dkGymnasticsPoints({ place: 2, apparatus: 'vault', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(40)
  })

  it('3rd place = 30 points', () => {
    const result = dkGymnasticsPoints({ place: 3, apparatus: 'beam', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(30)
  })

  it('4th place = 20 points', () => {
    const result = dkGymnasticsPoints({ place: 4, apparatus: 'bars', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(20)
  })

  it('5th place = 15 points', () => {
    const result = dkGymnasticsPoints({ place: 5, apparatus: 'floor', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(15)
  })

  it('6th place = 10 points', () => {
    const result = dkGymnasticsPoints({ place: 6, apparatus: 'floor', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(10)
  })

  it('7th place (else) = 3 points', () => {
    const result = dkGymnasticsPoints({ place: 7, apparatus: 'floor', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(3)
  })

  it('all_around apparatus adds +10 bonus', () => {
    const base = dkGymnasticsPoints({ place: 1, apparatus: 'floor', totalScore: 13.0, falls: 0 })
    const allAround = dkGymnasticsPoints({ place: 1, apparatus: 'all_around', totalScore: 13.0, falls: 0 })
    expect(allAround - base).toBeCloseTo(10)
  })

  it('+0.5 per score point above 13.0', () => {
    const result = dkGymnasticsPoints({ place: 1, apparatus: 'floor', totalScore: 15.0, falls: 0 })
    // 50 + (15.0 - 13.0) * 0.5 = 50 + 1.0 = 51.0
    expect(result).toBeCloseTo(51.0)
  })

  it('-5 per fall', () => {
    const result = dkGymnasticsPoints({ place: 1, apparatus: 'floor', totalScore: 13.0, falls: 2 })
    expect(result).toBeCloseTo(40) // 50 - 10
  })

  it('all-around with score bonus and falls combined', () => {
    const result = dkGymnasticsPoints({ place: 1, apparatus: 'all_around', totalScore: 55.0, falls: 1 })
    // 50 + 10 (all_around) + (55 - 13) * 0.5 (score bonus) - 5 (fall) = 50+10+21-5=76
    expect(result).toBeCloseTo(76)
  })

  it('score at exactly 13.0 gives no score bonus', () => {
    const result = dkGymnasticsPoints({ place: 2, apparatus: 'vault', totalScore: 13.0, falls: 0 })
    expect(result).toBeCloseTo(40)
  })

  it('score below 13.0 gives no score bonus', () => {
    const result = dkGymnasticsPoints({ place: 2, apparatus: 'vault', totalScore: 12.0, falls: 0 })
    expect(result).toBeCloseTo(40)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty results', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('weights most recent result 3x', () => {
    // Two results: [place=1,score=13,falls=0] → 50pts, [place=6,score=13,falls=0] → 10pts
    // most recent = 10 (3x weight), rest = [50] (1x weight)
    // weighted = (10*3 + 50) / (3+1) = (30+50)/4 = 20
    const results = [
      { place: 1 as const, apparatus: 'floor' as const, totalScore: 13.0, falls: 0 },
      { place: 6 as const, apparatus: 'floor' as const, totalScore: 13.0, falls: 0 },
    ]
    expect(dkProjection(results)).toBeCloseTo(20)
  })

  it('with single result uses it as most recent (3x / 3 = same value)', () => {
    const results = [{ place: 1 as const, apparatus: 'floor' as const, totalScore: 13.0, falls: 0 }]
    expect(dkProjection(results)).toBeCloseTo(50)
  })

  it('all_around bonus included in projection', () => {
    const results = [
      { place: 1 as const, apparatus: 'all_around' as const, totalScore: 13.0, falls: 0 },
    ]
    // 50 + 10 = 60
    expect(dkProjection(results)).toBeCloseTo(60)
  })
})
