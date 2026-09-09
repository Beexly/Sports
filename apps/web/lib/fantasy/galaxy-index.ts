/**
 * The Galaxy Index — one readable number per player, blended from every signal
 * we are actually allowed to use.
 *
 * C-212 recorded the gap this closes: `compositeScore` (the weighted-signal
 * matrix in @sports/prediction-engine, built precisely to blend hard metrics
 * with soft ones under a confidence valve and a freshness half-life) had ZERO
 * consumers anywhere in lib/fantasy. Every fantasy surface ranked on a single
 * raw projection, which is the one thing every competitor also has. The index
 * is what makes a ranking OURS: production, usage, the shape of the volatility
 * band, team environment, trend and availability, each weighted, each aged,
 * each attributable.
 *
 * ------------------------------------------------------------------------
 * WHAT IT IS NOT
 * ------------------------------------------------------------------------
 * Not a projection, and it must never be presented as one. A projection
 * predicts points; the index scores how well-supported that projection is once
 * everything else we know is folded in. Two players with the same projection
 * get different indices, and that difference is the product.
 *
 * ------------------------------------------------------------------------
 * THE THREE HONESTY CONSTRAINTS, ALL LOAD-BEARING
 * ------------------------------------------------------------------------
 * 1. `injuryDisplay` IS NEVER READ HERE, and this is a rights boundary, not a
 *    style choice. players.ts states it: the Sleeper-joined live injury flag is
 *    display-only under the `sleeper-api` posture (commercial_display_allowed
 *    false, enrichment only, never the value basis), so it may light a UI badge
 *    and must never move a paid number. The index IS a paid number. It reads
 *    `injury`, which is "healthy" on every live graded row by construction, and
 *    a real authored input only on the illustrative pool. A test asserts the
 *    field never appears in this file, because the failure mode is somebody
 *    later reaching for the more informative field without knowing why the
 *    less informative one is there.
 *
 * 2. Freshness is REAL, not decorative. `ageDays` flows into compositeScore's
 *    exponential half-life, so a Week 1 index built on last season's production
 *    is explicitly a decayed reading rather than a current one. This is the
 *    honest answer to "you have no 2026 games yet": prior-season production is
 *    the correct basis for a Week 1 projection AND it is older evidence, and
 *    both halves are represented rather than one being asserted over the other.
 *    Pair it with evaluateProjectionBasis (projection-basis.ts), which decides
 *    whether a basis is admissible at all.
 *
 * 3. Soft signals get a confidence valve. `trend` is camp chatter and beat
 *    reporting reduced to a direction - it belongs in the blend, and it does
 *    NOT get to vote like a settled usage share. Its confidence is 0.35 and its
 *    weight is the smallest here. compositeScore's own docstring names this
 *    valve "what keeps a rumor from voting like a fact"; this is the caller
 *    that uses it as intended.
 *
 * Pure and db-free. No fabrication: a signal we do not have is OMITTED, never
 * defaulted to a flattering value.
 */

import { compositeScore, type WeightedSignal } from "@sports/prediction-engine";
import type { Player, Pos } from "./players";

/**
 * Base weights. Ordered by how much each signal has to say about a player's
 * value, not by how easy it is to obtain.
 *
 * Deliberately NOT normalized to sum to 1: compositeScore divides by the total
 * effective weight itself, so these are relative importances and a signal that
 * drops out (no data) redistributes the rest rather than dragging the blend
 * toward zero.
 */
export const GALAXY_WEIGHTS = {
  /** Season projection as a within-position z-score. The spine. */
  production: 1.0,
  /** Snap / target / carry share. Opportunity is the most repeatable input. */
  usage: 0.7,
  /** Ceiling headroom over the projection - the tournament signal. */
  upside: 0.45,
  /** How far the floor sits below the projection - the cash-game signal. */
  floorSafety: 0.35,
  /** Team offensive environment (neutral-script EPA percentile). */
  schemeFit: 0.3,
  /** Availability. Strongly negative when unavailable; see AVAILABILITY_VALUE. */
  availability: 0.5,
  /** Camp chatter and beat reporting, reduced to a direction. Smallest on purpose. */
  trend: 0.15,
} as const;

/**
 * Confidence per signal (0..1) — reliability, independent of importance.
 * A settled share is near 1; a team-level proxy standing in for a player is
 * mid; a reported direction is low.
 */
export const GALAXY_CONFIDENCE = {
  production: 1.0,
  usage: 0.9,
  upside: 0.8,
  floorSafety: 0.8,
  /** A TEAM environment number standing in for an individual player. */
  schemeFit: 0.7,
  availability: 1.0,
  /** The rumor valve. */
  trend: 0.35,
} as const;

/**
 * Availability readings. "out" is strongly negative rather than
 * disqualifying: the index scores QUALITY, and dropping an unavailable player
 * from a slate is the caller's decision (lineup.ts and the DFS excludes
 * already do it). Encoding the exclusion here would hide it inside a number.
 */
const AVAILABILITY_VALUE: Record<Player["injury"], number> = {
  healthy: 0,
  questionable: -1.1,
  out: -6,
};

const TREND_VALUE: Record<Player["trend"], number> = { up: 1, flat: 0, down: -1 };

/** The neutral team-environment reading graded-pool.ts falls back to. */
const NEUTRAL_SCHEME_FIT = 0.6;

/**
 * Affine map from the blended composite to a 0..100 index.
 *
 * FIXED, not a within-pool percentile. A percentile would make a player's index
 * move when an unrelated player is added to the pool, which makes the number
 * unquotable and untestable. 50 is league-average on every signal; each 20
 * points is one standard deviation of the blend. Clamped, so an extreme input
 * saturates rather than escaping the scale.
 */
export const INDEX_CENTER = 50;
export const INDEX_PER_SD = 20;

/**
 * Freshness half-life for the BASIS signals, in days.
 *
 * compositeScore defaults to 14 days, which is correct for what it was built
 * for - in-season news, where a two-week-old practice report really has lost
 * half its meaning. It is catastrophically wrong here, and the test that found
 * it is worth keeping in mind: a Week 1 index on a prior-season basis is about
 * 240 days old, and at a 14-day half-life that is 0.5^(240/14) = 6.9e-6, which
 * zeroes every production, usage, upside, floorSafety and schemeFit signal.
 *
 * CORRECTED (C-236): an earlier version of this comment said that "returns
 * EXACTLY 50 for every player in the league", and that is not what happens.
 * Availability and trend are pushed with ageDays 0 (see the push calls below),
 * so they keep their full weight at any half-life, and the ranking collapses to
 * the handful of values those two can express - measured on the real pool:
 * 30.1, 32, 48.1, 50, 51.9, with 22 of 30 players NOT at 50. Only a healthy,
 * flat-trend player lands exactly on 50, which is why the pinned test fixture
 * does. The defect is real and the fix is unchanged; the sentence describing it
 * was wrong. A ranking that cannot separate anyone ON PRODUCTION OR USAGE is
 * not a conservative ranking, it is a broken one.
 *
 * 240 days is one offseason, so the statement this encodes is: a full offseason
 * halves the weight of a season's production. That is a real position and it is
 * the one the product should defend - last season is genuinely informative
 * about this season and genuinely less informative than this season would be.
 * Callers with a shorter-lived signal pass their own halfLifeDays.
 */
export const GALAXY_HALF_LIFE_DAYS = 240;

export interface GalaxyDriver {
  readonly key: string;
  /** Signed push on the blend. Sorted by magnitude - the narration order. */
  readonly contribution: number;
  /** Share of total effective weight, after confidence and freshness. */
  readonly weightShare: number;
}

export interface GalaxyIndexResult {
  /** 0..100. The number a surface shows. */
  readonly index: number;
  /** The raw blended composite, before the affine map. Kept for auditability. */
  readonly composite: number;
  /** How many signals actually contributed. Fewer means a thinner read. */
  readonly signalsUsed: number;
  /** Total effective weight - the honest measure of how much evidence is behind the index. */
  readonly evidenceWeight: number;
  /** Strongest first. This is the "why", and it is the point of the product. */
  readonly drivers: readonly GalaxyDriver[];
}

export interface GalaxyIndexOptions {
  /**
   * Age of the production/usage basis in days. Week 1 on a prior-season basis
   * is genuinely old evidence and says so. 0 = measured this week.
   */
  readonly basisAgeDays?: number;
  /** Freshness half-life. Defaults to compositeScore's own 14 days. */
  readonly halfLifeDays?: number;
}

/** Within-position centering stats. Computed over the pool, not assumed. */
export interface PositionStats {
  readonly mean: number;
  readonly stdDev: number;
}

function zScore(value: number, stats: PositionStats | undefined): number | null {
  // No stats, or a position where every player projects identically: there is
  // no relative reading to give, so the signal is OMITTED rather than reported
  // as an average one. A fabricated 0 would say "exactly league average",
  // which is a claim, not an absence.
  if (!stats || !Number.isFinite(stats.stdDev) || stats.stdDev <= 0) return null;
  if (!Number.isFinite(value) || !Number.isFinite(stats.mean)) return null;
  return (value - stats.mean) / stats.stdDev;
}

/**
 * Within-position mean and population standard deviation of season projection.
 * Population, not sample: this is the whole pool being ranked, not a draw from
 * a larger one.
 */
export function positionStats(players: readonly Player[]): ReadonlyMap<Pos, PositionStats> {
  const byPos = new Map<Pos, number[]>();
  for (const p of players) {
    if (!Number.isFinite(p.proj)) continue;
    const bucket = byPos.get(p.pos);
    if (bucket) bucket.push(p.proj);
    else byPos.set(p.pos, [p.proj]);
  }
  const out = new Map<Pos, PositionStats>();
  for (const [pos, values] of byPos) {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    out.set(pos, { mean, stdDev: Math.sqrt(variance) });
  }
  return out;
}

/**
 * Build the signal set for one player. Exported because the signals ARE the
 * explanation: a surface that wants to show the factor trail reads these
 * rather than re-deriving them and drifting from the score.
 */
export function galaxySignals(
  player: Player,
  stats: ReadonlyMap<Pos, PositionStats>,
  opts: GalaxyIndexOptions = {},
): readonly WeightedSignal[] {
  const ageDays = Math.max(0, opts.basisAgeDays ?? 0);
  const signals: WeightedSignal[] = [];

  const push = (key: keyof typeof GALAXY_WEIGHTS, value: number | null, age = ageDays): void => {
    if (value === null || !Number.isFinite(value)) return;
    signals.push({
      key,
      value,
      weight: GALAXY_WEIGHTS[key],
      confidence: GALAXY_CONFIDENCE[key],
      ageDays: age,
    });
  };

  push("production", zScore(player.proj, stats.get(player.pos)));

  // Usage is already a 0..1 share, so it is centered on an even split of the
  // available work rather than z-scored against the pool - a 78% share is a
  // strong reading on its own terms and does not need a peer group to say so.
  if (Number.isFinite(player.usage)) push("usage", (player.usage - 0.5) * 2.4);

  // The volatility band, read as TWO independent signals because they are two
  // different questions. A player can carry a high ceiling and a collapsing
  // floor at the same time, and a single "band width" number cannot say that.
  // Both are normalized by the projection so they compare across positions.
  if (player.proj > 0) {
    if (Number.isFinite(player.ceiling)) {
      push("upside", ((player.ceiling - player.proj) / player.proj - 0.25) * 4);
    }
    if (Number.isFinite(player.floor)) {
      // Inverted: a SMALL gap between projection and floor is safety, so a
      // shallower drop reads positive.
      push("floorSafety", (0.35 - (player.proj - player.floor) / player.proj) * 4);
    }
  }

  // Centered on the neutral value graded-pool.ts uses when a team has no
  // environment row, so an unknown environment reads as exactly neutral
  // instead of below average.
  if (Number.isFinite(player.schemeFit)) {
    push("schemeFit", (player.schemeFit - NEUTRAL_SCHEME_FIT) * 4);
  }

  // Availability and trend describe THIS WEEK, not the basis period, so they
  // are fresh regardless of how old the production basis is. Ageing them with
  // the basis would decay a status report for being about a season we have
  // not played yet.
  push("availability", AVAILABILITY_VALUE[player.injury] ?? null, 0);
  push("trend", TREND_VALUE[player.trend] ?? null, 0);

  return signals;
}

/**
 * The index for one player, against a pool's within-position statistics.
 */
export function galaxyIndex(
  player: Player,
  stats: ReadonlyMap<Pos, PositionStats>,
  opts: GalaxyIndexOptions = {},
): GalaxyIndexResult {
  const signals = galaxySignals(player, stats, opts);
  const blended = compositeScore(signals, {
    halfLifeDays: opts.halfLifeDays ?? GALAXY_HALF_LIFE_DAYS,
  });

  const raw = INDEX_CENTER + INDEX_PER_SD * blended.score;
  const index = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;

  return {
    index,
    composite: blended.score,
    signalsUsed: blended.signalsUsed,
    evidenceWeight: blended.totalWeight,
    drivers: blended.contributions.map((c) => ({
      key: c.key,
      contribution: c.contribution,
      weightShare: c.weightShare,
    })),
  };
}

/**
 * The index for a whole pool, keyed by player id. One pass for the position
 * statistics, then one index per player — so every player in the returned map
 * is centered against the SAME peer group. Computing them one at a time
 * against differently-shaped pools is the way to get two players' indices that
 * cannot be compared, which is the whole point of the number.
 */
export function galaxyIndexPool(
  players: readonly Player[],
  opts: GalaxyIndexOptions = {},
): ReadonlyMap<string, GalaxyIndexResult> {
  const stats = positionStats(players);
  const out = new Map<string, GalaxyIndexResult>();
  for (const p of players) out.set(p.id, galaxyIndex(p, stats, opts));
  return out;
}
