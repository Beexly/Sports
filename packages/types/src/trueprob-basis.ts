/**
 * Which clock a stored independent trueProb was computed against.
 * A trainer excludes post_settlement_backfill by this field, never by
 * grepping the word "Retrospective" out of rationale prose.
 */
export type TrueProbBasis = "post_settlement_backfill" | "as_of_mint";

/** The only basis a trainer may fit on. */
export const TRAINABLE_TRUE_PROB_BASIS = "as_of_mint" as const;

export type TrainableTrueProbRefusal =
  | "trueProbBasis_required"
  | "trueProbBasis_not_trainable"
  | "trueProb_not_trainable";

export type TrainableTrueProbRead =
  | { readonly ok: true; readonly trueProb: number }
  | { readonly ok: false; readonly reason: TrainableTrueProbRefusal };

export function isTrueProbBasis(value: unknown): value is TrueProbBasis {
  return value === "post_settlement_backfill" || value === "as_of_mint";
}

/** A write with no basis is refused. No placeholder, no default. */
export function requireTrueProbBasis(value: unknown): TrueProbBasis {
  if (isTrueProbBasis(value)) return value;
  throw new Error("trueProbBasis_required");
}

/**
 * Trainer admission. post_settlement_backfill is a labelled leak, not a
 * training target. Missing / prose values are already refused by
 * requireTrueProbBasis.
 */
export function requireTrainableTrueProbBasis(value: unknown): "as_of_mint" {
  const basis = requireTrueProbBasis(value);
  if (basis !== TRAINABLE_TRUE_PROB_BASIS) {
    throw new Error("trueProbBasis_not_trainable");
  }
  return basis;
}

function finiteUnitProb(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 0 || value >= 1) return null;
  return value;
}

/**
 * Non-throwing trainer admission. Callers that must report a refusal census
 * (instead of dropping rows silently) use this and count `reason`.
 */
export function tryReadTrainableTrueProb(edge: unknown): TrainableTrueProbRead {
  if (!edge || typeof edge !== "object") {
    return { ok: false, reason: "trueProbBasis_required" };
  }
  const rec = edge as { readonly trueProbBasis?: unknown; readonly trueProb?: unknown };
  if (!isTrueProbBasis(rec.trueProbBasis)) {
    return { ok: false, reason: "trueProbBasis_required" };
  }
  if (rec.trueProbBasis !== TRAINABLE_TRUE_PROB_BASIS) {
    return { ok: false, reason: "trueProbBasis_not_trainable" };
  }
  const t = finiteUnitProb(rec.trueProb);
  if (t == null) return { ok: false, reason: "trueProb_not_trainable" };
  return { ok: true, trueProb: t };
}

/**
 * Trainable independent trueProb. Throws if the basis is missing or
 * post-settlement, or if the number itself is not a finite (0, 1) probability.
 */
export function readTrainableTrueProb(edge: unknown): number {
  const read = tryReadTrainableTrueProb(edge);
  if (!read.ok) throw new Error(read.reason);
  return read.trueProb;
}

/**
 * True when this edge is a post-settlement rewrite that still occupies the
 * trainable trueProb slot (or is still flagged priced). as_of_mint is never
 * quarantined here.
 */
export function needsTrueProbQuarantine(edge: unknown): boolean {
  if (!edge || typeof edge !== "object") return false;
  const rec = edge as Record<string, unknown>;
  if (rec["trueProbBasis"] === TRAINABLE_TRUE_PROB_BASIS) return false;
  if (rec["trueProbBasis"] !== "post_settlement_backfill") return false;
  if (finiteUnitProb(rec["trueProb"]) != null) return true;
  return rec["priced"] === true;
}

/**
 * Strip the trainable column. The leaked number, if any, is moved to
 * postSettlementTrueProb (audit only — not on IndependentEdgeSummary).
 * Returns null when there is nothing to strip.
 */
export function quarantineLeakedIndependentEdge(
  edge: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!needsTrueProbQuarantine(edge)) return null;
  const leaked = finiteUnitProb(edge["trueProb"]);
  const priorAudit = finiteUnitProb(edge["postSettlementTrueProb"]);
  return {
    ...edge,
    trueProb: null,
    priced: false,
    trueProbBasis: "post_settlement_backfill",
    postSettlementTrueProb: leaked ?? priorAudit,
  };
}
