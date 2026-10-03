import { describe, it, expect } from "vitest";
import { parseFactorBreakdown } from "@/lib/picks/parse-factor-breakdown";

const valid = {
  consensusScore: 24,
  marketDepthScore: 18,
  edgeScore: 12,
  lineMovementScore: -3,
  volatilityPenalty: -4,
  dataQualityScore: 85,
  factors: [{ name: "Consensus", impact: "positive", description: "Books aligned." }],
};

describe("parseFactorBreakdown", () => {
  it("accepts a well-formed breakdown and returns it typed", () => {
    const out = parseFactorBreakdown(valid);
    expect(out).not.toBeNull();
    expect(out?.consensusScore).toBe(24);
    expect(out?.factors[0]?.impact).toBe("positive");
  });

  it("rejects non-objects (null, arrays, primitives) without throwing", () => {
    expect(parseFactorBreakdown(null)).toBeNull();
    expect(parseFactorBreakdown(undefined)).toBeNull();
    expect(parseFactorBreakdown("{}")).toBeNull();
    expect(parseFactorBreakdown([valid])).toBeNull();
    expect(parseFactorBreakdown(42)).toBeNull();
  });

  it("rejects when a required score is missing or non-finite", () => {
    const { consensusScore, ...missing } = valid;
    void consensusScore;
    expect(parseFactorBreakdown(missing)).toBeNull();
    expect(parseFactorBreakdown({ ...valid, edgeScore: "12" })).toBeNull();
    expect(parseFactorBreakdown({ ...valid, edgeScore: NaN })).toBeNull();
  });

  it("rejects when factors is absent or malformed", () => {
    const { factors, ...noFactors } = valid;
    void factors;
    expect(parseFactorBreakdown(noFactors)).toBeNull();
    expect(parseFactorBreakdown({ ...valid, factors: "nope" })).toBeNull();
    expect(
      parseFactorBreakdown({ ...valid, factors: [{ name: "x", impact: "sideways", description: "y" }] })
    ).toBeNull();
    expect(parseFactorBreakdown({ ...valid, factors: [{ name: "x" }] })).toBeNull();
  });
});
