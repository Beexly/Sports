
import { describe, expect, it } from "vitest";
import { parityRegime, qIndex, rollingQIndex } from "./q-index-parity";

describe("q-index-parity", () => {
  it("qIndex is 1 at parity", () => {
    expect(qIndex(5, 5)).toBe(1);
    expect(qIndex(8, 5)).toBeCloseTo(1.6, 10);
  });
  it("parityRegime classifies chaos/chalk/neutral", () => {
    expect(parityRegime(1.5)).toBe("chaos");
    expect(parityRegime(0.5)).toBe("chalk");
    expect(parityRegime(1.1)).toBe("neutral");
  });
  it("rollingQIndex smooths weekly noise", () => {
    const q = rollingQIndex([[2, 2], [4, 2], [0, 2]], 2);
    expect(q[1]).toBeCloseTo(1.5, 10);
    expect(q).toHaveLength(3);
  });
  it("edge cases throw", () => {
    expect(() => qIndex(1, 0)).toThrow();
    expect(() => qIndex(-1, 5)).toThrow();
    expect(() => rollingQIndex([], 0)).toThrow();
  });
});
