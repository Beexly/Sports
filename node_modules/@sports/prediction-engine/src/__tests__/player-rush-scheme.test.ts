import { describe, it, expect } from "vitest";
import { classifyRushScheme, type RushDirectionCounts } from "../player-rush-scheme.js";

function counts(o: Partial<RushDirectionCounts> & { runs: number }): RushDirectionCounts {
  return { guardRuns: 0, tackleRuns: 0, endRuns: 0, leftRuns: 0, middleRuns: 0, rightRuns: 0, ...o };
}

describe("classifyRushScheme", () => {
  it("flags interior/power on high guard share", () => {
    const p = classifyRushScheme(counts({ runs: 200, guardRuns: 110, tackleRuns: 50, endRuns: 40 }));
    expect(p.interiorRate).toBeCloseTo(0.55, 2);
    expect(p.scheme).toBe("interior/power");
  });

  it("flags outside/zone on high edge share", () => {
    const p = classifyRushScheme(counts({ runs: 200, guardRuns: 60, tackleRuns: 60, endRuns: 80 }));
    expect(p.edgeRate).toBeCloseTo(0.4, 2);
    expect(p.scheme).toBe("outside/zone");
  });

  it("flags off-tackle", () => {
    const p = classifyRushScheme(counts({ runs: 200, guardRuns: 40, tackleRuns: 100, endRuns: 40, middleRuns: 20 }));
    expect(p.scheme).toBe("off-tackle");
  });

  it("is balanced when no lean dominates", () => {
    const p = classifyRushScheme(counts({ runs: 200, guardRuns: 70, tackleRuns: 70, endRuns: 40, middleRuns: 20 }));
    expect(p.scheme).toBe("balanced");
  });

  it("guards small samples", () => {
    expect(classifyRushScheme(counts({ runs: 10, guardRuns: 8 })).scheme).toBe("low-sample");
  });
});
