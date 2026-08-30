import { describe, expect, it } from "vitest";
import { investigatePlattIrlS } from "@/lib/calibration/platt-irls-investigate";
import { exploreMurphyComponents } from "@/lib/calibration/murphy-components-explore";

describe("Platt IRLS investigate", () => {
  it("fits A,B and marks applyAllowed false", () => {
    const samples = Array.from({ length: 60 }, (_, i) => ({
      p: 0.3 + (i % 10) * 0.04,
      y: (i % 2 === 0 ? 1 : 0) as 0 | 1,
    }));
    const r = investigatePlattIrlS(samples);
    expect(Number.isFinite(r.A)).toBe(true);
    expect(r.applyAllowed).toBe(false);
    expect(r.exampleMapped).toHaveLength(5);
  });
});

describe("Murphy components explore", () => {
  it("returns REL RES UNC with reconstruction", () => {
    const samples = Array.from({ length: 80 }, (_, i) => ({
      p: 0.4 + (i % 5) * 0.05,
      y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
    }));
    const e = exploreMurphyComponents(samples);
    expect(e.components.map((c) => c.key)).toEqual(["REL", "RES", "UNC"]);
    expect(Number.isFinite(e.binnedReconstruction)).toBe(true);
    expect(e.provenImplication).toMatch(/RES/);
  });
});
