/**
 * Numeric-claims guard — the trust-brand safety net for the content lane.
 *
 * An LLM (Cerebras free lane or Anthropic) can hallucinate statistics. Under a
 * "Math you can read" brand, a single fabricated number is a brand-killing event.
 * This guard extracts the STAT-shaped numbers from generated copy (percentages,
 * decimals, records like 12-4) and verifies each is GROUNDED in the structured
 * payload the copy was generated from. Bare integers (prose counts like "3 picks")
 * are ignored to avoid false positives; fabricated stats are not.
 *
 * Pure, no I/O. Callers reject (or human-review) any output that isn't grounded.
 */

export type NumericClaimKind = "percent" | "decimal" | "record";

export interface NumericClaim {
  readonly raw: string;
  readonly value: number;
  readonly kind: NumericClaimKind;
}

export interface GroundingSet {
  /** Legitimate numeric values the copy may reference (from the source payload). */
  readonly allowed: readonly number[];
  /** Absolute tolerance for matching a claim to an allowed value. Default 0.1. */
  readonly tolerance?: number;
}

export interface NumericValidation {
  readonly grounded: boolean;
  readonly claimCount: number;
  readonly ungrounded: readonly NumericClaim[];
}

const PERCENT_RE = /\b(\d{1,3}(?:\.\d+)?)%/g;
const RECORD_RE = /\b(\d{1,3})-(\d{1,3})\b/g;
const DECIMAL_RE = /(?<![\d.-])(\d{1,4}\.\d+)(?!%)/g;

/** Extract stat-shaped numbers (percentages, decimals, records). Pure. */
export function extractNumericClaims(text: string): NumericClaim[] {
  const claims: NumericClaim[] = [];

  for (const m of text.matchAll(PERCENT_RE)) {
    claims.push({ raw: m[0], value: Number(m[1]), kind: "percent" });
  }
  for (const m of text.matchAll(RECORD_RE)) {
    claims.push({ raw: m[0], value: Number(m[1]), kind: "record" });
    claims.push({ raw: m[0], value: Number(m[2]), kind: "record" });
  }
  for (const m of text.matchAll(DECIMAL_RE)) {
    claims.push({ raw: m[0], value: Number(m[1]), kind: "decimal" });
  }
  return claims;
}

/** Validate that every stat-shaped number in the copy is grounded in the payload. */
export function validateNumericClaims(text: string, grounding: GroundingSet): NumericValidation {
  const tolerance = grounding.tolerance ?? 0.1;
  const claims = extractNumericClaims(text);
  const isGrounded = (v: number) => grounding.allowed.some((a) => Math.abs(a - v) <= tolerance);
  const ungrounded = claims.filter((c) => !isGrounded(c.value));
  return {
    grounded: ungrounded.length === 0,
    claimCount: claims.length,
    ungrounded,
  };
}
