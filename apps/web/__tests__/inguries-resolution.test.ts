/**
 * Injury `playerId` resolution — the gap this pins.
 *
 * MEASURED 2026-09-28 on live Neon (2026 season). `Player` rows are created only
 * by `ingestPlayerWeeklyStats` from nflverse `player_stats_week`, which publishes
 * fantasy-scored positions. So of 477 distinct injury gsisIds only 157 resolved:
 *
 *   WR 81/82 · RB 57/57 · QB 28/28        <- resolve
 *   OL 8/117 · SEC 5/144 · DL 3/259       <- do not
 *
 * The positions that TRIGGER §1 OL_INJURY, §2 SECONDARY_INJURY and
 * §3 PASS_RUSH_INJURY in the total-signal doctrine were exactly the positions
 * that could never resolve, so those rules were silently disabled in production
 * while every layer reported success.
 *
 * These tests pin the fix: the depth-chart roster is a second crosswalk, matched
 * on gsisId ONLY (never on name — 16 of 329 name pairs disagree on spelling),
 * ambiguous gsisIds are skipped rather than guessed, and resolution counts are
 * reported so a future regression is visible rather than silent.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const findManyPlayer = vi.fn();
const findManyDepth = vi.fn();
const createPlayer = vi.fn();
const deleteMany = vi.fn();
const createMany = vi.fn();
const gate = { ok: true, rightsSnapshot: {} };

vi.mock("@sports/data-ingestion", () => ({ fetchNflverse: vi.fn() }));
vi.mock("@/lib/ingestion/nflverse-gate", () => ({
  nflverseIngestionGate: () => gate,
}));
vi.mock("@sports/db", () => ({
  db: {
    player: { findMany: (...a: unknown[]) => findManyPlayer(...a), create: (...a: unknown[]) => createPlayer(...a) },
    depthChartEntry: { findMany: (...a: unknown[]) => findManyDepth(...a) },
    injury: { deleteMany: (...a: unknown[]) => deleteMany(...a), createMany: (...a: unknown[]) => createMany(...a) },
    $transaction: async (ops: readonly unknown[]) => Promise.all(ops),
  },
}));

import { ingestInjuries } from "@/lib/ingestion/injuries";

const NOW = new Date("2026-09-28T12:00:00Z");

function csv(gsis: string, name: string, pos: string) {
  return {
    full_name: name, gsis_id: gsis, season: "2026", week: "3",
    team: "CHI", position: pos, report_status: "Out",
    practice_status: "", report_primary_injury: "", practice_primary_injury: "",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteMany.mockResolvedValue({ count: 0 });
  createMany.mockResolvedValue({ count: 1 });
  createPlayer.mockImplementation(async ({ data }: { data: { gsisId: string } }) => ({
    id: `p_${data.gsisId}`,
  }));
  gate.ok = true;
});

const run = (rows: ReturnType<typeof csv>[]) => {
  const fetcher = async () => ({ records: rows });
  return ingestInjuries(2026, { now: NOW, fetcher: fetcher as never });
};

describe("injury gsisId -> Player resolution", () => {
  it("resolves an injured lineman who has no Player row, via the depth chart", async () => {
    findManyPlayer.mockResolvedValue([]);
    findManyDepth.mockResolvedValue([{ gsisId: "g-ol1", playerName: "Big Trench", team: "CHI", position: "OL" }]);

    const res = await run([csv("g-ol1", "Big Trench", "OL")]);

    // A Player row is created so the injury can point at it.
    expect(createPlayer).toHaveBeenCalledTimes(1);
    expect(createPlayer.mock.calls[0]![0].data.gsisId).toBe("g-ol1");
    // And the persisted injury actually carries the resolved id.
    const persisted = createMany.mock.calls[0]![0].data[0];
    expect(persisted.playerId).toBe("p_g-ol1");
    expect(res.rowsResolved).toBe(1);
    expect(res.rowsUnresolved).toBe(0);
  });

  it("never matches on name — gsisId is the only key", async () => {
    findManyPlayer.mockResolvedValue([]);
    // Same NAME as the injured player, a different gsisId. Must NOT resolve.
    findManyDepth.mockResolvedValue([{ gsisId: "g-other", playerName: "Big Trench", team: "CHI", position: "OL" }]);

    const res = await run([csv("g-ol1", "Big Trench", "OL")]);

    expect(createPlayer).not.toHaveBeenCalled();
    expect(createMany.mock.calls[0]![0].data[0].playerId).toBeNull();
    expect(res.rowsResolved).toBe(0);
    expect(res.rowsUnresolved).toBe(1);
  });

  it("SKIPS a gsisId that maps to several names rather than guessing a human", async () => {
    findManyPlayer.mockResolvedValue([]);
    findManyDepth.mockResolvedValue([
      { gsisId: "g-amb", playerName: "Alex Smith", team: "CHI", position: "S" },
      { gsisId: "g-amb", playerName: "Alex Smyth", team: "NYJ", position: "S" },
    ]);

    const res = await run([csv("g-amb", "Alex Smith", "S")]);

    expect(createPlayer).not.toHaveBeenCalled();
    expect(res.rowsUnresolved).toBe(1);
  });

  it("creates a Player only for gsisIds the injuries actually reference", async () => {
    findManyPlayer.mockResolvedValue([]);
    // Depth chart knows 3 players; the season's injuries mention ONE of them.
    findManyDepth.mockResolvedValue([
      { gsisId: "g-a", playerName: "A One", team: "CHI", position: "OL" },
      { gsisId: "g-b", playerName: "B Two", team: "CHI", position: "DL" },
      { gsisId: "g-c", playerName: "C Three", team: "CHI", position: "DB" },
    ]);

    await run([csv("g-a", "A One", "OL")]);

    expect(createPlayer).toHaveBeenCalledTimes(1);
    expect(createPlayer.mock.calls[0]![0].data.gsisId).toBe("g-a");
  });

  it("reuses an existing Player row and creates nothing", async () => {
    findManyPlayer.mockResolvedValue([{ id: "p_existing", gsisId: "g-ol1" }]);
    findManyDepth.mockResolvedValue([{ gsisId: "g-ol1", playerName: "Big Trench", team: "CHI", position: "OL" }]);

    const res = await run([csv("g-ol1", "Big Trench", "OL")]);

    expect(createPlayer).not.toHaveBeenCalled();
    expect(createMany.mock.calls[0]![0].data[0].playerId).toBe("p_existing");
    expect(res.playersBackfilled).toBe(0);
    expect(res.rowsResolved).toBe(1);
  });

  it("survives a failed create (concurrent backfill) instead of throwing", async () => {
    findManyPlayer.mockResolvedValue([]);
    findManyDepth.mockResolvedValue([{ gsisId: "g-ol1", playerName: "Big Trench", team: "CHI", position: "OL" }]);
    createPlayer.mockRejectedValueOnce(new Error("unique constraint"));

    const res = await run([csv("g-ol1", "Big Trench", "OL")]);

    expect(res.status).toBe("ok");
    expect(createMany.mock.calls[0]![0].data[0].playerId).toBeNull();
    expect(res.rowsUnresolved).toBe(1);
  });

  it("reports resolution counts so the gap is visible in the result", async () => {
    findManyPlayer.mockResolvedValue([{ id: "p_ok", gsisId: "g-ok" }]);
    findManyDepth.mockResolvedValue([]);
    const res = await run([csv("g-ok", "Known Guy", "WR"), csv("g-missing", "Missing Guy", "WR")]);

    expect(res.status).toBe("ok");
    expect(res.rowsResolved).toBe(1);
    expect(res.rowsUnresolved).toBe(1);
  });
});
