/**
 * Operating narrative — pure, deterministic.
 *
 * Reads like Jarvis is operating the company: what changed, what's blocked,
 * what needs the owner, what can wait, what to ignore. Decision-grade, not a
 * generic summary — every line is sourced from the ranked attention queue and
 * the live launch state.
 */

import type {
  OperatingNarrative,
  OwnerAttentionItem,
} from "./types";

export interface NarrativeInput {
  readonly launchStatus: string;
  readonly overallColor: "GREEN" | "AMBER" | "RED";
  readonly todayPickCount: number;
  readonly gatesOpen: number;
  readonly gatesTotal: number;
  readonly publicGateOpen: boolean;
  readonly attention: readonly OwnerAttentionItem[];
}

function headlineFor(input: NarrativeInput, needsYouCount: number): string {
  if (input.overallColor === "RED") {
    return needsYouCount > 0
      ? `${needsYouCount} blocking item${needsYouCount === 1 ? "" : "s"} need you before anything ships.`
      : "A blocker is active. Clear it before exposure.";
  }
  if (needsYouCount > 0) {
    return `${needsYouCount} decision${needsYouCount === 1 ? "" : "s"} await you; the rest is holding steady.`;
  }
  return "No decisions are waiting. The deck is steady. Hold the cadence.";
}

export function buildOperatingNarrative(input: NarrativeInput): OperatingNarrative {
  const blocked = input.attention.filter(
    (a) => a.decisionType === "SAFETY" || a.urgency === "CRITICAL"
  );
  const needsYou = input.attention.filter(
    (a) => a.urgency === "HIGH" && a.decisionType !== "SAFETY"
  );
  const canWait = input.attention.filter((a) => a.urgency === "NORMAL");
  const canIgnore = input.attention.filter((a) => a.urgency === "LOW");

  const whatChanged: string[] = [
    `Launch posture: ${input.launchStatus.replace(/_/g, " ").toLowerCase()} (${input.overallColor}).`,
    `Readiness: ${input.gatesOpen}/${input.gatesTotal} progression gates open.`,
    `Public picks gate is ${input.publicGateOpen ? "OPEN" : "closed"}. ${input.todayPickCount} pick${input.todayPickCount === 1 ? "" : "s"} generated today.`,
  ];

  // Cap the narrative lists so the memo stays scannable; the full queue lives
  // in the attention list. Decision-grade means short and ranked, not exhaustive.
  const cap = (items: readonly OwnerAttentionItem[], n: number): string[] =>
    items.slice(0, n).map((a) => `${a.title}: ${a.detail}`);

  const needsYouLines = cap(needsYou, 5);
  if (blocked.length === 0 && needsYou.length === 0) {
    needsYouLines.push("Nothing requires an owner decision right now.");
  }

  return {
    headline: headlineFor(input, blocked.length + needsYou.length),
    whatChanged,
    whatsBlocked:
      blocked.length > 0
        ? cap(blocked, 5)
        : ["Nothing is blocked. No safety or critical items active."],
    needsYou: needsYouLines,
    canWait:
      canWait.length > 0
        ? cap(canWait, 6)
        : ["No routine decisions queued."],
    canIgnore: cap(canIgnore, 6),
  };
}
