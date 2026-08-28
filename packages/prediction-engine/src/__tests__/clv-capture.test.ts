import { describe, expect, it } from "vitest";
import {
  deriveClosingSnapshotFromOdds,
  resolveCloseSourceLadder,
  type CloseSnapshotRow,
  type ClosingOddsRow,
} from "../clv-capture.js";

const someClose = (ts: number): ClosingOddsRow => ({
  market: "SPREADS",
  fetchedAt: new Date(ts),
  spread: -3.5,
  total: null,
  homePrice: -110,
  awayPrice: -110,
});

describe("resolveCloseSourceLadder", () => {
  const fallback = deriveClosingSnapshotFromOdds(
    [someClose(Date.parse("2026-09-10T16:00:00Z"))],
    new Date("2026-09-10T17:00:00Z"),
  );

  it("falls back to the soft average when no CLOSE rows exist", () => {
    const r = resolveCloseSourceLadder([], fallback);
    expect(r.usedCloseSource).toBe(false);
    expect(r.snapshot).toBe(fallback);
  });

  it("prefers per-book CLOSE spread rows over the soft average", () => {
    const closeRows: CloseSnapshotRow[] = [
      { phase: "CLOSE", book: "pinnacle", market: "SPREADS", side: "HOME", price: null, line: -4.0 },
      { phase: "CLOSE", book: "circa", market: "SPREADS", side: "HOME", price: null, line: -4.5 },
    ];
    const r = resolveCloseSourceLadder(closeRows, fallback);
    expect(r.usedCloseSource).toBe(true);
    // CLOSE rows say HOME -4.25, soft average said -3.5 — the ladder prefers CLOSE.
    expect(r.snapshot.spreadHome).toBeCloseTo(-4.25, 5);
  });

  it("prefers CLOSE ML prices (probability-space avg) and keeps soft total when absent", () => {
    const closeRows: CloseSnapshotRow[] = [
      { phase: "CLOSE", book: "pinnacle", market: "H2H", side: "HOME", price: -150, line: null },
      { phase: "CLOSE", book: "circa", market: "H2H", side: "HOME", price: -160, line: null },
      { phase: "CLOSE", book: "pinnacle", market: "H2H", side: "AWAY", price: 130, line: null },
    ];
    const r = resolveCloseSourceLadder(closeRows, fallback);
    expect(r.usedCloseSource).toBe(true);
    expect(r.snapshot.mlHomePrice).not.toBeNull();
    expect(r.snapshot.mlAwayPrice).not.toBeNull();
    // Total was not captured as CLOSE -> soft-average value is retained.
    expect(r.snapshot.total).toBe(fallback.total);
  });

  it("ignores OPEN/INTERIM rows and only counts CLOSE", () => {
    const closeRows: CloseSnapshotRow[] = [
      { phase: "OPEN", book: "dk", market: "SPREADS", side: "HOME", price: null, line: -2.0 },
      { phase: "INTERIM", book: "mgm", market: "SPREADS", side: "HOME", price: null, line: -2.5 },
    ];
    const r = resolveCloseSourceLadder(closeRows, fallback);
    expect(r.usedCloseSource).toBe(false);
    expect(r.snapshot).toBe(fallback);
  });
});
