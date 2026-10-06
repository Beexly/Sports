import { describe, expect, it } from "vitest";

import {
  ENABLED,
  bestVariantShare,
  chooseSlateMWER,
  likelihoodUpdate,
  pruneWeights,
  weeklyRoll,
} from "@/lib/calibration/1302-5681v1-minimax-weighted-expected-regret";

describe("MWER challenger-management layer", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("likelihood-update renormalizes and rewards the better variant", () => {
    const cur = [
      { variantId: "v5.2.7", alpha: 0.5 },
      { variantId: "recal", alpha: 0.5 },
    ];
    const upd = likelihoodUpdate(cur, { "v5.2.7": -2.0, recal: -1.0 });
    const s = upd.reduce((a, w) => a + w.alpha, 0);
    expect(s).toBeCloseTo(1, 10);
    expect(upd.find((w) => w.variantId === "recal")!.alpha).toBeGreaterThan(0.5);
  });

  it("prunes alpha < 0.05 and renormalizes", () => {
    const pruned = pruneWeights([
      { variantId: "a", alpha: 0.9 },
      { variantId: "b", alpha: 0.04 },
      { variantId: "c", alpha: 0.06 },
    ]);
    expect(pruned.map((w) => w.variantId).sort()).toEqual(["a", "c"]);
    expect(pruned.reduce((a, w) => a + w.alpha, 0)).toBeCloseTo(1, 10);
  });

  it("weeklyRoll composes update + prune", () => {
    const rolled = weeklyRoll(
      [
        { variantId: "a", alpha: 0.6 },
        { variantId: "b", alpha: 0.4 },
      ],
      { a: 0, b: -10 },
    );
    expect(rolled.find((w) => w.variantId === "b")).toBeUndefined();
  });

  it("chooseSlateMWER minimizes worst weighted regret, not average regret", () => {
    const weights = [
      { variantId: "v", alpha: 0.8 },
      { variantId: "w", alpha: 0.2 },
    ];
    const best = chooseSlateMWER(
      [
        { slateId: "lowAvgHighWorst", regrets: [
          { variantId: "v", expectedRegret: 10 },
          { variantId: "w", expectedRegret: 0 },
        ]},
        { slateId: "balanced", regrets: [
          { variantId: "v", expectedRegret: 5 },
          { variantId: "w", expectedRegret: 5 },
        ]},
      ],
      weights,
    );
    // slate1 worst = 0.8*10 = 8; slate2 worst = max(4, 1) = 4
    expect(best!.slateId).toBe("balanced");
    expect(best!.worstWeightedRegret).toBeCloseTo(4, 10);
  });

  it("bestVariantShare tracks the ex-post best variant (gate > 0.5)", () => {
    const w = [
      { variantId: "a", alpha: 0.3 },
      { variantId: "b", alpha: 0.7 },
    ];
    expect(bestVariantShare(w, "b")).toBeCloseTo(0.7, 10);
    expect(bestVariantShare(w, "zzz")).toBe(0);
  });
});
