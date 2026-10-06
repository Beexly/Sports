import { describe, expect, it } from "vitest";
import {
  computeLineMovements,
  STEAM_MOVE_POINTS,
  type SnapshotLike,
} from "@/lib/ops/line-movement";

function snap(partial: Partial<SnapshotLike> & { gameId: string }): SnapshotLike {
  return {
    capturedAt: new Date("2026-10-01T12:00:00Z"),
    phase: "INTERIM",
    book: "pinnacle",
    market: "SPREAD",
    line: -3,
    ...partial,
  };
}

describe("computeLineMovements", () => {
  it("computes open → latest movement as book-median consensus", () => {
    const rows = [
      snap({ gameId: "g1", phase: "OPEN", book: "a", line: -3, capturedAt: new Date("2026-10-01T08:00:00Z") }),
      snap({ gameId: "g1", phase: "OPEN", book: "b", line: -3.5, capturedAt: new Date("2026-10-01T08:00:00Z") }),
      snap({ gameId: "g1", phase: "CLOSE", book: "a", line: -6, capturedAt: new Date("2026-10-01T18:00:00Z") }),
      snap({ gameId: "g1", phase: "CLOSE", book: "b", line: -6.5, capturedAt: new Date("2026-10-01T18:00:00Z") }),
    ];
    const [m] = computeLineMovements(rows);
    // Note: the module rounds to 1 decimal for display (−3.25 → −3.3 in JS
    // toFixed); the consensus math underneath is the exact book-median.
    expect(m!.openLine).toBeCloseTo(-3.3, 5);
    expect(m!.latestLine).toBeCloseTo(-6.3, 5);
    expect(m!.movement).toBeCloseTo(-3, 5);
    expect(m!.openPhase).toBe("OPEN");
    expect(m!.steamCandidate).toBe(true);
  });

  it("a stale outlier book does not drag the median", () => {
    const rows = [
      snap({ gameId: "g2", phase: "OPEN", book: "a", line: -3, capturedAt: new Date("2026-10-01T08:00:00Z") }),
      snap({ gameId: "g2", phase: "OPEN", book: "b", line: -3, capturedAt: new Date("2026-10-01T08:00:00Z") }),
      snap({ gameId: "g2", phase: "OPEN", book: "c", line: -3, capturedAt: new Date("2026-10-01T08:00:00Z") }),
      // Book c never moved off its stale opener; a and b did.
      snap({ gameId: "g2", phase: "CLOSE", book: "a", line: -4.5, capturedAt: new Date("2026-10-01T18:00:00Z") }),
      snap({ gameId: "g2", phase: "CLOSE", book: "b", line: -4.5, capturedAt: new Date("2026-10-01T18:00:00Z") }),
      snap({ gameId: "g2", phase: "CLOSE", book: "c", line: -3, capturedAt: new Date("2026-10-01T18:00:00Z") }),
    ];
    const [m] = computeLineMovements(rows);
    expect(m!.latestLine).toBeCloseTo(-4.5, 5);
    expect(m!.movement).toBeCloseTo(-1.5, 5);
    expect(m!.steamCandidate).toBe(false);
  });

  it("falls back to earliest-available when no OPEN phase exists — and says so", () => {
    const rows = [
      snap({ gameId: "g3", phase: "INTERIM", book: "a", line: -7, capturedAt: new Date("2026-10-01T10:00:00Z") }),
      snap({ gameId: "g3", phase: "INTERIM", book: "a", line: -7.5, capturedAt: new Date("2026-10-01T14:00:00Z") }),
    ];
    const [m] = computeLineMovements(rows);
    expect(m!.openPhase).toBe("EARLIEST_AVAILABLE");
    expect(m!.movement).toBeCloseTo(-0.5, 5);
  });

  it("skips moneyline rows (null line) rather than inventing a movement", () => {
    const rows = [
      snap({ gameId: "g4", market: "MONEYLINE", line: null }),
      snap({ gameId: "g4", market: "MONEYLINE", line: null, capturedAt: new Date("2026-10-01T18:00:00Z") }),
    ];
    expect(computeLineMovements(rows)).toHaveLength(0);
  });

  it("sorts by absolute movement — biggest movers first", () => {
    const rows = [
      snap({ gameId: "g5", phase: "OPEN", book: "a", line: -3, capturedAt: new Date("2026-10-01T08:00:00Z") }),
      snap({ gameId: "g5", phase: "CLOSE", book: "a", line: -3.5, capturedAt: new Date("2026-10-01T18:00:00Z") }),
      snap({ gameId: "g6", phase: "OPEN", book: "a", line: 45, market: "TOTAL", capturedAt: new Date("2026-10-01T08:00:00Z") }),
      snap({ gameId: "g6", phase: "CLOSE", book: "a", line: 41, market: "TOTAL", capturedAt: new Date("2026-10-01T18:00:00Z") }),
    ];
    const ms = computeLineMovements(rows);
    expect(ms[0]!.gameId).toBe("g6");
    expect(ms[0]!.steamCandidate).toBe(true);
    expect(STEAM_MOVE_POINTS).toBe(2.0);
  });

  it("uses the earliest capture per book for open and latest per book for close", () => {
    const rows = [
      snap({ gameId: "g7", phase: "OPEN", book: "a", line: -2, capturedAt: new Date("2026-10-01T06:00:00Z") }),
      snap({ gameId: "g7", phase: "OPEN", book: "a", line: -2.5, capturedAt: new Date("2026-10-01T08:00:00Z") }),
      snap({ gameId: "g7", phase: "CLOSE", book: "a", line: -5, capturedAt: new Date("2026-10-01T16:00:00Z") }),
      snap({ gameId: "g7", phase: "CLOSE", book: "a", line: -5.5, capturedAt: new Date("2026-10-01T18:00:00Z") }),
    ];
    const [m] = computeLineMovements(rows);
    expect(m!.openLine).toBe(-2);
    expect(m!.latestLine).toBe(-5.5);
  });
});
