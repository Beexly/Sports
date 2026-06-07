import { describe, it, expect } from "vitest";
import { clamp, normalize } from "./dataviz";

describe("clamp", () => {
  it("bounds a value into [lo, hi]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe("normalize", () => {
  it("maps the range endpoints to 0 and 1 and the midpoint to 0.5", () => {
    expect(normalize(0, 0, 100)).toBe(0);
    expect(normalize(100, 0, 100)).toBe(1);
    expect(normalize(50, 0, 100)).toBe(0.5);
  });

  it("clamps out-of-range inputs", () => {
    expect(normalize(-10, 0, 100)).toBe(0);
    expect(normalize(150, 0, 100)).toBe(1);
  });

  it("collapses a degenerate range (hi <= lo) to 0 — never divides by zero", () => {
    expect(normalize(5, 10, 10)).toBe(0);
    expect(normalize(5, 10, 2)).toBe(0);
  });
});
