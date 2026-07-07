/**
 * Expert Accuracy — grades any ranked source (a real analyst, a syndicated
 * consensus, or one of GSE's own model variants) against realized outcomes.
 *
 * The method: convert a source's PRESEASON RANK for a player into an implied
 * point projection using the rank-slot's own realized production curve for
 * that pool, then score the source by how far its implied projections were
 * from what actually happened (the "Accuracy Gap"). This mirrors the
 * position-relevance-weighted grading methodology FantasyPros publishes for
 * their Expert Accuracy contest — real, well-designed, and worth reusing.
 *
 * TWO DELIBERATE DIVERGENCES from the FantasyPros-documented method, both
 * closing gaps their own FAQ describes:
 *
 *   1. UNRANKED-PLAYER PENALTY. FantasyPros only penalises a source for a
 *      player it failed to rank when that source's implied error is WORSE
 *      than the field average, and even then caps the penalty at the
 *      difference — meaning a source can publish a SHORTER list and cap its
 *      downside exposure to deep busts for free. GSE closes that: an omitted
 *      player is charged the WORST implied rank in the pool, full stop. No
 *      averaging, no cap, no reward for a shorter list.
 *
 *   2. WHAT FEEDS THE CONSENSUS. FantasyPros computes this grading as a public
 *      SIDE REPORT that does not weight their default Expert Consensus
 *      Rankings (an unweighted Borda sum — see consensus-rankings.ts). GSE
 *      makes accuracy-weighting the DEFAULT, not an opt-in filter a user has
 *      to discover.
 *
 * Pure. Illustrative by default — grades run against the illustrative
 * PLAYERS/outcome data until a live historical-outcomes feed is wired in.
 */

import { POSITIONS, type Pos } from "./players";

/** A source's preseason ranking: 1 = their top pick at the position. */
export type SourceRanking = ReadonlyMap<string, number>; // playerId -> rank

export type PositionOutcome = {
  readonly playerId: string;
  readonly pos: Pos;
  /** Realized fantasy points for the graded window (season, week, etc.). */
  readonly actualPoints: number;
};

export type GradedSource = {
  readonly name: string;
  readonly ranks: SourceRanking;
};

// ── position-relevance weighting (adapted from FantasyPros' documented 2021 addition) ──
// A linear taper from Maxm=1.0 (at/above Maxrank) to Minm=0.5 (at/below Minrank).
// The four named inputs are FantasyPros' own disclosed design; the interpolation
// between them is the standard/obvious linear form implied by "scales down
// gradually" — this is GSE's own reconstruction, not a claim to their exact
// undisclosed formula image.
const RELEVANCE_BAND: Record<Pos, { maxRank: number; minRank: number }> = {
  QB: { maxRank: 12, minRank: 24 },
  RB: { maxRank: 30, minRank: 48 },
  WR: { maxRank: 36, minRank: 60 },
  TE: { maxRank: 12, minRank: 24 },
};
const MAX_MULT = 1.0;
const MIN_MULT = 0.5;

export function relevanceMultiplier(pos: Pos, ecrRank: number): number {
  const { maxRank, minRank } = RELEVANCE_BAND[pos];
  if (ecrRank <= maxRank) return MAX_MULT;
  if (ecrRank >= minRank) return MIN_MULT;
  const t = (ecrRank - maxRank) / (minRank - maxRank);
  return MAX_MULT + t * (MIN_MULT - MAX_MULT);
}

/**
 * The rank-slot production curve: sort the pool's ACTUAL outcomes best to
 * worst, so "whoever finished at rank slot N" defines the projected value a
 * rank-N pick implied. This is the current-window realized curve rather than
 * a trailing multi-year average (FantasyPros smooths over 3 years to dampen
 * outlier seasons) — a deliberate simplification for a from-scratch engine,
 * called out explicitly rather than left implicit.
 */
function rankSlotCurve(pos: Pos, outcomes: readonly PositionOutcome[]): number[] {
  return outcomes
    .filter((o) => o.pos === pos)
    .map((o) => o.actualPoints)
    .sort((a, b) => b - a);
}

export type SourceGrade = {
  readonly source: string;
  readonly pos: Pos;
  /** Sum of position-relevance-weighted Accuracy Gaps (lower = better). */
  readonly weightedGap: number;
  readonly playersGraded: number;
  readonly omitted: number;
};

/**
 * Grade one source at one position. `ecrRanks` is the position's Expert
 * Consensus rank for each player (used only for the relevance multiplier,
 * exactly as FantasyPros' documented step 4 does) — pass the source's own
 * ranks again if no separate consensus is available.
 */
export function gradeSource(
  source: GradedSource,
  pos: Pos,
  outcomes: readonly PositionOutcome[],
  ecrRanks: SourceRanking = source.ranks,
): SourceGrade {
  const curve = rankSlotCurve(pos, outcomes);
  const posOutcomes = outcomes.filter((o) => o.pos === pos);
  const worstImplied = curve.length ? curve[curve.length - 1]! : 0;

  let weightedGap = 0;
  let graded = 0;
  let omitted = 0;

  for (const o of posOutcomes) {
    const rank = source.ranks.get(o.playerId);
    const ecrRank = ecrRanks.get(o.playerId) ?? rank ?? curve.length + 1;
    const mult = relevanceMultiplier(pos, ecrRank);

    let implied: number;
    if (rank !== undefined) {
      const idx = Math.min(Math.max(rank, 1), curve.length) - 1;
      implied = curve[idx] ?? worstImplied;
      graded++;
    } else {
      // GSE's fix: omitted players are charged the worst implied value in the
      // pool — deterministic, uncapped, no reward for a shorter list.
      implied = worstImplied;
      omitted++;
    }

    weightedGap += mult * Math.abs(implied - o.actualPoints);
  }

  return { source: source.name, pos, weightedGap: round1(weightedGap), playersGraded: graded, omitted };
}

/** Grade a source across all positions and return the QB+RB+WR+TE overall
 *  (FantasyPros' own documented choice to exclude K/DST from Overall — "much
 *  more luck" — is sound and reused as-is here). */
export function gradeSourceOverall(
  source: GradedSource,
  outcomes: readonly PositionOutcome[],
  ecrRanks: SourceRanking = source.ranks,
): { readonly overall: number; readonly byPosition: readonly SourceGrade[] } {
  const byPosition = POSITIONS.map((pos) => gradeSource(source, pos, outcomes, ecrRanks));
  const overall = round1(byPosition.reduce((s, g) => s + g.weightedGap, 0));
  return { overall, byPosition };
}

/**
 * Convert a panel of sources' overall gaps into GLASS-BOX consensus weights:
 * linear-normalized inverse-gap, so the reasoning is inspectable (unlike a
 * softmax black box) — a more accurate source gets a proportionally larger
 * say, a source at the worst-gap in the panel gets ~0.
 */
export function accuracyWeights(grades: ReadonlyArray<{ readonly source: string; readonly overall: number }>): Map<string, number> {
  if (!grades.length) return new Map();
  const worst = Math.max(...grades.map((g) => g.overall));
  const raw = grades.map((g) => ({ name: g.source, w: worst > 0 ? Math.max(0, 1 - g.overall / worst) : 1 }));
  const total = raw.reduce((s, r) => s + r.w, 0);
  if (total <= 0) {
    // Degenerate case (every source equally bad, or a single source): equal weight.
    const equal = 1 / grades.length;
    return new Map(grades.map((g) => [g.source, equal]));
  }
  return new Map(raw.map((r) => [r.name, r.w / total]));
}

const round1 = (x: number) => Math.round(x * 10) / 10;
