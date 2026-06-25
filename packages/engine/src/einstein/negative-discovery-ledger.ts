/**
 * EINSTEIN LAYER — Negative Discovery Ledger (Invention 20).
 *
 * Most systems only remember wins. GSE remembers the GRAVEYARD: every hypothesis that looked
 * good and died — friction-killed, future-contaminated, CLV-only, one-season-only, settlement-
 * negative, no-denominator, low-liquidity, false-causal-parent, public-overreaction, duplicate-
 * echo. Every failed hypothesis improves the immune system: the engine can say "we already tested
 * this shape; it died under denominator expansion" instead of rediscovering the same fake edge.
 *
 * Pure + deterministic. Persistence is the caller's concern; this types the record and matches a
 * new candidate's structural SIGNATURE against the graveyard.
 */

export type FailureReason =
  | "friction_killed"
  | "future_contamination"
  | "data_quality"
  | "one_season_only"
  | "clv_only"
  | "in_sample_only"
  | "no_denominator"
  | "settlement_negative"
  | "low_liquidity"
  | "false_causal_parent"
  | "public_overreaction"
  | "duplicate_echo";

export interface CandidateShape {
  /** Market family, e.g. "player_rush_yds". */
  readonly marketFamily: string;
  readonly side?: "OVER" | "UNDER" | "HOME" | "AWAY";
  /** A coarse structural descriptor, e.g. "high_line", "stale_book", "alt_tail". */
  readonly structure: string;
  /** Optional regime label the shape was observed in. */
  readonly regime?: string;
}

export interface DeadEdge {
  readonly id: string;
  readonly signature: string;
  readonly hypothesis: string;
  readonly shape: CandidateShape;
  readonly failureReason: FailureReason;
  readonly note: string;
  /** ISO timestamp the caller stamps (this module never reads a clock). */
  readonly recordedAt: string;
}

/** Stable structural signature for matching new candidates against the graveyard. */
export function edgeSignature(shape: CandidateShape): string {
  return [shape.marketFamily, shape.side ?? "_", shape.structure, shape.regime ?? "_"]
    .map((s) => s.toLowerCase().trim())
    .join("|");
}

export function recordDeadEdge(args: {
  id: string;
  hypothesis: string;
  shape: CandidateShape;
  failureReason: FailureReason;
  note: string;
  recordedAt: string;
}): DeadEdge {
  return { ...args, signature: edgeSignature(args.shape) };
}

export interface GraveyardMatch {
  readonly matched: boolean;
  readonly deadEdge: DeadEdge | null;
  readonly suppressionNote: string | null;
}

/**
 * Is a new candidate a repeat of a known dead edge? If its signature matches a graveyard entry,
 * it is suppressed (capped at WATCHLIST at best) unless it carries NEW evidence that defeats the
 * recorded failure reason. The immune system calls this before promotion.
 */
export function checkGraveyard(shape: CandidateShape, graveyard: readonly DeadEdge[]): GraveyardMatch {
  const sig = edgeSignature(shape);
  const dead = graveyard.find((d) => d.signature === sig);
  if (!dead) return { matched: false, deadEdge: null, suppressionNote: null };
  return {
    matched: true,
    deadEdge: dead,
    suppressionNote: `Shape already tested and died (${dead.failureReason}): ${dead.note}. Requires NEW evidence defeating that failure before re-promotion.`,
  };
}
