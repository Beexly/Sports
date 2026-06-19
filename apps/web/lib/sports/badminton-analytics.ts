/**
 * badminton-analytics.ts
 * Pure TypeScript badminton analytics — no external dependencies.
 * Rally-point scoring to 21 (best of 3 games).
 * Covers: scoring & match, rally analytics, shot analytics, player
 *         performance, doubles analytics, match dynamics, and a
 *         DraftKings-style badminton DFS scoring model.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Side = 'a' | 'b'

export interface ShotEntry {
  type: string
}

export interface GameScore {
  a: number
  b: number
}

export interface RotationSplit {
  front: number
  back: number
}

export interface BadmintonStatLine {
  pointsWon: number
  smashWinners: number
  netWinners: number
  aces: number
  unforcedErrors: number
  gameWon: boolean
  matchWon: boolean
}

// ---------------------------------------------------------------------------
// 1. Scoring & match
// ---------------------------------------------------------------------------

/**
 * Whether the leading side is at game point.
 * A side is at game point when it can win the game on the next rally:
 * either it has reached 20 (or more) with at least a one-point lead, or
 * the score has reached the hard cap at 29 (winner is whoever scores 30).
 */
export function gamePoint(score: number, oppScore: number): boolean {
  if (score === 29 && oppScore <= 29) return true
  if (score >= 20 && score < 29 && score > oppScore) return true
  return false
}

/**
 * Winner of a single game (rally point to 21, win by 2, capped at 30).
 * Returns 'a' | 'b' once the game is decided, otherwise null.
 */
export function gameWinner(a: number, b: number): Side | null {
  const hi = Math.max(a, b)
  const diff = Math.abs(a - b)
  if (hi >= 30) {
    // Hard cap: first to 30 wins regardless of margin.
    if (a >= 30 && a > b) return 'a'
    if (b >= 30 && b > a) return 'b'
    return null
  }
  if (hi >= 21 && diff >= 2) {
    return a > b ? 'a' : 'b'
  }
  return null
}

/**
 * Winner of a best-of-3 match given the sequence of decided games.
 * Returns the first side to win two games, otherwise null.
 */
export function matchWinner(games: Side[][]): Side | null {
  let aWins = 0
  let bWins = 0
  for (let i = 0; i < games.length; i++) {
    const game = games[i] ?? []
    const winner = game[0] ?? null
    if (winner === 'a') aWins += 1
    else if (winner === 'b') bWins += 1
    if (aWins >= 2) return 'a'
    if (bWins >= 2) return 'b'
  }
  return null
}

/**
 * Tally of games won by each side.
 */
export function setsScore(games: Side[]): GameScore {
  let a = 0
  let b = 0
  for (let i = 0; i < games.length; i++) {
    const g = games[i] ?? null
    if (g === 'a') a += 1
    else if (g === 'b') b += 1
  }
  return { a, b }
}

/**
 * Whether deuce has been reached (both sides at 20 or more).
 */
export function deuceReached(a: number, b: number): boolean {
  return a >= 20 && b >= 20
}

// ---------------------------------------------------------------------------
// 2. Rally analytics
// ---------------------------------------------------------------------------

/**
 * Classify a rally by its shot count: <5 short, 5–9 medium, >=10 long.
 */
export function rallyLength(shots: number): 'short' | 'medium' | 'long' {
  if (shots < 5) return 'short'
  if (shots < 10) return 'medium'
  return 'long'
}

/**
 * Mean rally length across a set of rallies. Empty input returns 0.
 */
export function avgRallyLength(rallies: number[]): number {
  if (rallies.length === 0) return 0
  let total = 0
  for (let i = 0; i < rallies.length; i++) {
    total += rallies[i] ?? 0
  }
  return total / rallies.length
}

/**
 * Winners-to-errors ratio. Infinity when there are no errors but winners
 * exist; 0 when there are neither winners nor errors.
 */
export function winnersToErrorsRatio(winners: number, errors: number): number {
  if (errors === 0) return winners > 0 ? Infinity : 0
  return winners / errors
}

/**
 * Fraction of rallies that ended as a point won. Empty input returns 0.
 */
export function pointEfficiency(pointsWon: number, ralliesPlayed: number): number {
  if (ralliesPlayed === 0) return 0
  return pointsWon / ralliesPlayed
}

/**
 * Smash (attacking) success rate. No attempts returns 0.
 */
export function attackSuccessRate(smashesWon: number, smashesPlayed: number): number {
  if (smashesPlayed === 0) return 0
  return smashesWon / smashesPlayed
}

// ---------------------------------------------------------------------------
// 3. Shot analytics
// ---------------------------------------------------------------------------

/**
 * Count of shots by type. Empty input returns an empty map.
 */
export function shotDistribution(shots: ShotEntry[]): Map<string, number> {
  const dist = new Map<string, number>()
  for (let i = 0; i < shots.length; i++) {
    const entry = shots[i]
    if (!entry) continue
    const type = entry.type
    dist.set(type, (dist.get(type) ?? 0) + 1)
  }
  return dist
}

/**
 * Smash speed in metres per second. Zero time returns 0.
 */
export function smashSpeed(distanceM: number, timeSec: number): number {
  if (timeSec === 0) return 0
  return distanceM / timeSec
}

/**
 * Win rate at the net. No net rallies returns 0.
 */
export function netPointRate(netPointsWon: number, netRallies: number): number {
  if (netRallies === 0) return 0
  return netPointsWon / netRallies
}

/**
 * Clear accuracy (clears that landed in). No clears returns 0.
 */
export function clearAccuracy(inClears: number, totalClears: number): number {
  if (totalClears === 0) return 0
  return inClears / totalClears
}

/**
 * Drop shot effectiveness (winning drops over total drops). No drops returns 0.
 */
export function dropShotEffectiveness(winning: number, total: number): number {
  if (total === 0) return 0
  return winning / total
}

// ---------------------------------------------------------------------------
// 4. Player performance
// ---------------------------------------------------------------------------

/**
 * Win rate on serve points. No serves returns 0.
 */
export function serviceWinRate(servePointsWon: number, serves: number): number {
  if (serves === 0) return 0
  return servePointsWon / serves
}

/**
 * Win rate on receive points. No receives returns 0.
 */
export function receiveWinRate(receivePointsWon: number, receives: number): number {
  if (receives === 0) return 0
  return receivePointsWon / receives
}

/**
 * Consistency index = 1 - unforced error rate. No shots returns 1
 * (no errors made).
 */
export function consistencyIndex(unforcedErrors: number, totalShots: number): number {
  if (totalShots === 0) return 1
  return 1 - unforcedErrors / totalShots
}

/**
 * Dominance ratio: share of total points won on serve and receive combined.
 * No total points returns 0.
 */
export function dominanceRatio(
  pointsWonOnServe: number,
  pointsWonOnReceive: number,
  totalPoints: number,
): number {
  if (totalPoints === 0) return 0
  return (pointsWonOnServe + pointsWonOnReceive) / totalPoints
}

/**
 * Stamina index: workload proxy combining games played and average rally
 * length. Higher means a more physically demanding match.
 */
export function staminaIndex(gamesPlayed: number, avgRallyLen: number): number {
  return gamesPlayed * avgRallyLen
}

// ---------------------------------------------------------------------------
// 5. Doubles analytics
// ---------------------------------------------------------------------------

/**
 * Share of points won from the front- and back-court rotations.
 * No total returns { front: 0, back: 0 }.
 */
export function rotationEfficiency(
  frontCourtWon: number,
  backCourtWon: number,
  total: number,
): RotationSplit {
  if (total === 0) return { front: 0, back: 0 }
  return { front: frontCourtWon / total, back: backCourtWon / total }
}

/**
 * Partner sync score = 1 - combined error rate per rally. No rallies returns 1.
 */
export function partnerSyncScore(combinedErrors: number, totalRallies: number): number {
  if (totalRallies === 0) return 1
  return 1 - combinedErrors / totalRallies
}

/**
 * Doubles attacking win rate. No attacking rallies returns 0.
 */
export function doublesAttackRate(attackingWon: number, attackingRallies: number): number {
  if (attackingRallies === 0) return 0
  return attackingWon / attackingRallies
}

// ---------------------------------------------------------------------------
// 6. Match dynamics
// ---------------------------------------------------------------------------

/**
 * Count of momentum shifts (lead changes) across a sequence of point winners.
 * Tracks the running cumulative lead and counts each time the leader flips
 * from one side to the other (a flip into a tie does not count until the
 * lead changes hands).
 */
export function momentumShifts(scoreSequence: Side[]): number {
  let a = 0
  let b = 0
  let shifts = 0
  // 1 => a leads, -1 => b leads, 0 => tied / no lead yet
  let leader = 0
  for (let i = 0; i < scoreSequence.length; i++) {
    const point = scoreSequence[i] ?? null
    if (point === 'a') a += 1
    else if (point === 'b') b += 1
    const current = a > b ? 1 : a < b ? -1 : 0
    if (current !== 0 && leader !== 0 && current !== leader) {
      shifts += 1
    }
    if (current !== 0) leader = current
  }
  return shifts
}

/**
 * Comeback index: rewards overcoming a large deficit and winning.
 * Returns the deficit overcome if the match was won, otherwise 0.
 */
export function comebackIndex(maxDeficit: number, won: boolean): number {
  if (!won) return 0
  return Math.max(0, maxDeficit)
}

/**
 * Share of games decided by a margin of 2 or fewer points. Empty input
 * returns 0.
 */
export function closeGameRate(games: GameScore[]): number {
  if (games.length === 0) return 0
  let close = 0
  for (let i = 0; i < games.length; i++) {
    const g = games[i]
    if (!g) continue
    if (Math.abs(g.a - g.b) <= 2) close += 1
  }
  return close / games.length
}

/**
 * Conversion rate on game points faced. No game points faced returns 0.
 */
export function pressurePointConversion(gamePointsWon: number, gamePointsFaced: number): number {
  if (gamePointsFaced === 0) return 0
  return gamePointsWon / gamePointsFaced
}

// ---------------------------------------------------------------------------
// 7. DraftKings-style fantasy
// ---------------------------------------------------------------------------

/**
 * DraftKings-style badminton fantasy points for a single match stat line.
 * Scoring: point=1, smash winner=2, net winner=1.5, ace=2, unforced error=-0.5,
 *          game won=+5, match won=+10.
 */
export function dkBadmintonPoints(stats: BadmintonStatLine): number {
  let pts = 0
  pts += stats.pointsWon * 1
  pts += stats.smashWinners * 2
  pts += stats.netWinners * 1.5
  pts += stats.aces * 2
  pts += stats.unforcedErrors * -0.5
  if (stats.gameWon) pts += 5
  if (stats.matchWon) pts += 10
  return pts
}

/**
 * Projection from recent match stat lines, weighting the three most recent
 * matches 3x. Empty input returns 0.
 */
export function dkProjection(recent: BadmintonStatLine[]): number {
  if (recent.length === 0) return 0
  // The three most recent entries (end of the array) are weighted 3x.
  const recentStart = Math.max(0, recent.length - 3)
  let weightedSum = 0
  let weightTotal = 0
  for (let i = 0; i < recent.length; i++) {
    const stat = recent[i]
    if (!stat) continue
    const weight = i >= recentStart ? 3 : 1
    weightedSum += dkBadmintonPoints(stat) * weight
    weightTotal += weight
  }
  if (weightTotal === 0) return 0
  return weightedSum / weightTotal
}
