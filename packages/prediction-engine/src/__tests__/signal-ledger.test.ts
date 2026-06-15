import { describe, it, expect } from "vitest";
import { composeLedger, ledgerAgeDays, type LedgerSignalRow } from "../signal-ledger.js";

const NOW = "2026-06-15T00:00:00.000Z";

describe("ledgerAgeDays", () => {
  it("computes day age and clamps future timestamps to 0", () => {
    expect(ledgerAgeDays("2026-06-08T00:00:00.000Z", NOW)).toBeCloseTo(7, 5);
    expect(ledgerAgeDays("2026-06-20T00:00:00.000Z", NOW)).toBe(0);
  });
  it("returns Infinity for an unparsable timestamp (so the signal decays out)", () => {
    expect(ledgerAgeDays("not-a-date", NOW)).toBe(Infinity);
  });
});

describe("composeLedger", () => {
  const row = (over: Partial<LedgerSignalRow>): LedgerSignalRow => ({ key: "k", value: 1, weight: 1, capturedAt: NOW, ...over });

  it("blends rows into an effective-weighted average with attribution order", () => {
    const r = composeLedger(
      [row({ key: "ngs.separation", value: 2, weight: 3 }), row({ key: "rest", value: -1, weight: 1 })],
      { now: NOW },
    );
    expect(r.score).toBeCloseTo(1.25, 4); // (2*3 + -1*1) / 4
    expect(r.signalsUsed).toBe(2);
    expect(r.contributions[0]!.key).toBe("ngs.separation"); // largest |contribution| first
  });

  it("discounts low-confidence (rumor) signals via the honesty valve", () => {
    const r = composeLedger(
      [row({ key: "stat", value: 1, confidence: 1 }), row({ key: "rumor", value: -1, confidence: 0.2 })],
      { now: NOW },
    );
    expect(r.score).toBeGreaterThan(0); // the confident +1 stat outweighs the discounted −1 rumor
    const rumor = r.contributions.find((c) => c.key === "rumor")!;
    const stat = r.contributions.find((c) => c.key === "stat")!;
    expect(rumor.weightShare).toBeLessThan(stat.weightShare);
  });

  it("decays stale signals and drops bad-timestamp signals entirely", () => {
    const r = composeLedger(
      [
        row({ key: "fresh", value: 1, capturedAt: NOW }),
        row({ key: "stale", value: 1, capturedAt: "2026-01-01T00:00:00.000Z" }),
        row({ key: "bad-ts", value: 5, weight: 10, capturedAt: "garbage" }),
      ],
      { now: NOW, halfLifeDays: 14 },
    );
    expect(r.signalsUsed).toBe(2); // bad-ts has zero effective weight
    expect(r.contributions.find((c) => c.key === "bad-ts")!.effectiveWeight).toBe(0);
    expect(r.contributions.find((c) => c.key === "stale")!.effectiveWeight).toBeGreaterThan(0);
  });
});
