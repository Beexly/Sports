/**
 * Injury impact modeling for sports analytics — pure, zero dependencies.
 *
 * Models play probability, snap share, fantasy impact, spread adjustment,
 * and team impact for individual injured players and full rosters.
 * Pure analytics — does not write to DB or affect pick scores directly.
 */

// ----- Types -----

export type InjuryStatus = 'out' | 'doubtful' | 'questionable' | 'probable' | 'healthy'
export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'season-ending'
export type InjuryBodyPart =
  | 'knee'
  | 'ankle'
  | 'hamstring'
  | 'shoulder'
  | 'back'
  | 'foot'
  | 'hand'
  | 'concussion'
  | 'illness'
  | 'other'
export type PositionGroup = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB' | 'K' | 'P'

export interface InjuredPlayer {
  playerId: string
  name: string
  position: PositionGroup
  status: InjuryStatus
  bodyPart: InjuryBodyPart
  weeksMissed?: number
  fantasyPoints?: number    // season avg fantasy points per game
  snapSharePct?: number     // 0-100, snap share percentage
}

export interface InjuryImpactResult {
  playerId: string
  name: string
  position: PositionGroup
  playProbability: number     // 0-1, estimated probability of playing
  expectedSnaps: number       // 0-100, expected snap percentage if active
  fantasyImpact: number       // expected FP reduction vs baseline
  teamImpactScore: number     // 0-100, overall team impact
  spreadImpact: number        // points of spread adjustment (-5 to +5)
  recommendation: 'start' | 'sit' | 'monitor' | 'avoid'
}

export interface LineupAnalysis {
  totalImpactScore: number        // sum of teamImpactScore across all injuries
  keyInjuries: InjuredPlayer[]   // injuries with teamImpactScore >= 7
  spreadAdjustment: number       // net spread adjustment (sum of spreadImpact)
  pickConfidencePenalty: number  // 0-30, how much to reduce pick confidence
  summary: string                // human-readable summary line
}

export interface RecoveryEstimate {
  minWeeks: number
  maxWeeks: number
  expectedWeeks: number
  returnsThisWeek: boolean  // true if weeksMissed >= expectedWeeks
}

// ----- Position default snap shares -----

const POSITION_DEFAULT_SNAP: Record<PositionGroup, number> = {
  QB: 95,
  WR: 65,
  RB: 45,
  TE: 55,
  OL: 98,
  DL: 75,
  LB: 70,
  DB: 85,
  K: 5,
  P: 5,
}

// ----- Play probability from status -----

/**
 * Returns the estimated probability of playing given the injury designation.
 * out=0, doubtful=0.15, questionable=0.50, probable=0.85, healthy=1.0
 */
export function playProbabilityFromStatus(status: InjuryStatus): number {
  switch (status) {
    case 'out':          return 0
    case 'doubtful':     return 0.15
    case 'questionable': return 0.50
    case 'probable':     return 0.85
    case 'healthy':      return 1.0
  }
}

// ----- Severity classification -----

/**
 * Classify injury severity from body part and status.
 * Does not account for weeks missed (use classifySeverityWithWeeks for that).
 */
export function classifySeverity(
  bodyPart: InjuryBodyPart,
  status: InjuryStatus,
): InjurySeverity {
  if (status === 'probable' || status === 'healthy') {
    return 'minor'
  }
  if (status === 'questionable') {
    return 'minor'
  }
  if (status === 'doubtful') {
    return 'moderate'
  }
  // status === 'out'
  if (bodyPart === 'concussion' || bodyPart === 'knee') {
    return 'severe'
  }
  return 'moderate'
}

/**
 * Classify injury severity accounting for weeks missed.
 * If weeksMissed >= 8, returns 'season-ending' regardless of other factors.
 */
export function classifySeverityWithWeeks(
  bodyPart: InjuryBodyPart,
  status: InjuryStatus,
  weeksMissed: number,
): InjurySeverity {
  if (weeksMissed >= 8) {
    return 'season-ending'
  }
  return classifySeverity(bodyPart, status)
}

// ----- Position importance weight -----

/**
 * Returns how important a position is to overall team success (1-10 scale).
 * QB=10, WR=7, RB=6, TE=5, OL=5, DL=5, LB=4, DB=4, K=2, P=1
 */
export function positionImportanceWeight(position: PositionGroup): number {
  switch (position) {
    case 'QB': return 10
    case 'WR': return 7
    case 'RB': return 6
    case 'TE': return 5
    case 'OL': return 5
    case 'DL': return 5
    case 'LB': return 4
    case 'DB': return 4
    case 'K':  return 2
    case 'P':  return 1
  }
}

// ----- Expected snap share -----

/**
 * Returns the expected snap share percentage (0-100) for an injured player.
 * If snapSharePct is provided, multiplies that by playProbability.
 * Otherwise uses the position default, then multiplies by playProbability.
 */
export function expectedSnapShare(player: InjuredPlayer): number {
  const prob = playProbabilityFromStatus(player.status)
  const base =
    player.snapSharePct !== undefined
      ? player.snapSharePct
      : POSITION_DEFAULT_SNAP[player.position]
  return base * prob
}

// ----- Fantasy impact -----

/**
 * Returns the expected fantasy points reduction vs. the player's healthy baseline.
 * Uses the ratio of actual expected snaps to the healthy position default.
 * Returns 0 if no fantasyPoints provided.
 */
export function fantasyImpact(player: InjuredPlayer): number {
  if (player.fantasyPoints === undefined) {
    return 0
  }
  const fullSnap = POSITION_DEFAULT_SNAP[player.position]
  const actualSnap = expectedSnapShare(player)
  return player.fantasyPoints * (1 - actualSnap / fullSnap)
}

// ----- Team impact score -----

/**
 * Returns an overall team impact score (0-100).
 * Formula: positionImportanceWeight * (1 - playProbability) * 10, clamped to [0,100].
 */
export function teamImpactScore(player: InjuredPlayer): number {
  const prob = playProbabilityFromStatus(player.status)
  const weight = positionImportanceWeight(player.position)
  return Math.min(100, Math.max(0, weight * (1 - prob) * 10))
}

// ----- Spread impact -----

/**
 * Returns the points of spread adjustment caused by the injury.
 * Negative values indicate the injury hurts the team (spreads widen for them).
 * isOffense=true for offensive players, false for defensive.
 */
export function spreadImpact(player: InjuredPlayer, isOffense: boolean): number {
  const prob = playProbabilityFromStatus(player.status)
  const factor = 1 - prob

  if (isOffense) {
    switch (player.position) {
      case 'QB': return -(3.5 * factor)
      case 'WR': return -(1.5 * factor)
      case 'RB': return -(1.0 * factor)
      case 'TE': return -(0.75 * factor)
      case 'OL': return -(1.0 * factor)
      default:   return 0
    }
  } else {
    // Defense
    switch (player.position) {
      case 'DL': return -(1.0 * factor)
      case 'LB': return -(0.75 * factor)
      case 'DB': return -(1.0 * factor)
      default:   return 0
    }
  }
}

// ----- Recommendation -----

/**
 * Returns a fantasy/betting recommendation for the player.
 * avoid: playProbability < 0.15
 * sit: playProbability < 0.4 OR (playProbability < 0.55 AND teamImpactScore >= 7)
 * monitor: playProbability < 0.75
 * start: otherwise
 */
export function injuryRecommendation(
  player: InjuredPlayer,
): 'start' | 'sit' | 'monitor' | 'avoid' {
  const prob = playProbabilityFromStatus(player.status)
  const impact = teamImpactScore(player)

  if (prob < 0.15) return 'avoid'
  if (prob < 0.4) return 'sit'
  if (prob < 0.55 && impact >= 7) return 'sit'
  if (prob < 0.75) return 'monitor'
  return 'start'
}

// ----- Full player analysis -----

/**
 * Returns a full InjuryImpactResult for a single player.
 * Assumes the player is on an offensive position for spread impact
 * (caller may override using spreadImpact directly for defensive players).
 */
export function analyzeInjury(player: InjuredPlayer): InjuryImpactResult {
  const prob = playProbabilityFromStatus(player.status)
  const snaps = expectedSnapShare(player)
  const fantasy = fantasyImpact(player)
  const impact = teamImpactScore(player)
  // Default to offense for analyzeInjury; defensive positions yield 0 on offense path
  // but callers can use spreadImpact(player, false) for defensive side.
  const isOffensePos: PositionGroup[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'K', 'P']
  const isOffense = isOffensePos.includes(player.position)
  const spread = spreadImpact(player, isOffense)
  const rec = injuryRecommendation(player)

  return {
    playerId: player.playerId,
    name: player.name,
    position: player.position,
    playProbability: prob,
    expectedSnaps: snaps,
    fantasyImpact: fantasy,
    teamImpactScore: impact,
    spreadImpact: spread,
    recommendation: rec,
  }
}

// ----- Lineup analysis -----

/**
 * Analyzes a full roster of injured players and returns aggregate metrics.
 */
export function analyzeLineup(injuries: InjuredPlayer[]): LineupAnalysis {
  const results = injuries.map((p) => analyzeInjury(p))

  const totalImpactScore = results.reduce((sum, r) => sum + r.teamImpactScore, 0)
  const spreadAdjustment = results.reduce((sum, r) => sum + r.spreadImpact, 0)
  const pickConfidencePenalty = Math.min(30, totalImpactScore * 0.3)

  const keyResults = results.filter((r) => r.teamImpactScore >= 7)
  const keyInjuries = injuries.filter((p) =>
    keyResults.some((r) => r.playerId === p.playerId),
  )

  let summary: string
  if (keyInjuries.length === 0) {
    summary = 'No significant injuries reported'
  } else {
    const names = keyInjuries.map((p) => `${p.name} (${p.position})`).join(', ')
    summary = `${keyInjuries.length} key ${keyInjuries.length === 1 ? 'injury' : 'injuries'}: ${names}`
  }

  return {
    totalImpactScore,
    keyInjuries,
    spreadAdjustment,
    pickConfidencePenalty,
    summary,
  }
}

// ----- Recovery estimate -----

type RecoveryRange = [number, number, number] // [min, max, expected]

const RECOVERY_TABLE: Record<InjuryBodyPart, Partial<Record<InjurySeverity, RecoveryRange>>> = {
  concussion: {
    minor:    [1, 2,  1.5],
    moderate: [2, 4,  3],
    severe:   [4, 8,  6],
  },
  knee: {
    minor:          [1, 3,   2],
    moderate:       [4, 8,   6],
    severe:         [8, 16, 12],
    'season-ending': [16, 52, 52],
  },
  hamstring: {
    minor:    [1, 2, 1.5],
    moderate: [2, 4, 3],
    severe:   [4, 8, 6],
  },
  ankle: {
    minor:    [1, 2,  1.5],
    moderate: [3, 6,  4],
    severe:   [6, 12, 9],
  },
  shoulder: {
    minor:    [1, 2,  1.5],
    moderate: [2, 5,  3],
    severe:   [4, 12, 8],
  },
  back: {
    minor:    [1, 3,   2],
    moderate: [3, 6,   4.5],
    severe:   [6, 16, 11],
  },
  foot: {
    minor:    [1, 2,   1.5],
    moderate: [3, 8,   5],
    severe:   [8, 16, 12],
  },
  hand: {
    minor:    [1, 2, 1.5],
    moderate: [2, 4, 3],
    severe:   [4, 8, 6],
  },
  illness: {
    minor:    [0, 1, 0.5],
    moderate: [1, 2, 1.5],
    severe:   [2, 4, 3],
  },
  other: {
    minor:    [1, 2,  1.5],
    moderate: [2, 6,  4],
    severe:   [4, 12, 8],
  },
}

/**
 * Returns a recovery timeline estimate for a given body part and severity.
 * weeksMissed is used to determine if the player may return this week.
 */
export function estimateRecovery(
  bodyPart: InjuryBodyPart,
  severity: InjurySeverity,
  weeksMissed?: number,
): RecoveryEstimate {
  const bodyTable = RECOVERY_TABLE[bodyPart]
  const range = bodyTable[severity]

  if (!range) {
    // Fallback for season-ending on body parts without explicit entry
    return {
      minWeeks: 16,
      maxWeeks: 52,
      expectedWeeks: 52,
      returnsThisWeek:
        weeksMissed !== undefined && weeksMissed >= 52,
    }
  }

  const [minWeeks, maxWeeks, expectedWeeks] = range
  const returnsThisWeek =
    weeksMissed !== undefined && weeksMissed >= expectedWeeks

  return { minWeeks, maxWeeks, expectedWeeks, returnsThisWeek }
}

// ----- Compare two teams' injuries -----

/**
 * Compares injury situations between home and away teams.
 * netSpreadAdjustment = awayAnalysis.spreadAdjustment - homeAnalysis.spreadAdjustment
 * Negative = favors home, positive = favors away.
 */
export function compareBothTeamInjuries(
  homeInjuries: InjuredPlayer[],
  awayInjuries: InjuredPlayer[],
): {
  homeAnalysis: LineupAnalysis
  awayAnalysis: LineupAnalysis
  netSpreadAdjustment: number
  favoredTeam: 'home' | 'away' | 'neutral'
} {
  const homeAnalysis = analyzeLineup(homeInjuries)
  const awayAnalysis = analyzeLineup(awayInjuries)
  const netSpreadAdjustment =
    awayAnalysis.spreadAdjustment - homeAnalysis.spreadAdjustment

  let favoredTeam: 'home' | 'away' | 'neutral'
  if (netSpreadAdjustment < -0.5) {
    favoredTeam = 'home'
  } else if (netSpreadAdjustment > 0.5) {
    favoredTeam = 'away'
  } else {
    favoredTeam = 'neutral'
  }

  return { homeAnalysis, awayAnalysis, netSpreadAdjustment, favoredTeam }
}

// ----- Filter significant injuries -----

const STATUS_ORDER: Record<InjuryStatus, number> = {
  out:          4,
  doubtful:     3,
  questionable: 2,
  probable:     1,
  healthy:      0,
}

/**
 * Filters injuries to only those with severity >= minStatus (defaults to questionable).
 * Returns players sorted by teamImpactScore descending.
 */
export function filterSignificantInjuries(
  injuries: InjuredPlayer[],
  minStatus: InjuryStatus = 'questionable',
): InjuredPlayer[] {
  const threshold = STATUS_ORDER[minStatus]
  return injuries
    .filter((p) => STATUS_ORDER[p.status] >= threshold)
    .sort((a, b) => teamImpactScore(b) - teamImpactScore(a))
}

// ----- Format injury line -----

/**
 * Returns a human-readable single-line injury summary for a player.
 * e.g. "Patrick Mahomes (QB) — Knee [Questionable, 50% chance to play]"
 */
export function formatInjuryLine(player: InjuredPlayer): string {
  const prob = Math.round(playProbabilityFromStatus(player.status) * 100)
  const bodyLabel = player.bodyPart.charAt(0).toUpperCase() + player.bodyPart.slice(1)
  const statusLabel =
    player.status.charAt(0).toUpperCase() + player.status.slice(1)
  return `${player.name} (${player.position}) — ${bodyLabel} [${statusLabel}, ${prob}% chance to play]`
}

// ----- Total snap share loss -----

/**
 * Returns the aggregate snap share lost across all injuries compared to healthy baselines.
 */
export function totalSnapShareLoss(injuries: InjuredPlayer[]): number {
  return injuries.reduce((sum, player) => {
    const fullSnap = POSITION_DEFAULT_SNAP[player.position]
    const actualSnap = expectedSnapShare(player)
    return sum + (fullSnap - actualSnap)
  }, 0)
}
