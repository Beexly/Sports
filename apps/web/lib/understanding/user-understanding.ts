/**
 * User Understanding Model — what the product believes a user understands.
 *
 * Feeds the Experience Orchestrator and the Explainability Ladder. A user
 * who has not opened the Methodology page should never see Operator-only
 * language in an evidence card; a user who has completed the Signal Track
 * should see fewer beginner explainers.
 *
 * Estimates only — never an assertion of competence. Used to choose
 * defaults, never to gate content the user explicitly asks for.
 *
 * Server-only.
 */

/** Concept areas the product can track understanding of. */
export const UNDERSTANDING_CONCEPTS = [
  "what-galaxy-is",
  "no-bet-doctrine",
  "evidence-chain",
  "closing-line-value",
  "expected-value",
  "confidence-vs-edge",
  "factor-trail",
  "calibration-gate",
  "responsible-play",
  "parlay-correlation",
  "market-mirage",
  "roster-shock-timing",
  "coaching-tendencies",
  "process-vs-outcome",
  "tier-differences",
] as const;

export type UnderstandingConcept = (typeof UNDERSTANDING_CONCEPTS)[number];

/** Estimated familiarity bands. */
export type UnderstandingBand = "unknown" | "introduced" | "familiar" | "fluent";

export interface UserUnderstandingSnapshot {
  readonly subjectBucket: number; // never a raw user id
  readonly asOf: string; // ISO8601
  readonly bands: Readonly<Record<UnderstandingConcept, UnderstandingBand>>;
}

const BAND_RANK: Record<UnderstandingBand, number> = {
  unknown: 0,
  introduced: 1,
  familiar: 2,
  fluent: 3,
};

/** Promote a band; never demote silently. */
export function promoteBand(
  current: UnderstandingBand,
  evidence: UnderstandingBand,
): UnderstandingBand {
  return BAND_RANK[evidence] > BAND_RANK[current] ? evidence : current;
}

/** Concept → surfaces / events that promote it. Read-only registry. */
export const EVIDENCE_FOR_CONCEPT: ReadonlyArray<{
  readonly concept: UnderstandingConcept;
  readonly evidence: UnderstandingBand;
  readonly trigger:
    | { kind: "surface-viewed"; surface: string; minDwellMs: number }
    | { kind: "explainer-opened"; key: string }
    | { kind: "academy-completed"; module: string }
    | { kind: "methodology-followed" };
}> = [
  { concept: "what-galaxy-is", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "home", minDwellMs: 8_000 } },
  { concept: "what-galaxy-is", evidence: "familiar", trigger: { kind: "methodology-followed" } },
  { concept: "no-bet-doctrine", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "no-bet", minDwellMs: 12_000 } },
  { concept: "no-bet-doctrine", evidence: "fluent", trigger: { kind: "academy-completed", module: "no-bet" } },
  { concept: "evidence-chain", evidence: "introduced", trigger: { kind: "explainer-opened", key: "evidence-chain" } },
  { concept: "evidence-chain", evidence: "fluent", trigger: { kind: "surface-viewed", surface: "vault", minDwellMs: 30_000 } },
  { concept: "closing-line-value", evidence: "introduced", trigger: { kind: "explainer-opened", key: "clv-meaning" } },
  { concept: "closing-line-value", evidence: "fluent", trigger: { kind: "academy-completed", module: "clv" } },
  { concept: "expected-value", evidence: "introduced", trigger: { kind: "explainer-opened", key: "ev-basics" } },
  { concept: "factor-trail", evidence: "introduced", trigger: { kind: "explainer-opened", key: "factor-trail" } },
  { concept: "calibration-gate", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "intelligence-calibration", minDwellMs: 10_000 } },
  { concept: "responsible-play", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "responsible-play", minDwellMs: 5_000 } },
  { concept: "parlay-correlation", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "parlay-mri", minDwellMs: 12_000 } },
  { concept: "market-mirage", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "market-mirage", minDwellMs: 12_000 } },
  { concept: "roster-shock-timing", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "roster-shock", minDwellMs: 10_000 } },
  { concept: "coaching-tendencies", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "coaching-edge", minDwellMs: 10_000 } },
  { concept: "process-vs-outcome", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "autopsy", minDwellMs: 10_000 } },
  { concept: "process-vs-outcome", evidence: "fluent", trigger: { kind: "academy-completed", module: "process-grading" } },
  { concept: "tier-differences", evidence: "introduced", trigger: { kind: "surface-viewed", surface: "pricing", minDwellMs: 6_000 } },
];

/** Build an empty understanding snapshot for a fresh subject. */
export function emptySnapshot(subjectBucket: number, asOf: string): UserUnderstandingSnapshot {
  const bands = Object.fromEntries(
    UNDERSTANDING_CONCEPTS.map((c) => [c, "unknown" as UnderstandingBand]),
  ) as Record<UnderstandingConcept, UnderstandingBand>;
  return { subjectBucket, asOf, bands };
}
