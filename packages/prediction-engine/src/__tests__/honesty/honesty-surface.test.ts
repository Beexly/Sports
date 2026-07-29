import { describe, expect, it } from "vitest";
import {
  evaluateProductNoBet,
  runShuffledTimePlacebo,
  mulberry32,
  chainReceipts,
  recomputeChain,
  ledgerHead,
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

describe("placebo", () => {
  it("near-zero series passes", () => {
    const series = Array.from({ length: 50 }, () => 0.0001);
    const r = runShuffledTimePlacebo(series, { threshold: 0.01, rng: mulberry32(1) });
    expect(r.pass).toBe(true);
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
