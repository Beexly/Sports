/**
 * wrestling-analytics.ts
 * Pure TypeScript wrestling analytics — zero npm dependencies, no side effects.
 * Covers UWW freestyle/Greco-Roman, NCAA collegiate, performance analytics,
 * weight class management, seeding/brackets, MMA crossover, and DK fantasy.
 */

// ---------------------------------------------------------------------------
// 1. Freestyle / Greco-Roman scoring (UWW rules)
// ---------------------------------------------------------------------------

/** True if the leader has a ≥10 point lead (technical superiority) */
export function technicalSuperiority(points1: number, points2: number): boolean {
  return Math.abs(points1 - points2) >= 10
}

/**
 * Determines the period winner.
 * Most points wins; equal points → 'tie'.
 * escapes default to 0 (UWW escape point is a tie-breaker; here just added to
 * the wrestler's total as UWW rules treat escape points normally).
 */
export function periodWinner(
  points1: number,
  points2: number,
  escapes1 = 0,
  escapes2 = 0
): 1 | 2 | 'tie' {
  const total1 = points1 + escapes1
  const total2 = points2 + escapes2
  if (total1 > total2) return 1
  if (total2 > total1) return 2
  return 'tie'
}

/**
 * Determines the match winner (best of 2 periods; 3rd period if tied after 2).
 * 1 win from any 2 counted periods = match win.
 * 2 ties = draw.
 */
export function matchWinner(
  period1: 1 | 2 | 'tie',
  period2: 1 | 2 | 'tie',
  period3?: 1 | 2 | 'tie'
): 1 | 2 | 'draw' {
  const wins1 = (period1 === 1 ? 1 : 0) + (period2 === 1 ? 1 : 0)
  const wins2 = (period1 === 2 ? 1 : 0) + (period2 === 2 ? 1 : 0)

  if (wins1 >= 2) return 1
  if (wins2 >= 2) return 2

  // Need period 3 (or it was provided)
  if (period3 !== undefined) {
    if (period3 === 1) return 1
    if (period3 === 2) return 2
    return 'draw'
  }

  // Both wins1 and wins2 < 2 and period3 not provided
  // Could be 1-0-1 ties, or 1-1, etc.
  if (wins1 > wins2) return 1
  if (wins2 > wins1) return 2
  return 'draw'
}

/**
 * Percentage of the period each wrestler was in action.
 * Default period = 180 seconds.
 */
export function activityTime(
  wrestler1Action: number,
  wrestler2Action: number,
  periodSeconds = 180
): { wrestler1Pct: number; wrestler2Pct: number } {
  if (periodSeconds === 0) return { wrestler1Pct: 0, wrestler2Pct: 0 }
  return {
    wrestler1Pct: wrestler1Action / periodSeconds,
    wrestler2Pct: wrestler2Action / periodSeconds,
  }
}

/** UWW technical points per action */
export function technicalPoints(
  action: 'takedown' | 'reversal' | 'nearfall_2' | 'nearfall_3' | 'nearfall_4' | 'escape' | 'penalty'
): number {
  switch (action) {
    case 'takedown': return 2
    case 'reversal': return 2
    case 'nearfall_2': return 2
    case 'nearfall_3': return 3
    case 'nearfall_4': return 4
    case 'escape': return 1
    case 'penalty': return 1
  }
}

// ---------------------------------------------------------------------------
// 2. Collegiate wrestling (NCAA)
// ---------------------------------------------------------------------------

/** NCAA points per action */
export function ncaaPoints(
  action: 'takedown' | 'escape' | 'reversal' | 'nearfall_2' | 'nearfall_3' | 'penalty' | 'stall'
): number {
  switch (action) {
    case 'takedown': return 2
    case 'escape': return 1
    case 'reversal': return 2
    case 'nearfall_2': return 2
    case 'nearfall_3': return 3
    case 'penalty': return 1
    case 'stall': return 1
  }
}

/**
 * Ride time advantage in seconds (positive for wrestler 1).
 * Returns the net advantage; 1 bonus point if wrestler1 advantage > 60s at match end.
 */
export function rideTime(wrestler1Ride: number, wrestler2Ride: number): number {
  return wrestler1Ride - wrestler2Ride
}

/** Major decision: 8–14 point differential */
export function majorDecision(winnerPoints: number, loserPoints: number): boolean {
  const diff = winnerPoints - loserPoints
  return diff >= 8 && diff <= 14
}

/** Technical fall: ≥15 point lead */
export function technicalFall(winnerPoints: number, loserPoints: number): boolean {
  return winnerPoints - loserPoints >= 15
}

/**
 * Categorize a match score.
 * Fall: winner === loser + 999 (pin flag)
 * Technical fall: ≥15 point lead
 * Major decision: 8–14 point differential
 * Overtime decision: loser > 5 and diff == 1
 * Decision: everything else (winner wins)
 */
export function decisionscore(
  winner: number,
  loser: number
): 'fall' | 'technical_fall' | 'major_decision' | 'decision' | 'overtime_decision' {
  if (winner === loser + 999) return 'fall'
  const diff = winner - loser
  if (diff >= 15) return 'technical_fall'
  if (diff >= 8 && diff <= 14) return 'major_decision'
  if (loser > 5 && diff === 1) return 'overtime_decision'
  return 'decision'
}

/** Dual meet team points earned by result */
export function dualMeetTeamPoints(
  result: 'fall' | 'technical_fall' | 'major_decision' | 'decision' | 'overtime_decision' | 'forfeit'
): number {
  switch (result) {
    case 'fall': return 6
    case 'technical_fall': return 5
    case 'major_decision': return 4
    case 'decision': return 3
    case 'overtime_decision': return 3
    case 'forfeit': return 6
  }
}

// ---------------------------------------------------------------------------
// 3. Performance analytics
// ---------------------------------------------------------------------------

/** Takedown completion ratio; 0 if attempts = 0 */
export function takedownRate(takedowns: number, attempts: number): number {
  if (attempts === 0) return 0
  return takedowns / attempts
}

/** Escape ratio; 0 if opportunities = 0 */
export function escapeRate(escapes: number, opportunities: number): number {
  if (opportunities === 0) return 0
  return escapes / opportunities
}

/** Nearfall conversion ratio; 0 if backExposures = 0 */
export function nearfallRate(nearfalls: number, backExposures: number): number {
  if (backExposures === 0) return 0
  return nearfalls / backExposures
}

/** (attacks + counters * 0.7) / periodSeconds; 0 if periodSeconds = 0 */
export function aggressivenessScore(
  attacks: number,
  counters: number,
  periodSeconds: number
): number {
  if (periodSeconds === 0) return 0
  return (attacks + counters * 0.7) / periodSeconds
}

/**
 * Dominance score.
 * (pointsScored - pointsAllowed + falls * 10 + technicalFalls * 5)
 * normalized by total actions (scored + allowed).
 * Returns 0 if total actions = 0.
 */
export function dominanceScore(
  pointsScored: number,
  pointsAllowed: number,
  falls: number,
  technicalFalls: number
): number {
  const total = pointsScored + pointsAllowed
  if (total === 0) return 0
  return (pointsScored - pointsAllowed + falls * 10 + technicalFalls * 5) / total
}

/** Format seconds into "m:ss" string (e.g. 154 → "2:34") */
export function pinTime(secondsIntoPeriod: number): string {
  const m = Math.floor(secondsIntoPeriod / 60)
  const s = secondsIntoPeriod % 60
  const ss = s < 10 ? `0${s}` : `${s}`
  return `${m}:${ss}`
}

// ---------------------------------------------------------------------------
// 4. Weight class management
// ---------------------------------------------------------------------------

/** UWW Men's freestyle classes (kg) */
const UWW_MEN_FREESTYLE = [57, 65, 74, 86, 97, 125] as const
/** UWW Women's freestyle classes (kg) */
const UWW_WOMEN_FREESTYLE = [50, 53, 57, 62, 68, 76] as const
/** NCAA collegiate weight classes (lbs) */
const NCAA_COLLEGIATE = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285] as const

/**
 * UWW weight class for freestyle wrestling.
 * Returns the class as a string (e.g. "65kg").
 * Gender determines the class ladder.
 * If exactly at a class, returns that class.
 * If between classes, returns next class up.
 * If above all classes, returns the heaviest class.
 */
export function weightClassFreestyle(weightKg: number, gender: 'men' | 'women' = 'men'): string {
  const classes = gender === 'men'
    ? (UWW_MEN_FREESTYLE as readonly number[])
    : (UWW_WOMEN_FREESTYLE as readonly number[])

  for (const cls of classes) {
    if (weightKg <= cls) return `${cls}kg`
  }
  // Above all classes — return the heaviest
  const last = classes[classes.length - 1] ?? classes[0] ?? 125
  return `${last}kg`
}

/**
 * NCAA collegiate weight class (lbs).
 * Returns the class as a string (e.g. "125 lbs").
 * Next class up if between classes; heaviest if above all.
 */
export function weightClassCollegiate(weightLbs: number): string {
  const classes = NCAA_COLLEGIATE as readonly number[]
  for (const cls of classes) {
    if (weightLbs <= cls) return `${cls} lbs`
  }
  const last = classes[classes.length - 1] ?? 285
  return `${last} lbs`
}

/**
 * Safety assessment for weight cutting.
 * Rate = (currentKg - targetKg) / daysOut (kg/day)
 * <0.3 safe, 0.3–0.5 moderate, 0.5–0.8 risky, >0.8 dangerous
 */
export function weightCutSafety(
  currentKg: number,
  targetKg: number,
  daysOut: number
): 'safe' | 'moderate' | 'risky' | 'dangerous' {
  if (daysOut <= 0) return 'dangerous'
  const rate = (currentKg - targetKg) / daysOut
  if (rate < 0.3) return 'safe'
  if (rate < 0.5) return 'moderate'
  if (rate <= 0.8) return 'risky'
  return 'dangerous'
}

/**
 * Optimal weight class for an athlete.
 * Returns the class that best fits — just under or at their normal weight.
 * "Best fit" = largest class that is still ≥ the athlete's walk-around weight.
 * If they're below all classes, returns the lightest.
 * For collegiate, ignores gender/style distinction (lbs-based).
 */
export function optimalWeightClass(
  normalWeightKg: number,
  gender: 'men' | 'women',
  style: 'freestyle' | 'collegiate'
): string {
  if (style === 'collegiate') {
    // Convert kg → lbs for NCAA
    const weightLbs = normalWeightKg * 2.20462
    const classes = NCAA_COLLEGIATE as readonly number[]
    // Find the class at or just above the athlete's weight
    for (const cls of classes) {
      if (weightLbs <= cls) return `${cls} lbs`
    }
    const last = classes[classes.length - 1] ?? 285
    return `${last} lbs`
  }

  // Freestyle: use UWW classes
  const classes = gender === 'men'
    ? (UWW_MEN_FREESTYLE as readonly number[])
    : (UWW_WOMEN_FREESTYLE as readonly number[])

  for (const cls of classes) {
    if (normalWeightKg <= cls) return `${cls}kg`
  }
  const last = classes[classes.length - 1] ?? (gender === 'men' ? 125 : 76)
  return `${last}kg`
}

// ---------------------------------------------------------------------------
// 5. Seeding and brackets
// ---------------------------------------------------------------------------

/**
 * Convert seed to bracket slot using standard tournament seeding.
 * Bracket must be a power of 2.
 * seed 1 is top slot (0), seed 2 is bottom slot (bracketSize - 1), etc.
 * Returns 0-indexed slot.
 */
export function seedToSlot(seed: number, bracketSize: number): number {
  // Standard seeding pattern: 1 vs N, 2 vs N-1, etc.
  // Odd-indexed seeds go to top half, even to bottom half mirrored
  if (seed === 1) return 0
  if (seed === 2) return bracketSize - 1
  // For remaining seeds, alternate placement
  const slot = seed % 2 === 0
    ? bracketSize - Math.floor(seed / 2)
    : Math.floor(seed / 2)
  return slot
}

/**
 * Simplified medal probability.
 * P = max(0, 1 - seed/totalSeeds * 1.5)^1.5, clamped 0–1
 */
export function chanceOfMedal(seed: number, totalSeeds: number): number {
  if (totalSeeds === 0) return 0
  const raw = Math.max(0, 1 - (seed / totalSeeds) * 1.5)
  return Math.min(1, Math.max(0, Math.pow(raw, 1.5)))
}

/** Win record and win percentage for wrestler 1 */
export function headToHeadRecord(
  matches: { winner: 1 | 2 }[]
): { wins1: number; wins2: number; wPct1: number } {
  let wins1 = 0
  let wins2 = 0
  for (const m of matches) {
    if (m.winner === 1) wins1++
    else wins2++
  }
  const total = wins1 + wins2
  return {
    wins1,
    wins2,
    wPct1: total === 0 ? 0 : wins1 / total,
  }
}

/**
 * Style matchup advantage for wrestler1.
 * offense vs defense = +0.2
 * defense vs offense = 0.1
 * balanced vs any = 0
 * any vs balanced = 0
 */
export function styleMatchup(
  wrestler1Style: 'offensive' | 'defensive' | 'balanced',
  wrestler2Style: 'offensive' | 'defensive' | 'balanced'
): number {
  if (wrestler1Style === 'offensive' && wrestler2Style === 'defensive') return 0.2
  if (wrestler1Style === 'defensive' && wrestler2Style === 'offensive') return 0.1
  return 0
}

// ---------------------------------------------------------------------------
// 6. MMA crossover
// ---------------------------------------------------------------------------

/**
 * MMA wrestling value score.
 * = takedownRate * 40 + submissionRate * 30 + groundControlPct * 30
 */
export function wrestlingToMMAScore(
  takedownRate: number,
  submissionRate: number,
  groundControlPct: number
): number {
  return takedownRate * 40 + submissionRate * 30 + groundControlPct * 30
}

/** Takedown defense ratio; 0 if attempted = 0 */
export function takedownDefense(defended: number, attempted: number): number {
  if (attempted === 0) return 0
  return defended / attempted
}

/**
 * Clinch effectiveness score.
 * = (successfulClinches / Math.max(totalClinches, 1)) * 50 + sweeps * 10
 */
export function clinchControl(
  successfulClinches: number,
  totalClinches: number,
  sweeps: number
): number {
  return (successfulClinches / Math.max(totalClinches, 1)) * 50 + sweeps * 10
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Wrestling)
// ---------------------------------------------------------------------------

export interface DKWrestlingResult {
  outcome: 'fall' | 'technical_fall' | 'major_decision' | 'decision' | 'overtime_decision' | 'loss'
  pointsScored: number
  nearfalls: number
  takedowns: number
}

/**
 * DraftKings wrestling fantasy points.
 * fall=100, tf=85, md=70, decision=50, otd=50, loss=0
 * +2 per takedown
 * +3 per nearfall
 * +0.25 per point scored
 */
export function dkWrestlingPoints(result: DKWrestlingResult): number {
  let base = 0
  switch (result.outcome) {
    case 'fall': base = 100; break
    case 'technical_fall': base = 85; break
    case 'major_decision': base = 70; break
    case 'decision': base = 50; break
    case 'overtime_decision': base = 50; break
    case 'loss': base = 0; break
  }
  return base + result.takedowns * 2 + result.nearfalls * 3 + result.pointsScored * 0.25
}

/**
 * DraftKings wrestling projection (weighted average).
 * Most recent = 3x weight, all others = 1x weight.
 */
export function dkProjection(recentResults: DKWrestlingResult[]): number {
  if (recentResults.length === 0) return 0
  const reversed = [...recentResults].reverse() // reversed[0] = most recent
  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < reversed.length; i++) {
    const result = reversed[i]
    if (result === undefined) continue
    const weight = i === 0 ? 3 : 1
    weightedSum += dkWrestlingPoints(result) * weight
    totalWeight += weight
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}
