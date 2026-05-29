/**
 * Galaxy Academy Registry — typed manifest of all Academy modules.
 *
 * This registry drives: /academy hub, NextBestSurface recommendations,
 * Command Center academy widget, and RelatedLessons graph component.
 *
 * Kept in sync with lib/understanding/learning-state.ts ACADEMY_MODULES.
 * This kernel version adds presentational + structural metadata.
 */

export type AcademyTrack = "foundation" | "advanced" | "simulator";

export type AcademyModuleId =
  | "foundation-what-is-a-pick"
  | "no-bet"
  | "evidence-chain"
  | "clv"
  | "ev-basics"
  | "factor-trail"
  | "process-grading"
  | "tilt-and-bankroll"
  | "parlay-discipline"
  | "market-structure";

export interface AcademyModule {
  readonly id: AcademyModuleId;
  readonly title: string;
  readonly track: AcademyTrack;
  readonly order: number;
  readonly summary: string;
  /** Concept from user-understanding.ts this module addresses. */
  readonly conceptId: string;
  /** Estimated read time in minutes. */
  readonly readMinutes: number;
  /** Whether this module is available to free-tier users. */
  readonly tier: "all" | "pro";
  /** Surface this module links to for applied practice. */
  readonly practiceHref?: string;
}

export const ACADEMY_MODULES: ReadonlyArray<AcademyModule> = [
  {
    id: "foundation-what-is-a-pick",
    title: "What Galaxy actually gives you",
    track: "foundation",
    order: 1,
    summary: "The difference between a signal and a guarantee. Why Galaxy grades process, not outcomes.",
    conceptId: "what-galaxy-is",
    readMinutes: 5,
    tier: "all",
  },
  {
    id: "no-bet",
    title: "Why passing is the discipline",
    track: "foundation",
    order: 2,
    summary: "How the No-Bet Engine works. When the model gates a slate and why that matters for your bankroll.",
    conceptId: "no-bet-doctrine",
    readMinutes: 6,
    tier: "all",
    practiceHref: "/no-bet",
  },
  {
    id: "evidence-chain",
    title: "Reading the evidence chain",
    track: "foundation",
    order: 3,
    summary: "Source, freshness, model version — the three things to check before trusting any signal.",
    conceptId: "evidence-chain",
    readMinutes: 5,
    tier: "all",
    practiceHref: "/picks",
  },
  {
    id: "ev-basics",
    title: "Expected value without the math degree",
    track: "foundation",
    order: 4,
    summary: "Why a losing bet can be a correct decision. EV as a long-run framework.",
    conceptId: "expected-value",
    readMinutes: 7,
    tier: "all",
  },
  {
    id: "process-grading",
    title: "Grade the decision, not the result",
    track: "foundation",
    order: 5,
    summary: "How to use the Post-Bet Autopsy. Good-loss / bad-win framing.",
    conceptId: "process-vs-outcome",
    readMinutes: 6,
    tier: "all",
    practiceHref: "/autopsy",
  },
  {
    id: "clv",
    title: "Closing Line Value explained",
    track: "advanced",
    order: 1,
    summary: "The sharp's north star. What CLV measures and why Galaxy tracks it on every pick.",
    conceptId: "closing-line-value",
    readMinutes: 8,
    tier: "pro",
    practiceHref: "/picks",
  },
  {
    id: "factor-trail",
    title: "Decoding the factor trail",
    track: "advanced",
    order: 2,
    summary: "How to read the 10-factor trail without seeing the weights. What each factor category signals.",
    conceptId: "factor-trail",
    readMinutes: 7,
    tier: "pro",
    practiceHref: "/picks",
  },
  {
    id: "tilt-and-bankroll",
    title: "Tilt detection and bankroll discipline",
    track: "advanced",
    order: 3,
    summary: "Behavioral patterns that drain bankrolls. How the Betting Brain profile identifies them.",
    conceptId: "tilt-and-bankroll",
    readMinutes: 8,
    tier: "pro",
    practiceHref: "/profile",
  },
  {
    id: "parlay-discipline",
    title: "Parlays — structure vs. correlation",
    track: "advanced",
    order: 4,
    summary: "When parlays are a structural problem and when they're reasonable. Using Parlay MRI.",
    conceptId: "parlay-correlation",
    readMinutes: 7,
    tier: "pro",
    practiceHref: "/parlay-mri",
  },
  {
    id: "market-structure",
    title: "How markets move (and why it matters)",
    track: "advanced",
    order: 5,
    summary: "Steam, limits, sharp action, and the Market Mirage. Reading the structure, not the narrative.",
    conceptId: "market-mirage",
    readMinutes: 9,
    tier: "pro",
    practiceHref: "/market-mirage",
  },
] as const;

export const FOUNDATION_TRACK = ACADEMY_MODULES.filter((m) => m.track === "foundation");
export const ADVANCED_TRACK = ACADEMY_MODULES.filter((m) => m.track === "advanced");

export function getAcademyModule(id: string): AcademyModule | undefined {
  return ACADEMY_MODULES.find((m) => m.id === id);
}

export function isValidModuleId(id: string): id is AcademyModuleId {
  return ACADEMY_MODULES.some((m) => m.id === id);
}
