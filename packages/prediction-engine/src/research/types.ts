/**
 * Research evidence types — the contract between the extracted-paper corpus and
 * the projection engine.
 *
 * Every value here originates in a paper's LaTeX/PDF source and is transcribed,
 * never estimated. A paper that does not state a parameter contributes nothing.
 *
 * ADDITIVE by construction: nothing in this directory mutates engine constants.
 * Callers pass evidence in explicitly, and the default is an empty set.
 */

/** Where a paper sits in the engine's own vocabulary. */
export type ResearchLane = "calibration" | "modeling" | "feature" | "evaluation" | "unknown";

/**
 * One numeric parameter a paper states, transcribed as printed.
 * `unit` is free text ("games", "probability", "nats") because papers do not
 * share a vocabulary and inventing one would be fabrication.
 */
export interface ResearchParameter {
  readonly name: string;
  readonly value: number;
  readonly unit?: string;
}

/** A single paper, reduced to what the engine can actually consume. */
export interface ResearchEvidence {
  /** arXiv id when matched, null when the paper has no arXiv source. */
  readonly arxivId: string | null;
  readonly title: string;
  readonly lane: ResearchLane;
  /** Title/author match confidence in [0, 1]. Never below the acceptance floor. */
  readonly confidence: number;
  /** Acceptance gate text from the paper's wiring record, if one exists. */
  readonly gate?: string;
  /**
   * False means the paper is additive-only and must not influence a live number.
   * Mirrors the repo's `ENABLED = false` convention for paper modules.
   */
  readonly enabled: boolean;
  readonly parameters: readonly ResearchParameter[];
}

/** Evidence with its computed, normalized weight. */
export interface WeightedEvidence extends ResearchEvidence {
  /** Deterministic pre-normalization score. */
  readonly rawScore: number;
  /** Normalized across the enabled set, sums to 1. Zero when nothing is enabled. */
  readonly weight: number;
}

/**
 * Lane priority. Justification is structural, not empirical: calibration papers
 * describe how to correct an existing probability, so they compose with any model;
 * modeling and feature papers assume a particular architecture and therefore
 * transfer less cleanly; evaluation papers score output and change nothing.
 */
export const LANE_PRIORITY: Readonly<Record<ResearchLane, number>> = Object.freeze({
  calibration: 1.0,
  modeling: 0.8,
  feature: 0.7,
  evaluation: 0.5,
  unknown: 0.25,
});

/** Minimum title/author confidence for a match to be usable at all. */
export const MIN_CONFIDENCE = 0.92;

/** Rejects NaN, Infinity and non-numbers. Every public entry point uses this. */
export function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
