import { describe, it, expect } from "vitest";
import { easeOutExpo } from "./count-up";

describe("easeOutExpo", () => {
  it("is clamped to 0 at/under start and 1 at/over end", () => {
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(-0.5)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);
    expect(easeOutExpo(2)).toBe(1);
  });

  it("is monotonic increasing and front-loaded (ease-out)", () => {
    let prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const v = easeOutExpo(Math.min(1, t));
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    // ease-out: at the halfway point it's already well past halfway
    expect(easeOutExpo(0.5)).toBeGreaterThan(0.9);
  });
});
