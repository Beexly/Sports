/**
 * Invariant tests for the numeric-claims guard — the "trust-brand safety net"
 * for the content lane. Five product paths call this module
 * (`lib/content-generator.ts`, `lib/journal/claude.ts`,
 * `lib/pick-explainer/policy.ts`, `lib/calibration-training/claude.ts`,
 * `lib/intelligence-graph/model-court/answer.ts`), and the failure it exists to
 * prevent is a fabricated statistic reaching a paying reader. Four tests covered
 * only the happy path.
 *
 * Pure, no I/O: `extractNumericClaims` is regex-only and `validateNumericClaims`
 * is arithmetic over an injected `allowed` list, so every case here is a literal
 * string in, a literal verdict out. Nothing is mocked and no product data is
 * invented.
 *
 * KIND VOCABULARY (migrated; read before "fixing" a test that looks wrong):
 * The kind union was split from the original `percent`/`decimal` pair into the
 * role-aware taxonomy the module now ships — percent-family
 * `probability`/`rate`/`share`/`delta`/`percent_unknown` (role read from the
 * nearest label; no readable role → `percent_unknown`, which grounds nothing),
 * and `decimal` renamed `magnitude`. This file was migrated with that change;
 * the pins below assert the CURRENT taxonomy, verified against the live
 * extractor, not against the old names.
 *
 * WHAT THIS FILE RECORDS (read before "fixing" a test that looks wrong):
 * Three of these tests assert behaviour that is a genuine HOLE, not a design
 * choice, and they are pinned as failing-if-changed rather than as passing
 * assertions of the desired behaviour. Each names the exact reason the guard
 * misses the claim:
 *
 *   1. NEGATED PERCENT is validated as its POSITIVE magnitude. `-5%` extracts
 *      `{raw: "5%", value: 5, kind: "percent_unknown"}` — `PERCENT_RE` starts
 *      matching at the digit, so the sign never enters the claim. A payload
 *      containing `-5` therefore FAILS a copy saying "-5%", and a payload
 *      containing `5` PASSES it (the `allowed` path grounds on VALUE only).
 *      This is the worst of the three: a hallucinated NEGATIVE stat grounded
 *      against a positive source number is a false PASS, which is the exact
 *      outcome the module's own header calls brand-killing.
 *   2. NEGATIVE DECIMALS ARE INVISIBLE. `DECIMAL_RE`'s lookbehind is
 *      `(?<![\d.-])`, and `-` is in that class, so `-19.3` extracts NOTHING. A
 *      hallucinated "-19.3 edge" is never checked at all.
 *   3. THOUSAND-PERCENT values are invisible: `PERCENT_RE` allows only 1-3
 *      digits, so "1000%" is skipped while "999%" is caught.
 *
 * A fourth hole — DATES AND VERSION STRINGS read as stats — was CLOSED when the
 * kind taxonomy landed: date/version spans are now tagged `date`/`version` and
 * are dropped from validation and grounding. It is re-recorded below under
 * CLOSED HOLES as a guard that it stays shut, not as an open defect.
 *
 * None of the open holes are changed here. Fixing the regexes changes which copy
 * reaches a paying reader on five paths, which is a behaviour change for the
 * owner to authorize, not a test-authoring decision. What this file guarantees
 * is that the moment anyone does change them, these tests fail loudly and name
 * the hole instead of the hole silently closing.
 */

import { describe, expect, it } from "vitest";
import { extractNumericClaims, validateNumericClaims } from "@/lib/claude-api/numeric-guard";

/** Compact `kind:value` projection so a failure names the claim that moved. */
const shape = (text: string): string[] => extractNumericClaims(text).map((c) => `${c.kind}:${c.value}`);

describe("extractNumericClaims — classification", () => {
  it("classifies each stat shape by role: rate, record or magnitude", () => {
    // "win rate" is a role marker, so the percent reads as an OBSERVED rate;
    // a bare decimal is a magnitude. Verified against the live extractor.
    expect(shape("62% win rate, a 12-4 record, line 27.5.")).toEqual(["rate:62", "record:12", "record:4", "magnitude:27.5"]);
  });

  it("ignores bare integers, which are prose counts and not stats", () => {
    // "3 picks" / "2 games" must not be claims: the module header says bare
    // integers are ignored to avoid false positives on ordinary copy.
    expect(shape("We published 3 picks across 2 games.")).toEqual([]);
  });

  it("emits one claim PER record component, and both share the record's raw text", () => {
    // `raw` is the matched token, not the component, so a consumer that shows
    // `raw` to a human shows "12-4" twice. Pinned because a future "fix" that
    // makes `raw` component-specific would change any UI built on it.
    const claims = extractNumericClaims("team 12-4");
    expect(claims).toEqual([
      { raw: "12-4", value: 12, kind: "record" },
      { raw: "12-4", value: 4, kind: "record" },
    ]);
  });

  it("reads only the first two components of a three-part record", () => {
    // "12-4-2" yields 12 and 4; the trailing 2 is not a claim. Verified against
    // the source, not assumed from the regex.
    expect(shape("team 12-4-2")).toEqual(["record:12", "record:4"]);
  });

  it("counts a percentage ONCE, and never also as a magnitude", () => {
    // The magnitude pattern carries a `(?!%)` negative lookahead precisely so
    // "62.5%" is not ALSO claimed as the magnitude 62.5. Found by the red
    // check: removing that lookahead leaves every verdict in this file
    // unchanged (the duplicate has the same value, so it grounds or fails
    // identically) and the ONLY observable difference is claimCount 2 -> 3.
    // Without this test the guard is untested.
    const text = "62.5% of games, edge 3.5";
    expect(shape(text)).toEqual(["percent_unknown:62.5", "magnitude:3.5"]);
    expect(validateNumericClaims(text, { allowed: [62.5, 3.5] })).toEqual({
      grounded: true,
      claimCount: 2,
      ungrounded: [],
    });
  });

  it("is deterministic: identical text yields an identical claim list", () => {
    const text = "52% and 12-4 and 3.5";
    expect(extractNumericClaims(text)).toEqual(extractNumericClaims(text));
  });

  it("returns no claims for empty text", () => {
    expect(extractNumericClaims("")).toEqual([]);
  });
});

describe("extractNumericClaims — RECORDED HOLES, pinned as-is", () => {
  it("HOLE 1: a negated percentage is extracted as its positive magnitude", () => {
    // `PERCENT_RE` = /\b(\d{1,3}(?:\.\d+)?)%/g matches at the digit, so the
    // minus sign never enters the claim. Asserted as-is: this test fails loudly
    // if the regex is fixed, which is the point. The extracted kind is
    // percent_unknown (no readable role) — which grounds nothing through
    // kind-aware text grounding, but still passes through value-only `allowed`
    // grounding; see the false-PASS describe below.
    expect(shape("a -5% regression")).toEqual(["percent_unknown:5"]);
  });

  it("HOLE 2: a negative decimal is invisible to the guard entirely", () => {
    // `DECIMAL_RE`'s lookbehind (?<![\d.-]) forbids a preceding "-", so "-19.3"
    // produces NO claim and is never validated. A hallucinated negative edge
    // sails through the one check meant to catch it.
    expect(shape("a -19.3 edge")).toEqual([]);
    expect(shape("expectedClv of -0.1742")).toEqual([]);
  });

  it("HOLE 3: a percentage above 999 is invisible (the pattern allows 1-3 digits)", () => {
    expect(shape("1000% and 999%")).toEqual(["percent_unknown:999"]);
  });

  it("strips a thousands separator and matches only the digits after it", () => {
    // "1,234.5" -> 234.5, because the comma is not in the number. Recorded
    // because a consumer building `allowed` from this same extractor would then
    // carry 234.5 and reject a copy quoting the true 1234.5.
    expect(shape("1,234.5 points")).toEqual(["magnitude:234.5"]);
  });
});

describe("extractNumericClaims — CLOSED HOLES, guarded shut", () => {
  it("CLOSED (was HOLE 4): dates and version strings are tagged, never stats", () => {
    // The pre-taxonomy guard read "09-13" inside "2026-09-13" as a 9-13 record
    // and "2.0" inside "v2.0.1" as a decimal — false positives that rejected
    // honest copy quoting a date. The span pass now tags these digits
    // `date`/`version`; they stay visible in the claim list (so a reader sees
    // what was skipped) but validateNumericClaims drops them and they ground
    // nothing. Pinned from both directions: the tags stay tags, and honest
    // date/version copy VALIDATES clean.
    expect(shape("as of 2026-09-13")).toEqual(["date:9", "date:13"]);
    expect(shape("v2.0.1")).toEqual(["version:2"]);
    expect(validateNumericClaims("as of 2026-09-13, running v2.0.1", { allowed: [] })).toEqual({
      grounded: true,
      claimCount: 0,
      ungrounded: [],
    });
  });
});

describe("validateNumericClaims — grounding", () => {
  it("grounds copy when every claim is in the payload", () => {
    // claimCount is 4, not 3: a record contributes TWO claims (12 and 4), so a
    // record costs twice a percent or a magnitude. Asserted explicitly because
    // that weighting is invisible at the call site — a caller doing
    // claimCount - ungrounded.length to count grounded claims must know it.
    const v = validateNumericClaims("Confidence 72%, line 27.5, recent form 12-4.", { allowed: [72, 27.5, 12, 4] });
    expect(v).toEqual({ grounded: true, claimCount: 4, ungrounded: [] });
  });

  it("reports the specific ungrounded claims, and count includes BOTH kinds", () => {
    // claimCount counts every claim; ungrounded counts only the failures. A
    // caller logging claimCount - ungrounded.length gets the grounded count.
    const v = validateNumericClaims("62% edge with a 3.5 line", { allowed: [62] });
    expect(v.grounded).toBe(false);
    expect(v.claimCount).toBe(2);
    expect(v.ungrounded).toEqual([{ raw: "3.5", value: 3.5, kind: "magnitude" }]);
  });

  it("is grounded when the copy has no stat-shaped numbers at all", () => {
    // The no-numbers case passes even with an empty payload. Load-bearing: an
    // empty `allowed` with no claims is "nothing to check", not "nothing allowed".
    expect(validateNumericClaims("A measured look at tonight's slate.", { allowed: [] })).toEqual({
      grounded: true,
      claimCount: 0,
      ungrounded: [],
    });
  });

  it("does NOT mutate the caller's allowed array", () => {
    // `validate` filters into a new array; a caller that reuses one `allowed`
    // list across a batch must not find it reordered or consumed.
    const allowed = [62, 3.5];
    validateNumericClaims("62% and 3.5", { allowed });
    expect(allowed).toEqual([62, 3.5]);
  });
});

describe("validateNumericClaims — tolerance", () => {
  it("defaults tolerance to 0.1 and treats the boundary as inclusive", () => {
    // <= not <, and default is 0.1. Exactly-at-boundary must pass or a rounding
    // difference in the payload would reject honest copy.
    expect(validateNumericClaims("72.1%", { allowed: [72] }).grounded).toBe(true);
    expect(validateNumericClaims("72.11%", { allowed: [72] }).grounded).toBe(false);
  });

  it("honours an explicit tolerance", () => {
    expect(validateNumericClaims("72.5%", { allowed: [72], tolerance: 0.5 }).grounded).toBe(true);
    expect(validateNumericClaims("72.5%", { allowed: [72], tolerance: 0.4 }).grounded).toBe(false);
  });

  it("grounds across kinds: a percent claim matches a decimal payload value", () => {
    // `allowed`-array grounding is on VALUE only; `kind` is carried for the
    // reader and is never compared against an allowed number. (Grounding from
    // grounded TEXT/VALUES is kind-aware via COMPATIBLE_KINDS — that path is
    // pinned in the module's own suite, not here.) Pinned so a future
    // kind-aware `allowed` matcher is a deliberate change.
    expect(validateNumericClaims("72%", { allowed: [72.05] }).grounded).toBe(true);
  });

  it("a negative tolerance grounds nothing — fail-closed, not fail-open", () => {
    // |a-v| <= -1 is unsatisfiable, so every claim is ungrounded. Verified: a
    // negative tolerance must NOT be read as "disable the check".
    const v = validateNumericClaims("72%", { allowed: [72], tolerance: -1 });
    expect(v.grounded).toBe(false);
    expect(v.ungrounded).toHaveLength(1);
  });

  it("a NaN in the payload grounds nothing rather than matching everything", () => {
    // Math.abs(NaN - v) is NaN and NaN <= tolerance is false. The fail-closed
    // outcome is intentional; asserted so it cannot be "fixed" into a match.
    expect(validateNumericClaims("72%", { allowed: [Number.NaN] }).grounded).toBe(false);
  });

  it("an empty payload with a claim is ungrounded", () => {
    const v = validateNumericClaims("88% hit rate", { allowed: [] });
    expect(v.grounded).toBe(false);
    expect(v.ungrounded).toEqual([{ raw: "88%", value: 88, kind: "rate" }]);
  });
});

describe("validateNumericClaims — the false PASS, pinned as-is", () => {
  it("HOLE 1 consequence: '-5%' is grounded by a payload holding +5", () => {
    // The single most important line in this file. The guard's purpose is to
    // reject fabricated numbers; here a fabricated NEGATIVE stat is validated
    // against a positive source value and PASSES. Not fixed here (it changes
    // which copy reaches a paying reader on five paths); pinned so it cannot be
    // forgotten. See the header for the owner's call.
    expect(validateNumericClaims("-5% regression", { allowed: [5] }).grounded).toBe(true);
  });

  it("HOLE 1 consequence: the same copy is REJECTED when the payload holds -5", () => {
    // The mirror image, and it is what makes hole 1 a defect rather than a
    // convention: the honest payload (-5, e.g. an edge or a spread) fails while
    // the wrong one (5) passes. A source payload of -5 is exactly what the
    // pick-explainer and model-court paths feed in.
    expect(validateNumericClaims("-5% regression", { allowed: [-5] }).grounded).toBe(false);
  });

  it("HOLE 2 consequence: an ungrounded negative decimal is never reported", () => {
    // No claim exists, so `ungrounded` is empty and `grounded` is true. A caller
    // auditing the result sees a clean pass for copy that contains a number
    // nobody checked.
    const v = validateNumericClaims("a -19.3 edge", { allowed: [72, 27.5] });
    expect(v).toEqual({ grounded: true, claimCount: 0, ungrounded: [] });
  });
});
