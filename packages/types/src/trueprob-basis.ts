/**
 * Which clock a stored independent trueProb was computed against.
 * A trainer excludes post_settlement_backfill by this field, never by
 * grepping the word "Retrospective" out of rationale prose.
 */
export type TrueProbBasis = "post_settlement_backfill" | "as_of_mint";

export function isTrueProbBasis(value: unknown): value is TrueProbBasis {
  return value === "post_settlement_backfill" || value === "as_of_mint";
}

/** A write with no basis is refused. No placeholder, no default. */
export function requireTrueProbBasis(value: unknown): TrueProbBasis {
  if (isTrueProbBasis(value)) return value;
  throw new Error("trueProbBasis_required");
}
