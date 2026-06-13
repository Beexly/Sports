import { describe, expect, it } from "vitest";
import {
  validateClaimBatch,
  MAX_BATCH_CLAIMS,
  MAX_CLAIM_LENGTH,
} from "@/lib/airwave/listener-log-validation";

/**
 * Listener-log batch validation — the lawful manual lane (paraphrase only).
 * The guards keep a 4-hour show's worth of takes flowing WITHOUT becoming a
 * place to paste SiriusXM's transcript (forbidden by their §9(l) AI terms).
 */

describe("validateClaimBatch", () => {
  it("accepts a show's worth of paraphrased takes", () => {
    const result = validateClaimBatch([
      "Backs the road dog on a rest edge he thinks the number missed.",
      "Fades the primetime total — expects a slow, run-heavy script.",
      "Likes the rookie TE as a value pick at his current ADP.",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.claims).toHaveLength(3);
  });

  it("drops blank lines and trims", () => {
    const result = validateClaimBatch(["  a real take  ", "", "   ", "another take"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.claims).toEqual(["a real take", "another take"]);
  });

  it("rejects an empty batch", () => {
    expect(validateClaimBatch([]).ok).toBe(false);
    expect(validateClaimBatch(["", "   "]).ok).toBe(false);
  });

  it("rejects more than the batch cap", () => {
    const many = Array.from({ length: MAX_BATCH_CLAIMS + 1 }, (_, i) => `take ${i}`);
    const result = validateClaimBatch(many);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("too-many-claims");
  });

  it("rejects a line longer than a paraphrase — that's a transcript dump", () => {
    const result = validateClaimBatch(["x".repeat(MAX_CLAIM_LENGTH + 1)]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("claim-too-long");
  });

  it("rejects pasted transcript lines (timestamps) outright", () => {
    // Exactly the shape of the SiriusXM transcript view: "00:19  When I can get…"
    const transcriptish = [
      "00:19 — When I can get Dalton Kincaid in the 11th round it's a no-brainer",
    ];
    const result = validateClaimBatch(transcriptish);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("transcript-detected");

    expect(validateClaimBatch(["[12:34] he says back the dog"]).ok).toBe(false);
    expect(validateClaimBatch(["(1:02:33) fade the total"]).ok).toBe(false);
  });

  it("does not false-positive on normal takes that mention a score or time", () => {
    // No leading/inline timestamp furniture — these are real paraphrases.
    const result = validateClaimBatch([
      "Thinks it ends something like 24 to 20 in a grind.",
      "Wants the under because pace dies in the 4th.",
    ]);
    expect(result.ok).toBe(true);
  });
});
