/**
 * "Beat the Model" contest scoring — the Phase-1, low-legal-risk engagement layer
 * (see docs/strategy/gaming-and-engagement-expansion.md).
 *
 * DESIGN = SKILL, NOT GAMBLING. Picks are scored by a proper scoring rule (Brier)
 * against settled outcomes, so calibration/skill — not chance — determines points.
 * Contests aggregate MULTIPLE games (predominance-of-skill + UIGEA-safe-harbor
 * shape), never a single yes/no wager. The virtual currency awarded here is an
 * internal engagement score: it is NEVER cash-redeemable and has no secondary
 * market. Crossing either line (cash-out / single-event wager / a chance engine)
 * would re-trigger gambling law and is out of scope here by construction.
 *
 * Pure functions, no I/O — fully unit-testable.
 */

export type Side = "home" | "away";

export interface GameLine {
  readonly gameId: string;
  /** The model's P(home wins), 0–1 — the benchmark the user tries to beat. */
  readonly modelHomeProb: number;
}

export interface UserPick {
  readonly gameId: string;
  readonly side: Side;
  /** Stated confidence in the chosen side, 0.5–1.0. Rewards calibration (skill). */
  readonly confidence?: number;
}

export interface GameResult {
  readonly gameId: string;
  readonly homeWon: boolean;
}

export interface PickScore {
  readonly gameId: string;
  readonly correct: boolean;
  /** Brier-based points in [0, 100]; higher is better, calibration-aware. */
  readonly points: number;
}

export interface ContestEntryScore {
  readonly correctCount: number;
  readonly graded: number;
  /** Sum of Brier points across graded picks, in [0, 100·graded]. */
  readonly points: number;
  /** The model's points on the SAME games — the benchmark. */
  readonly modelPoints: number;
  /** Did the entrant out-score the model on this slate? (the skill signal) */
  readonly beatModel: boolean;
  readonly perGame: readonly PickScore[];
}

const DEFAULT_CONFIDENCE = 0.6; // a modest default when the entrant states none

function clampProb(p: number): number {
  return Math.max(0, Math.min(1, p));
}

/** Brier score → points in [0,100]: 100·(1 − (outcome − prob)^2). Proper scoring rule. */
function brierPoints(probHome: number, homeWon: boolean): number {
  const outcome = homeWon ? 1 : 0;
  const err = outcome - clampProb(probHome);
  return Number((100 * (1 - err * err)).toFixed(2));
}

function pickHomeProb(pick: UserPick): number {
  const conf = clampProb(pick.confidence ?? DEFAULT_CONFIDENCE);
  // Confidence is in the CHOSEN side; convert to P(home).
  return pick.side === "home" ? Math.max(0.5, conf) : 1 - Math.max(0.5, conf);
}

/**
 * Score one entrant's picks for a settled slate. Only games with BOTH a line and a
 * result are graded; unmatched picks are ignored. Compares the entrant's
 * calibration-aware points against the model's points on the same games.
 */
export function scoreContestEntry(
  picks: readonly UserPick[],
  lines: readonly GameLine[],
  results: readonly GameResult[],
): ContestEntryScore {
  const lineByGame = new Map(lines.map((l) => [l.gameId, l]));
  const resultByGame = new Map(results.map((r) => [r.gameId, r]));

  const perGame: PickScore[] = [];
  let points = 0;
  let modelPoints = 0;
  let correctCount = 0;

  for (const pick of picks) {
    const line = lineByGame.get(pick.gameId);
    const result = resultByGame.get(pick.gameId);
    if (!line || !result) continue;

    const userProbHome = pickHomeProb(pick);
    const userPts = brierPoints(userProbHome, result.homeWon);
    const modelPts = brierPoints(line.modelHomeProb, result.homeWon);
    const correct = (pick.side === "home") === result.homeWon;

    perGame.push({ gameId: pick.gameId, correct, points: userPts });
    points += userPts;
    modelPoints += modelPts;
    if (correct) correctCount += 1;
  }

  return {
    correctCount,
    graded: perGame.length,
    points: Number(points.toFixed(2)),
    modelPoints: Number(modelPoints.toFixed(2)),
    beatModel: perGame.length > 0 && points > modelPoints,
    perGame,
  };
}

/**
 * Award internal, NON-REDEEMABLE virtual coins for an entry. Pure cosmetic
 * engagement score — never cash, never a secondary market. Base on points,
 * with a fixed bonus for beating the model. Returns a non-negative integer.
 */
export function awardVirtualCoins(score: ContestEntryScore): number {
  if (score.graded === 0) return 0;
  const base = Math.round(score.points); // ~0–100 per graded game
  const beatBonus = score.beatModel ? 250 : 0;
  return Math.max(0, base + beatBonus);
}

export interface LeaderboardEntry {
  readonly entrantId: string;
  readonly score: ContestEntryScore;
}

/**
 * Rank entrants by points (desc), tie-broken by beating the model then by
 * correct count. Pure — returns a new sorted array.
 */
export function rankLeaderboard(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score.points !== a.score.points) return b.score.points - a.score.points;
    if (a.score.beatModel !== b.score.beatModel) return a.score.beatModel ? -1 : 1;
    return b.score.correctCount - a.score.correctCount;
  });
}
