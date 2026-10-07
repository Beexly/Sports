import { describe, expect, it } from "vitest";
import {
  MVE_LAMBDA,
  betSideProbs,
  bindingOutcome,
  runSideAdaptivePath,
  selectBetSide,
  sideAdaptiveIncrement,
} from "./mve-eprocess.js";

describe("H-F5 frozen side-selection", () => {
  it("bets OVER only when q > m; ties go UNDER", () => {
    expect(selectBetSide(0.52, 0.50)).toBe("OVER");
    expect(selectBetSide(0.50, 0.50)).toBe("UNDER");
    expect(selectBetSide(0.49, 0.50)).toBe("UNDER");
  });

  it("under bets use complements", () => {
    const under = betSideProbs(0.6, 0.55, "UNDER");
    expect(under.qBet).toBeCloseTo(0.4, 10);
    expect(under.mBet).toBeCloseTo(0.45, 10);
    const over = betSideProbs(0.6, 0.55, "OVER");
    expect(over.qBet).toBeCloseTo(0.6, 10);
    expect(over.mBet).toBeCloseTo(0.55, 10);
  });
});

describe("H-F5 side-adaptive increment", () => {
  it("uses lambda 0.3 and is >= 0.7", () => {
    expect(MVE_LAMBDA).toBe(0.3);
    const miss = sideAdaptiveIncrement({ qBet: 0.9, mBet: 0.5, hit: false });
    const hitAtFair = sideAdaptiveIncrement({ qBet: 0.5, mBet: 0.5, hit: true });
    expect(miss).toBeCloseTo(0.7 + 0.3 * 0.1, 10);
    expect(hitAtFair).toBeCloseTo(1, 10);
    expect(miss).toBeGreaterThanOrEqual(0.7);
    expect(hitAtFair).toBeGreaterThanOrEqual(0.7);
  });

  it("miss term is (1-q), not (1-q)/(1-m)", () => {
    const e = sideAdaptiveIncrement({ qBet: 0.4, mBet: 0.5, hit: false });
    expect(e).toBeCloseTo(1 + 0.3 * (0.6 - 1), 10);
    const wrong = 1 + 0.3 * (0.6 / 0.5 - 1);
    expect(e).not.toBeCloseTo(wrong, 5);
  });
});

describe("H-F5 binding outcome", () => {
  it("kills when final capital <= 2", () => {
    const path = runSideAdaptivePath([
      { qOver: 0.4, mOver: 0.5, y: 10, line: 8.5 }, // UNDER, miss (total went over)
      { qOver: 0.4, mOver: 0.5, y: 10, line: 8.5 },
    ]);
    expect(path.finalCapital).toBeLessThan(1);
    expect(bindingOutcome(path)).toBe("KILL");
  });

  it("skips pushes so they are not graded", () => {
    const path = runSideAdaptivePath([{ qOver: 0.6, mOver: 0.5, y: 8, line: 8 }]);
    expect(path.steps).toHaveLength(0);
    expect(path.finalCapital).toBe(1);
  });
});
