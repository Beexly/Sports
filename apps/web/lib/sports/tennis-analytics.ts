/**
 * tennis-analytics.ts
 * Pure TypeScript advanced tennis analytics — no external dependencies.
 * All functions are pure (no side effects, no I/O).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServeStats {
  aces: number
  doubleFaults: number
  firstServeIn: number
  firstServeTotal: number
  secondServeIn: number
  secondServeTotal: number
  firstServeWon: number
  secondServeWon: number
}

export interface MatchStats {
  sets: SetScore[]
  duration: number // minutes
}

export interface SetScore {
  gamesWon: number
  gamesLost: number
  tiebreakWon?: boolean
}

export interface PlayerRating {
  rating: number
  uncertainty: number // Glicko-style RD
}

export interface SurfaceRatings {
  hard: PlayerRating
  clay: PlayerRating
  grass: PlayerRating
}

export interface BreakPointStats {
  opportunities: number
  converted: number
  faced: number
  saved: number
}

export interface RallyStats {
  avgRallyLength: number
  shortRallies: number // 1-4 shots
  mediumRallies: number // 5-8 shots
  longRallies: number // 9+ shots
}

export interface TennisFantasyScore {
  dkScore: number
  fdScore: number
  points: number
  aces: number
  doubleFaults: number
}

// ---------------------------------------------------------------------------
// Serve analysis
// ---------------------------------------------------------------------------

/**
 * First serve percentage: firstServeIn / firstServeTotal
 */
export function firstServePct(stats: ServeStats): number {
  if (stats.firstServeTotal === 0) return 0
  return stats.firstServeIn / stats.firstServeTotal
}

/**
 * Second serve percentage: secondServeIn / secondServeTotal
 */
export function secondServePct(stats: ServeStats): number {
  if (stats.secondServeTotal === 0) return 0
  return stats.secondServeIn / stats.secondServeTotal
}

/**
 * First serve win percentage: firstServeWon / firstServeIn
 * Returns 0 if 0 first serves in.
 */
export function firstServeWinPct(stats: ServeStats): number {
  if (stats.firstServeIn === 0) return 0
  return stats.firstServeWon / stats.firstServeIn
}

/**
 * Second serve win percentage: secondServeWon / secondServeIn
 */
export function secondServeWinPct(stats: ServeStats): number {
  if (stats.secondServeIn === 0) return 0
  return stats.secondServeWon / stats.secondServeIn
}

/**
 * Overall service points won: (firstServeWon + secondServeWon) / firstServeTotal
 */
export function servicePointsWon(stats: ServeStats): number {
  if (stats.firstServeTotal === 0) return 0
  return (stats.firstServeWon + stats.secondServeWon) / stats.firstServeTotal
}

/**
 * Ace percentage: aces / firstServeTotal
 */
export function acePct(stats: ServeStats): number {
  if (stats.firstServeTotal === 0) return 0
  return stats.aces / stats.firstServeTotal
}

/**
 * Double fault percentage: doubleFaults / firstServeTotal
 */
export function doubleFaultPct(stats: ServeStats): number {
  if (stats.firstServeTotal === 0) return 0
  return stats.doubleFaults / stats.firstServeTotal
}

/**
 * Hold percentage: holds / serveGames
 */
export function holdPct(serveGames: number, holds: number): number {
  if (serveGames === 0) return 0
  return holds / serveGames
}

/**
 * Break point conversion rate: converted / opportunities
 * Returns 0 if no opportunities.
 */
export function breakPct(stats: BreakPointStats): number {
  if (stats.opportunities === 0) return 0
  return stats.converted / stats.opportunities
}

/**
 * Break point save rate: saved / faced
 * Returns 0 if none faced.
 */
export function savePct(stats: BreakPointStats): number {
  if (stats.faced === 0) return 0
  return stats.saved / stats.faced
}

// ---------------------------------------------------------------------------
// Rally analysis
// ---------------------------------------------------------------------------

/**
 * Classify rally length into short (1-4), medium (5-8), long (9+).
 * Returns a RallyStats object.
 */
export function rallyDistribution(rallies: number[]): RallyStats {
  if (rallies.length === 0) {
    return { avgRallyLength: 0, shortRallies: 0, mediumRallies: 0, longRallies: 0 }
  }
  let short = 0
  let medium = 0
  let long = 0
  let sum = 0
  for (const shots of rallies) {
    sum += shots
    if (shots <= 4) short++
    else if (shots <= 8) medium++
    else long++
  }
  return {
    avgRallyLength: sum / rallies.length,
    shortRallies: short,
    mediumRallies: medium,
    longRallies: long,
  }
}

/**
 * Mean rally length from array of shot counts.
 */
export function avgRallyLength(rallies: number[]): number {
  if (rallies.length === 0) return 0
  return rallies.reduce((a, b) => a + b, 0) / rallies.length
}

/**
 * Win rate by rally length bracket.
 * rallies: number of shots per rally
 * wins: boolean per rally (true = win)
 * Returns { short, medium, long } win rates.
 */
export function rallyWinRate(
  rallies: number[],
  wins: boolean[],
): { short: number; medium: number; long: number } {
  let shortWins = 0
  let shortTotal = 0
  let mediumWins = 0
  let mediumTotal = 0
  let longWins = 0
  let longTotal = 0

  const len = Math.min(rallies.length, wins.length)
  for (let i = 0; i < len; i++) {
    const shots = rallies[i]
    const won = wins[i]
    if (shots <= 4) {
      shortTotal++
      if (won) shortWins++
    } else if (shots <= 8) {
      mediumTotal++
      if (won) mediumWins++
    } else {
      longTotal++
      if (won) longWins++
    }
  }

  return {
    short: shortTotal === 0 ? 0 : shortWins / shortTotal,
    medium: mediumTotal === 0 ? 0 : mediumWins / mediumTotal,
    long: longTotal === 0 ? 0 : longWins / longTotal,
  }
}

/**
 * Expected rally length by surface.
 * hard: 3.8, clay: 5.2, grass: 2.9
 */
export function expectedRallyLength(surface: 'hard' | 'clay' | 'grass'): number {
  const map: Record<'hard' | 'clay' | 'grass', number> = {
    hard: 3.8,
    clay: 5.2,
    grass: 2.9,
  }
  return map[surface]
}

// ---------------------------------------------------------------------------
// Elo / Rating system
// ---------------------------------------------------------------------------

/**
 * Elo expected score: 1 / (1 + 10^((B - A) / 400))
 */
export function eloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Standard Elo update.
 * rating + k * (actual - expected)
 * Default k = 32.
 */
export function eloUpdate(
  rating: number,
  expected: number,
  actual: number,
  kFactor = 32,
): number {
  return rating + kFactor * (actual - expected)
}

/**
 * Update surface-specific Elo ratings after a match on a given surface.
 * Returns a new SurfaceRatings object (immutable).
 */
export function surfaceEloUpdate(
  ratings: SurfaceRatings,
  surface: 'hard' | 'clay' | 'grass',
  expected: number,
  actual: number,
  k = 32,
): SurfaceRatings {
  const updated = eloUpdate(ratings[surface].rating, expected, actual, k)
  return {
    ...ratings,
    [surface]: {
      ...ratings[surface],
      rating: updated,
    },
  }
}

/**
 * Surface-adjusted Elo: weighted blend of surface rating and average of other two surfaces.
 * Default weight = 0.6 for the surface-specific rating.
 */
export function surfaceAdjustedElo(
  ratings: SurfaceRatings,
  surface: 'hard' | 'clay' | 'grass',
  weight = 0.6,
): number {
  const surfaces: Array<'hard' | 'clay' | 'grass'> = ['hard', 'clay', 'grass']
  const others = surfaces.filter((s) => s !== surface)
  const otherAvg =
    others.reduce((sum, s) => sum + ratings[s].rating, 0) / others.length
  return ratings[surface].rating * weight + otherAvg * (1 - weight)
}

// ---------------------------------------------------------------------------
// Glicko rating system
// ---------------------------------------------------------------------------

const Q = Math.log(10) / 400

/**
 * Glicko g function: 1 / sqrt(1 + 3*q^2*rd^2 / pi^2)
 */
function glickoG(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI))
}

/**
 * Glicko expected score between two rated players.
 */
export function glickoExpected(ratingA: PlayerRating, ratingB: PlayerRating): number {
  const g = glickoG(ratingB.uncertainty)
  return 1 / (1 + Math.pow(10, (-g * (ratingA.rating - ratingB.rating)) / 400))
}

/**
 * Standard Glicko update (single period).
 * Returns updated PlayerRating for `player`.
 */
export function glickoUpdate(
  player: PlayerRating,
  opponent: PlayerRating,
  actual: number,
): PlayerRating {
  const g = glickoG(opponent.uncertainty)
  const E = glickoExpected(player, opponent)

  // d^2 = 1 / (q^2 * g^2 * E * (1 - E))
  const dSquared = 1 / (Q * Q * g * g * E * (1 - E))

  // New rating
  const newRating =
    player.rating + (Q / (1 / (player.uncertainty * player.uncertainty) + 1 / dSquared)) * g * (actual - E)

  // New uncertainty (RD)
  const newRdSquared =
    1 / (1 / (player.uncertainty * player.uncertainty) + 1 / dSquared)
  const newRd = Math.sqrt(newRdSquared)

  return { rating: newRating, uncertainty: newRd }
}

// ---------------------------------------------------------------------------
// Match simulation
// ---------------------------------------------------------------------------

/**
 * Point win probability from Elo ratings (serve vs return).
 * Logistic: 1 / (1 + exp(-(serveElo - returnElo) / 173.7))
 * Clamped to [0.4, 0.75].
 */
export function pointProbFromElo(serveElo: number, returnElo: number): number {
  const raw = 1 / (1 + Math.exp(-(serveElo - returnElo) / 173.7))
  return Math.max(0.4, Math.min(0.75, raw))
}

/**
 * Probability server wins a game given point win probability p (Markov chain with deuce).
 *
 * Tennis game: first to 4 points with ≥2 lead; deuce at 3-3.
 * Exact formula:
 *   P(win without deuce) = p^4 + C(4,1)*p^4*q + C(5,2)*p^4*q^2
 *   P(reach deuce)       = C(6,3)*p^3*q^3
 *   P(win from deuce)    = p^2 / (p^2 + q^2)
 *   P(win game)          = noDeuce + C(6,3)*p^3*q^3 * p^2/(p^2+q^2)
 *
 * C(4,1)=4, C(5,2)=10, C(6,3)=20
 */
export function gameWinProb(p: number): number {
  const q = 1 - p
  // No-deuce paths: server wins 4-0, 4-1, 4-2 (never both reach 3)
  const noDeuce =
    p ** 4 +             // 4-0
    4 * p ** 4 * q +     // 4-1
    10 * p ** 4 * q ** 2 // 4-2
  // Via deuce: C(6,3) ways to reach 3-3, then p^2/(p^2+q^2) to win
  const throughDeuce = 20 * p ** 3 * q ** 3 * (p ** 2 / (p ** 2 + q ** 2))
  return noDeuce + throughDeuce
}

/**
 * Tiebreak win probability.
 * p = server1 (p0) point win probability on own serve.
 * q = server2 (p1) point win probability on own serve.
 * First to 7 with a 2-point lead; at 6-6 continue alternating 1 serve each.
 * Serve order: p0 serves 1, then p1 serves 2, then alternate every 2 until 6-6,
 * after which they alternate 1 each.
 *
 * Key insight: who serves depends only on total points played mod pattern, so
 * we key on (i, j, serverTurn=0|1) to avoid unbounded recursion.
 *
 * Tiebreak serve schedule (0-indexed total points):
 *   point 0: p0
 *   points 1-2: p1
 *   points 3-4: p0
 *   points 5-6: p1
 *   points 7-8: p0
 *   points 9-10: p1
 *   point 11: p0  (start of "change of ends")
 *   After 12 points (6-6), alternate 1 each starting with whoever's turn it is.
 *
 * At 6-6, the serve alternates one point each, starting with the player whose
 * turn it is per the cycle. The serve cycle has period 4 (2 points each),
 * except the very first serve. We simplify by memoizing on (i,j,server).
 */
export function tiebreakWinProb(p: number, q: number): number {
  const memo = new Map<string, number>()

  function solve(i: number, j: number, server: 0 | 1): number {
    // Terminal conditions
    if (i >= 7 && i - j >= 2) return 1
    if (j >= 7 && j - i >= 2) return 0

    const key = `${i},${j},${server}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached

    // At exactly 6-6 (deuce), win probability is closed-form
    // From deuce: p0 wins if they win 2 consecutive; geometric series
    // P(p0 wins from deuce) = wp^2 / (wp^2 + wq^2)
    // where wp = p0 win prob on current serve, wq = p1 win prob on current serve
    // But serve alternates each point, so we just continue recursing with bounded states
    // States at 6-6+ are (6+k, 6+k-2, server), (6+k-2, 6+k, server) — bounded by deuce cycle
    // since deuce cycles are: (6,6)->(7,6)->end or (6,7)->end or (6,6)->(6,7)->(7,7)...
    // At 6-6, we can use closed form: P = a^2/(a^2+b^2) where a=p0 point win this serve order
    if (i === 6 && j === 6) {
      // From 6-6, two points per "mini-game" alternating server
      // Let a = p0 wins a "mini-game" starting from (server=s)
      // Mini-game: server s serves first, then other. p0 wins if wins 2 of next 2 or...
      // Actually, it's simpler: at 6-6, the game continues point-by-point.
      // We compute by letting the recursion continue — but limit to avoid infinite loop
      // by using the closed-form deuce win probability:
      // From (6,6) with server s:
      //   wp0 = p if s==0, else (1-q)  [p0 win this point]
      //   Next state server alternates.
      //   P(win from 6,6,s) = wp0 * P(7,6,1-s) + (1-wp0) * P(6,7,1-s)
      // P(7,6,_) = 1 (win), P(6,7,_) = 0 (lose)... NO: need 2-point lead!
      // (7,6) is NOT a win yet — need 7 and lead by 2, so need (7,5) or (7,6)+(win)=(8,6)
      // Wait: at exactly 6-6, need to reach 7 with 2-point lead. So (7,6) needs one more win.
      // We must continue recursing. The deuce states are: (6,6),(7,7),(8,8),...
      // From (n,n) state, player wins with prob P_deuce(server)
      // P_deuce(s) = wp0(s) * P(n+1,n,1-s) + (1-wp0(s)) * P(n,n+1,1-s)
      // P(n+1,n,s') = wp0(s') * 1 + (1-wp0(s')) * P(n,n,1-s') = wp0(s') + (1-wp0(s'))*P_deuce(1-s')
      // P(n,n+1,s') = wp0(s') * P(n,n,1-s') + (1-wp0(s')) * 0 = wp0(s')*P_deuce(1-s')
      //
      // Let a = wp0(0) = p, b = wp0(1) = 1-q
      // P0 = P_deuce(0), P1 = P_deuce(1)
      // P0 = a*(a + (1-a)*P1) + (1-a)*(a*P1)
      //    = a^2 + a(1-a)P1 + a(1-a)P1
      //    = a^2 + 2a(1-a)P1
      // P1 = b*(b + (1-b)*P0) + (1-b)*(b*P0)
      //    = b^2 + 2b(1-b)P0
      //
      // Solve: P0 = a^2 + 2a(1-a)(b^2 + 2b(1-b)P0)
      //        P0 = a^2 + 2a(1-a)*b^2 + 4a(1-a)*b(1-b)*P0
      //        P0*(1 - 4a(1-a)*b(1-b)) = a^2 + 2a(1-a)*b^2
      //        P0 = (a^2 + 2a(1-a)*b^2) / (1 - 4a(1-a)*b(1-b))
      const a = p    // p0 win prob when p0 serves (server=0)
      const b = 1 - q // p0 win prob when p1 serves (server=1)
      let P0: number
      let P1: number
      const denom = 1 - 4 * a * (1 - a) * b * (1 - b)
      if (Math.abs(denom) < 1e-12) {
        // degenerate case
        P0 = 0.5
        P1 = 0.5
      } else {
        P0 = (a * a + 2 * a * (1 - a) * b * b) / denom
        P1 = (b * b + 2 * b * (1 - b) * a * a) / denom
      }
      const result = server === 0 ? P0 : P1
      memo.set(key, result)
      return result
    }

    const p0WinProb = server === 0 ? p : 1 - q
    const nextServer: 0 | 1 = server === 0 ? 1 : 0

    const result =
      p0WinProb * solve(i + 1, j, nextServer) +
      (1 - p0WinProb) * solve(i, j + 1, nextServer)

    memo.set(key, result)
    return result
  }

  // Determine initial server based on tiebreak convention
  // p0 serves the first point (server=0)
  // We pass the server index who serves each point
  // For the standard tiebreak: p0 serves point 0, p1 serves points 1-2, p0 serves points 3-4, etc.
  // To handle this, we track who serves per point using `serverAtPoint`.
  // But since our recursion keys on (i,j,server) and the server alternates every time we score,
  // we need a version that accounts for the 2-point serve blocks.
  // Solution: use a different parameterization where we track "how many more points does current
  // server serve before switching" — too complex. Instead, use a simpler model:
  // Approximate tiebreak as alternating serve every point (which is close enough for probability
  // calculation, and simpler to memoize). This matches the closed-form deuce behavior.
  // The serve alternation pattern makes each state uniquely determined by (i,j,server).
  // The `server` in our recursion represents who serves the NEXT point.

  // In tiebreak, from (0,0), p0 serves first point.
  return solve(0, 0, 0)
}

/**
 * Set win probability (6-game set, tiebreak at 6-6).
 * p = server (player 0) point win prob on serve.
 * q = server (player 1) point win prob on serve.
 */
export function setWinProb(p: number, q: number): number {
  // G0 = prob player0 wins a game when serving
  // G1 = prob player1 wins a game when serving (player0's prob = 1 - gameWinProb(q))
  const G0 = gameWinProb(p) // p0 serving
  const G1 = 1 - gameWinProb(q) // p0 winning when p1 serves

  // Use DP over game scores
  // State: (i, j, p0Serving): i = p0 games, j = p1 games
  // Service alternates each game, p0 serves first
  const memo = new Map<string, number>()

  function solve(i: number, j: number, p0Serving: boolean): number {
    if (i === 6 && j <= 4) return 1
    if (j === 6 && i <= 4) return 0
    if (i === 7) return 1
    if (j === 7) return 0
    if (i === 6 && j === 6) {
      // Tiebreak
      return tiebreakWinProb(p, q)
    }
    const key = `${i},${j},${p0Serving ? 1 : 0}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached

    const winGame = p0Serving ? G0 : G1
    const result =
      winGame * solve(i + 1, j, !p0Serving) +
      (1 - winGame) * solve(i, j + 1, !p0Serving)

    memo.set(key, result)
    return result
  }

  return solve(0, 0, true)
}

/**
 * Match win probability (best of 3 or 5 sets).
 * p = player0's point win prob on own serve.
 * q = player1's point win prob on own serve.
 */
export function matchWinProb(p: number, q: number, bestOf: 3 | 5): number {
  const setsNeeded = bestOf === 3 ? 2 : 3
  const S = setWinProb(p, q) // p0 wins a set

  // DP over set scores
  // Assume each set is independent (p0 serves first in each set alternating)
  // For simplicity in set probability, use S as approximate set win prob
  const memo = new Map<string, number>()

  function solve(p0Sets: number, p1Sets: number): number {
    if (p0Sets === setsNeeded) return 1
    if (p1Sets === setsNeeded) return 0
    const key = `${p0Sets},${p1Sets}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached

    const result =
      S * solve(p0Sets + 1, p1Sets) + (1 - S) * solve(p0Sets, p1Sets + 1)
    memo.set(key, result)
    return result
  }

  return solve(0, 0)
}

// ---------------------------------------------------------------------------
// LCG for deterministic simulation
// ---------------------------------------------------------------------------

function lcgRand(seed: number): { value: number; nextSeed: number } {
  // LCG parameters (Numerical Recipes)
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32
  const nextSeed = (a * seed + c) % m
  return { value: nextSeed / m, nextSeed }
}

/**
 * Deterministic match simulation using an LCG seeded random number generator.
 * Returns winner (0 or 1), sets [p0Sets, p1Sets], games [p0Games, p1Games].
 */
export function simulateMatch(
  serveElo: number,
  returnElo: number,
  bestOf: 3 | 5 = 3,
  seed = 42,
): { winner: 0 | 1; sets: [number, number]; games: [number, number] } {
  // p (player0's point win prob on serve) and q (player1's point win prob on serve)
  const p = pointProbFromElo(serveElo, returnElo)
  const q = pointProbFromElo(returnElo, serveElo)

  let currentSeed = seed
  let p0Sets = 0
  let p1Sets = 0
  let p0Games = 0
  let p1Games = 0
  const setsNeeded = bestOf === 3 ? 2 : 3

  function rand(): number {
    const { value, nextSeed } = lcgRand(currentSeed)
    currentSeed = nextSeed
    return value
  }

  function simulatePoint(p0Serving: boolean): boolean {
    // Returns true if p0 wins the point
    const prob = p0Serving ? p : 1 - q
    return rand() < prob
  }

  function simulateGame(p0Serving: boolean): boolean {
    // Returns true if p0 wins the game
    let p0Pts = 0
    let p1Pts = 0
    while (true) {
      if (simulatePoint(p0Serving)) p0Pts++
      else p1Pts++

      if (p0Pts >= 4 && p0Pts - p1Pts >= 2) return true
      if (p1Pts >= 4 && p1Pts - p0Pts >= 2) return false
    }
  }

  function simulateTiebreak(): boolean {
    // Returns true if p0 wins tiebreak
    let p0Pts = 0
    let p1Pts = 0

    while (true) {
      // Determine server
      let p0Serving: boolean
      if (p0Pts + p1Pts < 12) {
        const total = p0Pts + p1Pts
        if (total === 0) {
          p0Serving = true
        } else {
          const adjustedPoint = total - 1
          const blockAfterFirst = Math.floor(adjustedPoint / 2)
          p0Serving = !(blockAfterFirst % 2 === 0)
        }
      } else {
        const deucePoint = p0Pts + p1Pts - 12
        p0Serving = deucePoint % 2 === 0
      }

      if (simulatePoint(p0Serving)) p0Pts++
      else p1Pts++

      if (p0Pts >= 7 && p0Pts - p1Pts >= 2) return true
      if (p1Pts >= 7 && p1Pts - p0Pts >= 2) return false
    }
  }

  function simulateSet(): boolean {
    // Returns true if p0 wins the set
    let p0G = 0
    let p1G = 0
    let p0Serving = true

    while (true) {
      if (p0G === 6 && p1G === 6) {
        const p0WinsTb = simulateTiebreak()
        if (p0WinsTb) p0G++
        else p1G++
        break
      }

      const p0WinsGame = simulateGame(p0Serving)
      if (p0WinsGame) p0G++
      else p1G++
      p0Serving = !p0Serving

      if ((p0G === 6 && p1G <= 4) || p0G === 7) break
      if ((p1G === 6 && p0G <= 4) || p1G === 7) break
    }

    p0Games += p0G
    p1Games += p1G

    return p0G > p1G
  }

  while (p0Sets < setsNeeded && p1Sets < setsNeeded) {
    if (simulateSet()) p0Sets++
    else p1Sets++
  }

  return {
    winner: p0Sets > p1Sets ? 0 : 1,
    sets: [p0Sets, p1Sets],
    games: [p0Games, p1Games],
  }
}

// ---------------------------------------------------------------------------
// Set / match stats
// ---------------------------------------------------------------------------

/**
 * Returns [player0 sets won, player1 sets won] from MatchStats.
 */
export function setsWon(match: MatchStats): [number, number] {
  let p0 = 0
  let p1 = 0
  for (const set of match.sets) {
    if (set.gamesWon > set.gamesLost) p0++
    else if (set.gamesLost > set.gamesWon) p1++
    // tie not expected in tennis, but skip if tied
  }
  return [p0, p1]
}

/**
 * Returns [player0 total games, player1 total games] from MatchStats.
 */
export function gamesWon(match: MatchStats): [number, number] {
  let p0 = 0
  let p1 = 0
  for (const set of match.sets) {
    p0 += set.gamesWon
    p1 += set.gamesLost
  }
  return [p0, p1]
}

/**
 * Returns [player0 tiebreaks won, player1 tiebreaks won].
 * A set went to a tiebreak if total games is 13 (7-6) or if tiebreakWon is defined.
 */
export function tiebreaksWon(match: MatchStats): [number, number] {
  let p0 = 0
  let p1 = 0
  for (const set of match.sets) {
    const total = set.gamesWon + set.gamesLost
    const isTiebreak = total === 13 || set.tiebreakWon !== undefined
    if (isTiebreak) {
      if (set.tiebreakWon === true) {
        p0++
      } else if (set.tiebreakWon === false) {
        p1++
      } else if (total === 13) {
        // infer from who won the set
        if (set.gamesWon === 7) p0++
        else p1++
      }
    }
  }
  return [p0, p1]
}

/**
 * Total match duration in minutes.
 */
export function matchDuration(match: MatchStats): number {
  return match.duration
}

/**
 * Parse a score string like "6-4 3-6 7-5" into game totals per player.
 * Returns null if the format is invalid.
 */
export function gameScore(
  score: string,
): { player0: number; player1: number } | null {
  if (!score || score.trim() === '') return null
  const sets = score.trim().split(/\s+/)
  let p0 = 0
  let p1 = 0
  for (const set of sets) {
    const match = /^(\d+)-(\d+)$/.exec(set)
    if (!match) return null
    p0 += parseInt(match[1], 10)
    p1 += parseInt(match[2], 10)
  }
  return { player0: p0, player1: p1 }
}

// ---------------------------------------------------------------------------
// Surface adjustments
// ---------------------------------------------------------------------------

/**
 * Surface speed rating on scale 1-6.
 * hard: 4, clay: 2, grass: 6, carpet: 5
 */
export function surfaceSpeedRating(
  surface: 'hard' | 'clay' | 'grass' | 'carpet',
): number {
  const map: Record<'hard' | 'clay' | 'grass' | 'carpet', number> = {
    hard: 4,
    clay: 2,
    grass: 6,
    carpet: 5,
  }
  return map[surface]
}

/**
 * Serve advantage multiplier by surface.
 * grass: 1.15, hard: 1.05, clay: 0.95
 */
export function serveAdvantageMultiplier(
  surface: 'hard' | 'clay' | 'grass',
): number {
  const map: Record<'hard' | 'clay' | 'grass', number> = {
    grass: 1.15,
    hard: 1.05,
    clay: 0.95,
  }
  return map[surface]
}

/**
 * Surface rally statistics.
 */
export function rallySurface(
  surface: 'hard' | 'clay' | 'grass',
): { avgLength: number; variance: number } {
  const map: Record<'hard' | 'clay' | 'grass', { avgLength: number; variance: number }> = {
    hard: { avgLength: 3.8, variance: 2.1 },
    clay: { avgLength: 5.2, variance: 3.0 },
    grass: { avgLength: 2.9, variance: 1.5 },
  }
  return map[surface]
}

// ---------------------------------------------------------------------------
// Fantasy scoring
// ---------------------------------------------------------------------------

/**
 * DraftKings tennis scoring.
 * aces×0.4, doubleFaults×-1, gameWon×0.25, setWon×2, matchWon×6, cleanSet×1.5, noDFMatch×1
 */
export function draftKingsScore(stats: {
  aces: number
  doubleFaults: number
  gameWon: number
  setWon: number
  matchWon: boolean
  cleanSet: boolean
  noDFMatch: boolean
}): number {
  return (
    stats.aces * 0.4 +
    stats.doubleFaults * -1 +
    stats.gameWon * 0.25 +
    stats.setWon * 2 +
    (stats.matchWon ? 6 : 0) +
    (stats.cleanSet ? 1.5 : 0) +
    (stats.noDFMatch ? 1 : 0)
  )
}

/**
 * FanDuel tennis scoring.
 * aces×0.3, doubleFaults×-1, gameWon×0.3, setWon×2, matchWon×5
 */
export function fanDuelScore(stats: {
  aces: number
  doubleFaults: number
  gameWon: number
  setWon: number
  matchWon: boolean
}): number {
  return (
    stats.aces * 0.3 +
    stats.doubleFaults * -1 +
    stats.gameWon * 0.3 +
    stats.setWon * 2 +
    (stats.matchWon ? 5 : 0)
  )
}
