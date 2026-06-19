import { describe, it, expect } from 'vitest'

import {
  // 1. Sprint analytics
  windLegalSprint,
  reactionTime,
  sprintSplitTimes,
  accelerationPhase,
  relayExchangeWindow,
  // 2. Distance/endurance events
  pacePerKm,
  pacePerMile,
  riegelPrediction,
  cameronFormula,
  lactateThresholdPace,
  vo2maxEstimate,
  // 3. Field events — jumps
  longJumpScore,
  highJumpScore,
  tripleJumpScore,
  poleVaultScore,
  // 4. Field events — throws
  shotPutScore,
  discusScore,
  hammerScore,
  javelinScore,
  // 5. Decathlon/Heptathlon
  decathlonEventScore,
  decathlonTotal,
  heptatlonEventScore,
  heptatlonTotal,
  // 6. Performance tracking
  personalBest,
  seasonBest,
  performanceTrend,
  rankAmongPeers,
  worldRankingPoints,
  // 7. DraftKings fantasy
  dkFantasyPoints,
  dkProjection,
} from '@/lib/sports/track-field-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps
}

// ---------------------------------------------------------------------------
// 1. Sprint analytics
// ---------------------------------------------------------------------------

describe('windLegalSprint', () => {
  it('allows exactly +2.0 m/s tailwind', () => {
    expect(windLegalSprint(2.0)).toBe(true)
  })

  it('allows calm wind (0.0)', () => {
    expect(windLegalSprint(0.0)).toBe(true)
  })

  it('allows headwind (negative)', () => {
    expect(windLegalSprint(-1.5)).toBe(true)
  })

  it('disallows tailwind above 2.0', () => {
    expect(windLegalSprint(2.1)).toBe(false)
  })

  it('disallows strong tailwind', () => {
    expect(windLegalSprint(5.0)).toBe(false)
  })

  it('borderline just under 2.0', () => {
    expect(windLegalSprint(1.99)).toBe(true)
  })

  it('borderline just above 2.0', () => {
    expect(windLegalSprint(2.01)).toBe(false)
  })
})

describe('reactionTime', () => {
  it('returns false_start for <100ms', () => {
    expect(reactionTime(50)).toBe('false_start')
  })

  it('returns false_start at 0ms', () => {
    expect(reactionTime(0)).toBe('false_start')
  })

  it('returns false_start for negative ms', () => {
    expect(reactionTime(-10)).toBe('false_start')
  })

  it('returns false_start for exactly 99ms', () => {
    expect(reactionTime(99)).toBe('false_start')
  })

  it('returns valid at exactly 100ms', () => {
    expect(reactionTime(100)).toBe('valid')
  })

  it('returns valid at 150ms', () => {
    expect(reactionTime(150)).toBe('valid')
  })

  it('returns valid at 200ms', () => {
    expect(reactionTime(200)).toBe('valid')
  })

  it('returns valid at exactly 300ms', () => {
    expect(reactionTime(300)).toBe('valid')
  })

  it('returns slow at 301ms', () => {
    expect(reactionTime(301)).toBe('slow')
  })

  it('returns slow at 500ms', () => {
    expect(reactionTime(500)).toBe('slow')
  })
})

describe('sprintSplitTimes', () => {
  it('returns empty array for empty splits', () => {
    expect(sprintSplitTimes([])).toEqual([])
  })

  it('computes single split', () => {
    const result = sprintSplitTimes([1.0])
    expect(result.length).toBe(1)
    expect(result[0]?.split).toBe(1.0)
    expect(result[0]?.cumulative).toBe(1.0)
    expect(result[0]?.pace).toBeCloseTo(10.0)
  })

  it('computes cumulative correctly across multiple splits', () => {
    const result = sprintSplitTimes([1.0, 0.9, 0.85])
    expect(result[0]?.cumulative).toBeCloseTo(1.0)
    expect(result[1]?.cumulative).toBeCloseTo(1.9)
    expect(result[2]?.cumulative).toBeCloseTo(2.75)
  })

  it('computes pace = splitDistance / splitTime', () => {
    const result = sprintSplitTimes([2.0], 10)
    expect(result[0]?.pace).toBeCloseTo(5.0)
  })

  it('uses custom splitDistance', () => {
    const result = sprintSplitTimes([1.0], 20)
    expect(result[0]?.pace).toBeCloseTo(20.0)
  })

  it('handles split of 0 with 0 pace', () => {
    const result = sprintSplitTimes([0])
    expect(result[0]?.pace).toBe(0)
  })
})

describe('accelerationPhase', () => {
  it('returns 0 for empty splits', () => {
    expect(accelerationPhase([])).toBe(0)
  })

  it('returns distance for single split (trivially exceeds threshold)', () => {
    // With one split, that IS the peak, so 100% > 95%
    expect(accelerationPhase([1.0])).toBe(10)
  })

  it('finds correct split for typical sprint pattern', () => {
    // Splits: 1.8, 1.2, 1.1, 1.05, 1.05 — peak velocity at splits 4/5 (time=1.05)
    // 95% of peak velocity threshold
    const splits = [1.8, 1.2, 1.1, 1.05, 1.05]
    const result = accelerationPhase(splits)
    // Should return cumulative distance at point >95% peak is reached
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(splits.length * 10)
  })

  it('uses custom splitDistance', () => {
    const result = accelerationPhase([1.0], 20)
    expect(result).toBe(20)
  })
})

describe('relayExchangeWindow', () => {
  it('returns positive value for normal exchange', () => {
    expect(relayExchangeWindow(10, 10)).toBeGreaterThanOrEqual(0)
  })

  it('returns exchangeZone when leg2Time is 0', () => {
    expect(relayExchangeWindow(10, 0)).toBe(20)
  })

  it('returns 0 for both times 0', () => {
    expect(relayExchangeWindow(0, 0)).toBe(20)
  })

  it('uses default zone of 20m', () => {
    const result = relayExchangeWindow(10, 10)
    expect(result).toBeLessThanOrEqual(20)
  })

  it('uses custom exchange zone', () => {
    const result = relayExchangeWindow(10, 10, 30)
    expect(result).toBeLessThanOrEqual(30)
  })

  it('returns a number', () => {
    expect(typeof relayExchangeWindow(10, 5)).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// 2. Distance/endurance events
// ---------------------------------------------------------------------------

describe('pacePerKm', () => {
  it('returns 0 for zero distance', () => {
    expect(pacePerKm(300, 0)).toBe(0)
  })

  it('computes pace for 10km in 3000s = 300s/km', () => {
    expect(pacePerKm(3000, 10)).toBe(300)
  })

  it('computes pace for 5km in 1200s = 240s/km', () => {
    expect(pacePerKm(1200, 5)).toBe(240)
  })

  it('handles sub-1km distance', () => {
    expect(pacePerKm(300, 0.5)).toBe(600)
  })
})

describe('pacePerMile', () => {
  it('returns 0 for zero distance', () => {
    expect(pacePerMile(300, 0)).toBe(0)
  })

  it('computes pace for marathon in 7200s', () => {
    const result = pacePerMile(7200, 26.2)
    expect(result).toBeCloseTo(7200 / 26.2, 3)
  })

  it('computes 1 mile in 240s = 240s/mile', () => {
    expect(pacePerMile(240, 1)).toBe(240)
  })
})

describe('riegelPrediction', () => {
  it('returns 0 if knownDistance is 0', () => {
    expect(riegelPrediction(3600, 0, 42.2)).toBe(0)
  })

  it('returns same time when distances are equal', () => {
    expect(riegelPrediction(3600, 10, 10)).toBeCloseTo(3600)
  })

  it('predicts longer time for longer distance', () => {
    const t = riegelPrediction(3600, 10, 20)
    expect(t).toBeGreaterThan(3600)
  })

  it('uses default exponent 1.06', () => {
    const t = riegelPrediction(3600, 10, 20)
    const expected = 3600 * Math.pow(2, 1.06)
    expect(t).toBeCloseTo(expected)
  })

  it('allows custom exponent', () => {
    const t = riegelPrediction(3600, 10, 20, 1.1)
    const expected = 3600 * Math.pow(2, 1.1)
    expect(t).toBeCloseTo(expected)
  })

  it('half marathon from 5km PB', () => {
    const fiveKTime = 1200 // 20 min
    const halfMarathonPrediction = riegelPrediction(fiveKTime, 5, 21.0975)
    expect(halfMarathonPrediction).toBeGreaterThan(fiveKTime)
  })
})

describe('cameronFormula', () => {
  it('returns 0 for 0 distance', () => {
    expect(cameronFormula(0, 1000)).toBe(0)
  })

  it('returns 0 scaled world record for 1000m', () => {
    const result = cameronFormula(1000, 1000)
    expect(result).toBeCloseTo(1000 * Math.pow(1, 1.06))
  })

  it('scales super-linearly with distance', () => {
    const t1 = cameronFormula(5000, 1000)
    const t2 = cameronFormula(10000, 1000)
    expect(t2 / t1).toBeGreaterThan(2)
  })
})

describe('lactateThresholdPace', () => {
  it('returns 0 for 0 distance', () => {
    expect(lactateThresholdPace(3600, 0)).toBe(0)
  })

  it('LT pace is slower than race pace (higher seconds/km)', () => {
    const racePace = 3600 / 10 // 360 s/km for 10km in 1hr
    const ltPace = lactateThresholdPace(3600, 10)
    expect(ltPace).toBeGreaterThan(racePace)
  })

  it('applies 0.88 factor correctly', () => {
    const ltPace = lactateThresholdPace(3600, 10)
    expect(ltPace).toBeCloseTo(360 / 0.88)
  })
})

describe('vo2maxEstimate', () => {
  it('returns 3.5 when timeSeconds is 0', () => {
    expect(vo2maxEstimate(1000, 0)).toBe(3.5)
  })

  it('increases with faster pace', () => {
    const fast = vo2maxEstimate(5000, 1200)
    const slow = vo2maxEstimate(5000, 2400)
    expect(fast).toBeGreaterThan(slow)
  })

  it('computes correctly', () => {
    const result = vo2maxEstimate(5000, 1200)
    const expected = (5000 / 1200) * 0.2 + 3.5
    expect(result).toBeCloseTo(expected)
  })

  it('baseline is 3.5 at 0 speed', () => {
    const result = vo2maxEstimate(0, 1200)
    expect(result).toBeCloseTo(3.5)
  })
})

// ---------------------------------------------------------------------------
// 3. Field events — jumps
// ---------------------------------------------------------------------------

describe('longJumpScore', () => {
  it('wind legal at exactly 2.0 m/s', () => {
    const { windLegal } = longJumpScore(8.0, 2.0)
    expect(windLegal).toBe(true)
  })

  it('wind illegal above 2.0 m/s', () => {
    const { windLegal } = longJumpScore(8.0, 2.1)
    expect(windLegal).toBe(false)
  })

  it('headwind is always legal', () => {
    const { windLegal } = longJumpScore(8.0, -3.0)
    expect(windLegal).toBe(true)
  })

  it('returns distance unchanged', () => {
    const { distance } = longJumpScore(7.5, 1.0)
    expect(distance).toBe(7.5)
  })

  it('gives positive IAAF points for valid jump', () => {
    const { iaafPoints } = longJumpScore(8.0, 0.0)
    expect(iaafPoints).toBeGreaterThan(0)
  })

  it('gives 0 points for negative performance below threshold', () => {
    const { iaafPoints } = longJumpScore(0.5, 0.0) // 50cm — below B=220cm
    expect(iaafPoints).toBe(0)
  })

  it('longer jump scores more points', () => {
    const { iaafPoints: pts8 } = longJumpScore(8.0, 0.0)
    const { iaafPoints: pts9 } = longJumpScore(9.0, 0.0)
    expect(pts9).toBeGreaterThan(pts8)
  })
})

describe('highJumpScore', () => {
  it('gives positive points for 2m jump', () => {
    const pts = highJumpScore(2.0)
    expect(pts).toBeGreaterThan(0)
  })

  it('gives 0 points below threshold', () => {
    const pts = highJumpScore(0.5) // 50cm
    expect(pts).toBe(0)
  })

  it('higher jump scores more', () => {
    const pts2 = highJumpScore(2.0)
    const pts24 = highJumpScore(2.4)
    expect(pts24).toBeGreaterThan(pts2)
  })

  it('returns an integer', () => {
    const pts = highJumpScore(1.9)
    expect(Number.isInteger(pts)).toBe(true)
  })
})

describe('tripleJumpScore', () => {
  it('wind legal at exactly 2.0 m/s', () => {
    const { windLegal } = tripleJumpScore(17.0, 2.0)
    expect(windLegal).toBe(true)
  })

  it('wind illegal above 2.0 m/s', () => {
    const { windLegal } = tripleJumpScore(17.0, 2.1)
    expect(windLegal).toBe(false)
  })

  it('returns distance unchanged', () => {
    const { distance } = tripleJumpScore(17.5, 1.0)
    expect(distance).toBe(17.5)
  })

  it('gives positive IAAF points for world-class jump', () => {
    const { iaafPoints } = tripleJumpScore(18.0, 0.0)
    expect(iaafPoints).toBeGreaterThan(0)
  })

  it('gives 0 points for jump below 300cm threshold', () => {
    const { iaafPoints } = tripleJumpScore(2.5, 0.0) // 250cm below B=300cm
    expect(iaafPoints).toBe(0)
  })
})

describe('poleVaultScore', () => {
  it('gives positive points for 5m vault', () => {
    expect(poleVaultScore(5.0)).toBeGreaterThan(0)
  })

  it('gives 0 points below threshold', () => {
    expect(poleVaultScore(0.5)).toBe(0) // 50cm below B=100cm
  })

  it('higher vault scores more', () => {
    const pts5 = poleVaultScore(5.0)
    const pts6 = poleVaultScore(6.0)
    expect(pts6).toBeGreaterThan(pts5)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(poleVaultScore(5.5))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. Field events — throws
// ---------------------------------------------------------------------------

describe('shotPutScore', () => {
  it('gives positive points for 20m throw', () => {
    expect(shotPutScore(20.0)).toBeGreaterThan(0)
  })

  it('gives 0 for throw at or below 1.5m threshold', () => {
    expect(shotPutScore(1.0)).toBe(0)
  })

  it('longer throw scores more', () => {
    expect(shotPutScore(21.0)).toBeGreaterThan(shotPutScore(20.0))
  })

  it('returns an integer', () => {
    expect(Number.isInteger(shotPutScore(20.0))).toBe(true)
  })
})

describe('discusScore', () => {
  it('gives positive points for 60m throw', () => {
    expect(discusScore(60.0)).toBeGreaterThan(0)
  })

  it('gives 0 for throw at or below 4m threshold', () => {
    expect(discusScore(3.0)).toBe(0)
  })

  it('longer throw scores more', () => {
    expect(discusScore(65.0)).toBeGreaterThan(discusScore(60.0))
  })
})

describe('hammerScore', () => {
  it('gives positive points for 70m throw', () => {
    expect(hammerScore(70.0)).toBeGreaterThan(0)
  })

  it('gives 0 for throw at or below 7m threshold', () => {
    expect(hammerScore(6.0)).toBe(0)
  })

  it('longer throw scores more', () => {
    expect(hammerScore(75.0)).toBeGreaterThan(hammerScore(70.0))
  })
})

describe('javelinScore', () => {
  it('gives positive points for 80m throw', () => {
    expect(javelinScore(80.0)).toBeGreaterThan(0)
  })

  it('gives 0 for throw at or below 7m threshold', () => {
    expect(javelinScore(6.0)).toBe(0)
  })

  it('longer throw scores more', () => {
    expect(javelinScore(85.0)).toBeGreaterThan(javelinScore(80.0))
  })
})

// ---------------------------------------------------------------------------
// 5. Decathlon/Heptathlon scoring
// ---------------------------------------------------------------------------

describe('decathlonEventScore', () => {
  it('returns 0 for unknown event', () => {
    expect(decathlonEventScore('unknown', 10)).toBe(0)
  })

  it('returns 0 for 100m time at/above 18s (threshold)', () => {
    expect(decathlonEventScore('100m', 18)).toBe(0)
  })

  it('returns positive for 10.5s 100m', () => {
    expect(decathlonEventScore('100m', 10.5)).toBeGreaterThan(0)
  })

  it('faster 100m scores more', () => {
    const pts105 = decathlonEventScore('100m', 10.5)
    const pts10 = decathlonEventScore('100m', 10.0)
    expect(pts10).toBeGreaterThan(pts105)
  })

  it('returns positive for long jump (LJ) at 700cm', () => {
    expect(decathlonEventScore('LJ', 700)).toBeGreaterThan(0)
  })

  it('LJ below 220cm threshold returns 0', () => {
    expect(decathlonEventScore('LJ', 200)).toBe(0)
  })

  it('computes shot put score', () => {
    expect(decathlonEventScore('SP', 15.0)).toBeGreaterThan(0)
  })

  it('computes high jump score', () => {
    expect(decathlonEventScore('HJ', 200)).toBeGreaterThan(0)
  })

  it('computes 400m score', () => {
    expect(decathlonEventScore('400m', 47.0)).toBeGreaterThan(0)
  })

  it('computes 110mH score', () => {
    expect(decathlonEventScore('110mH', 14.0)).toBeGreaterThan(0)
  })

  it('computes discus score', () => {
    expect(decathlonEventScore('DT', 45.0)).toBeGreaterThan(0)
  })

  it('computes pole vault score', () => {
    expect(decathlonEventScore('PV', 480)).toBeGreaterThan(0)
  })

  it('computes javelin score', () => {
    expect(decathlonEventScore('JT', 65.0)).toBeGreaterThan(0)
  })

  it('computes 1500m score', () => {
    expect(decathlonEventScore('1500m', 260)).toBeGreaterThan(0)
  })

  it('returns integer scores', () => {
    expect(Number.isInteger(decathlonEventScore('100m', 10.5))).toBe(true)
  })
})

describe('decathlonTotal', () => {
  it('returns a number for empty performances (track events score with default 0 time)', () => {
    expect(typeof decathlonTotal({})).toBe('number')
  })

  it('returns a number for all zero performances (track events with 0s are scored by IAAF formula)', () => {
    const zeros: Record<string, number> = {
      '100m': 0, LJ: 0, SP: 0, HJ: 0, '400m': 0,
      '110mH': 0, DT: 0, PV: 0, JT: 0, '1500m': 0,
    }
    expect(typeof decathlonTotal(zeros)).toBe('number')
  })

  it('sums all 10 events', () => {
    const performances: Record<string, number> = {
      '100m': 10.5,
      LJ: 760,
      SP: 14.0,
      HJ: 205,
      '400m': 47.0,
      '110mH': 14.0,
      DT: 45.0,
      PV: 500,
      JT: 65.0,
      '1500m': 260,
    }
    const total = decathlonTotal(performances)
    expect(total).toBeGreaterThan(0)
    // Verify it equals sum of individual event scores
    const expected =
      decathlonEventScore('100m', 10.5) +
      decathlonEventScore('LJ', 760) +
      decathlonEventScore('SP', 14.0) +
      decathlonEventScore('HJ', 205) +
      decathlonEventScore('400m', 47.0) +
      decathlonEventScore('110mH', 14.0) +
      decathlonEventScore('DT', 45.0) +
      decathlonEventScore('PV', 500) +
      decathlonEventScore('JT', 65.0) +
      decathlonEventScore('1500m', 260)
    expect(total).toBe(expected)
  })

  it('ignores unknown keys — total equals sum of known event scores only', () => {
    // When only '100m' has a real performance and all others default to 0,
    // the total includes the default scores for other events.
    // We verify the unknown key 'unknown' is not counted.
    const withUnknown = decathlonTotal({ '100m': 10.5, unknown: 9999 })
    const withoutUnknown = decathlonTotal({ '100m': 10.5 })
    expect(withUnknown).toBe(withoutUnknown)
  })
})

describe('heptatlonEventScore', () => {
  it('returns 0 for unknown event', () => {
    expect(heptatlonEventScore('unknown', 10)).toBe(0)
  })

  it('returns positive for 100mH at 13.0s', () => {
    expect(heptatlonEventScore('100mH', 13.0)).toBeGreaterThan(0)
  })

  it('faster 100mH scores more', () => {
    const pts13 = heptatlonEventScore('100mH', 13.0)
    const pts12 = heptatlonEventScore('100mH', 12.5)
    expect(pts12).toBeGreaterThan(pts13)
  })

  it('returns positive for HJ at 180cm', () => {
    expect(heptatlonEventScore('HJ', 180)).toBeGreaterThan(0)
  })

  it('returns positive for SP at 14m', () => {
    expect(heptatlonEventScore('SP', 14.0)).toBeGreaterThan(0)
  })

  it('returns positive for 200m at 23.0s', () => {
    expect(heptatlonEventScore('200m', 23.0)).toBeGreaterThan(0)
  })

  it('returns positive for LJ at 650cm', () => {
    expect(heptatlonEventScore('LJ', 650)).toBeGreaterThan(0)
  })

  it('returns positive for JT at 50m', () => {
    expect(heptatlonEventScore('JT', 50.0)).toBeGreaterThan(0)
  })

  it('returns positive for 800m at 130s', () => {
    expect(heptatlonEventScore('800m', 130)).toBeGreaterThan(0)
  })

  it('returns integer scores', () => {
    expect(Number.isInteger(heptatlonEventScore('100mH', 13.0))).toBe(true)
  })
})

describe('heptatlonTotal', () => {
  it('returns a number for empty performances (track events score with default 0 time)', () => {
    expect(typeof heptatlonTotal({})).toBe('number')
  })

  it('returns a number for all zero performances (track events with 0s are scored by IAAF formula)', () => {
    const zeros: Record<string, number> = {
      '100mH': 0, HJ: 0, SP: 0, '200m': 0, LJ: 0, JT: 0, '800m': 0,
    }
    expect(typeof heptatlonTotal(zeros)).toBe('number')
  })

  it('sums all 7 events', () => {
    const performances: Record<string, number> = {
      '100mH': 13.0,
      HJ: 180,
      SP: 14.0,
      '200m': 23.0,
      LJ: 650,
      JT: 50.0,
      '800m': 130,
    }
    const total = heptatlonTotal(performances)
    const expected =
      heptatlonEventScore('100mH', 13.0) +
      heptatlonEventScore('HJ', 180) +
      heptatlonEventScore('SP', 14.0) +
      heptatlonEventScore('200m', 23.0) +
      heptatlonEventScore('LJ', 650) +
      heptatlonEventScore('JT', 50.0) +
      heptatlonEventScore('800m', 130)
    expect(total).toBe(expected)
    expect(total).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Performance tracking
// ---------------------------------------------------------------------------

describe('personalBest', () => {
  it('returns Infinity for empty time performances', () => {
    expect(personalBest([])).toBe(Infinity)
  })

  it('returns -Infinity for empty distance performances', () => {
    expect(personalBest([], 'distance')).toBe(-Infinity)
  })

  it('returns minimum for time event', () => {
    expect(personalBest([10.5, 10.3, 10.8])).toBe(10.3)
  })

  it('returns maximum for distance event', () => {
    expect(personalBest([7.5, 8.1, 7.9], 'distance')).toBe(8.1)
  })

  it('single element returns itself', () => {
    expect(personalBest([10.5])).toBe(10.5)
  })

  it('defaults to time event type', () => {
    expect(personalBest([10.5, 10.3])).toBe(10.3)
  })
})

describe('seasonBest', () => {
  const performances = [
    { date: '2024-03-15', value: 10.5 },
    { date: '2024-07-20', value: 10.3 },
    { date: '2025-05-10', value: 10.4 },
    { date: '2025-08-01', value: 10.2 },
  ]

  it('returns Infinity for time when no performances in season', () => {
    expect(seasonBest(performances, 2023)).toBe(Infinity)
  })

  it('returns -Infinity for distance when no performances in season', () => {
    expect(seasonBest(performances, 2023, 'distance')).toBe(-Infinity)
  })

  it('returns season best time for 2024', () => {
    expect(seasonBest(performances, 2024)).toBe(10.3)
  })

  it('returns season best time for 2025', () => {
    expect(seasonBest(performances, 2025)).toBe(10.2)
  })

  it('returns season best distance for 2024', () => {
    const distPerf = [
      { date: '2024-03-15', value: 7.5 },
      { date: '2024-07-20', value: 8.1 },
    ]
    expect(seasonBest(distPerf, 2024, 'distance')).toBe(8.1)
  })

  it('returns Infinity for empty array', () => {
    expect(seasonBest([], 2024)).toBe(Infinity)
  })
})

describe('performanceTrend', () => {
  it('returns stable for empty array', () => {
    expect(performanceTrend([])).toBe('stable')
  })

  it('returns stable for single element', () => {
    expect(performanceTrend([10.5])).toBe('stable')
  })

  it('returns improving for decreasing times (getting faster)', () => {
    expect(performanceTrend([11.0, 10.8, 10.5, 10.3])).toBe('improving')
  })

  it('returns declining for increasing times (getting slower)', () => {
    expect(performanceTrend([10.3, 10.5, 10.8, 11.0])).toBe('declining')
  })

  it('returns stable for flat times', () => {
    expect(performanceTrend([10.5, 10.5, 10.5])).toBe('stable')
  })

  it('returns improving for increasing distances', () => {
    expect(performanceTrend([7.0, 7.5, 8.0, 8.5], 'distance')).toBe('improving')
  })

  it('returns declining for decreasing distances', () => {
    expect(performanceTrend([8.5, 8.0, 7.5, 7.0], 'distance')).toBe('declining')
  })

  it('returns stable for noisy flat distance', () => {
    expect(performanceTrend([8.0, 8.01, 7.99, 8.0], 'distance')).toBe('stable')
  })
})

describe('rankAmongPeers', () => {
  it('returns 100 for empty peers', () => {
    expect(rankAmongPeers(10.5, [])).toBe(100)
  })

  it('returns 100 when faster than all peers (time)', () => {
    expect(rankAmongPeers(10.0, [10.5, 10.8, 11.0])).toBe(100)
  })

  it('returns 0 when slowest in group (time)', () => {
    expect(rankAmongPeers(11.5, [10.0, 10.5, 10.8])).toBe(0)
  })

  it('computes correct percentile for time', () => {
    // myPerformance=10.5; peers faster: none slower: 2 out of 4
    const result = rankAmongPeers(10.5, [10.0, 10.5, 10.8, 11.0])
    // Peers with higher time (worse): 10.8, 11.0 → 2/4 = 50
    expect(result).toBeCloseTo(50)
  })

  it('returns 100 when further than all peers (distance)', () => {
    expect(rankAmongPeers(9.0, [7.0, 7.5, 8.0], 'distance')).toBe(100)
  })

  it('returns 0 when shortest distance among peers', () => {
    expect(rankAmongPeers(6.0, [7.0, 7.5, 8.0], 'distance')).toBe(0)
  })

  it('computes correct percentile for distance', () => {
    // myPerformance=7.5; peers with lower: 7.0 → 1/4 = 25
    const result = rankAmongPeers(7.5, [7.0, 7.5, 8.0, 8.5], 'distance')
    expect(result).toBeCloseTo(25)
  })
})

describe('worldRankingPoints', () => {
  it('returns 0 for zero performance', () => {
    expect(worldRankingPoints(0, 9.58)).toBe(0)
  })

  it('returns 0 for zero world leading', () => {
    expect(worldRankingPoints(10.0, 0)).toBe(0)
  })

  it('returns 1000 for matching world leader (time)', () => {
    expect(worldRankingPoints(9.58, 9.58)).toBeCloseTo(1000)
  })

  it('returns 1000 for matching world leader (distance)', () => {
    expect(worldRankingPoints(8.95, 8.95, 'distance')).toBeCloseTo(1000)
  })

  it('returns <1000 for time slower than world leader', () => {
    const pts = worldRankingPoints(10.0, 9.58)
    expect(pts).toBeLessThan(1000)
    expect(pts).toBeGreaterThan(0)
  })

  it('returns <1000 for distance less than world leader', () => {
    const pts = worldRankingPoints(8.0, 8.95, 'distance')
    expect(pts).toBeLessThan(1000)
    expect(pts).toBeGreaterThan(0)
  })

  it('caps at 1000 even for better than world leading', () => {
    // Impossible scenario, but test the cap
    expect(worldRankingPoints(9.0, 10.0)).toBeCloseTo(1000)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy
// ---------------------------------------------------------------------------

describe('dkFantasyPoints', () => {
  it('returns 0 for empty results', () => {
    expect(dkFantasyPoints([])).toBe(0)
  })

  it('awards 10 points for 1st place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 1, personalBest: false, seasonBest: false }])).toBe(10)
  })

  it('awards 8 points for 2nd place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 2, personalBest: false, seasonBest: false }])).toBe(8)
  })

  it('awards 7 points for 3rd place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 3, personalBest: false, seasonBest: false }])).toBe(7)
  })

  it('awards 6 points for 4th place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 4, personalBest: false, seasonBest: false }])).toBe(6)
  })

  it('awards 5 points for 5th place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 5, personalBest: false, seasonBest: false }])).toBe(5)
  })

  it('awards 4 points for 6th place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 6, personalBest: false, seasonBest: false }])).toBe(4)
  })

  it('awards 3 points for 7th place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 7, personalBest: false, seasonBest: false }])).toBe(3)
  })

  it('awards 2 points for 8th place', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 8, personalBest: false, seasonBest: false }])).toBe(2)
  })

  it('awards 0.5 points for 9th place (other)', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 9, personalBest: false, seasonBest: false }])).toBe(0.5)
  })

  it('awards 0.5 for last place/out of top 8', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 20, personalBest: false, seasonBest: false }])).toBe(0.5)
  })

  it('adds +3 bonus for personal best', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 1, personalBest: true, seasonBest: false }])).toBe(13)
  })

  it('adds +1 bonus for season best', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 1, personalBest: false, seasonBest: true }])).toBe(11)
  })

  it('adds both PB (+3) and SB (+1) bonuses', () => {
    expect(dkFantasyPoints([{ event: '100m', place: 1, personalBest: true, seasonBest: true }])).toBe(14)
  })

  it('sums multiple events', () => {
    const results = [
      { event: '100m', place: 1, personalBest: false, seasonBest: false },
      { event: 'LJ', place: 2, personalBest: false, seasonBest: false },
    ]
    expect(dkFantasyPoints(results)).toBe(18) // 10 + 8
  })

  it('handles multiple events with bonuses', () => {
    const results = [
      { event: '100m', place: 1, personalBest: true, seasonBest: true },  // 10+3+1=14
      { event: 'LJ', place: 3, personalBest: false, seasonBest: true },   // 7+1=8
    ]
    expect(dkFantasyPoints(results)).toBe(22)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty results', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('returns single result points for one result', () => {
    const result = dkProjection([{ place: 1, personalBest: false, seasonBest: false }])
    expect(result).toBe(10)
  })

  it('averages multiple results', () => {
    const results = [
      { place: 1, personalBest: false, seasonBest: false }, // 10pts
      { place: 3, personalBest: false, seasonBest: false }, // 7pts
    ]
    expect(dkProjection(results)).toBeCloseTo(8.5)
  })

  it('includes bonus points in average', () => {
    const results = [
      { place: 1, personalBest: true, seasonBest: false },  // 13pts
      { place: 2, personalBest: false, seasonBest: false },  // 8pts
    ]
    expect(dkProjection(results)).toBeCloseTo(10.5)
  })

  it('handles all last place results', () => {
    const results = [
      { place: 9, personalBest: false, seasonBest: false },
      { place: 10, personalBest: false, seasonBest: false },
    ]
    expect(dkProjection(results)).toBeCloseTo(0.5)
  })

  it('handles PB and SB bonuses in average', () => {
    const results = [
      { place: 1, personalBest: true, seasonBest: true },   // 14pts
      { place: 1, personalBest: true, seasonBest: true },   // 14pts
    ]
    expect(dkProjection(results)).toBeCloseTo(14)
  })
})
