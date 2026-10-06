import { describe, expect, it } from "vitest";
import {
  evalAdaErSelect,
  evalEwcAnchor,
  evalForgetting,
  evalNaturalGrad,
  evalOnlineMetrics,
  evalRwalkPenalty,
  evalSteinCoreset,
  evalTeacherStudent,
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

describe("continual-learning-bridge teacher-student + forgetting", () => {
  it("evalTeacherStudent EMA-updates and reports consistency loss", () => {
    const r = evalTeacherStudent({
      teacher: [0.5, 0.5, 0.5],
      student: [0.6, 0.4, 0.7],
      momentum: 0.9,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.teacher).toHaveLength(3);
      expect(Number.isFinite(r.data.consistencyLoss)).toBe(true);
    }
  });

  it("fail-closes on misaligned vectors", () => {
    const r = evalTeacherStudent({
      teacher: [0.5],
      student: [0.5, 0.5],
      momentum: 0.9,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("evalForgetting computes forget and BWT", () => {
    const r = evalForgetting({
      accBefore: [0.8, 0.75, 0.7],
      accAfter: [0.78, 0.76, 0.65],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.forget).toBeGreaterThan(0);
      expect(Number.isFinite(r.data.bwt)).toBe(true);
    }
  });

  it("evalRwalkPenalty returns a finite penalty", () => {
    const r = evalRwalkPenalty({
      theta: [1.1, 0.9],
      optParams: [[1.0, 1.0]],
      fishers: [[10, 5]],
      lambdas: [1.5],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.penalty)).toBe(true);
  });

  it("evalNaturalGrad takes one step", () => {
    const r = evalNaturalGrad({
      X: [[1, 0.5], [1, -0.3], [1, 0.8], [1, -1.0]],
      y: [1, 0, 1, 0],
      theta: [0, 0],
      damp: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.theta).toHaveLength(2);
  });

  it("evalSteinCoreset picks m representative rows", () => {
    const X = Array.from({ length: 20 }, (_, i) => [i * 0.1, (i % 5) * 0.3]);
    const r = evalSteinCoreset({ X, m: 5, bandwidth: 1.0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.indices).toHaveLength(5);
  });
});
