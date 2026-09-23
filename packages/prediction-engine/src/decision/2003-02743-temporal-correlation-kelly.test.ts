// Tests for decision/2003-02743-temporal-correlation-kelly.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  lag1Autocorrelation,
  autocorrSignificant95,
  testLag1,
  fitMemoryOne,
  temporalAdjustmentFactor,
  correlationAwareKellyFraction,
  temporalKellyGatePasses,
} from "./2003-02743-temporal-correlation-kelly.js";

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

describe("lag1Autocorrelation (2003.02743)", () => {
  it("detects strong positive autocorrelation", () => {
    const rand = mulberry32(21);
    // AR(1) with phi = 0.7.
    const s: number[] = [0];
    for (let i = 1; i < 500; i++) s.push(0.7 * s[i - 1]! + (rand() - 0.5));
    const rho = lag1Autocorrelation(s);
    expect(rho).toBeGreaterThan(0.5);
    expect(autocorrSignificant95(rho, s.length)).toBe(true);
  });
  it("finds nothing in white noise", () => {
    const rand = mulberry32(22);
    const s = Array.from({ length: 500 }, () => rand() - 0.5);
    const { rho, significant } = testLag1(s);
    expect(Math.abs(rho)).toBeLessThan(0.2);
    expect(significant).toBe(false);
  });
  it("needs enough samples for significance", () => {
    expect(autocorrSignificant95(0.9, 2)).toBe(false);
  });
});

describe("fitMemoryOne", () => {
  it("recovers win-stay / win-shift probabilities", () => {
    const rand = mulberry32(23);
    const outcomes: boolean[] = [rand() < 0.5];
    for (let i = 1; i < 2000; i++) {
      const prev = outcomes[i - 1]!;
      outcomes.push(rand() < (prev ? 0.7 : 0.4));
    }
    const { p11, p01 } = fitMemoryOne(outcomes);
    expect(Math.abs(p11 - 0.7)).toBeLessThan(0.05);
    expect(Math.abs(p01 - 0.4)).toBeLessThan(0.05);
  });
});

describe("temporalAdjustmentFactor", () => {
  it("scales up under positive persistence, down under negative", () => {
    const up = temporalAdjustmentFactor(0.7, 0.4, 0.6);
    const down = temporalAdjustmentFactor(0.4, 0.7, 0.6);
    expect(up).toBeGreaterThan(1);
    expect(down).toBeLessThan(1);
  });
  it("is bounded", () => {
    expect(temporalAdjustmentFactor(1, 0, 0.99)).toBeLessThanOrEqual(4);
    expect(temporalAdjustmentFactor(0, 1, 0.6)).toBeGreaterThanOrEqual(0.25);
  });
});

describe("correlationAwareKellyFraction", () => {
  it("falls back to classical Kelly when autocorrelation is insignificant", () => {
    const rand = mulberry32(24);
    const edge = Array.from({ length: 300 }, () => (rand() - 0.45) * 0.2);
    const outcomes = edge.map((e) => e > 0);
    const { fraction, adjusted } = correlationAwareKellyFraction(0.6, 2.0, outcomes, edge, 0.25);
    expect(adjusted).toBe(false);
    expect(fraction).toBeCloseTo(0.2 * 0.25, 10); // classical 0.2 behind the cap
  });
  it("adjusts when autocorrelation is significant", () => {
    const rand = mulberry32(25);
    const edge: number[] = [0.1];
    for (let i = 1; i < 400; i++) edge.push(0.8 * edge[i - 1]! + (rand() - 0.5) * 0.1);
    const outcomes = edge.map((e) => e > 0);
    const { adjusted, rho } = correlationAwareKellyFraction(0.6, 2.0, outcomes, edge, 0.25);
    expect(adjusted).toBe(true);
    expect(Math.abs(rho)).toBeGreaterThan(0.3);
  });
});

describe("temporalKellyGatePasses", () => {
  it("encodes the significance + 3% lift gate", () => {
    expect(temporalKellyGatePasses(true, 0.031)).toBe(true);
    expect(temporalKellyGatePasses(false, 0.05)).toBe(false);
    expect(temporalKellyGatePasses(true, 0.029)).toBe(false);
  });
});
