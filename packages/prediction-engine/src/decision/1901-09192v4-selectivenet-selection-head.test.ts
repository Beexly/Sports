// Tests for decision/1901-09192v4-selectivenet-selection-head.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  selectiveNetLoss,
  selectiveNetPublishMask,
  coveredSetRoi,
  selectiveNetGatePasses,
  SELECTIVENET_TARGET_COVERAGE,
} from "./1901-09192v4-selectivenet-selection-head.js";

describe("selectiveNetLoss (1901.09192v4)", () => {
  it("penalizes missing the target coverage", () => {
    const n = 100;
    const loss = new Array<number>(n).fill(0.4);
    const aux = new Array<number>(n).fill(0.4);
    const lowGate = new Array<number>(n).fill(0.05); // coverage 0.05 << 0.30
    const goodGate = new Array<number>(n).fill(0.3); // coverage == target
    const low = selectiveNetLoss(loss, lowGate, aux);
    const good = selectiveNetLoss(loss, goodGate, aux);
    expect(low.coverage).toBeCloseTo(0.05, 10);
    expect(good.coverage).toBeCloseTo(0.3, 10);
    expect(low.total).toBeGreaterThan(good.total); // coverage penalty bites
  });
  it("selective risk weights losses by the gate", () => {
    // Gate selects only the zero-loss picks -> selective risk 0.
    const perPickLoss = [0, 0, 1, 1];
    const gate = [1, 1, 0, 0];
    const { selectiveRisk } = selectiveNetLoss(perPickLoss, gate, [0, 0, 0, 0], 0.5, 0, 0);
    expect(selectiveRisk).toBeCloseTo(0, 10);
  });
  it("handles empty input", () => {
    expect(selectiveNetLoss([], [], [])).toEqual({ total: 0, selectiveRisk: 0, coverage: 0 });
  });
});

describe("selectiveNetPublishMask", () => {
  it("publishes exactly the top-c fraction by gate score", () => {
    const gates = [0.1, 0.9, 0.5, 0.7, 0.2, 0.8, 0.4, 0.6, 0.3, 0.05];
    const mask = selectiveNetPublishMask(gates, 0.3);
    expect(mask.filter(Boolean).length).toBe(3);
    expect(mask[1]).toBe(true); // 0.9
    expect(mask[5]).toBe(true); // 0.8
    expect(mask[3]).toBe(true); // 0.7
    expect(SELECTIVENET_TARGET_COVERAGE).toBe(0.3);
  });
});

describe("coveredSetRoi", () => {
  it("computes ROI/win-rate on the published set only", () => {
    const { roi, n, winRate } = coveredSetRoi(
      [true, true, false],
      [true, false, true],
      [2.0, 2.0, 2.0],
    );
    expect(n).toBe(2);
    expect(roi).toBeCloseTo(0, 10); // +1 -1 over 2 staked
    expect(winRate).toBeCloseTo(0.5, 10);
  });
});

describe("selectiveNetGatePasses", () => {
  it("requires >=2pp ROI lift AND p<0.05 paired significance", () => {
    const diffs = new Array<number>(200).fill(0.06); // consistent +6pp paired lift
    expect(selectiveNetGatePasses(0.08, 0.05, diffs)).toBe(true);
    expect(selectiveNetGatePasses(0.065, 0.05, diffs)).toBe(false); // <2pp lift
    const noisy = new Array<number>(200).fill(0).map((_, i) => (i % 2 === 0 ? 0.5 : -0.44)); // mean ~0.03, high var
    expect(selectiveNetGatePasses(0.09, 0.05, noisy)).toBe(false); // insignificant
  });
});
