import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateVisionFactors, VISION_DEFAULT_WEIGHT } from "../vision-factors.ts";

describe("vision-factors — weight 0.0 production safety", () => {
  it("enforces zero score shift with real metrics at default weight", () => {
    const metrics = {
      gameId: "401872995",
      playId: "play_102",
      pocketDepthYards: 6.4,
      passRushSeparationYards: 1.85,
      boxDefenderCount: 7,
      receiverSeparationAtBreak: 2.1,
    };

    const res = evaluateVisionFactors(metrics);
    assert.equal(res.isZeroWeighted, true);
    assert.equal(res.totalPointsShift, 0.0);
    assert.equal(res.factors.length, 4);
    for (const factor of res.factors) {
      assert.equal(factor.weight, 0.0);
      assert.equal(factor.signedContribution, 0.0);
    }
  });

  it("handles empty / null metrics gracefully", () => {
    const res = evaluateVisionFactors(null);
    assert.equal(res.isZeroWeighted, true);
    assert.equal(res.totalPointsShift, 0.0);
    assert.equal(res.factors.length, 0);
  });
});
