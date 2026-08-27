/**
 * Numeral-source audit — SportsMetrics-derived, for recap/stat-dense content.
 *
 * Ported from arXiv:2402.10979 (Hu et al., "SportsMetrics: Blending Text and
 * Numerical Data to Understand Information Fusion in LLMs"). Their single
 * most important finding for us (their Fig. 7 right): renaming players to
 * fictional characters — removing the model's ability to lean on memorized
 * priors — measurably degrades every tested model's numeric accuracy,
 * meaning models default to parametric "knowledge" over the data they were
 * actually given whenever the two could plausibly diverge. See
 * docs/ops/edge/2026-08-26-paper-spec-sportsmetrics-numeric-fidelity.md for
 * the full derivation. That is exactly the failure this module exists to
 * catch mechanically: rule #2 ("no fabricated stats") enforced as code, not
 * as a prompt instruction the model can quietly ignore.
 *
 * This is STRICTER than `apps/web/lib/claude-api/numeric-guard.ts` on
 * purpose, for a different content class. That guard deliberately skips bare
 * integers ("avoid false positives" in general prose) and checks flat
 * value-membership only. Recap/narrative content is dense with legitimate
 * bare-integer stats (yards, TDs, rebounds) where a hallucinated integer is
 * just as much a brand-killing fabrication as a hallucinated percentage —
 * so every numeral token here needs grounding, and grounding can come from a
 * whitelisted DERIVATION (e.g. American odds -> implied win %), not just raw
 * presence in the source facts. Use `numeric-guard.ts` for general copy;
 * use this module for content built from a structured game/pick record.
 *
 * Pure, no I/O. Not wired into any live publishing path — additive and
 * standalone until the runtime shadow-guard wiring (paper-spec §"Wiring")
 * is a separate, deliberate increment.
 */

export type NumeralKind = "percent" | "record_component" | "decimal" | "integer";

export interface NumeralToken {
  readonly raw: string;
  readonly value: number;
  readonly kind: NumeralKind;
  /** Character offset of the match start in the audited copy — for reporting exactly where a fabrication sits. */
  readonly index: number;
}

export interface SourceFacts {
  /** Numeric facts pulled directly from the structured input this copy was generated from — always allowed as-is. */
  readonly numbers: readonly number[];
  /**
   * Values whitelisted regardless of source (a fixed season year, a named
   * tier count). An explicit escape hatch, not automatic date/tier
   * detection — the caller states what boilerplate is legitimate; this
   * module never guesses.
   */
  readonly boilerplate?: readonly number[];
  /** Absolute tolerance for matching a numeral to an allowed/derived value. Default 0.1 (matches numeric-guard.ts's convention). */
  readonly tolerance?: number;
}

/**
 * A whitelisted transform from base facts to additional legitimate values —
 * e.g. American odds -> implied win percentage, or a spread's sign flip for
 * the other side of the same line. Applied over ALL of `facts.numbers`, so
 * only pass a derivation when every number in `facts.numbers` is a value
 * that transform legitimately applies to (e.g. don't pass
 * `americanOddsToImpliedPercent` alongside a facts list that mixes odds with
 * unrelated team scores — every number in the list gets transformed).
 */
export type Derivation = (facts: readonly number[]) => readonly number[];

export interface NumeralAudit {
  readonly ok: boolean;
  readonly tokenCount: number;
  readonly fabricated: readonly NumeralToken[];
  /** facts.numbers + boilerplate + every derivation's output, deduped — for debugging/reporting what the audit actually allowed. */
  readonly allowedValues: readonly number[];
}

// Ordered so a more specific alternative is tried first at each match start:
// a percent's digits must not also fall through to the bare-integer branch,
// a record pair's digits must not fall through to decimal or integer, and a
// decimal's digits must not fall through to bare integer. `matchAll` never
// re-scans characters already consumed by an earlier match, so once one
// alternative wins at a position, the others can't also claim it.
//
// Percent/decimal/integer all capture an optional leading sign so a token's
// VALUE preserves the sign that appeared in the copy (a spread of "-3.5" or
// a moneyline of "-150" is common in this domain) -- record components stay
// unsigned, since "5-3" is a record separator, not a negative number. The
// negative lookbehinds keep a signed match anchored at a genuine token start
// (not preceded by another digit/sign/period), so this can't accidentally
// swallow part of an adjacent number.
const NUMERAL_RE = /(?<![\d.])([-+]?\d{1,3}(?:\.\d+)?)%|(\d{1,3})-(\d{1,3})\b|(?<![\d.])([-+]?\d{1,4}\.\d+)|(?<![\d.+-])([-+]?\d{1,4})\b/g;

/**
 * Extract every numeral token from `copy`, tagged by shape. Unlike
 * `numeric-guard.ts`'s `extractNumericClaims`, bare integers ARE extracted —
 * see the module docstring for why that's the correct default here.
 */
export function extractNumeralTokens(copy: string): readonly NumeralToken[] {
  const tokens: NumeralToken[] = [];
  for (const m of copy.matchAll(NUMERAL_RE)) {
    if (m[1] !== undefined) {
      tokens.push({ raw: m[0], value: Number(m[1]), kind: "percent", index: m.index });
    } else if (m[2] !== undefined && m[3] !== undefined) {
      tokens.push({ raw: m[2], value: Number(m[2]), kind: "record_component", index: m.index });
      tokens.push({ raw: m[3], value: Number(m[3]), kind: "record_component", index: m.index + m[2].length + 1 });
    } else if (m[4] !== undefined) {
      tokens.push({ raw: m[4], value: Number(m[4]), kind: "decimal", index: m.index });
    } else if (m[5] !== undefined) {
      tokens.push({ raw: m[5], value: Number(m[5]), kind: "integer", index: m.index });
    }
  }
  return tokens;
}

/** Negate every fact — a spread quoted from the other side flips sign (e.g. facts hold -3.5, copy legitimately says "+3.5" or "3.5-point underdog"). */
export function signFlip(facts: readonly number[]): readonly number[] {
  return facts.map((f) => -f);
}

/**
 * American odds -> implied win probability, on the same 0-100 scale the
 * percent extractor parses (so a derived value can ground a "%" token
 * directly). Non-finite or zero-magnitude inputs are skipped (not valid
 * American odds), not thrown on — a derivation only ADDS candidate allowed
 * values, so an unusable input for this transform is silently absent from
 * its output rather than failing the whole audit.
 */
export function americanOddsToImpliedPercent(facts: readonly number[]): readonly number[] {
  const out: number[] = [];
  for (const odds of facts) {
    if (!Number.isFinite(odds) || odds === 0) continue;
    const prob = odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100);
    out.push(prob * 100);
  }
  return out;
}

/**
 * Audit every numeral in `copy`: grounded means present in `facts.numbers`,
 * `facts.boilerplate`, or any `derivations` output, within `facts.tolerance`
 * (default 0.1). Anything else is reported as fabricated — this module
 * makes no severity judgment (that is the caller's / content-safety.ts's
 * job); it only tells the truth about what is and isn't traceable to the
 * structured input.
 */
export function auditNumerals(
  copy: string,
  facts: SourceFacts,
  derivations: readonly Derivation[] = [],
): NumeralAudit {
  const tolerance = facts.tolerance ?? 0.1;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError(`auditNumerals: facts.tolerance must be finite and >= 0, got ${tolerance}`);
  }
  const derived = derivations.flatMap((d) => d(facts.numbers));
  const allowedValues = [...new Set([...facts.numbers, ...(facts.boilerplate ?? []), ...derived])];

  const isGrounded = (v: number) => allowedValues.some((a) => Math.abs(a - v) <= tolerance);
  const tokens = extractNumeralTokens(copy);
  const fabricated = tokens.filter((t) => !isGrounded(t.value));

  return {
    ok: fabricated.length === 0,
    tokenCount: tokens.length,
    fabricated,
    allowedValues,
  };
}
