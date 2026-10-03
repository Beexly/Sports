/**
 * In-game excess-movement monitor — tests (arXiv 2109.09871).
 *
 * ACCEPTANCE GATE: noisy early movement with no resolution -> positive
 * excess (fade); steady resolving movement late -> negative excess
 * (follow); the t-test detects the sign; crossover calibration finds the
 * flip point; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  calibrateCrossover,
  excessMovement,
  excessTTest,
  inGameSignal,
  movement,
  uncertaintyReduction,
  type GameBlock,
} from "./excess-movement-monitor";

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

describe("movement + uncertaintyReduction", () => {
  it("measures total wiggle and entropy drop", () => {
    expect(movement([0.5, 0.6, 0.55, 0.7])).toBeCloseTo(0.1 + 0.05 + 0.15, 12);
    // Resolving toward certainty reduces entropy.
    expect(uncertaintyReduction([0.5, 0.7, 0.9])).toBeGreaterThan(0);
    // Pure noise around 0.5: no uncertainty reduction.
    expect(uncertaintyReduction([0.5, 0.52, 0.48, 0.5])).toBeCloseTo(0, 12);
    expect(() => movement([0.5])).toThrow();
    expect(() => uncertaintyReduction([0.5])).toThrow();
  });
});

describe("excessMovement + inGameSignal", () => {
  it("fires fade early on overinference, follow late on underinference", () => {
    // Early: market whipsaws with no resolution -> positive excess -> fade.
    const early: GameBlock = {
      probs: [0.5, 0.6, 0.45, 0.58, 0.47, 0.55],
      block: 1,
      highLeverage: false,
    };
    expect(excessMovement(early)).toBeGreaterThan(0);
    expect(inGameSignal(early, 2)).toBe("fade");
    // Late: steady drift toward the realized outcome with little extra
    // wiggle -> negative excess -> follow. (Entropy can only drop so far;
    // construct drift with movement < entropy drop.)
    const late: GameBlock = {
      probs: [0.5, 0.75, 0.9, 0.97],
      block: 4,
      highLeverage: true,
    };
    expect(excessMovement(late)).toBeLessThan(0);
    expect(inGameSignal(late, 2)).toBe("follow");
    // Quiet block -> no signal.
    const quiet: GameBlock = { probs: [0.6, 0.605, 0.6], block: 1, highLeverage: false };
    expect(inGameSignal(quiet, 2)).toBe("none");
  });
});

describe("excessTTest", () => {
  it("detects significantly positive early excess", () => {
    const rand = mulberry32(121);
    const early = Array.from({ length: 60 }, () => 0.05 + rand() * 0.1);
    const r = excessTTest(early);
    expect(r.mean).toBeGreaterThan(0);
    expect(r.pValue).toBeLessThan(0.05);
    const late = Array.from({ length: 60 }, () => -0.05 - rand() * 0.1);
    const r2 = excessTTest(late);
    expect(r2.mean).toBeLessThan(0);
    expect(r2.pValue).toBeLessThan(0.05);
    expect(() => excessTTest([0.1])).toThrow();
  });
});

describe("calibrateCrossover", () => {
  it("finds the block where excess flips sign and stays negative", () => {
    const rows: { block: number; excess: number }[] = [];
    for (let b = 1; b <= 4; b++) {
      for (let i = 0; i < 10; i++) {
        rows.push({ block: b, excess: b <= 2 ? 0.05 : -0.04 });
      }
    }
    expect(calibrateCrossover(rows)).toBe(2);
    const noFlip = rows.map((r) => ({ ...r, excess: 0.05 }));
    expect(calibrateCrossover(noFlip)).toBeNull();
    expect(() => calibrateCrossover([])).toThrow();
  });
});
