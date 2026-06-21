/**
 * The Agent War Room — the visible council that watches every signal.
 *
 * Instead of one opaque "AI", the engine is a council of specialist agents, each
 * with a job and an escalation threshold. When a recommendation changes, you can
 * see WHICH agent changed the state and WHY. This module defines the council and
 * one illustrative escalation cascade (explicitly illustrative — no real game,
 * no fabricated stats) that the surface plays back to show the system reasoning
 * in the open.
 */

export type WarVerdict = "PLAY" | "WATCHLIST" | "NO-BET";

export type AgentLevel = "calm" | "watching" | "elevated" | "alert";

export type WarAgent = {
  readonly key: string;
  readonly name: string;
  readonly role: string;
};

/** The specialist council. Each maps to a real signal class the engine reads. */
export const AGENTS: readonly WarAgent[] = [
  { key: "line", name: "Line Movement", role: "How the price moves vs. information" },
  { key: "sharp", name: "Sharp Pressure", role: "Money moving against the public" },
  { key: "public", name: "Public Bias", role: "Where the crowd is piling in" },
  { key: "injury", name: "Injury Freshness", role: "Roster status and how stale it is" },
  { key: "matchup", name: "Matchup", role: "The structural edge in the game" },
  { key: "disagree", name: "Model Disagreement", role: "When independent estimators split" },
  { key: "narrative", name: "Narrative Signal", role: "The story around the athletes" },
  { key: "responsible", name: "Responsible Decision", role: "Guards against over-exposure" },
];

export type AgentState = { readonly level: AgentLevel; readonly label: string };

/** Opening state for every agent before the cascade runs. */
export const DEFAULT_STATE: Record<string, AgentState> = {
  line: { level: "watching", label: "Drifting on info" },
  sharp: { level: "watching", label: "Aligned w/ thesis" },
  public: { level: "calm", label: "Light exposure" },
  injury: { level: "calm", label: "Confirmed" },
  matchup: { level: "watching", label: "Edge present" },
  disagree: { level: "calm", label: "In agreement" },
  narrative: { level: "calm", label: "Neutral" },
  responsible: { level: "calm", label: "Within limits" },
};

export type CascadeStep = {
  readonly title: string;
  readonly verdict: WarVerdict;
  /** The agent that drove this step's change (highlighted), if any. */
  readonly changed?: string;
  readonly narration: string;
  /** Cumulative-merged state changes applied at this step. */
  readonly overrides: Record<string, AgentState>;
};

/**
 * One illustrative cascade: a real-money-style read that opens at PLAY and is
 * walked down to WATCHLIST by the council as new information arrives. The point
 * is the TRACEABILITY — you see exactly which agent moved the verdict and why.
 */
export const CASCADE: {
  readonly illustrative: true;
  readonly matchup: string;
  readonly steps: readonly CascadeStep[];
} = {
  illustrative: true,
  matchup: "Illustrative read · Home −3.5",
  steps: [
    {
      title: "Council opens",
      verdict: "PLAY",
      narration:
        "Independent estimators diverge from the price and agree on direction. The council opens the case at PLAY.",
      overrides: {},
    },
    {
      title: "Roster shock",
      verdict: "PLAY",
      changed: "injury",
      narration:
        "Injury Freshness escalates — a projected starter is downgraded to questionable. The read isn't broken yet, but the input upstream of the edge just moved.",
      overrides: { injury: { level: "alert", label: "Questionable" } },
    },
    {
      title: "Estimators split",
      verdict: "WATCHLIST",
      changed: "disagree",
      narration:
        "Model Disagreement now flags reduced confidence: the independents split once the status is priced in. Verdict steps down to WATCHLIST.",
      overrides: { disagree: { level: "elevated", label: "Split on news" } },
    },
    {
      title: "Public surge",
      verdict: "WATCHLIST",
      changed: "public",
      narration:
        "Public Bias spikes — tickets surge on the favourite. Some of the value may already be priced; the crowd is bending the market.",
      overrides: { public: { level: "elevated", label: "Heavy on fav" } },
    },
    {
      title: "Verdict held",
      verdict: "WATCHLIST",
      changed: "responsible",
      narration:
        "Responsible Decision holds the line: the edge is real but fragile. The council settles at WATCHLIST until the status confirms — not a downgrade to silence, not a push to play.",
      overrides: { responsible: { level: "watching", label: "Fragile — hold" } },
    },
  ],
};

export const VERDICT_HEX: Record<WarVerdict, string> = {
  PLAY: "#00E5FF",
  WATCHLIST: "#7B61FF",
  "NO-BET": "#FF38C7",
};

export const LEVEL_HEX: Record<AgentLevel, string> = {
  calm: "#5B6675",
  watching: "#00E5FF",
  elevated: "#7B61FF",
  alert: "#FF38C7",
};

/** Resolve every agent's state at a given step (defaults + cumulative overrides). */
export function statesAtStep(stepIndex: number): Record<string, AgentState> {
  const merged: Record<string, AgentState> = { ...DEFAULT_STATE };
  for (let i = 0; i <= stepIndex; i++) {
    const step = CASCADE.steps[i];
    if (!step) break;
    Object.assign(merged, step.overrides);
  }
  return merged;
}
