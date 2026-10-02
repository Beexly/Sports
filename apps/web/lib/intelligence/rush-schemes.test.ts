import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * `rush-schemes.ts` had no test. It is a read-only loader whose entire
 * testable surface is (a) it FAILS CLOSED to `no-data` when the backfill has
 * not run, and (b) it never reports a player with zero runs as a scheme.
 * Both are honesty properties, and both were unpinned.
 */
const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { playerRushProfile: { findMany: mocks.findMany } } }));

import { loadRushSchemes } from "./rush-schemes";

const row = (over: Record<string, unknown> = {}) => ({
  gsisId: "g1", playerName: "Rusher", team: "CLE",
  runs: 100, guardRuns: 50, tackleRuns: 20, endRuns: 10, leftRuns: 8, middleRuns: 6, rightRuns: 6,
  epaPerRun: 0.4, ...over,
});

describe("loadRushSchemes", () => {
  beforeEach(() => { mocks.findMany.mockReset(); });

  it("reports no-data, not an empty slate, when the backfill has not run", async () => {
    mocks.findMany.mockResolvedValue([]);
    const r = await loadRushSchemes(2026);
    expect(r.status).toBe("no-data");
    expect(r.playerCount).toBe(0);
    expect(r.players).toEqual([]);
    expect(r.note).toMatch(/backfill/i);
  });

  it("survives a null return from the delegate", async () => {
    mocks.findMany.mockResolvedValue(null);
    const r = await loadRushSchemes(2026);
    expect(r.status).toBe("no-data");
  });

  it("excludes a player with zero runs rather than classifying them", async () => {
    mocks.findMany.mockResolvedValue([row(), row({ gsisId: "g0", playerName: "NoRuns", runs: 0 })]);
    const r = await loadRushSchemes(2026);
    expect(r.status).toBe("ok");
    expect(r.players.map((p) => p.playerName)).not.toContain("NoRuns");
  });

  it("sorts by run volume, strongest workload first", async () => {
    mocks.findMany.mockResolvedValue([
      row({ gsisId: "a", playerName: "Light", runs: 10 }),
      row({ gsisId: "b", playerName: "Heavy", runs: 200 }),
    ]);
    const r = await loadRushSchemes(2026);
    expect(r.players[0]?.playerName).toBe("Heavy");
  });

  it("honours the limit", async () => {
    mocks.findMany.mockResolvedValue(
      Array.from({ length: 9 }, (_, i) => row({ gsisId: `g${i}`, playerName: `R${i}`, runs: 100 - i })),
    );
    const r = await loadRushSchemes(2026, 3);
    expect(r.players).toHaveLength(3);
  });
});
