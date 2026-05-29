/**
 * Typed registry of coach prompts allowed per surface.
 * Every prompt must pass checkBoundaries() before any response is shown.
 */

export const COACH_SURFACES = [
  "today",
  "picks",
  "parlay-mri",
  "autopsy",
  "academy",
  "command",
  "decision-room",
] as const;

export type CoachSurface = (typeof COACH_SURFACES)[number];

export interface CoachPrompt {
  readonly id: string;
  readonly surfaces: ReadonlyArray<CoachSurface> | "all";
  readonly label: string;
  readonly question: string;
}

export const COACH_PROMPTS: ReadonlyArray<CoachPrompt> = [
  {
    id: "cp-001-why-this-pick",
    surfaces: ["today", "picks", "command"],
    label: "Why this pick?",
    question: "What evidence supports this signal and what would make it wrong?",
  },
  {
    id: "cp-002-what-makes-this-risky",
    surfaces: ["today", "picks", "parlay-mri", "command"],
    label: "What makes this risky?",
    question: "What are the key risk factors for this game that the model is watching?",
  },
  {
    id: "cp-003-should-i-pass",
    surfaces: ["today", "picks", "command"],
    label: "Should I pass?",
    question: "Walk me through the no-bet doctrine for a game with this profile.",
  },
  {
    id: "cp-004-parlay-correlation",
    surfaces: ["parlay-mri"],
    label: "Explain correlation risk",
    question: "How do correlated legs multiply risk and what does the MRI score mean?",
  },
  {
    id: "cp-005-grade-my-decision",
    surfaces: ["autopsy"],
    label: "Grade my decision",
    question: "Was this decision process sound regardless of outcome? What would I change?",
  },
  {
    id: "cp-006-what-should-i-study",
    surfaces: ["academy", "command"],
    label: "What should I study next?",
    question: "Based on common decision gaps, what concept is most worth understanding next?",
  },
  {
    id: "cp-007-explain-edge",
    surfaces: ["today", "picks", "command"],
    label: "What is edge?",
    question: "Explain bookmaker edge and how the model quantifies it without revealing thresholds.",
  },
  {
    id: "cp-008-am-i-tilting",
    surfaces: ["command", "autopsy"],
    label: "Am I tilting?",
    question: "What behavioral signals suggest I might be making reactive rather than disciplined decisions?",
  },
  {
    id: "cp-009-what-does-evidence-tell-me",
    surfaces: ["decision-room"],
    label: "What does evidence say?",
    question: "What does the game's evidence stack tell me about this matchup?",
  },
  {
    id: "cp-010-pass-or-pick",
    surfaces: ["decision-room"],
    label: "Pass or pick?",
    question: "Walk me through the decision framework for passing vs. acting on this game.",
  },
];

/** Return prompts available on a given surface. */
export function getPromptsForSurface(surface: CoachSurface): ReadonlyArray<CoachPrompt> {
  return COACH_PROMPTS.filter(
    (p) => p.surfaces === "all" || p.surfaces.includes(surface),
  );
}
