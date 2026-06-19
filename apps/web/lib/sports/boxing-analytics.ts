/**
 * boxing-analytics.ts
 * Pure TypeScript boxing analytics — zero npm dependencies, no side effects.
 */

// ---------------------------------------------------------------------------
// 1. Strike statistics
// ---------------------------------------------------------------------------

/** landed/thrown; 0 if thrown=0 */
export function punchAccuracy(landed: number, thrown: number): number {
  if (thrown === 0) return 0
  return landed / thrown
}

/** sum of jabs + power + body */
export function totalPunchOutput(jabs: number, power: number, body: number): number {
  return jabs + power + body
}

/** average punches per round; 0 if rounds=0 */
export function punchesPerRound(totalPunches: number, rounds: number): number {
  if (rounds === 0) return 0
  return totalPunches / rounds
}

/** power punch ratio; 0 if totalLanded=0 */
export function powerPunchRatio(powerLanded: number, totalLanded: number): number {
  if (totalLanded === 0) return 0
  return powerLanded / totalLanded
}

/** jab accuracy; 0 if jabsThrown=0 */
export function jabAccuracy(jabsLanded: number, jabsThrown: number): number {
  if (jabsThrown === 0) return 0
  return jabsLanded / jabsThrown
}

/** body punch ratio; 0 if totalLanded=0 */
export function bodyPunchRatio(bodyLanded: number, totalLanded: number): number {
  if (totalLanded === 0) return 0
  return bodyLanded / totalLanded
}

/** (landed/thrown) * damageScore; 0 if thrown=0 */
export function punchingEfficiency(
  landed: number,
  thrown: number,
  damageScore: number
): number {
  if (thrown === 0) return 0
  return (landed / thrown) * damageScore
}

// ---------------------------------------------------------------------------
// 2. Physical attributes
// ---------------------------------------------------------------------------

/** signed reach difference (my - opponent) */
export function reachAdvantage(myReachCm: number, opponentReachCm: number): number {
  return myReachCm - opponentReachCm
}

/** signed height difference (my - opponent) */
export function heightAdvantage(myHeightCm: number, opponentHeightCm: number): number {
  return myHeightCm - opponentHeightCm
}

export interface WeightClassRange {
  min: number
  max: number
}

/**
 * Standard boxing weight class limits (kg):
 * flyweight ≤ 50.8, bantamweight ≤ 53.5, featherweight ≤ 57.2,
 * lightweight ≤ 61.2, welterweight ≤ 66.7, middleweight ≤ 72.6,
 * light_heavyweight ≤ 79.4, cruiserweight ≤ 90.7, heavyweight > 90.7
 */
export function weightClassRange(weightClassKg: number): WeightClassRange {
  if (weightClassKg <= 50.8) {
    return { min: 0, max: 50.8 }
  } else if (weightClassKg <= 53.5) {
    return { min: 50.801, max: 53.5 }
  } else if (weightClassKg <= 57.2) {
    return { min: 53.501, max: 57.2 }
  } else if (weightClassKg <= 61.2) {
    return { min: 57.201, max: 61.2 }
  } else if (weightClassKg <= 66.7) {
    return { min: 61.201, max: 66.7 }
  } else if (weightClassKg <= 72.6) {
    return { min: 66.701, max: 72.6 }
  } else if (weightClassKg <= 79.4) {
    return { min: 72.601, max: 79.4 }
  } else if (weightClassKg <= 90.7) {
    return { min: 79.401, max: 90.7 }
  } else {
    return { min: 90.701, max: Infinity }
  }
}

/** positive = cutting weight */
export function weightCutAmount(fightWeightKg: number, walkaroundWeightKg: number): number {
  return walkaroundWeightKg - fightWeightKg
}

/** <3kg safe, 3–5 moderate, >5 dangerous */
export function weightCutRisk(cutKg: number): 'safe' | 'moderate' | 'dangerous' {
  if (cutKg < 3) return 'safe'
  if (cutKg <= 5) return 'moderate'
  return 'dangerous'
}

// ---------------------------------------------------------------------------
// 3. Performance ratings
// ---------------------------------------------------------------------------

/** knockdowns per round fought */
export function knockdownRatio(knockdowns: number, roundsFought: number): number {
  if (roundsFought === 0) return 0
  return knockdowns / roundsFought
}

/** KO ratio */
export function koRate(knockouts: number, totalFights: number): number {
  if (totalFights === 0) return 0
  return knockouts / totalFights
}

/** TKO+KO / total fights; 0 if 0 */
export function stoppageRate(stoppages: number, totalFights: number): number {
  if (totalFights === 0) return 0
  return stoppages / totalFights
}

/** decision ratio */
export function decisionRate(decisions: number, totalFights: number): number {
  if (totalFights === 0) return 0
  return decisions / totalFights
}

/** (punches/rounds) * 0.7 + knockdowns * 5; 0 if rounds=0 */
export function activityScore(
  punchesThrown: number,
  roundsFought: number,
  knockdowns: number
): number {
  if (roundsFought === 0) return 0
  return (punchesThrown / roundsFought) * 0.7 + knockdowns * 5
}

/** (advances * 2 + punchOutput * 0.1) / (clinches + 1) */
export function aggressivenessRating(
  advances: number,
  clinches: number,
  punchOutput: number
): number {
  return (advances * 2 + punchOutput * 0.1) / (clinches + 1)
}

/**
 * 100 * (1 - absorbed/Math.max(punchesThrown, 1)) - knockdownsSuffered * 10
 * clamped 0–100
 */
export function defensiveRating(
  punchesAbsorbed: number,
  punchesThrown: number,
  knockdownsSuffered: number
): number {
  const raw = 100 * (1 - punchesAbsorbed / Math.max(punchesThrown, 1)) - knockdownsSuffered * 10
  return Math.min(100, Math.max(0, raw))
}

// ---------------------------------------------------------------------------
// 4. KO probability model
// ---------------------------------------------------------------------------

export interface FighterKOProfile {
  koRate: number
  powerPunchLanded: number
  knockdownsScored: number
  fights: number
}

export interface OpponentDurabilityProfile {
  chinDurability: number
  hasBeenKd: boolean
  fights: number
}

/**
 * P(KO) = fighter.koRate * 0.5 + (fighter.powerPunchLanded/100) * 0.3
 *        + (fighter.knockdownsScored / fighter.fights) * 0.2
 * adjust down if opponent.chinDurability > 0.8; clamped 0–1
 */
export function koProbabilityModel(
  fighter: FighterKOProfile,
  opponent: OpponentDurabilityProfile
): number {
  const fightDivisor = fighter.fights === 0 ? 1 : fighter.fights
  let p =
    fighter.koRate * 0.5 +
    (fighter.powerPunchLanded / 100) * 0.3 +
    (fighter.knockdownsScored / fightDivisor) * 0.2
  if (opponent.chinDurability > 0.8) {
    p *= 1 - (opponent.chinDurability - 0.8)
  }
  return Math.min(1, Math.max(0, p))
}

/** proportion of KOs that come early (round 1–3) */
export function earlyKoProbability(koRate: number, earlyKoRate: number): number {
  if (koRate === 0) return 0
  return earlyKoRate / koRate
}

/**
 * P(late stoppage) = accumulatedDamage * (1 - chinRating) / (roundsCompleted + 1)
 * clamped 0–1
 */
export function sustainedPressureKO(
  roundsCompleted: number,
  accumulatedDamage: number,
  chinRating: number
): number {
  const p = (accumulatedDamage * (1 - chinRating)) / (roundsCompleted + 1)
  return Math.min(1, Math.max(0, p))
}

// ---------------------------------------------------------------------------
// 5. Round scoring (10-point must)
// ---------------------------------------------------------------------------

export interface RoundFighterStats {
  punches: number
  knockdowns: number
  aggression: number
  defense: number
}

export interface RoundScoreResult {
  scores: [number, number]
  winner: 1 | 2 | 'even'
}

/**
 * 10-point must system.
 * Aggregate score = punches + aggression + defense (base stats).
 * Knockdowns scored shift the outcome: each net KD costs the loser 1 additional point.
 * No knockdowns → 10-9; one net KD → 10-8; two net KDs → 10-8 (min 7 floor).
 * If base stats and knockdowns are exactly equal → 10-10 even.
 */
export function scoreRound(
  fighter1: RoundFighterStats,
  fighter2: RoundFighterStats
): RoundScoreResult {
  const score1 = fighter1.punches + fighter1.aggression + fighter1.defense
  const score2 = fighter2.punches + fighter2.aggression + fighter2.defense

  if (score1 === score2 && fighter1.knockdowns === fighter2.knockdowns) {
    return { scores: [10, 10], winner: 'even' }
  }

  // Determine winner by composite score including knockdowns (10 pts each for decisiveness)
  const total1 = score1 + fighter1.knockdowns * 10
  const total2 = score2 + fighter2.knockdowns * 10

  if (total1 > total2) {
    // Fighter 1 wins. Base deduction is 1 (standard 10-9), plus 1 per net knockdown.
    const netKd = Math.max(0, fighter1.knockdowns - fighter2.knockdowns)
    const loserScore = Math.max(7, 9 - netKd)
    return { scores: [10, loserScore], winner: 1 }
  } else if (total2 > total1) {
    const netKd = Math.max(0, fighter2.knockdowns - fighter1.knockdowns)
    const loserScore = Math.max(7, 9 - netKd)
    return { scores: [loserScore, 10], winner: 2 }
  } else {
    // totals equal — treat as even
    return { scores: [10, 10], winner: 'even' }
  }
}

export interface ScorecardRound {
  scores: [number, number]
}

export interface ScorecardTotal {
  total: [number, number]
  winner: 1 | 2 | 'draw'
}

/** sum all rounds, determine winner */
export function scorecardTotal(rounds: ScorecardRound[]): ScorecardTotal {
  let t1 = 0
  let t2 = 0
  for (const r of rounds) {
    t1 += r.scores[0] ?? 0
    t2 += r.scores[1] ?? 0
  }
  const winner: 1 | 2 | 'draw' = t1 > t2 ? 1 : t2 > t1 ? 2 : 'draw'
  return { total: [t1, t2], winner }
}

/**
 * Average pairwise score difference across judges.
 * Each judge supplies an array of per-round scores for fighter1.
 * judges[i] is judge i's scores for each round.
 */
export function judgeVariance(judges: number[][]): number {
  if (judges.length < 2) return 0
  let totalDiff = 0
  let pairs = 0
  for (let i = 0; i < judges.length; i++) {
    for (let j = i + 1; j < judges.length; j++) {
      const judgeI = judges[i] ?? []
      const judgeJ = judges[j] ?? []
      const len = Math.max(judgeI.length, judgeJ.length)
      let diff = 0
      for (let k = 0; k < len; k++) {
        diff += Math.abs((judgeI[k] ?? 0) - (judgeJ[k] ?? 0))
      }
      totalDiff += diff
      pairs++
    }
  }
  return pairs === 0 ? 0 : totalDiff / pairs
}

/**
 * True if any judge scored differently from the majority.
 * Each entry in judges is an array of round scores for fighter1 (one array per judge).
 */
export function controversialDecision(judges: number[][]): boolean {
  if (judges.length < 2) return false
  // Compute each judge's total for fighter1
  const totals = judges.map(j => j.reduce((s, v) => s + v, 0))
  // Determine majority winner direction: more judges for f1 or f2?
  const majorityWinner = totals.filter(t => t > 0).length >= Math.ceil(judges.length / 2) ? 'f1' : 'f2'
  // A split: any judge on the other side
  const f1Wins = totals.filter(t => t > 0).length
  const f2Wins = totals.filter(t => t < 0).length
  if (majorityWinner === 'f1') return f2Wins > 0
  return f1Wins > 0
}

// ---------------------------------------------------------------------------
// 6. Historical analysis
// ---------------------------------------------------------------------------

export type FightResult2 = 'W' | 'L' | 'D' | 'NC'

/** wins from most recent result; stop at first non-W */
export function winStreakCurrent(results: FightResult2[]): number {
  let streak = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if ((results[i] ?? 'L') === 'W') {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** losses from most recent result; stop at first non-L */
export function lossStreakCurrent(results: FightResult2[]): number {
  let streak = 0
  for (let i = results.length - 1; i >= 0; i--) {
    if ((results[i] ?? 'W') === 'L') {
      streak++
    } else {
      break
    }
  }
  return streak
}

/**
 * Weighted score: W=1, D=0.5, L=0, NC=0.5.
 * Latest = weights[0] (index 0 = most recent).
 * Default equal weights.
 * Returns 0–1.
 */
export function formRating(results: FightResult2[], weights?: number[]): number {
  if (results.length === 0) return 0

  const reversed = [...results].reverse() // reversed[0] = most recent
  const w = weights ?? reversed.map(() => 1)

  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < reversed.length; i++) {
    const weight = w[i] ?? 1
    const result = reversed[i] ?? 'L'
    const score = result === 'W' ? 1 : result === 'D' ? 0.5 : result === 'NC' ? 0.5 : 0
    weightedSum += score * weight
    totalWeight += weight
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}

export interface OpponentRecord {
  wins: number
  losses: number
}

/** Average win% of opponents; 0 if empty */
export function opponentStrengthRating(opponentRecords: OpponentRecord[]): number {
  if (opponentRecords.length === 0) return 0
  let totalWinPct = 0
  for (const rec of opponentRecords) {
    const total = rec.wins + rec.losses
    totalWinPct += total === 0 ? 0 : rec.wins / total
  }
  return totalWinPct / opponentRecords.length
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Boxing/MMA overlap)
// ---------------------------------------------------------------------------

export type DKOutcome = 'KO' | 'TKO' | 'UD' | 'SD' | 'MD' | 'DQ' | 'NC' | 'loss'

export interface DKBoxingFight {
  outcome: DKOutcome
  roundsWon: number
  knockdowns: number
  totalPunches: number
}

/**
 * KO win=100, TKO=90, UD=70, SD=65, MD=67, loss=0, DQ win=50, NC=0
 * +5 per knockdown
 * +0.1 per punch landed (capped at 20 bonus)
 */
export function dkBoxingPoints(result: DKBoxingFight): number {
  let base = 0
  switch (result.outcome) {
    case 'KO':
      base = 100
      break
    case 'TKO':
      base = 90
      break
    case 'UD':
      base = 70
      break
    case 'MD':
      base = 67
      break
    case 'SD':
      base = 65
      break
    case 'DQ':
      base = 50
      break
    case 'loss':
      base = 0
      break
    case 'NC':
      base = 0
      break
  }

  const kdBonus = result.knockdowns * 5
  const punchBonus = Math.min(20, result.totalPunches * 0.1)

  return base + kdBonus + punchBonus
}

/**
 * Weighted average of recent fights.
 * Most recent fight = 3x weight, all others = 1x weight.
 */
export function dkBoxingProjection(
  recentFights: DKBoxingFight[]
): number {
  if (recentFights.length === 0) return 0

  const reversed = [...recentFights].reverse() // reversed[0] = most recent

  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < reversed.length; i++) {
    const fight = reversed[i]
    if (fight === undefined) continue
    const weight = i === 0 ? 3 : 1
    weightedSum += dkBoxingPoints(fight) * weight
    totalWeight += weight
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}
