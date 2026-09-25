/**
 * Fantasy draft copilot — pick recommendation under roster need and
 * positional scarcity.
 *
 * Score = projected value - positional scarcity penalty + roster-need bonus.
 *
 * Projected value is the settings-aware projection (points). Positional
 * scarcity is the expected points drop from this player to the next
 * realistic starter at the same position still on the board; a deep
 * position therefore subtracts a larger penalty, so the copilot prefers
 * scarce studs over equally-projected players at replaceable spots.
 * Roster-need bonus rewards filling an empty starter slot over doubling
 * up at a position the roster already covers.
 *
 * Research / product build for the ethandojo handoff. Not wired into any
 * live draft path.
 */

// ─── Inputs ──────────────────────────────────────────────────────────────────

/** One player still on the board. */
export interface DraftPlayer {
  readonly id: string;
  readonly name: string;
  readonly position: string;
  /** Projected fantasy points under the league's scoring settings. */
  readonly projectedPoints: number;
  /** Average draft position — earlier ADP means the market likes him more. */
  readonly adp: number;
  /** Availability flag: false means already drafted / out. */
  readonly available: boolean;
}

export interface DraftCopilotInput {
  /** 1-based overall pick number (e.g. 9 for 1.09 in a 12-team league). */
  readonly pickNumber: number;
  /**
   * Positions already filled on the caller's roster, e.g. ["QB", "RB", "WR"].
   * Drives the roster-need bonus.
   */
  readonly rosterSoFar: readonly string[];
  readonly availablePlayers: readonly DraftPlayer[];
  /**
   * Optional external ADP map keyed by player id. Overrides `player.adp`
   * when present (callers may keep ADP in a separate feed).
   */
  readonly adp?: Readonly<Record<string, number>>;
  /**
   * Optional external projections map keyed by player id. Overrides
   * `player.projectedPoints` when present.
   */
  readonly projections?: Readonly<Record<string, number>>;
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

export type PlayerTier = "elite" | "starter" | "flex" | "replaceable";

export interface DraftRecommendation {
  readonly player: string;
  readonly projectedPoints: number;
  readonly tier: PlayerTier;
  readonly reasoning: string;
  /** Full scored shortlist, best-first (exposed for tests and UIs). */
  readonly scored: readonly ScoredCandidate[];
}

export interface ScoredCandidate {
  readonly id: string;
  readonly name: string;
  readonly position: string;
  readonly projectedPoints: number;
  readonly adp: number;
  readonly projectedValue: number;
  readonly scarcityPenalty: number;
  readonly rosterNeedBonus: number;
  readonly score: number;
  readonly tier: PlayerTier;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/** Standard starter-count assumption per position for scarcity math. */
const STARTERS_PER_POSITION: Readonly<Record<string, number>> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  DST: 1,
};

/** How much of the points gap to the next starter counts as scarcity. */
const SCARCITY_WEIGHT = 0.5;

/** Points awarded for filling an empty starter slot. */
const NEED_BONUS = 12;

/** Points awarded for a flex-eligible hole when the position is already filled. */
const FLEX_NEED_BONUS = 4;

const FLEX_ELIGIBLE: ReadonlySet<string> = new Set(["RB", "WR", "TE"]);

/**
 * Resolve the effective projection/ADP, preferring the external maps
 * (the "projections"/"adp" inputs) over the inline player fields.
 */
function resolveProjection(player: DraftPlayer, projections?: Readonly<Record<string, number>>): number {
  const external = projections?.[player.id];
  return typeof external === "number" && Number.isFinite(external)
    ? external
    : player.projectedPoints;
}

function resolveAdp(player: DraftPlayer, adp?: Readonly<Record<string, number>>): number {
  const external = adp?.[player.id];
  return typeof external === "number" && Number.isFinite(external) ? external : player.adp;
}

/**
 * Positional scarcity penalty: the weighted points gap between this player
 * and the next realistic starter at the same position still available.
 * A deep board (lots of similar players left) yields a large penalty; a
 * cliff after this player yields a small one. Zero when he is the last
 * realistic starter at the position.
 */
export function scarcityPenaltyFor(
  player: DraftPlayer,
  pool: readonly DraftPlayer[],
  projectedPoints: number,
): number {
  const samePosition = pool
    .filter((p) => p.available && p.position === player.position && p.id !== player.id)
    .map((p) => resolveProjection(p, undefined))
    .sort((a, b) => b - a);

  const starters = STARTERS_PER_POSITION[player.position] ?? 1;
  // The player occupies one starter slot; the cliff is after `starters - 1`
  // more same-position players. Index `starters - 1` is the next guy past
  // the starter group; if nobody is left there the penalty is 0.
  const cliffIndex = Math.max(0, starters - 1);
  const nextPastStarters = samePosition[cliffIndex];
  if (nextPastStarters === undefined) return 0;
  return Math.max(0, (projectedPoints - nextPastStarters) * SCARCITY_WEIGHT);
}

/**
 * Roster-need bonus: full bonus when the position has no starter yet,
 * a smaller flex bonus when the position is covered but a FLEX hole
 * remains plausible, zero when the roster already fills the position.
 */
export function rosterNeedBonusFor(
  position: string,
  rosterSoFar: readonly string[],
): number {
  const already = rosterSoFar.filter((p) => p === position).length;
  const starters = STARTERS_PER_POSITION[position] ?? 1;
  if (already < starters) return NEED_BONUS;
  if (FLEX_ELIGIBLE.has(position) && already < starters + 1) return FLEX_NEED_BONUS;
  return 0;
}

function tierFromPoints(projectedPoints: number, pool: readonly number[]): PlayerTier {
  if (pool.length <= 1) return "elite";
  const sorted = [...pool].sort((a, b) => a - b);
  let below = 0;
  let equal = 0;
  for (const v of sorted) {
    if (v < projectedPoints) below += 1;
    else if (v === projectedPoints) equal += 1;
  }
  const pct = ((below + 0.5 * equal) / sorted.length) * 100;
  if (pct >= 85) return "elite";
  if (pct >= 60) return "starter";
  if (pct >= 35) return "flex";
  return "replaceable";
}

/**
 * Score every available player:
 *   score = projectedValue - scarcityPenalty + rosterNeedBonus
 * Returns the shortlist sorted best-first.
 */
export function scoreCandidates(input: DraftCopilotInput): ScoredCandidate[] {
  const pool = input.availablePlayers.filter((p) => p.available);
  const pointsPool = pool.map((p) => resolveProjection(p, input.projections));

  return pool
    .map((p) => {
      const projectedPoints = resolveProjection(p, input.projections);
      const adp = resolveAdp(p, input.adp);
      const scarcityPenalty = scarcityPenaltyFor(p, pool, projectedPoints);
      const rosterNeedBonus = rosterNeedBonusFor(p.position, input.rosterSoFar);
      const score = projectedPoints - scarcityPenalty + rosterNeedBonus;
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        projectedPoints,
        adp,
        projectedValue: projectedPoints,
        scarcityPenalty,
        rosterNeedBonus,
        score,
        tier: tierFromPoints(projectedPoints, pointsPool),
      };
    })
    .sort((a, b) => b.score - a.score || a.adp - b.adp);
}

function buildReasoning(
  pick: ScoredCandidate,
  shortlist: readonly ScoredCandidate[],
  pickNumber: number,
): string {
  const leaders = shortlist.slice(0, 3).map((c) => c.name);
  const leaderList =
    leaders.length >= 2
      ? `${leaders.slice(0, -1).join(", ")} and ${leaders[leaders.length - 1]}`
      : leaders.join(", ");
  return [
    `Pick ${pickNumber}: ${pick.name} (${pick.position}) at ${pick.projectedPoints.toFixed(1)} projected points.`,
    `Score ${pick.score.toFixed(1)} = ${pick.projectedValue.toFixed(1)} value - ${pick.scarcityPenalty.toFixed(1)} scarcity + ${pick.rosterNeedBonus.toFixed(1)} need.`,
    `Leading candidates: ${leaderList}.`,
  ].join(" ");
}

// ─── API surface (handoff-suite contract) ────────────────────────────────────

export interface DraftCopilotApi {
  recommendPick(input: DraftCopilotInput): DraftRecommendation;
}

/**
 * Factory matching the ethandojo handoff suite (`DraftCopilotApi`).
 * Stateless — all inputs arrive per call.
 */
export function createDraftCopilot(): DraftCopilotApi {
  return {
    recommendPick(input: DraftCopilotInput): DraftRecommendation {
      const scored = scoreCandidates(input);
      const best = scored[0];
      if (best === undefined) {
        throw new Error("recommendPick: no available players");
      }
      return {
        player: best.name,
        projectedPoints: best.projectedPoints,
        tier: best.tier,
        reasoning: buildReasoning(best, scored, input.pickNumber),
        scored,
      };
    },
  };
}

/** Convenience wrapper used by tests and callers that do not need the API object. */
export function recommendPick(input: DraftCopilotInput): DraftRecommendation {
  return createDraftCopilot().recommendPick(input);
}
