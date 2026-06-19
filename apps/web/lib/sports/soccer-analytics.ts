/**
 * soccer-analytics.ts
 * Pure TypeScript soccer/football analytics — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShotEvent {
  x: number // pitch coordinates 0-100 (0=own goal, 100=opp goal)
  y: number // 0-100 (0=left touchline, 100=right touchline)
  shotType: 'foot' | 'header' | 'other'
  bodyPart: 'rightFoot' | 'leftFoot' | 'head'
  situation: 'openPlay' | 'setPlay' | 'corner' | 'directFreeKick' | 'penalty'
  defenderDistance?: number // distance to nearest defender (meters)
  angleToGoal?: number // computed if not provided (radians)
  distanceToGoal?: number // computed if not provided (meters)
}

export interface PassEvent {
  startX: number
  startY: number
  endX: number
  endY: number
  completed: boolean
  passType: 'short' | 'medium' | 'long' | 'cross' | 'throughBall' | 'switch'
  progressive?: boolean // moved ball significantly toward goal
}

export interface MatchStats {
  team: string
  shots: number
  shotsOnTarget: number
  possession: number // 0-100
  passes: number
  passAccuracy: number // 0-1
  tackles: number
  interceptions: number
  corners: number
  fouls: number
  yellowCards: number
  redCards: number
  goals: number
  saves: number
  xg?: number
}

export interface PlayerTrackingEvent {
  playerId: string
  minute: number
  x: number
  y: number
  action: 'pass' | 'shot' | 'dribble' | 'tackle' | 'interception' | 'foul' | 'clearance'
  success: boolean
}

// ---------------------------------------------------------------------------
// Expected Goals (xG)
// ---------------------------------------------------------------------------

/**
 * Angle subtended by goal from shot position.
 * Goal posts are at (100, 34) and (100, 66) in standard 0-100 coords.
 * Returns angle in radians.
 */
export function shotAngle(x: number, y: number): number {
  const goalLeft: [number, number] = [100, 34]
  const goalRight: [number, number] = [100, 66]

  const dx1 = goalLeft[0] - x
  const dy1 = goalLeft[1] - y
  const dx2 = goalRight[0] - x
  const dy2 = goalRight[1] - y

  const dot = dx1 * dx2 + dy1 * dy2
  const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
  const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

  if (mag1 === 0 || mag2 === 0) return 0

  const cosAngle = dot / (mag1 * mag2)
  const clamped = Math.max(-1, Math.min(1, cosAngle))
  return Math.acos(clamped)
}

/**
 * Euclidean distance from shot position to goal center (100, 50).
 */
export function shotDistance(x: number, y: number): number {
  const dx = 100 - x
  const dy = 50 - y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Simplified logistic xG model based on distance, angle, and shot situation.
 * Base xG from distance+angle; modifiers for shot type and situation.
 */
export function xgModel(shot: ShotEvent): number {
  // Penalty is always 0.79
  if (shot.situation === 'penalty') return 0.79

  const dist = shot.distanceToGoal ?? shotDistance(shot.x, shot.y)
  const angle = shot.angleToGoal ?? shotAngle(shot.x, shot.y)

  // Logistic model: intercept + dist_coef * distance + angle_coef * angle
  // Calibrated approximate coefficients
  const intercept = -0.5
  const distCoef = -0.05
  const angleCoef = 1.5

  const logit = intercept + distCoef * dist + angleCoef * angle
  let xg = 1 / (1 + Math.exp(-logit))

  // Header modifier: -30%
  if (shot.bodyPart === 'head') {
    xg *= 0.7
  }

  // Direct free kick: base * 0.7
  if (shot.situation === 'directFreeKick') {
    xg *= 0.7
  }

  // Set play bonus: +5%
  if (shot.situation === 'setPlay') {
    xg *= 1.05
  }

  // Defender close (<2m): -20%
  if (shot.defenderDistance !== undefined && shot.defenderDistance < 2) {
    xg *= 0.8
  }

  return Math.max(0, Math.min(1, xg))
}

/** Sum of xG across all shots. */
export function expectedGoals(shots: ShotEvent[]): number {
  if (shots.length === 0) return 0
  return shots.reduce((sum, shot) => sum + xgModel(shot), 0)
}

/** Home xG minus away xG. */
export function xgDiff(homeShots: ShotEvent[], awayShots: ShotEvent[]): number {
  return expectedGoals(homeShots) - expectedGoals(awayShots)
}

/** Average xG per shot. */
export function xgPerShot(shots: ShotEvent[]): number {
  if (shots.length === 0) return 0
  return expectedGoals(shots) / shots.length
}

/** Goals scored minus expected goals (over-performance). */
export function xgOverPerformance(goalsScored: number, xg: number): number {
  return goalsScored - xg
}

// ---------------------------------------------------------------------------
// Possession & passing
// ---------------------------------------------------------------------------

/** Fraction of total passes made by a team. */
export function possessionShare(teamPasses: number, totalPasses: number): number {
  if (totalPasses === 0) return 0
  return teamPasses / totalPasses
}

/** Fraction of passes completed. */
export function passCompletionRate(passes: PassEvent[]): number {
  if (passes.length === 0) return 0
  const completed = passes.filter(p => p.completed).length
  return completed / passes.length
}

/** Fraction of passes that are progressive (moved 10+ units toward opponent goal). */
export function progressivePassRate(passes: PassEvent[]): number {
  if (passes.length === 0) return 0
  const progressive = passes.filter(p => isProgressivePass(p)).length
  return progressive / passes.length
}

/** True if pass moved ball 10+ units toward opponent's goal (endX > startX + 10). */
export function isProgressivePass(pass: PassEvent): boolean {
  return pass.endX > pass.startX + 10
}

/** Average Euclidean length of passes. */
export function avgPassLength(passes: PassEvent[]): number {
  if (passes.length === 0) return 0
  const total = passes.reduce((sum, p) => {
    const dx = p.endX - p.startX
    const dy = p.endY - p.startY
    return sum + Math.sqrt(dx * dx + dy * dy)
  }, 0)
  return total / passes.length
}

/**
 * Pass network density: unique pass connections / possible connections.
 * Possible connections = playerCount choose 2 = n*(n-1)/2.
 */
export function passNetworkDensity(passes: PassEvent[], playerCount: number): number {
  const possibleConnections = (playerCount * (playerCount - 1)) / 2
  if (possibleConnections === 0) return 0

  const connections = new Set<string>()
  passes.forEach(p => {
    // We don't have player IDs here, so just use coordinate pairs as proxies
    const key = `${p.startX},${p.startY}-${p.endX},${p.endY}`
    connections.add(key)
  })

  return Math.min(1, connections.size / possibleConnections)
}

/**
 * Build pass matrix from player tracking events.
 * matrix[i][j] = number of successful passes from players[i] to players[j].
 * Uses pairs of consecutive 'pass' events where one player's position matches
 * the nearest other player.
 */
export function buildPassMatrix(events: PlayerTrackingEvent[], players: string[]): number[][] {
  const n = players.length
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  const playerIndex = new Map<string, number>(players.map((p, i) => [p, i]))

  const passEvents = events.filter(e => e.action === 'pass' && e.success)

  // Group by player
  const byPlayer = new Map<string, PlayerTrackingEvent[]>()
  for (const e of passEvents) {
    if (!byPlayer.has(e.playerId)) byPlayer.set(e.playerId, [])
    byPlayer.get(e.playerId)!.push(e)
  }

  // For each pass event, find the nearest other player at that minute as receiver
  for (const [senderId, senderEvents] of byPlayer) {
    const senderIdx = playerIndex.get(senderId)
    if (senderIdx === undefined) continue

    for (const passEvt of senderEvents) {
      // Find nearest player from other players at this minute
      let minDist = Infinity
      let receiverIdx = -1

      for (const [receiverId, receiverEvents] of byPlayer) {
        if (receiverId === senderId) continue
        const recIdx = playerIndex.get(receiverId)
        if (recIdx === undefined) continue

        const sameMinuteEvt = receiverEvents.find(re => re.minute === passEvt.minute)
        if (!sameMinuteEvt) continue

        const dx = sameMinuteEvt.x - passEvt.x
        const dy = sameMinuteEvt.y - passEvt.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist) {
          minDist = dist
          receiverIdx = recIdx
        }
      }

      // Also check all events grouped by players array
      if (receiverIdx === -1) {
        for (const pid of players) {
          if (pid === senderId) continue
          const recIdx = playerIndex.get(pid)
          if (recIdx === undefined) continue
          // Try any event within 2 minutes
          const allPidEvents = events.filter(
            e => e.playerId === pid && Math.abs(e.minute - passEvt.minute) <= 2
          )
          for (const re of allPidEvents) {
            const dx = re.x - passEvt.x
            const dy = re.y - passEvt.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < minDist) {
              minDist = dist
              receiverIdx = recIdx
            }
          }
        }
      }

      if (receiverIdx >= 0 && receiverIdx !== senderIdx) {
        matrix[senderIdx][receiverIdx]++
      }
    }
  }

  return matrix
}

// ---------------------------------------------------------------------------
// Pressing & defensive metrics
// ---------------------------------------------------------------------------

/**
 * PPDA (Passes Allowed Per Defensive Action).
 * Lower = more intense pressing.
 */
export function ppda(pressures: number, defensivePasses: number): number {
  if (pressures === 0) return Infinity
  return defensivePasses / pressures
}

/**
 * Count ball recoveries (interceptions/tackles) in opponent's half (x > threshold).
 * Default threshold = 50.
 */
export function oppFieldRecoveries(
  recoveries: PlayerTrackingEvent[],
  opponentHalfThreshold: number = 50
): number {
  return recoveries.filter(
    r => (r.action === 'interception' || r.action === 'tackle') && r.x > opponentHalfThreshold
  ).length
}

/** Pressing intensity: pressures / total defensive actions (0-1). */
export function pressingIntensity(pressures: number, totalDefensiveActions: number): number {
  if (totalDefensiveActions === 0) return 0
  return Math.min(1, pressures / totalDefensiveActions)
}

/** Average pairwise distance between players. Lower = more compact. */
export function compactness(playerPositions: Array<{ x: number; y: number }>): number {
  const n = playerPositions.length
  if (n < 2) return 0

  let totalDist = 0
  let count = 0

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = playerPositions[j].x - playerPositions[i].x
      const dy = playerPositions[j].y - playerPositions[i].y
      totalDist += Math.sqrt(dx * dx + dy * dy)
      count++
    }
  }

  return count > 0 ? totalDist / count : 0
}

// ---------------------------------------------------------------------------
// Zone analytics
// ---------------------------------------------------------------------------

export type PitchZone = 'ownHalf' | 'midfield' | 'attackingThird' | 'penaltyArea'

/**
 * Classify pitch zone by x coordinate.
 * x 0-33: ownHalf; 33-50: midfield; 50-83: attackingThird; 83-100: penaltyArea
 */
export function classifyZone(x: number): PitchZone {
  if (x < 33) return 'ownHalf'
  if (x < 50) return 'midfield'
  if (x < 83) return 'attackingThird'
  return 'penaltyArea'
}

/** Count events per zone. */
export function zoneDistribution(events: Array<{ x: number }>): Record<PitchZone, number> {
  const dist: Record<PitchZone, number> = {
    ownHalf: 0,
    midfield: 0,
    attackingThird: 0,
    penaltyArea: 0,
  }
  for (const e of events) {
    dist[classifyZone(e.x)]++
  }
  return dist
}

/**
 * Territorial control: average x of team events minus 50.
 * Positive = dominating opponent's half.
 */
export function territorialControl(
  teamEvents: Array<{ x: number }>,
  opponentEvents: Array<{ x: number }>
): number {
  const allEvents = [...teamEvents, ...opponentEvents]
  if (allEvents.length === 0) return 0
  const avgX = allEvents.reduce((sum, e) => sum + e.x, 0) / allEvents.length
  return avgX - 50
}

// ---------------------------------------------------------------------------
// Set pieces
// ---------------------------------------------------------------------------

/** Corner kick efficiency metrics. */
export function cornerKickEfficiency(
  cornersAttempted: number,
  goalsFromCorners: number,
  xgFromCorners: number
): { goalRate: number; xgPerCorner: number; overPerformance: number } {
  const goalRate = cornersAttempted > 0 ? goalsFromCorners / cornersAttempted : 0
  const xgPerCorner = cornersAttempted > 0 ? xgFromCorners / cornersAttempted : 0
  const overPerformance = goalsFromCorners - xgFromCorners
  return { goalRate, xgPerCorner, overPerformance }
}

/** Fraction of free kicks on target. */
export function freeKickAccuracy(attempts: number, onTarget: number): number {
  if (attempts === 0) return 0
  return onTarget / attempts
}

/** Goals per set piece attempt. */
export function setPieceGoalRate(attempts: number, goals: number): number {
  if (attempts === 0) return 0
  return goals / attempts
}

// ---------------------------------------------------------------------------
// Match metrics
// ---------------------------------------------------------------------------

/** Fraction of shots that result in goals. */
export function shotConversionRate(goals: number, shots: number): number {
  if (shots === 0) return 0
  return goals / shots
}

/** Fraction of shots on target saved. */
export function savePercentage(saves: number, shotsOnTarget: number): number {
  if (shotsOnTarget === 0) return 0
  return saves / shotsOnTarget
}

/** Goals scored minus goals conceded. */
export function goalDifference(goalsFor: number, goalsAgainst: number): number {
  return goalsFor - goalsAgainst
}

/** Total points from W/D/L record (3/1/0). */
export function pointsFromRecord(wins: number, draws: number, losses: number): number {
  void losses // losses contribute 0 points
  return wins * 3 + draws * 1
}

/**
 * Poisson probability of scoring exactly k goals given lambda.
 * P(k; λ) = e^(-λ) * λ^k / k!
 */
function poissonProb(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0
  let factorial = 1
  for (let i = 2; i <= k; i++) factorial *= i
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial
}

/**
 * Return array of goal probabilities [P(0), P(1), ..., P(maxGoals)].
 */
function poissonGoalProbs(lambda: number, maxGoals: number = 6): number[] {
  return Array.from({ length: maxGoals + 1 }, (_, k) => poissonProb(lambda, k))
}

/**
 * Expected points per game using simplified Poisson-based win/draw/loss probs.
 * Uses xG as Poisson lambda for each team.
 */
export function expectedPoints(xg: number, xgAgainst: number): number {
  const maxGoals = 6
  const homeProbs = poissonGoalProbs(xg, maxGoals)
  const awayProbs = poissonGoalProbs(xgAgainst, maxGoals)

  let winProb = 0
  let drawProb = 0

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = homeProbs[h] * awayProbs[a]
      if (h > a) winProb += prob
      else if (h === a) drawProb += prob
    }
  }

  return winProb * 3 + drawProb * 1
}

/** Average xGA of opponents; higher = tougher schedule. */
export function strengthOfSchedule(opponentXgAgainst: number[]): number {
  if (opponentXgAgainst.length === 0) return 0
  return opponentXgAgainst.reduce((sum, v) => sum + v, 0) / opponentXgAgainst.length
}

// ---------------------------------------------------------------------------
// Player ratings
// ---------------------------------------------------------------------------

/**
 * Player rating index based on action success rate and volume.
 * (successfulActions / totalActions) * (totalActions / maxExpected) * 100
 * maxExpected = 80
 */
export function playerRatingIndex(events: PlayerTrackingEvent[]): number {
  const maxExpected = 80
  if (events.length === 0) return 0
  const successful = events.filter(e => e.success).length
  const successRate = successful / events.length
  const volumeRate = events.length / maxExpected
  return successRate * volumeRate * 100
}

/**
 * Key pass rate: passes per 90 minutes (simplified).
 * Counts pass events per minute span normalized to 90.
 */
export function keyPassRate(events: PlayerTrackingEvent[]): number {
  const passes = events.filter(e => e.action === 'pass')
  if (passes.length === 0) return 0

  const minutes = events.map(e => e.minute)
  const minMinute = Math.min(...minutes)
  const maxMinute = Math.max(...minutes)
  const span = maxMinute - minMinute || 1

  return (passes.length / span) * 90
}

/** Fraction of tackles and interceptions that are successful. */
export function duelSuccess(events: PlayerTrackingEvent[]): number {
  const duels = events.filter(e => e.action === 'tackle' || e.action === 'interception')
  if (duels.length === 0) return 0
  const won = duels.filter(e => e.success).length
  return won / duels.length
}

// ---------------------------------------------------------------------------
// Fantasy / rating helpers
// ---------------------------------------------------------------------------

export interface FanRatingStats {
  goals: number
  assists: number
  cleanSheet: boolean
  saves: number
  yellowCard: boolean
  redCard: boolean
  minutesPlayed: number
}

/**
 * Calculate fantasy rating score for a player.
 * Formats: 'fpl' | 'sorare' | 'fantrax'
 *
 * FPL scoring (outfield simplified, forward/mid/def/gk roles approximated by saves):
 *   goals = 6 (if saves > 0 = GK: 6; else 6 for FW/MF)
 *   assists = 3
 *   cleanSheet = 4 (GK/DEF) or 1 (MF) — simplified: 4 if saves > 0, else 1
 *   saves = 0.33 each (every 3 saves = 1pt)
 *   yellowCard = -1
 *   redCard = -3
 *   minutesPlayed >= 60 = 2 pts, >= 1 = 1 pt
 *
 * Sorare: standardized 0-100 scale
 *   goals*15 + assists*8 + cleanSheet*5 + saves*2 - yellowCard*3 - redCard*8
 *   normalized to 0-100
 *
 * Fantrax:
 *   goals=4, assists=3, cleanSheet=1, saves=0.5, yellowCard=-1, redCard=-3
 */
export function fanRating(
  stats: FanRatingStats,
  format: 'fantrax' | 'fpl' | 'sorare'
): number {
  const { goals, assists, cleanSheet, saves, yellowCard, redCard, minutesPlayed } = stats

  if (format === 'fpl') {
    const isGkOrDef = saves > 0
    let score = 0

    // Playing time
    if (minutesPlayed >= 60) score += 2
    else if (minutesPlayed >= 1) score += 1

    // Goals
    score += goals * 6

    // Assists
    score += assists * 3

    // Clean sheet
    if (cleanSheet) {
      score += isGkOrDef ? 4 : 1
    }

    // Saves (every 3 saves = 1 point)
    score += Math.floor(saves / 3)

    // Cards
    if (yellowCard) score -= 1
    if (redCard) score -= 3

    return score
  }

  if (format === 'sorare') {
    const raw =
      goals * 15 +
      assists * 8 +
      (cleanSheet ? 5 : 0) +
      saves * 2 -
      (yellowCard ? 3 : 0) -
      (redCard ? 8 : 0) +
      (minutesPlayed >= 60 ? 3 : minutesPlayed >= 1 ? 1 : 0)

    // Normalize: typical max ~100 pts raw maps to 100 scale
    // Clamp to 0-100
    return Math.max(0, Math.min(100, raw))
  }

  // fantrax
  let score = 0
  score += goals * 4
  score += assists * 3
  if (cleanSheet) score += 1
  score += saves * 0.5
  if (yellowCard) score -= 1
  if (redCard) score -= 3
  return score
}
