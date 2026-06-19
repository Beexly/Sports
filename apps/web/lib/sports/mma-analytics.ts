/**
 * mma-analytics.ts
 * Pure TypeScript MMA/UFC analytics — zero npm dependencies, no side effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrikingStats {
  significant_strikes_landed: number
  significant_strikes_attempted: number
  total_strikes_landed: number
  total_strikes_attempted: number
  head_strikes_landed: number
  body_strikes_landed: number
  leg_strikes_landed: number
  knockdowns: number
}

export interface GrapplingStats {
  takedowns_landed: number
  takedowns_attempted: number
  /** attempts defended / total attempts faced — already a 0-1 ratio */
  takedown_defense: number
  submissions_attempted: number
  /** seconds of control time */
  control_time: number
  reversals: number
}

export interface FightStats {
  fighter: string
  round: number
  striking: StrikingStats
  grappling: GrapplingStats
  distance_time: number
  clinch_time: number
  ground_time: number
}

export interface RoundScore {
  fighter1: number
  fighter2: number
}

export interface FightResult {
  winner: string | null // null = draw
  method: 'KO/TKO' | 'Submission' | 'Decision' | 'DQ' | 'NC'
  round?: number
  time?: string
}

export interface FighterProfile {
  name: string
  wins: number
  losses: number
  draws: number
  noContests: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safely divide; returns 0 when denominator is 0. */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ---------------------------------------------------------------------------
// Striking analytics
// ---------------------------------------------------------------------------

/**
 * Significant strike accuracy: landed / attempted.
 * Returns 0 when no strikes were attempted.
 */
export function significantStrikeAccuracy(stats: StrikingStats): number {
  return safeDivide(stats.significant_strikes_landed, stats.significant_strikes_attempted)
}

/**
 * Significant strikes per minute.
 * Returns 0 when minutes is 0.
 */
export function significantStrikesPerMinute(stats: StrikingStats, minutes: number): number {
  return safeDivide(stats.significant_strikes_landed, minutes)
}

/**
 * Total strike accuracy: total_landed / total_attempted.
 */
export function totalStrikeAccuracy(stats: StrikingStats): number {
  return safeDivide(stats.total_strikes_landed, stats.total_strikes_attempted)
}

/**
 * Head strike ratio: head_landed / (head + body + leg) landed.
 */
export function headStrikeRatio(stats: StrikingStats): number {
  const total = stats.head_strikes_landed + stats.body_strikes_landed + stats.leg_strikes_landed
  return safeDivide(stats.head_strikes_landed, total)
}

/**
 * Body strike ratio: body_landed / (head + body + leg) landed.
 */
export function bodyStrikeRatio(stats: StrikingStats): number {
  const total = stats.head_strikes_landed + stats.body_strikes_landed + stats.leg_strikes_landed
  return safeDivide(stats.body_strikes_landed, total)
}

/**
 * Leg strike ratio: leg_landed / (head + body + leg) landed.
 */
export function legStrikeRatio(stats: StrikingStats): number {
  const total = stats.head_strikes_landed + stats.body_strikes_landed + stats.leg_strikes_landed
  return safeDivide(stats.leg_strikes_landed, total)
}

/**
 * Knockdown rate: knockdowns per fight.
 */
export function knockdownRate(stats: StrikingStats, fights: number): number {
  return safeDivide(stats.knockdowns, fights)
}

/**
 * Strike volume per minute: { significant, total }.
 */
export function strikeVolume(
  stats: StrikingStats,
  minutes: number,
): { significant: number; total: number } {
  return {
    significant: safeDivide(stats.significant_strikes_landed, minutes),
    total: safeDivide(stats.total_strikes_landed, minutes),
  }
}

/**
 * Offensive output: composite score = sig_strikes_per_min × accuracy.
 */
export function offensiveOutput(stats: StrikingStats, minutes: number): number {
  return significantStrikesPerMinute(stats, minutes) * significantStrikeAccuracy(stats)
}

// ---------------------------------------------------------------------------
// Grappling analytics
// ---------------------------------------------------------------------------

/**
 * Takedown accuracy: landed / attempted.
 */
export function takedownAccuracy(stats: GrapplingStats): number {
  return safeDivide(stats.takedowns_landed, stats.takedowns_attempted)
}

/**
 * Takedown defense percentage.
 * takedown_defense is already a 0-1 ratio (attempts defended / total attempts faced).
 */
export function takedownDefensePct(stats: GrapplingStats): number {
  return stats.takedown_defense
}

/**
 * Control time as a percentage of total fight time.
 */
export function controlTimePercentage(totalSeconds: number, controlTime: number): number {
  return safeDivide(controlTime, totalSeconds)
}

/**
 * Submission attempt rate: attempts per fight.
 */
export function submissionAttemptRate(stats: GrapplingStats, fights: number): number {
  return safeDivide(stats.submissions_attempted, fights)
}

/**
 * Composite grappling score:
 *   takedownAccuracy × 0.3
 * + takedownDefensePct × 0.3
 * + controlPct × 0.2
 * + (submissionsAttempted > 0 ? 0.2 : 0)
 */
export function grapplingScore(stats: GrapplingStats, totalFightSeconds: number): number {
  const tdAcc = takedownAccuracy(stats)
  const tdDef = takedownDefensePct(stats)
  const ctrlPct = controlTimePercentage(totalFightSeconds, stats.control_time)
  const subBonus = stats.submissions_attempted > 0 ? 0.2 : 0
  return tdAcc * 0.3 + tdDef * 0.3 + ctrlPct * 0.2 + subBonus
}

/**
 * Ground control ratio: ground_time / totalFightSeconds.
 * Uses FightStats for ground_time.
 */
export function groundControlRatio(stats: GrapplingStats, totalFightSeconds: number): number {
  // ground_time lives on FightStats; here totalFightSeconds is the denominator
  // The spec says to use GrapplingStats + totalFightSeconds — we need ground_time
  // but GrapplingStats doesn't have it. The spec says "use FightStats for ground_time"
  // as a note. This function signature takes GrapplingStats + totalFightSeconds.
  // We use control_time as the numerator (best available from GrapplingStats).
  return safeDivide(stats.control_time, totalFightSeconds)
}

// ---------------------------------------------------------------------------
// Fight position time (FightStats-based)
// ---------------------------------------------------------------------------

function totalPositionTime(stats: FightStats): number {
  return stats.distance_time + stats.clinch_time + stats.ground_time
}

/**
 * Fraction of fight time spent at distance.
 */
export function distanceTimeRatio(stats: FightStats): number {
  return safeDivide(stats.distance_time, totalPositionTime(stats))
}

/**
 * Fraction of fight time spent in clinch.
 */
export function clinchTimeRatio(stats: FightStats): number {
  return safeDivide(stats.clinch_time, totalPositionTime(stats))
}

/**
 * Fraction of fight time spent on the ground.
 */
export function groundTimeRatio(stats: FightStats): number {
  return safeDivide(stats.ground_time, totalPositionTime(stats))
}

/**
 * Infer fighting style:
 * - striker: distanceRatio > 0.6
 * - wrestler: groundRatio > 0.4 AND takedownAccuracy > 0.5
 * - grappler: groundRatio > 0.4 AND submissionsAttempted > 0
 * - all-around: else
 */
export function fighterStyle(
  stats: FightStats,
): 'striker' | 'wrestler' | 'grappler' | 'all-around' {
  const distRatio = distanceTimeRatio(stats)
  const groundRatio = groundTimeRatio(stats)
  const tdAcc = takedownAccuracy(stats.grappling)

  if (distRatio > 0.6) return 'striker'
  if (groundRatio > 0.4 && tdAcc > 0.5) return 'wrestler'
  if (groundRatio > 0.4 && stats.grappling.submissions_attempted > 0) return 'grappler'
  return 'all-around'
}

// ---------------------------------------------------------------------------
// Round scoring (10-point must system)
// ---------------------------------------------------------------------------

/**
 * Score a single round using the 10-point must system.
 * Dominant fighter = higher (significant_strikes_landed + takedowns_landed × 1.5 + control_time / 60).
 * If one fighter lands a knockdown, the dominant fighter gets 10 and the other gets 8.
 * Otherwise dominant gets 10, other gets 9.
 */
export function scoreRound(f1: FightStats, f2: FightStats): RoundScore {
  const score = (s: FightStats): number =>
    s.striking.significant_strikes_landed +
    s.grappling.takedowns_landed * 1.5 +
    s.grappling.control_time / 60

  const s1 = score(f1)
  const s2 = score(f2)

  const knockdown = f1.striking.knockdowns > 0 || f2.striking.knockdowns > 0

  if (s1 > s2) {
    return { fighter1: 10, fighter2: knockdown ? 8 : 9 }
  } else if (s2 > s1) {
    return { fighter1: knockdown ? 8 : 9, fighter2: 10 }
  }
  // Even round
  return { fighter1: 10, fighter2: 10 }
}

/**
 * Sum scorecard across all rounds.
 */
export function judgeScorecard(
  rounds: { f1: FightStats; f2: FightStats }[],
): { fighter1: number; fighter2: number } {
  return rounds.reduce(
    (acc, { f1, f2 }) => {
      const r = scoreRound(f1, f2)
      return { fighter1: acc.fighter1 + r.fighter1, fighter2: acc.fighter2 + r.fighter2 }
    },
    { fighter1: 0, fighter2: 0 },
  )
}

/**
 * Determine the decision winner.
 * Returns 'fighter1', 'fighter2', or 'draw'.
 */
export function decisionWinner(rounds: { f1: FightStats; f2: FightStats }[]): string {
  const { fighter1, fighter2 } = judgeScorecard(rounds)
  if (fighter1 > fighter2) return 'fighter1'
  if (fighter2 > fighter1) return 'fighter2'
  return 'draw'
}

/**
 * Returns true if the specified fighter won every round.
 */
export function unanimousDecision(
  roundScores: RoundScore[],
  fighterKey: 'fighter1' | 'fighter2',
): boolean {
  const opponent: 'fighter1' | 'fighter2' = fighterKey === 'fighter1' ? 'fighter2' : 'fighter1'
  return roundScores.every((r) => r[fighterKey] > r[opponent])
}

// ---------------------------------------------------------------------------
// Career statistics
// ---------------------------------------------------------------------------

/**
 * Win-loss-draw record string.
 * Appends "-NC" suffix if noContests > 0.
 */
export function winLossRecord(profile: FighterProfile): string {
  const base = `${profile.wins}-${profile.losses}-${profile.draws}`
  return profile.noContests > 0 ? `${base}-NC` : base
}

/**
 * Win rate over decided fights (wins plus losses). Returns 0 if no fights.
 */
export function winRate(profile: FighterProfile): number {
  return safeDivide(profile.wins, profile.wins + profile.losses)
}

/**
 * Finish rate: finishWins / wins. Returns 0 if wins is 0.
 */
export function finishRate(wins: number, finishWins: number): number {
  return safeDivide(finishWins, wins)
}

/**
 * Active streak from the end of the results array.
 * Returns { type, count } for the current streak.
 * NC results do not break a streak (skip them).
 */
export function activeStreak(
  results: ('W' | 'L' | 'D' | 'NC')[],
): { type: 'W' | 'L' | 'D'; count: number } {
  // Walk from end, skip NC
  let streakType: 'W' | 'L' | 'D' | null = null
  let count = 0

  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i]
    if (r === undefined || r === 'NC') continue
    if (streakType === null) {
      streakType = r
      count = 1
    } else if (r === streakType) {
      count++
    } else {
      break
    }
  }

  if (streakType === null) {
    return { type: 'W', count: 0 }
  }
  return { type: streakType, count }
}

/**
 * Parse a time string "M:SS" into seconds.
 */
function parseTimeStr(timeStr: string): number {
  const parts = timeStr.split(':')
  const minutes = parseInt(parts[0] ?? '0', 10)
  const seconds = parseInt(parts[1] ?? '0', 10)
  return minutes * 60 + seconds
}

/**
 * Average fight time in seconds across multiple fights.
 * @param fights Array of { round, timeStr } where timeStr is "M:SS" (time elapsed in that round)
 * @param roundLength Seconds per round; defaults to 300
 */
export function averageFightTime(
  fights: { round: number; timeStr: string }[],
  roundLength: number = 300,
): number {
  if (fights.length === 0) return 0
  const total = fights.reduce((sum, f) => {
    const completedRounds = f.round - 1
    const timeInFinalRound = parseTimeStr(f.timeStr)
    return sum + completedRounds * roundLength + timeInFinalRound
  }, 0)
  return total / fights.length
}

/**
 * Knockout power rating: (knockdowns / fights) × significantStrikeAccuracy × 100, clamped [0, 100].
 */
export function knockoutPowerRating(stats: StrikingStats, fights: number): number {
  const kdRate = safeDivide(stats.knockdowns, fights)
  const acc = significantStrikeAccuracy(stats)
  return clamp(kdRate * acc * 100, 0, 100)
}

// ---------------------------------------------------------------------------
// Matchup analytics
// ---------------------------------------------------------------------------

/**
 * Striking advantage for f1 over f2.
 * (f1 SLpM × accuracy) − (f2 SLpM × accuracy); positive = f1 advantage.
 */
export function strikingAdvantage(
  f1: StrikingStats,
  f2: StrikingStats,
  f1Min: number,
  f2Min: number,
): number {
  const f1Output = offensiveOutput(f1, f1Min)
  const f2Output = offensiveOutput(f2, f2Min)
  return f1Output - f2Output
}

/**
 * Grappling advantage for f1 over f2.
 * f1 takedownAccuracy − f2 takedownDefense.
 */
export function grapplingAdvantage(f1: GrapplingStats, f2: GrapplingStats): number {
  return takedownAccuracy(f1) - takedownDefensePct(f2)
}

/**
 * Style matchup description.
 * Returns styles and a simple prediction string.
 */
export function styleMatchup(
  f1: FightStats,
  f2: FightStats,
): { f1Style: string; f2Style: string; prediction: string } {
  const f1Style = fighterStyle(f1)
  const f2Style = fighterStyle(f2)

  let prediction: string
  const pair = `${f1Style} vs ${f2Style}`

  // Simple rule-based prediction
  if (
    (f1Style === 'striker' && (f2Style === 'wrestler' || f2Style === 'grappler')) ||
    (f2Style === 'striker' && (f1Style === 'wrestler' || f1Style === 'grappler'))
  ) {
    if (f1Style === 'striker' && f2Style === 'wrestler') {
      prediction = 'grappling-likely'
    } else if (f1Style === 'wrestler' && f2Style === 'striker') {
      prediction = 'grappling-likely'
    } else if (f1Style === 'striker' && f2Style === 'grappler') {
      prediction = 'submission-likely'
    } else if (f1Style === 'grappler' && f2Style === 'striker') {
      prediction = 'submission-likely'
    } else {
      prediction = 'grappling-likely'
    }
  } else if (f1Style === 'striker' && f2Style === 'striker') {
    prediction = 'striking-likely'
  } else if (
    (f1Style === 'wrestler' || f1Style === 'grappler') &&
    (f2Style === 'wrestler' || f2Style === 'grappler')
  ) {
    prediction = 'grappling-likely'
  } else {
    prediction = `competitive — ${pair}`
  }

  return { f1Style, f2Style, prediction }
}

/**
 * Convert American odds to implied probability.
 * Negative odds: |odds| / (|odds| + 100)
 * Positive odds: 100 / (odds + 100)
 */
export function oddsImpliedProbability(americanOdds: number): number {
  if (americanOdds < 0) {
    const abs = Math.abs(americanOdds)
    return abs / (abs + 100)
  }
  return 100 / (americanOdds + 100)
}

const WEIGHT_CLASS_LIMITS: Record<string, number> = {
  strawweight: 115,
  flyweight: 125,
  bantamweight: 135,
  featherweight: 145,
  lightweight: 155,
  welterweight: 170,
  middleweight: 185,
  lightheavyweight: 205,
  heavyweight: 265,
  superheavyweight: Infinity,
}

/**
 * Return the pound limit for a given weight class name (lowercase, no spaces).
 * Returns Infinity for unknown classes.
 */
export function weightClassLimit(weightClass: string): number {
  const normalized = weightClass.toLowerCase().replace(/[\s_-]/g, '')
  return WEIGHT_CLASS_LIMITS[normalized] ?? Infinity
}

// ---------------------------------------------------------------------------
// Fantasy scoring — DraftKings MMA
// ---------------------------------------------------------------------------

export interface DKMMAInput {
  wins: boolean
  method: 'KO/TKO' | 'Submission' | 'Decision' | 'DQ'
  round?: number
  sigStrikes: number
  sigStrikeAccuracy: number // 0-1
  takedowns: number
  takedownAccuracy: number // 0-1
  submissions: number
  reversals: number
  knockdowns: number
  controlTime: number // seconds
}

/**
 * Calculate DraftKings MMA fantasy score.
 *
 * Points breakdown:
 * - Win: 30
 * - KO/TKO bonus: 25
 * - Submission bonus: 20
 * - Decision win bonus: 0 (base win is 30)
 * - Round 1 finish bonus: +5
 * - Round 2 finish bonus: +3
 * - Sig strike: 0.3 each
 * - Sig accuracy ≥ 60%: +5
 * - Takedown: 3 each
 * - TD accuracy ≥ 50%: +2
 * - Submission attempt: 2 each
 * - Reversal: 2 each
 * - Knockdown: 5 each
 * - Control time: 0.03 per second
 */
export function draftKingsMMAScore(stats: DKMMAInput): number {
  let score = 0

  // Win bonus
  if (stats.wins) {
    score += 30
  }

  // Method bonus (only applies on win)
  if (stats.wins) {
    if (stats.method === 'KO/TKO') {
      score += 25
    } else if (stats.method === 'Submission') {
      score += 20
    }
    // Decision: 0 extra bonus beyond base win

    // Early finish bonuses (round 1 or 2)
    if (stats.round === 1) {
      score += 5
    } else if (stats.round === 2) {
      score += 3
    }
  }

  // Significant strikes
  score += stats.sigStrikes * 0.3

  // Sig strike accuracy bonus
  if (stats.sigStrikeAccuracy >= 0.6) {
    score += 5
  }

  // Takedowns
  score += stats.takedowns * 3

  // Takedown accuracy bonus
  if (stats.takedownAccuracy >= 0.5) {
    score += 2
  }

  // Submission attempts
  score += stats.submissions * 2

  // Reversals
  score += stats.reversals * 2

  // Knockdowns
  score += stats.knockdowns * 5

  // Control time (seconds)
  score += stats.controlTime * 0.03

  return score
}
