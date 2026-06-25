/**
 * GENESIS LAYER — Observer Mind Inversion (Invention 48).
 *
 * Most systems ask "what is the correct projection?" GSE asks "what projection does each observer
 * appear to be USING?" From a prop, a salary, a rank, an ownership %, or a trade value, infer the
 * role state the observer must believe — then name the policy it optimizes and the bias it carries.
 * It reverse-engineers the model underneath the number. Pure + deterministic.
 */

export type InversionObserver =
  | "sportsbook_prop" | "alt_line" | "dfs_salary" | "dfs_ownership" | "fantasy_projection"
  | "analyst_rank" | "roster_pct" | "start_pct" | "adp" | "trade_value" | "league_manager";

export interface ObserverSignal {
  readonly observer: InversionObserver;
  /** 0..1 observed value normalized to its surface (e.g. prop vs range, salary vs slate). */
  readonly normalizedValue: number;
  /** 0..1 role-implied reference/fair value at the same time. */
  readonly referenceValue: number;
  readonly dataQuality: number;
  /** Minutes since this surface last updated (staleness). */
  readonly staleAsOfMin?: number;
  /** 0..1 how name-driven this surface is (for the name-value bias read). */
  readonly nameValueWeight?: number;
}

export type ObserverBias = "underreacting" | "overreacting" | "name_value_anchored" | "stale" | "balanced";

export interface InvertedMind {
  readonly observer: InversionObserver;
  readonly impliedRoleState: number;
  readonly policyAssumption: string;
  readonly bias: ObserverBias;
  readonly observerLagMin: number | null;
  readonly confidence: number;
  readonly note: string;
}

const POLICY: Record<InversionObserver, string> = {
  sportsbook_prop: "prices expected statistical output to balance two-way action",
  alt_line: "anchors a distribution shape around the median line",
  dfs_salary: "prices expected points at salary-set time (can be stale)",
  dfs_ownership: "reflects crowd allocation, not role truth",
  fantasy_projection: "smooths toward season-long priors (conservative)",
  analyst_rank: "weights recent box score + name value",
  roster_pct: "tracks slow public adoption",
  start_pct: "tracks late manager confidence",
  adp: "reflects draft-room sentiment + structural bias",
  trade_value: "name-value + recent-results driven",
  league_manager: "individual bias (recency, panic, hoarding)",
};

/** Invert an observer's signal into the role-state belief and bias underneath it. */
export function invertObserverMind(s: ObserverSignal): InvertedMind {
  const gap = s.normalizedValue - s.referenceValue;
  const stale = (s.staleAsOfMin ?? 0) >= 90;
  const nameAnchored = (s.nameValueWeight ?? 0) >= 0.6 && Math.abs(gap) >= 0.1;
  const bias: ObserverBias =
    stale ? "stale" : nameAnchored ? "name_value_anchored" : gap <= -0.1 ? "underreacting" : gap >= 0.1 ? "overreacting" : "balanced";
  const confidence = Number((s.dataQuality * (stale ? 0.6 : 1)).toFixed(3));
  return {
    observer: s.observer,
    impliedRoleState: Number(Math.max(0, Math.min(1, s.normalizedValue)).toFixed(4)),
    policyAssumption: POLICY[s.observer],
    bias,
    observerLagMin: s.staleAsOfMin ?? null,
    confidence,
    note: `Implies role ${s.normalizedValue.toFixed(2)} vs fair ${s.referenceValue.toFixed(2)} → ${bias}. Policy: ${POLICY[s.observer]}.`,
  };
}
