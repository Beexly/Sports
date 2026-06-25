/**
 * GSE GALILEO — Role Shock Topology (Invention 5).
 *
 * Re-exports the tested role-state engine and adds the explicit role_delta_score (how far the
 * recent role has moved from the priced/projected role) and a SIBLING DIVERGENCE detector:
 * when receptions move but receiving yards do not (or vice versa), one sibling carries stale
 * role information. Pure; candidate generation only.
 */

export * from "../market-physics/role-state.js";
import type { PlayerRoleState } from "../market-physics/role-state.js";

/** Aggregate role delta across usage dimensions: |recent − projected|, plus contextual swings. */
export function roleDeltaScore(s: PlayerRoleState): number {
  const snap = Math.abs(s.recentSnapShare - s.projectedSnapShare);
  const ctx = 0.25 * Math.min(1, Math.abs(s.spreadShift) / 7) + 0.25 * s.olInjuryContext + 0.25 * (s.teammateWr1Out ? 1 : 0);
  return Math.min(1, 0.5 * snap + ctx);
}

export interface SiblingMove {
  /** Normalized move 0..1 for each sibling market over the same window. */
  readonly receptionsMove: number;
  readonly receivingYardsMove: number;
}

export type SiblingDivergenceVerdict =
  | "coherent"
  | "receptions_lead_yards_stale"
  | "yards_lead_receptions_stale"
  | "both_stale";

/**
 * Detect sibling divergence between a player's receptions and receiving-yards markets. If one
 * moved materially and the other did not, the stale sibling likely holds outdated role info.
 */
export function siblingDivergence(move: SiblingMove, threshold = 0.15): {
  verdict: SiblingDivergenceVerdict;
  staleSibling: "receptions" | "receiving_yards" | null;
} {
  const recMoved = move.receptionsMove >= threshold;
  const ydsMoved = move.receivingYardsMove >= threshold;
  if (recMoved && !ydsMoved) return { verdict: "receptions_lead_yards_stale", staleSibling: "receiving_yards" };
  if (!recMoved && ydsMoved) return { verdict: "yards_lead_receptions_stale", staleSibling: "receptions" };
  if (!recMoved && !ydsMoved) return { verdict: "both_stale", staleSibling: null };
  return { verdict: "coherent", staleSibling: null };
}
