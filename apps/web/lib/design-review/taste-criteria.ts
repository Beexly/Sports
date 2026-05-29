/**
 * Taste Criteria — typed registry of qualitative design judgments.
 *
 * Used by the Design QA agent and human reviewers to score whether a
 * surface "feels like Galaxy" — restrained, considered, evidence-led,
 * decision-quality oriented, and not casino or tout.
 */

export const TASTE_DIMENSIONS = [
  "feels-like-galaxy",
  "reduces-cognitive-load",
  "avoids-generic-saas",
  "avoids-casino",
  "avoids-tout",
  "restraint-feels-intelligent",
  "numbers-respect-tabular-figures",
  "hierarchy-is-obvious",
  "evidence-is-visible",
  "next-action-is-singular",
] as const;

export type TasteDimension = (typeof TASTE_DIMENSIONS)[number];

export type TasteVerdict = "fail" | "neutral" | "pass" | "exemplary";

export interface TasteCriterion {
  readonly dimension: TasteDimension;
  readonly question: string;
  readonly failingSignals: ReadonlyArray<string>;
  readonly passingSignals: ReadonlyArray<string>;
}

export const TASTE_CRITERIA: ReadonlyArray<TasteCriterion> = [
  {
    dimension: "feels-like-galaxy",
    question: "Does this surface read as Galaxy at a glance — carbon background, mineral borders, ion-blue accents, monospace eyebrows?",
    failingSignals: ["light theme on a public surface", "generic Tailwind defaults", "unbranded card patterns"],
    passingSignals: ["carbon + mineral + ion-blue tokens", "mono eyebrows", "consistent dot accents per kind"],
  },
  {
    dimension: "reduces-cognitive-load",
    question: "Can a tired user understand the surface in 6 seconds?",
    failingSignals: ["multiple competing CTAs", "stacked color emphasis", "data without label"],
    passingSignals: ["one headline, one CTA per region", "muted secondary data", "labels left of values"],
  },
  {
    dimension: "avoids-generic-saas",
    question: "Does it avoid the rounded-2xl-everywhere drop-shadow SaaS look?",
    failingSignals: ["soft shadows on every card", "rounded-3xl everywhere", "violet/indigo gradient fade hero"],
    passingSignals: ["sharp 1px mineral borders", "tight radii", "no shadow on inline cards"],
  },
  {
    dimension: "avoids-casino",
    question: "Does it avoid bright saturated reds/greens, sparkles, slot-machine cues?",
    failingSignals: ["saturated #00FF00", "neon glow on every element", "fake confetti/jackpot animation"],
    passingSignals: ["state-color used as accent only", "no autoplay sound", "no spinning prize wheel"],
  },
  {
    dimension: "avoids-tout",
    question: "Does it avoid 'PICK OF THE DAY', 'LOCK', or banner-style tout aesthetics?",
    failingSignals: ["massive central pick banner", "all-caps shout copy", "stars/fire emojis as state"],
    passingSignals: ["measured tier badge", "calm eyebrow + headline + selection", "failure case present"],
  },
  {
    dimension: "restraint-feels-intelligent",
    question: "Does restraint (pass, no-bet, gated calibration) feel like rigor, not punishment?",
    failingSignals: ["empty state framed as 'sorry'", "compliance text in red", "lock icon dominates"],
    passingSignals: ["pass framed as a position", "amber as discipline color", "rationale beside the pass"],
  },
  {
    dimension: "numbers-respect-tabular-figures",
    question: "Do numerics align in tables and inline lists?",
    failingSignals: ["sans-serif numerals", "wandering decimal points", "comma drift in stacks"],
    passingSignals: ["tabular-nums utility", "right-aligned numeric columns", "monospaced inline metrics"],
  },
  {
    dimension: "hierarchy-is-obvious",
    question: "From two feet away, can you tell what matters most?",
    failingSignals: ["six near-equal type sizes", "every region same density", "no eyebrow"],
    passingSignals: ["one display headline per page", "section eyebrows", "body 1 step quieter than headline"],
  },
  {
    dimension: "evidence-is-visible",
    question: "Can the reader trace a claim to a source + freshness + model version in ≤2 seconds?",
    failingSignals: ["claim without a footer", "stale data without label", "no source attribution"],
    passingSignals: ["evidence row pill", "freshness label", "Galaxy model footer note"],
  },
  {
    dimension: "next-action-is-singular",
    question: "Is the next action obvious and singular?",
    failingSignals: ["three primary CTAs", "no CTA at all", "ambiguous outbound link"],
    passingSignals: ["one primary CTA", "one secondary action", "footer cross-links labeled"],
  },
];

/** Quick lookup by dimension. */
const BY_DIMENSION: ReadonlyMap<TasteDimension, TasteCriterion> = new Map(
  TASTE_CRITERIA.map((c) => [c.dimension, c]),
);

export function criterionFor(d: TasteDimension): TasteCriterion {
  return BY_DIMENSION.get(d)!;
}

/**
 * Score interpretation:
 *  fail (0)   — surface should not ship as-is
 *  neutral (1) — meets baseline, no judgment
 *  pass (2)   — meets the dimension's intent
 *  exemplary (3) — sets a standard for future surfaces
 */
export const VERDICT_SCORE: Record<TasteVerdict, number> = {
  fail: 0,
  neutral: 1,
  pass: 2,
  exemplary: 3,
};

/** Surface fails the rubric if any dimension scores `fail`. */
export function fails(verdicts: ReadonlyArray<{ readonly dimension: TasteDimension; readonly verdict: TasteVerdict }>): boolean {
  return verdicts.some((v) => v.verdict === "fail");
}
