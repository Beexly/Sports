import { describe, expect, it } from "vitest";
import {
  mulberry32,
  runShuffledTimePlacebo,
  type PlaceboPair,
} from "../placebo-leak.js";

function pairs(n: number, correlated: boolean): PlaceboPair[] {
  const out: PlaceboPair[] = [];
  for (let i = 0; i < n; i++) {
    const signal = (i - (n - 1) / 2) / n;
    const noise = ((i * 17) % 7) / 100;
    out.push({
      modelSignal: signal,
      realizedReturn: correlated ? signal + noise : noise,
    });
  }
  return out;
}

describe("runShuffledTimePlacebo fail-closed inputs", () => {
  it("rejects a bare number[]", () => {
    const report = runShuffledTimePlacebo([0.1, -0.2, 0.05, 0.0]);
    expect(report.pass).toBe(false);
    expect(report.detail).toMatch(/unsupported_input/);
    expect(report.runs).toBe(0);
  });

  it("fails closed when n < 20 paired observations", () => {
    const report = runShuffledTimePlacebo(pairs(19, true), { rng: mulberry32(1) });
    expect(report.pass).toBe(false);
    expect(report.n).toBe(19);
    expect(report.detail).toMatch(/sample_floor/);
  });

  it("fails closed with degenerate_signal when modelSignal has zero variance", () => {
    const input: PlaceboPair[] = Array.from({ length: 24 }, (_, i) => ({
      modelSignal: 0.42,
      realizedReturn: (i % 2 === 0 ? 1 : -1) * 0.1,
    }));
    const report = runShuffledTimePlacebo(input, { rng: mulberry32(2) });
    expect(report.pass).toBe(false);
    expect(report.detail).toMatch(/degenerate_signal/);
  });
});

describe("runShuffledTimePlacebo scramble semantics", () => {
  it("passes when a genuine label permutation collapses association", () => {
    const report = runShuffledTimePlacebo(pairs(40, true), {
      rng: mulberry32(42),
      runs: 32,
      threshold: 0.02,
    });
    expect(report.n).toBe(40);
    expect(report.pass).toBe(true);
    expect(Math.abs(report.observedAssociation)).toBeGreaterThan(report.placeboAbsAssociation);
  });

  it("fails when structure survives because the scramble is a no-op", () => {
    const identityRng = () => 1;
    const report = runShuffledTimePlacebo(pairs(40, true), {
      rng: identityRng,
      runs: 8,
      threshold: 0.0001,
    });
    expect(report.pass).toBe(false);
    expect(report.detail).toMatch(/survived scramble/);
  });
});

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    const c = mulberry32(124);
    expect(c()).not.toBe(seqA[0]);
  });
});
