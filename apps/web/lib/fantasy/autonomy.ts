/**
 * The Glass-Box GM Autopilot — a delegation spectrum, not a black box.
 *
 * Competitors (LeagueSync, Draft Hero) are one-shot advisors: they suggest, you
 * execute, they forget. Concierge "managed team" services act for you but hide
 * the why. Ours is a DIAL from "just suggest" to "run my whole team" where every
 * autonomous action is (1) explained before it happens, (2) committed to the GM
 * Ledger and process-graded, (3) reversible, and (4) teaches you — your GM IQ
 * climbs even when the AI acts.
 *
 * DOCTRINE: this layer PROPOSES. Executing on a real league account is an
 * outward action with consequences — it is founder/consent-gated and never runs
 * autonomously here. Honors no-autonomous-action. Pure, illustrative.
 */

import { optimize, rosterFromIds, DEFAULT_ROSTER_IDS } from "./lineup";
import { waiverTargets, bidDollars, dropCandidates } from "./waivers";

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export type ApprovalMode = "manual" | "advisory" | "per-action" | "veto-window" | "report-only";

export type LevelSpec = {
  readonly level: AutonomyLevel;
  readonly key: string;
  readonly name: string;
  readonly blurb: string;
  readonly weDo: string;
  readonly youDo: string;
  readonly approval: ApprovalMode;
  /** real execution on a live account is gated behind consent + compliance */
  readonly founderGated: boolean;
};

export const LEVELS: readonly LevelSpec[] = [
  { level: 0, key: "manual", name: "Manual", blurb: "We show the board; you run everything.", weDo: "Surface the data and the reads.", youDo: "Make and submit every move.", approval: "manual", founderGated: false },
  { level: 1, key: "advisor", name: "Advisor", blurb: "Suggestions for waivers, start/sit, and trades — you execute.", weDo: "Rank the moves with the why.", youDo: "Decide and submit in your league app.", approval: "advisory", founderGated: false },
  { level: 2, key: "copilot", name: "Co-pilot", blurb: "We draft the moves and queue them; you one-tap approve before the deadline.", weDo: "Set the lineup, queue waiver claims with bids.", youDo: "Review and approve each action.", approval: "per-action", founderGated: true },
  { level: 3, key: "autopilot", name: "Autopilot", blurb: "We queue and submit unless you veto within your window — every action explained and ledgered.", weDo: "Execute to your strategy after a veto window.", youDo: "Veto anything you don't like; the rest runs.", approval: "veto-window", founderGated: true },
  { level: 4, key: "remote", name: "Full remote GM", blurb: "We run the team end-to-end to your strategy and constraints; you get a weekly GM report.", weDo: "Manage waivers, lineups, and trade exploration.", youDo: "Set strategy; read the weekly report.", approval: "report-only", founderGated: true },
];

export function levelSpec(level: AutonomyLevel): LevelSpec {
  return LEVELS[level]!;
}

export type ActionType = "lineup" | "waiver" | "drop" | "trade";

export type ProposedAction = {
  readonly id: string;
  readonly type: ActionType;
  readonly title: string;
  readonly detail: string;
  readonly rationale: string;
  readonly confidence: number; // 0..1
  readonly reversible: boolean;
};

function lineupAction(): ProposedAction {
  const opt = optimize(rosterFromIds(DEFAULT_ROSTER_IDS));
  const close = opt.starters.filter((s) => s.verdict === "close");
  return {
    id: "act-lineup",
    type: "lineup",
    title: "Set the optimal lineup",
    detail: `Start ${opt.starters.map((s) => s.player.name).join(", ")}.`,
    rationale: close.length
      ? `Projected ${opt.total}. ${close.length} close call${close.length > 1 ? "s" : ""} flagged for your eye before it's submitted.`
      : `Projected ${opt.total}; every start is clear of its bench alternative.`,
    confidence: close.length ? 0.72 : 0.93,
    reversible: true,
  };
}

function waiverActions(): ProposedAction[] {
  return waiverTargets().slice(0, 2).map((r, i) => ({
    id: `act-waiver-${i}`,
    type: "waiver" as const,
    title: `Claim ${r.player.name} — ${r.tier}`,
    detail: `Bid ~$${bidDollars(r, 100)} of a $100 FAAB budget.`,
    rationale: r.reason,
    confidence: r.tier === "Priority" ? 0.85 : r.tier === "Target" ? 0.7 : 0.5,
    reversible: false,
  }));
}

function dropAction(): ProposedAction[] {
  const d = dropCandidates()[0];
  if (!d) return [];
  return [{
    id: "act-drop",
    type: "drop",
    title: `Drop ${d.name}`,
    detail: "Clears the roster spot a waiver claim needs.",
    rationale: `Weakest bench value${d.trend === "down" ? " and trending down" : ""}; the right cut to make room.`,
    confidence: 0.6,
    reversible: false,
  }];
}

function tradeAction(): ProposedAction {
  return {
    id: "act-trade",
    type: "trade",
    title: "Explore a buy-low trade",
    detail: "Open talks for an underperforming starter whose underlying usage is stable.",
    rationale: "Strategy-level move surfaced only at full-remote; always proposed, never sent without your sign-off.",
    confidence: 0.55,
    reversible: true,
  };
}

/** What the Autopilot would propose at a given level (nothing at Manual). */
export function proposeActions(level: AutonomyLevel): ProposedAction[] {
  if (level === 0) return [];
  const actions = [lineupAction(), ...waiverActions(), ...dropAction()];
  if (level >= 4) actions.push(tradeAction());
  return actions;
}

/** Plain-language execution semantics for a level — the honest gate. */
export function executionNotice(level: AutonomyLevel): string {
  const spec = levelSpec(level);
  switch (spec.approval) {
    case "manual": return "Nothing is queued — you run the team.";
    case "advisory": return "These are suggestions. You submit them in your league app.";
    case "per-action": return "Each action waits for your one-tap approval before anything is submitted.";
    case "veto-window": return "Actions submit after your veto window unless you stop them — and only once live execution is enabled for your account.";
    case "report-only": return "We'd manage end-to-end to your strategy; live execution stays gated behind your consent and compliance review.";
  }
}
