import { describe, it, expect } from 'vitest'

import {
  // 1. Alpine skiing
  gateTime,
  combinedTime,
  timeDifference,
  dnsOrDnf,
  slalomGateSpeed,
  verticalSpeed,
  glideEfficiency,
  worldCupPoints,
  // 2. Cross-country skiing
  pacePerKm,
  uphillEfficiency,
  skatingVsClassical,
  massStartPosition,
  pursuitGap,
  // 3. Ski jumping
  distancePoints,
  stylePoints,
  windCompensation,
  gateCompensation,
  totalJumpPoints,
  hillRecord,
  // 4. Biathlon
  shootingAccuracy,
  penaltyLoop,
  adjustedTime,
  standingVsProne,
  relayHandicap,
  // 5. Snowboarding / Freestyle
  halfpipeScore,
  slopestyleScore,
  bigAirScore,
  snowboardcrossPlacing,
  trickDifficulty,
  // 6. Speed skating
  fiveHundredMEquivalent,
  skatingPacePerLap,
  teamPursuitGap,
  shortTrackPenalty,
  // 7. DraftKings fantasy
  dkSkiingPoints,
  dkProjection,
  // Types
  type SkiingDiscipline,
  type DKSkiingResult,
  type BiathlonPositionAccuracy,
} from '@/lib/sports/skiing-analytics'

// ---------------------------------------------------------------------------
// 1. Alpine skiing
// ---------------------------------------------------------------------------

describe('gateTime', () => {
  it('sums all split times', () => {
    expect(gateTime([1.5, 2.0, 1.8])).toBeCloseTo(5.3)
  })

  it('returns 0 for empty splits', () => {
    expect(gateTime([])).toBe(0)
  })

  it('handles a single split', () => {
    expect(gateTime([12.34])).toBeCloseTo(12.34)
  })
})

describe('combinedTime', () => {
  it('sums two run times', () => {
    expect(combinedTime(53.4, 54.1)).toBeCloseTo(107.5)
  })

  it('handles equal run times', () => {
    expect(combinedTime(60, 60)).toBe(120)
  })
})

describe('timeDifference', () => {
  it('returns positive when time2 is slower', () => {
    expect(timeDifference(50, 52)).toBeCloseTo(2)
  })

  it('returns negative when time2 is faster', () => {
    expect(timeDifference(52, 50)).toBeCloseTo(-2)
  })

  it('returns 0 for equal times', () => {
    expect(timeDifference(50, 50)).toBe(0)
  })
})

describe('dnsOrDnf', () => {
  it('returns true for DNS', () => {
    expect(dnsOrDnf('DNS')).toBe(true)
  })

  it('returns true for DNF', () => {
    expect(dnsOrDnf('DNF')).toBe(true)
  })

  it('returns true for DSQ', () => {
    expect(dnsOrDnf('DSQ')).toBe(true)
  })

  it('returns false for finish', () => {
    expect(dnsOrDnf('finish')).toBe(false)
  })
})

describe('slalomGateSpeed', () => {
  it('calculates m/s through gate', () => {
    expect(slalomGateSpeed(10, 2)).toBe(5)
  })

  it('returns 0 when elapsedSec is 0', () => {
    expect(slalomGateSpeed(10, 0)).toBe(0)
  })

  it('handles fractional results', () => {
    expect(slalomGateSpeed(15, 4)).toBeCloseTo(3.75)
  })
})

describe('verticalSpeed', () => {
  it('calculates vertical m/s', () => {
    expect(verticalSpeed(800, 100)).toBe(8)
  })

  it('returns 0 when timeSeconds is 0', () => {
    expect(verticalSpeed(800, 0)).toBe(0)
  })
})

describe('glideEfficiency', () => {
  it('returns ratio of horizontal to vertical speed', () => {
    expect(glideEfficiency(20, 10)).toBe(2)
  })

  it('returns 0 when vertical speed is 0', () => {
    expect(glideEfficiency(20, 0)).toBe(0)
  })

  it('handles equal speeds', () => {
    expect(glideEfficiency(10, 10)).toBe(1)
  })
})

describe('worldCupPoints', () => {
  it('gives 100 for 1st place', () => {
    expect(worldCupPoints(1)).toBe(100)
  })

  it('gives 80 for 2nd place', () => {
    expect(worldCupPoints(2)).toBe(80)
  })

  it('gives 60 for 3rd place', () => {
    expect(worldCupPoints(3)).toBe(60)
  })

  it('gives 50 for 4th place', () => {
    expect(worldCupPoints(4)).toBe(50)
  })

  it('gives 45 for 5th place', () => {
    expect(worldCupPoints(5)).toBe(45)
  })

  it('gives 40 for 6th place', () => {
    expect(worldCupPoints(6)).toBe(40)
  })

  it('gives 36 for 7th place', () => {
    expect(worldCupPoints(7)).toBe(36)
  })

  it('gives 32 for 8th place', () => {
    expect(worldCupPoints(8)).toBe(32)
  })

  it('gives 29 for 9th place', () => {
    expect(worldCupPoints(9)).toBe(29)
  })

  it('gives 26 for 10th place', () => {
    expect(worldCupPoints(10)).toBe(26)
  })

  it('gives 24 for 11th place', () => {
    expect(worldCupPoints(11)).toBe(24)
  })

  it('gives 22 for 12th', () => {
    expect(worldCupPoints(12)).toBe(22)
  })

  it('gives 20 for 13th', () => {
    expect(worldCupPoints(13)).toBe(20)
  })

  it('gives 18 for 14th', () => {
    expect(worldCupPoints(14)).toBe(18)
  })

  it('gives 16 for 15th', () => {
    expect(worldCupPoints(15)).toBe(16)
  })

  it('gives 15 for 16th', () => {
    expect(worldCupPoints(16)).toBe(15)
  })

  it('gives 14 for 17th', () => {
    expect(worldCupPoints(17)).toBe(14)
  })

  it('gives 13 for 18th', () => {
    expect(worldCupPoints(18)).toBe(13)
  })

  it('gives 12 for 19th', () => {
    expect(worldCupPoints(19)).toBe(12)
  })

  it('gives 11 for 20th', () => {
    expect(worldCupPoints(20)).toBe(11)
  })

  it('gives 10 for 21st', () => {
    expect(worldCupPoints(21)).toBe(10)
  })

  it('gives 9 for 22nd', () => {
    expect(worldCupPoints(22)).toBe(9)
  })

  it('gives 8 for 23rd', () => {
    expect(worldCupPoints(23)).toBe(8)
  })

  it('gives 7 for 24th', () => {
    expect(worldCupPoints(24)).toBe(7)
  })

  it('gives 6 for 25th', () => {
    expect(worldCupPoints(25)).toBe(6)
  })

  it('gives 5 for 26th', () => {
    expect(worldCupPoints(26)).toBe(5)
  })

  it('gives 4 for 27th', () => {
    expect(worldCupPoints(27)).toBe(4)
  })

  it('gives 3 for 28th', () => {
    expect(worldCupPoints(28)).toBe(3)
  })

  it('gives 2 for 29th', () => {
    expect(worldCupPoints(29)).toBe(2)
  })

  it('gives 1 for 30th', () => {
    expect(worldCupPoints(30)).toBe(1)
  })

  it('gives 0 for 31st (outside points)', () => {
    expect(worldCupPoints(31)).toBe(0)
  })

  it('gives 0 for 50th', () => {
    expect(worldCupPoints(50)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Cross-country skiing
// ---------------------------------------------------------------------------

describe('pacePerKm', () => {
  it('calculates seconds per km', () => {
    expect(pacePerKm(300, 5)).toBe(60)
  })

  it('returns 0 when distance is 0', () => {
    expect(pacePerKm(300, 0)).toBe(0)
  })

  it('handles fractional distances', () => {
    expect(pacePerKm(150, 2.5)).toBe(60)
  })
})

describe('uphillEfficiency', () => {
  it('returns ratio of flat pace to uphill pace', () => {
    // uphill: 600s / 5km = 120 s/km; flat: 240s / 5km = 48 s/km; ratio = 48/120 = 0.4
    expect(uphillEfficiency(600, 5, 240, 5)).toBeCloseTo(0.4)
  })

  it('returns 0 when uphillKm is 0', () => {
    expect(uphillEfficiency(600, 0, 240, 5)).toBe(0)
  })

  it('returns 0 when flatKm is 0', () => {
    expect(uphillEfficiency(600, 5, 240, 0)).toBe(0)
  })

  it('returns 0 when uphill pace is 0 (uphillSec=0)', () => {
    expect(uphillEfficiency(0, 5, 240, 5)).toBe(0)
  })
})

describe('skatingVsClassical', () => {
  it('returns positive when skating is faster', () => {
    expect(skatingVsClassical(900, 960)).toBe(60)
  })

  it('returns negative when classical is faster', () => {
    expect(skatingVsClassical(960, 900)).toBe(-60)
  })

  it('returns 0 when times are equal', () => {
    expect(skatingVsClassical(900, 900)).toBe(0)
  })
})

describe('massStartPosition', () => {
  it('gives rank 1 to the fastest time', () => {
    expect(massStartPosition(100, [100, 105, 110])).toBe(1)
  })

  it('gives rank 2 when one athlete is faster', () => {
    expect(massStartPosition(105, [100, 105, 110])).toBe(2)
  })

  it('gives same rank to tied times', () => {
    // two athletes at 100 tie for 1st; 105 gets 3rd
    expect(massStartPosition(105, [100, 100, 105])).toBe(3)
  })

  it('handles empty field', () => {
    expect(massStartPosition(100, [])).toBe(1)
  })
})

describe('pursuitGap', () => {
  it('positive when athlete is ahead of leader', () => {
    expect(pursuitGap(10, 5)).toBe(5)
  })

  it('negative when athlete is behind', () => {
    expect(pursuitGap(5, 10)).toBe(-5)
  })

  it('returns 0 for the leader', () => {
    expect(pursuitGap(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Ski jumping
// ---------------------------------------------------------------------------

describe('distancePoints', () => {
  it('returns 60 when jumping exactly to the K-point', () => {
    expect(distancePoints(120, 120)).toBe(60)
  })

  it('adds unitPoints for each metre beyond the K-point', () => {
    // default unitPoints = 1.8; 5m beyond K120 = 60 + 5*1.8 = 69
    expect(distancePoints(125, 120)).toBeCloseTo(69)
  })

  it('deducts for falling short of the K-point', () => {
    // 5m short of K120 = 60 - 5*1.8 = 51
    expect(distancePoints(115, 120)).toBeCloseTo(51)
  })

  it('uses custom unitPoints when provided', () => {
    // K90 style: unitPoints=2.0; 10m beyond = 60 + 10*2 = 80
    expect(distancePoints(100, 90, 2.0)).toBeCloseTo(80)
  })
})

describe('stylePoints', () => {
  it('drops highest and lowest from 5 judges and sums remaining 3', () => {
    // [14, 16, 17, 18, 19] sorted; drop 14 and 19; keep 16+17+18 = 51
    expect(stylePoints([14, 16, 17, 18, 19])).toBe(51)
  })

  it('handles all same scores for 5 judges', () => {
    expect(stylePoints([18, 18, 18, 18, 18])).toBe(54)
  })

  it('returns 0 for empty array', () => {
    expect(stylePoints([])).toBe(0)
  })

  it('sums all judges when 3 or fewer (no drop)', () => {
    expect(stylePoints([15, 17, 18])).toBe(50)
  })

  it('sums all for a single judge', () => {
    expect(stylePoints([17])).toBe(17)
  })
})

describe('windCompensation', () => {
  it('calculates wind compensation', () => {
    expect(windCompensation(2, 10, 5)).toBeCloseTo(25)
  })

  it('returns 0 when wind is 0 and gatePoints are 0', () => {
    expect(windCompensation(0, 10, 0)).toBe(0)
  })

  it('handles negative wind speed (tailwind)', () => {
    expect(windCompensation(-2, 10, 5)).toBeCloseTo(-15)
  })
})

describe('gateCompensation', () => {
  it('multiplies gates by gate points', () => {
    expect(gateCompensation(3, 7.5)).toBeCloseTo(22.5)
  })

  it('returns 0 when no gates changed', () => {
    expect(gateCompensation(0, 7.5)).toBe(0)
  })
})

describe('totalJumpPoints', () => {
  it('sums all components', () => {
    // distancePoints(125, 120) = 60 + 5*1.8 = 69
    // + style 51 + windComp 5 + gateComp 10 = 135
    expect(totalJumpPoints(125, 120, 51, 5, 10)).toBeCloseTo(135)
  })
})

describe('hillRecord', () => {
  it('returns max jump distance', () => {
    expect(hillRecord([130, 142, 138, 125])).toBe(142)
  })

  it('returns 0 for empty array', () => {
    expect(hillRecord([])).toBe(0)
  })

  it('handles single jump', () => {
    expect(hillRecord([145])).toBe(145)
  })
})

// ---------------------------------------------------------------------------
// 4. Biathlon
// ---------------------------------------------------------------------------

describe('shootingAccuracy', () => {
  it('calculates ratio correctly', () => {
    expect(shootingAccuracy(4, 5)).toBe(0.8)
  })

  it('returns 0 when shots is 0', () => {
    expect(shootingAccuracy(0, 0)).toBe(0)
  })

  it('returns 1 for perfect shooting', () => {
    expect(shootingAccuracy(5, 5)).toBe(1)
  })

  it('returns 0 when no hits', () => {
    expect(shootingAccuracy(0, 5)).toBe(0)
  })
})

describe('penaltyLoop', () => {
  it('uses default 60s per miss', () => {
    expect(penaltyLoop(3)).toBe(180)
  })

  it('uses custom loop time', () => {
    expect(penaltyLoop(2, 75)).toBe(150)
  })

  it('returns 0 for no misses', () => {
    expect(penaltyLoop(0)).toBe(0)
  })
})

describe('adjustedTime', () => {
  it('adds penalty time for misses', () => {
    expect(adjustedTime(1200, 3)).toBe(1380)
  })

  it('returns ski time unchanged with 0 misses', () => {
    expect(adjustedTime(1200, 0)).toBe(1200)
  })

  it('uses custom penalty per miss', () => {
    expect(adjustedTime(1200, 2, 45)).toBe(1290)
  })
})

describe('standingVsProne', () => {
  it('calculates accuracy for both positions and overall', () => {
    const result = standingVsProne(4, 5, 5, 5)
    expect(result.standing).toBe(0.8)
    expect(result.prone).toBe(1.0)
    expect(result.overall).toBeCloseTo(0.9)
  })

  it('handles all zeros', () => {
    const result = standingVsProne(0, 0, 0, 0)
    expect(result.standing).toBe(0)
    expect(result.prone).toBe(0)
    expect(result.overall).toBe(0)
  })

  it('handles zero standing shots', () => {
    const result = standingVsProne(0, 0, 5, 5)
    expect(result.standing).toBe(0)
    expect(result.prone).toBe(1)
    expect(result.overall).toBe(1)
  })
})

describe('relayHandicap', () => {
  it('sums all team times', () => {
    expect(relayHandicap([600, 620, 610, 630])).toBe(2460)
  })

  it('returns 0 for empty array', () => {
    expect(relayHandicap([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Snowboarding / Freestyle
// ---------------------------------------------------------------------------

describe('halfpipeScore', () => {
  it('returns best (highest) run', () => {
    expect(halfpipeScore([82.5, 90.1, 88.0])).toBe(90.1)
  })

  it('returns 0 for empty array', () => {
    expect(halfpipeScore([])).toBe(0)
  })

  it('handles a single run', () => {
    expect(halfpipeScore([76.5])).toBe(76.5)
  })

  it('handles all same scores', () => {
    expect(halfpipeScore([85, 85, 85])).toBe(85)
  })
})

describe('slopestyleScore', () => {
  it('averages flat judge array when no runs provided', () => {
    expect(slopestyleScore([80, 90, 85])).toBeCloseTo(85)
  })

  it('returns best run average when runs provided', () => {
    // run1 avg = (80+90)/2 = 85, run2 avg = (70+75)/2 = 72.5 → best = 85
    const result = slopestyleScore([80, 90], [[80, 90], [70, 75]])
    expect(result).toBeCloseTo(85)
  })

  it('returns 0 for empty judges array', () => {
    expect(slopestyleScore([])).toBe(0)
  })

  it('handles empty runs array falling through to judges', () => {
    expect(slopestyleScore([80, 90, 100], [])).toBeCloseTo(90)
  })
})

describe('bigAirScore', () => {
  it('sums three judges', () => {
    expect(bigAirScore(85, 88, 90)).toBe(263)
  })

  it('handles zeros', () => {
    expect(bigAirScore(0, 0, 0)).toBe(0)
  })
})

describe('snowboardcrossPlacing', () => {
  it('assigns 1-based ranks', () => {
    expect(snowboardcrossPlacing([12.5, 11.0, 13.2])).toEqual([2, 1, 3])
  })

  it('ties share lower rank', () => {
    // [10, 10, 12]: both 10s get rank 1, 12 gets rank 3
    expect(snowboardcrossPlacing([10, 10, 12])).toEqual([1, 1, 3])
  })

  it('handles single entry', () => {
    expect(snowboardcrossPlacing([5.0])).toEqual([1])
  })

  it('returns empty for empty array', () => {
    expect(snowboardcrossPlacing([])).toEqual([])
  })
})

describe('trickDifficulty', () => {
  it('calculates difficulty score', () => {
    // (720/360)*5 + 2*1.5 + 1*0.5 = 10 + 3 + 0.5 = 13.5
    expect(trickDifficulty(720, 2, 1)).toBeCloseTo(13.5)
  })

  it('handles zero rotation', () => {
    expect(trickDifficulty(0, 1, 0)).toBeCloseTo(1.5)
  })

  it('handles all zeros', () => {
    expect(trickDifficulty(0, 0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Speed skating
// ---------------------------------------------------------------------------

describe('fiveHundredMEquivalent', () => {
  it('normalises 1000m time to 500m equivalent', () => {
    expect(fiveHundredMEquivalent(1000, 70)).toBeCloseTo(35)
  })

  it('returns 0 for distance of 0', () => {
    expect(fiveHundredMEquivalent(0, 70)).toBe(0)
  })

  it('returns unchanged for 500m', () => {
    expect(fiveHundredMEquivalent(500, 35)).toBeCloseTo(35)
  })

  it('handles 5000m race', () => {
    expect(fiveHundredMEquivalent(5000, 400)).toBeCloseTo(40)
  })
})

describe('skatingPacePerLap', () => {
  it('returns seconds per lap (default 400m)', () => {
    expect(skatingPacePerLap(200, 4)).toBe(50)
  })

  it('returns 0 when laps is 0', () => {
    expect(skatingPacePerLap(200, 0)).toBe(0)
  })

  it('accepts custom lap length', () => {
    // lapLengthM parameter exists but doesn't change calc (sec/lap independent of m)
    expect(skatingPacePerLap(100, 2, 333)).toBeCloseTo(50)
  })
})

describe('teamPursuitGap', () => {
  it('returns positive when team2 is slower', () => {
    expect(teamPursuitGap(220, 225)).toBe(5)
  })

  it('returns negative when team2 is faster', () => {
    expect(teamPursuitGap(225, 220)).toBe(-5)
  })

  it('returns 0 for equal times', () => {
    expect(teamPursuitGap(220, 220)).toBe(0)
  })
})

describe('shortTrackPenalty', () => {
  it('returns Infinity for DQ', () => {
    expect(shortTrackPenalty(true, false)).toBe(Infinity)
  })

  it('returns 0 for false start (first warning)', () => {
    expect(shortTrackPenalty(false, true)).toBe(0)
  })

  it('returns 0 with no infraction', () => {
    expect(shortTrackPenalty(false, false)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Skiing)
// ---------------------------------------------------------------------------

const mkResult = (
  place: number,
  dnf: boolean,
  worldCupPts: number,
  discipline: SkiingDiscipline = 'downhill',
): DKSkiingResult => ({ place, discipline, dnf, worldCupPoints: worldCupPts })

describe('dkSkiingPoints', () => {
  it('gives 40 for 1st place', () => {
    expect(dkSkiingPoints(mkResult(1, false, 0))).toBe(40)
  })

  it('gives 35 for 2nd place', () => {
    expect(dkSkiingPoints(mkResult(2, false, 0))).toBe(35)
  })

  it('gives 30 for 3rd place', () => {
    expect(dkSkiingPoints(mkResult(3, false, 0))).toBe(30)
  })

  it('gives 25 for 4th place', () => {
    expect(dkSkiingPoints(mkResult(4, false, 0))).toBe(25)
  })

  it('gives 20 for 5th place', () => {
    expect(dkSkiingPoints(mkResult(5, false, 0))).toBe(20)
  })

  it('gives 15 for 6th place', () => {
    expect(dkSkiingPoints(mkResult(6, false, 0))).toBe(15)
  })

  it('gives 10 for 7th place', () => {
    expect(dkSkiingPoints(mkResult(7, false, 0))).toBe(10)
  })

  it('gives 10 for 10th place', () => {
    expect(dkSkiingPoints(mkResult(10, false, 0))).toBe(10)
  })

  it('gives 5 for 11th place', () => {
    expect(dkSkiingPoints(mkResult(11, false, 0))).toBe(5)
  })

  it('gives 5 for 20th place', () => {
    expect(dkSkiingPoints(mkResult(20, false, 0))).toBe(5)
  })

  it('gives 1 for 21st place', () => {
    expect(dkSkiingPoints(mkResult(21, false, 0))).toBe(1)
  })

  it('gives 1 for 50th place', () => {
    expect(dkSkiingPoints(mkResult(50, false, 0))).toBe(1)
  })

  it('applies DNF penalty of -10', () => {
    expect(dkSkiingPoints(mkResult(1, true, 0))).toBe(30)
  })

  it('adds 0.1 per world cup point', () => {
    // 1st + 100 WC pts * 0.1 = 40 + 10 = 50
    expect(dkSkiingPoints(mkResult(1, false, 100))).toBeCloseTo(50)
  })

  it('caps world cup bonus at 20 points (200 WC pts)', () => {
    expect(dkSkiingPoints(mkResult(1, false, 200))).toBeCloseTo(60)
    expect(dkSkiingPoints(mkResult(1, false, 300))).toBeCloseTo(60)
  })

  it('combines all: place + DNF + WC bonus', () => {
    // 3rd=30, DNF-10, 50WC*0.1=5 → 25
    expect(dkSkiingPoints(mkResult(3, true, 50))).toBeCloseTo(25)
  })

  it('works for jumping discipline', () => {
    expect(dkSkiingPoints(mkResult(1, false, 0, 'jumping'))).toBe(40)
  })

  it('works for crosscountry discipline', () => {
    expect(dkSkiingPoints(mkResult(2, false, 80, 'crosscountry'))).toBeCloseTo(43)
  })
})

describe('dkProjection', () => {
  it('returns 0 for empty results', () => {
    expect(dkProjection([])).toBe(0)
  })

  it('returns the single result score for one entry', () => {
    const results = [mkResult(1, false, 0)]
    expect(dkProjection(results)).toBeCloseTo(dkSkiingPoints(results[0]!))
  })

  it('weights most recent result 3× and others 1×', () => {
    // Two results: older=1st(40pts), recent=6th(15pts)
    // weighted = (40*1 + 15*3) / (1+3) = (40+45)/4 = 21.25
    const results = [mkResult(1, false, 0), mkResult(6, false, 0)]
    expect(dkProjection(results)).toBeCloseTo(21.25)
  })

  it('averages multiple older results equally', () => {
    // Three results: [2nd=35, 3rd=30, recent=1st=40]
    // weighted = (35*1 + 30*1 + 40*3) / (1+1+3) = (35+30+120)/5 = 185/5 = 37
    const results = [mkResult(2, false, 0), mkResult(3, false, 0), mkResult(1, false, 0)]
    expect(dkProjection(results)).toBeCloseTo(37)
  })

  it('correctly handles single DNF result', () => {
    const results = [mkResult(1, true, 0)]
    expect(dkProjection(results)).toBeCloseTo(30) // 40 - 10 = 30
  })
})
