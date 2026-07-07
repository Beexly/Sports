/**
 * Consensus Rankings — aggregates multiple ranked sources into one board.
 *
 * FantasyPros' documented Expert Consensus Rankings (ECR) sum "Rank Points"
 * across every tracked expert EQUALLY — their own accuracy grading (a real,
 * well-designed system; see expert-accuracy.ts) never touches that weighting.
 * A mediocre source counts the same as their best.
 *
 * GSE's version makes accuracy-weighting the DEFAULT: when historical grades
 * are available, each source's Rank-Points contribution is scaled by its
 * accuracyWeights() share — so a source with a track record of being right
 * simply counts for more. Falls back to equal weight (flagged in the output,
 * never silent) when no grading history exists yet.
 *
 * The point scale (Rank-Points = own-list-length − rank + 1) is GSE's own
 * standard Borda scheme, NOT a claim to replicate FantasyPros' undisclosed
 * exact formula — their FAQ describes the rank-points CONCEPT ("the better
 * the rank, the higher the points... we add these up across experts") but not
 * the literal point scale, which is proprietary.
 *
 * Pure. Illustrative by default.
 */

import { POSITIONS, type Pos } from "./players";
import { accuracyWeights, type SourceGrade, type SourceRanking } from "./expert-accuracy";

export type RankSource = {
  readonly name: string;
  readonly ranks: SourceRanking; // playerId -> rank, 1 = that source's top pick
};

/** Rank-Points a source awards its rank-N pick: own list length − N + 1 (min 1).
 *  Self-consistent per source — a source's point BUDGET never depends on how
 *  many players OTHER sources chose to rank. */
function pointsForRank(rank: number, sourceListLength: number): number {
  return Math.max(1, sourceListLength - rank + 1);
}

export type ConsensusRow = {
  readonly playerId: string;
  readonly points: number;
  readonly rank: number; // 1-indexed position within this consensus board
  readonly best: number; // most favorable source rank
  readonly worst: number; // least favorable source rank
  readonly sourcesCounted: number;
  /** Points-weighted average implied rank across sources that ranked this player. */
  readonly avgRank: number;
};

export type ConsensusBoard = {
  readonly pos: Pos;
  readonly mode: "equal" | "accuracy-weighted";
  readonly rows: readonly ConsensusRow[];
  /** The weight actually applied per source (sums to 1; equal mode = 1/N each). */
  readonly weights: ReadonlyMap<string, number>;
};

function listLength(ranks: SourceRanking): number {
  let max = 0;
  for (const r of ranks.values()) if (r > max) max = r;
  return Math.max(max, ranks.size);
}

/** Build one position's consensus board from a set of sources and per-source weights. */
function buildBoard(pos: Pos, sources: readonly RankSource[], weights: ReadonlyMap<string, number>, mode: ConsensusBoard["mode"]): ConsensusBoard {
  const points = new Map<string, number>();
  const ranksSeen = new Map<string, number[]>();

  for (const src of sources) {
    const w = weights.get(src.name) ?? 0;
    const n = listLength(src.ranks);
    for (const [playerId, rank] of src.ranks) {
      const pts = pointsForRank(rank, n) * w;
      points.set(playerId, (points.get(playerId) ?? 0) + pts);
      const arr = ranksSeen.get(playerId) ?? [];
      arr.push(rank);
      ranksSeen.set(playerId, arr);
    }
  }

  const rows: ConsensusRow[] = [...points.entries()]
    .map(([playerId, pts]) => {
      const ranks = ranksSeen.get(playerId)!;
      const weightedAvg = ranks.reduce((s, r) => s + r, 0) / ranks.length;
      return {
        playerId,
        points: round1(pts),
        rank: 0, // filled after sort
        best: Math.min(...ranks),
        worst: Math.max(...ranks),
        sourcesCounted: ranks.length,
        avgRank: round1(weightedAvg),
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return { pos, mode, rows, weights };
}

export type ConsensusOpts = {
  /** Historical grades (from expert-accuracy.ts) to drive accuracy weighting.
   *  When omitted, falls back to equal weight — the return's `mode` always says
   *  which happened, so callers never silently get a different behaviour. */
  readonly grades?: ReadonlyArray<{ readonly source: string; readonly overall: number }>;
};

/** Equal-weight consensus — the FantasyPros-documented default, for comparison. */
export function equalWeightConsensus(pos: Pos, sources: readonly RankSource[]): ConsensusBoard {
  const w = 1 / Math.max(1, sources.length);
  const weights = new Map(sources.map((s) => [s.name, w]));
  return buildBoard(pos, sources, weights, "equal");
}

/** Accuracy-weighted consensus — GSE's default when grading history exists. */
export function accuracyWeightedConsensus(pos: Pos, sources: readonly RankSource[], grades: ReadonlyArray<{ readonly source: string; readonly overall: number }>): ConsensusBoard {
  const weights = accuracyWeights(grades);
  return buildBoard(pos, sources, weights, "accuracy-weighted");
}

/**
 * The single entry point: accuracy-weighted BY DEFAULT when grades are
 * supplied, equal-weight fallback otherwise (flagged, never silent).
 */
export function consensusRank(pos: Pos, sources: readonly RankSource[], opts: ConsensusOpts = {}): ConsensusBoard {
  if (opts.grades && opts.grades.length) return accuracyWeightedConsensus(pos, sources, opts.grades);
  return equalWeightConsensus(pos, sources);
}

/** All four skill positions in one call — same default-weighting behaviour per position. */
export function consensusBoard(
  sourcesByPos: ReadonlyMap<Pos, readonly RankSource[]>,
  gradesByPos?: ReadonlyMap<Pos, ReadonlyArray<{ readonly source: string; readonly overall: number }>>,
): ReadonlyMap<Pos, ConsensusBoard> {
  const out = new Map<Pos, ConsensusBoard>();
  for (const pos of POSITIONS) {
    const sources = sourcesByPos.get(pos) ?? [];
    out.set(pos, consensusRank(pos, sources, { grades: gradesByPos?.get(pos) }));
  }
  return out;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export type { SourceGrade };
