/**
 * Positioning Firewall.
 *
 * Protects public copy from drifting into generic AI-pick or
 * betting-tout positioning. The firewall enumerates forbidden framings,
 * required framings, and tone signatures.
 *
 * Conceptually overlaps the trust-claim registry and the design QA
 * rubric, but operates one layer up — at the level of brand voice and
 * category posture.
 */

export const FORBIDDEN_POSITIONINGS: ReadonlyArray<{
  readonly name: string;
  readonly forbidden: ReadonlyArray<string | RegExp>;
  readonly reason: string;
  readonly replacement: string;
}> = [
  {
    name: "AI picks the winners",
    forbidden: [/ai picks/i, /our (ai|model) (picks|chooses)/i, /ai-powered (winners|picks)/i],
    reason: "Generic AI-pick positioning. Galaxy is decision-quality intelligence, not an AI-picks vendor.",
    replacement: "Galaxy publishes calibrated signals, with the evidence chain attached.",
  },
  {
    name: "Tail the sharps",
    forbidden: [/tail (the )?sharps?/i, /follow the sharps?/i, /sharp action follow/i],
    reason: "Tout-vendor framing.",
    replacement: "Read the evidence the model is reading.",
  },
  {
    name: "Beat the books",
    forbidden: [/beat the (books?|sportsbooks?)/i],
    reason: "Tout aesthetic; implies certainty.",
    replacement: "Identify edge before the line reflects it.",
  },
  {
    name: "Insider information",
    forbidden: [/insider (information|info|tips)/i, /our (insiders?|connects?)/i],
    reason: "Implies privileged access; not the Galaxy position.",
    replacement: "Public-record evidence plus a transparent factor trail.",
  },
  {
    name: "Guaranteed profitable system",
    forbidden: [/profitable system/i, /guaranteed (winning|profit)/i, /never lose/i],
    reason: "Outcome certainty language.",
    replacement: "Process-quality framing — the only signal that survives sample noise.",
  },
];

export const REQUIRED_POSITIONINGS: ReadonlyArray<{
  readonly name: string;
  readonly required: ReadonlyArray<string | RegExp>;
  readonly applies: "homepage" | "methodology" | "all-public";
}> = [
  {
    name: "Process over outcome",
    required: [/process/i, /evidence/i, /restraint/i],
    applies: "homepage",
  },
  {
    name: "Calibration disclosure",
    required: [/calibration/i],
    applies: "methodology",
  },
  {
    name: "Failure case framing",
    required: [/failure case|how this can be wrong/i],
    applies: "all-public",
  },
];

/** Tone signatures: things our copy should always sound like. */
export const TONE_SIGNATURES = [
  "measured-confidence", // never certainty, never hedged into uselessness
  "evidence-first", // claim, then source, then freshness, then failure case
  "operator-respect", // assume the reader is competent and time-constrained
  "discipline-as-craft", // restraint framed as expertise, not punishment
  "no-tout", // no LOCK / HAMMER / FIRE / 🔥 / banner / scarcity
] as const;

export type ToneSignature = (typeof TONE_SIGNATURES)[number];

export interface PositioningCheckResult {
  readonly violations: ReadonlyArray<{ readonly name: string; readonly match: string }>;
  readonly clean: boolean;
}

/**
 * Scan a copy block for forbidden positionings. Pure, no I/O.
 */
export function scanPositioning(text: string): PositioningCheckResult {
  const violations: { readonly name: string; readonly match: string }[] = [];
  for (const block of FORBIDDEN_POSITIONINGS) {
    for (const f of block.forbidden) {
      const regex = typeof f === "string" ? new RegExp(escapeRegex(f), "i") : f;
      const m = regex.exec(text);
      if (m) violations.push({ name: block.name, match: m[0] });
    }
  }
  return { violations, clean: violations.length === 0 };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
