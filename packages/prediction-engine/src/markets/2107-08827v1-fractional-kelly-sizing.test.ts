import { describe, it, expect } from "vitest";
import {
  kellyBinary,
  kellySized,
  drawdownGate,
  kellyGrowthRate,
} from "./2107-08827v1-fractional-kelly-sizing.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("kelly", () => {
  it("kellyBinary matches the closed form", () => {
    expect(kellyBinary(0.6, 1)).toBeCloseTo(0.2, 10);
    expect(kellyBinary(0.5, 1)).toBeCloseTo(0, 10);
  });
  it("no edge means no bet", () => {
    expect(kellySized(0.4, 1, 0.5, 0.25)).toBe(0);
  });
  it("drawdownGate cuts size at the threshold", () => {
    expect(drawdownGate(100, 1000, 800, 0.2)).toBe(0);
    expect(drawdownGate(100, 1000, 950, 0.2)).toBeGreaterThan(0);
    expect(drawdownGate(100, 1000, 950, 0.2)).toBeLessThan(100);
  });
  it("growth rate is maximized at full Kelly (unimodal)", () => {
    const p = 0.6;
    const b = 1;
    const g = (f: number): number => kellyGrowthRate(p, b, f);
    expect(g(0.2)).toBeGreaterThan(g(0.1));
    expect(g(0.2)).toBeGreaterThan(g(0.4));
  });
});
