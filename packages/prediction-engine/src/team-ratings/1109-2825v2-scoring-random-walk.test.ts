import { describe, it, expect } from "vitest";
import {
  estimateAntipersistence,
  fitRestoringForce,
  nextScoreProbA,
  simulateRestOfGame,
  LiveParams,
} from "./1109-2825v2-scoring-random-walk.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PARAMS: LiveParams = {
  perEventProbA: 0.5,
  antipersistShift: 0.06,
  restoringCoef: 0.004,
  pointsPerEvent: 4,
  expectedEvents: 12,
};

describe("estimateAntipersistence", () => {
  it("recovers q < 0.5 on antipersistent sequences", () => {
    const rand = mulberry32(7);
    const events: ("A" | "B")[] = ["A"];
    for (let i = 1; i < 2000; i++) {
      const last = events[i - 1]!;
      events.push(rand() < 0.3 ? last : last === "A" ? "B" : "A");
    }
    const { q } = estimateAntipersistence(events);
    expect(q).toBeGreaterThan(0.24);
    expect(q).toBeLessThan(0.36);
  });
});

describe("fitRestoringForce", () => {
  it("recovers a positive restoring coefficient with p < 0.01 on strong signal", () => {
    const rand = mulberry32(11);
    const leads: number[] = [];
    const scored: boolean[] = [];
    for (let i = 0; i < 3000; i++) {
      const L = (rand() * 2 - 1) * 14;
      leads.push(L);
      scored.push(rand() < 0.5 + 0.05 - 0.02 * L);
    }
    const fit = fitRestoringForce(leads, scored);
    expect(fit.b).toBeGreaterThan(0);
    expect(fit.bP).toBeLessThan(0.01);
  });
  it("finds no restoring force on pure noise", () => {
    const rand = mulberry32(13);
    const leads: number[] = [];
    const scored: boolean[] = [];
    for (let i = 0; i < 3000; i++) {
      leads.push((rand() * 2 - 1) * 14);
      scored.push(rand() < 0.5);
    }
    const fit = fitRestoringForce(leads, scored);
    expect(fit.bP).toBeGreaterThan(0.01);
  });
});

describe("nextScoreProbA", () => {
  it("falls with A's lead and when A just scored", () => {
    const base = nextScoreProbA(0, false, PARAMS);
    expect(nextScoreProbA(10, false, PARAMS)).toBeLessThan(base);
    expect(nextScoreProbA(0, true, PARAMS)).toBeLessThan(base);
  });
});

describe("simulateRestOfGame", () => {
  it("win probability rises monotonically with the lead", () => {
    const w0 = simulateRestOfGame(0, false, PARAMS, 4000, 1).winProbA;
    const w7 = simulateRestOfGame(7, false, PARAMS, 4000, 1).winProbA;
    const w14 = simulateRestOfGame(14, false, PARAMS, 4000, 1).winProbA;
    // At lead 0 with an even number of events, tie mass (~30%) keeps P(win) below 0.5
    // for both sides; the process itself is symmetric.
    expect(w0).toBeGreaterThan(0.3);
    expect(w0).toBeLessThan(0.45);
    expect(w7).toBeGreaterThan(w0);
    expect(w14).toBeGreaterThan(w7);
  });
  it("reports sane spread/total distributions", () => {
    const r = simulateRestOfGame(3, true, PARAMS, 2000, 5);
    expect(r.spreadMean).toBeGreaterThan(0);
    expect(r.spreadSd).toBeGreaterThan(0);
    expect(r.totalMean).toBeCloseTo(48, 0);
  });
});
