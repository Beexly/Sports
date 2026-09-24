import { describe, it, expect } from "vitest";
import {
  StoppingState,
  stoppingBackwardInduction,
  c51Project,
  cvar,
  clvRegret,
} from "./2105-08877v2-c51-optimal-stopping.js";

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

describe("stopping", () => {
  it("backward induction stops when the immediate reward dominates", () => {
    const imm = [0.1, 0.2, 0.9, 0.3];
    const wait = [0.5, 0.5, 0.5, 0.0];
    const { stopAt, value } = stoppingBackwardInduction(imm, wait, 1.0);
    expect(stopAt[2]).toBe(true);
    expect(stopAt[0]).toBe(false);
    expect(value[2]).toBeCloseTo(0.9, 10);
  });
  it("c51Project preserves probability mass and shifts with reward", () => {
    const support = [-10, -5, 0, 5, 10];
    const probs = [0, 0, 1, 0, 0];
    const out = c51Project(support, probs, 5, 1.0);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    expect(out[3]!).toBeCloseTo(1, 8); // 0 + 5 -> atom at 5
    const out2 = c51Project(support, probs, 2.5, 1.0);
    expect(out2[2]!).toBeCloseTo(0.5, 8);
    expect(out2[3]!).toBeCloseTo(0.5, 8);
  });
  it("cvar is below the mean for risky distributions", () => {
    const support = [-10, 0, 10];
    const probs = [0.2, 0.6, 0.2];
    expect(cvar(support, probs, 0.2)).toBeLessThan(0);
  });
});
