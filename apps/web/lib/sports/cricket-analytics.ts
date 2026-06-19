/**
 * cricket-analytics.ts
 * Pure TypeScript cricket analytics — no external dependencies.
 * All functions are pure (no side effects, no I/O).
 */

// ---------------------------------------------------------------------------
// Batting Stats
// ---------------------------------------------------------------------------

/**
 * Batting average: runs / (innings - notOuts)
 * Returns Infinity if all innings are not-outs (divisor = 0).
 */
export function battingAverage(
  runs: number,
  innings: number,
  notOuts: number,
): number {
  const dismissals = innings - notOuts
  if (dismissals <= 0) return Infinity
  return runs / dismissals
}

/**
 * Strike rate: (runs / ballsFaced) * 100
 * Returns 0 if no balls faced.
 */
export function strikeRate(runs: number, ballsFaced: number): number {
  if (ballsFaced <= 0) return 0
  return (runs / ballsFaced) * 100
}

/**
 * Batting index: weighted combination of average and strike rate.
 * Test:  avg×70% + SR×30%
 * ODI:   avg×50% + SR×50%
 * T20:   avg×30% + SR×70%
 */
export function battingIndex(
  average: number,
  sr: number,
  format: 'test' | 'odi' | 't20',
): number {
  switch (format) {
    case 'test':
      return average * 0.7 + sr * 0.3
    case 'odi':
      return average * 0.5 + sr * 0.5
    case 't20':
      return average * 0.3 + sr * 0.7
  }
}

/**
 * Counts centuries (≥100), fifties (50–99), ducks (0), and the high score
 * from an array of individual innings scores.
 */
export function centuriesAndFifties(scores: number[]): {
  centuries: number
  fifties: number
  ducks: number
  highScore: number
} {
  if (scores.length === 0) {
    return { centuries: 0, fifties: 0, ducks: 0, highScore: 0 }
  }
  let centuries = 0
  let fifties = 0
  let ducks = 0
  let highScore = 0

  for (const s of scores) {
    if (s >= 100) centuries++
    else if (s >= 50) fifties++
    if (s === 0) ducks++
    if (s > highScore) highScore = s
  }

  return { centuries, fifties, ducks, highScore }
}

/**
 * Consistency score: 100 - (stddev / mean) * 100, clamped to 0–100.
 * Returns 100 for a single score (perfect consistency).
 * Returns 0 if mean is 0.
 */
export function consistencyScore(scores: number[]): number {
  if (scores.length === 0) return 0
  if (scores.length === 1) return 100

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  if (mean === 0) return 0

  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length
  const std = Math.sqrt(variance)
  const raw = 100 - (std / mean) * 100
  return Math.max(0, Math.min(100, raw))
}

// ---------------------------------------------------------------------------
// Bowling Stats
// ---------------------------------------------------------------------------

/**
 * Bowling average: runs conceded per wicket.
 * Returns Infinity if 0 wickets taken.
 */
export function bowlingAverage(
  runsConceded: number,
  wickets: number,
): number {
  if (wickets <= 0) return Infinity
  return runsConceded / wickets
}

/**
 * Economy rate: runs conceded per over.
 * Returns 0 if no overs bowled.
 */
export function economyRate(
  runsConceded: number,
  oversBowled: number,
): number {
  if (oversBowled <= 0) return 0
  return runsConceded / oversBowled
}

/**
 * Bowling strike rate: balls bowled per wicket.
 * Returns Infinity if 0 wickets taken.
 */
export function bowlingStrikeRate(
  ballsBowled: number,
  wickets: number,
): number {
  if (wickets <= 0) return Infinity
  return ballsBowled / wickets
}

/**
 * Bowler rating (lower = better).
 * Test: avg×40% + SR×40% + economy×20%
 * ODI:  avg×33% + SR×33% + economy×34%
 * T20:  avg×20% + SR×30% + economy×50%
 */
export function bowlerRating(
  average: number,
  economy: number,
  sr: number,
  format: 'test' | 'odi' | 't20',
): number {
  switch (format) {
    case 'test':
      return average * 0.4 + sr * 0.4 + economy * 0.2
    case 'odi':
      return average * 0.33 + sr * 0.33 + economy * 0.34
    case 't20':
      return average * 0.2 + sr * 0.3 + economy * 0.5
  }
}

/**
 * Maiden rate: (maidens / overs) * 100 (percentage of overs that are maidens).
 * Returns 0 if no overs bowled.
 */
export function maidenRate(maidens: number, overs: number): number {
  if (overs <= 0) return 0
  return (maidens / overs) * 100
}

// ---------------------------------------------------------------------------
// Fielding
// ---------------------------------------------------------------------------

/**
 * Fielding contribution: catches×1 + runOuts×2 + stumpings×2
 */
export function fieldingContribution(
  catches: number,
  runOuts: number,
  stumpings: number,
): number {
  return catches * 1 + runOuts * 2 + stumpings * 2
}

/**
 * Fielding efficiency: (successful / attempts) * 100, clamped 0–100.
 * Returns 0 if no attempts.
 */
export function fieldingEfficiency(
  successful: number,
  attempts: number,
): number {
  if (attempts <= 0) return 0
  return Math.max(0, Math.min(100, (successful / attempts) * 100))
}

// ---------------------------------------------------------------------------
// Team / Match Analytics
// ---------------------------------------------------------------------------

/**
 * Net run rate: (runsFor/oversFor) - (runsAgainst/oversAgainst)
 * Returns 0 if either overs value is 0.
 */
export function netRunRate(
  runsFor: number,
  oversFor: number,
  runsAgainst: number,
  oversAgainst: number,
): number {
  if (oversFor <= 0 || oversAgainst <= 0) return 0
  return runsFor / oversFor - runsAgainst / oversAgainst
}

/**
 * Required run rate: runsNeeded / oversRemaining.
 * Returns Infinity if no overs remaining.
 */
export function requiredRunRate(
  runsNeeded: number,
  oversRemaining: number,
): number {
  if (oversRemaining <= 0) return Infinity
  return runsNeeded / oversRemaining
}

/**
 * Projected score: linear projection from current run rate.
 * Returns currentRuns if currentOvers is 0.
 */
export function projectedScore(
  currentRuns: number,
  currentOvers: number,
  totalOvers: number,
): number {
  if (currentOvers <= 0) return currentRuns
  return (currentRuns / currentOvers) * totalOvers
}

/**
 * Powerplay analysis: runs per over + wickets pressure classification.
 * RPO = powerplayRuns / 6 (powerplay is 6 overs).
 * wicketsPressure: 0–1 → 'low', 2–3 → 'medium', 4+ → 'high'
 */
export function powerplayAnalysis(
  powerplayRuns: number,
  powerplayWickets: number,
): { rpo: number; wicketsPressure: 'low' | 'medium' | 'high' } {
  const rpo = powerplayRuns / 6
  let wicketsPressure: 'low' | 'medium' | 'high'
  if (powerplayWickets <= 1) {
    wicketsPressure = 'low'
  } else if (powerplayWickets <= 3) {
    wicketsPressure = 'medium'
  } else {
    wicketsPressure = 'high'
  }
  return { rpo, wicketsPressure }
}

/**
 * Death overs rate: runs per over adjusted for wickets fallen.
 * rpm / (1 + wicketsFallen * 0.1)
 * Returns 0 if overs16to20 is 0.
 */
export function deathOversRate(
  overs16to20Runs: number,
  wicketsFallen: number,
): number {
  const overs = 5 // overs 16–20
  if (overs <= 0) return 0
  const rpm = overs16to20Runs / overs
  return rpm / (1 + wicketsFallen * 0.1)
}

// ---------------------------------------------------------------------------
// DLS (Simplified Duckworth-Lewis-Stern)
// ---------------------------------------------------------------------------

/**
 * DLS resources remaining (simplified Z(u,w)).
 * resource% = (1 - wicketsLost/10) * (oversRemaining/totalOvers) * 100
 * Clamped 0–100. totalOvers defaults to 50.
 */
export function dlsResourcesRemaining(
  oversRemaining: number,
  wicketsLost: number,
  totalOvers: number = 50,
): number {
  if (totalOvers <= 0) return 0
  const raw =
    (1 - wicketsLost / 10) * (oversRemaining / totalOvers) * 100
  return Math.max(0, Math.min(100, raw))
}

/**
 * DLS par score: target × (resourcesAtResumption / resourcesAtInterruption), floored.
 * Returns 0 if resourcesAtInterruption is 0.
 */
export function dlsParScore(
  targetScore: number,
  resourcesAtInterruption: number,
  resourcesAtResumption: number,
): number {
  if (resourcesAtInterruption <= 0) return 0
  return Math.floor(
    targetScore * (resourcesAtResumption / resourcesAtInterruption),
  )
}

/**
 * Match abandoned result.
 * Returns 'no_result' if either team faced fewer overs than minimumOvers.
 * Otherwise compares scores; 'tie' if equal.
 */
export function matchAbandonedResult(
  team1Score: number,
  team1Overs: number,
  team2Score: number,
  team2Overs: number,
  minimumOvers: number,
): 'team1_wins' | 'team2_wins' | 'tie' | 'no_result' {
  if (team1Overs < minimumOvers || team2Overs < minimumOvers) {
    return 'no_result'
  }
  if (team1Score > team2Score) return 'team1_wins'
  if (team2Score > team1Score) return 'team2_wins'
  return 'tie'
}

// ---------------------------------------------------------------------------
// Format-Specific Adjustments
// ---------------------------------------------------------------------------

/**
 * T20 power index: SR×0.6 + avg×0.4
 */
export function t20PowerIndex(strikeRate: number, average: number): number {
  return strikeRate * 0.6 + average * 0.4
}

/**
 * Test batting value: avg×0.7 + consistency×0.3
 */
export function testBattingValue(
  average: number,
  consistency: number,
): number {
  return average * 0.7 + consistency * 0.3
}

/**
 * ODI all-rounder rating:
 * (battingAvg/30 + battingODISR/80 - bowlingAvg/30 - economyRate/6) * 25
 * Clamped to -100 to 100.
 */
export function odiAllRounderRating(
  battingAvg: number,
  battingODISR: number,
  bowlingAvg: number,
  economyRt: number,
): number {
  const raw =
    (battingAvg / 30 + battingODISR / 80 - bowlingAvg / 30 - economyRt / 6) *
    25
  return Math.max(-100, Math.min(100, raw))
}

// ---------------------------------------------------------------------------
// Fantasy Scoring (DraftKings Cricket)
// ---------------------------------------------------------------------------

export interface DraftKingsCricketStats {
  runs: number
  fours: number
  sixes: number
  halfCentury: boolean
  century: boolean
  wickets: number
  maidens: number
  catches: number
  runOuts: number
  stumpings: number
  duckBatting: boolean
}

/**
 * DraftKings cricket fantasy score.
 * run=1, four=0.5, six=1, halfCentury=10, century=20,
 * wicket=25, maiden=4, catch=8, runOut=12, stumping=12, duck=−5
 */
export function draftKingsCricketScore(
  stats: DraftKingsCricketStats,
): number {
  let score = 0
  score += stats.runs * 1
  score += stats.fours * 0.5
  score += stats.sixes * 1
  if (stats.halfCentury) score += 10
  if (stats.century) score += 20
  score += stats.wickets * 25
  score += stats.maidens * 4
  score += stats.catches * 8
  score += stats.runOuts * 12
  score += stats.stumpings * 12
  if (stats.duckBatting) score -= 5
  return score
}

// ---------------------------------------------------------------------------
// Pitch Analytics
// ---------------------------------------------------------------------------

export type PitchType =
  | 'spin_friendly'
  | 'seam_friendly'
  | 'batting_paradise'
  | 'balanced'

/**
 * Classifies pitch type.
 * If totalWickets < 5 → 'batting_paradise'
 * Else spin% > 60 → 'spin_friendly', seam% > 60 → 'seam_friendly', else 'balanced'
 */
export function pitchType(
  spinWickets: number,
  seamWickets: number,
  totalWickets: number,
): PitchType {
  if (totalWickets < 5) return 'batting_paradise'
  const spinPct = (spinWickets / totalWickets) * 100
  const seamPct = (seamWickets / totalWickets) * 100
  if (spinPct > 60) return 'spin_friendly'
  if (seamPct > 60) return 'seam_friendly'
  return 'balanced'
}

export interface PitchBettingEdge {
  highScoreProb: number
  spinnerAdv: number
}

/**
 * Pitch betting edge: returns probability of high score and spinner advantage
 * based on format, pitch type, and whether team is batting first.
 * Values are archetype-based reasoning, not live calibrated stats.
 */
export function pitchBettingEdge(
  format: 'test' | 'odi' | 't20',
  pitch: PitchType,
  battingFirst: boolean,
): PitchBettingEdge {
  // Base lookup table: [highScoreProb, spinnerAdv]
  // highScoreProb: 0–100 (likelihood of a high-scoring match)
  // spinnerAdv: 0–100 (how much spin bowling is favoured)
  const lookup: Record<
    'test' | 'odi' | 't20',
    Record<PitchType, [number, number]>
  > = {
    test: {
      batting_paradise: [80, 20],
      spin_friendly: [45, 75],
      seam_friendly: [40, 15],
      balanced: [60, 45],
    },
    odi: {
      batting_paradise: [85, 15],
      spin_friendly: [55, 65],
      seam_friendly: [50, 20],
      balanced: [65, 40],
    },
    t20: {
      batting_paradise: [90, 10],
      spin_friendly: [65, 60],
      seam_friendly: [60, 20],
      balanced: [70, 35],
    },
  }

  const [baseHighScoreProb, baseSpinnerAdv] = lookup[format][pitch]

  // Batting-first teams tend to set big totals on batting paradises, slight boost
  const highScoreProbAdj = battingFirst ? baseHighScoreProb + 3 : baseHighScoreProb - 3
  const spinnerAdvAdj = battingFirst ? baseSpinnerAdv - 2 : baseSpinnerAdv + 2

  return {
    highScoreProb: Math.max(0, Math.min(100, highScoreProbAdj)),
    spinnerAdv: Math.max(0, Math.min(100, spinnerAdvAdj)),
  }
}
