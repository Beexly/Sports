import { describe, expect, it } from "vitest";
import { rerankAffinityDiversePremises, type RerankablePremise } from "../affinity-diversity-reranker.js";

describe("rerankAffinityDiversePremises", () => {
  it("diversifies across clusters instead of selecting near-duplicate redundant cluster items", () => {
    const items: RerankablePremise[] = [
      {
        id: "eq-dup-1",
        premise: "wind drag deep pass penalty outdoor stadium crosswind velocity",
        cluster: "wind_drag",
        similarity: 0.90,
        verificationTier: "CITABLE_VERIFIED",
        rawLogOddsDelta: 0.14,
      },
      {
        id: "eq-dup-2",
        premise: "wind drag deep pass penalty outdoor stadium crosswind speed",
        cluster: "wind_drag",
        similarity: 0.89,
        verificationTier: "CITABLE_VERIFIED",
        rawLogOddsDelta: 0.14,
      },
      {
        id: "eq-dup-3",
        premise: "wind drag deep pass penalty outdoor stadium crosswind angle",
        cluster: "wind_drag",
        similarity: 0.88,
        verificationTier: "CITABLE_VERIFIED",
        rawLogOddsDelta: 0.13,
      },
      {
        id: "eq-orth-1",
        premise: "trench pressure blitz rate defensive interior stun mismatch",
        cluster: "trench_pressure",
        similarity: 0.86,
        verificationTier: "CITABLE_VERIFIED",
        rawLogOddsDelta: 0.15,
      },
    ];

    const picked = rerankAffinityDiversePremises(items, { topK: 2, lambda: 0.55 });
    expect(picked).toHaveLength(2);
    expect(picked.map((p) => p.cluster)).toEqual(["wind_drag", "trench_pressure"]);
  });

  it("handles empty and topK<=0 inputs cleanly", () => {
    expect(rerankAffinityDiversePremises([], { topK: 5 })).toEqual([]);
    expect(
      rerankAffinityDiversePremises(
        [{ id: "a", premise: "alpha", cluster: "c", similarity: 0.5 }],
        { topK: 0 },
      ),
    ).toEqual([]);
  });
});
