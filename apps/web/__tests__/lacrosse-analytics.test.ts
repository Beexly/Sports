/**
 * lacrosse-analytics.test.ts
 * Comprehensive tests for the lacrosse analytics library.
 * Run with: npx vitest run __tests__/lacrosse-analytics.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  lacrosseScore,
  goalsPerGame,
  assistsPerGame,
  pointsPerGame,
  shootingPercentage,
  savePercentage,
  goalsAgainstAverage,
  shotDifferential,
  clearingPercentage,
  ridePercentage,
  faceOffWinRate,
  faceOffImpact,
  groundBallsPerFaceOff,
  faceOffExpectedPossessions,
  faceOffValueIndex,
  groundBallsPerGame,
  possessionPercentage,
  possessionToShotRatio,
  turnoversPerGame,
  turnoverDifferential,
  possessionEfficiencyRating,
  attackRating,
  defenseRating,
  midfielderRating,
  goalkeeperRating,
  extraManEfficiency,
  manDownClearRate,
  boxShotsPerGame,
  boxGoalsPerGame,
  roughingPenaltyRate,
  powerPlayPercentage,
  penaltyKillPercentage,
  boxLacrosseRating,
  netRating,
  strengthOfSchedule,
  pythagoreanWinPct,
  momentumScore,
  winProbability,
  totalScorePrediction,
  dkLacrosseScore,
  dkGoalieScore,
} from '@/lib/sports/lacrosse-analytics'

// ---------------------------------------------------------------------------
// 1. Field lacrosse scoring and game stats
// ---------------------------------------------------------------------------

describe('lacrosseScore', () => {
  it('returns goals count', () => {
    expect(lacrosseScore(5, false)).toBe(5)
  })
  it('returns goals count with OT win', () => {
    expect(lacrosseScore(7, true)).toBe(7)
  })
  it('returns 0 for 0 goals', () => {
    expect(lacrosseScore(0, false)).toBe(0)
  })
  it('returns 0 for 0 goals with OT win', () => {
    expect(lacrosseScore(0, true)).toBe(0)
  })
})

describe('goalsPerGame', () => {
  it('divides goals by games', () => {
    expect(goalsPerGame(30, 10)).toBe(3)
  })
  it('returns 0 if games is 0', () => {
    expect(goalsPerGame(10, 0)).toBe(0)
  })
  it('returns fractional value', () => {
    expect(goalsPerGame(7, 3)).toBeCloseTo(2.333, 2)
  })
})

describe('assistsPerGame', () => {
  it('divides assists by games', () => {
    expect(assistsPerGame(20, 5)).toBe(4)
  })
  it('returns 0 if games is 0', () => {
    expect(assistsPerGame(5, 0)).toBe(0)
  })
})

describe('pointsPerGame', () => {
  it('sums goals and assists then divides by games', () => {
    expect(pointsPerGame(10, 5, 5)).toBe(3)
  })
  it('returns 0 if games is 0', () => {
    expect(pointsPerGame(10, 5, 0)).toBe(0)
  })
  it('handles zero goals', () => {
    expect(pointsPerGame(0, 6, 3)).toBe(2)
  })
})

describe('shootingPercentage', () => {
  it('divides goals by shots', () => {
    expect(shootingPercentage(5, 20)).toBe(0.25)
  })
  it('returns 0 if shots is 0', () => {
    expect(shootingPercentage(3, 0)).toBe(0)
  })
  it('returns 1 for perfect accuracy', () => {
    expect(shootingPercentage(10, 10)).toBe(1)
  })
})

describe('savePercentage', () => {
  it('divides saves by shots on goal', () => {
    expect(savePercentage(9, 10)).toBe(0.9)
  })
  it('returns 0 if shotsOnGoal is 0', () => {
    expect(savePercentage(0, 0)).toBe(0)
  })
  it('returns 1 for shutout', () => {
    expect(savePercentage(15, 15)).toBe(1)
  })
})

describe('goalsAgainstAverage', () => {
  it('calculates per-60 rate', () => {
    expect(goalsAgainstAverage(3, 60)).toBe(3)
  })
  it('returns 0 if minutesPlayed is 0', () => {
    expect(goalsAgainstAverage(5, 0)).toBe(0)
  })
  it('scales correctly for partial game', () => {
    expect(goalsAgainstAverage(1, 30)).toBe(2)
  })
})

describe('shotDifferential', () => {
  it('returns positive when team has more shots', () => {
    expect(shotDifferential(30, 20)).toBe(10)
  })
  it('returns negative when opponent has more shots', () => {
    expect(shotDifferential(15, 25)).toBe(-10)
  })
  it('returns 0 for equal shots', () => {
    expect(shotDifferential(20, 20)).toBe(0)
  })
})

describe('clearingPercentage', () => {
  it('divides successful clears by attempts', () => {
    expect(clearingPercentage(8, 10)).toBe(0.8)
  })
  it('returns 0 if clearAttempts is 0', () => {
    expect(clearingPercentage(0, 0)).toBe(0)
  })
})

describe('ridePercentage', () => {
  it('divides successful rides by attempts', () => {
    expect(ridePercentage(6, 10)).toBe(0.6)
  })
  it('returns 0 if rideAttempts is 0', () => {
    expect(ridePercentage(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Face-off analytics
// ---------------------------------------------------------------------------

describe('faceOffWinRate', () => {
  it('divides faceoffsWon by faceoffsTaken', () => {
    expect(faceOffWinRate(6, 10)).toBe(0.6)
  })
  it('returns 0 if faceoffsTaken is 0', () => {
    expect(faceOffWinRate(0, 0)).toBe(0)
  })
  it('returns 1 for perfect rate', () => {
    expect(faceOffWinRate(10, 10)).toBe(1)
  })
})

describe('faceOffImpact', () => {
  it('calculates impact for even game', () => {
    // winRate = 0.6, scorePct = 5/(5+5) = 0.5
    expect(faceOffImpact(6, 10, 5, 5)).toBeCloseTo(0.3, 4)
  })
  it('clamps at 0 for 0 goals scored', () => {
    expect(faceOffImpact(10, 10, 0, 5)).toBe(0)
  })
  it('clamps at 1 maximum', () => {
    // winRate=1, goalsScored=100, goalsAllowed=0 → 1*(100/1) clamped to 1
    expect(faceOffImpact(10, 10, 100, 0)).toBe(1)
  })
  it('returns 0 when faceoffs not taken', () => {
    expect(faceOffImpact(0, 0, 5, 5)).toBe(0)
  })
  it('uses (goalsScored+goalsAllowed)||1 denominator correctly', () => {
    // winRate=0.5, goalsScored=0, goalsAllowed=0 → 0.5*(0/1) = 0
    expect(faceOffImpact(5, 10, 0, 0)).toBe(0)
  })
})

describe('groundBallsPerFaceOff', () => {
  it('divides ground balls by faceoffs taken', () => {
    expect(groundBallsPerFaceOff(15, 10)).toBe(1.5)
  })
  it('returns 0 if faceoffsTaken is 0', () => {
    expect(groundBallsPerFaceOff(5, 0)).toBe(0)
  })
})

describe('faceOffExpectedPossessions', () => {
  it('uses default tieRate of 0.15', () => {
    expect(faceOffExpectedPossessions(10)).toBeCloseTo(11.5, 4)
  })
  it('uses custom tieRate', () => {
    expect(faceOffExpectedPossessions(10, 0.2)).toBeCloseTo(12, 4)
  })
  it('returns 0 for 0 wins', () => {
    expect(faceOffExpectedPossessions(0)).toBe(0)
  })
})

describe('faceOffValueIndex', () => {
  it('calculates combined win rate and ground ball index', () => {
    // winRate = 6/10 = 0.6; gbRate = 8/10 = 0.8
    // 0.6*0.6 + 0.8*0.4 = 0.36 + 0.32 = 0.68
    expect(faceOffValueIndex(6, 10, 8)).toBeCloseTo(0.68, 4)
  })
  it('returns 0 for zero faceoffs taken', () => {
    expect(faceOffValueIndex(0, 0, 0)).toBe(0)
  })
  it('uses faceoffsTaken||1 for groundBalls denominator', () => {
    // winRate = 0, gbRate = 5/1 = 5
    expect(faceOffValueIndex(0, 0, 5)).toBeCloseTo(5 * 0.4, 4)
  })
})

// ---------------------------------------------------------------------------
// 3. Ground balls and possession
// ---------------------------------------------------------------------------

describe('groundBallsPerGame', () => {
  it('divides ground balls by games', () => {
    expect(groundBallsPerGame(40, 10)).toBe(4)
  })
  it('returns 0 if games is 0', () => {
    expect(groundBallsPerGame(10, 0)).toBe(0)
  })
})

describe('possessionPercentage', () => {
  it('divides team possession by total', () => {
    expect(possessionPercentage(30, 60)).toBe(0.5)
  })
  it('returns 0.5 if totalPossTime is 0', () => {
    expect(possessionPercentage(0, 0)).toBe(0.5)
  })
  it('calculates correct dominant possession', () => {
    expect(possessionPercentage(40, 60)).toBeCloseTo(0.667, 2)
  })
})

describe('possessionToShotRatio', () => {
  it('divides shots by possessions', () => {
    expect(possessionToShotRatio(30, 60)).toBe(0.5)
  })
  it('returns 0 if possessions is 0', () => {
    expect(possessionToShotRatio(10, 0)).toBe(0)
  })
})

describe('turnoversPerGame', () => {
  it('divides turnovers by games', () => {
    expect(turnoversPerGame(20, 10)).toBe(2)
  })
  it('returns 0 if games is 0', () => {
    expect(turnoversPerGame(5, 0)).toBe(0)
  })
})

describe('turnoverDifferential', () => {
  it('returns positive when forced turnovers exceed team turnovers', () => {
    expect(turnoverDifferential(5, 10)).toBe(5)
  })
  it('returns negative when team has more turnovers', () => {
    expect(turnoverDifferential(10, 5)).toBe(-5)
  })
  it('returns 0 for equal turnovers', () => {
    expect(turnoverDifferential(7, 7)).toBe(0)
  })
})

describe('possessionEfficiencyRating', () => {
  it('calculates shooting pct * possession shot rate * 100', () => {
    // goals=5, shots=20, possessions=40
    // (5/20) * (20/40) * 100 = 0.25 * 0.5 * 100 = 12.5
    expect(possessionEfficiencyRating(5, 40, 20)).toBeCloseTo(12.5, 4)
  })
  it('returns 0 if shots is 0', () => {
    expect(possessionEfficiencyRating(0, 10, 0)).toBe(0)
  })
  it('returns 0 if possessions is 0', () => {
    // goals=5, shots=10, possessions=0: (5/10) * (10/1) * 100 = 50, clamped to 100...
    // possessions=0 but shots=0 makes it truly 0
    expect(possessionEfficiencyRating(0, 0, 0)).toBe(0)
  })
  it('clamps at 100', () => {
    expect(possessionEfficiencyRating(100, 1, 100)).toBe(100)
  })
  it('clamps at 0 minimum', () => {
    expect(possessionEfficiencyRating(0, 10, 10)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Attack and defense ratings
// ---------------------------------------------------------------------------

describe('attackRating', () => {
  it('calculates composite attack rating', () => {
    // goals=5, assists=3, shots=10, turnovers=2
    // 5*3 + 3*2 + 10*0.5 - 2*2 = 15 + 6 + 5 - 4 = 22
    expect(attackRating(5, 3, 10, 2)).toBe(22)
  })
  it('handles zero stats', () => {
    expect(attackRating(0, 0, 0, 0)).toBe(0)
  })
  it('penalizes turnovers', () => {
    expect(attackRating(5, 0, 0, 10)).toBe(5 * 3 - 10 * 2)
  })
})

describe('defenseRating', () => {
  it('calculates composite defense rating', () => {
    // groundBalls=10, causedTurnovers=5, goalsAllowed=3, saves=8
    // (10 + 10 + 8 - 6) / 10 = 22/10 = 2.2
    expect(defenseRating(10, 5, 3, 8)).toBeCloseTo(2.2, 4)
  })
  it('clamps at 0 for poor performance', () => {
    expect(defenseRating(0, 0, 50, 0)).toBe(0)
  })
  it('clamps at 10 for elite performance', () => {
    // (100 + 200 + 100 - 0) / 10 = 40 → clamped to 10
    expect(defenseRating(100, 100, 0, 100)).toBe(10)
  })
})

describe('midfielderRating', () => {
  it('calculates composite midfielder rating', () => {
    // faceOffWinRate=0.6, groundBalls=10, goals=3, turnovers=2
    // 0.6*3 + 10*0.2 + 3*1 - 2*0.5 = 1.8 + 2 + 3 - 1 = 5.8
    expect(midfielderRating(10, 6, 10, 3, 2)).toBeCloseTo(5.8, 4)
  })
  it('clamps at 0', () => {
    expect(midfielderRating(0, 0, 10, 0, 100)).toBe(0)
  })
  it('clamps at 10', () => {
    expect(midfielderRating(100, 10, 10, 100, 0)).toBe(10)
  })
  it('returns 0 for zero faceoffs', () => {
    expect(midfielderRating(0, 0, 0, 0, 0)).toBe(0)
  })
})

describe('goalkeeperRating', () => {
  it('calculates composite goalkeeper rating', () => {
    // saves=9, shotsOnGoal=10, goalsAllowed=1
    // savePct = 0.9; 0.9*100*0.8 + (1-1/10)*20 = 72 + 18 = 90
    expect(goalkeeperRating(9, 10, 1)).toBeCloseTo(90, 4)
  })
  it('returns 100 for perfect performance', () => {
    // saves=10, shotsOnGoal=10, goalsAllowed=0
    // 1.0*100*0.8 + (1-0/10)*20 = 80 + 20 = 100
    expect(goalkeeperRating(10, 10, 0)).toBe(100)
  })
  it('clamps at 0 for bad performance', () => {
    expect(goalkeeperRating(0, 0, 20)).toBe(0)
  })
  it('handles zero shots on goal', () => {
    // shotsOnGoal=0: savePct=0, goalsAllowed=5 → 0 + (1 - 5/1)*20 → negative → clamp 0
    expect(goalkeeperRating(0, 0, 5)).toBe(0)
  })
})

describe('extraManEfficiency', () => {
  it('divides extra man goals by opportunities', () => {
    expect(extraManEfficiency(3, 10)).toBe(0.3)
  })
  it('returns 0 if opportunities is 0', () => {
    expect(extraManEfficiency(0, 0)).toBe(0)
  })
  it('returns 1 for perfect EMO', () => {
    expect(extraManEfficiency(5, 5)).toBe(1)
  })
})

describe('manDownClearRate', () => {
  it('divides clears by opportunities', () => {
    expect(manDownClearRate(8, 10)).toBe(0.8)
  })
  it('returns 0 if opportunities is 0', () => {
    expect(manDownClearRate(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Box lacrosse (NLL-style)
// ---------------------------------------------------------------------------

describe('boxShotsPerGame', () => {
  it('divides shots by games', () => {
    expect(boxShotsPerGame(50, 5)).toBe(10)
  })
  it('returns 0 if games is 0', () => {
    expect(boxShotsPerGame(20, 0)).toBe(0)
  })
})

describe('boxGoalsPerGame', () => {
  it('divides goals by games', () => {
    expect(boxGoalsPerGame(20, 5)).toBe(4)
  })
  it('returns 0 if games is 0', () => {
    expect(boxGoalsPerGame(10, 0)).toBe(0)
  })
})

describe('roughingPenaltyRate', () => {
  it('divides penalties by games', () => {
    expect(roughingPenaltyRate(15, 5)).toBe(3)
  })
  it('returns 0 if games is 0', () => {
    expect(roughingPenaltyRate(10, 0)).toBe(0)
  })
})

describe('powerPlayPercentage', () => {
  it('divides ppGoals by ppOpportunities', () => {
    expect(powerPlayPercentage(3, 10)).toBe(0.3)
  })
  it('returns 0 if ppOpportunities is 0', () => {
    expect(powerPlayPercentage(0, 0)).toBe(0)
  })
  it('returns 1 for perfect pp', () => {
    expect(powerPlayPercentage(5, 5)).toBe(1)
  })
})

describe('penaltyKillPercentage', () => {
  it('divides pkSuccesses by pkOpportunities', () => {
    expect(penaltyKillPercentage(8, 10)).toBe(0.8)
  })
  it('returns 0 if pkOpportunities is 0', () => {
    expect(penaltyKillPercentage(0, 0)).toBe(0)
  })
  it('returns 1 for perfect pk', () => {
    expect(penaltyKillPercentage(5, 5)).toBe(1)
  })
})

describe('boxLacrosseRating', () => {
  it('calculates goalie rating', () => {
    // saves=10, penalties=2 → 10*2 - 2 = 18
    expect(boxLacrosseRating(0, 0, 2, 0, 10, true)).toBe(18)
  })
  it('calculates field player rating', () => {
    // goals=3, assists=2, penalties=1, groundBalls=4, saves=0
    // 3*3 + 2*2 + 4*0.5 - 1*1.5 = 9 + 4 + 2 - 1.5 = 13.5
    expect(boxLacrosseRating(3, 2, 1, 4, 0, false)).toBe(13.5)
  })
  it('returns negative for goalie with many penalties', () => {
    expect(boxLacrosseRating(0, 0, 20, 0, 5, true)).toBe(5 * 2 - 20)
  })
  it('handles zero stats for field player', () => {
    expect(boxLacrosseRating(0, 0, 0, 0, 0, false)).toBe(0)
  })
  it('handles zero stats for goalie', () => {
    expect(boxLacrosseRating(0, 0, 0, 0, 0, true)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Team analytics and predictions
// ---------------------------------------------------------------------------

describe('netRating', () => {
  it('calculates goal differential per game', () => {
    expect(netRating(50, 30, 10)).toBe(2)
  })
  it('returns 0 if gamesPlayed is 0', () => {
    expect(netRating(50, 30, 0)).toBe(0)
  })
  it('returns negative for poor teams', () => {
    expect(netRating(20, 40, 10)).toBe(-2)
  })
})

describe('strengthOfSchedule', () => {
  it('returns mean of opponent win rates', () => {
    expect(strengthOfSchedule([0.5, 0.6, 0.4])).toBeCloseTo(0.5, 4)
  })
  it('returns 0 for empty array', () => {
    expect(strengthOfSchedule([])).toBe(0)
  })
  it('handles single opponent', () => {
    expect(strengthOfSchedule([0.75])).toBe(0.75)
  })
})

describe('pythagoreanWinPct', () => {
  it('returns correct win pct with default exponent', () => {
    // 100^2 / (100^2 + 50^2) = 10000 / 12500 = 0.8
    expect(pythagoreanWinPct(100, 50)).toBeCloseTo(0.8, 4)
  })
  it('returns 0.5 when both are 0', () => {
    expect(pythagoreanWinPct(0, 0)).toBe(0.5)
  })
  it('uses custom exponent', () => {
    // 100^3 / (100^3 + 50^3) = 1000000 / 1125000 ≈ 0.8889
    expect(pythagoreanWinPct(100, 50, 3)).toBeCloseTo(0.8889, 3)
  })
  it('returns 1 when goalsAgainst is 0', () => {
    expect(pythagoreanWinPct(50, 0)).toBe(1)
  })
  it('returns 0 when goalsFor is 0', () => {
    expect(pythagoreanWinPct(0, 50)).toBe(0)
  })
})

describe('momentumScore', () => {
  it('returns 1 for all wins with default weights', () => {
    expect(momentumScore(['W', 'W', 'W'])).toBeCloseTo(1, 10)
  })
  it('returns 0 for all losses', () => {
    expect(momentumScore(['L', 'L', 'L'])).toBe(0)
  })
  it('handles OTL at 0.5', () => {
    expect(momentumScore(['OTL'])).toBe(0.5)
  })
  it('returns 0 for empty array', () => {
    expect(momentumScore([])).toBe(0)
  })
  it('uses descending weights by default', () => {
    // ['W', 'L'] → weights [2/3, 1/3]; score = 1*(2/3) + 0*(1/3) = 0.667
    expect(momentumScore(['W', 'L'])).toBeCloseTo(0.667, 2)
  })
  it('uses custom weights', () => {
    // W=1, L=0 with equal weights [0.5, 0.5]
    expect(momentumScore(['W', 'L'], [0.5, 0.5])).toBe(0.5)
  })
  it('clamps to 1 maximum', () => {
    expect(momentumScore(['W', 'W', 'W'], [1, 1, 1])).toBe(1)
  })
  it('clamps to 0 minimum', () => {
    expect(momentumScore(['L', 'L', 'L'], [1, 1, 1])).toBe(0)
  })
})

describe('winProbability', () => {
  it('returns > 0.5 for better team with home advantage', () => {
    const prob = winProbability(5, 3, 0.5)
    expect(prob).toBeGreaterThan(0.5)
  })
  it('returns near 0.5 for equal teams', () => {
    // equal teams with 0 home advantage → exactly 0.5
    const prob = winProbability(5, 5, 0)
    expect(prob).toBeCloseTo(0.5, 4)
  })
  it('uses default home advantage of 0.5', () => {
    const prob1 = winProbability(5, 5)
    const prob2 = winProbability(5, 5, 0.5)
    expect(prob1).toBeCloseTo(prob2, 10)
  })
  it('approaches 1 for dominant team', () => {
    expect(winProbability(100, 0)).toBeGreaterThan(0.99)
  })
  it('approaches 0 for very weak team', () => {
    expect(winProbability(0, 100)).toBeLessThan(0.01)
  })
})

describe('totalScorePrediction', () => {
  it('calculates expected total score', () => {
    // (5 + 4 + 4 + 5) / 2 = 9
    expect(totalScorePrediction(5, 5, 4, 4)).toBe(9)
  })
  it('handles zero values', () => {
    expect(totalScorePrediction(0, 0, 0, 0)).toBe(0)
  })
  it('correctly weights asymmetric match', () => {
    // avgGF=10, avgGA=5, oppAvgGF=8, oppAvgGA=3
    // (10 + 3 + 8 + 5) / 2 = 13
    expect(totalScorePrediction(10, 5, 8, 3)).toBe(13)
  })
})

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy scoring (PLL)
// ---------------------------------------------------------------------------

describe('dkLacrosseScore', () => {
  it('calculates full DK score correctly', () => {
    const stats = {
      goals: 2,
      assists: 1,
      shots: 5,
      shotsOnGoal: 3,
      groundBalls: 4,
      turnovers: 1,
      causedTurnovers: 2,
      faceoffsWon: 3,
      faceoffsTaken: 5,
    }
    // 12*2 + 7*1 + 1.6*5 + 2*3 + 3*4 - 2.5*1 + 5*2 + 4*3 - 2*5
    // = 24 + 7 + 8 + 6 + 12 - 2.5 + 10 + 12 - 10 = 66.5
    expect(dkLacrosseScore(stats)).toBeCloseTo(66.5, 4)
  })

  it('returns 0 for all-zero stats', () => {
    expect(
      dkLacrosseScore({
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnGoal: 0,
        groundBalls: 0,
        turnovers: 0,
        causedTurnovers: 0,
        faceoffsWon: 0,
        faceoffsTaken: 0,
      }),
    ).toBe(0)
  })

  it('penalizes turnovers', () => {
    const baseStats = {
      goals: 1,
      assists: 0,
      shots: 0,
      shotsOnGoal: 0,
      groundBalls: 0,
      turnovers: 0,
      causedTurnovers: 0,
      faceoffsWon: 0,
      faceoffsTaken: 0,
    }
    const withTurnovers = { ...baseStats, turnovers: 2 }
    expect(dkLacrosseScore(withTurnovers)).toBeLessThan(dkLacrosseScore(baseStats))
  })

  it('penalizes face-offs taken without wins', () => {
    const base = {
      goals: 0, assists: 0, shots: 0, shotsOnGoal: 0, groundBalls: 0,
      turnovers: 0, causedTurnovers: 0, faceoffsWon: 0, faceoffsTaken: 0,
    }
    const withFaceoffsTaken = { ...base, faceoffsTaken: 10 }
    expect(dkLacrosseScore(withFaceoffsTaken)).toBe(-20)
  })

  it('rewards caused turnovers highly', () => {
    const base = {
      goals: 0, assists: 0, shots: 0, shotsOnGoal: 0, groundBalls: 0,
      turnovers: 0, causedTurnovers: 0, faceoffsWon: 0, faceoffsTaken: 0,
    }
    const withCT = { ...base, causedTurnovers: 2 }
    expect(dkLacrosseScore(withCT)).toBe(10)
  })
})

describe('dkGoalieScore', () => {
  it('calculates win bonus correctly', () => {
    expect(dkGoalieScore({ saves: 10, goalsAllowed: 3, win: true })).toBeCloseTo(
      3.5 * 10 - 3.5 * 3 + 6,
      4,
    )
  })

  it('no win bonus for loss', () => {
    const withWin = dkGoalieScore({ saves: 10, goalsAllowed: 3, win: true })
    const withLoss = dkGoalieScore({ saves: 10, goalsAllowed: 3, win: false })
    expect(withWin - withLoss).toBeCloseTo(6, 4)
  })

  it('returns 6 for shutout win with 0 saves', () => {
    expect(dkGoalieScore({ saves: 0, goalsAllowed: 0, win: true })).toBe(6)
  })

  it('penalizes goals allowed', () => {
    const good = dkGoalieScore({ saves: 5, goalsAllowed: 1, win: false })
    const bad = dkGoalieScore({ saves: 5, goalsAllowed: 5, win: false })
    expect(good).toBeGreaterThan(bad)
  })

  it('returns 0 for all-zero stats with no win', () => {
    expect(dkGoalieScore({ saves: 0, goalsAllowed: 0, win: false })).toBe(0)
  })
})
