import { describe, it, expect } from "vitest";
import {
  featureExpectations,
  maxEntIrlStep,
  irlMargin,
  softPolicy,
} from "./2103-04349v1-irl-situational-decisions.js";

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

describe("irl", () => {
  it("maxEnt IRL moves weights toward expert feature expectations", () => {
    const muExpert = [1, 0.2];
    const muModel = [0.3, 0.8];
    const w = maxEntIrlStep([0, 0], muExpert, muModel, 0.5);
    expect(w[0]).toBeGreaterThan(0);
    expect(w[1]).toBeLessThan(0);
  });
  it("featureExpectations averages trajectory sums", () => {
    expect(featureExpectations([[1, 2], [3, 4]])).toEqual([2, 3]);
  });
  it("softPolicy concentrates as temperature drops", () => {
    const hot = softPolicy([1, 2, 3], 10);
    const cold = softPolicy([1, 2, 3], 0.1);
    expect(cold[2]!).toBeGreaterThan(hot[2]!);
  });
});
