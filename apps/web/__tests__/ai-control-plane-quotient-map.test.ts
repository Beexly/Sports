import { describe, expect, it } from "vitest";
import { classifyPendingCount } from "@/lib/ai-control-plane/quotient-map";

describe("classifyPendingCount", () => {
  it("classifies 0 as ZERO", () => {
    expect(classifyPendingCount(0)).toBe("ZERO");
  });

  it("classifies 1 as ONE", () => {
    expect(classifyPendingCount(1)).toBe("ONE");
  });

  it("classifies 2 as GE2", () => {
    expect(classifyPendingCount(2)).toBe("GE2");
  });

  it("classifies larger counts as GE2", () => {
    expect(classifyPendingCount(5)).toBe("GE2");
    expect(classifyPendingCount(100)).toBe("GE2");
  });

  it("classifies a negative count as ZERO (locks in the existing <= 0 guard)", () => {
    expect(classifyPendingCount(-1)).toBe("ZERO");
  });

  it("pins the boundary at exactly count=2 across a range", () => {
    for (const count of [0, 1, 2, 3, 4, 10, 100]) {
      const expected = count === 0 ? "ZERO" : count === 1 ? "ONE" : "GE2";
      expect(classifyPendingCount(count)).toBe(expected);
    }
  });
});
