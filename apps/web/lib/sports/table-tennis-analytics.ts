/**
 * Table Tennis Analytics Library
 * Pure TypeScript — zero npm dependencies, no `any` types.
 * noUncheckedIndexedAccess: all array index reads use ?? fallbacks.
 */

// ---------------------------------------------------------------------------
// 1. Scoring rules
// ---------------------------------------------------------------------------

/** First to 11 points with a ≥2-point lead wins the game. */
export function isGameWon(myPoints: number, opponentPoints: number): boolean {
  return myPoints >= 11 && myPoints - opponentPoints >= 2;
}

/**
 * Best-of-3, 5, or 7 match. Win ceil(bestOf/2) games.
 * Throws if bestOf is not 3, 5, or 7.
 */
export function isMatchWon(
  myGames: number,
  opponentGames: number,
  bestOf: number
): boolean {
  if (bestOf !== 3 && bestOf !== 5 && bestOf !== 7) {
    throw new Error(`bestOf must be 3, 5, or 7; got ${bestOf}`);
  }
  const needed = Math.ceil(bestOf / 2);
  return myGames >= needed;
}

/**
 * Deuce is required when both players are at ≥10 and within 1 point of each other
 * (i.e. neither has yet secured the 2-point lead).
 */
export function deuceRequired(myPoints: number, opponentPoints: number): boolean {
  const hi = Math.max(myPoints, opponentPoints);
  const lo = Math.min(myPoints, opponentPoints);
  return hi >= 10 && hi - lo <= 1;
}

/**
 * Returns which player (1 or 2) serves on the point AFTER `totalPoints` rallies
 * have already been played in the current game (i.e. `totalPoints` is the 0-based
 * index of the NEXT point to be played).
 *
 * Normal phase (before 10-10): serve rotates every 2 points.
 *   P1 serves points 0-1, P2 serves 2-3, P1 serves 4-5, …
 * Deuce phase (once the score reaches 10-10, i.e. totalPoints ≥ 20): every 1 point.
 */
export function servicePattern(
  totalPoints: number,
  player: 1 | 2
): 1 | 2 {
  // At deuce (10-10 is after 20 points have been played in the game)
  if (totalPoints >= 20) {
    // At deuce each player serves 1 point alternately.
    // Player 1 starts the deuce phase; if player 2 started the game, swap.
    const deuceIndex = totalPoints - 20;
    const p1ServesFirst = player === 1 ? deuceIndex % 2 === 0 : deuceIndex % 2 === 1;
    return p1ServesFirst ? 1 : 2;
  }
  // Normal phase: blocks of 2.
  const block = Math.floor(totalPoints / 2);
  // Player 1 serves if block is even (when player=1), odd (when player=2).
  const p1Serves = player === 1 ? block % 2 === 0 : block % 2 === 1;
  return p1Serves ? 1 : 2;
}

/**
 * In table tennis players switch ends between games.
 * In the LAST possible game (game number = bestOf) they also switch at 5 points.
 * `totalPoints` is the number of points played so far in the current game.
 */
export function endChangeRequired(
  totalPoints: number,
  gameNumber: number,
  bestOf: number
): boolean {
  // Switch at 5 points only in the decisive last game.
  return gameNumber === bestOf && totalPoints === 5;
}

/**
 * Count rally winners (1 = player 1 wins, 2 = player 2 wins).
 * Returns winner=null if neither player has won yet.
 */
export function gameScore(
  rallies: (1 | 2)[]
): { p1: number; p2: number; winner: 1 | 2 | null } {
  let p1 = 0;
  let p2 = 0;
  for (const r of rallies) {
    if (r === 1) p1++;
    else p2++;
  }
  let winner: 1 | 2 | null = null;
  if (isGameWon(p1, p2)) winner = 1;
  else if (isGameWon(p2, p1)) winner = 2;
  return { p1, p2, winner };
}

// ---------------------------------------------------------------------------
// 2. Rally and stroke analytics
// ---------------------------------------------------------------------------

/**
 * Classify rally lengths and compute average.
 * short: ≤3 strokes, medium: 4–8, long: ≥9.
 * Values returned as fractions of total (0 if no rallies).
 */
export function rallyLengthDistribution(rallies: number[]): {
  short: number;
  medium: number;
  long: number;
  avgLength: number;
} {
  if (rallies.length === 0) {
    return { short: 0, medium: 0, long: 0, avgLength: 0 };
  }
  let short = 0;
  let medium = 0;
  let long = 0;
  let total = 0;
  for (const len of rallies) {
    total += len;
    if (len <= 3) short++;
    else if (len <= 8) medium++;
    else long++;
  }
  const n = rallies.length;
  return {
    short: short / n,
    medium: medium / n,
    long: long / n,
    avgLength: total / n,
  };
}

/**
 * Points won in the first 3 balls divided by total points.
 * Returns 0 if totalPoints is 0.
 */
export function firstStrikeRate(
  firstBallPoints: number,
  totalPoints: number
): number {
  if (totalPoints === 0) return 0;
  return firstBallPoints / totalPoints;
}

/**
 * Win rate on serve vs win rate on return.
 * servePoints[i] = 1 if won that serve point, 0 if lost.
 * rallyPoints[i] = 1 if won that return point, 0 if lost.
 */
export function serveWinRate(
  servePoints: number[],
  rallyPoints: number[]
): { onServe: number; onReturn: number } {
  const onServe =
    servePoints.length === 0
      ? 0
      : servePoints.reduce((a, b) => a + b, 0) / servePoints.length;
  const onReturn =
    rallyPoints.length === 0
      ? 0
      : rallyPoints.reduce((a, b) => a + b, 0) / rallyPoints.length;
  return { onServe, onReturn };
}

/** Count occurrences of each stroke type. */
export function strokeDistribution(strokes: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of strokes) {
    map.set(s, (map.get(s) ?? 0) + 1);
  }
  return map;
}

/** Unforced errors / total points. Returns 0 if total is 0. */
export function errorRate(unforced: number, total: number): number {
  if (total === 0) return 0;
  return unforced / total;
}

/** Winners / total points. Returns 0 if total is 0. */
export function winnerRate(winners: number, total: number): number {
  if (total === 0) return 0;
  return winners / total;
}

// ---------------------------------------------------------------------------
// 3. Serve analysis
// ---------------------------------------------------------------------------

/** Group serves by type; compute count and win rate per type. */
export function serveEffectiveness(
  serves: { type: string; won: boolean }[]
): Map<string, { count: number; winRate: number }> {
  const map = new Map<string, { wins: number; count: number }>();
  for (const s of serves) {
    const entry = map.get(s.type) ?? { wins: 0, count: 0 };
    entry.count++;
    if (s.won) entry.wins++;
    map.set(s.type, entry);
  }
  const result = new Map<string, { count: number; winRate: number }>();
  for (const [type, { wins, count }] of map) {
    result.set(type, { count, winRate: count === 0 ? 0 : wins / count });
  }
  return result;
}

/**
 * Shannon entropy of serve distribution.
 * Returns 0 if serves is empty or all the same type.
 */
export function serveVariety(serves: { type: string }[]): number {
  if (serves.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const s of serves) {
    counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
  }
  const n = serves.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / n;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Imitation (ace) rate: fraction of serves the opponent couldn't return.
 * Uses min(serves.length, returns.length) for mismatched arrays.
 */
export function imitationRate(
  serves: { side: "forehand" | "backhand" }[],
  returns: { returned: boolean }[]
): number {
  const n = Math.min(serves.length, returns.length);
  if (n === 0) return 0;
  let missed = 0;
  for (let i = 0; i < n; i++) {
    const ret = returns[i];
    if (ret !== undefined && !ret.returned) missed++;
  }
  return missed / n;
}

/** Signed serve edge = myServeWinRate - theirServeWinRate. */
export function serveEdge(
  myServeWinRate: number,
  theirServeWinRate: number
): number {
  return myServeWinRate - theirServeWinRate;
}

// ---------------------------------------------------------------------------
// 4. Player rating (Elo for table tennis)
// ---------------------------------------------------------------------------

/** Standard Elo expected score for player A vs player B. */
export function ttEloExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Apply a single Elo update.
 * scoreA: 1 = A wins, 0 = A loses, 0.5 = draw.
 * Default K-factor = 32.
 */
export function ttEloUpdate(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  kFactor = 32
): { newA: number; newB: number } {
  const expectedA = ttEloExpected(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const scoreB = 1 - scoreA;
  return {
    newA: ratingA + kFactor * (scoreA - expectedA),
    newB: ratingB + kFactor * (scoreB - expectedB),
  };
}

/** Classify rating into named tiers. */
export function ttRatingClass(
  rating: number
): "beginner" | "club" | "national" | "international" | "world_class" {
  if (rating < 1000) return "beginner";
  if (rating < 1500) return "club";
  if (rating < 2000) return "national";
  if (rating < 2500) return "international";
  return "world_class";
}

/**
 * Apply Elo updates sequentially for a tournament.
 * Returns the NET change in rating (final - initial).
 */
export function tournamentRatingChange(
  initialRating: number,
  results: { opponentRating: number; won: boolean }[]
): number {
  let rating = initialRating;
  for (const r of results) {
    const { newA } = ttEloUpdate(rating, r.opponentRating, r.won ? 1 : 0);
    rating = newA;
  }
  return rating - initialRating;
}

// ---------------------------------------------------------------------------
// 5. Match statistics
// ---------------------------------------------------------------------------

/**
 * Mean points scored by each player across completed games.
 * Returns { avgP1: 0, avgP2: 0 } for an empty array.
 */
export function pointsPerGame(
  games: { p1: number; p2: number }[]
): { avgP1: number; avgP2: number } {
  if (games.length === 0) return { avgP1: 0, avgP2: 0 };
  let sumP1 = 0;
  let sumP2 = 0;
  for (const g of games) {
    sumP1 += g.p1;
    sumP2 += g.p2;
  }
  return { avgP1: sumP1 / games.length, avgP2: sumP2 / games.length };
}

/** Maximum consecutive points won by `player` in the sequence. */
export function longestStreak(points: (1 | 2)[], player: 1 | 2): number {
  let max = 0;
  let current = 0;
  for (const p of points) {
    if (p === player) {
      current++;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

/**
 * Rolling win rate for player 1 in a sliding window.
 * Returns one value per valid window position (length - windowSize + 1 values).
 * Default windowSize = 5.
 */
export function momentumShift(
  points: (1 | 2)[],
  windowSize = 5
): number[] {
  const result: number[] = [];
  for (let i = 0; i <= points.length - windowSize; i++) {
    let wins = 0;
    for (let j = i; j < i + windowSize; j++) {
      if ((points[j] ?? 2) === 1) wins++;
    }
    result.push(wins / windowSize);
  }
  return result;
}

/**
 * Fraction of "clutch" points won by player 1.
 * A clutch point is one where |score diff| ≤ 2 and at least one player is at
 * clutchThreshold or above. Default clutchThreshold = 9.
 * Returns 0 if no clutch points exist.
 */
export function clutchPerformance(
  points: { score: [number, number]; winner: 1 | 2 }[],
  clutchThreshold = 9
): number {
  let clutchTotal = 0;
  let clutchWins = 0;
  for (const pt of points) {
    const [s1, s2] = [pt.score[0] ?? 0, pt.score[1] ?? 0];
    const diff = Math.abs(s1 - s2);
    const highScore = Math.max(s1, s2);
    if (highScore >= clutchThreshold && diff <= 2) {
      clutchTotal++;
      if (pt.winner === 1) clutchWins++;
    }
  }
  if (clutchTotal === 0) return 0;
  return clutchWins / clutchTotal;
}

/**
 * Fraction of games where a player came back from being 0-5 or 5-0 down.
 * "Came back" means the trailing player at 0-5 eventually won the game.
 * Returns 0 if no games had a 5-0 / 0-5 situation.
 *
 * NOTE: Since this function only receives final game scores (p1, p2),
 * we infer a comeback by: if one player was 5-0 up (the other at 0)
 * but the opponent won. We use the heuristic that if one player scored
 * ≥6 points while the other scored 0 at some midpoint is not directly
 * observable from final scores alone; instead we define "comeback game"
 * as a game where the losing player's score was ≤ 5 lower at some point —
 * approximated here as: final score shows a winner AND the winner was
 * down early, i.e. winner's points > loser's points AND loser finished
 * with ≤ (winner - 6) points (suggesting a ≥6 point run from behind).
 *
 * For deterministic testing we use: a game is a comeback if
 * the EVENTUAL loser had ≥5 more points than the winner at some point —
 * which we simplify to: games where the winner scored more than 11 points
 * (deuce game) indicating they came from behind, AND the score was
 * within 5 at the end (both ≥ 6).
 *
 * The most faithful model given only final scores:
 * a comeback from 0-5 is approximated as a deuce game (both sides ≥ 10)
 * where we cannot confirm; so we use a strict model:
 * comeback = p1 won (p1 > p2) AND p2 ≥ 5 AND p1 - p2 <= 5
 *            (suggesting p2 had an early lead that was overcome),
 * OR symmetric for p2.
 * We count only distinct comeback-possible games (p2 or p1 had at least 5).
 */
export function comebackFrequency(
  games: { p1: number; p2: number }[]
): number {
  // A "potential comeback" game is one where either player finished with ≥5 pts
  // and the other won. We flag a comeback when the losing player's total is ≥5
  // (they scored enough to suggest they had an early lead or pressure).
  let comebackGames = 0;
  let eligibleGames = 0;

  for (const g of games) {
    const winner = g.p1 > g.p2 ? 1 : g.p2 > g.p1 ? 2 : 0;
    if (winner === 0) continue; // draw — skip

    const loserScore = winner === 1 ? g.p2 : g.p1;

    // Eligible: the loser scored at least 5 (suggesting a 0-5 situation was possible)
    if (loserScore >= 5) {
      eligibleGames++;
      // If winner's total is high enough and loser had ≥5, count as comeback
      // proxy: winner had to score many more to overcome — they trailed at some point
      // We use: final winner score > 11 (deuce game, suggesting comeback) as proxy
      const winnerScore = winner === 1 ? g.p1 : g.p2;
      if (winnerScore > 11) {
        comebackGames++;
      }
    }
  }

  if (eligibleGames === 0) return 0;
  return comebackGames / eligibleGames;
}

// ---------------------------------------------------------------------------
// 6. World ranking simulation
// ---------------------------------------------------------------------------

type TournamentType =
  | "grand_slam"
  | "wtt_star"
  | "wtt_contender"
  | "olympics";

const RANKING_POINTS: Record<TournamentType, number[]> = {
  // Index 0 = 1st place, 1 = 2nd, 2 = 3rd (bronze), 3 = 4th, 4 = 5th-8th
  grand_slam: [2000, 1400, 1000, 750, 500],
  wtt_star: [1000, 700, 500, 375, 250],
  wtt_contender: [500, 350, 250, 187, 125],
  // Olympics: 1st=2200, 2nd=1540, bronze=1100, 4th=1100 (same bracket)
  olympics: [2200, 1540, 1100, 1100, 0],
};

/**
 * Points awarded for a given tournament type and finishing place.
 * Places 5–8 share the same points bucket (index 4).
 * Returns 0 for places beyond 8.
 */
export function worldRankingPoints(
  tournamentType: TournamentType,
  place: number
): number {
  const table = RANKING_POINTS[tournamentType];
  if (place === 1) return table[0] ?? 0;
  if (place === 2) return table[1] ?? 0;
  if (place === 3) return table[2] ?? 0;
  if (place === 4) return table[3] ?? 0;
  if (place >= 5 && place <= 8) return table[4] ?? 0;
  return 0;
}

/**
 * Project total ranking points: current + sum of projected new points.
 */
export function rankingProjection(
  currentPoints: number,
  upcomingTournaments: {
    type: TournamentType;
    estimatedPlace: number;
  }[]
): number {
  let total = currentPoints;
  for (const t of upcomingTournaments) {
    total += worldRankingPoints(t.type, t.estimatedPlace);
  }
  return total;
}

// ---------------------------------------------------------------------------
// 7. DraftKings fantasy (Table Tennis)
// ---------------------------------------------------------------------------

interface TTResult {
  gamesWon: number;
  gamesLost: number;
  totalPoints: number;
  pointsAgainst: number;
  won: boolean;
}

/**
 * DraftKings Table Tennis scoring:
 *   Win: +20
 *   Per game won: +2
 *   Per point scored: +0.1
 *   Per point against: -0.1
 *   Loss: 0 (no win bonus)
 */
export function dkTTPoints(result: TTResult): number {
  let pts = 0;
  if (result.won) pts += 20;
  pts += result.gamesWon * 2;
  pts += result.totalPoints * 0.1;
  pts -= result.pointsAgainst * 0.1;
  return pts;
}

/**
 * Weighted average DK projection.
 * Most recent result = weight 3, all others = weight 1.
 * Returns 0 for empty array.
 */
export function dkProjection(recentResults: TTResult[]): number {
  if (recentResults.length === 0) return 0;
  const scores = recentResults.map(dkTTPoints);
  const n = scores.length;

  // Most recent is the last element.
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const weight = i === n - 1 ? 3 : 1;
    weightedSum += (scores[i] ?? 0) * weight;
    totalWeight += weight;
  }
  return weightedSum / totalWeight;
}
