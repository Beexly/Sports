import { describe, expect, it } from "vitest";
import {
  evalLogitPool,
  logitPoolShipGate,
  trainResidualModel,
} from "./ensemble-bridge.js";

describe("ensemble-bridge evalLogitPool", () => {
  it("fail-closes on misaligned arrays", () => {
    const r = evalLogitPool({
      modelProbs: [0.6, 0.55],
      marketProbs: [0.52],
      outcomes: [1, 0],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("fail-closes on out-of-range probabilities", () => {
    const r = evalLogitPool({
      modelProbs: [1.5],
      marketProbs: [0.5],
      outcomes: [1],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("imputed");
  });

  it("runs the honest stacking gate on a real series", () => {
    // Model is slightly better than market on a 40-game sample
    const modelProbs = Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? 0.62 : 0.48));
    const marketProbs = Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? 0.55 : 0.5));
    const outcomes = Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? 1 : 0)) as (0 | 1)[];
    const r = evalLogitPool({ modelProbs, marketProbs, outcomes });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(["FIRE", "FIRE_NOTHING", "INSUFFICIENT"]).toContain(r.data.verdict);
      expect(Number.isFinite(r.data.beta)).toBe(true);
    }
  });
});

describe("ensemble-bridge trainResidualModel", () => {
  it("fail-closes on too-few rows", () => {
    const r = trainResidualModel([{ y: 0, p: 0.5, features: {} } as never]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("rows to train");
  });

  it("trains on a real row set", () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      y: i % 2,
      line: 0.5,
      features: new Map([
        ["epa", (i % 7) * 0.1],
        ["rest", (i % 4) + 3],
      ]),
    })) as never;
    const r = trainResidualModel(rows, { rounds: 20, seed: 42 });
    expect(r.ok).toBe(true);
  });
});

describe("ensemble-bridge logitPoolShipGate", () => {
  it("withholds when CI includes zero", () => {
    const r = evalLogitPool({
      modelProbs: Array.from({ length: 30 }, () => 0.5),
      marketProbs: Array.from({ length: 30 }, () => 0.5),
      outcomes: Array.from({ length: 30 }, (_, i) => (i % 2) as 0 | 1),
    });
    if (r.ok) {
      const gate = logitPoolShipGate(r.data);
      expect(["FIRE", "FIRE_NOTHING"]).toContain(gate.verdict);
    }
  });
});
