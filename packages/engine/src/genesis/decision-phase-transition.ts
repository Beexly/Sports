/**
 * GENESIS LAYER — Decision Phase Transition (Invention 52).
 *
 * Some decisions change suddenly after a threshold: stash→starter, committee→bell-cow, decoy→full
 * role, cheap DFS value→fragile chalk, waiver watchlist→aggressive FAAB, dynasty hold→sell-high,
 * trade buy-low→falling knife. Edge often hides near these boundaries, where ∂ActionUtility/∂RoleState
 * spikes. This detects when a metric crosses a named decision boundary. Pure + deterministic.
 *
 * (Named distinctly from the Discovery layer's market phase-transition detector.)
 */

export interface DecisionPhaseThreshold {
  readonly at: number;
  readonly crossingLabel: string;
}

export interface DecisionPhaseInput {
  readonly metric: string;
  readonly previous: number;
  readonly current: number;
  readonly thresholds: readonly DecisionPhaseThreshold[];
}

export interface DecisionPhaseResult {
  readonly metric: string;
  readonly crossed: boolean;
  readonly direction: "up" | "down" | "none";
  readonly crossingLabel: string | null;
  readonly derivativeSpike: number; // magnitude of the move that crossed
  readonly note: string;
}

/** Standard decision boundaries for common fantasy metrics. */
export const STANDARD_PHASE_THRESHOLDS: Readonly<Record<string, readonly DecisionPhaseThreshold[]>> = {
  snap_share: [{ at: 0.42, crossingLabel: "committee" }, { at: 0.68, crossingLabel: "usable_starter" }, { at: 0.82, crossingLabel: "bell_cow" }],
  route_rate: [{ at: 0.55, crossingLabel: "volatile" }, { at: 0.78, crossingLabel: "usable" }, { at: 0.9, crossingLabel: "stable_role" }],
  dfs_ownership: [{ at: 0.08, crossingLabel: "leverage" }, { at: 0.28, crossingLabel: "chalk" }, { at: 0.45, crossingLabel: "duplication_trap" }],
  faab_cost: [{ at: 0.06, crossingLabel: "easy_add" }, { at: 0.32, crossingLabel: "opportunity_cost_danger" }],
};

/** Detect whether a metric crossed a named decision boundary between two readings. */
export function detectDecisionPhaseTransition(i: DecisionPhaseInput): DecisionPhaseResult {
  const lo = Math.min(i.previous, i.current);
  const hi = Math.max(i.previous, i.current);
  const direction = i.current > i.previous ? "up" : i.current < i.previous ? "down" : "none";
  const crossedAll = i.thresholds.filter((t) => t.at > lo && t.at <= hi);
  // A jump across several boundaries lands in the destination phase: the highest crossed on an
  // up-move, the lowest crossed on a down-move.
  const crossed = crossedAll.length === 0 ? null
    : direction === "down"
      ? crossedAll.reduce((a, b) => (b.at < a.at ? b : a))
      : crossedAll.reduce((a, b) => (b.at > a.at ? b : a));
  return {
    metric: i.metric,
    crossed: crossed !== null,
    direction: crossed ? direction : "none",
    crossingLabel: crossed?.crossingLabel ?? null,
    derivativeSpike: Number(Math.abs(i.current - i.previous).toFixed(4)),
    note: crossed
      ? `${i.metric} crossed into "${crossed.crossingLabel}" (${direction}) — near a decision boundary; ∂utility/∂role spikes here.`
      : `${i.metric} stayed within its phase — no boundary crossed.`,
  };
}

/** Convenience: detect a transition against the standard thresholds for a known metric. */
export function detectStandardPhaseTransition(metric: keyof typeof STANDARD_PHASE_THRESHOLDS | string, previous: number, current: number): DecisionPhaseResult {
  const thresholds = STANDARD_PHASE_THRESHOLDS[metric] ?? [];
  return detectDecisionPhaseTransition({ metric: String(metric), previous, current, thresholds });
}
