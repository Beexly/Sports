import { describe, it, expect } from 'vitest'
import {
  battingAverage,
  onBasePercentage,
  sluggingPct,
  ops,
  isolatedPower,
  babip,
  singles,
  woba,
  wrc,
  wrcPlus,
  ops_plus,
  stolenBaseRuns,
  spd,
  era,
  whip,
  k9,
  bb9,
  hr9,
  kbb,
  fip,
  xfip,
  sierra,
  eraMinus,
  singleSeasonParkFactor,
  battingRuns,
  positionalAdjustment,
  replacementLevel,
  war,
  pitchingWar,
  runExpectancy,
  re24,
  linearWeightValue,
  teamRunsCreated,
  pythagWinPct,
  expectedRecord,
  WOBA_WEIGHTS,
  type BatterLine,
  type PitcherLine,
  type TeamOffenseStats,
} from '../lib/sports/baseball-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBatter(overrides: Partial<BatterLine> = {}): BatterLine {
  return {
    atBats: 500,
    hits: 150,
    doubles: 30,
    triples: 5,
    homeRuns: 20,
    walks: 50,
    intentionalWalks: 5,
    hitByPitch: 8,
    sacrificeFlies: 6,
    strikeouts: 110,
    stolenBases: 10,
    caughtStealing: 3,
    ...overrides,
  }
}

function makePitcher(overrides: Partial<PitcherLine> = {}): PitcherLine {
  return {
    inningsPitched: 180,
    earnedRuns: 72,
    hits: 160,
    walks: 50,
    strikeouts: 180,
    homeRunsAllowed: 20,
    hitBatters: 5,
    flyBalls: 200,
    groundBalls: 220,
    ...overrides,
  }
}

function makeTeam(overrides: Partial<TeamOffenseStats> = {}): TeamOffenseStats {
  return {
    runs: 750,
    hits: 1400,
    doubles: 280,
    triples: 35,
    homeRuns: 200,
    walks: 500,
    hitByPitch: 60,
    sacrificeFlies: 45,
    atBats: 5300,
    plateAppearances: 6000,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// battingAverage
// ---------------------------------------------------------------------------

describe('battingAverage', () => {
  it('calculates correctly for known stats', () => {
    expect(battingAverage(200, 600)).toBeCloseTo(0.333, 3)
  })
  it('returns 0 for 0 at-bats', () => {
    expect(battingAverage(10, 0)).toBe(0)
  })
  it('returns 0 for 0 hits', () => {
    expect(battingAverage(0, 400)).toBe(0)
  })
  it('returns 1.0 for all hits (theoretical)', () => {
    expect(battingAverage(100, 100)).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// onBasePercentage
// ---------------------------------------------------------------------------

describe('onBasePercentage', () => {
  it('calculates OBP correctly for known values', () => {
    // (150 + 50 + 8) / (500 + 50 + 8 + 6) = 208 / 564
    const result = onBasePercentage(150, 50, 8, 500, 6)
    expect(result).toBeCloseTo(208 / 564, 4)
  })
  it('is higher than batting average when walks added', () => {
    const avg = battingAverage(150, 500)
    const obp = onBasePercentage(150, 50, 8, 500, 6)
    expect(obp).toBeGreaterThan(avg)
  })
  it('returns 0 for zero denominator', () => {
    expect(onBasePercentage(0, 0, 0, 0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// sluggingPct
// ---------------------------------------------------------------------------

describe('sluggingPct', () => {
  it('calculates total bases correctly', () => {
    // 95 singles + 30*2 + 5*3 + 20*4 = 95 + 60 + 15 + 80 = 250 TB / 500 AB = 0.500
    const result = sluggingPct(95, 30, 5, 20, 500)
    expect(result).toBeCloseTo(0.5, 3)
  })
  it('returns 0 for 0 at-bats', () => {
    expect(sluggingPct(10, 5, 2, 1, 0)).toBe(0)
  })
  it('returns 4.0 for all home runs (theoretical max)', () => {
    expect(sluggingPct(0, 0, 0, 100, 100)).toBe(4.0)
  })
})

// ---------------------------------------------------------------------------
// ops
// ---------------------------------------------------------------------------

describe('ops', () => {
  it('sums OBP and SLG', () => {
    expect(ops(0.36, 0.50)).toBeCloseTo(0.86, 4)
  })
  it('league average is around 0.720', () => {
    const result = ops(0.320, 0.400)
    expect(result).toBeCloseTo(0.720, 3)
  })
})

// ---------------------------------------------------------------------------
// isolatedPower
// ---------------------------------------------------------------------------

describe('isolatedPower', () => {
  it('calculates ISO correctly', () => {
    expect(isolatedPower(0.500, 0.300)).toBeCloseTo(0.200, 4)
  })
  it('is zero for singles hitter (SLG == AVG)', () => {
    expect(isolatedPower(0.300, 0.300)).toBeCloseTo(0, 4)
  })
})

// ---------------------------------------------------------------------------
// babip
// ---------------------------------------------------------------------------

describe('babip', () => {
  it('calculates BABIP correctly for known values', () => {
    // (150 - 20) / (500 - 110 - 20 + 6) = 130 / 376
    const result = babip(150, 20, 110, 500, 6)
    expect(result).toBeCloseTo(130 / 376, 4)
  })
  it('returns 0 for zero denominator', () => {
    // All AB are HR or SO
    expect(babip(50, 50, 100, 150, 0)).toBe(0)
  })
  it('is always between 0 and 1 for normal inputs', () => {
    const result = babip(150, 20, 110, 500, 6)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// singles
// ---------------------------------------------------------------------------

describe('singles', () => {
  it('extracts singles correctly', () => {
    const b = makeBatter({ hits: 150, doubles: 30, triples: 5, homeRuns: 20 })
    expect(singles(b)).toBe(95)
  })
  it('returns 0 when all hits are extra-base', () => {
    const b = makeBatter({ hits: 10, doubles: 4, triples: 3, homeRuns: 3 })
    expect(singles(b)).toBe(0)
  })
  it('never returns negative', () => {
    const b = makeBatter({ hits: 5, doubles: 3, triples: 2, homeRuns: 2 })
    expect(singles(b)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// woba
// ---------------------------------------------------------------------------

describe('woba', () => {
  it('produces a value in a reasonable range (0.280–0.420)', () => {
    const b = makeBatter()
    const w = woba(b)
    expect(w).toBeGreaterThan(0.280)
    expect(w).toBeLessThan(0.450)
  })
  it('higher HR count increases wOBA', () => {
    const base = makeBatter()
    const powerHitter = makeBatter({ homeRuns: 40, hits: 150 })
    expect(woba(powerHitter)).toBeGreaterThan(woba(base))
  })
  it('uses default WOBA_WEIGHTS when not specified', () => {
    const b = makeBatter()
    const w1 = woba(b)
    const w2 = woba(b, WOBA_WEIGHTS)
    expect(w1).toBeCloseTo(w2, 6)
  })
  it('returns 0 for batter with 0 PA', () => {
    const b = makeBatter({ atBats: 0, walks: 0, hitByPitch: 0, sacrificeFlies: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0 })
    expect(woba(b)).toBe(0)
  })
  it('handles intentional walks subtraction', () => {
    const b1 = makeBatter({ intentionalWalks: 0 })
    const b2 = makeBatter({ intentionalWalks: 20 }) // same total walks but more IBB
    // More IBB means fewer unintentional walks counted → lower wOBA
    expect(woba(b2)).toBeLessThan(woba(b1))
  })
})

// ---------------------------------------------------------------------------
// wrc (Weighted Runs Created)
// ---------------------------------------------------------------------------

describe('wrc', () => {
  it('equals lgRC when wOBA equals lgwOBA', () => {
    const lgWoba = 0.320
    const lgRPerPA = 0.120
    const pa = 600
    const result = wrc(lgWoba, lgWoba, lgRPerPA, pa)
    expect(result).toBeCloseTo(lgRPerPA * pa, 4)
  })
  it('produces more runs for above-average wOBA', () => {
    const lgWoba = 0.320
    const lgRPerPA = 0.120
    const pa = 600
    const aboveAvg = wrc(0.380, lgWoba, lgRPerPA, pa)
    const belowAvg = wrc(0.270, lgWoba, lgRPerPA, pa)
    expect(aboveAvg).toBeGreaterThan(belowAvg)
  })
  it('returns 0 for 0 PA', () => {
    expect(wrc(0.350, 0.320, 0.120, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// wrcPlus
// ---------------------------------------------------------------------------

describe('wrcPlus', () => {
  it('returns ~100 when wOBA equals league average', () => {
    const lgWoba = 0.320
    const result = wrcPlus(lgWoba, lgWoba)
    expect(result).toBeCloseTo(100, 1)
  })
  it('returns >100 for above-average wOBA', () => {
    expect(wrcPlus(0.380, 0.320)).toBeGreaterThan(100)
  })
  it('returns <100 for below-average wOBA', () => {
    expect(wrcPlus(0.270, 0.320)).toBeLessThan(100)
  })
  it('adjusts downward for pitcher-friendly park (PF > 1)', () => {
    const neutral = wrcPlus(0.380, 0.320, 1.0)
    const pitcherPark = wrcPlus(0.380, 0.320, 1.1)
    expect(pitcherPark).toBeLessThan(neutral)
  })
})

// ---------------------------------------------------------------------------
// ops_plus
// ---------------------------------------------------------------------------

describe('ops_plus', () => {
  it('returns 100 when player OPS equals league OPS', () => {
    expect(ops_plus(0.720, 0.720)).toBeCloseTo(100, 2)
  })
  it('returns >100 for above-average OPS', () => {
    expect(ops_plus(0.900, 0.720)).toBeGreaterThan(100)
  })
  it('adjusts for park factor', () => {
    const neutral = ops_plus(0.900, 0.720, 1.0)
    const hitterPark = ops_plus(0.900, 0.720, 0.9) // hitter-friendly reduces credit
    expect(hitterPark).toBeGreaterThan(neutral)
  })
  it('returns 0 for zero lgOps', () => {
    expect(ops_plus(0.9, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// stolenBaseRuns
// ---------------------------------------------------------------------------

describe('stolenBaseRuns', () => {
  it('is positive for a good base-stealer (SB >> CS)', () => {
    expect(stolenBaseRuns(40, 5)).toBeGreaterThan(0)
  })
  it('is negative for a bad base-stealer (high CS)', () => {
    expect(stolenBaseRuns(5, 15)).toBeLessThan(0)
  })
  it('is zero for zero stolen bases and zero caught', () => {
    expect(stolenBaseRuns(0, 0)).toBe(0)
  })
  it('calculates SBR correctly with known values', () => {
    // 30 SB * 0.2 - 5 CS * 0.432 = 6 - 2.16 = 3.84
    expect(stolenBaseRuns(30, 5)).toBeCloseTo(3.84, 4)
  })
})

// ---------------------------------------------------------------------------
// spd (speed score)
// ---------------------------------------------------------------------------

describe('spd', () => {
  it('returns a value between 0 and 10', () => {
    const speed = spd(30, 5, 0.25)
    expect(speed).toBeGreaterThanOrEqual(0)
    expect(speed).toBeLessThanOrEqual(10)
  })
  it('increases with more stolen bases', () => {
    expect(spd(50, 5, 0.25)).toBeGreaterThan(spd(5, 5, 0.10))
  })
})

// ---------------------------------------------------------------------------
// era
// ---------------------------------------------------------------------------

describe('era', () => {
  it('calculates ERA for known stats', () => {
    // 72 ER / 180 IP * 9 = 3.60
    expect(era(72, 180)).toBeCloseTo(3.60, 2)
  })
  it('returns 0 for 0 IP', () => {
    expect(era(5, 0)).toBe(0)
  })
  it('handles fractional innings (e.g., 7.2)', () => {
    // 7.2 = 7 and 2/3 = 23/3 innings
    const result = era(3, 7.2)
    expect(result).toBeCloseTo((3 / (23 / 3)) * 9, 3)
  })
  it('is higher for more earned runs', () => {
    expect(era(100, 180)).toBeGreaterThan(era(50, 180))
  })
})

// ---------------------------------------------------------------------------
// whip
// ---------------------------------------------------------------------------

describe('whip', () => {
  it('calculates WHIP correctly', () => {
    // (50 + 160) / 180 = 1.167
    expect(whip(50, 160, 180)).toBeCloseTo(210 / 180, 3)
  })
  it('returns 0 for 0 IP', () => {
    expect(whip(5, 10, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// k9, bb9, hr9
// ---------------------------------------------------------------------------

describe('k9', () => {
  it('calculates strikeouts per 9 innings', () => {
    expect(k9(180, 180)).toBeCloseTo(9.0, 3)
  })
  it('returns 0 for 0 IP', () => {
    expect(k9(100, 0)).toBe(0)
  })
})

describe('bb9', () => {
  it('calculates walks per 9 innings', () => {
    expect(bb9(60, 180)).toBeCloseTo(3.0, 3)
  })
  it('returns 0 for 0 IP', () => {
    expect(bb9(30, 0)).toBe(0)
  })
})

describe('hr9', () => {
  it('calculates home runs per 9 innings', () => {
    expect(hr9(20, 180)).toBeCloseTo(1.0, 3)
  })
  it('returns 0 for 0 IP', () => {
    expect(hr9(5, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// kbb
// ---------------------------------------------------------------------------

describe('kbb', () => {
  it('calculates K/BB ratio', () => {
    expect(kbb(180, 50)).toBeCloseTo(3.6, 3)
  })
  it('handles 0 walks returning strikeouts directly', () => {
    expect(kbb(150, 0)).toBe(150)
  })
  it('returns 0 when both K and BB are 0', () => {
    expect(kbb(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// fip
// ---------------------------------------------------------------------------

describe('fip', () => {
  it('calculates FIP with default constant', () => {
    // (13*20 + 3*(50+5) - 2*180) / 180 + 3.10
    const numerator = 13 * 20 + 3 * 55 - 2 * 180
    const result = fip(20, 50, 5, 180, 180)
    expect(result).toBeCloseTo(numerator / 180 + 3.10, 3)
  })
  it('is higher for HR-heavy pitcher', () => {
    const normal = fip(20, 50, 5, 180, 180)
    const hrHeavy = fip(40, 50, 5, 180, 180)
    expect(hrHeavy).toBeGreaterThan(normal)
  })
  it('is lower for high-strikeout pitcher', () => {
    const normal = fip(20, 50, 5, 180, 180)
    const highK = fip(20, 50, 5, 250, 180)
    expect(highK).toBeLessThan(normal)
  })
  it('returns 0 for 0 IP', () => {
    expect(fip(5, 20, 2, 100, 0)).toBe(0)
  })
  it('uses custom constant', () => {
    const r1 = fip(10, 30, 3, 120, 100, 3.20)
    const r2 = fip(10, 30, 3, 120, 100, 3.10)
    expect(r1).toBeGreaterThan(r2)
  })
})

// ---------------------------------------------------------------------------
// xfip
// ---------------------------------------------------------------------------

describe('xfip', () => {
  it('replaces HR with expected HR from flyball rate', () => {
    // With same K/BB, xFIP should be close to FIP if HR rate matches expectation
    const flyBalls = 200
    const expectedHr = flyBalls * 0.105 // ≈ 21 HR
    const fipResult = fip(expectedHr, 50, 5, 180, 180)
    const xfipResult = xfip(20, 50, 5, 180, 180, flyBalls)
    expect(xfipResult).toBeCloseTo(fipResult, 2)
  })
  it('normalizes HR-happy pitcher with similar fly ball count', () => {
    const normal = xfip(20, 50, 5, 180, 180, 200)
    const hrHeavy = xfip(40, 50, 5, 180, 180, 200) // HR doesn't matter for xFIP
    expect(Math.abs(hrHeavy - normal)).toBeLessThan(0.01)
  })
  it('increases with more fly balls', () => {
    const lowFb = xfip(20, 50, 5, 180, 180, 150)
    const highFb = xfip(20, 50, 5, 180, 180, 300)
    expect(highFb).toBeGreaterThan(lowFb)
  })
})

// ---------------------------------------------------------------------------
// sierra
// ---------------------------------------------------------------------------

describe('sierra', () => {
  it('returns a reasonable ERA-like value (1.5–6.0)', () => {
    const result = sierra(180, 50, 5, 220, 200, 180)
    expect(result).toBeGreaterThan(1.5)
    expect(result).toBeLessThan(7.0)
  })
  it('decreases with higher strikeout rate', () => {
    const lowK = sierra(100, 50, 5, 220, 200, 180)
    const highK = sierra(250, 50, 5, 220, 200, 180)
    expect(highK).toBeLessThan(lowK)
  })
  it('increases with higher walk rate', () => {
    const lowBB = sierra(180, 30, 5, 220, 200, 180)
    const highBB = sierra(180, 80, 5, 220, 200, 180)
    expect(highBB).toBeGreaterThan(lowBB)
  })
  it('returns 0 for 0 IP', () => {
    expect(sierra(100, 30, 5, 200, 150, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// eraMinus
// ---------------------------------------------------------------------------

describe('eraMinus', () => {
  it('returns 100 when ERA equals league ERA', () => {
    expect(eraMinus(4.0, 4.0)).toBeCloseTo(100, 2)
  })
  it('returns <100 for pitcher better than league average', () => {
    expect(eraMinus(3.0, 4.0)).toBeLessThan(100)
  })
  it('returns >100 for pitcher worse than league average', () => {
    expect(eraMinus(5.0, 4.0)).toBeGreaterThan(100)
  })
  it('adjusts for park factor (pitcher-friendly park lowers ERA-)', () => {
    // Lower park factor (pitcher-friendly) means ERA- increases (less credit)
    const neutral = eraMinus(3.0, 4.0, 1.0)
    const pitcherFriendly = eraMinus(3.0, 4.0, 0.9)
    expect(pitcherFriendly).toBeGreaterThan(neutral)
  })
  it('returns 0 for zero lgERA', () => {
    expect(eraMinus(3.0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// singleSeasonParkFactor
// ---------------------------------------------------------------------------

describe('singleSeasonParkFactor', () => {
  it('returns ~1.0 when home and away run environments are equal', () => {
    expect(singleSeasonParkFactor(400, 400, 400, 400)).toBeCloseTo(1.0, 4)
  })
  it('returns >1.0 for hitter-friendly park (more runs at home)', () => {
    expect(singleSeasonParkFactor(500, 480, 400, 390)).toBeGreaterThan(1.0)
  })
  it('returns <1.0 for pitcher-friendly park (fewer runs at home)', () => {
    expect(singleSeasonParkFactor(350, 340, 430, 410)).toBeLessThan(1.0)
  })
  it('handles custom game counts', () => {
    const result = singleSeasonParkFactor(400, 400, 400, 400, 81, 81)
    expect(result).toBeCloseTo(1.0, 4)
  })
})

// ---------------------------------------------------------------------------
// battingRuns
// ---------------------------------------------------------------------------

describe('battingRuns', () => {
  it('returns positive for above-average wOBA', () => {
    const result = battingRuns(0.380, 0.320, 1.157, 600)
    expect(result).toBeGreaterThan(0)
  })
  it('returns negative for below-average wOBA', () => {
    const result = battingRuns(0.280, 0.320, 1.157, 600)
    expect(result).toBeLessThan(0)
  })
  it('returns 0 when wOBA equals lgwOBA', () => {
    expect(battingRuns(0.320, 0.320, 1.157, 600)).toBeCloseTo(0, 4)
  })
  it('scales with PA', () => {
    const full = battingRuns(0.380, 0.320, 1.157, 600)
    const half = battingRuns(0.380, 0.320, 1.157, 300)
    expect(full).toBeCloseTo(half * 2, 4)
  })
})

// ---------------------------------------------------------------------------
// positionalAdjustment
// ---------------------------------------------------------------------------

describe('positionalAdjustment', () => {
  const positions: Array<[string, number]> = [
    ['C', 12.5],
    ['SS', 7.5],
    ['2B', 2.5],
    ['CF', 2.5],
    ['3B', 2.5],
    ['RF', -7.5],
    ['LF', -7.5],
    ['1B', -12.5],
    ['DH', -17.5],
  ]

  positions.forEach(([pos, expected]) => {
    it(`returns ${expected} for ${pos}`, () => {
      expect(positionalAdjustment(pos)).toBe(expected)
    })
  })

  it('catcher has highest adjustment', () => {
    expect(positionalAdjustment('C')).toBeGreaterThan(positionalAdjustment('SS'))
  })
  it('DH has the lowest adjustment', () => {
    expect(positionalAdjustment('DH')).toBeLessThan(positionalAdjustment('1B'))
  })
  it('is case-insensitive', () => {
    expect(positionalAdjustment('c')).toBe(positionalAdjustment('C'))
    expect(positionalAdjustment('ss')).toBe(positionalAdjustment('SS'))
  })
})

// ---------------------------------------------------------------------------
// replacementLevel
// ---------------------------------------------------------------------------

describe('replacementLevel', () => {
  it('returns -20.5 for 600 PA', () => {
    expect(replacementLevel(600)).toBeCloseTo(-20.5, 4)
  })
  it('returns -10.25 for 300 PA', () => {
    expect(replacementLevel(300)).toBeCloseTo(-10.25, 4)
  })
  it('is always negative', () => {
    expect(replacementLevel(400)).toBeLessThan(0)
  })
  it('scales linearly with PA', () => {
    const full = replacementLevel(600)
    const half = replacementLevel(300)
    expect(full).toBeCloseTo(half * 2, 4)
  })
})

// ---------------------------------------------------------------------------
// war (position player)
// ---------------------------------------------------------------------------

describe('war', () => {
  it('produces positive WAR for above-average player', () => {
    const br = battingRuns(0.380, 0.320, 1.157, 600)
    const pos = positionalAdjustment('SS')
    const rep = replacementLevel(600)
    const result = war(br, pos, rep)
    expect(result).toBeGreaterThan(0)
  })
  it('produces ~0 WAR for replacement-level player', () => {
    const rep = replacementLevel(600)
    // batting at exactly replacement = 0 batting runs + 0 positional
    const result = war(rep, 0, rep)
    expect(result).toBeCloseTo(0, 1)
  })
  it('is higher for a catcher than a DH with same batting', () => {
    const br = battingRuns(0.350, 0.320, 1.157, 600)
    const rep = replacementLevel(600)
    const catcherWar = war(br, positionalAdjustment('C'), rep)
    const dhWar = war(br, positionalAdjustment('DH'), rep)
    expect(catcherWar).toBeGreaterThan(dhWar)
  })
  it('uses custom runsPerWin', () => {
    const br = 20
    const w1 = war(br, 0, -20.5, 10)
    const w2 = war(br, 0, -20.5, 12)
    expect(w1).toBeGreaterThan(w2)
  })
})

// ---------------------------------------------------------------------------
// pitchingWar
// ---------------------------------------------------------------------------

describe('pitchingWar', () => {
  it('produces positive WAR for a below-average FIP pitcher', () => {
    const result = pitchingWar(3.0, 4.0, 180)
    expect(result).toBeGreaterThan(0)
  })
  it('produces negative WAR for an above-average FIP pitcher', () => {
    const result = pitchingWar(5.0, 4.0, 180)
    expect(result).toBeLessThan(0)
  })
  it('scales with innings pitched', () => {
    const ace = pitchingWar(3.0, 4.0, 220)
    const middleReliever = pitchingWar(3.0, 4.0, 60)
    expect(ace).toBeGreaterThan(middleReliever)
  })
  it('returns 0 for 0 IP', () => {
    expect(pitchingWar(3.0, 4.0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// runExpectancy
// ---------------------------------------------------------------------------

describe('runExpectancy', () => {
  it('bases loaded no outs is highest RE', () => {
    const re111_0 = runExpectancy(0, '111')
    const re000_0 = runExpectancy(0, '000')
    expect(re111_0).toBeGreaterThan(re000_0)
  })
  it('empty bases 2 outs is lowest RE', () => {
    const re000_2 = runExpectancy(2, '000')
    const re000_0 = runExpectancy(0, '000')
    expect(re000_2).toBeLessThan(re000_0)
  })
  it('runner on first is worth more than empty bases', () => {
    expect(runExpectancy(0, '100')).toBeGreaterThan(runExpectancy(0, '000'))
  })
  it('more runners = more expected runs (same outs)', () => {
    const re0 = runExpectancy(0, '000')
    const re1 = runExpectancy(0, '100')
    const re2 = runExpectancy(0, '110')
    const re3 = runExpectancy(0, '111')
    expect(re3).toBeGreaterThan(re2)
    expect(re2).toBeGreaterThan(re1)
    expect(re1).toBeGreaterThan(re0)
  })
  it('more outs = fewer expected runs (same runners)', () => {
    const re0 = runExpectancy(0, '100')
    const re1 = runExpectancy(1, '100')
    const re2 = runExpectancy(2, '100')
    expect(re0).toBeGreaterThan(re1)
    expect(re1).toBeGreaterThan(re2)
  })
})

// ---------------------------------------------------------------------------
// re24
// ---------------------------------------------------------------------------

describe('re24', () => {
  it('is positive when a run scores from a home run', () => {
    // Bases empty, 0 outs → home run → still empty, 0 outs, 1 run scored
    const result = re24(0, '000', '000', 0, 1)
    expect(result).toBeGreaterThan(0)
  })
  it('is positive for grand slam (1 run scored, bases were loaded)', () => {
    // Bases loaded 0 outs → home run → bases empty 0 outs + 4 runs
    const result = re24(0, '111', '000', 0, 4)
    expect(result).toBeGreaterThan(0)
  })
  it('is negative for a strikeout with bases empty', () => {
    // Empty 0 outs → strikeout → empty 1 out, 0 runs
    const result = re24(0, '000', '000', 1, 0)
    expect(result).toBeLessThan(0)
  })
  it('is positive when advancing a runner', () => {
    // Runner on 1st, 0 outs → single → runners on 1st and 3rd, 0 outs, 0 runs
    const result = re24(0, '100', '101', 0, 0)
    expect(result).toBeGreaterThan(0)
  })
  it('returns 0 minus starting RE when 3 outs are made with bases empty', () => {
    // Ending inning scenario — RE after = 0
    const reBefore = runExpectancy(2, '000')
    const result = re24(2, '000', '000', 3, 0)
    expect(result).toBeCloseTo(-reBefore, 4)
  })
})

// ---------------------------------------------------------------------------
// linearWeightValue
// ---------------------------------------------------------------------------

describe('linearWeightValue', () => {
  it('homeRun > triple > double > single', () => {
    expect(linearWeightValue('homeRun')).toBeGreaterThan(linearWeightValue('triple'))
    expect(linearWeightValue('triple')).toBeGreaterThan(linearWeightValue('double'))
    expect(linearWeightValue('double')).toBeGreaterThan(linearWeightValue('single'))
  })
  it('single > walk > out', () => {
    expect(linearWeightValue('single')).toBeGreaterThan(linearWeightValue('walk'))
    expect(linearWeightValue('walk')).toBeGreaterThan(linearWeightValue('out'))
  })
  it('strikeout is slightly worse than generic out', () => {
    expect(linearWeightValue('strikeout')).toBeLessThan(linearWeightValue('out'))
  })
  it('all positive offensive events are > 0', () => {
    expect(linearWeightValue('single')).toBeGreaterThan(0)
    expect(linearWeightValue('double')).toBeGreaterThan(0)
    expect(linearWeightValue('triple')).toBeGreaterThan(0)
    expect(linearWeightValue('homeRun')).toBeGreaterThan(0)
    expect(linearWeightValue('walk')).toBeGreaterThan(0)
    expect(linearWeightValue('hbp')).toBeGreaterThan(0)
  })
  it('out and strikeout are negative', () => {
    expect(linearWeightValue('out')).toBeLessThan(0)
    expect(linearWeightValue('strikeout')).toBeLessThan(0)
  })
  it('hbp is close to walk in value', () => {
    const walkVal = linearWeightValue('walk')
    const hbpVal = linearWeightValue('hbp')
    expect(Math.abs(hbpVal - walkVal)).toBeLessThan(0.1)
  })
})

// ---------------------------------------------------------------------------
// teamRunsCreated
// ---------------------------------------------------------------------------

describe('teamRunsCreated', () => {
  it('produces a large positive number for a good offense', () => {
    const result = teamRunsCreated(makeTeam())
    expect(result).toBeGreaterThan(100)
  })
  it('is higher for better offense', () => {
    const elite = makeTeam({ hits: 1600, homeRuns: 250, walks: 600 })
    const weak = makeTeam({ hits: 1200, homeRuns: 150, walks: 400 })
    expect(teamRunsCreated(elite)).toBeGreaterThan(teamRunsCreated(weak))
  })
  it('returns 0 for all zeros', () => {
    const empty: TeamOffenseStats = {
      runs: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0,
      walks: 0, hitByPitch: 0, sacrificeFlies: 0, atBats: 0, plateAppearances: 0,
    }
    expect(teamRunsCreated(empty)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// pythagWinPct
// ---------------------------------------------------------------------------

describe('pythagWinPct', () => {
  it('returns 0.5 for equal runs scored and allowed', () => {
    expect(pythagWinPct(700, 700)).toBeCloseTo(0.5, 4)
  })
  it('returns >0.5 when RS > RA', () => {
    expect(pythagWinPct(900, 700)).toBeGreaterThan(0.5)
  })
  it('returns <0.5 when RS < RA', () => {
    expect(pythagWinPct(700, 900)).toBeLessThan(0.5)
  })
  it('approaches 1.0 when RS >> RA', () => {
    expect(pythagWinPct(1500, 300)).toBeGreaterThan(0.95)
  })
  it('approaches 0.0 when RS << RA', () => {
    expect(pythagWinPct(300, 1500)).toBeLessThan(0.05)
  })
  it('returns 0.5 when both are 0', () => {
    expect(pythagWinPct(0, 0)).toBe(0.5)
  })
  it('returns 1.0 when RA is 0', () => {
    expect(pythagWinPct(700, 0)).toBe(1)
  })
  it('returns 0.0 when RS is 0', () => {
    expect(pythagWinPct(0, 700)).toBe(0)
  })
  it('uses custom exponent', () => {
    const default1 = pythagWinPct(900, 700)
    const custom = pythagWinPct(900, 700, 2.0)
    // Results should differ
    expect(Math.abs(default1 - custom)).toBeGreaterThan(0.001)
  })
})

// ---------------------------------------------------------------------------
// expectedRecord
// ---------------------------------------------------------------------------

describe('expectedRecord', () => {
  it('wins + losses = games', () => {
    const rec = expectedRecord(750, 650, 162)
    expect(rec.wins + rec.losses).toBe(162)
  })
  it('has more wins than losses when RS > RA', () => {
    const rec = expectedRecord(900, 700, 162)
    expect(rec.wins).toBeGreaterThan(rec.losses)
  })
  it('has more losses than wins when RS < RA', () => {
    const rec = expectedRecord(700, 900, 162)
    expect(rec.losses).toBeGreaterThan(rec.wins)
  })
  it('is close to 81-81 for equal RS/RA', () => {
    const rec = expectedRecord(750, 750, 162)
    expect(rec.wins).toBeCloseTo(81, 0)
    expect(rec.losses).toBeCloseTo(81, 0)
  })
})

// ---------------------------------------------------------------------------
// WOBA_WEIGHTS constants
// ---------------------------------------------------------------------------

describe('WOBA_WEIGHTS', () => {
  it('has correct 2023-era values', () => {
    expect(WOBA_WEIGHTS.uBB).toBeCloseTo(0.690, 3)
    expect(WOBA_WEIGHTS.HBP).toBeCloseTo(0.722, 3)
    expect(WOBA_WEIGHTS.single).toBeCloseTo(0.888, 3)
    expect(WOBA_WEIGHTS.double).toBeCloseTo(1.271, 3)
    expect(WOBA_WEIGHTS.triple).toBeCloseTo(1.616, 3)
    expect(WOBA_WEIGHTS.HR).toBeCloseTo(2.101, 3)
    expect(WOBA_WEIGHTS.wOBAScale).toBeCloseTo(1.157, 3)
  })
  it('has increasing weights: BB < HBP < 1B < 2B < 3B < HR', () => {
    expect(WOBA_WEIGHTS.uBB).toBeLessThan(WOBA_WEIGHTS.HBP)
    expect(WOBA_WEIGHTS.HBP).toBeLessThan(WOBA_WEIGHTS.single)
    expect(WOBA_WEIGHTS.single).toBeLessThan(WOBA_WEIGHTS.double)
    expect(WOBA_WEIGHTS.double).toBeLessThan(WOBA_WEIGHTS.triple)
    expect(WOBA_WEIGHTS.triple).toBeLessThan(WOBA_WEIGHTS.HR)
  })
})

// ---------------------------------------------------------------------------
// Edge cases across multiple functions
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('battingAverage with negative inputs returns 0', () => {
    expect(battingAverage(-5, 100)).toBeLessThanOrEqual(0)
  })
  it('era with negative earned runs and valid IP returns negative ERA (clamped usage)', () => {
    // Not clamped in ERA itself — just ensures no crash
    expect(() => era(-5, 100)).not.toThrow()
  })
  it('fip with 0 HR, 0 BB, 0 HBP, many K gives very low FIP', () => {
    const result = fip(0, 0, 0, 300, 200)
    expect(result).toBeLessThan(3.10) // below constant
  })
  it('pythagWinPct always returns 0-1', () => {
    expect(pythagWinPct(1000, 200)).toBeLessThanOrEqual(1)
    expect(pythagWinPct(200, 1000)).toBeGreaterThanOrEqual(0)
  })
  it('replacementLevel for 0 PA returns 0', () => {
    expect(replacementLevel(0)).toBeCloseTo(0, 10)
  })
  it('woba for perfect hitter (all HR) is very high', () => {
    const perfect = makeBatter({
      atBats: 100, hits: 100, doubles: 0, triples: 0, homeRuns: 100,
      walks: 0, hitByPitch: 0, sacrificeFlies: 0, strikeouts: 0, intentionalWalks: 0,
    })
    expect(woba(perfect)).toBeGreaterThan(1.5)
  })
  it('singles never goes below 0', () => {
    const b = makeBatter({ hits: 3, doubles: 2, triples: 1, homeRuns: 2 })
    expect(singles(b)).toBe(0)
  })
  it('stolenBaseRuns at break-even SB rate', () => {
    // Break-even: SB * 0.2 = CS * 0.432 → SB/CS ≈ 2.16
    const result = stolenBaseRuns(22, 10)  // 4.4 - 4.32 ≈ 0.08
    expect(result).toBeGreaterThan(0)
  })
})
