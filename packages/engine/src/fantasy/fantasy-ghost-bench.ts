/**
 * FANTASY DISCOVERY LAYER — Fantasy Ghost Bench (Invention F16/F37).
 *
 * The graveyard of failed fantasy theories should TEACH. Every blown recommendation leaves a ghost
 * pattern: the two-TD-no-role spike, the empty-air-yards mirage, the preseason camp-hype trap, the
 * over-credited backup, coach-speak fraud, a one-week usage blip, garbage-time production, injury
 * panic, a DFS chalk collapse, an ownership-leverage mirage. New candidates that resemble a buried
 * ghost are penalized — the machine refuses to re-buy the same trap. Pure + deterministic.
 */

import type { FantasyPosition } from "./fantasy-role-state-vector.js";

export type FantasyGhostKind =
  | "td_spike_trap" | "empty_route_trap" | "preseason_hype_trap" | "backup_mirage"
  | "coach_speak_fraud" | "one_week_usage_trap" | "garbage_time_production" | "injury_panic"
  | "dfs_chalk_collapse" | "ownership_leverage_mirage";

export interface FantasyCandidateShape {
  readonly position: FantasyPosition;
  readonly kind: FantasyGhostKind;
  /** Coarse trigger descriptor, e.g. "two_td_no_role", "camp_hype", "stale_salary". */
  readonly trigger: string;
}

export interface FantasyGhost {
  readonly id: string;
  readonly shape: FantasyCandidateShape;
  readonly severity: number;      // 0..1 how badly it burned
  readonly recencyWeight: number; // 0..1 recent traps weigh more
}

const sig = (s: FantasyCandidateShape): string => `${s.position}|${s.kind}|${s.trigger.toLowerCase().trim()}`;

/** Structural similarity between two candidate shapes (0..1) over [position, kind, trigger]. */
export function fantasyGhostSimilarity(a: FantasyCandidateShape, b: FantasyCandidateShape): number {
  const pa = sig(a).split("|"), pb = sig(b).split("|");
  let match = 0;
  for (let i = 0; i < 3; i++) if (pa[i] === pb[i]) match += 1;
  return match / 3;
}

/** Penalty a new candidate inherits from resembling a specific ghost. */
export function fantasyGhostPenalty(candidate: FantasyCandidateShape, ghost: FantasyGhost): number {
  return fantasyGhostSimilarity(candidate, ghost.shape) * ghost.severity * ghost.recencyWeight;
}

export interface FantasyGhostAssessment {
  readonly maxPenalty: number;
  readonly worstGhost: string | null;
  readonly suppressed: boolean;
  readonly note: string;
}

/** Assess a candidate against the whole fantasy ghost bench. */
export function assessFantasyGhosts(candidate: FantasyCandidateShape, ghosts: readonly FantasyGhost[], suppressThreshold = 0.5): FantasyGhostAssessment {
  let maxPenalty = 0, worst: string | null = null;
  for (const g of ghosts) {
    const p = fantasyGhostPenalty(candidate, g);
    if (p > maxPenalty) { maxPenalty = p; worst = g.id; }
  }
  return {
    maxPenalty: Number(maxPenalty.toFixed(3)),
    worstGhost: worst,
    suppressed: maxPenalty >= suppressThreshold,
    note: maxPenalty >= suppressThreshold
      ? `Strongly resembles a buried fantasy trap (${worst}) — requires NEW evidence defeating that failure mode.`
      : "No disqualifying resemblance to a known fantasy ghost.",
  };
}
