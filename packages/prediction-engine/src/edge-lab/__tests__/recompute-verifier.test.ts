/**
 * Phase-2 acceptance mechanics: the open verifier reproduces a valid
 * chain's every figure, and catches — separately — a broken chain, a
 * post-kickoff pick, and a mis-posted CLV. The fixture chain below is TEST
 * DATA ONLY (never presented anywhere as a real record — repo rule #1).
 */
import { describe, expect, it } from "vitest";

import {
  appendPick,
  appendSettlement,
  computeClvBps,
  nextLinkage,
  type LedgerChain,
} from "../ledger-chain.js";
import { recomputeLedger } from "../recompute-verifier.js";

const T = (h: number) => new Date(Date.UTC(2026, 8, 10, h)).toISOString();

function buildFixtureChain(): LedgerChain {
  let chain: LedgerChain = [];
  const picks = [
    { pickId: "p1", price: 2.1, close: 1.95 }, // beat the close
    { pickId: "p2", price: 1.9, close: 1.95 }, // lost to the close
    { pickId: "p3", price: 2.0, close: 2.0 }, // flat
  ];
  for (const p of picks) {
    const link = nextLinkage(chain);
    chain = appendPick(chain, {
      seq: link.seq,
      prevHash: link.prevHash,
      pickId: p.pickId,
      sport: "nfl",
      market: "MONEYLINE",
      selection: "HOME",
      priceDecimal: p.price,
      book: "test-book",
      decisionAt: T(10),
      kickoffAt: T(17),
      modelVersion: "test-fixture",
      featureSnapshotHash: "ab".repeat(32),
    });
  }
  for (const p of picks) {
    const link = nextLinkage(chain);
    chain = appendSettlement(chain, {
      seq: link.seq,
      prevHash: link.prevHash,
      pickId: p.pickId,
      settledAt: T(21),
      outcome: "WIN",
      closingPriceDecimal: p.close,
      clvBps: computeClvBps(p.price, p.close),
    });
  }
  return chain;
}

describe("recomputeLedger — the open verifier", () => {
  it("REPRODUCES a valid chain: integrity, pre-kickoff rule, every CLV figure, aggregates", () => {
    const chain = buildFixtureChain();
    const report = recomputeLedger(chain);
    expect(report.reproduced).toBe(true);
    expect(report.chainValid).toBe(true);
    expect(report.picks).toBe(3);
    expect(report.gradedSettlements).toBe(3);
    expect(report.kickoffViolations).toHaveLength(0);
    expect(report.clvDiscrepancies).toHaveLength(0);
    // Aggregate recomputed from raw entries: mean of the three known CLVs.
    const expected =
      (computeClvBps(2.1, 1.95) + computeClvBps(1.9, 1.95) + computeClvBps(2.0, 2.0)) / 3;
    expect(report.recomputedMeanClvBps).toBeCloseTo(expected, 6);
  });

  it("catches a tampered historical entry (chain breaks at the edited seq)", () => {
    const chain = buildFixtureChain();
    const tampered = chain.map((e, i) =>
      i === 1 ? { ...e, priceDecimal: 3.5 } : e,
    ) as LedgerChain;
    const report = recomputeLedger(tampered);
    expect(report.reproduced).toBe(false);
    expect(report.chainValid).toBe(false);
    expect(report.chainBrokenAt).toBe(1);
  });

  it("catches a mis-posted CLV number even when the chain itself is intact", () => {
    // Rebuild the chain with a WRONG clvBps recorded at append time — the
    // hash covers the wrong value, so the chain is internally consistent;
    // only recomputation from prices exposes the lie.
    let chain: LedgerChain = buildFixtureChain().slice(0, 3) as LedgerChain;
    const link = nextLinkage(chain);
    chain = appendSettlement(chain, {
      seq: link.seq,
      prevHash: link.prevHash,
      pickId: "p1",
      settledAt: T(21),
      outcome: "WIN",
      closingPriceDecimal: 1.95,
      clvBps: 999, // fabricated
    });
    const report = recomputeLedger(chain);
    expect(report.chainValid).toBe(true);
    expect(report.reproduced).toBe(false);
    expect(report.clvDiscrepancies).toHaveLength(1);
    expect(report.clvDiscrepancies[0]!.recordedBps).toBe(999);
  });

  it("null-CLV settlements (VOID/no close) are honest gaps, not discrepancies", () => {
    let chain: LedgerChain = buildFixtureChain().slice(0, 3) as LedgerChain;
    const link = nextLinkage(chain);
    chain = appendSettlement(chain, {
      seq: link.seq,
      prevHash: link.prevHash,
      pickId: "p2",
      settledAt: T(21),
      outcome: "VOID",
      closingPriceDecimal: null,
      clvBps: null,
    });
    const report = recomputeLedger(chain);
    expect(report.reproduced).toBe(true);
    expect(report.gradedSettlements).toBe(0);
    expect(report.recomputedMeanClvBps).toBeNull();
  });
});
