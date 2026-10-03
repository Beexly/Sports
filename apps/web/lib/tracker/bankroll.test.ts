import { describe, it, expect } from "vitest";
import { summarizeLedger, type BankrollEntry } from "./bankroll";

describe("bankroll ledger (Wave4 #3)", () => {
  it("tracks running bankroll, peak, and wins/losses", () => {
    const entries: BankrollEntry[] = [
      { id: "b1", stake: 10, result: "win", returned: 19.09 },
      { id: "b2", stake: 10, result: "loss" },
      { id: "b3", stake: 5, result: "pending" },
    ];
    const s = summarizeLedger(100, entries);
    expect(s.current).toBeCloseTo(99.09, 2);
    expect(s.peak).toBeCloseTo(109.09, 2);
    expect(s.settled).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.guardTripped).toBe(false);
  });

  it("trips the drawdown guard past the limit", () => {
    const entries: BankrollEntry[] = [
      { id: "b1", stake: 40, result: "loss" },
      { id: "b2", stake: 20, result: "loss" },
    ];
    const s = summarizeLedger(100, entries, 50);
    expect(s.current).toBe(40);
    expect(s.drawdown).toBe(60);
    expect(s.guardTripped).toBe(true);
  });

  it("pushes leave the bankroll untouched", () => {
    const s = summarizeLedger(100, [{ id: "b1", stake: 10, result: "push" }]);
    expect(s.current).toBe(100);
    expect(s.pushes).toBe(1);
  });
});
