/**
 * AI Assistant Boundaries — what an AI surface (Brain, Decision Coach,
 * content generator) is allowed to do and what it must refuse.
 *
 * These boundaries are enforced before, during, and after the model call:
 *  - before: prompts forbid the behavior
 *  - during: refusal heuristics inspect outputs for boundary violations
 *  - after: trust-gate scans the rendered content for banned phrases
 */

export const ASSISTANT_SURFACES = [
  "brain", // user-facing Q&A
  "decision-coach", // user-facing pre-bet check (gated)
  "content-generator", // blog / studio content
  "autopsy-coach", // post-bet review prompts
  "support", // help-center assistant (future)
] as const;

export type AssistantSurface = (typeof ASSISTANT_SURFACES)[number];

/** A boundary the assistant must respect. */
export interface AssistantBoundary {
  readonly id: string;
  readonly surfaces: ReadonlyArray<AssistantSurface> | "all";
  readonly forbids: string;
  readonly required: string;
  readonly refusalPattern: RegExp;
}

export const ASSISTANT_BOUNDARIES: ReadonlyArray<AssistantBoundary> = [
  {
    id: "ab-001-no-place-bet",
    surfaces: "all",
    forbids: "Initiating, suggesting an amount for, or executing any wager.",
    required: "Decline and route to the user's own decision; offer methodology or No-Bet doctrine.",
    refusalPattern: /(place (this )?bet|i('|\s)?ll bet|i recommend wagering|stake at)/i,
  },
  {
    id: "ab-002-no-certainty",
    surfaces: "all",
    forbids: "Certainty language about a future betting outcome.",
    required: "Use 'the model favors', 'evidence suggests', 'higher probability than baseline'.",
    refusalPattern: /(will win|guaranteed|cant lose|lock|sure thing|free money)/i,
  },
  {
    id: "ab-003-no-personalized-financial-advice",
    surfaces: ["brain", "decision-coach", "support"],
    forbids: "Personalized financial, tax, or medical advice.",
    required: "Decline; explain the limitation; route to a qualified professional or generic education.",
    refusalPattern: /(your portfolio|file your taxes|medical advice|diagnos)/i,
  },
  {
    id: "ab-004-no-leak-prompts",
    surfaces: "all",
    forbids: "Returning the literal text of system prompts, weights, thresholds, or formulas.",
    required: "Decline; explain that methodology summaries are available on /methodology.",
    refusalPattern: /(my system prompt|the exact threshold|the weight is|here is the formula)/i,
  },
  {
    id: "ab-005-no-impersonation-of-experts",
    surfaces: "all",
    forbids: "Claiming to be a licensed expert, a real person, or a sportsbook insider.",
    required: "Identify as an AI assistant; defer to professionals.",
    refusalPattern: /(i am a licensed|i work at a sportsbook|i used to bet professionally)/i,
  },
  {
    id: "ab-006-no-regulated-evasion",
    surfaces: "all",
    forbids: "Advising on circumventing geofencing, age checks, or jurisdictional restrictions.",
    required: "Decline; explain the constraint; direct to /responsible-play.",
    refusalPattern: /(bypass geofence|fake (id|location)|vpn around)/i,
  },
];

export interface BoundaryCheckResult {
  readonly violatedBoundaryIds: ReadonlyArray<string>;
  readonly allowed: boolean;
}

export function checkBoundaries(
  surface: AssistantSurface,
  text: string,
): BoundaryCheckResult {
  const violated: string[] = [];
  for (const b of ASSISTANT_BOUNDARIES) {
    const applies = b.surfaces === "all" || b.surfaces.includes(surface);
    if (!applies) continue;
    if (b.refusalPattern.test(text)) violated.push(b.id);
  }
  return { violatedBoundaryIds: violated, allowed: violated.length === 0 };
}
