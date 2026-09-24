/**
 * Tests for ./rf-playcall-tendencies (arXiv:1901.02776v2, lane=causal_injury).
 *
 * ACCEPTANCE GATE: Adopt the medshift mediation module into the totals-model weather adjustment if on 2015-2022:
 * (a) PIIE at delta=10 mph is significant at 5% with the expected sign (wind reduction -> more
 * deep passes -> more points), (b) the sum PIDE+PIIE agrees in sign with the naive total wind
 * effect, and (c) the holdout 2023-2024 PIIE keeps its sign. Reject if PIIE is null while the
 * naive total effect is significant (mediation adds nothing -- a single wind coefficient
 * suffices), or if the direct/indirect split is unstable across fit/holdout windows (sign flip),
 * or if A3 cannot be defended after game-script controls.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./rf-playcall-tendencies";

describe("RF play-call tendencies (arXiv:1804.09147v1)", () => {
  const tree: any = { feature: 0, threshold: 0.5, left: 0.8, right: 0.2 };
  const forest = { trees: [{ root: tree, weight: 1 }, { root: tree, weight: 1 }], nFeatures: 2 };
  it("tree routes by threshold", () => {
    expect(mod.treePredict(tree, [0.3, 0])).toBeCloseTo(0.8, 10);
    expect(mod.treePredict(tree, [0.7, 0])).toBeCloseTo(0.2, 10);
    expect(mod.treePredict({ feature: 5, threshold: 0.5, left: 0.8, right: 0.2 }, [0.3])).toBeNull();
  });
  it("forest averages", () => {
    expect(mod.forestRunProb(forest, [0.3, 0])).toBeCloseTo(0.8, 10);
    expect(mod.forestRunProb(forest, [0.3, 0, 0] as never)).toBeNull();
    expect(mod.forestRunProb({ trees: [], nFeatures: 2 }, [0.3, 0])).toBeNull();
  });
  it("variable importance normalizes", () => {
    const imp = mod.variableImportance(forest)!;
    expect(imp[0]).toBeCloseTo(1, 10);
    expect(imp[1]).toBeCloseTo(0, 10);
  });
  it("gini impurity", () => {
    expect(mod.giniImpurity(0.5)).toBeCloseTo(0.5, 10);
    expect(mod.giniImpurity(0)).toBe(0);
    expect(mod.giniImpurity(2)).toBeNull();
  });
  it("isTreeNode rejects malformed", () => {
    expect(mod.isTreeNode({ feature: 0 })).toBe(false);
  });
});
