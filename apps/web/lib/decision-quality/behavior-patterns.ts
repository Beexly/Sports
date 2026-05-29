/**
 * Behavior patterns — the small set of patterns the product tries to
 * recognize from observable behavior. Each pattern carries a doctrine-
 * aligned response, never a betting-volume nudge.
 *
 * Patterns are *probabilistic* — they are inputs to the Experience
 * Orchestrator and the Restraint Layer, not assertions.
 */

import type { ProcessGrade } from "./process-grades";

export const BEHAVIOR_PATTERNS = [
  "tilt-cascade", // multiple high-stake entries within a short window after a loss
  "chase-line", // re-entering on closer line after fade
  "narrative-bandwagon", // following social consensus during line moves against signal
  "evidence-bypass", // pick action without opening any evidence card
  "no-bet-respecter", // routinely reads the pass list and skips published-gate plays
  "process-grader", // routinely opens Autopsy and acknowledges grade
  "calibration-checker", // routinely reads the Calibration / Public Ledger
  "academy-learner", // active progress through Academy modules
] as const;

export type BehaviorPattern = (typeof BEHAVIOR_PATTERNS)[number];

export type BehaviorValence = "supportive" | "neutral" | "risky";

const VALENCE: Record<BehaviorPattern, BehaviorValence> = {
  "tilt-cascade": "risky",
  "chase-line": "risky",
  "narrative-bandwagon": "risky",
  "evidence-bypass": "risky",
  "no-bet-respecter": "supportive",
  "process-grader": "supportive",
  "calibration-checker": "supportive",
  "academy-learner": "supportive",
};

export function valenceOf(pattern: BehaviorPattern): BehaviorValence {
  return VALENCE[pattern];
}

export interface BehaviorObservation {
  readonly pattern: BehaviorPattern;
  readonly observedAt: string; // ISO8601
  readonly confidence: number; // 0..1
}

/**
 * Recommended doctrine-aligned response per pattern.
 * Never includes a bet, stake, or upsell suggestion.
 */
export type BehaviorResponse =
  | { kind: "elevate-no-bet"; href: "/no-bet" }
  | { kind: "elevate-academy-module"; module: string; href: "/academy" }
  | { kind: "elevate-responsible-play"; href: "/responsible-play" }
  | { kind: "elevate-methodology"; href: "/methodology" }
  | { kind: "elevate-autopsy"; href: "/autopsy" }
  | { kind: "reinforce-good-habit"; copy: string }
  | { kind: "none" };

export function responseFor(pattern: BehaviorPattern): BehaviorResponse {
  switch (pattern) {
    case "tilt-cascade":
      return { kind: "elevate-responsible-play", href: "/responsible-play" };
    case "chase-line":
      return { kind: "elevate-no-bet", href: "/no-bet" };
    case "narrative-bandwagon":
      return { kind: "elevate-methodology", href: "/methodology" };
    case "evidence-bypass":
      return { kind: "elevate-academy-module", module: "evidence-chain", href: "/academy" };
    case "no-bet-respecter":
      return { kind: "reinforce-good-habit", copy: "Restraint is a position. You take it consistently." };
    case "process-grader":
      return { kind: "elevate-autopsy", href: "/autopsy" };
    case "calibration-checker":
      return { kind: "reinforce-good-habit", copy: "Calibration first. That's the read order that compounds." };
    case "academy-learner":
      return { kind: "reinforce-good-habit", copy: "Concepts are infrastructure. Keep building." };
  }
}

/** Bias toward inferring supportive patterns from a high process grade. */
export function inferFromProcessGrade(grade: ProcessGrade): BehaviorPattern | null {
  if (grade === "A" || grade === "B") return "process-grader";
  if (grade === "F") return "evidence-bypass";
  return null;
}
