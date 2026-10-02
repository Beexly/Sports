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
 * ---------------------------------------------------------------------------
 * WHY THIS FILE MATCHES MEANING, NOT VALUES
 * ---------------------------------------------------------------------------
 * The first version of this guard compared VALUES only:
 *
 *     grounding.allowed.some((a) => Math.abs(a - v) <= tolerance)
 *
 * Any number that appeared anywhere in the grounding text whitelisted that value
 * in ANY context. Against a real `buildGroundedContext` block — flattened to the
 * allowed set `[0, 1.5, 1.9, 2.4, 4.2, 6, 6.1, 14, 18, 22, 54.3, 61.2]` — every
 * one of these fabrications PASSED and would have been returned verbatim to a
 * paying reader by `POST /api/picks/[id]/explain`:
 *
 *   "The Chiefs have covered in 61.2% of similar spots"
 *        61.2 was the independent-edge TRUE PROBABILITY. Spent as a hit rate.
 *   "ATS form carries a 2.4% historical hit premium"
 *        2.4 was a signed FACTOR WEIGHT (+2.4). Spent as a percentage.
 *   "This side wins 54.3% of the time historically"
 *        54.3 was the MARKET FAIR PROBABILITY. Spent as a win rate.
 *   "Similar spots have returned 6.1% above the market"
 *        6.1 entered the allowed set from the MODEL VERSION STRING `v6.1.0`.
 *
 * So: every number now carries a KIND, and a value may only be spent as the kind
 * it was grounded as. A probability cannot satisfy a hit-rate claim; a factor
 * weight cannot satisfy a percentage claim; a version string grounds nothing.
 *
 * The classifier is deliberately narrow and FAILS CLOSED: a percent whose role
 * cannot be read from its label is `percent_unknown`, which grounds nothing and
 * is never satisfied. An unclassifiable number is exactly the case that bit us.
 *
 * The cost of failing closed is a higher `UNGROUNDED_NUMERIC` rate on legitimate
 * copy whose wording sits outside `ROLE_MARKERS`. Every caller treats that as a
 * generation failure (retry / fall back), never as a publish — so the failure
 * direction is safe. Widen a lexicon when a real surface trips on real copy;
 * never widen `COMPATIBLE_KINDS`.
 *
 * Pure, no I/O. Callers reject (or human-review) any output that isn't grounded.
 */

/**
 * The meaning a number carries. A claim may only be satisfied by a grounded
 * value of a COMPATIBLE kind (see `COMPATIBLE_KINDS`).
 *
 * Percent family (a number written with a `%`), split by the role its label gives it:
 *  - `probability` — a stated forward probability (market fair, implied, true, estimated)
 *  - `rate`        — an OBSERVED historical frequency (hit rate, cover rate, "of the time")
 *  - `share`       — a proportion of a population (consensus, books, bootstrap share)
 *  - `delta`       — a calibration difference (delta, over/underconfident)
 *  - `percent_unknown` — role not determinable → grounds nothing, never satisfied
 *
 * Non-percent:
 *  - `magnitude` — a signed or bare decimal: factor weights, lines, totals, point deltas
 *  - `money`     — a `$` amount
 *  - `record`    — one side of a W-L record (12-4)
 *  - `count`     — an integer tally supplied by the caller (wins, losses, settled picks)
 *  - `version`   — digits inside a version string (`v6.1.0`) → NEVER a stat, NEVER grounds
 *  - `date`      — digits inside a date/timestamp → NEVER a stat, NEVER grounds
 */
export type NumericKind =
  | "probability"
  | "rate"
  | "share"
  | "delta"
  | "percent_unknown"
  | "magnitude"
  | "money"
  | "record"
  | "count"
  | "version"
  | "date";

export interface NumericClaim {
  readonly raw: string;
  readonly value: number;
  readonly kind: NumericKind;
}

/** A number the copy is allowed to state, together with the meaning it was grounded as. */
export interface GroundedValue {
  readonly value: number;
  readonly kind: NumericKind;
}

export interface GroundingSet {
  /**
   * The grounding TEXT the copy was generated from. Values are extracted AND
   * typed from their labels here — callers must not pre-flatten this to bare
   * numbers, because flattening is exactly what discarded the meaning.
   */
  readonly text?: string;
  /**
   * Structured values the caller holds directly (e.g. real weekly win/loss
   * counts), each explicitly typed. Use this instead of splicing numbers into
   * a string.
   */
  readonly values?: readonly GroundedValue[];
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

/**
 * Spans whose digits are never statistics. Anything matched INSIDE one of these
 * is tagged `date` / `version` and is dropped from both the claim set and the
 * grounding set.
 *
 * `v6.1.0` contributing 6.1 to the allowed set is pure noise with no legitimate
 * use — it is how "similar spots have returned 6.1%" passed the old guard.
 * Timestamps are the same problem in the other direction: the fractional seconds
 * of `2026-01-17T12:00:00.000Z` used to donate `0`, and `01-17` used to donate a
 * 1-17 "record".
 */
const DATE_SPAN_RE =
  /\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*Z?)?|\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b/g;
const VERSION_SPAN_RE = /\bv\d+(?:\.\d+)+|\b\d+\.\d+\.\d+(?:\.\d+)*/gi;

/**
 * Which grounded kinds can satisfy a claim of a given kind. Same-kind only, with
 * one deliberate pairing: a W-L record in the copy may be satisfied by the real
 * integer tallies a caller supplies (`count`), since "7-4" IS wins=7, losses=4.
 *
 * `percent_unknown`, `version` and `date` satisfy nothing — fail closed.
 */
const COMPATIBLE_KINDS: Readonly<Record<NumericKind, readonly NumericKind[]>> = {
  probability: ["probability"],
  rate: ["rate"],
  share: ["share"],
  delta: ["delta"],
  percent_unknown: [],
  magnitude: ["magnitude"],
  money: ["money"],
  record: ["record", "count"],
  count: ["count", "record"],
  version: [],
  date: [],
};

/** Kinds that are not statistics at all — never claims, never grounding. */
const NON_STAT_KINDS: ReadonlySet<NumericKind> = new Set<NumericKind>(["version", "date"]);

type PercentRole = "rate" | "probability" | "delta" | "share";

/**
 * Role markers for the percent family, in tie-break priority order (most
 * conservative first). The lexicons are fitted to the vocabulary this product's
 * own grounding builders and prompts actually emit — they are not meant to be a
 * general-purpose classifier.
 */
const ROLE_MARKERS: ReadonlyArray<{ readonly role: PercentRole; readonly re: RegExp }> = [
  {
    role: "rate",
    re: /\b(?:hit|hits|hitting|cover|covers|covered|covering|win|wins|winning|won|lose|loses|lost|record|ats|straight up|of the time|historical|historically|all-?time|rate|rates|actual|actuals|observed|measured|realized|realised|accuracy|clip|similar spots|this season|career)\b/gi,
  },
  {
    role: "probability",
    re: /\b(?:probability|probabilities|prob|chance|chances|likelihood|likely|implied|implies|imply|fair|no-?vig|de-?vig|true|estimate|estimated|estimating|projected|projection|independent|confidence|band|midpoint|call|calls|called|calling|rated|rating|stated)\b/gi,
  },
  {
    role: "delta",
    re: /\b(?:delta|deltas|over-?confident|under-?confident|miscalibrat\w*|calibration|calibrated|off by|drift)\b/gi,
  },
  {
    role: "share",
    re: /\b(?:share|shares|consensus|books|bookmaker|bookmakers|coverage|bootstrap|agreement|quality|sample|portion|proportion|signals|split|slate)\b/gi,
  },
];

/** How far around a percent we look for its label. Deliberately tight. */
const WINDOW_BEFORE = 48;
const WINDOW_AFTER = 28;

/** Cut the backward window at the nearest clause/field boundary or preceding number. */
function trimBeforeWindow(s: string): string {
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s.charAt(i);
    if (isBoundaryChar(ch) || isDigit(ch)) return s.slice(i + 1);
  }
  return s;
}

/** Cut the forward window at the nearest clause/field boundary, sentence end, or next number. */
function trimAfterWindow(s: string): string {
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (isBoundaryChar(ch) || isDigit(ch)) return s.slice(0, i);
    if (ch === "." && (i + 1 >= s.length || s.charAt(i + 1) === " ")) return s.slice(0, i);
  }
  return s;
}

function isBoundaryChar(ch: string): boolean {
  return ch === "\n" || ch === ";" || ch === "|" || ch === "," || ch === "%" || ch === "·" || ch === "(" || ch === ")";
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

/**
 * Read a percent's role from the label nearest to it. The NEAREST marker wins —
 * so "your 65% band actually hit 72%" reads 65 off "band" (probability) rather
 * than off the "hit" that belongs to the next number. Ties break toward `rate`,
 * the fabrication vector. No marker in range → `percent_unknown` (fail closed).
 */
function classifyPercentRole(text: string, start: number, end: number): NumericKind {
  const before = trimBeforeWindow(text.slice(Math.max(0, start - WINDOW_BEFORE), start));
  const after = trimAfterWindow(text.slice(end, end + WINDOW_AFTER));

  let bestRole: PercentRole | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestRank = Number.POSITIVE_INFINITY;

  const consider = (role: PercentRole, distance: number, rank: number): void => {
    if (distance < bestDistance || (distance === bestDistance && rank < bestRank)) {
      bestRole = role;
      bestDistance = distance;
      bestRank = rank;
    }
  };

  for (let rank = 0; rank < ROLE_MARKERS.length; rank++) {
    const marker = ROLE_MARKERS[rank];
    if (!marker) continue;
    for (const m of before.matchAll(marker.re)) {
      consider(marker.role, before.length - ((m.index ?? 0) + m[0].length), rank);
    }
    for (const m of after.matchAll(marker.re)) {
      consider(marker.role, m.index ?? 0, rank);
    }
  }

  return bestRole ?? "percent_unknown";
}

interface Span {
  readonly start: number;
  readonly end: number;
  readonly kind: NumericKind;
}

function nonStatSpans(text: string): Span[] {
  const spans: Span[] = [];
  for (const m of text.matchAll(DATE_SPAN_RE)) {
    spans.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, kind: "date" });
  }
  for (const m of text.matchAll(VERSION_SPAN_RE)) {
    spans.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, kind: "version" });
  }
  return spans;
}

function spanKindAt(spans: readonly Span[], index: number): NumericKind | null {
  for (const span of spans) {
    if (index >= span.start && index < span.end) return span.kind;
  }
  return null;
}

/**
 * Extract stat-shaped numbers (percentages, decimals, records) and classify the
 * MEANING of each. Pure.
 *
 * Numbers inside a version string or a timestamp come back tagged `version` /
 * `date`: they are reported for transparency but are neither claims nor grounding.
 */
export function extractNumericClaims(text: string): NumericClaim[] {
  const claims: NumericClaim[] = [];
  const spans = nonStatSpans(text);

  for (const m of text.matchAll(PERCENT_RE)) {
    const start = m.index ?? 0;
    const nonStat = spanKindAt(spans, start);
    claims.push({
      raw: m[0],
      value: Number(m[1]),
      kind: nonStat ?? classifyPercentRole(text, start, start + m[0].length),
    });
  }

  for (const m of text.matchAll(RECORD_RE)) {
    const start = m.index ?? 0;
    const kind = spanKindAt(spans, start) ?? "record";
    claims.push({ raw: m[0], value: Number(m[1]), kind });
    claims.push({ raw: m[0], value: Number(m[2]), kind });
  }

  for (const m of text.matchAll(DECIMAL_RE)) {
    const start = m.index ?? 0;
    const nonStat = spanKindAt(spans, start);
    const isMoney = start > 0 && text.charAt(start - 1) === "$";
    claims.push({ raw: m[0], value: Number(m[1]), kind: nonStat ?? (isMoney ? "money" : "magnitude") });
  }

  return claims;
}

/**
 * The numbers a piece of grounding text legitimately makes available, each with
 * the meaning its label gives it.
 *
 * Version/date digits are excluded outright. So is a percent whose role could
 * not be read — an unlabelled percentage in a grounding block grounds nothing;
 * label it (e.g. "consensus 64%", "market fair probability 54.3%") if the copy
 * is meant to be able to restate it.
 */
export function extractGroundedValues(text: string): GroundedValue[] {
  return extractNumericClaims(text)
    .filter((c) => COMPATIBLE_KINDS[c.kind].length > 0)
    .map((c) => ({ value: c.value, kind: c.kind }));
}

/** True when a grounded value of `groundedKind` may satisfy a claim of `claimKind`. */
export function kindsAreCompatible(claimKind: NumericKind, groundedKind: NumericKind): boolean {
  return COMPATIBLE_KINDS[claimKind].includes(groundedKind);
}

/**
 * Validate that every stat-shaped number in the copy is grounded in the payload
 * AS THE KIND IT IS BEING USED. Fails closed: a claim whose kind cannot be
 * determined is ungrounded.
 */
export function validateNumericClaims(text: string, grounding: GroundingSet): NumericValidation {
  const tolerance = grounding.tolerance ?? 0.1;
  const grounded: readonly GroundedValue[] = [
    ...(grounding.text === undefined ? [] : extractGroundedValues(grounding.text)),
    ...(grounding.values ?? []),
  ];

  const claims = extractNumericClaims(text).filter((c) => !NON_STAT_KINDS.has(c.kind));
  const isGrounded = (claim: NumericClaim): boolean =>
    grounded.some(
      (g) => kindsAreCompatible(claim.kind, g.kind) && Math.abs(g.value - claim.value) <= tolerance,
    );

  const ungrounded = claims.filter((c) => !isGrounded(c));
  return {
    grounded: ungrounded.length === 0,
    claimCount: claims.length,
    ungrounded,
  };
}
