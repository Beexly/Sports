import { describe, it, expect } from 'vitest'
import {
  // 1. Freestyle / Greco-Roman scoring
  technicalSuperiority,
  periodWinner,
  matchWinner,
  activityTime,
  technicalPoints,
  // 2. Collegiate wrestling (NCAA)
  ncaaPoints,
  rideTime,
  majorDecision,
  technicalFall,
  decisionscore,
  dualMeetTeamPoints,
  // 3. Performance analytics
  takedownRate,
  escapeRate,
  nearfallRate,
  aggressivenessScore,
  dominanceScore,
  pinTime,
  // 4. Weight class management
  weightClassFreestyle,
  weightClassCollegiate,
  weightCutSafety,
  optimalWeightClass,
  // 5. Seeding and brackets
  seedToSlot,
  chanceOfMedal,
  headToHeadRecord,
  styleMatchup,
  // 6. MMA crossover
  wrestlingToMMAScore,
  takedownDefense,
  clinchControl,
  // 7. DraftKings fantasy
  dkWrestlingPoints,
  dkProjection,
  type DKWrestlingResult,
} from '@/lib/sports/wrestling-analytics'

// ---------------------------------------------------------------------------
// 1. Freestyle / Greco-Roman scoring — technicalSuperiority
// ---------------------------------------------------------------------------

describe('technicalSuperiority', () => {
  it('returns false when lead is exactly 9', () => {
    expect(technicalSuperiority(9, 0)).toBe(false)
  })

  it('returns true when lead is exactly 10 (boundary)', () => {
    expect(technicalSuperiority(10, 0)).toBe(true)
  })

  it('returns true when lead is greater than 10', () => {
    expect(technicalSuperiority(15, 3)).toBe(true)
  })

  it('works when wrestler2 leads by 10', () => {
    expect(technicalSuperiority(0, 10)).toBe(true)
  })

  it('returns false when scores are equal', () => {
    expect(technicalSuperiority(5, 5)).toBe(false)
  })

  it('returns false with lead of 9 from positive offset', () => {
    expect(technicalSuperiority(14, 5)).toBe(false)
  })

  it('returns true with lead of 10 from positive offset', () => {
    expect(technicalSuperiority(15, 5)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 1. Freestyle / Greco-Roman scoring — periodWinner
// ---------------------------------------------------------------------------

describe('periodWinner', () => {
  it('returns 1 when wrestler1 has more points', () => {
    expect(periodWinner(5, 3)).toBe(1)
  })

  it('returns 2 when wrestler2 has more points', () => {
    expect(periodWinner(2, 6)).toBe(2)
  })

  it('returns tie when points are equal', () => {
    expect(periodWinner(4, 4)).toBe('tie')
  })

  it('returns tie when both are zero', () => {
    expect(periodWinner(0, 0)).toBe('tie')
  })

  it('uses escapes in total for wrestler1', () => {
    // 3+2=5 vs 4 → wrestler1 wins
    expect(periodWinner(3, 4, 2, 0)).toBe(1)
  })

  it('uses escapes in total for wrestler2', () => {
    // 3 vs 2+2=4 → wrestler2 wins
    expect(periodWinner(3, 2, 0, 2)).toBe(2)
  })

  it('escape tie-breaks a tie', () => {
    // 3+1=4 vs 3 → wrestler1 wins
    expect(periodWinner(3, 3, 1, 0)).toBe(1)
  })

  it('defaults escapes to 0', () => {
    expect(periodWinner(2, 2)).toBe('tie')
  })
})

// ---------------------------------------------------------------------------
// 1. Freestyle / Greco-Roman scoring — matchWinner
// ---------------------------------------------------------------------------

describe('matchWinner', () => {
  it('wrestler1 wins 2-0', () => {
    expect(matchWinner(1, 1)).toBe(1)
  })

  it('wrestler2 wins 2-0', () => {
    expect(matchWinner(2, 2)).toBe(2)
  })

  it('wrestler1 wins 2-1 with period3', () => {
    expect(matchWinner(1, 2, 1)).toBe(1)
  })

  it('wrestler2 wins 2-1 with period3', () => {
    expect(matchWinner(2, 1, 2)).toBe(2)
  })

  it('draw when all three are ties', () => {
    expect(matchWinner('tie', 'tie', 'tie')).toBe('draw')
  })

  it('wrestler1 wins 1-0 with two periods (no period3)', () => {
    // 1 win, 1 tie → wrestler1 has more wins
    expect(matchWinner(1, 'tie')).toBe(1)
  })

  it('wrestler2 wins 1-0 with a tie in period1', () => {
    expect(matchWinner('tie', 2)).toBe(2)
  })

  it('draw with period3 tie and split 1-1', () => {
    expect(matchWinner(1, 2, 'tie')).toBe('draw')
  })

  it('draw when 2 ties and no period3', () => {
    expect(matchWinner('tie', 'tie')).toBe('draw')
  })
})

// ---------------------------------------------------------------------------
// 1. Freestyle / Greco-Roman scoring — activityTime
// ---------------------------------------------------------------------------

describe('activityTime', () => {
  it('returns correct percentages', () => {
    const result = activityTime(90, 60, 180)
    expect(result.wrestler1Pct).toBeCloseTo(0.5)
    expect(result.wrestler2Pct).toBeCloseTo(0.333, 2)
  })

  it('defaults period to 180s', () => {
    const result = activityTime(180, 180)
    expect(result.wrestler1Pct).toBeCloseTo(1)
    expect(result.wrestler2Pct).toBeCloseTo(1)
  })

  it('returns 0 when periodSeconds is 0', () => {
    const result = activityTime(60, 60, 0)
    expect(result.wrestler1Pct).toBe(0)
    expect(result.wrestler2Pct).toBe(0)
  })

  it('handles zero action for both', () => {
    const result = activityTime(0, 0, 180)
    expect(result.wrestler1Pct).toBe(0)
    expect(result.wrestler2Pct).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 1. Freestyle / Greco-Roman scoring — technicalPoints
// ---------------------------------------------------------------------------

describe('technicalPoints', () => {
  it('takedown = 2', () => {
    expect(technicalPoints('takedown')).toBe(2)
  })

  it('reversal = 2', () => {
    expect(technicalPoints('reversal')).toBe(2)
  })

  it('nearfall_2 = 2', () => {
    expect(technicalPoints('nearfall_2')).toBe(2)
  })

  it('nearfall_3 = 3', () => {
    expect(technicalPoints('nearfall_3')).toBe(3)
  })

  it('nearfall_4 = 4', () => {
    expect(technicalPoints('nearfall_4')).toBe(4)
  })

  it('escape = 1', () => {
    expect(technicalPoints('escape')).toBe(1)
  })

  it('penalty = 1', () => {
    expect(technicalPoints('penalty')).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Collegiate wrestling — ncaaPoints
// ---------------------------------------------------------------------------

describe('ncaaPoints', () => {
  it('takedown = 2', () => {
    expect(ncaaPoints('takedown')).toBe(2)
  })

  it('escape = 1', () => {
    expect(ncaaPoints('escape')).toBe(1)
  })

  it('reversal = 2', () => {
    expect(ncaaPoints('reversal')).toBe(2)
  })

  it('nearfall_2 = 2', () => {
    expect(ncaaPoints('nearfall_2')).toBe(2)
  })

  it('nearfall_3 = 3', () => {
    expect(ncaaPoints('nearfall_3')).toBe(3)
  })

  it('penalty = 1', () => {
    expect(ncaaPoints('penalty')).toBe(1)
  })

  it('stall = 1', () => {
    expect(ncaaPoints('stall')).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Collegiate wrestling — rideTime
// ---------------------------------------------------------------------------

describe('rideTime', () => {
  it('returns positive when wrestler1 has more ride time', () => {
    expect(rideTime(120, 60)).toBe(60)
  })

  it('returns negative when wrestler2 has more ride time', () => {
    expect(rideTime(30, 90)).toBe(-60)
  })

  it('returns 0 when equal', () => {
    expect(rideTime(60, 60)).toBe(0)
  })

  it('returns 0 when both are 0', () => {
    expect(rideTime(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Collegiate wrestling — majorDecision
// ---------------------------------------------------------------------------

describe('majorDecision', () => {
  it('returns false for diff less than 8', () => {
    expect(majorDecision(10, 3)).toBe(false) // diff=7
  })

  it('returns true at exactly 8 point differential', () => {
    expect(majorDecision(10, 2)).toBe(true) // diff=8
  })

  it('returns true at 14 point differential', () => {
    expect(majorDecision(14, 0)).toBe(true) // diff=14
  })

  it('returns false at exactly 15 point differential', () => {
    expect(majorDecision(15, 0)).toBe(false) // diff=15 → technical fall
  })

  it('returns true for typical major decision', () => {
    expect(majorDecision(12, 3)).toBe(true) // diff=9
  })
})

// ---------------------------------------------------------------------------
// 2. Collegiate wrestling — technicalFall
// ---------------------------------------------------------------------------

describe('technicalFall', () => {
  it('returns false at 14 point differential', () => {
    expect(technicalFall(14, 0)).toBe(false)
  })

  it('returns true at exactly 15 point differential', () => {
    expect(technicalFall(15, 0)).toBe(true)
  })

  it('returns true at 20 point differential', () => {
    expect(technicalFall(20, 5)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. Collegiate wrestling — decisionscore
// ---------------------------------------------------------------------------

describe('decisionscore', () => {
  it('detects fall by pin flag (winner = loser + 999)', () => {
    expect(decisionscore(999, 0)).toBe('fall')
    expect(decisionscore(1002, 3)).toBe('fall')
  })

  it('detects technical fall at ≥15 point lead', () => {
    expect(decisionscore(15, 0)).toBe('technical_fall')
    expect(decisionscore(20, 5)).toBe('technical_fall')
  })

  it('detects major decision at 8–14 point differential', () => {
    expect(decisionscore(10, 2)).toBe('major_decision') // diff=8
    expect(decisionscore(14, 0)).toBe('major_decision') // diff=14
  })

  it('detects overtime decision: loser>5 and diff==1', () => {
    expect(decisionscore(8, 7)).toBe('overtime_decision')
    expect(decisionscore(10, 9)).toBe('overtime_decision')
  })

  it('returns decision for standard wins', () => {
    expect(decisionscore(7, 3)).toBe('decision') // diff=4, loser=3 ≤5
    expect(decisionscore(5, 2)).toBe('decision')
  })

  it('loser=5 with diff=1 is NOT overtime (loser must be >5)', () => {
    expect(decisionscore(6, 5)).toBe('decision') // loser=5, not >5
  })
})

// ---------------------------------------------------------------------------
// 2. Collegiate wrestling — dualMeetTeamPoints
// ---------------------------------------------------------------------------

describe('dualMeetTeamPoints', () => {
  it('fall = 6', () => {
    expect(dualMeetTeamPoints('fall')).toBe(6)
  })

  it('technical_fall = 5', () => {
    expect(dualMeetTeamPoints('technical_fall')).toBe(5)
  })

  it('major_decision = 4', () => {
    expect(dualMeetTeamPoints('major_decision')).toBe(4)
  })

  it('decision = 3', () => {
    expect(dualMeetTeamPoints('decision')).toBe(3)
  })

  it('overtime_decision = 3', () => {
    expect(dualMeetTeamPoints('overtime_decision')).toBe(3)
  })

  it('forfeit = 6', () => {
    expect(dualMeetTeamPoints('forfeit')).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// 3. Performance analytics — takedownRate
// ---------------------------------------------------------------------------

describe('takedownRate', () => {
  it('returns ratio when attempts > 0', () => {
    expect(takedownRate(4, 10)).toBeCloseTo(0.4)
  })

  it('returns 0 when attempts = 0', () => {
    expect(takedownRate(0, 0)).toBe(0)
  })

  it('returns 1.0 for perfect completion', () => {
    expect(takedownRate(5, 5)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Performance analytics — escapeRate
// ---------------------------------------------------------------------------

describe('escapeRate', () => {
  it('returns ratio when opportunities > 0', () => {
    expect(escapeRate(3, 6)).toBeCloseTo(0.5)
  })

  it('returns 0 when opportunities = 0', () => {
    expect(escapeRate(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Performance analytics — nearfallRate
// ---------------------------------------------------------------------------

describe('nearfallRate', () => {
  it('returns ratio when backExposures > 0', () => {
    expect(nearfallRate(2, 5)).toBeCloseTo(0.4)
  })

  it('returns 0 when backExposures = 0', () => {
    expect(nearfallRate(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Performance analytics — aggressivenessScore
// ---------------------------------------------------------------------------

describe('aggressivenessScore', () => {
  it('computes (attacks + counters * 0.7) / periodSeconds', () => {
    // (10 + 5 * 0.7) / 180 = (10 + 3.5) / 180 = 13.5 / 180
    expect(aggressivenessScore(10, 5, 180)).toBeCloseTo(13.5 / 180)
  })

  it('returns 0 when periodSeconds = 0', () => {
    expect(aggressivenessScore(10, 5, 0)).toBe(0)
  })

  it('returns 0 when no attacks or counters', () => {
    expect(aggressivenessScore(0, 0, 180)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Performance analytics — dominanceScore
// ---------------------------------------------------------------------------

describe('dominanceScore', () => {
  it('computes score correctly', () => {
    // (10 - 2 + 1 * 10 + 0 * 5) / (10 + 2) = 18/12 = 1.5
    expect(dominanceScore(10, 2, 1, 0)).toBeCloseTo(1.5)
  })

  it('returns 0 when total actions = 0', () => {
    expect(dominanceScore(0, 0, 0, 0)).toBe(0)
  })

  it('factors in technical falls', () => {
    // (10 - 5 + 0 * 10 + 2 * 5) / (10 + 5) = (5 + 10) / 15 = 1
    expect(dominanceScore(10, 5, 0, 2)).toBeCloseTo(1)
  })

  it('can return negative when allowed > scored', () => {
    // (2 - 10 + 0 + 0) / 12 = -8/12
    expect(dominanceScore(2, 10, 0, 0)).toBeCloseTo(-8 / 12)
  })
})

// ---------------------------------------------------------------------------
// 3. Performance analytics — pinTime
// ---------------------------------------------------------------------------

describe('pinTime', () => {
  it('formats 0 seconds as "0:00"', () => {
    expect(pinTime(0)).toBe('0:00')
  })

  it('formats 60 seconds as "1:00"', () => {
    expect(pinTime(60)).toBe('1:00')
  })

  it('formats 154 seconds as "2:34"', () => {
    expect(pinTime(154)).toBe('2:34')
  })

  it('formats 9 seconds as "0:09"', () => {
    expect(pinTime(9)).toBe('0:09')
  })

  it('formats 119 seconds as "1:59"', () => {
    expect(pinTime(119)).toBe('1:59')
  })

  it('formats 180 seconds as "3:00"', () => {
    expect(pinTime(180)).toBe('3:00')
  })

  it('formats 1 second as "0:01"', () => {
    expect(pinTime(1)).toBe('0:01')
  })
})

// ---------------------------------------------------------------------------
// 4. Weight class management — weightClassFreestyle
// ---------------------------------------------------------------------------

describe('weightClassFreestyle', () => {
  describe("men's freestyle", () => {
    it('returns "57kg" for exactly 57kg', () => {
      expect(weightClassFreestyle(57)).toBe('57kg')
    })

    it('returns "65kg" for exactly 65kg', () => {
      expect(weightClassFreestyle(65)).toBe('65kg')
    })

    it('returns "65kg" for 58kg (between 57 and 65)', () => {
      expect(weightClassFreestyle(58)).toBe('65kg')
    })

    it('returns "74kg" for 66kg (just above 65)', () => {
      expect(weightClassFreestyle(66)).toBe('74kg')
    })

    it('returns "125kg" for super heavyweight above 97', () => {
      expect(weightClassFreestyle(100)).toBe('125kg')
    })

    it('returns heaviest class for weight above all classes', () => {
      expect(weightClassFreestyle(200)).toBe('125kg')
    })

    it('returns "57kg" for 50kg (below lightest class)', () => {
      expect(weightClassFreestyle(50)).toBe('57kg')
    })
  })

  describe("women's freestyle", () => {
    it('returns "50kg" for exactly 50kg', () => {
      expect(weightClassFreestyle(50, 'women')).toBe('50kg')
    })

    it('returns "53kg" for 51kg', () => {
      expect(weightClassFreestyle(51, 'women')).toBe('53kg')
    })

    it('returns "76kg" for above all classes', () => {
      expect(weightClassFreestyle(80, 'women')).toBe('76kg')
    })

    it('returns "57kg" for exactly 57kg (women)', () => {
      expect(weightClassFreestyle(57, 'women')).toBe('57kg')
    })
  })
})

// ---------------------------------------------------------------------------
// 4. Weight class management — weightClassCollegiate
// ---------------------------------------------------------------------------

describe('weightClassCollegiate', () => {
  it('returns "125 lbs" for exactly 125 lbs', () => {
    expect(weightClassCollegiate(125)).toBe('125 lbs')
  })

  it('returns "133 lbs" for 126 lbs', () => {
    expect(weightClassCollegiate(126)).toBe('133 lbs')
  })

  it('returns "285 lbs" for heavyweight at exactly 285', () => {
    expect(weightClassCollegiate(285)).toBe('285 lbs')
  })

  it('returns "285 lbs" for above 285', () => {
    expect(weightClassCollegiate(300)).toBe('285 lbs')
  })

  it('returns "141 lbs" for 140 lbs', () => {
    expect(weightClassCollegiate(140)).toBe('141 lbs')
  })

  it('returns "157 lbs" for exactly 157 lbs', () => {
    expect(weightClassCollegiate(157)).toBe('157 lbs')
  })
})

// ---------------------------------------------------------------------------
// 4. Weight class management — weightCutSafety
// ---------------------------------------------------------------------------

describe('weightCutSafety', () => {
  it('returns "safe" for rate < 0.3 kg/day', () => {
    // 2kg cut over 10 days = 0.2 kg/day
    expect(weightCutSafety(70, 68, 10)).toBe('safe')
  })

  it('returns "moderate" for rate 0.3–0.49 kg/day', () => {
    // 4kg over 10 days = 0.4 kg/day
    expect(weightCutSafety(70, 66, 10)).toBe('moderate')
  })

  it('returns "risky" for rate 0.5–0.8 kg/day', () => {
    // 6kg over 10 days = 0.6 kg/day
    expect(weightCutSafety(70, 64, 10)).toBe('risky')
  })

  it('returns "dangerous" for rate > 0.8 kg/day', () => {
    // 9kg over 10 days = 0.9 kg/day
    expect(weightCutSafety(70, 61, 10)).toBe('dangerous')
  })

  it('returns "dangerous" for daysOut = 0', () => {
    expect(weightCutSafety(70, 65, 0)).toBe('dangerous')
  })

  it('returns "safe" when no weight cut needed', () => {
    expect(weightCutSafety(65, 65, 10)).toBe('safe')
  })
})

// ---------------------------------------------------------------------------
// 4. Weight class management — optimalWeightClass
// ---------------------------------------------------------------------------

describe('optimalWeightClass', () => {
  it('returns correct men freestyle class', () => {
    expect(optimalWeightClass(63, 'men', 'freestyle')).toBe('65kg')
  })

  it('returns correct women freestyle class', () => {
    expect(optimalWeightClass(55, 'women', 'freestyle')).toBe('57kg')
  })

  it('returns collegiate class (converts kg to lbs)', () => {
    // 70kg ≈ 154.3 lbs → 157 lbs class
    const result = optimalWeightClass(70, 'men', 'collegiate')
    expect(result).toBe('157 lbs')
  })

  it('returns heaviest class for very heavy athlete (freestyle)', () => {
    expect(optimalWeightClass(130, 'men', 'freestyle')).toBe('125kg')
  })
})

// ---------------------------------------------------------------------------
// 5. Seeding and brackets — seedToSlot
// ---------------------------------------------------------------------------

describe('seedToSlot', () => {
  it('seed 1 maps to slot 0', () => {
    expect(seedToSlot(1, 8)).toBe(0)
  })

  it('seed 2 maps to slot N-1', () => {
    expect(seedToSlot(2, 8)).toBe(7)
  })

  it('seed 1 in 16-bracket maps to slot 0', () => {
    expect(seedToSlot(1, 16)).toBe(0)
  })

  it('seed 2 in 16-bracket maps to slot 15', () => {
    expect(seedToSlot(2, 16)).toBe(15)
  })
})

// ---------------------------------------------------------------------------
// 5. Seeding and brackets — chanceOfMedal
// ---------------------------------------------------------------------------

describe('chanceOfMedal', () => {
  it('returns high probability for top seed', () => {
    const p = chanceOfMedal(1, 16)
    expect(p).toBeGreaterThan(0.5)
  })

  it('returns 0 for totalSeeds = 0', () => {
    expect(chanceOfMedal(1, 0)).toBe(0)
  })

  it('returns 0 or near 0 for last seed in large field', () => {
    const p = chanceOfMedal(16, 16)
    expect(p).toBeLessThanOrEqual(0.01)
  })

  it('is between 0 and 1', () => {
    expect(chanceOfMedal(4, 16)).toBeGreaterThanOrEqual(0)
    expect(chanceOfMedal(4, 16)).toBeLessThanOrEqual(1)
  })

  it('decreases as seed increases', () => {
    const p1 = chanceOfMedal(1, 16)
    const p4 = chanceOfMedal(4, 16)
    const p8 = chanceOfMedal(8, 16)
    expect(p1).toBeGreaterThan(p4)
    expect(p4).toBeGreaterThan(p8)
  })
})

// ---------------------------------------------------------------------------
// 5. Seeding and brackets — headToHeadRecord
// ---------------------------------------------------------------------------

describe('headToHeadRecord', () => {
  it('counts wins correctly', () => {
    const result = headToHeadRecord([
      { winner: 1 },
      { winner: 1 },
      { winner: 2 },
    ])
    expect(result.wins1).toBe(2)
    expect(result.wins2).toBe(1)
    expect(result.wPct1).toBeCloseTo(2 / 3)
  })

  it('returns 0 wPct1 for empty matches array', () => {
    const result = headToHeadRecord([])
    expect(result.wins1).toBe(0)
    expect(result.wins2).toBe(0)
    expect(result.wPct1).toBe(0)
  })

  it('returns 1.0 wPct1 when wrestler1 wins all', () => {
    const result = headToHeadRecord([
      { winner: 1 },
      { winner: 1 },
    ])
    expect(result.wPct1).toBe(1)
  })

  it('returns 0 wPct1 when wrestler2 wins all', () => {
    const result = headToHeadRecord([
      { winner: 2 },
      { winner: 2 },
    ])
    expect(result.wPct1).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Seeding and brackets — styleMatchup
// ---------------------------------------------------------------------------

describe('styleMatchup', () => {
  it('offensive vs defensive = +0.2', () => {
    expect(styleMatchup('offensive', 'defensive')).toBeCloseTo(0.2)
  })

  it('defensive vs offensive = 0.1', () => {
    expect(styleMatchup('defensive', 'offensive')).toBeCloseTo(0.1)
  })

  it('balanced vs any = 0', () => {
    expect(styleMatchup('balanced', 'offensive')).toBe(0)
    expect(styleMatchup('balanced', 'defensive')).toBe(0)
    expect(styleMatchup('balanced', 'balanced')).toBe(0)
  })

  it('any vs balanced = 0', () => {
    expect(styleMatchup('offensive', 'balanced')).toBe(0)
    expect(styleMatchup('defensive', 'balanced')).toBe(0)
  })

  it('same style = 0', () => {
    expect(styleMatchup('offensive', 'offensive')).toBe(0)
    expect(styleMatchup('defensive', 'defensive')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. MMA crossover — wrestlingToMMAScore
// ---------------------------------------------------------------------------

describe('wrestlingToMMAScore', () => {
  it('computes weighted sum', () => {
    // 0.5*40 + 0.3*30 + 0.4*30 = 20 + 9 + 12 = 41
    expect(wrestlingToMMAScore(0.5, 0.3, 0.4)).toBeCloseTo(41)
  })

  it('returns 0 for all zeros', () => {
    expect(wrestlingToMMAScore(0, 0, 0)).toBe(0)
  })

  it('returns 100 for perfect rates', () => {
    // 1*40 + 1*30 + 1*30 = 100
    expect(wrestlingToMMAScore(1, 1, 1)).toBeCloseTo(100)
  })
})

// ---------------------------------------------------------------------------
// 6. MMA crossover — takedownDefense
// ---------------------------------------------------------------------------

describe('takedownDefense', () => {
  it('returns ratio when attempted > 0', () => {
    expect(takedownDefense(7, 10)).toBeCloseTo(0.7)
  })

  it('returns 0 when attempted = 0', () => {
    expect(takedownDefense(0, 0)).toBe(0)
  })

  it('returns 1.0 for perfect defense', () => {
    expect(takedownDefense(5, 5)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 6. MMA crossover — clinchControl
// ---------------------------------------------------------------------------

describe('clinchControl', () => {
  it('computes clinch effectiveness', () => {
    // (4 / Math.max(8, 1)) * 50 + 2 * 10 = 25 + 20 = 45
    expect(clinchControl(4, 8, 2)).toBeCloseTo(45)
  })

  it('uses Math.max(totalClinches, 1) to avoid division by zero', () => {
    expect(clinchControl(0, 0, 0)).toBeCloseTo(0)
  })

  it('full clinch control with no sweeps', () => {
    // (5 / 5) * 50 + 0 = 50
    expect(clinchControl(5, 5, 0)).toBeCloseTo(50)
  })

  it('sweeps add 10 each', () => {
    // (0/1)*50 + 3*10 = 30
    expect(clinchControl(0, 0, 3)).toBeCloseTo(30)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy — dkWrestlingPoints
// ---------------------------------------------------------------------------

function makeResult(
  outcome: DKWrestlingResult['outcome'],
  overrides: Partial<DKWrestlingResult> = {}
): DKWrestlingResult {
  return {
    outcome,
    pointsScored: 0,
    nearfalls: 0,
    takedowns: 0,
    ...overrides,
  }
}

describe('dkWrestlingPoints', () => {
  it('fall = 100 base', () => {
    expect(dkWrestlingPoints(makeResult('fall'))).toBe(100)
  })

  it('technical_fall = 85 base', () => {
    expect(dkWrestlingPoints(makeResult('technical_fall'))).toBe(85)
  })

  it('major_decision = 70 base', () => {
    expect(dkWrestlingPoints(makeResult('major_decision'))).toBe(70)
  })

  it('decision = 50 base', () => {
    expect(dkWrestlingPoints(makeResult('decision'))).toBe(50)
  })

  it('overtime_decision = 50 base', () => {
    expect(dkWrestlingPoints(makeResult('overtime_decision'))).toBe(50)
  })

  it('loss = 0 base', () => {
    expect(dkWrestlingPoints(makeResult('loss'))).toBe(0)
  })

  it('+2 per takedown', () => {
    expect(dkWrestlingPoints(makeResult('decision', { takedowns: 3 }))).toBe(50 + 6)
  })

  it('+3 per nearfall', () => {
    expect(dkWrestlingPoints(makeResult('decision', { nearfalls: 2 }))).toBe(50 + 6)
  })

  it('+0.25 per point scored', () => {
    expect(dkWrestlingPoints(makeResult('decision', { pointsScored: 8 }))).toBe(50 + 2)
  })

  it('combines all bonuses correctly', () => {
    // fall(100) + 2*2(td) + 1*3(nearfall) + 10*0.25(pts)
    const result = makeResult('fall', { takedowns: 2, nearfalls: 1, pointsScored: 10 })
    expect(dkWrestlingPoints(result)).toBeCloseTo(100 + 4 + 3 + 2.5)
  })

  it('loss with bonuses still adds bonuses from 0 base', () => {
    const result = makeResult('loss', { takedowns: 2, nearfalls: 1, pointsScored: 4 })
    // 0 + 4 + 3 + 1 = 8
    expect(dkWrestlingPoints(result)).toBeCloseTo(8)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy — dkProjection
// ---------------------------------------------------------------------------

describe('dkProjection', () => {
  it('returns 0 for empty array', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('returns the single result score for one entry', () => {
    const results = [makeResult('decision')]
    expect(dkProjection(results)).toBeCloseTo(50)
  })

  it('weights most recent 3x', () => {
    // Two results: first=decision(50), second(most recent)=fall(100)
    // reversed: [fall, decision]
    // weighted: (100*3 + 50*1) / (3+1) = 350/4 = 87.5
    const results = [makeResult('decision'), makeResult('fall')]
    expect(dkProjection(results)).toBeCloseTo(87.5)
  })

  it('handles three results', () => {
    // [loss, decision, fall] — reversed: [fall(most recent=3x), decision(1x), loss(1x)]
    // (100*3 + 50*1 + 0*1) / 5 = 350/5 = 70
    const results = [
      makeResult('loss'),
      makeResult('decision'),
      makeResult('fall'),
    ]
    expect(dkProjection(results)).toBeCloseTo(70)
  })

  it('handles all losses', () => {
    const results = [makeResult('loss'), makeResult('loss'), makeResult('loss')]
    expect(dkProjection(results)).toBe(0)
  })
})
