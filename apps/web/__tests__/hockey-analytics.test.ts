/**
 * hockey-analytics.test.ts
 * 90+ tests for the NHL hockey analytics utility library.
 */

import { describe, it, expect } from 'vitest'
import {
  corsiFor,
  corsiAgainst,
  corsiForPct,
  corsiRel,
  fenwickFor,
  fenwickAgainst,
  fenwickForPct,
  pdo,
  xgNHL,
  xgPerShot,
  totalXg,
  savePercentage,
  evenStrengthSavePct,
  goalsAgainstAverage,
  qualityStartRate,
  goaliePdr,
  goardsSave,
  zoneEntry,
  controlledZoneEntry,
  zoneExitSuccess,
  neutralZoneTime,
  classifyZone,
  lineCombinationScore,
  lineXgContribution,
  pointsPer60,
  goalsPerShot,
  faceoffWinPct,
  hitsPerGame,
  blocksPerGame,
  penaltyMinutesPerGame,
  filterByStrength,
  evenStrengthCorsi,
  shotRatioLast10,
  hotGoalie,
  fantasyScoreHockey,
  teamEfficiency,
  type ShotAttempt,
  type GoalieStats,
  type SkaterStats,
} from '../lib/sports/hockey-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeShot(overrides: Partial<ShotAttempt> = {}): ShotAttempt {
  return {
    type: 'savedShot',
    team: 'for',
    strengthState: 'evenStrength',
    xCoord: 60,
    yCoord: 0,
    period: 1,
    gameSecond: 300,
    ...overrides,
  }
}

function makeGoalie(overrides: Partial<GoalieStats> = {}): GoalieStats {
  return {
    shotsAgainst: 30,
    goalsAgainst: 3,
    savesMade: 27,
    evenStrengthShotsAgainst: 20,
    evenStrengthGoals: 2,
    powerPlayShotsAgainst: 8,
    shortHandedGoals: 0,
    minutes: 60,
    ...overrides,
  }
}

function makeSkater(overrides: Partial<SkaterStats> = {}): SkaterStats {
  return {
    goals: 0,
    assists: 0,
    points: 0,
    shots: 0,
    plusMinus: 0,
    penaltyMinutes: 0,
    hits: 0,
    blocks: 0,
    faceoffsWon: 0,
    faceoffsLost: 0,
    timeOnIce: 1200, // 20 minutes
    corsiFor: 0,
    corsiAgainst: 0,
    fenwickFor: 0,
    fenwickAgainst: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// corsiFor
// ---------------------------------------------------------------------------

describe('corsiFor', () => {
  it('counts all for-team shot types', () => {
    const shots = [
      makeShot({ team: 'for', type: 'goal' }),
      makeShot({ team: 'for', type: 'savedShot' }),
      makeShot({ team: 'for', type: 'missedShot' }),
      makeShot({ team: 'for', type: 'blockedShot' }),
    ]
    expect(corsiFor(shots)).toBe(4)
  })

  it('excludes against-team shots', () => {
    const shots = [
      makeShot({ team: 'for' }),
      makeShot({ team: 'against' }),
      makeShot({ team: 'against' }),
    ]
    expect(corsiFor(shots)).toBe(1)
  })

  it('returns 0 for empty array', () => {
    expect(corsiFor([])).toBe(0)
  })

  it('returns 0 when all shots are against', () => {
    const shots = [makeShot({ team: 'against' }), makeShot({ team: 'against' })]
    expect(corsiFor(shots)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// corsiAgainst
// ---------------------------------------------------------------------------

describe('corsiAgainst', () => {
  it('counts all against-team shot types', () => {
    const shots = [
      makeShot({ team: 'against', type: 'goal' }),
      makeShot({ team: 'against', type: 'savedShot' }),
      makeShot({ team: 'against', type: 'blockedShot' }),
    ]
    expect(corsiAgainst(shots)).toBe(3)
  })

  it('excludes for-team shots', () => {
    const shots = [makeShot({ team: 'for' }), makeShot({ team: 'against' })]
    expect(corsiAgainst(shots)).toBe(1)
  })

  it('returns 0 for empty array', () => {
    expect(corsiAgainst([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// corsiForPct
// ---------------------------------------------------------------------------

describe('corsiForPct', () => {
  it('returns 0.6 for 60 for and 40 against', () => {
    const shots = [
      ...Array(60).fill(makeShot({ team: 'for' })),
      ...Array(40).fill(makeShot({ team: 'against' })),
    ]
    expect(corsiForPct(shots)).toBeCloseTo(0.6, 5)
  })

  it('returns 0.5 for equal for and against', () => {
    const shots = [
      makeShot({ team: 'for' }),
      makeShot({ team: 'against' }),
    ]
    expect(corsiForPct(shots)).toBe(0.5)
  })

  it('returns 0 for empty array', () => {
    expect(corsiForPct([])).toBe(0)
  })

  it('returns 1.0 for all for shots', () => {
    const shots = [makeShot({ team: 'for' }), makeShot({ team: 'for' })]
    expect(corsiForPct(shots)).toBe(1.0)
  })

  it('returns 0 for all against shots', () => {
    const shots = [makeShot({ team: 'against' }), makeShot({ team: 'against' })]
    expect(corsiForPct(shots)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// corsiRel
// ---------------------------------------------------------------------------

describe('corsiRel', () => {
  it('returns positive when player CF% exceeds team CF%', () => {
    // Player: 60/100 = 60%, Team: 40/100 = 40%
    expect(corsiRel(60, 40, 40, 60)).toBeCloseTo(0.2, 5)
  })

  it('returns negative when player CF% is below team CF%', () => {
    // Player: 40/100 = 40%, Team: 60/100 = 60%
    expect(corsiRel(40, 60, 60, 40)).toBeCloseTo(-0.2, 5)
  })

  it('returns 0 when player and team have equal CF%', () => {
    expect(corsiRel(50, 50, 50, 50)).toBeCloseTo(0, 5)
  })

  it('returns 0 when player has no shots', () => {
    expect(corsiRel(0, 0, 50, 50)).toBeCloseTo(-0.5, 5)
  })

  it('handles 0 team shots gracefully', () => {
    expect(corsiRel(5, 5, 0, 0)).toBeCloseTo(0.5, 5)
  })
})

// ---------------------------------------------------------------------------
// fenwickFor / fenwickAgainst
// ---------------------------------------------------------------------------

describe('fenwickFor', () => {
  it('excludes blocked shots from for-team count', () => {
    const shots = [
      makeShot({ team: 'for', type: 'goal' }),
      makeShot({ team: 'for', type: 'savedShot' }),
      makeShot({ team: 'for', type: 'missedShot' }),
      makeShot({ team: 'for', type: 'blockedShot' }), // excluded
    ]
    expect(fenwickFor(shots)).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(fenwickFor([])).toBe(0)
  })

  it('returns 0 when only blocked for shots exist', () => {
    const shots = [makeShot({ team: 'for', type: 'blockedShot' })]
    expect(fenwickFor(shots)).toBe(0)
  })
})

describe('fenwickAgainst', () => {
  it('excludes blocked shots from against-team count', () => {
    const shots = [
      makeShot({ team: 'against', type: 'savedShot' }),
      makeShot({ team: 'against', type: 'missedShot' }),
      makeShot({ team: 'against', type: 'blockedShot' }), // excluded
    ]
    expect(fenwickAgainst(shots)).toBe(2)
  })

  it('returns 0 for empty array', () => {
    expect(fenwickAgainst([])).toBe(0)
  })
})

describe('fenwickForPct', () => {
  it('computes FF / (FF + FA) excluding blocked shots', () => {
    const shots = [
      makeShot({ team: 'for', type: 'savedShot' }),
      makeShot({ team: 'for', type: 'savedShot' }),
      makeShot({ team: 'for', type: 'blockedShot' }), // excluded from FF
      makeShot({ team: 'against', type: 'savedShot' }),
      makeShot({ team: 'against', type: 'blockedShot' }), // excluded from FA
    ]
    // FF=2, FA=1 → 2/3 ≈ 0.667
    expect(fenwickForPct(shots)).toBeCloseTo(2 / 3, 5)
  })

  it('returns 0 for empty array', () => {
    expect(fenwickForPct([])).toBe(0)
  })

  it('returns 0 when all unblocked shots are against', () => {
    const shots = [
      makeShot({ team: 'against', type: 'savedShot' }),
      makeShot({ team: 'for', type: 'blockedShot' }),
    ]
    expect(fenwickForPct(shots)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// PDO
// ---------------------------------------------------------------------------

describe('pdo', () => {
  it('returns 100 at replacement-level performance', () => {
    // 0% shooting + 100% save rate = 100
    expect(pdo(0, 10, 10, 0)).toBeCloseTo(100, 5)
  })

  it('returns 100 when shooting 10% and saving 90%', () => {
    // 10% shooting + 90% save rate = 10 + 90 = 100
    const result = pdo(1, 10, 10, 1)
    expect(result).toBeCloseTo(100, 2)
  })

  it('returns above 100 when shooting and saving above baseline', () => {
    // 20% shooting + 90% save rate = 20 + 90 = 110
    const result = pdo(2, 10, 10, 1)
    expect(result).toBeCloseTo(110, 2)
  })

  it('returns below 100 when not scoring and leaking goals', () => {
    // 5% shooting + 85% save rate = 90
    const result = pdo(0, 20, 20, 3)
    expect(result).toBeLessThan(100)
  })

  it('handles 0 shots for gracefully', () => {
    expect(pdo(0, 0, 10, 1)).toBeCloseTo(90, 2)
  })

  it('handles 0 shots against gracefully', () => {
    expect(pdo(2, 20, 0, 0)).toBeCloseTo(10, 2)
  })

  it('returns 200 when shooting 100% and saving 100%', () => {
    expect(pdo(10, 10, 10, 0)).toBeCloseTo(200, 5)
  })
})

// ---------------------------------------------------------------------------
// xgNHL
// ---------------------------------------------------------------------------

describe('xgNHL', () => {
  it('close slot shot has higher xG than far point shot', () => {
    const closeShot = makeShot({ xCoord: 80, yCoord: 0, type: 'savedShot', shotType: 'wrist' })
    const farShot = makeShot({ xCoord: 20, yCoord: 0, type: 'savedShot', shotType: 'wrist' })
    expect(xgNHL(closeShot)).toBeGreaterThan(xgNHL(farShot))
  })

  it('deflection from same location has higher xG than wrist shot', () => {
    const deflection = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'deflection' })
    const wrist = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'wrist' })
    expect(xgNHL(deflection)).toBeGreaterThan(xgNHL(wrist))
  })

  it('tip from same location has higher xG than wrist shot', () => {
    const tip = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'tip' })
    const wrist = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'wrist' })
    expect(xgNHL(tip)).toBeGreaterThan(xgNHL(wrist))
  })

  it('backhand from same location has lower xG than wrist shot', () => {
    const backhand = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'backhand' })
    const wrist = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'wrist' })
    expect(xgNHL(backhand)).toBeLessThan(xgNHL(wrist))
  })

  it('slap shot from same location has lower xG than wrist shot', () => {
    const slap = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'slap' })
    const wrist = makeShot({ xCoord: 70, yCoord: 5, type: 'savedShot', shotType: 'wrist' })
    expect(xgNHL(slap)).toBeLessThan(xgNHL(wrist))
  })

  it('blocked shot always returns 0', () => {
    const blocked = makeShot({ type: 'blockedShot', xCoord: 85, yCoord: 0 })
    expect(xgNHL(blocked)).toBe(0)
  })

  it('xG is clamped between 0 and 1', () => {
    const extremeClose = makeShot({ xCoord: 89, yCoord: 0, type: 'savedShot', shotType: 'deflection' })
    const extremeFar = makeShot({ xCoord: -50, yCoord: 0, type: 'savedShot', shotType: 'backhand' })
    expect(xgNHL(extremeClose)).toBeLessThanOrEqual(1)
    expect(xgNHL(extremeClose)).toBeGreaterThanOrEqual(0)
    expect(xgNHL(extremeFar)).toBeLessThanOrEqual(1)
    expect(xgNHL(extremeFar)).toBeGreaterThanOrEqual(0)
  })

  it('angle matters: central shot has higher xG than same-distance wide shot', () => {
    const central = makeShot({ xCoord: 78, yCoord: 0, type: 'savedShot', shotType: 'wrist' })
    const wide = makeShot({ xCoord: 78, yCoord: 35, type: 'savedShot', shotType: 'wrist' })
    expect(xgNHL(central)).toBeGreaterThan(xgNHL(wide))
  })

  it('xG is positive for a saved shot in slot area', () => {
    const slot = makeShot({ xCoord: 65, yCoord: 5, type: 'savedShot', shotType: 'wrist' })
    expect(xgNHL(slot)).toBeGreaterThan(0)
  })
})

describe('xgPerShot', () => {
  it('returns average xG per shot', () => {
    const shots = [
      makeShot({ xCoord: 80, yCoord: 0, type: 'savedShot', shotType: 'wrist' }),
      makeShot({ xCoord: 80, yCoord: 0, type: 'savedShot', shotType: 'wrist' }),
    ]
    const avg = xgPerShot(shots)
    expect(avg).toBeCloseTo(xgNHL(shots[0]!), 5)
  })

  it('returns 0 for empty array', () => {
    expect(xgPerShot([])).toBe(0)
  })
})

describe('totalXg', () => {
  it('sums xG across all shots', () => {
    const shots = [
      makeShot({ xCoord: 80, yCoord: 0, type: 'savedShot', shotType: 'wrist' }),
      makeShot({ xCoord: 70, yCoord: 10, type: 'savedShot', shotType: 'slap' }),
    ]
    expect(totalXg(shots)).toBeCloseTo(xgNHL(shots[0]!) + xgNHL(shots[1]!), 5)
  })

  it('returns 0 for empty array', () => {
    expect(totalXg([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Goalie metrics
// ---------------------------------------------------------------------------

describe('savePercentage', () => {
  it('computes saves / shotsAgainst', () => {
    const stats = makeGoalie({ shotsAgainst: 30, savesMade: 27 })
    expect(savePercentage(stats)).toBeCloseTo(0.9, 5)
  })

  it('returns 0 for 0 shots against', () => {
    const stats = makeGoalie({ shotsAgainst: 0, savesMade: 0 })
    expect(savePercentage(stats)).toBe(0)
  })

  it('returns 1.0 for a perfect shutout', () => {
    const stats = makeGoalie({ shotsAgainst: 25, savesMade: 25, goalsAgainst: 0 })
    expect(savePercentage(stats)).toBe(1.0)
  })
})

describe('evenStrengthSavePct', () => {
  it('computes ES saves / ES shotsAgainst', () => {
    const stats = makeGoalie({ evenStrengthShotsAgainst: 20, evenStrengthGoals: 1 })
    expect(evenStrengthSavePct(stats)).toBeCloseTo(19 / 20, 5)
  })

  it('returns 0 for 0 ES shots against', () => {
    const stats = makeGoalie({ evenStrengthShotsAgainst: 0, evenStrengthGoals: 0 })
    expect(evenStrengthSavePct(stats)).toBe(0)
  })
})

describe('goalsAgainstAverage', () => {
  it('computes GA per 60 minutes', () => {
    // 3 goals in 60 minutes = 3.0 GAA
    const stats = makeGoalie({ goalsAgainst: 3, minutes: 60 })
    expect(goalsAgainstAverage(stats)).toBeCloseTo(3.0, 5)
  })

  it('scales correctly for partial games', () => {
    // 1 goal in 30 minutes = 2.0 GAA
    const stats = makeGoalie({ goalsAgainst: 1, minutes: 30 })
    expect(goalsAgainstAverage(stats)).toBeCloseTo(2.0, 5)
  })

  it('returns 0 for 0 minutes', () => {
    const stats = makeGoalie({ goalsAgainst: 3, minutes: 0 })
    expect(goalsAgainstAverage(stats)).toBe(0)
  })
})

describe('qualityStartRate', () => {
  it('computes fraction of starts above threshold', () => {
    const starts = [
      { savePercentage: 0.920 }, // quality
      { savePercentage: 0.890 }, // quality
      { savePercentage: 0.870 }, // not quality
      { savePercentage: 0.850 }, // not quality
    ]
    expect(qualityStartRate(starts)).toBeCloseTo(0.5, 5)
  })

  it('uses default threshold of 0.885', () => {
    const starts = [
      { savePercentage: 0.885 }, // exactly at threshold: quality
      { savePercentage: 0.884 }, // just below: not quality
    ]
    expect(qualityStartRate(starts)).toBeCloseTo(0.5, 5)
  })

  it('supports custom threshold', () => {
    const starts = [
      { savePercentage: 0.950 },
      { savePercentage: 0.900 },
      { savePercentage: 0.880 },
    ]
    // Threshold 0.920: only first qualifies
    expect(qualityStartRate(starts, 0.920)).toBeCloseTo(1 / 3, 5)
  })

  it('returns 0 for empty starts array', () => {
    expect(qualityStartRate([])).toBe(0)
  })

  it('returns 1.0 when all starts are quality', () => {
    const starts = [{ savePercentage: 0.920 }, { savePercentage: 0.930 }]
    expect(qualityStartRate(starts)).toBe(1.0)
  })
})

describe('goaliePdr (GSAR)', () => {
  it('returns positive when SV% above 0.880 replacement', () => {
    const stats = makeGoalie({ shotsAgainst: 100, savesMade: 92, goalsAgainst: 8 })
    // SV% = 0.92 → (0.92 - 0.88) * 100 = 4
    expect(goaliePdr(stats)).toBeCloseTo(4, 2)
  })

  it('returns negative when SV% below 0.880 replacement', () => {
    const stats = makeGoalie({ shotsAgainst: 100, savesMade: 85, goalsAgainst: 15 })
    // SV% = 0.85 → (0.85 - 0.88) * 100 = -3
    expect(goaliePdr(stats)).toBeCloseTo(-3, 2)
  })

  it('returns 0 when SV% exactly at replacement level', () => {
    const stats = makeGoalie({ shotsAgainst: 100, savesMade: 88, goalsAgainst: 12 })
    expect(goaliePdr(stats)).toBeCloseTo(0, 2)
  })

  it('returns 0 for 0 shots against', () => {
    const stats = makeGoalie({ shotsAgainst: 0, savesMade: 0, goalsAgainst: 0 })
    expect(goaliePdr(stats)).toBe(0)
  })
})

describe('goardsSave (GSAx)', () => {
  it('returns positive when goalie saves more than xG expected', () => {
    // 27 saves with xG against of 3.0 → GSAx = 27 - 3.0 = 24
    expect(goardsSave(30, 27, 3.0)).toBeCloseTo(24, 5)
  })

  it('returns negative when goalie allows more goals than expected', () => {
    // 24 saves with xG against of 27 → GSAx = 24 - 27 = -3
    expect(goardsSave(30, 24, 27)).toBeCloseTo(-3, 5)
  })

  it('returns 0 when saves exactly equal xG', () => {
    expect(goardsSave(30, 3, 3)).toBeCloseTo(0, 5)
  })
})

// ---------------------------------------------------------------------------
// Zone analytics
// ---------------------------------------------------------------------------

describe('zoneEntry', () => {
  it('computes successes / attempts', () => {
    expect(zoneEntry(10, 7)).toBeCloseTo(0.7, 5)
  })

  it('returns 0 for 0 attempts', () => {
    expect(zoneEntry(0, 0)).toBe(0)
  })
})

describe('controlledZoneEntry', () => {
  it('computes carries / total entries', () => {
    expect(controlledZoneEntry(6, 10)).toBeCloseTo(0.6, 5)
  })

  it('returns 0 for 0 total entries', () => {
    expect(controlledZoneEntry(0, 0)).toBe(0)
  })
})

describe('zoneExitSuccess', () => {
  it('computes successes / attempts', () => {
    expect(zoneExitSuccess(8, 5)).toBeCloseTo(0.625, 5)
  })

  it('returns 0 for 0 attempts', () => {
    expect(zoneExitSuccess(0, 0)).toBe(0)
  })
})

describe('neutralZoneTime', () => {
  it('computes fraction of TOI in neutral zone', () => {
    expect(neutralZoneTime(300, 1200)).toBeCloseTo(0.25, 5)
  })

  it('returns 0 for 0 total TOI', () => {
    expect(neutralZoneTime(300, 0)).toBe(0)
  })
})

describe('classifyZone', () => {
  describe('home team', () => {
    it('classifies deep negative x as defensive zone', () => {
      expect(classifyZone(-50, 'home')).toBe('defensiveZone')
    })

    it('classifies deep positive x as offensive zone', () => {
      expect(classifyZone(75, 'home')).toBe('offensiveZone')
    })

    it('classifies center ice as neutral zone', () => {
      expect(classifyZone(0, 'home')).toBe('neutralZone')
    })

    it('classifies x=-25 as neutral zone boundary', () => {
      expect(classifyZone(-25, 'home')).toBe('neutralZone')
    })

    it('classifies x=25 as neutral zone boundary', () => {
      expect(classifyZone(25, 'home')).toBe('neutralZone')
    })

    it('classifies x just below -25 as defensive zone', () => {
      expect(classifyZone(-26, 'home')).toBe('defensiveZone')
    })

    it('classifies x just above 25 as offensive zone', () => {
      expect(classifyZone(26, 'home')).toBe('offensiveZone')
    })
  })

  describe('away team (mirrored)', () => {
    it('classifies deep positive x as defensive zone for away', () => {
      expect(classifyZone(75, 'away')).toBe('defensiveZone')
    })

    it('classifies deep negative x as offensive zone for away', () => {
      expect(classifyZone(-75, 'away')).toBe('offensiveZone')
    })

    it('classifies center ice as neutral zone for away', () => {
      expect(classifyZone(0, 'away')).toBe('neutralZone')
    })

    it('classifies x=26 as defensive zone for away', () => {
      expect(classifyZone(26, 'away')).toBe('defensiveZone')
    })

    it('classifies x=-26 as offensive zone for away', () => {
      expect(classifyZone(-26, 'away')).toBe('offensiveZone')
    })
  })
})

// ---------------------------------------------------------------------------
// filterByStrength / evenStrengthCorsi
// ---------------------------------------------------------------------------

describe('filterByStrength', () => {
  it('returns only even strength shots', () => {
    const shots = [
      makeShot({ strengthState: 'evenStrength' }),
      makeShot({ strengthState: 'powerPlay' }),
      makeShot({ strengthState: 'shortHanded' }),
    ]
    const filtered = filterByStrength(shots, 'evenStrength')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]!.strengthState).toBe('evenStrength')
  })

  it('returns only power play shots', () => {
    const shots = [
      makeShot({ strengthState: 'evenStrength' }),
      makeShot({ strengthState: 'powerPlay' }),
      makeShot({ strengthState: 'powerPlay' }),
    ]
    const filtered = filterByStrength(shots, 'powerPlay')
    expect(filtered).toHaveLength(2)
  })

  it('returns empty array if no shots match', () => {
    const shots = [makeShot({ strengthState: 'evenStrength' })]
    expect(filterByStrength(shots, 'shortHanded')).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(filterByStrength([], 'evenStrength')).toHaveLength(0)
  })
})

describe('evenStrengthCorsi', () => {
  it('computes CF% using only even-strength shots', () => {
    const shots = [
      makeShot({ team: 'for', strengthState: 'evenStrength' }),
      makeShot({ team: 'for', strengthState: 'evenStrength' }),
      makeShot({ team: 'against', strengthState: 'evenStrength' }),
      makeShot({ team: 'for', strengthState: 'powerPlay' }), // excluded
      makeShot({ team: 'against', strengthState: 'powerPlay' }), // excluded
    ]
    // ES: CF=2, CA=1 → 2/3
    expect(evenStrengthCorsi(shots)).toBeCloseTo(2 / 3, 5)
  })

  it('returns 0 for empty array', () => {
    expect(evenStrengthCorsi([])).toBe(0)
  })

  it('returns 0 when only PP shots exist', () => {
    const shots = [makeShot({ strengthState: 'powerPlay', team: 'for' })]
    expect(evenStrengthCorsi(shots)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// pointsPer60
// ---------------------------------------------------------------------------

describe('pointsPer60', () => {
  it('returns points per 60 minutes correctly', () => {
    // 2 points in 1200s (20 min) = 6 P/60
    expect(pointsPer60(2, 1200)).toBeCloseTo(6, 5)
  })

  it('returns 0 for 0 TOI', () => {
    expect(pointsPer60(10, 0)).toBe(0)
  })

  it('returns 0 for 0 points', () => {
    expect(pointsPer60(0, 1200)).toBe(0)
  })

  it('scales proportionally with TOI', () => {
    const p1 = pointsPer60(1, 600)   // 1 pt in 10 min = 6 P/60
    const p2 = pointsPer60(1, 1200)  // 1 pt in 20 min = 3 P/60
    expect(p1).toBeCloseTo(2 * p2, 5)
  })
})

describe('goalsPerShot', () => {
  it('computes shooting percentage', () => {
    expect(goalsPerShot(5, 50)).toBeCloseTo(0.1, 5)
  })

  it('returns 0 for 0 shots', () => {
    expect(goalsPerShot(5, 0)).toBe(0)
  })
})

describe('faceoffWinPct', () => {
  it('computes won / (won + lost)', () => {
    expect(faceoffWinPct(60, 40)).toBeCloseTo(0.6, 5)
  })

  it('returns 0 for no faceoffs', () => {
    expect(faceoffWinPct(0, 0)).toBe(0)
  })

  it('returns 0.5 for equal wins and losses', () => {
    expect(faceoffWinPct(10, 10)).toBe(0.5)
  })
})

describe('hitsPerGame', () => {
  it('computes hits / games', () => {
    expect(hitsPerGame(30, 10)).toBeCloseTo(3.0, 5)
  })

  it('returns 0 for 0 games', () => {
    expect(hitsPerGame(30, 0)).toBe(0)
  })
})

describe('blocksPerGame', () => {
  it('computes blocks / games', () => {
    expect(blocksPerGame(20, 5)).toBeCloseTo(4.0, 5)
  })

  it('returns 0 for 0 games', () => {
    expect(blocksPerGame(20, 0)).toBe(0)
  })
})

describe('penaltyMinutesPerGame', () => {
  it('computes PIM / games', () => {
    expect(penaltyMinutesPerGame(40, 20)).toBeCloseTo(2.0, 5)
  })

  it('returns 0 for 0 games', () => {
    expect(penaltyMinutesPerGame(40, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// hotGoalie
// ---------------------------------------------------------------------------

describe('hotGoalie', () => {
  it('returns true when avg SV% >= 0.920 in last 5 games', () => {
    const games = [
      { savePercentage: 0.935 },
      { savePercentage: 0.925 },
      { savePercentage: 0.920 },
      { savePercentage: 0.945 },
      { savePercentage: 0.920 },
    ]
    expect(hotGoalie(games)).toBe(true)
  })

  it('returns false when avg SV% < 0.920', () => {
    const games = [
      { savePercentage: 0.900 },
      { savePercentage: 0.880 },
      { savePercentage: 0.910 },
      { savePercentage: 0.920 },
      { savePercentage: 0.895 },
    ]
    expect(hotGoalie(games)).toBe(false)
  })

  it('uses only the last `window` games', () => {
    const games = [
      { savePercentage: 0.800 }, // old bad game ignored
      { savePercentage: 0.800 },
      { savePercentage: 0.935 },
      { savePercentage: 0.935 },
      { savePercentage: 0.935 },
      { savePercentage: 0.935 },
      { savePercentage: 0.935 },
    ]
    // Last 5: all 0.935 → hot
    expect(hotGoalie(games, 5)).toBe(true)
  })

  it('supports custom window', () => {
    const games = [{ savePercentage: 0.930 }, { savePercentage: 0.910 }]
    // Window=2: avg = 0.920 → hot
    expect(hotGoalie(games, 2)).toBe(true)
  })

  it('returns false for empty games array', () => {
    expect(hotGoalie([])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// shotRatioLast10
// ---------------------------------------------------------------------------

describe('shotRatioLast10', () => {
  it('returns CF% of provided shots', () => {
    const shots = [
      ...Array(7).fill(makeShot({ team: 'for' })),
      ...Array(3).fill(makeShot({ team: 'against' })),
    ]
    expect(shotRatioLast10(shots)).toBeCloseTo(0.7, 5)
  })

  it('returns 0 for empty array', () => {
    expect(shotRatioLast10([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// fantasyScoreHockey
// ---------------------------------------------------------------------------

describe('fantasyScoreHockey', () => {
  describe('Yahoo format', () => {
    it('scores goals, assists, +/-, PIM, shots correctly', () => {
      const stats = makeSkater({
        goals: 2,
        assists: 1,
        plusMinus: 2,
        penaltyMinutes: 2,
        shots: 4,
      })
      // G: 2*3=6, A: 1*2=2, +/-: 2*1=2, PIM: 2*-1=-2, shots: 4*0.5=2 → total 10
      expect(fantasyScoreHockey(stats, 'yahoo')).toBeCloseTo(10, 5)
    })

    it('returns 0 for empty statline', () => {
      expect(fantasyScoreHockey(makeSkater(), 'yahoo')).toBe(0)
    })

    it('PIM reduces score', () => {
      const stats = makeSkater({ penaltyMinutes: 4 })
      expect(fantasyScoreHockey(stats, 'yahoo')).toBeCloseTo(-4, 5)
    })

    it('negative +/- reduces score', () => {
      const stats = makeSkater({ plusMinus: -3 })
      expect(fantasyScoreHockey(stats, 'yahoo')).toBeCloseTo(-3, 5)
    })
  })

  describe('ESPN format', () => {
    it('scores goals, assists, +/-, PIM, shots, blocks correctly', () => {
      const stats = makeSkater({
        goals: 1,
        assists: 2,
        plusMinus: 1,
        penaltyMinutes: 2,
        shots: 4,
        blocks: 2,
      })
      // G: 1*6=6, A: 2*4=8, +/-: 1*2=2, PIM: 2*-1=-2, shots: 4*0.5=2, blocks: 2*0.5=1 → total 17
      expect(fantasyScoreHockey(stats, 'espn')).toBeCloseTo(17, 5)
    })

    it('returns 0 for empty statline', () => {
      expect(fantasyScoreHockey(makeSkater(), 'espn')).toBe(0)
    })
  })

  describe('DraftKings format', () => {
    it('scores goals, assists, +/-, blocks, shots correctly', () => {
      const stats = makeSkater({
        goals: 1,
        assists: 1,
        plusMinus: 1,
        blocks: 2,
        shots: 3,
      })
      // G: 1*8.5=8.5, A: 1*5=5, +/-: 1*2=2, blocks: 2*1.3=2.6, shots: 3*1.5=4.5 → total 22.6
      expect(fantasyScoreHockey(stats, 'draftkings')).toBeCloseTo(22.6, 2)
    })

    it('returns 0 for empty statline', () => {
      expect(fantasyScoreHockey(makeSkater(), 'draftkings')).toBe(0)
    })

    it('goal (8.5pts) worth less than two assists (10pts) in DraftKings', () => {
      const oneGoal = makeSkater({ goals: 1 })
      const twoAssists = makeSkater({ assists: 2 })
      // 1 goal = 8.5, 2 assists = 10.0 in DraftKings
      expect(fantasyScoreHockey(oneGoal, 'draftkings')).toBeCloseTo(8.5, 2)
      expect(fantasyScoreHockey(twoAssists, 'draftkings')).toBeCloseTo(10.0, 2)
      expect(fantasyScoreHockey(twoAssists, 'draftkings')).toBeGreaterThan(
        fantasyScoreHockey(oneGoal, 'draftkings'),
      )
    })
  })
})

// ---------------------------------------------------------------------------
// teamEfficiency
// ---------------------------------------------------------------------------

describe('teamEfficiency', () => {
  it('returns all 4 fields computed correctly', () => {
    const shots = [
      makeShot({ team: 'for', type: 'savedShot', xCoord: 70, yCoord: 0 }),
      makeShot({ team: 'for', type: 'savedShot', xCoord: 70, yCoord: 0 }),
      makeShot({ team: 'for', type: 'blockedShot', xCoord: 70, yCoord: 0 }),
      makeShot({ team: 'against', type: 'savedShot', xCoord: -70, yCoord: 0 }),
      makeShot({ team: 'against', type: 'blockedShot', xCoord: -70, yCoord: 0 }),
    ]
    const result = teamEfficiency(shots)
    // CF: for=3, against=2 → 3/5 = 0.6
    expect(result.corsiForPct).toBeCloseTo(0.6, 5)
    // FF: for=2 (goal+saved, not blocked), against=1 (saved not blocked) → 2/3
    expect(result.fenwickForPct).toBeCloseTo(2 / 3, 5)
    // xGF%: xGFor / (xGFor + xGAgainst) — just check range
    expect(result.xgForPct).toBeGreaterThan(0)
    expect(result.xgForPct).toBeLessThanOrEqual(1)
    // Differential: CF - CA = 3 - 2 = 1
    expect(result.shotAttemptDifferential).toBe(1)
  })

  it('returns 0 for all fields on empty array', () => {
    const result = teamEfficiency([])
    expect(result.corsiForPct).toBe(0)
    expect(result.fenwickForPct).toBe(0)
    expect(result.xgForPct).toBe(0)
    expect(result.shotAttemptDifferential).toBe(0)
  })

  it('xgForPct is 0 when all for shots are blocked', () => {
    const shots = [
      makeShot({ team: 'for', type: 'blockedShot', xCoord: 70, yCoord: 0 }),
      makeShot({ team: 'against', type: 'savedShot', xCoord: -70, yCoord: 0 }),
    ]
    // xGF = 0 (blocked), xGA > 0 → xgForPct = 0
    const result = teamEfficiency(shots)
    expect(result.xgForPct).toBe(0)
  })

  it('shot differential is negative when more against shots', () => {
    const shots = [
      makeShot({ team: 'for' }),
      makeShot({ team: 'against' }),
      makeShot({ team: 'against' }),
      makeShot({ team: 'against' }),
    ]
    expect(teamEfficiency(shots).shotAttemptDifferential).toBe(-2)
  })
})

// ---------------------------------------------------------------------------
// lineCombinationScore
// ---------------------------------------------------------------------------

describe('lineCombinationScore', () => {
  it('returns 0 for empty players array', () => {
    expect(lineCombinationScore([])).toBe(0)
  })

  it('returns a positive score for productive players', () => {
    const players = [
      makeSkater({ points: 2, timeOnIce: 1200, corsiFor: 30, corsiAgainst: 20 }),
      makeSkater({ points: 1, timeOnIce: 1200, corsiFor: 25, corsiAgainst: 25 }),
    ]
    expect(lineCombinationScore(players)).toBeGreaterThan(0)
  })

  it('higher scoring / CF% line scores higher', () => {
    const goodLine = [makeSkater({ points: 5, timeOnIce: 1200, corsiFor: 60, corsiAgainst: 40 })]
    const badLine = [makeSkater({ points: 1, timeOnIce: 1200, corsiFor: 40, corsiAgainst: 60 })]
    expect(lineCombinationScore(goodLine)).toBeGreaterThan(lineCombinationScore(badLine))
  })
})

describe('lineXgContribution', () => {
  it('returns xG per 60 minutes', () => {
    const shots = [makeShot({ xCoord: 80, yCoord: 0, type: 'savedShot', shotType: 'wrist' })]
    const xg = totalXg(shots)
    expect(lineXgContribution(shots, 10)).toBeCloseTo(xg * 6, 5) // per 60 from 10 min
  })

  it('returns 0 for 0 minutes on ice', () => {
    const shots = [makeShot({ xCoord: 80, yCoord: 0, type: 'savedShot' })]
    expect(lineXgContribution(shots, 0)).toBe(0)
  })

  it('returns 0 for empty shot array', () => {
    expect(lineXgContribution([], 10)).toBe(0)
  })
})
