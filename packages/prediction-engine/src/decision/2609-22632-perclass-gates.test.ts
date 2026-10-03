// Tests for 2609.22632 per-class gates (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  mulberry32,
  classGateDecision,
  classErrorRate,
  classAbstentionRate,
  perClassGatePasses,
  type ClassGate,
} from "./2609-22632-perclass-gates.js";

const GATE: ClassGate = { marketType: "spread", errorCap: 0.45, threshold: 0.6 };

describe("classGateDecision", () => {
  it("posts above threshold and abstains below", () => {
    const rand = mulberry32(1);
    expect(classGateDecision(GATE, 0.7, rand)).toBe(true);
    expect(classGateDecision(GATE, 0.5, rand)).toBe(false);
  });

  it("randomizes exactly at the boundary", () => {
    let posts = 0;
    const trials = 200;
    for (let s = 0; s < trials; s++) {
      if (classGateDecision(GATE, 0.6, mulberry32(s))) posts++;
    }
    // ~50% post rate at the boundary (seeded, deterministic).
    expect(posts).toBeGreaterThan(trials * 0.3);
    expect(posts).toBeLessThan(trials * 0.7);
  });
});

describe("classErrorRate / classAbstentionRate", () => {
  it("measures posted error and abstention", () => {
    expect(classErrorRate([true, true, false], [1, 0, 0])).toBe(0.5);
    expect(classAbstentionRate([true, false, false])).toBeCloseTo(2 / 3, 12);
  });
});

describe("perClassGatePasses", () => {
  const caps = { spread: 0.45, total: 0.45, moneyline: 0.4 } as const;
  const under = { spread: 0.4, total: 0.42, moneyline: 0.35 } as const;
  const noFail = { spread: 0, total: 1, moneyline: 0 } as const;

  it("passes when caps hold with >=15% less abstention", () => {
    const r = perClassGatePasses(under, caps, 0.2, 0.3, noFail);
    expect(r.perClassUnderCap).toBe(true);
    expect(r.abstentionReduction).toBeCloseTo(1 / 3, 8);
    expect(r.hardFail).toBe(false);
    expect(r.passes).toBe(true);
  });

  it("rejects on cap breach, weak reduction, or hard fail", () => {
    const over = { ...under, total: 0.5 };
    expect(perClassGatePasses(over, caps, 0.2, 0.3, noFail).passes).toBe(false);
    expect(perClassGatePasses(under, caps, 0.28, 0.3, noFail).passes).toBe(false);
    const hard = { spread: 0, total: 2, moneyline: 0 } as const;
    const r = perClassGatePasses(under, caps, 0.2, 0.3, hard);
    expect(r.hardFail).toBe(true);
    expect(r.passes).toBe(false);
  });
});
