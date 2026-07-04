import { describe, expect, it } from "vitest";
import { scoreContentIdea } from "@/lib/media-revenue/content-idea-score";

describe("media revenue content idea scoring", () => {
  it("scores a strong evidence-first idea high", () => {
    const result = scoreContentIdea({
      complianceSafety: 0.95,
      demand: 0.9,
      differentiation: 0.86,
      gseAuthorityFit: 0.96,
      hookStrength: 0.9,
      monetizationFit: 0.82,
      productionEase: 0.8,
    });

    expect(result.score).toBeGreaterThanOrEqual(86);
    expect(result.grade).toBe("PRIORITY");
    expect(result.reasons).toContain("Strong fit with GSE evidence and trust posture.");
  });

  it("scores a weak idea low", () => {
    const result = scoreContentIdea({
      complianceSafety: 0.2,
      demand: 0.25,
      differentiation: 0.2,
      gseAuthorityFit: 0.1,
      hookStrength: 0.25,
      monetizationFit: 0.15,
      productionEase: 0.3,
    });

    expect(result.score).toBeLessThan(40);
    expect(result.grade).toBe("DROP");
  });

  it("lets compliance safety materially affect the score", () => {
    const safe = scoreContentIdea({
      complianceSafety: 1,
      demand: 0.8,
      differentiation: 0.8,
      gseAuthorityFit: 0.8,
      hookStrength: 0.8,
      monetizationFit: 0.8,
      productionEase: 0.8,
    });
    const risky = scoreContentIdea({ ...safeInput(), complianceSafety: 0 });

    expect(safe.score - risky.score).toBeCloseTo(10, 1);
    expect(risky.reasons).toContain("Compliance safety is weak; require review before drafting.");
  });

  it("clamps out-of-bounds inputs and maps grades", () => {
    expect(scoreContentIdea({ ...safeInput(), demand: 99 }).score).toBeLessThanOrEqual(100);
    expect(scoreContentIdea({ ...safeInput(), demand: -99 }).score).toBeGreaterThanOrEqual(0);
    expect(scoreContentIdea({ ...safeInput(), demand: 1, hookStrength: 1, gseAuthorityFit: 1, differentiation: 1, monetizationFit: 1, productionEase: 1, complianceSafety: 1 }).grade).toBe("FLAGSHIP");
    expect(scoreContentIdea({ ...safeInput(), demand: 0.7, hookStrength: 0.7, gseAuthorityFit: 0.7, differentiation: 0.7, monetizationFit: 0.7, productionEase: 0.7, complianceSafety: 0.7 }).grade).toBe("TEST");
  });
});

function safeInput() {
  return {
    complianceSafety: 0.8,
    demand: 0.8,
    differentiation: 0.8,
    gseAuthorityFit: 0.8,
    hookStrength: 0.8,
    monetizationFit: 0.8,
    productionEase: 0.8,
  };
}
