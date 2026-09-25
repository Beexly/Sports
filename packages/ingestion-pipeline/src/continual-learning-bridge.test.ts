import { describe, expect, it } from "vitest";
import {
  evalAdaErSelect,
  evalEwcAnchor,
  evalOnlineMetrics,
  settledBrier,
} from "./continual-learning-bridge.js";

describe("continual-learning-bridge evalOnlineMetrics", () => {
  it("fail-closes on misaligned weeks", () => {
    const r = evalOnlineMetrics({
      weeklyProbs: [[0.6, 0.5]],
      weeklyOutcomes: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("fail-closes on out-of-range probs", () => {
    const r = evalOnlineMetrics({
      weeklyProbs: [[1.5, 0.5]],
      weeklyOutcomes: [[1, 0]],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("imputed");
  });

  it("computes online metrics on real weekly series", () => {
    const r = evalOnlineMetrics({
      weeklyProbs: [
        [0.6, 0.55, 0.7],
        [0.4, 0.52, 0.61],
        [0.65, 0.48, 0.55],
      ],
      weeklyOutcomes: [
        [1, 1, 1],
        [0, 0, 1],
        [1, 0, 1],
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeDefined();
  });
});

describe("continual-learning-bridge evalEwcAnchor", () => {
  it("fail-closes on misaligned params", () => {
    const r = evalEwcAnchor({
      currentParams: [1, 2],
      anchoredParams: [1],
      fisherDiag: [1, 1],
      lambda: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("computes penalty, overlap, and regime", () => {
    const r = evalEwcAnchor({
      currentParams: [1.1, 0.9, 1.05],
      anchoredParams: [1, 1, 1],
      fisherDiag: [10, 2, 5],
      lambda: 1.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.penalty).toBeGreaterThan(0);
      expect(r.data.overlap).toBeGreaterThanOrEqual(0);
      expect(typeof r.data.regime).toBe("string");
    }
  });

  it("fail-closes on negative lambda", () => {
    const r = evalEwcAnchor({
      currentParams: [1],
      anchoredParams: [1],
      fisherDiag: [1],
      lambda: -1,
    });
    expect(r.ok).toBe(false);
  });
});

describe("continual-learning-bridge evalAdaErSelect", () => {
  it("fail-closes on misaligned losses", () => {
    const r = evalAdaErSelect({
      challengerLoss: [0.5, 0.6],
      championLoss: [0.4],
      newWeekIndices: [0],
      topP: 1,
      reservoirK: 1,
      labels: [0, 1],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("selects a replay buffer from interference scores", () => {
    const r = evalAdaErSelect({
      challengerLoss: [0.3, 0.8, 0.2, 0.9, 0.5, 0.1],
      championLoss: [0.2, 0.3, 0.15, 0.25, 0.2, 0.12],
      newWeekIndices: [4, 5],
      topP: 2,
      reservoirK: 1,
      labels: [0, 1, 0, 1, 0, 1],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeDefined();
  });
});

describe("continual-learning-bridge settledBrier", () => {
  it("computes Brier on a settled batch", () => {
    const b = settledBrier([0.7, 0.3, 0.6], [1, 0, 1]);
    expect(b).not.toBeNull();
    expect(b!).toBeGreaterThan(0);
    expect(b!).toBeLessThan(1);
  });

  it("returns null on misaligned inputs", () => {
    expect(settledBrier([0.5], [])).toBeNull();
    expect(settledBrier([], [1])).toBeNull();
  });
});
