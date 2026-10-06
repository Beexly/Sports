/**
 * Tests for ./codi-tabular-synthesis (arXiv:2304.12654v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT CoDi over TabDDPM if BOTH: (a) real+CoDi-synthetic beats real+TabDDPM-synthetic by >=0.002
 * log-loss on held-out 2024, OR ties within 0.001 while (b) cross-type correlation MAE is >=10%
 * lower for CoDi; REJECT (stay with TabDDPM) if neither holds, if training instability appears
 * (triplet loss non-convergence across 2+ seeds), or fidelity marginals breach the 5% TVD rule.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./codi-tabular-synthesis";

describe("CoDi tabular synthesis (arXiv:2304.12654v1)", () => {
  const cols = [
    { name: "epa", type: "continuous" as const },
    { name: "pos", type: "categorical" as const, categories: ["QB", "RB"] },
  ];
  it("samples a mixed row", () => {
    const qm = mod.quantileMarginal([0.1, 0.2, 0.3, 0.4])!;
    const row = mod.copulaSample(cols, [[1, 0], [0.3, 0.95]], [(u) => qm(u), (u) => (u < 0.5 ? "QB" : "RB")], 7)!;
    expect(typeof row["epa"]).toBe("number");
    expect(["QB", "RB"]).toContain(row["pos"]);
  });
  it("quantile marginal", () => {
    const qm = mod.quantileMarginal([1, 2, 3, 4])!;
    expect(qm(0)).toBe(1);
    expect(qm(0.999)).toBe(4);
    expect(qm(2)).toBeNull();
    expect(mod.quantileMarginal([])).toBeNull();
  });
  it("null on malformed", () => {
    expect(mod.copulaSample(cols, [[1]], [(u) => u], 7)).toBeNull();
    expect(mod.copulaSample([], [], [], 7)).toBeNull();
    expect(mod.isColSpec({ name: "x", type: "categorical" })).toBe(false);
  });
});
