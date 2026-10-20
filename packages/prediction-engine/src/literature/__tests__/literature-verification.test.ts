/**
 * @file __tests__/literature-verification.test.ts
 * The L1-L4 admission gates must be able to FAIL.
 *
 * WHY THIS TEST EXISTS (2026-10-20)
 *
 * The repo already had an L1-L4 admission gate audit
 * (`scripts/audit-l1-l4-admission-gates.ts`). It reported 67.4%
 * admission over the 5,149-record MIND corpus, and it reported that
 * number by checking SHAPE, not TRUTH:
 *
 *   L1  the quote is non-empty and >= 10 characters
 *   L2  the quote contains the number OR contains a UNIT WORD
 *   L3  end_char > start_char
 *   L4  the fields are in the vocabulary and the mechanism quote is
 *       non-empty
 *
 * None of those opens the source document. Checked against the actual
 * source files, the corpus scores 0/5,149 on a truthful gate: no
 * record's claimed character offsets select its own quote.
 *
 * A gate that cannot fail is worse than no gate, because it produces a
 * number that looks like verification.
 *
 * So these tests pin the gate to the behaviour that makes it a gate.
 */
import { describe, it, expect } from "vitest";
import {
  CONTROLLED_VOCABULARY_16_KEYS,
  checkL1Provenance,
  checkL2NumericContainment,
  checkL3SpanAnchoring,
  checkL4MechanismEntailment,
  verifyRecord,
  verifyCorpus,
  type VerifiableRecord,
} from "../literature-verification.js";

const DOC = "The team ran 42 plays. Separation averaged 1.4 yards over expected.";

function rec(over: Partial<VerifiableRecord> = {}): VerifiableRecord {
  return {
    item_id: "test:1",
    title: "A Title",
    source_file: "doc.md",
    evidence_quote: "Separation averaged 1.4 yards over expected.",
    mechanism_quote: "The team ran 42 plays.",
    evidence_span: { start_char: 23, end_char: 67, verification_tier: "MSVH_S1_EXACT" },
    numeric_claim: { value: 1.4, unit: "yards", metric: "separation_over_expected" },
    parsed_float_magnitude: 1.4,
    applicable_context_fields: ["offensive_pace_sec_per_play"],
    ...over,
  };
}

const lib = new Map([["doc.md", DOC]]);

describe("L1 verbatim provenance", () => {
  it("passes when the quote is in the source document", () => {
    expect(checkL1Provenance(rec(), DOC)).toBe(true);
  });

  it("fails when the quote is NOT in the source document", () => {
    // THE CASE THAT MATTERS. A quote that exists in no document is
    // fabricated provenance.
    expect(
      checkL1Provenance(rec({ evidence_quote: "A quote from a paper that was never here." }), DOC),
    ).toBe(false);
  });

  it("fails when the source document is missing entirely", () => {
    expect(checkL1Provenance(rec(), undefined)).toBe(false);
  });

  it("does NOT rescue a quote that only matches after whitespace normalisation", () => {
    // MEASURED: 0 of the 3,509 absent quotes are recovered by
    // whitespace normalisation, so normalising would only hide the
    // failure.
    const doc = "Separation   averaged\n1.4 yards over expected.";
    expect(checkL1Provenance(rec(), doc)).toBe(false);
  });

  it("rejects a quote shorter than 10 characters", () => {
    expect(checkL1Provenance(rec({ evidence_quote: "short" }), DOC)).toBe(false);
  });
});

describe("L2 numeric containment", () => {
  it("passes when the number is literally in the quote", () => {
    expect(checkL2NumericContainment(rec())).toBe(true);
  });

  it("fails when the number is absent EVEN THOUGH the quote contains a unit word", () => {
    // The existing gate accepts this, because it accepts a quote
    // containing "yards". MEASURED: 1,704 records pass the existing L2
    // on a unit word alone.
    expect(
      checkL2NumericContainment(
        rec({
          evidence_quote: "blocker survival past 2.5 seconds under pressure",
          numeric_claim: { value: 0.25 },
          parsed_float_magnitude: 0.25,
        }),
      ),
    ).toBe(false);
  });

  it("accepts the number in an alternative but legitimate form", () => {
    expect(
      checkL2NumericContainment(
        rec({ evidence_quote: "averaged 1.40 yards over expected", parsed_float_magnitude: 1.4 }),
      ),
    ).toBe(true);
  });

  it("accepts an integer written without a decimal point", () => {
    expect(
      checkL2NumericContainment(
        rec({ evidence_quote: "averaged 2 yards over expected", parsed_float_magnitude: 2.0 }),
      ),
    ).toBe(true);
  });
});

describe("L3 character-span anchoring", () => {
  it("passes when the offsets actually select the quote", () => {
    const d = "XXSeparation averaged 1.4 yards over expected.";
    const r = rec({
      evidence_span: { start_char: 2, end_char: 46, verification_tier: "MSVH_S1_EXACT" },
    });
    expect(checkL3SpanAnchoring(r, d)).toBe(true);
  });

  it("fails when the offsets point somewhere else", () => {
    // The existing gate accepts this, because it only checks
    // end_char > start_char.
    const r = rec({ evidence_span: { start_char: 0, end_char: 19 } });
    expect(checkL3SpanAnchoring(r, DOC)).toBe(false);
  });

  it("fails when the offsets run past the end of the document", () => {
    const r = rec({ evidence_span: { start_char: 0, end_char: 999999 } });
    expect(checkL3SpanAnchoring(r, DOC)).toBe(false);
  });

  it("fails when there is no span at all", () => {
    expect(checkL3SpanAnchoring(rec({ evidence_span: null }), DOC)).toBe(false);
  });

  it("is not fooled by a verification_tier label", () => {
    // MEASURED: all 5,149 corpus records carry tier MSVH_S1_EXACT, and
    // 0 of their offsets select their own quote. The tier is a label,
    // not a check.
    const r = rec({ evidence_span: { start_char: 0, end_char: 5, verification_tier: "MSVH_S1_EXACT" } });
    expect(checkL3SpanAnchoring(r, DOC)).toBe(false);
  });
});

describe("L4 mechanism entailment", () => {
  it("passes when the vocabulary holds and the mechanism quote is in the source", () => {
    expect(checkL4MechanismEntailment(rec(), DOC)).toBe(true);
  });

  it("fails when a field is outside the controlled vocabulary", () => {
    expect(
      checkL4MechanismEntailment(rec({ applicable_context_fields: ["not_a_real_key"] }), DOC),
    ).toBe(false);
  });

  it("fails when the mechanism quote is not in the source document", () => {
    // A mechanism quote that is not in the document cannot entail a
    // mechanism, because it is not a quotation of one.
    expect(
      checkL4MechanismEntailment(rec({ mechanism_quote: "A mechanism nobody wrote." }), DOC),
    ).toBe(false);
  });

  it("fails when there are no context fields at all", () => {
    expect(checkL4MechanismEntailment(rec({ applicable_context_fields: [] }), DOC)).toBe(false);
  });

  it("holds a closed vocabulary of 16 keys", () => {
    expect(CONTROLLED_VOCABULARY_16_KEYS.size).toBe(16);
  });
});

describe("the gate as a whole", () => {
  it("admits a fully verified record", () => {
    const d = "XXSeparation averaged 1.4 yards over expected. The team ran 42 plays.";
    const r = rec({
      evidence_quote: "Separation averaged 1.4 yards over expected.",
      mechanism_quote: "The team ran 42 plays.",
      evidence_span: { start_char: 2, end_char: 46 },
    });
    const v = verifyRecord(r, new Map([["doc.md", d]]));
    expect(v.admitted).toBe(true);
    expect(v.failed_layers).toEqual([]);
    expect(v.rejection_reason).toBeNull();
  });

  it("rejects a record whose quote is not in the source, naming L1", () => {
    const v = verifyRecord(
      rec({ evidence_quote: "A quote that is in no document at all, ever." }),
      lib,
    );
    expect(v.admitted).toBe(false);
    expect(v.rejection_reason).toBe("REJECTED_L1_PROVENANCE");
    expect(v.failed_layers).toContain("L1_PROVENANCE");
  });

  it("computes every layer INDEPENDENTLY rather than short-circuiting", () => {
    // A record that fails L1 AND L3 must report BOTH, so a report can
    // say how deep the failure goes.
    const v = verifyRecord(
      rec({ evidence_quote: "A quote that is in no document at all, ever." }),
      lib,
    );
    expect(v.failed_layers).toContain("L1_PROVENANCE");
    expect(v.failed_layers).toContain("L3_SPAN");
  });

  it("summarises a corpus with per-layer counts", () => {
    const { summary } = verifyCorpus(
      [
        rec({ item_id: "a" }),
        rec({ item_id: "b", evidence_quote: "Not in the document at all here." }),
      ],
      lib,
    );
    expect(summary.total).toBe(2);
    // The first record is fully verified and IS admitted; the second
    // has a quote that is in no document and is rejected at L1.
    expect(summary.admitted).toBe(1);
    expect(summary.l1_passed).toBe(1);
    expect(summary.failed_layer_counts.L1_PROVENANCE).toBe(1);
  });
});
