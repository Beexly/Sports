import { describe, it, expect } from "vitest";
import {
  teacherEmaUpdate,
  consistencyLoss,
  multiCropAgreement,
  diagFisher,
  rwalkPenalty,
  forgettingAudit,
} from "./2304-01239v1-teacher-student-continual.js";

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

describe("ema", () => {
  it("teacherEmaUpdate blends toward the student", () => {
    const t = teacherEmaUpdate([0, 0], [1, 1], 0.99);
    expect(t[0]).toBeCloseTo(0.01, 10);
  });
  it("consistencyLoss is 0 for identical outputs", () => {
    expect(consistencyLoss([1, 2], [1, 2])).toBe(0);
    expect(consistencyLoss([1, 2], [2, 3])).toBe(1);
  });
});

describe("rwalk", () => {
  it("rwalkPenalty is zero at the stored optima", () => {
    const theta = [1, 2];
    const opt = [[1, 2], [1, 2]];
    const fish = [[0.5, 0.5], [0.5, 0.5]];
    expect(rwalkPenalty(theta, opt, fish, [1, 1])).toBe(0);
  });
  it("penalty grows with distance weighted by Fisher", () => {
    const p1 = rwalkPenalty([1.1, 2], [[1, 2]], [[10, 0.1]], [1]);
    const p2 = rwalkPenalty([1, 2.1], [[1, 2]], [[10, 0.1]], [1]);
    expect(p1).toBeGreaterThan(p2); // high-Fisher direction costs more
  });
  it("forgettingAudit captures negative transfer", () => {
    const { forget, bwt } = forgettingAudit([0.9, 0.8], [0.7, 0.75]);
    expect(forget).toBeCloseTo(0.125, 8);
    expect(bwt).toBeLessThan(0);
  });
});
