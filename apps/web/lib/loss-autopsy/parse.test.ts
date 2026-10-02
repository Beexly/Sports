import { describe, it, expect } from "vitest";
import { parseLossAutopsyDraft } from "./parse";

const CITE = "(source: signal_snapshot at 2026-04-15T17:00:00.000Z)";

function valid(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    headline: "Consensus pick lost to a late swing, but the close confirmed the read",
    whatWeSaw: `An 84% bookmaker consensus and a confirming line move ${CITE}.`,
    whatHappened: "The side lost outright; closing-line value was still positive.",
    whatWeLearned: "Process held; this reads as variance, not a model miss.",
    rootCause: "VARIANCE",
    lessonTags: ["variance", "positive-clv"],
    ...overrides,
  });
}

describe("parseLossAutopsyDraft", () => {
  it("accepts a well-formed, grounded, advice-free draft", () => {
    const res = parseLossAutopsyDraft(valid());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.draft.rootCause).toBe("VARIANCE");
      expect(res.draft.lessonTags).toEqual(["variance", "positive-clv"]);
    }
  });

  it("tolerates a ```json code fence", () => {
    const res = parseLossAutopsyDraft("```json\n" + valid() + "\n```");
    expect(res.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const res = parseLossAutopsyDraft("not json");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failures).toContain("INVALID_JSON");
  });

  it("rejects an unknown root cause", () => {
    const res = parseLossAutopsyDraft(valid({ rootCause: "BAD_LUCK" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failures).toContain("INVALID_ROOT_CAUSE");
  });

  it("requires a grounding citation in the body", () => {
    const res = parseLossAutopsyDraft(
      valid({ whatWeSaw: "An 84% consensus and a confirming line move." }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failures).toContain("MISSING_CITATION");
  });

  it("rejects empty sections", () => {
    const res = parseLossAutopsyDraft(valid({ whatWeLearned: "   " }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failures).toContain("EMPTY_SECTION");
  });

  it("rejects an over-long headline", () => {
    const res = parseLossAutopsyDraft(valid({ headline: "x".repeat(141) }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failures).toContain("HEADLINE_TOO_LONG");
  });

  it("rejects betting-advice language", () => {
    const res = parseLossAutopsyDraft(
      valid({ whatWeLearned: `You should bet the rebound next time ${CITE}.` }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failures).toContain("BANNED_LANGUAGE");
  });

  // REGRESSION (GAP 1): the autopsy body is rendered publicly on
  // /performance/losses/[id]. A stat the grounded context never stated must not
  // reach that page. draft.ts passes buildGroundedContext(...).context here.
  describe("UNGROUNDED_NUMERIC", () => {
    const GROUNDING = `Bookmaker consensus 84%. Closing line value 1.5 points. ${CITE}`;

    it("accepts a draft whose numbers all appear in the grounded context", () => {
      const res = parseLossAutopsyDraft(valid(), GROUNDING);
      expect(res.ok).toBe(true);
    });

    it("rejects a fabricated statistic the grounded context never stated", () => {
      const res = parseLossAutopsyDraft(
        valid({ whatHappened: `The side lost outright; they are now 3-9 as a road favorite ${CITE}.` }),
        GROUNDING,
      );
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failures).toContain("UNGROUNDED_NUMERIC");
    });

    it("rejects a fabricated percentage in the headline", () => {
      const res = parseLossAutopsyDraft(
        valid({ headline: "A 97% consensus still lost" }),
        GROUNDING,
      );
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failures).toContain("UNGROUNDED_NUMERIC");
    });

    it("leaves the no-grounding call path unchanged", () => {
      const res = parseLossAutopsyDraft(
        valid({ whatHappened: `They are now 3-9 as a road favorite ${CITE}.` }),
      );
      expect(res.ok).toBe(true);
    });
  });

  it("caps lesson tags at five", () => {
    const res = parseLossAutopsyDraft(valid({ lessonTags: ["a", "b", "c", "d", "e", "f", "g"] }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.draft.lessonTags).toHaveLength(5);
  });
});
