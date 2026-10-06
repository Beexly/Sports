import { describe, expect, it } from "vitest";
import { reasonAbout, type ReasoningPremise, type ReasoningQuestion } from "./reasoning-trace.js";

const question: ReasoningQuestion = {
  question: "Which side of this game is more consistent with the probability premises?",
  unit: "game",
  interference: "UNKNOWN",
  targetFitOnQuestionSample: false,
  blockedKernels: [{ name: "glmf", reason: "Gaussian ALS on a binomial matrix, mu is the sample mean" }],
};

function prob(id: string, probability: number, sampleCount: number, outcome = "home"): ReasoningPremise {
  return { id, readingKind: "PROBABILITY", probability, sampleCount, outcome, claim: id };
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
    expect(r.data.sourceCount).toBe(2);
    expect(r.data.withheldReasons).toEqual([]);
    expect(r.data.reasoningTraceBrand).toBe("GSE_REASONING_TRACE");
    expect(r.data.unknowns.map((u) => u.id)).toContain("glmf");
  });

  it("does not average probabilities that name different outcomes", () => {
    const r = reasonAbout(question, [
      prob("home-model", 0.62, 100, "home"),
      prob("away-model", 0.64, 100, "away"),
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.conclusion).toBe("WITHHELD");
    expect(r.data.agreementSummary).toBeNull();
    expect(r.data.reason).toContain("same outcome");
  });

  it("does not call one source agreement", () => {
    const r = reasonAbout(question, [prob("only", 0.58, 40)]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.sourceCount).toBe(1);
    expect(r.data.reason).toContain("one probability source");
    expect(r.data.agreementSummary).toBeCloseTo(0.58, 10);
  });

  it("withholds when two probabilities disagree instead of blending them", () => {
    const r = reasonAbout(question, [prob("a", 0.8, 100), prob("b", 0.4, 100)]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.conclusion).toBe("WITHHELD");
    expect(r.data.agreementSummary).toBeNull();
    expect(r.data.conflicts).toHaveLength(1);
    expect(r.data.conflicts[0]?.gap).toBeCloseTo(0.4, 10);
    expect(r.data.withheldReasons).toEqual(["a and b differ by 0.4 on the same outcome"]);
    expect(r.data.derivedMetrics.conflict_density).toBe(1);
    expect(r.data.derivedMetrics.signal_agreement_index).toBeCloseTo(0.6, 10);
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
    expect(r.data.withheldReasons).toEqual(["target was fit on the question sample"]);
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

  it("measures agreement at both extremes without changing the decision", () => {
    const tight = reasonAbout(question, [prob("a", 0.5, 10), prob("b", 0.5, 10)]);
    const wide = reasonAbout(question, [prob("a", 0.01, 10), prob("b", 0.99, 10)]);
    expect(tight.ok && wide.ok).toBe(true);
    if (!tight.ok || !wide.ok) return;
    expect(tight.data.conclusion).toBe("ASSOCIATION_ONLY");
    expect(tight.data.derivedMetrics.signal_agreement_index).toBeCloseTo(1, 10);
    expect(tight.data.derivedMetrics.conflict_density).toBe(0);
    expect(wide.data.conclusion).toBe("WITHHELD");
    expect(wide.data.derivedMetrics.signal_agreement_index).toBeCloseTo(0.02, 10);
    expect(wide.data.derivedMetrics.conflict_density).toBe(1);
  });

  it("measures market alignment and staleness only when those inputs exist", () => {
    const aligned = reasonAbout(
      { ...question, decisionTimestamp: "2026-01-10T18:00:00.000Z", decisionWindowMs: 86_400_000 },
      [
        prob("model", 0.6, 20),
        { id: "market", readingKind: "PROBABILITY", probability: 0.6, sampleCount: 1, outcome: "home", role: "MARKET", claim: "price", evidenceTimestamp: "2026-01-10T12:00:00.000Z", declaredWeight: 1 },
      ],
    );
    const stale = reasonAbout(
      { ...question, decisionTimestamp: "2026-01-10T18:00:00.000Z", decisionWindowMs: 86_400_000 },
      [
        { ...prob("model", 0.7, 20), evidenceTimestamp: "2025-01-01T00:00:00.000Z", declaredWeight: 1 },
      ],
    );
    const bare = reasonAbout(question, [prob("model", 0.7, 20)]);
    expect(aligned.ok && stale.ok && bare.ok).toBe(true);
    if (!aligned.ok || !stale.ok || !bare.ok) return;
    expect(aligned.data.derivedMetrics.market_alignment_score).toBeCloseTo(1, 10);
    expect(aligned.data.derivedMetrics.staleness_pressure).toBe(0);
    expect(stale.data.derivedMetrics.staleness_pressure).toBe(1);
    expect(bare.data.derivedMetrics.market_alignment_score).toBeNull();
    expect(bare.data.derivedMetrics.staleness_pressure).toBeNull();
  });
});
