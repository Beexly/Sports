import { describe, it, expect } from 'vitest'
import {
  // Batting
  battingAverage,
  onBasePercentage,
  sluggingPercentage,
  ops,
  wOBA,
  wRCPlus,
  BABIP,
  isolatedPower,
  speedScore,
  contactRate,
  walkRate,
  strikeoutRate,
  // Pitching
  ERA,
  WHIP,
  FIP,
  xFIP,
  SIERA,
  strikeoutsPer9,
  walksPer9,
  kBBRatio,
  groundBallRate,
  flyBallRate,
  lineDriveRate,
  // Fielding
  fieldingPercentage,
  defensiveEfficiencyRatio,
  ultimateZoneRating,
  totalZone,
  // WAR
  winsAboveReplacement,
  offensiveRunsAboveAverage,
  defensiveRunsSaved,
  replacementRunsDifferential,
  // Park factors
  parkFactor,
  adjustedParkFactor,
  altitudeAdjustment,
  // Advanced
  pythagoreanWinPct,
  baseRuns,
  linearWeightsRuns,
  dRS,
  // Fantasy
  dkBattingScore,
  dkPitchingScore,
  // Lineup
  lineupProtectionScore,
  platoonSplit,
  bulpenLoadIndex,
  gameScoreV2,
  // Legacy / backward-compat
  sluggingPct,
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
  type DKBattingStats,
  type DKPitchingStats,
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

function makeDKBatting(overrides: Partial<DKBattingStats> = {}): DKBattingStats {
  return {
    singles: 1,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 1,
    runs: 1,
    walks: 0,
    hbp: 0,
    stolenBases: 0,
    caughtStealing: 0,
    ...overrides,
  }
}

function makeDKPitching(overrides: Partial<DKPitchingStats> = {}): DKPitchingStats {
  return {
    inningsPitched: 6,
    strikeouts: 7,
    wins: 1,
    earnedRuns: 2,
    hits: 5,
    walks: 2,
    hbp: 0,
    completeGame: 0,
    noHitter: 0,
    ...overrides,
  }
}

// ===========================================================================
// 1. Batting statistics
// ===========================================================================

describe('battingAverage', () => {
  it('calculates correctly for known stats', () => {
    expect(battingAverage(200, 600)).toBeCloseTo(0.3333, 4)
  })
  it('returns 0 for 0 at-bats', () => {
    expect(battingAverage(10, 0)).toBe(0)
  })
  it('returns 0 for 0 hits', () => {
    expect(battingAverage(0, 400)).toBe(0)
  })
  it('returns 1.0 for all hits', () => {
    expect(battingAverage(100, 100)).toBe(1.0)
  })
  it('handles .300 hitter correctly', () => {
    expect(battingAverage(90, 300)).toBeCloseTo(0.3, 4)
  })
})

describe('onBasePercentage', () => {
  it('calculates OBP for known values', () => {
    // (150 + 50 + 8) / (500 + 50 + 8 + 6) = 208 / 564
    expect(onBasePercentage(150, 50, 8, 500, 6)).toBeCloseTo(208 / 564, 4)
  })
  it('is higher than batting average when walks present', () => {
    const avg = battingAverage(150, 500)
    const obp = onBasePercentage(150, 50, 8, 500, 6)
    expect(obp).toBeGreaterThan(avg)
  })
  it('returns 0 for zero denominator', () => {
    expect(onBasePercentage(0, 0, 0, 0, 0)).toBe(0)
  })
  it('equals batting average with no walks or HBP or SF', () => {
    expect(onBasePercentage(150, 0, 0, 500, 0)).toBeCloseTo(150 / 500, 4)
  })
  it('upper bound is 1.0 (all on base)', () => {
    expect(onBasePercentage(100, 0, 0, 100, 0)).toBeCloseTo(1.0, 4)
  })
})

describe('sluggingPercentage', () => {
  it('calculates total bases correctly', () => {
    // 95 singles + 30*2 + 5*3 + 20*4 = 95+60+15+80=250 TB / 500 AB = .500
    expect(sluggingPercentage(95, 30, 5, 20, 500)).toBeCloseTo(0.5, 3)
  })
  it('returns 0 for 0 at-bats', () => {
    expect(sluggingPercentage(10, 5, 2, 1, 0)).toBe(0)
  })
  it('returns 4.0 for all home runs (theoretical max)', () => {
    expect(sluggingPercentage(0, 0, 0, 100, 100)).toBeCloseTo(4.0, 4)
  })
  it('is always >= batting average', () => {
    const slg = sluggingPercentage(80, 20, 5, 10, 400)
    const avg = battingAverage(115, 400)
    expect(slg).toBeGreaterThanOrEqual(avg)
  })
})

describe('ops', () => {
  it('sums OBP and SLG', () => {
    expect(ops(0.36, 0.50)).toBeCloseTo(0.86, 4)
  })
  it('league average is around 0.720', () => {
    expect(ops(0.320, 0.400)).toBeCloseTo(0.720, 3)
  })
  it('elite OPS is above 1.000', () => {
    expect(ops(0.400, 0.650)).toBeGreaterThan(1.0)
  })
  it('returns 0 for zeroes', () => {
    expect(ops(0, 0)).toBe(0)
  })
})

describe('wOBA', () => {
  it('returns a value in reasonable range for average player', () => {
    // 40 uBB, 8 HBP, 80 1B, 25 2B, 5 3B, 15 HR, 550 PA
    const result = wOBA(40, 8, 80, 25, 5, 15, 550)
    expect(result).toBeGreaterThan(0.280)
    expect(result).toBeLessThan(0.420)
  })
  it('returns 0 for 0 PA', () => {
    expect(wOBA(0, 0, 0, 0, 0, 0, 0)).toBe(0)
  })
  it('increases with more home runs', () => {
    const base = wOBA(40, 5, 80, 25, 5, 20, 550)
    const power = wOBA(40, 5, 60, 25, 5, 40, 550)
    expect(power).toBeGreaterThan(base)
  })
  it('uses 2023 weights correctly', () => {
    // Single player: 1 walk only, 1 PA
    expect(wOBA(1, 0, 0, 0, 0, 0, 1)).toBeCloseTo(0.69, 4)
    // 1 HBP, 1 PA
    expect(wOBA(0, 1, 0, 0, 0, 0, 1)).toBeCloseTo(0.72, 4)
    // 1 single, 1 PA
    expect(wOBA(0, 0, 1, 0, 0, 0, 1)).toBeCloseTo(0.89, 4)
    // 1 double, 1 PA
    expect(wOBA(0, 0, 0, 1, 0, 0, 1)).toBeCloseTo(1.27, 4)
    // 1 triple, 1 PA
    expect(wOBA(0, 0, 0, 0, 1, 0, 1)).toBeCloseTo(1.61, 4)
    // 1 HR, 1 PA
    expect(wOBA(0, 0, 0, 0, 0, 1, 1)).toBeCloseTo(2.10, 4)
  })
})

describe('wRCPlus', () => {
  it('returns 100 when wOBA equals league average', () => {
    expect(wRCPlus(0.320, 0.320, 1.15, 0.120, 1.0)).toBeCloseTo(100, 1)
  })
  it('returns >100 for above-average wOBA', () => {
    expect(wRCPlus(0.380, 0.320, 1.15, 0.120, 1.0)).toBeGreaterThan(100)
  })
  it('returns <100 for below-average wOBA', () => {
    expect(wRCPlus(0.270, 0.320, 1.15, 0.120, 1.0)).toBeLessThan(100)
  })
  it('adjusts downward for hitter-friendly park (PF > 1)', () => {
    const neutral = wRCPlus(0.380, 0.320, 1.15, 0.120, 1.0)
    const hitterPark = wRCPlus(0.380, 0.320, 1.15, 0.120, 1.1)
    expect(hitterPark).toBeLessThan(neutral)
  })
  it('returns 0 for zero wOBAscale', () => {
    expect(wRCPlus(0.320, 0.320, 0, 0.120, 1.0)).toBe(0)
  })
})

describe('BABIP', () => {
  it('calculates correctly for known values', () => {
    // (150 - 20) / (500 - 110 - 20 + 6) = 130 / 376
    expect(BABIP(150, 20, 500, 110, 6)).toBeCloseTo(130 / 376, 4)
  })
  it('returns 0 for zero denominator', () => {
    // All AB are HR or K
    expect(BABIP(100, 100, 100, 0, 0)).toBe(0)
  })
  it('is between 0 and 1 for normal values', () => {
    const result = BABIP(150, 20, 500, 110, 6)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })
  it('league average BABIP is around .300', () => {
    const result = BABIP(150, 20, 500, 110, 6)
    expect(result).toBeGreaterThan(0.25)
    expect(result).toBeLessThan(0.40)
  })
})

describe('isolatedPower', () => {
  it('calculates ISO correctly', () => {
    expect(isolatedPower(0.500, 0.300)).toBeCloseTo(0.200, 4)
  })
  it('is zero for singles-only hitter', () => {
    expect(isolatedPower(0.300, 0.300)).toBeCloseTo(0, 4)
  })
  it('elite power hitter has ISO above 0.250', () => {
    expect(isolatedPower(0.600, 0.300)).toBeGreaterThan(0.250)
  })
  it('can be negative (theoretically) for unusual stat lines', () => {
    expect(isolatedPower(0.200, 0.300)).toBeLessThan(0)
  })
})

describe('speedScore', () => {
  it('returns a value between 0 and 10', () => {
    const result = speedScore(30, 5, 80, 10, 150)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(10)
  })
  it('increases with more stolen bases', () => {
    expect(speedScore(50, 5, 80, 10, 150)).toBeGreaterThan(speedScore(5, 5, 30, 3, 150))
  })
  it('returns 0 for 0 games', () => {
    expect(speedScore(30, 5, 80, 10, 0)).toBe(0)
  })
  it('clamps to 0 for no SBs or triples', () => {
    expect(speedScore(0, 0, 0, 0, 162)).toBeGreaterThanOrEqual(0)
  })
})

describe('contactRate', () => {
  it('calculates correctly', () => {
    expect(contactRate(150, 200)).toBeCloseTo(0.75, 4)
  })
  it('returns 0 for 0 swings', () => {
    expect(contactRate(100, 0)).toBe(0)
  })
  it('returns 1.0 for perfect contact', () => {
    expect(contactRate(100, 100)).toBeCloseTo(1.0, 4)
  })
})

describe('walkRate', () => {
  it('calculates correctly', () => {
    expect(walkRate(60, 600)).toBeCloseTo(0.1, 4)
  })
  it('returns 0 for 0 PA', () => {
    expect(walkRate(10, 0)).toBe(0)
  })
  it('elite BB% is above 15%', () => {
    expect(walkRate(90, 550)).toBeGreaterThan(0.15)
  })
})

describe('strikeoutRate', () => {
  it('calculates correctly', () => {
    expect(strikeoutRate(150, 600)).toBeCloseTo(0.25, 4)
  })
  it('returns 0 for 0 PA', () => {
    expect(strikeoutRate(0, 0)).toBe(0)
  })
  it('high strikeout rate is above 30%', () => {
    expect(strikeoutRate(180, 550)).toBeGreaterThan(0.30)
  })
})

// ===========================================================================
// 2. Pitching statistics
// ===========================================================================

describe('ERA', () => {
  it('calculates ERA for known stats', () => {
    // 72 ER / 180 IP * 9 = 3.60
    expect(ERA(72, 180)).toBeCloseTo(3.60, 2)
  })
  it('returns 0 for 0 IP', () => {
    expect(ERA(5, 0)).toBe(0)
  })
  it('handles fractional innings (7.2)', () => {
    // 7.2 = 7+2/3 = 23/3 innings
    const ip = 7 + 2 / 3
    expect(ERA(3, 7.2)).toBeCloseTo((3 / ip) * 9, 3)
  })
  it('is higher for more earned runs', () => {
    expect(ERA(100, 180)).toBeGreaterThan(ERA(50, 180))
  })
  it('Cy Young ace has ERA below 2.50', () => {
    expect(ERA(45, 220)).toBeLessThan(2.50)
  })
})

describe('WHIP', () => {
  it('calculates WHIP correctly', () => {
    expect(WHIP(50, 160, 180)).toBeCloseTo(210 / 180, 3)
  })
  it('returns 0 for 0 IP', () => {
    expect(WHIP(5, 10, 0)).toBe(0)
  })
  it('ace has WHIP below 1.0', () => {
    expect(WHIP(40, 140, 200)).toBeLessThan(1.0)
  })
})

describe('FIP', () => {
  it('calculates FIP with default constant 3.15', () => {
    const numerator = 13 * 20 + 3 * (50 + 5) - 2 * 180
    expect(FIP(20, 50, 5, 180, 180)).toBeCloseTo(numerator / 180 + 3.15, 3)
  })
  it('is higher for HR-heavy pitcher', () => {
    expect(FIP(40, 50, 5, 180, 180)).toBeGreaterThan(FIP(20, 50, 5, 180, 180))
  })
  it('is lower for high-K pitcher', () => {
    expect(FIP(20, 50, 5, 250, 180)).toBeLessThan(FIP(20, 50, 5, 180, 180))
  })
  it('returns 0 for 0 IP', () => {
    expect(FIP(5, 20, 2, 100, 0)).toBe(0)
  })
  it('uses custom constant', () => {
    expect(FIP(10, 30, 3, 120, 100, 3.20)).toBeGreaterThan(FIP(10, 30, 3, 120, 100, 3.15))
  })
})

describe('xFIP', () => {
  it('uses expected HR from fly ball rate', () => {
    // With 200 FB and 0.103 rate: expectedHR = 20.6
    const expectedHR = 200 * 0.103
    const direct = FIP(expectedHR, 50, 5, 180, 180)
    expect(xFIP(200, 50, 5, 180, 180)).toBeCloseTo(direct, 3)
  })
  it('ignores actual HR count and uses flyBalls instead', () => {
    // Same flyBalls, different actual HR → same xFIP
    expect(xFIP(200, 50, 5, 180, 180)).toBeCloseTo(xFIP(200, 50, 5, 180, 180, 0.103), 3)
  })
  it('increases with more fly balls', () => {
    expect(xFIP(300, 50, 5, 180, 180)).toBeGreaterThan(xFIP(150, 50, 5, 180, 180))
  })
  it('returns 0 for 0 IP', () => {
    expect(xFIP(200, 50, 5, 180, 0)).toBe(0)
  })
  it('custom leagueFBHRRate changes result', () => {
    expect(xFIP(200, 50, 5, 180, 180, 0.120)).toBeGreaterThan(xFIP(200, 50, 5, 180, 180, 0.090))
  })
})

describe('SIERA', () => {
  it('returns a reasonable ERA-like value (1.5–7.0)', () => {
    const result = SIERA(180, 50, 220, 200, 180)
    expect(result).toBeGreaterThan(1.5)
    expect(result).toBeLessThan(7.0)
  })
  it('decreases with higher strikeout rate', () => {
    expect(SIERA(250, 50, 220, 200, 180)).toBeLessThan(SIERA(100, 50, 220, 200, 180))
  })
  it('increases with higher walk rate', () => {
    expect(SIERA(180, 80, 220, 200, 180)).toBeGreaterThan(SIERA(180, 30, 220, 200, 180))
  })
  it('returns 0 for 0 IP', () => {
    expect(SIERA(100, 30, 200, 150, 0)).toBe(0)
  })
  it('high-strikeout pitcher has lower SIERA than low-strikeout pitcher', () => {
    expect(SIERA(250, 50, 220, 200, 180)).toBeLessThan(SIERA(120, 50, 220, 200, 180))
  })
})

describe('strikeoutsPer9', () => {
  it('calculates K/9 correctly', () => {
    expect(strikeoutsPer9(180, 180)).toBeCloseTo(9.0, 3)
  })
  it('returns 0 for 0 IP', () => {
    expect(strikeoutsPer9(100, 0)).toBe(0)
  })
  it('elite reliever has >13 K/9', () => {
    expect(strikeoutsPer9(100, 60)).toBeGreaterThan(13)
  })
})

describe('walksPer9', () => {
  it('calculates BB/9 correctly', () => {
    expect(walksPer9(60, 180)).toBeCloseTo(3.0, 3)
  })
  it('returns 0 for 0 IP', () => {
    expect(walksPer9(30, 0)).toBe(0)
  })
})

describe('kBBRatio', () => {
  it('calculates K/BB correctly', () => {
    expect(kBBRatio(180, 50)).toBeCloseTo(3.6, 3)
  })
  it('returns Infinity when BB=0 and K>0', () => {
    expect(kBBRatio(150, 0)).toBe(Infinity)
  })
  it('returns 0 when both K and BB are 0', () => {
    expect(kBBRatio(0, 0)).toBe(0)
  })
  it('elite ratio is above 4.0', () => {
    expect(kBBRatio(200, 40)).toBeGreaterThan(4.0)
  })
})

describe('groundBallRate', () => {
  it('calculates correctly', () => {
    expect(groundBallRate(220, 500)).toBeCloseTo(0.44, 3)
  })
  it('returns 0 for 0 total BIP', () => {
    expect(groundBallRate(100, 0)).toBe(0)
  })
})

describe('flyBallRate', () => {
  it('calculates correctly', () => {
    expect(flyBallRate(200, 500)).toBeCloseTo(0.40, 3)
  })
  it('returns 0 for 0 total BIP', () => {
    expect(flyBallRate(100, 0)).toBe(0)
  })
})

describe('lineDriveRate', () => {
  it('calculates correctly', () => {
    expect(lineDriveRate(100, 500)).toBeCloseTo(0.20, 3)
  })
  it('returns 0 for 0 total BIP', () => {
    expect(lineDriveRate(50, 0)).toBe(0)
  })
})

// ===========================================================================
// 3. Fielding and defense
// ===========================================================================

describe('fieldingPercentage', () => {
  it('calculates correctly for known values', () => {
    // (400 + 120) / (400 + 120 + 10) = 520 / 530
    expect(fieldingPercentage(400, 120, 10)).toBeCloseTo(520 / 530, 4)
  })
  it('returns 0 for all zeroes', () => {
    expect(fieldingPercentage(0, 0, 0)).toBe(0)
  })
  it('returns 1.0 for perfect fielding', () => {
    expect(fieldingPercentage(400, 120, 0)).toBeCloseTo(1.0, 4)
  })
  it('SS fielding pct is typically above .970', () => {
    expect(fieldingPercentage(250, 450, 10)).toBeGreaterThan(0.970)
  })
})

describe('defensiveEfficiencyRatio', () => {
  it('calculates outs / BIP', () => {
    expect(defensiveEfficiencyRatio(500, 350)).toBeCloseTo(0.7, 3)
  })
  it('returns 0 for 0 BIP', () => {
    expect(defensiveEfficiencyRatio(0, 100)).toBe(0)
  })
  it('elite teams have DER above .720', () => {
    expect(defensiveEfficiencyRatio(500, 380)).toBeGreaterThan(0.72)
  })
})

describe('ultimateZoneRating', () => {
  it('is positive for above-average fielder', () => {
    expect(ultimateZoneRating(120, 100)).toBeGreaterThan(0)
  })
  it('is negative for below-average fielder', () => {
    expect(ultimateZoneRating(80, 100)).toBeLessThan(0)
  })
  it('is 0 for average fielder', () => {
    expect(ultimateZoneRating(100, 100)).toBe(0)
  })
  it('uses default run value 0.8', () => {
    expect(ultimateZoneRating(120, 100)).toBeCloseTo(16, 4) // 20 * 0.8
  })
  it('uses custom run value', () => {
    expect(ultimateZoneRating(120, 100, 1.0)).toBeCloseTo(20, 4)
  })
})

describe('totalZone', () => {
  it('calculates (PO+A-E) - expectedPuts', () => {
    expect(totalZone(400, 120, 10, 450)).toBeCloseTo(60, 4)
  })
  it('is negative when below expected', () => {
    expect(totalZone(300, 100, 10, 450)).toBeLessThan(0)
  })
})

// ===========================================================================
// 4. WAR components
// ===========================================================================

describe('winsAboveReplacement', () => {
  it('produces positive WAR for above-average player', () => {
    // offense 30, defense 5, positional 7.5, replacement -20.5
    const result = winsAboveReplacement(30, 5, 7.5, -20.5)
    expect(result).toBeGreaterThan(0)
  })
  it('produces ~0 WAR for replacement-level player', () => {
    expect(winsAboveReplacement(0, 0, 0, 0)).toBeCloseTo(0, 4)
  })
  it('uses custom runsPerWin', () => {
    const w1 = winsAboveReplacement(30, 5, 7.5, -20, 10)
    const w2 = winsAboveReplacement(30, 5, 7.5, -20, 12)
    expect(w1).toBeGreaterThan(w2)
  })
  it('returns 0 for runsPerWin=0', () => {
    expect(winsAboveReplacement(30, 5, 7.5, -20, 0)).toBe(0)
  })
  it('formula: (offense+defense+positional-replacement)/RPW', () => {
    expect(winsAboveReplacement(20, 5, 2.5, -10, 10)).toBeCloseTo(3.75, 4)
  })
})

describe('offensiveRunsAboveAverage', () => {
  it('returns positive for above-average wOBA', () => {
    expect(offensiveRunsAboveAverage(0.380, 0.320, 1.157, 600)).toBeGreaterThan(0)
  })
  it('returns negative for below-average wOBA', () => {
    expect(offensiveRunsAboveAverage(0.280, 0.320, 1.157, 600)).toBeLessThan(0)
  })
  it('returns 0 when wOBA equals league average', () => {
    expect(offensiveRunsAboveAverage(0.320, 0.320, 1.157, 600)).toBeCloseTo(0, 4)
  })
  it('scales with PA', () => {
    const full = offensiveRunsAboveAverage(0.380, 0.320, 1.157, 600)
    const half = offensiveRunsAboveAverage(0.380, 0.320, 1.157, 300)
    expect(full).toBeCloseTo(half * 2, 4)
  })
})

describe('defensiveRunsSaved', () => {
  it('is positive for above-average fielder', () => {
    expect(defensiveRunsSaved(120, 100)).toBeGreaterThan(0)
  })
  it('is negative for below-average fielder', () => {
    expect(defensiveRunsSaved(80, 100)).toBeLessThan(0)
  })
  it('is 0 for average fielder', () => {
    expect(defensiveRunsSaved(100, 100)).toBe(0)
  })
  it('uses default 0.8 runs per play', () => {
    expect(defensiveRunsSaved(120, 100)).toBeCloseTo(16, 4)
  })
  it('uses custom runsPerPlay', () => {
    expect(defensiveRunsSaved(120, 100, 1.0)).toBeCloseTo(20, 4)
  })
})

describe('replacementRunsDifferential', () => {
  it('returns negative value (replacement is below average)', () => {
    expect(replacementRunsDifferential(600)).toBeLessThan(0)
  })
  it('returns -12 for 600 PA at default -0.02', () => {
    expect(replacementRunsDifferential(600)).toBeCloseTo(-12, 4)
  })
  it('scales with PA', () => {
    expect(replacementRunsDifferential(600)).toBeCloseTo(replacementRunsDifferential(300) * 2, 4)
  })
  it('uses custom replacementLevel', () => {
    expect(replacementRunsDifferential(600, -0.03)).toBeCloseTo(-18, 4)
  })
})

// ===========================================================================
// 5. Park factors and adjustments
// ===========================================================================

describe('parkFactor', () => {
  it('returns 1.0 for equal run environments', () => {
    expect(parkFactor(400, 400, 81, 81)).toBeCloseTo(1.0, 4)
  })
  it('returns >1.0 for hitter-friendly park', () => {
    expect(parkFactor(500, 81, 400, 81)).toBeGreaterThan(1.0)
  })
  it('returns <1.0 for pitcher-friendly park', () => {
    expect(parkFactor(350, 81, 430, 81)).toBeLessThan(1.0)
  })
  it('returns 1.0 for 0 games', () => {
    expect(parkFactor(400, 400, 0, 81)).toBe(1.0)
  })
  it('Coors Field is above 1.10', () => {
    // Extreme hitter park: ~550 runs at home vs ~430 away
    expect(parkFactor(550, 81, 430, 81)).toBeGreaterThan(1.10)
  })
})

describe('adjustedParkFactor', () => {
  it('regresses toward 1.0', () => {
    const extreme = 1.20
    const adjusted = adjustedParkFactor(extreme)
    expect(adjusted).toBeGreaterThan(1.0)
    expect(adjusted).toBeLessThan(extreme)
  })
  it('returns ~1.0 for raw factor of 1.0', () => {
    expect(adjustedParkFactor(1.0)).toBeCloseTo(1.0, 4)
  })
  it('uses default 3 years', () => {
    // (1.2 * 3 + 1.0) / (3 + 1) = 4.6 / 4 = 1.15
    expect(adjustedParkFactor(1.2)).toBeCloseTo(1.15, 4)
  })
  it('fewer years = more regression toward 1.0', () => {
    // years=1: (1.2*1+1)/2 = 1.10; years=5: (1.2*5+1)/6 = 1.1667 — fewer years regresses more
    expect(adjustedParkFactor(1.20, 1)).toBeLessThan(adjustedParkFactor(1.20, 5))
  })
})

describe('altitudeAdjustment', () => {
  it('returns 1.0 for sea level', () => {
    expect(altitudeAdjustment(0)).toBeCloseTo(1.0, 4)
  })
  it('Coors Field (5280 ft) gets ~4% boost', () => {
    expect(altitudeAdjustment(5280)).toBeCloseTo(1.04, 4)
  })
  it('increases with elevation', () => {
    expect(altitudeAdjustment(5000)).toBeGreaterThan(altitudeAdjustment(1000))
  })
  it('formula: 1 + (elevation/5280) * 0.04', () => {
    expect(altitudeAdjustment(2640)).toBeCloseTo(1.02, 4)
  })
})

// ===========================================================================
// 6. Sabermetric advanced
// ===========================================================================

describe('pythagoreanWinPct', () => {
  it('returns 0.5 for equal runs', () => {
    expect(pythagoreanWinPct(700, 700)).toBeCloseTo(0.5, 4)
  })
  it('returns >0.5 when RS > RA', () => {
    expect(pythagoreanWinPct(900, 700)).toBeGreaterThan(0.5)
  })
  it('returns <0.5 when RS < RA', () => {
    expect(pythagoreanWinPct(700, 900)).toBeLessThan(0.5)
  })
  it('approaches 1 for RS >> RA', () => {
    expect(pythagoreanWinPct(1500, 300)).toBeGreaterThan(0.95)
  })
  it('returns 0.5 for both 0', () => {
    expect(pythagoreanWinPct(0, 0)).toBe(0.5)
  })
  it('returns 1.0 when RA is 0', () => {
    expect(pythagoreanWinPct(700, 0)).toBe(1)
  })
  it('returns 0 when RS is 0', () => {
    expect(pythagoreanWinPct(0, 700)).toBe(0)
  })
  it('uses custom exponent', () => {
    const default1 = pythagoreanWinPct(900, 700)
    const custom = pythagoreanWinPct(900, 700, 2.0)
    expect(Math.abs(default1 - custom)).toBeGreaterThan(0.001)
  })
})

describe('baseRuns', () => {
  it('returns a positive value for a full lineup', () => {
    const result = baseRuns(80, 25, 5, 20, 50, 8, 500, 110)
    expect(result).toBeGreaterThan(0)
  })
  it('increases with more home runs', () => {
    const low = baseRuns(80, 25, 5, 15, 50, 8, 500, 110)
    const high = baseRuns(80, 25, 5, 30, 50, 8, 500, 110)
    expect(high).toBeGreaterThan(low)
  })
  it('handles all zeros', () => {
    expect(baseRuns(0, 0, 0, 0, 0, 0, 0, 0)).toBeGreaterThanOrEqual(0)
  })
  it('returns at least HR count (HR always score)', () => {
    const hrs = 20
    const result = baseRuns(0, 0, 0, hrs, 0, 0, hrs * 4, 0)
    expect(result).toBeGreaterThanOrEqual(hrs)
  })
})

describe('linearWeightsRuns', () => {
  it('calculates a positive value for good offense', () => {
    expect(linearWeightsRuns(80, 25, 5, 20, 50, 300)).toBeGreaterThan(0)
  })
  it('is higher with more extra-base hits', () => {
    const base = linearWeightsRuns(80, 25, 5, 20, 50, 300)
    const power = linearWeightsRuns(60, 40, 10, 35, 50, 300)
    expect(power).toBeGreaterThan(base)
  })
  it('outs reduce the value', () => {
    expect(linearWeightsRuns(80, 25, 5, 20, 50, 400)).toBeLessThan(
      linearWeightsRuns(80, 25, 5, 20, 50, 200)
    )
  })
  it('uses correct linear weights', () => {
    // 1 single = 0.47
    expect(linearWeightsRuns(1, 0, 0, 0, 0, 0)).toBeCloseTo(0.47, 4)
    // 1 double = 0.78
    expect(linearWeightsRuns(0, 1, 0, 0, 0, 0)).toBeCloseTo(0.78, 4)
    // 1 HR = 1.40
    expect(linearWeightsRuns(0, 0, 0, 1, 0, 0)).toBeCloseTo(1.40, 4)
  })
})

describe('dRS', () => {
  it('is positive for above-average plays', () => {
    expect(dRS(120, 100)).toBeGreaterThan(0)
  })
  it('is negative for below-average plays', () => {
    expect(dRS(80, 100)).toBeLessThan(0)
  })
  it('is 0 for exactly average', () => {
    expect(dRS(100, 100)).toBe(0)
  })
  it('uses default 0.8 runs per play', () => {
    expect(dRS(120, 100)).toBeCloseTo(16, 4)
  })
  it('uses custom runsPerPlay', () => {
    expect(dRS(120, 100, 1.0)).toBeCloseTo(20, 4)
  })
})

// ===========================================================================
// 7. DraftKings fantasy scoring
// ===========================================================================

describe('dkBattingScore', () => {
  it('calculates correctly for a single', () => {
    expect(dkBattingScore(makeDKBatting({ singles: 1, rbi: 0, runs: 0 }))).toBeCloseTo(3, 4)
  })
  it('home run is worth 10 points', () => {
    const stats = makeDKBatting({ singles: 0, homeRuns: 1, rbi: 0, runs: 0 })
    expect(dkBattingScore(stats)).toBeCloseTo(10, 4)
  })
  it('triple is worth 8 points', () => {
    const stats = makeDKBatting({ singles: 0, triples: 1, rbi: 0, runs: 0 })
    expect(dkBattingScore(stats)).toBeCloseTo(8, 4)
  })
  it('stolen base adds 6 points', () => {
    const withSB = dkBattingScore(makeDKBatting({ stolenBases: 1 }))
    const withoutSB = dkBattingScore(makeDKBatting({ stolenBases: 0 }))
    expect(withSB - withoutSB).toBeCloseTo(6, 4)
  })
  it('caught stealing subtracts 3 points', () => {
    const withCS = dkBattingScore(makeDKBatting({ caughtStealing: 1 }))
    const withoutCS = dkBattingScore(makeDKBatting({ caughtStealing: 0 }))
    expect(withoutCS - withCS).toBeCloseTo(3, 4)
  })
  it('returns 0 for all zeros', () => {
    const stats: DKBattingStats = {
      singles: 0, doubles: 0, triples: 0, homeRuns: 0,
      rbi: 0, runs: 0, walks: 0, hbp: 0,
      stolenBases: 0, caughtStealing: 0,
    }
    expect(dkBattingScore(stats)).toBe(0)
  })
  it('RBI adds 3.5 points each', () => {
    const with2RBI = dkBattingScore(makeDKBatting({ rbi: 2 }))
    const with0RBI = dkBattingScore(makeDKBatting({ rbi: 0 }))
    expect(with2RBI - with0RBI).toBeCloseTo(7, 4)
  })
})

describe('dkPitchingScore', () => {
  it('win adds 4 points', () => {
    const withW = dkPitchingScore(makeDKPitching({ wins: 1 }))
    const withoutW = dkPitchingScore(makeDKPitching({ wins: 0 }))
    expect(withW - withoutW).toBeCloseTo(4, 4)
  })
  it('each strikeout adds 2 points', () => {
    const with5K = dkPitchingScore(makeDKPitching({ strikeouts: 5 }))
    const with10K = dkPitchingScore(makeDKPitching({ strikeouts: 10 }))
    expect(with10K - with5K).toBeCloseTo(10, 4)
  })
  it('earned run subtracts 2 points', () => {
    const with2ER = dkPitchingScore(makeDKPitching({ earnedRuns: 2 }))
    const with0ER = dkPitchingScore(makeDKPitching({ earnedRuns: 0 }))
    expect(with0ER - with2ER).toBeCloseTo(4, 4)
  })
  it('no-hitter bonus adds 5 points', () => {
    const withNH = dkPitchingScore(makeDKPitching({ noHitter: 1 }))
    const withoutNH = dkPitchingScore(makeDKPitching({ noHitter: 0 }))
    expect(withNH - withoutNH).toBeCloseTo(5, 4)
  })
  it('complete game adds 2.5 points', () => {
    const withCG = dkPitchingScore(makeDKPitching({ completeGame: 1 }))
    const withoutCG = dkPitchingScore(makeDKPitching({ completeGame: 0 }))
    expect(withCG - withoutCG).toBeCloseTo(2.5, 4)
  })
  it('calculates full line correctly', () => {
    // 2.25*6 + 2*7 + 4*1 - 2*2 - 0.6*5 - 0.6*2 - 0.6*0 + 0 + 0
    // = 13.5 + 14 + 4 - 4 - 3 - 1.2 - 0 = 23.3
    const stats = makeDKPitching()
    expect(dkPitchingScore(stats)).toBeCloseTo(23.3, 1)
  })
})

// ===========================================================================
// 8. Lineup and matchup analytics
// ===========================================================================

describe('lineupProtectionScore', () => {
  it('calculates prevOBP * thisSLG * 10', () => {
    expect(lineupProtectionScore(0.370, 0.550)).toBeCloseTo(0.370 * 0.550 * 10, 4)
  })
  it('clamps to 0 for negative inputs', () => {
    expect(lineupProtectionScore(-0.1, 0.5)).toBe(0)
  })
  it('clamps to 10 for extreme values', () => {
    expect(lineupProtectionScore(1.0, 2.0)).toBe(10)
  })
  it('is higher with better on-base percentage ahead', () => {
    const high = lineupProtectionScore(0.420, 0.550)
    const low = lineupProtectionScore(0.290, 0.550)
    expect(high).toBeGreaterThan(low)
  })
})

describe('platoonSplit', () => {
  const lefty = { avg: 0.260, obp: 0.330, slg: 0.420 } // vs LHP
  const righty = { avg: 0.280, obp: 0.360, slg: 0.480 } // vs RHP

  it('batter advantage when opposite-hand OPS >> same-hand OPS', () => {
    // LHB vs RHP: uses rightyStats as opposite; advantage = righty - lefty OPS
    const result = platoonSplit(lefty, righty, 'L') // vs LHP pitcher: same-hand=lefty, opp=righty
    expect(result.advantage).toBe('batter')
  })
  it('returns magnitude as absolute value of OPS diff', () => {
    const result = platoonSplit(lefty, righty, 'L')
    expect(result.magnitude).toBeGreaterThan(0)
  })
  it('returns neutral when OPS diff < 0.050', () => {
    const similar = { avg: 0.280, obp: 0.360, slg: 0.470 }
    const result = platoonSplit(similar, similar, 'R')
    expect(result.advantage).toBe('neutral')
  })
  it('pitcher advantage when same-hand OPS much higher than opposite', () => {
    // Batter hits much better against same-hand pitcher (unusual but testable)
    const bigSame = { avg: 0.300, obp: 0.400, slg: 0.550 }
    const smallOpposite = { avg: 0.240, obp: 0.300, slg: 0.350 }
    // vs R pitcher: same-hand=righty=bigSame, opp=lefty=smallOpposite
    const result = platoonSplit(smallOpposite, bigSame, 'R')
    expect(result.advantage).toBe('pitcher')
  })
})

describe('bulpenLoadIndex', () => {
  it('returns 0 for empty array', () => {
    expect(bulpenLoadIndex([])).toBe(0)
  })
  it('returns value between 0 and 1', () => {
    const result = bulpenLoadIndex([2, 1.5, 1, 0.5])
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
  it('increases with heavier individual loads', () => {
    expect(bulpenLoadIndex([3, 3, 3])).toBeGreaterThan(bulpenLoadIndex([1, 1, 1]))
  })
  it('single pitcher at max innings = 1', () => {
    expect(bulpenLoadIndex([3], 3)).toBeCloseTo(1, 4)
  })
  it('uses default maxInnings=3', () => {
    // pitcher at 1.5 IP: ratio = 0.5, squared = 0.25 / 1 = 0.25
    expect(bulpenLoadIndex([1.5])).toBeCloseTo(0.25, 4)
  })
})

describe('gameScoreV2', () => {
  it('perfect game 9IP, 27K, 0 BB, 0 H, 0 ER, 0 uER, 0 HR has very high score', () => {
    expect(gameScoreV2(9, 27, 0, 0, 0, 0, 0)).toBeGreaterThan(100)
  })
  it('increases with more strikeouts', () => {
    expect(gameScoreV2(7, 12, 2, 5, 2, 0, 0)).toBeGreaterThan(gameScoreV2(7, 6, 2, 5, 2, 0, 0))
  })
  it('decreases with more home runs allowed', () => {
    expect(gameScoreV2(7, 8, 2, 5, 2, 0, 0)).toBeGreaterThan(gameScoreV2(7, 8, 2, 5, 2, 0, 2))
  })
  it('formula: 40 + 2*(IP*3) + K - 2*BB - 2*H - 3*ER - 4*uER - 6*HR', () => {
    // 6 IP = 18 outs; 40 + 36 + 7 - 4 - 10 - 4 - 0 - 0 = 65
    expect(gameScoreV2(6, 7, 2, 5, 2, 0, 0)).toBeCloseTo(40 + 36 + 7 - 4 - 10 - 6 - 0 - 0, 1)
  })
  it('returns 40 for completely blank line (0 outs, 0 everything)', () => {
    expect(gameScoreV2(0, 0, 0, 0, 0, 0, 0)).toBe(40)
  })
})

// ===========================================================================
// Legacy backward-compat aliases
// ===========================================================================

describe('sluggingPct (legacy alias)', () => {
  it('same result as sluggingPercentage', () => {
    expect(sluggingPct(95, 30, 5, 20, 500)).toBeCloseTo(sluggingPercentage(95, 30, 5, 20, 500), 6)
  })
})

describe('babip (legacy alias)', () => {
  it('matches BABIP with correct arg order', () => {
    // babip(h, hr, so, ab, sf) -> BABIP(h, hr, ab, so, sf)
    expect(babip(150, 20, 110, 500, 6)).toBeCloseTo(BABIP(150, 20, 500, 110, 6), 6)
  })
})

describe('woba (BatterLine-based helper)', () => {
  it('produces a value in reasonable range', () => {
    const b = makeBatter()
    const w = woba(b)
    expect(w).toBeGreaterThan(0.280)
    expect(w).toBeLessThan(0.450)
  })
  it('returns 0 for 0 PA', () => {
    const b = makeBatter({ atBats: 0, walks: 0, hitByPitch: 0, sacrificeFlies: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0 })
    expect(woba(b)).toBe(0)
  })
})

describe('era (alias)', () => {
  it('matches ERA', () => {
    expect(era(72, 180)).toBeCloseTo(ERA(72, 180), 6)
  })
})

describe('fip (legacy alias with constant=3.10)', () => {
  it('calculates FIP with default constant 3.10', () => {
    const num = 13 * 20 + 3 * (50 + 5) - 2 * 180
    expect(fip(20, 50, 5, 180, 180)).toBeCloseTo(num / 180 + 3.10, 3)
  })
})

describe('kbb (legacy alias)', () => {
  it('returns 0 when both 0', () => {
    expect(kbb(0, 0)).toBe(0)
  })
  it('returns strikeout count when BB=0', () => {
    expect(kbb(150, 0)).toBe(150)
  })
})

describe('pythagWinPct (alias)', () => {
  it('matches pythagoreanWinPct', () => {
    expect(pythagWinPct(700, 700)).toBeCloseTo(pythagoreanWinPct(700, 700), 6)
  })
})

describe('WOBA_WEIGHTS constants', () => {
  it('has correct 2023-era values', () => {
    expect(WOBA_WEIGHTS.uBB).toBeCloseTo(0.690, 3)
    expect(WOBA_WEIGHTS.HBP).toBeCloseTo(0.722, 3)
    expect(WOBA_WEIGHTS.single).toBeCloseTo(0.888, 3)
    expect(WOBA_WEIGHTS.double).toBeCloseTo(1.271, 3)
    expect(WOBA_WEIGHTS.triple).toBeCloseTo(1.616, 3)
    expect(WOBA_WEIGHTS.HR).toBeCloseTo(2.101, 3)
  })
  it('has increasing weights', () => {
    expect(WOBA_WEIGHTS.uBB).toBeLessThan(WOBA_WEIGHTS.HBP)
    expect(WOBA_WEIGHTS.HBP).toBeLessThan(WOBA_WEIGHTS.single)
    expect(WOBA_WEIGHTS.single).toBeLessThan(WOBA_WEIGHTS.double)
    expect(WOBA_WEIGHTS.double).toBeLessThan(WOBA_WEIGHTS.triple)
    expect(WOBA_WEIGHTS.triple).toBeLessThan(WOBA_WEIGHTS.HR)
  })
})

// ===========================================================================
// Edge cases across all functions
// ===========================================================================

describe('edge cases', () => {
  it('battingAverage with negative at-bats returns 0', () => {
    expect(battingAverage(10, -1)).toBe(0)
  })
  it('ERA with 0 IP returns 0', () => {
    expect(ERA(5, 0)).toBe(0)
  })
  it('FIP with all zeros and 1 IP returns constant', () => {
    expect(FIP(0, 0, 0, 0, 1)).toBeCloseTo(3.15, 4)
  })
  it('pythagoreanWinPct always returns 0-1', () => {
    expect(pythagoreanWinPct(1000, 200)).toBeLessThanOrEqual(1)
    expect(pythagoreanWinPct(200, 1000)).toBeGreaterThanOrEqual(0)
  })
  it('kBBRatio returns Infinity for 0 BB > 0 K', () => {
    expect(kBBRatio(100, 0)).toBe(Infinity)
  })
  it('kBBRatio returns 0 for 0 K and 0 BB', () => {
    expect(kBBRatio(0, 0)).toBe(0)
  })
  it('speedScore clamped to [0,10]', () => {
    // extreme values
    expect(speedScore(100, 0, 200, 50, 10)).toBeLessThanOrEqual(10)
    expect(speedScore(0, 100, 0, 0, 162)).toBeGreaterThanOrEqual(0)
  })
  it('altitudeAdjustment at 0 ft is exactly 1', () => {
    expect(altitudeAdjustment(0)).toBe(1)
  })
  it('fieldingPercentage with all errors returns 0', () => {
    expect(fieldingPercentage(0, 0, 10)).toBe(0)
  })
  it('groundBallRate with 0 BIP returns 0', () => {
    expect(groundBallRate(100, 0)).toBe(0)
  })
  it('replacementRunsDifferential for 0 PA returns 0', () => {
    expect(replacementRunsDifferential(0)).toBeCloseTo(0, 10)
  })
  it('bulpenLoadIndex with one pitcher at 0 IP returns 0', () => {
    expect(bulpenLoadIndex([0])).toBe(0)
  })
  it('gameScoreV2 penalizes HR heavily', () => {
    const base = gameScoreV2(7, 8, 2, 5, 2, 0, 0)
    const withHR = gameScoreV2(7, 8, 2, 5, 2, 0, 3)
    expect(base - withHR).toBeCloseTo(18, 4) // 3 * 6 = 18
  })
  it('dkBattingScore doubles worth 5 pts each', () => {
    const with2D = dkBattingScore(makeDKBatting({ singles: 0, doubles: 2, rbi: 0, runs: 0 }))
    const with0D = dkBattingScore(makeDKBatting({ singles: 0, doubles: 0, rbi: 0, runs: 0 }))
    expect(with2D - with0D).toBeCloseTo(10, 4)
  })
  it('wOBA weights: triple > double', () => {
    expect(wOBA(0, 0, 0, 0, 1, 0, 1)).toBeGreaterThan(wOBA(0, 0, 0, 1, 0, 0, 1))
  })
  it('BABIP with 0 denominator returns 0', () => {
    expect(BABIP(50, 50, 50, 0, 0)).toBe(0)
  })
  it('lineupProtectionScore with 0 obp returns 0', () => {
    expect(lineupProtectionScore(0, 0.500)).toBe(0)
  })
  it('offensiveRunsAboveAverage with 0 wOBAscale returns 0', () => {
    expect(offensiveRunsAboveAverage(0.380, 0.320, 0, 600)).toBe(0)
  })
})

// ===========================================================================
// Run expectancy (legacy)
// ===========================================================================

describe('runExpectancy', () => {
  it('bases loaded no outs is highest RE', () => {
    expect(runExpectancy(0, '111')).toBeGreaterThan(runExpectancy(0, '000'))
  })
  it('more outs reduces RE', () => {
    expect(runExpectancy(0, '100')).toBeGreaterThan(runExpectancy(1, '100'))
    expect(runExpectancy(1, '100')).toBeGreaterThan(runExpectancy(2, '100'))
  })
})

describe('re24', () => {
  it('home run from empty bases is positive', () => {
    expect(re24(0, '000', '000', 0, 1)).toBeGreaterThan(0)
  })
  it('strikeout is negative', () => {
    expect(re24(0, '000', '000', 1, 0)).toBeLessThan(0)
  })
})
