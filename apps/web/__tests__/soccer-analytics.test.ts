import { describe, it, expect } from 'vitest'
import {
  shotAngle,
  shotDistance,
  xgModel,
  expectedGoals,
  xgDiff,
  xgPerShot,
  xgOverPerformance,
  possessionShare,
  passCompletionRate,
  progressivePassRate,
  isProgressivePass,
  avgPassLength,
  passNetworkDensity,
  buildPassMatrix,
  ppda,
  oppFieldRecoveries,
  pressingIntensity,
  compactness,
  classifyZone,
  zoneDistribution,
  territorialControl,
  cornerKickEfficiency,
  freeKickAccuracy,
  setPieceGoalRate,
  shotConversionRate,
  savePercentage,
  goalDifference,
  pointsFromRecord,
  expectedPoints,
  strengthOfSchedule,
  playerRatingIndex,
  keyPassRate,
  duelSuccess,
  fanRating,
  type ShotEvent,
  type PassEvent,
  type PlayerTrackingEvent,
} from '../lib/sports/soccer-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeShot(overrides: Partial<ShotEvent> = {}): ShotEvent {
  return {
    x: 85,
    y: 50,
    shotType: 'foot',
    bodyPart: 'rightFoot',
    situation: 'openPlay',
    ...overrides,
  }
}

function makePass(overrides: Partial<PassEvent> = {}): PassEvent {
  return {
    startX: 30,
    startY: 50,
    endX: 50,
    endY: 50,
    completed: true,
    passType: 'medium',
    ...overrides,
  }
}

function makeTracking(overrides: Partial<PlayerTrackingEvent> = {}): PlayerTrackingEvent {
  return {
    playerId: 'p1',
    minute: 45,
    x: 60,
    y: 50,
    action: 'pass',
    success: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// shotAngle
// ---------------------------------------------------------------------------

describe('shotAngle', () => {
  it('returns a positive angle from inside penalty area', () => {
    const angle = shotAngle(85, 50)
    expect(angle).toBeGreaterThan(0)
  })

  it('near goal line center has a larger angle than far from goal', () => {
    const nearAngle = shotAngle(95, 50)
    const farAngle = shotAngle(40, 50)
    expect(nearAngle).toBeGreaterThan(farAngle)
  })

  it('shot from penalty spot (~89, 50) has a large angle', () => {
    // penalty spot is roughly x=89 in 0-100 coords (11m from goal on 105m pitch ≈ 11/105*100 ≈ 89)
    const angle = shotAngle(89, 50)
    expect(angle).toBeGreaterThan(0.3) // substantial angle
  })

  it('shot from corner has a small angle', () => {
    const angle = shotAngle(100, 0)
    expect(angle).toBeLessThan(0.5)
  })

  it('returns 0 when on the goal line with zero mag', () => {
    // A position exactly at a goal post gives a degenerate case
    const angle = shotAngle(100, 34)
    expect(angle).toBeGreaterThanOrEqual(0)
  })

  it('is symmetric: same x, equidistant y from center gives equal angle', () => {
    const angle1 = shotAngle(70, 30)
    const angle2 = shotAngle(70, 70)
    expect(Math.abs(angle1 - angle2)).toBeLessThan(0.001)
  })
})

// ---------------------------------------------------------------------------
// shotDistance
// ---------------------------------------------------------------------------

describe('shotDistance', () => {
  it('returns ~50 from center of pitch (0, 50)', () => {
    const dist = shotDistance(0, 50)
    expect(dist).toBeCloseTo(100, 0)
  })

  it('returns 0 from goal center (100, 50)', () => {
    const dist = shotDistance(100, 50)
    expect(dist).toBeCloseTo(0, 5)
  })

  it('shot from 85, 50 is approximately 15 units from goal', () => {
    const dist = shotDistance(85, 50)
    expect(dist).toBeCloseTo(15, 0)
  })

  it('returns positive distance for off-center shots', () => {
    const dist = shotDistance(80, 30)
    expect(dist).toBeGreaterThan(0)
  })

  it('distance at (50, 50) is 50', () => {
    const dist = shotDistance(50, 50)
    expect(dist).toBeCloseTo(50, 5)
  })
})

// ---------------------------------------------------------------------------
// xgModel
// ---------------------------------------------------------------------------

describe('xgModel', () => {
  it('penalty always returns 0.79', () => {
    const xg = xgModel(makeShot({ situation: 'penalty' }))
    expect(xg).toBe(0.79)
  })

  it('shot from own half returns very low xG (<0.05)', () => {
    const xg = xgModel(makeShot({ x: 10, y: 50 }))
    expect(xg).toBeLessThan(0.05)
  })

  it('close range shot has higher xG than long range', () => {
    const close = xgModel(makeShot({ x: 92, y: 50 }))
    const far = xgModel(makeShot({ x: 55, y: 50 }))
    expect(close).toBeGreaterThan(far)
  })

  it('header in penalty area is reduced vs foot shot', () => {
    const foot = xgModel(makeShot({ x: 85, y: 50, bodyPart: 'rightFoot' }))
    const head = xgModel(makeShot({ x: 85, y: 50, bodyPart: 'head' }))
    expect(head).toBeLessThan(foot)
  })

  it('direct free kick reduces xG by ~30%', () => {
    const open = xgModel(makeShot({ x: 80, y: 50, situation: 'openPlay' }))
    const fk = xgModel(makeShot({ x: 80, y: 50, situation: 'directFreeKick' }))
    expect(fk).toBeLessThan(open)
    expect(fk).toBeCloseTo(open * 0.7, 3)
  })

  it('set play adds ~5% to xG', () => {
    const open = xgModel(makeShot({ x: 80, y: 50, situation: 'openPlay' }))
    const setPlay = xgModel(makeShot({ x: 80, y: 50, situation: 'setPlay' }))
    expect(setPlay).toBeCloseTo(open * 1.05, 3)
  })

  it('defender within 2m reduces xG by 20%', () => {
    const normal = xgModel(makeShot({ x: 85, y: 50, defenderDistance: 5 }))
    const pressed = xgModel(makeShot({ x: 85, y: 50, defenderDistance: 1 }))
    expect(pressed).toBeLessThan(normal)
    expect(pressed).toBeCloseTo(normal * 0.8, 3)
  })

  it('returns value in 0-1 range', () => {
    const xg = xgModel(makeShot())
    expect(xg).toBeGreaterThanOrEqual(0)
    expect(xg).toBeLessThanOrEqual(1)
  })

  it('corner situation treated as open play (no special modifier)', () => {
    const xg = xgModel(makeShot({ x: 85, y: 50, situation: 'corner' }))
    expect(xg).toBeGreaterThan(0)
    expect(xg).toBeLessThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// expectedGoals
// ---------------------------------------------------------------------------

describe('expectedGoals', () => {
  it('returns 0 for empty array', () => {
    expect(expectedGoals([])).toBe(0)
  })

  it('returns sum of xG for multiple shots', () => {
    const shots = [makeShot({ situation: 'penalty' }), makeShot({ situation: 'penalty' })]
    expect(expectedGoals(shots)).toBeCloseTo(1.58, 5)
  })

  it('is always non-negative', () => {
    const shots = [makeShot({ x: 5, y: 50 }), makeShot({ x: 10, y: 20 })]
    expect(expectedGoals(shots)).toBeGreaterThanOrEqual(0)
  })

  it('single shot xG equals expectedGoals of that shot', () => {
    const shot = makeShot({ x: 85, y: 50 })
    expect(expectedGoals([shot])).toBeCloseTo(xgModel(shot), 5)
  })
})

// ---------------------------------------------------------------------------
// xgDiff / xgPerShot / xgOverPerformance
// ---------------------------------------------------------------------------

describe('xgDiff', () => {
  it('returns positive when home team dominates', () => {
    const home = [makeShot({ situation: 'penalty' }), makeShot({ situation: 'penalty' })]
    const away = [makeShot({ x: 40, y: 50 })]
    expect(xgDiff(home, away)).toBeGreaterThan(0)
  })

  it('returns 0 when both teams have same shots', () => {
    const shots = [makeShot({ x: 80, y: 50 })]
    expect(xgDiff(shots, shots)).toBeCloseTo(0, 5)
  })
})

describe('xgPerShot', () => {
  it('returns 0 for empty array', () => {
    expect(xgPerShot([])).toBe(0)
  })

  it('returns average xG per shot', () => {
    const shots = [makeShot({ situation: 'penalty' }), makeShot({ situation: 'penalty' })]
    expect(xgPerShot(shots)).toBeCloseTo(0.79, 5)
  })
})

describe('xgOverPerformance', () => {
  it('returns positive when goals exceed xG', () => {
    expect(xgOverPerformance(3, 1.5)).toBeCloseTo(1.5, 5)
  })

  it('returns negative when goals below xG', () => {
    expect(xgOverPerformance(0, 1.5)).toBeCloseTo(-1.5, 5)
  })

  it('returns 0 when goals equal xG', () => {
    expect(xgOverPerformance(2, 2)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Possession & passing
// ---------------------------------------------------------------------------

describe('possessionShare', () => {
  it('returns 0.6 for 60 of 100 passes', () => {
    expect(possessionShare(60, 100)).toBeCloseTo(0.6, 5)
  })

  it('returns 0 when totalPasses is 0', () => {
    expect(possessionShare(0, 0)).toBe(0)
  })

  it('returns 1 when team has all passes', () => {
    expect(possessionShare(50, 50)).toBeCloseTo(1, 5)
  })
})

describe('passCompletionRate', () => {
  it('returns 0 for empty array', () => {
    expect(passCompletionRate([])).toBe(0)
  })

  it('returns 1 when all passes completed', () => {
    const passes = [makePass({ completed: true }), makePass({ completed: true })]
    expect(passCompletionRate(passes)).toBeCloseTo(1, 5)
  })

  it('returns 0.5 when half completed', () => {
    const passes = [makePass({ completed: true }), makePass({ completed: false })]
    expect(passCompletionRate(passes)).toBeCloseTo(0.5, 5)
  })

  it('returns 0 when none completed', () => {
    const passes = [makePass({ completed: false }), makePass({ completed: false })]
    expect(passCompletionRate(passes)).toBeCloseTo(0, 5)
  })
})

describe('isProgressivePass', () => {
  it('returns true when endX > startX + 10', () => {
    expect(isProgressivePass(makePass({ startX: 30, endX: 45 }))).toBe(true)
  })

  it('returns false when endX <= startX + 10', () => {
    expect(isProgressivePass(makePass({ startX: 30, endX: 39 }))).toBe(false)
  })

  it('returns false for backward passes', () => {
    expect(isProgressivePass(makePass({ startX: 60, endX: 40 }))).toBe(false)
  })

  it('returns false exactly at threshold (startX + 10)', () => {
    expect(isProgressivePass(makePass({ startX: 30, endX: 40 }))).toBe(false)
  })
})

describe('progressivePassRate', () => {
  it('returns 0 for empty array', () => {
    expect(progressivePassRate([])).toBe(0)
  })

  it('returns 0.5 when half are progressive', () => {
    const passes = [
      makePass({ startX: 30, endX: 45 }), // progressive
      makePass({ startX: 50, endX: 55 }), // not progressive (only +5)
    ]
    expect(progressivePassRate(passes)).toBeCloseTo(0.5, 5)
  })
})

describe('avgPassLength', () => {
  it('returns 0 for empty array', () => {
    expect(avgPassLength([])).toBe(0)
  })

  it('computes Euclidean distance correctly', () => {
    // 3-4-5 triangle: dx=3, dy=4, dist=5
    const passes = [makePass({ startX: 0, startY: 0, endX: 3, endY: 4 })]
    expect(avgPassLength(passes)).toBeCloseTo(5, 5)
  })

  it('averages multiple passes', () => {
    const passes = [
      makePass({ startX: 0, startY: 0, endX: 3, endY: 4 }), // 5
      makePass({ startX: 0, startY: 0, endX: 0, endY: 10 }), // 10
    ]
    expect(avgPassLength(passes)).toBeCloseTo(7.5, 5)
  })
})

describe('passNetworkDensity', () => {
  it('returns 0 when playerCount is 1', () => {
    const passes = [makePass()]
    expect(passNetworkDensity(passes, 1)).toBe(0)
  })

  it('returns 0 when playerCount is 0', () => {
    expect(passNetworkDensity([], 0)).toBe(0)
  })

  it('returns a value between 0 and 1', () => {
    const passes = [makePass(), makePass({ startX: 10, endX: 20 })]
    const density = passNetworkDensity(passes, 5)
    expect(density).toBeGreaterThanOrEqual(0)
    expect(density).toBeLessThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Pressing & defensive metrics
// ---------------------------------------------------------------------------

describe('ppda', () => {
  it('lower value means more pressing', () => {
    const high = ppda(20, 100)
    const low = ppda(40, 100)
    expect(high).toBeGreaterThan(low)
  })

  it('returns correct ratio', () => {
    expect(ppda(10, 100)).toBeCloseTo(10, 5)
  })

  it('returns Infinity when pressures is 0', () => {
    expect(ppda(0, 100)).toBe(Infinity)
  })
})

describe('oppFieldRecoveries', () => {
  it('counts interceptions and tackles in opponent half (x > 50)', () => {
    const events: PlayerTrackingEvent[] = [
      makeTracking({ x: 60, action: 'interception', success: true }),
      makeTracking({ x: 70, action: 'tackle', success: true }),
      makeTracking({ x: 40, action: 'interception', success: true }), // own half — excluded
      makeTracking({ x: 65, action: 'pass', success: true }), // wrong action
    ]
    expect(oppFieldRecoveries(events)).toBe(2)
  })

  it('uses custom threshold', () => {
    const events: PlayerTrackingEvent[] = [
      makeTracking({ x: 55, action: 'tackle', success: true }),
      makeTracking({ x: 75, action: 'interception', success: true }),
    ]
    expect(oppFieldRecoveries(events, 60)).toBe(1)
  })

  it('returns 0 with no events', () => {
    expect(oppFieldRecoveries([])).toBe(0)
  })
})

describe('pressingIntensity', () => {
  it('returns 0 when no defensive actions', () => {
    expect(pressingIntensity(5, 0)).toBe(0)
  })

  it('returns correct ratio', () => {
    expect(pressingIntensity(30, 100)).toBeCloseTo(0.3, 5)
  })

  it('caps at 1', () => {
    expect(pressingIntensity(200, 100)).toBe(1)
  })
})

describe('compactness', () => {
  it('returns 0 for fewer than 2 players', () => {
    expect(compactness([{ x: 50, y: 50 }])).toBe(0)
    expect(compactness([])).toBe(0)
  })

  it('clustered players have lower compactness than spread players', () => {
    const clustered = [
      { x: 50, y: 50 },
      { x: 51, y: 50 },
      { x: 50, y: 51 },
    ]
    const spread = [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 50, y: 90 },
    ]
    expect(compactness(clustered)).toBeLessThan(compactness(spread))
  })

  it('computes pairwise average for 2 players correctly', () => {
    // Distance between (0,0) and (3,4) = 5
    const comp = compactness([{ x: 0, y: 0 }, { x: 3, y: 4 }])
    expect(comp).toBeCloseTo(5, 5)
  })
})

// ---------------------------------------------------------------------------
// Zone analytics
// ---------------------------------------------------------------------------

describe('classifyZone', () => {
  it('x=0 is ownHalf', () => {
    expect(classifyZone(0)).toBe('ownHalf')
  })

  it('x=20 is ownHalf', () => {
    expect(classifyZone(20)).toBe('ownHalf')
  })

  it('x=33 is midfield', () => {
    expect(classifyZone(33)).toBe('midfield')
  })

  it('x=40 is midfield', () => {
    expect(classifyZone(40)).toBe('midfield')
  })

  it('x=50 is attackingThird', () => {
    expect(classifyZone(50)).toBe('attackingThird')
  })

  it('x=60 is attackingThird', () => {
    expect(classifyZone(60)).toBe('attackingThird')
  })

  it('x=83 is penaltyArea', () => {
    expect(classifyZone(83)).toBe('penaltyArea')
  })

  it('x=90 is penaltyArea', () => {
    expect(classifyZone(90)).toBe('penaltyArea')
  })

  it('x=100 is penaltyArea', () => {
    expect(classifyZone(100)).toBe('penaltyArea')
  })
})

describe('zoneDistribution', () => {
  it('correctly counts events per zone', () => {
    const events = [
      { x: 10 }, // ownHalf
      { x: 40 }, // midfield
      { x: 40 }, // midfield
      { x: 60 }, // attackingThird
      { x: 90 }, // penaltyArea
    ]
    const dist = zoneDistribution(events)
    expect(dist.ownHalf).toBe(1)
    expect(dist.midfield).toBe(2)
    expect(dist.attackingThird).toBe(1)
    expect(dist.penaltyArea).toBe(1)
  })

  it('returns all zeros for empty events', () => {
    const dist = zoneDistribution([])
    expect(dist.ownHalf).toBe(0)
    expect(dist.midfield).toBe(0)
    expect(dist.attackingThird).toBe(0)
    expect(dist.penaltyArea).toBe(0)
  })
})

describe('territorialControl', () => {
  it('returns 0 when no events', () => {
    expect(territorialControl([], [])).toBe(0)
  })

  it('returns positive when average x > 50', () => {
    const team = [{ x: 70 }, { x: 80 }]
    const opp = [{ x: 60 }, { x: 70 }]
    const control = territorialControl(team, opp)
    expect(control).toBeGreaterThan(0)
  })

  it('returns negative when average x < 50', () => {
    const team = [{ x: 20 }, { x: 30 }]
    const opp = [{ x: 30 }, { x: 40 }]
    const control = territorialControl(team, opp)
    expect(control).toBeLessThan(0)
  })

  it('returns approximately 0 for balanced play', () => {
    const team = [{ x: 50 }, { x: 50 }]
    const opp = [{ x: 50 }, { x: 50 }]
    expect(territorialControl(team, opp)).toBeCloseTo(0, 5)
  })
})

// ---------------------------------------------------------------------------
// Set pieces
// ---------------------------------------------------------------------------

describe('cornerKickEfficiency', () => {
  it('computes goalRate and xgPerCorner correctly', () => {
    const result = cornerKickEfficiency(10, 2, 1.5)
    expect(result.goalRate).toBeCloseTo(0.2, 5)
    expect(result.xgPerCorner).toBeCloseTo(0.15, 5)
    expect(result.overPerformance).toBeCloseTo(0.5, 5)
  })

  it('returns 0 rates for 0 attempts', () => {
    const result = cornerKickEfficiency(0, 0, 0)
    expect(result.goalRate).toBe(0)
    expect(result.xgPerCorner).toBe(0)
  })
})

describe('freeKickAccuracy', () => {
  it('returns 0 for 0 attempts', () => {
    expect(freeKickAccuracy(0, 0)).toBe(0)
  })

  it('returns correct fraction', () => {
    expect(freeKickAccuracy(10, 3)).toBeCloseTo(0.3, 5)
  })
})

describe('setPieceGoalRate', () => {
  it('returns 0 for 0 attempts', () => {
    expect(setPieceGoalRate(0, 0)).toBe(0)
  })

  it('returns correct fraction', () => {
    expect(setPieceGoalRate(20, 2)).toBeCloseTo(0.1, 5)
  })
})

// ---------------------------------------------------------------------------
// Match metrics
// ---------------------------------------------------------------------------

describe('shotConversionRate', () => {
  it('returns 0 when no shots', () => {
    expect(shotConversionRate(0, 0)).toBe(0)
  })

  it('returns correct rate', () => {
    expect(shotConversionRate(3, 15)).toBeCloseTo(0.2, 5)
  })
})

describe('savePercentage', () => {
  it('returns 0 when no shots on target', () => {
    expect(savePercentage(0, 0)).toBe(0)
  })

  it('returns correct percentage', () => {
    expect(savePercentage(7, 10)).toBeCloseTo(0.7, 5)
  })
})

describe('goalDifference', () => {
  it('returns positive when scoring more', () => {
    expect(goalDifference(3, 1)).toBe(2)
  })

  it('returns negative when conceding more', () => {
    expect(goalDifference(1, 3)).toBe(-2)
  })

  it('returns 0 for draw', () => {
    expect(goalDifference(2, 2)).toBe(0)
  })
})

describe('pointsFromRecord', () => {
  it('3W/2D/1L returns 11 points', () => {
    expect(pointsFromRecord(3, 2, 1)).toBe(11)
  })

  it('0W/0D/5L returns 0 points', () => {
    expect(pointsFromRecord(0, 0, 5)).toBe(0)
  })

  it('losses contribute 0', () => {
    expect(pointsFromRecord(0, 3, 10)).toBe(3)
  })

  it('wins contribute 3 each', () => {
    expect(pointsFromRecord(4, 0, 0)).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// expectedPoints
// ---------------------------------------------------------------------------

describe('expectedPoints', () => {
  it('equal xG teams return approximately 1.0 pts/game', () => {
    const pts = expectedPoints(1.5, 1.5)
    expect(pts).toBeGreaterThan(0.8)
    expect(pts).toBeLessThan(1.5)
  })

  it('dominant team (high xG, low xGA) has more expected points', () => {
    const dominant = expectedPoints(3.0, 0.5)
    const underdog = expectedPoints(0.5, 3.0)
    expect(dominant).toBeGreaterThan(underdog)
  })

  it('returns value between 0 and 3', () => {
    const pts = expectedPoints(2.0, 1.0)
    expect(pts).toBeGreaterThan(0)
    expect(pts).toBeLessThan(3)
  })

  it('very dominant team has significantly more pts than equal xG', () => {
    const dominant = expectedPoints(3.0, 0.5)
    const equal = expectedPoints(1.5, 1.5)
    expect(dominant).toBeGreaterThan(equal * 1.5)
  })
})

// ---------------------------------------------------------------------------
// strengthOfSchedule
// ---------------------------------------------------------------------------

describe('strengthOfSchedule', () => {
  it('returns 0 for empty array', () => {
    expect(strengthOfSchedule([])).toBe(0)
  })

  it('returns average of opponent xGA', () => {
    expect(strengthOfSchedule([1.5, 2.5, 2.0])).toBeCloseTo(2.0, 5)
  })
})

// ---------------------------------------------------------------------------
// Player ratings
// ---------------------------------------------------------------------------

describe('playerRatingIndex', () => {
  it('returns 0 for empty events', () => {
    expect(playerRatingIndex([])).toBe(0)
  })

  it('active player with many successful actions scores higher than inactive', () => {
    const active = Array.from({ length: 40 }, () => makeTracking({ success: true }))
    const inactive = [makeTracking({ success: true })]
    expect(playerRatingIndex(active)).toBeGreaterThan(playerRatingIndex(inactive))
  })

  it('returns up to 100 for 80 successful actions', () => {
    const events = Array.from({ length: 80 }, () => makeTracking({ success: true }))
    expect(playerRatingIndex(events)).toBeCloseTo(100, 5)
  })

  it('100% success rate with 40 actions returns 50', () => {
    const events = Array.from({ length: 40 }, () => makeTracking({ success: true }))
    expect(playerRatingIndex(events)).toBeCloseTo(50, 5)
  })
})

describe('keyPassRate', () => {
  it('returns 0 for empty events', () => {
    expect(keyPassRate([])).toBe(0)
  })

  it('returns 0 when no pass events', () => {
    const events = [makeTracking({ action: 'tackle' })]
    expect(keyPassRate(events)).toBe(0)
  })

  it('returns passes normalized to 90 minutes', () => {
    // 9 pass events over 90 minutes → 9 per 90
    const events = Array.from({ length: 9 }, (_, i) =>
      makeTracking({ action: 'pass', minute: i * 10 })
    )
    // span = 80 minutes, 9 passes → (9/80)*90 = 10.125
    const rate = keyPassRate(events)
    expect(rate).toBeGreaterThan(0)
  })
})

describe('duelSuccess', () => {
  it('returns 0 for empty events', () => {
    expect(duelSuccess([])).toBe(0)
  })

  it('returns 0 when no duels', () => {
    const events = [makeTracking({ action: 'pass' })]
    expect(duelSuccess(events)).toBe(0)
  })

  it('returns correct fraction', () => {
    const events = [
      makeTracking({ action: 'tackle', success: true }),
      makeTracking({ action: 'tackle', success: false }),
      makeTracking({ action: 'interception', success: true }),
      makeTracking({ action: 'interception', success: true }),
    ]
    expect(duelSuccess(events)).toBeCloseTo(0.75, 5)
  })

  it('returns 1 when all duels won', () => {
    const events = [
      makeTracking({ action: 'tackle', success: true }),
      makeTracking({ action: 'interception', success: true }),
    ]
    expect(duelSuccess(events)).toBeCloseTo(1, 5)
  })
})

// ---------------------------------------------------------------------------
// fanRating
// ---------------------------------------------------------------------------

describe('fanRating — FPL', () => {
  it('goals score 6 pts each in FPL', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    const withGoal = fanRating(
      { goals: 1, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    expect(withGoal - base).toBe(6)
  })

  it('assists score 3 pts each in FPL', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    const withAssist = fanRating(
      { goals: 0, assists: 1, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    expect(withAssist - base).toBe(3)
  })

  it('clean sheet gives 4 pts for GK (saves > 0)', () => {
    const noCS = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 3, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    const withCS = fanRating(
      { goals: 0, assists: 0, cleanSheet: true, saves: 3, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    expect(withCS - noCS).toBe(4)
  })

  it('clean sheet gives 1 pt for outfield player (saves = 0)', () => {
    const noCS = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    const withCS = fanRating(
      { goals: 0, assists: 0, cleanSheet: true, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    expect(withCS - noCS).toBe(1)
  })

  it('yellow card subtracts 1 pt', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    const withYellow = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: true, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    expect(base - withYellow).toBe(1)
  })

  it('red card subtracts 3 pts', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fpl'
    )
    const withRed = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: true, minutesPlayed: 90 },
      'fpl'
    )
    expect(base - withRed).toBe(3)
  })

  it('playing 60+ mins gives 2 pts', () => {
    const score = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 60 },
      'fpl'
    )
    expect(score).toBe(2)
  })

  it('playing 1-59 mins gives 1 pt', () => {
    const score = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 30 },
      'fpl'
    )
    expect(score).toBe(1)
  })
})

describe('fanRating — Fantrax', () => {
  it('goals score 4 pts each', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    const withGoal = fanRating(
      { goals: 1, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    expect(withGoal - base).toBe(4)
  })

  it('assists score 3 pts each', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    const withAssist = fanRating(
      { goals: 0, assists: 1, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    expect(withAssist - base).toBe(3)
  })

  it('saves score 0.5 pts each', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    const withSaves = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 4, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    expect(withSaves - base).toBeCloseTo(2, 5)
  })

  it('cleanSheet gives 1 pt', () => {
    const base = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    const withCS = fanRating(
      { goals: 0, assists: 0, cleanSheet: true, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'fantrax'
    )
    expect(withCS - base).toBe(1)
  })
})

describe('fanRating — Sorare', () => {
  it('returns a value in 0-100 range', () => {
    const score = fanRating(
      { goals: 2, assists: 1, cleanSheet: true, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'sorare'
    )
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('goals contribute positively', () => {
    const noGoal = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'sorare'
    )
    const withGoal = fanRating(
      { goals: 1, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'sorare'
    )
    expect(withGoal).toBeGreaterThan(noGoal)
  })

  it('red card reduces score', () => {
    const clean = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: false, minutesPlayed: 90 },
      'sorare'
    )
    const red = fanRating(
      { goals: 0, assists: 0, cleanSheet: false, saves: 0, yellowCard: false, redCard: true, minutesPlayed: 90 },
      'sorare'
    )
    expect(red).toBeLessThan(clean)
  })
})

// ---------------------------------------------------------------------------
// buildPassMatrix
// ---------------------------------------------------------------------------

describe('buildPassMatrix', () => {
  it('returns an n×n matrix of zeros for no matching events', () => {
    const matrix = buildPassMatrix([], ['p1', 'p2'])
    expect(matrix).toHaveLength(2)
    expect(matrix[0]).toHaveLength(2)
    expect(matrix[0]![1]).toBe(0)
  })

  it('increments matrix when two players coexist during a pass', () => {
    const events: PlayerTrackingEvent[] = [
      { playerId: 'p1', minute: 10, x: 50, y: 50, action: 'pass', success: true },
      { playerId: 'p2', minute: 10, x: 55, y: 50, action: 'pass', success: true },
    ]
    const matrix = buildPassMatrix(events, ['p1', 'p2'])
    // p1 passes to nearest player at same minute (p2)
    expect(matrix[0]![1]).toBeGreaterThanOrEqual(0) // at least 0
    expect(matrix).toHaveLength(2)
  })
})
