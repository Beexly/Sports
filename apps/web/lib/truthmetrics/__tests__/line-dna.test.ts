/**
 * Line DNA — per-game path summary tests.
 *
 * Synthetic fixture rows only. The real archive needs ≥7 days of
 * OPEN/INTERIM/CLOSE rows; these tests prove the library against known-input,
 * known-output shapes.
 */
import { describe, expect, it } from "vitest";

import type { LineSnapshot } from "@/lib/truthmetrics/line-snapshot";
import { computeLineDna, computeLineDnaAllMarkets } from "@/lib/truthmetrics/line-dna";

const KICKOFF = "2026-09-10T20:00:00.000Z";

function snap(
  capturedAt: string,
  price: number,
  line: number | null,
  book: string,
  phase: "OPEN" | "INTERIM" | "CLOSE" = "INTERIM",
  side = "Chiefs -3.5",
  overrides: Partial<LineSnapshot> = {},
): LineSnapshot {
  return {
    capturedAt,
    phase,
    book,
    market: "SPREAD",
    side,
    price,
    line,
    source: "test",
    ...overrides,
  };
}

describe("computeLineDna — honest-empty contract", () => {
  it("returns hasEnoughData=false with 0 snapshots", () => {
    const result = computeLineDna("g1", KICKOFF, [], "SPREAD", "Chiefs -3.5");
    expect(result.hasEnoughData).toBe(false);
    expect(result.emptyReason).toContain("no snapshots");
    expect(result.normalizedTotalVariation).toBeNull();
    expect(result.incrementCount).toBeNull();
    expect(result.bookCount).toBeNull();
    expect(result.firstSnapshotAge).toBeNull();
    expect(result.lastSnapshotAge).toBeNull();
  });

  it("returns hasEnoughData=false with 1 snapshot (no path)", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T18:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
    ], "SPREAD", "Chiefs -3.5");
    expect(result.hasEnoughData).toBe(false);
    expect(result.emptyReason).toContain("single snapshot");
    // Book count is still valid (1 book showed up).
    expect(result.bookCount).toBe(1);
    expect(result.firstSnapshotAge).not.toBeNull();
    expect(result.lastSnapshotAge).not.toBeNull();
  });
});

describe("computeLineDna — path metrics", () => {
  it("computes TV, increments, and book count for a flat line", () => {
    // 3 books, same line -3.5, captured at 3 times.
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -3.5, "bookB", "INTERIM"),
      snap("2026-09-10T14:00:00.000Z", -110, -3.5, "bookC", "CLOSE"),
    ], "SPREAD", "Chiefs -3.5");

    expect(result.hasEnoughData).toBe(true);
    expect(result.normalizedTotalVariation).toBe(0); // no movement
    expect(result.incrementCount).toBe(0);
    expect(result.bookCount).toBe(3);
    // 2026-09-10T20:00 UTC kickoff. First capture at 10:00 UTC = 10h before.
    expect(result.firstSnapshotAge).toBeCloseTo(10, 5); // 10h before kickoff
    expect(result.lastSnapshotAge).toBeCloseTo(6, 5);   // 14:00 UTC = 6h before
    expect(result.firstSnapshotPhase).toBe("OPEN");
    expect(result.lastSnapshotPhase).toBe("CLOSE");
    expect(result.emptyReason).toBeNull();
  });

  it("computes TV for a line that moves from -3.5 to -4.0 to -3.0", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "INTERIM"),
      snap("2026-09-10T14:00:00.000Z", -110, -3.0, "bookA", "CLOSE"),
    ], "SPREAD", "Chiefs -3.5");

    expect(result.hasEnoughData).toBe(true);
    // Total variation = |(-4.0)-(-3.5)| + |(-3.0)-(-4.0)| = 0.5 + 1.0 = 1.5
    // Range = max(-3.0) - min(-4.0) = 1.0
    // Normalized TV = 1.5 / 1.0 = 1.5
    expect(result.normalizedTotalVariation).toBeCloseTo(1.5, 6);
    expect(result.incrementCount).toBe(2);
    expect(result.bookCount).toBe(1);
  });

  it("deduplicates consecutive same-value snapshots for increment count", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T10:05:00.000Z", -110, -3.5, "bookA", "INTERIM"), // same value
      snap("2026-09-10T10:10:00.000Z", -110, -3.5, "bookA", "INTERIM"), // same value
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "CLOSE"),
    ], "SPREAD", "Chiefs -3.5");

    expect(result.incrementCount).toBe(1);
    // TV = 0.5, range = 0.5, normalized = 1.0
    expect(result.normalizedTotalVariation).toBeCloseTo(1.0, 6);
  });

  it("uses price (not line) for moneyline markets where line is null", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T10:00:00.000Z", 1.95, null, "bookA", "OPEN", "Chiefs ML", { market: "MONEYLINE" }),
      snap("2026-09-10T12:00:00.000Z", 2.05, null, "bookA", "INTERIM", "Chiefs ML", { market: "MONEYLINE" }),
      snap("2026-09-10T14:00:00.000Z", 2.10, null, "bookA", "CLOSE", "Chiefs ML", { market: "MONEYLINE" }),
    ], "MONEYLINE", "Chiefs ML");

    expect(result.hasEnoughData).toBe(true);
    // TV = |2.05-1.95| + |2.10-2.05| = 0.10 + 0.05 = 0.15
    // Range = 2.10 - 1.95 = 0.15
    // Normalized = 0.15 / 0.15 = 1.0
    expect(result.normalizedTotalVariation).toBeCloseTo(1.0, 6);
    expect(result.incrementCount).toBe(2);
  });

  it("counts distinct books correctly with 3 books, 4 snapshots", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookB", "OPEN"),
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookC", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "CLOSE"),
    ], "SPREAD", "Chiefs -3.5");

    expect(result.bookCount).toBe(3);
    // All at same time except last → sorted: A(-3.5), B(-3.5), C(-3.5), A(-4.0)
    // TV = |(-3.5)-(-3.5)| + |(-3.5)-(-3.5)| + |(-4.0)-(-3.5)| = 0 + 0 + 0.5 = 0.5
    // Range = 0.5, normalized = 1.0
    expect(result.normalizedTotalVariation).toBeCloseTo(1.0, 6);
    expect(result.incrementCount).toBe(1);
  });

  it("returns TV=0 when line never moves (all same value)", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T11:00:00.000Z", -110, -3.5, "bookA", "INTERIM"),
      snap("2026-09-10T12:00:00.000Z", -110, -3.5, "bookA", "CLOSE"),
    ], "SPREAD", "Chiefs -3.5");

    expect(result.normalizedTotalVariation).toBe(0);
    expect(result.incrementCount).toBe(0);
  });

  it("filters to the requested market and side", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "CLOSE"),
      snap("2026-09-10T10:00:00.000Z", 1.95, null, "bookA", "OPEN", "Chiefs ML", { market: "MONEYLINE", side: "Chiefs ML" }),
    ], "SPREAD", "Chiefs -3.5");

    expect(result.hasEnoughData).toBe(true);
    expect(result.incrementCount).toBe(1); // only the spread line moved; ML filtered out
  });
});

describe("computeLineDna — sorting and phases", () => {
  it("sorts snapshots chronologically even if provided in reverse order", () => {
    const result = computeLineDna("g1", KICKOFF, [
      snap("2026-09-10T14:00:00.000Z", -110, -3.0, "bookA", "CLOSE"),
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "INTERIM"),
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
    ], "SPREAD", "Chiefs -3.5");

    expect(result.firstSnapshotPhase).toBe("OPEN");
    expect(result.lastSnapshotPhase).toBe("CLOSE");
    // TV = |(-4.0)-(-3.5)| + |(-3.0)-(-4.0)| = 0.5 + 1.0 = 1.5, range=1.0, norm=1.5
    expect(result.normalizedTotalVariation).toBeCloseTo(1.5, 6);
  });
});

describe("computeLineDnaAllMarkets", () => {
  it("returns one result per (market, side) group", () => {
    const snaps: LineSnapshot[] = [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "CLOSE"),
      snap("2026-09-10T10:00:00.000Z", 2.0, null, "bookA", "OPEN", "Chiefs ML", { market: "MONEYLINE" }),
      snap("2026-09-10T12:00:00.000Z", 1.95, null, "bookA", "CLOSE", "Chiefs ML", { market: "MONEYLINE" }),
    ];
    const results = computeLineDnaAllMarkets("g1", KICKOFF, snaps);
    expect(results).toHaveLength(2);
    const markets = results.map((r) => r.market);
    expect(markets).toContain("SPREAD");
    expect(markets).toContain("MONEYLINE");
  });

  it("returns empty array for empty input", () => {
    const results = computeLineDnaAllMarkets("g1", KICKOFF, []);
    expect(results).toHaveLength(0);
  });
});

describe("computeLineDna — snapshotHash", () => {
  it("produces same hash for identical inputs", () => {
    const snaps = [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "CLOSE"),
    ];
    const r1 = computeLineDna("g1", KICKOFF, snaps, "SPREAD", "Chiefs -3.5");
    const r2 = computeLineDna("g1", KICKOFF, snaps, "SPREAD", "Chiefs -3.5");
    expect(r1.snapshotHash).toBe(r2.snapshotHash);
  });

  it("produces different hash for different inputs", () => {
    const snaps1 = [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -4.0, "bookA", "CLOSE"),
    ];
    const snaps2 = [
      snap("2026-09-10T10:00:00.000Z", -110, -3.5, "bookA", "OPEN"),
      snap("2026-09-10T12:00:00.000Z", -110, -3.5, "bookA", "CLOSE"), // same line
    ];
    const r1 = computeLineDna("g1", KICKOFF, snaps1, "SPREAD", "Chiefs -3.5");
    const r2 = computeLineDna("g1", KICKOFF, snaps2, "SPREAD", "Chiefs -3.5");
    expect(r1.snapshotHash).not.toBe(r2.snapshotHash);
  });
});
