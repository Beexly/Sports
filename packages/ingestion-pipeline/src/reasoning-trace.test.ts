import { describe, expect, it } from "vitest";
import { reasonAbout, type ReasoningPremise, type ReasoningQuestion } from "./reasoning-trace.js";

const question: ReasoningQuestion = {
  question: "Which side of this game is more consistent with the probability premises?",
  unit: "game",
  interference: "UNKNOWN",
  targetFitOnQuestionSample: false,
  blockedKernels: [{ name: "glmf", reason: "Gaussian ALS on a binomial matrix, mu is the sample mean" }],
};

function prob(id: string, probability: number, sampleCount: number): ReasoningPremise {
  return { id, readingKind: "PROBABILITY", probability, sampleCount, claim: id };
}

describe("reasonAbout", () => {
  it("does not average a physical modifier into the probability", () => {
    const r = reasonAbout(question, [
      prob("market-free", 0.62, 200),
      prob("model", 0.64, 80),
      { id: "wind", readingKind: "PHYSICAL_MODIFIER", claim: "pass yards multiplier 0.9" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.publishablePick).toBe(false);
    expect(r.data.beatsBookClaim).toBe(false);
    expect(r.data.causalClaim).toBe(false);
    expect(r.data.conclusion).toBe("ASSOCIATION_ONLY");
    expect(r.data.contextPremises).toEqual(["wind"]);
    expect(r.data.discarded.map((d) => d.id)).toContain("wind");
    const expected = (0.62 * 200 + 0.64 * 80) / 280;
    expect(r.data.agreementSummary).toBeCloseTo(expected, 10);
    expect(r.data.unknowns.map((u) => u.id)).toContain("glmf");
  });

  it("withholds when two probabilities disagree instead of blending them", () => {
    const r = reasonAbout(question, [prob("a", 0.8, 100), prob("b", 0.4, 100)]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.conclusion).toBe("WITHHELD");
    expect(r.data.agreementSummary).toBeNull();
    expect(r.data.conflicts).toHaveLength(1);
    expect(r.data.conflicts[0]?.gap).toBeCloseTo(0.4, 10);
  });

  it("withholds a reverse-Stein target even when the premises agree", () => {
    const r = reasonAbout(
      { ...question, targetFitOnQuestionSample: true },
      [prob("a", 0.61, 50), prob("b", 0.62, 50)],
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.conclusion).toBe("WITHHELD");
    expect(r.data.reason).toContain("reverse-Stein");
    expect(r.data.agreementSummary).toBeNull();
  });

  it("treats a refused kernel as an unknown, not as probability 0", () => {
    const r = reasonAbout(question, [
      prob("a", 0.55, 40),
      { id: "epa", readingKind: "PROBABILITY", claim: "opponent epa", refused: "did not converge" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.conclusion).toBe("ASSOCIATION_ONLY");
    expect(r.data.unknowns.map((u) => u.id)).toContain("epa");
    expect(r.data.agreementSummary).toBeCloseTo(0.55, 10);
  });

  it("discards a probability outside (0, 1) instead of clamping it", () => {
    const r = reasonAbout(question, [
      { id: "bad", readingKind: "PROBABILITY", probability: 1.4, sampleCount: 10, claim: "clamped nowhere" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.conclusion).toBe("INSUFFICIENT");
    expect(r.data.discarded[0]?.reason).toContain("not clamped");
    expect(r.data.agreementSummary).toBeNull();
  });

  it("refuses an empty question", () => {
    const r = reasonAbout({ ...question, question: "  " }, []);
    expect(r.ok).toBe(false);
  });
});
