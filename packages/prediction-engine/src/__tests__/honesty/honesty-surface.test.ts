import { describe, expect, it } from "vitest";
import {
  evaluateProductNoBet,
  runShuffledTimePlacebo,
  mulberry32,
  chainReceipts,
  recomputeChain,
  ledgerHead,
  type PlaceboPair,
} from "../../index.js";

describe("evaluateProductNoBet", () => {
  it("REFUSE when LIVE_BOARD off", () => {
    const d = evaluateProductNoBet({
      liveBoardEnabled: false,
      n: 200,
      nMin: 100,
      width: 0.05,
      widthMax: 0.15,
      pLo: 0.58,
      q: 0.52,
      tau: 0.02,
      oddsAgeMs: 1000,
      maxOddsAgeMs: 30_000,
    });
    expect(d.action).toBe("NO_BET");
    expect(d.codes).toContain("LIVE_BOARD_OFF");
  });

  it("PLAY only when all gates open", () => {
    const d = evaluateProductNoBet({
      liveBoardEnabled: true,
      n: 200,
      nMin: 100,
      width: 0.05,
      widthMax: 0.15,
      pLo: 0.58,
      q: 0.52,
      tau: 0.02,
      oddsAgeMs: 1000,
      maxOddsAgeMs: 30_000,
    });
    expect(d.action).toBe("PLAY");
    expect(d.codes).toHaveLength(0);
  });
});

describe("placebo (label-permutation harness)", () => {
  it("rejects bare CLV series fail-closed (legacy no-op / inverted gate)", () => {
    // Real edge series used to fail the gate — that was inverted leakage semantics.
    const realEdge = Array.from({ length: 50 }, () => 0.04);
    const r = runShuffledTimePlacebo(realEdge, { threshold: 0.01, rng: mulberry32(1) });
    expect(r.pass).toBe(false);
    expect(r.detail).toMatch(/unsupported_input/);
  });

  it("near-zero independent pairs pass after scramble", () => {
    const rng = mulberry32(7);
    const pairs: PlaceboPair[] = Array.from({ length: 50 }, () => ({
      modelSignal: rng() * 0.1 - 0.05,
      realizedReturn: rng() * 0.02 - 0.01,
    }));
    const r = runShuffledTimePlacebo(pairs, { threshold: 0.01, rng: mulberry32(1), runs: 32 });
    expect(r.pass).toBe(true);
    expect(r.placeboAbsAssociation).toBeLessThanOrEqual(0.01);
  });

  it("does not fail merely because observed edge is large", () => {
    // Strong co-movement on the true pairing is real edge, not a harness fail.
    // After scramble association collapses → pass.
    const pairs: PlaceboPair[] = Array.from({ length: 60 }, (_, i) => {
      const signal = (i % 2 === 0 ? 1 : -1) * (0.05 + (i % 5) * 0.01);
      return { modelSignal: signal, realizedReturn: signal * 0.8 };
    });
    const r = runShuffledTimePlacebo(pairs, { threshold: 0.01, rng: mulberry32(99), runs: 40 });
    expect(Math.abs(r.observedAssociation)).toBeGreaterThan(0.001);
    expect(r.pass).toBe(true);
  });

  it("fails closed on degenerate constant signal", () => {
    const pairs: PlaceboPair[] = Array.from({ length: 40 }, () => ({
      modelSignal: 0.02,
      realizedReturn: 0.01,
    }));
    const r = runShuffledTimePlacebo(pairs, { threshold: 0.01, rng: mulberry32(3) });
    expect(r.pass).toBe(false);
    expect(r.detail).toMatch(/degenerate_signal/);
  });

  it("sample floor still enforced", () => {
    const pairs: PlaceboPair[] = Array.from({ length: 10 }, (_, i) => ({
      modelSignal: i,
      realizedReturn: i * 0.01,
    }));
    const r = runShuffledTimePlacebo(pairs);
    expect(r.pass).toBe(false);
    expect(r.detail).toMatch(/sample_floor/);
  });
});

describe("glass receipts", () => {
  it("recompute verifies chain", () => {
    const chain = chainReceipts([
      {
        pickId: "a",
        sport: "NFL",
        market: "spread",
        selection: "KC -3",
        modelVersion: "m1",
        committedAt: "2025-11-01T18:00:00.000Z",
        settledAt: "2025-11-01T22:00:00.000Z",
        result: "WIN",
        edgeIndex: 0.04,
        clv: 0.01,
      },
      {
        pickId: "b",
        sport: "NFL",
        market: "total",
        selection: "Under 47",
        modelVersion: "m1",
        committedAt: "2025-11-02T18:00:00.000Z",
        result: "OPEN",
      },
    ]);
    const r = recomputeChain(chain);
    expect(r.ok).toBe(true);
    const head = ledgerHead(chain, 100);
    expect(head.winRatePublic).toBe(false);
    expect(head.masterFingerprint).toBe(r.master);
  });
});
