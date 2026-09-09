import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Depth-chart ingestion: resolves columns across the legacy (≤2024) and new
 * (2025+) nflverse schemas via multi-name pick, upcases team/position, resolves
 * playerId via gsis crosswalk, skips nameless rows, and replaces the season.
 */

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(), createMany: vi.fn(), playerFindMany: vi.fn(),
  transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
}));
vi.mock("@sports/db", () => ({ db: {
  depthChartEntry: { deleteMany: mocks.deleteMany, createMany: mocks.createMany },
  player: { findMany: mocks.playerFindMany },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestDepthCharts } from "@/lib/ingestion/depth-charts";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-14T12:00:00.000Z");

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  (nflverseIngestionGate as Mock).mockClear();
  mocks.createMany.mockImplementation(async (a: { data: unknown[] }) => ({ count: a.data.length }));
  mocks.playerFindMany.mockResolvedValue([{ id: "pid-00-1", gsisId: "00-1" }]);
  mocks.transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
});

describe("ingestDepthCharts", () => {
  it("parses legacy + new schemas, resolves playerId, replaces the season", async () => {
    const records: Record<string, string>[] = [
      { full_name: "Alpha Back", gsis_id: "00-1", season: "2024", week: "3", club_code: "kc", position: "RB", depth_team: "1", pos_slot: "RB1" },
      { player_name: "Bravo Wide", season: "2024", week: "3", team: "buf", pos_abb: "wr", pos_rank: "2" },
      { full_name: "", season: "2024", week: "3" }, // nameless → skipped
    ];
    const res = await ingestDepthCharts(2024, { now: NOW, fetcher: async () => ({ records }) });

    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(2);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { season: 2024 } });
    // Devin Review (PR #734): delete + insert must be one atomic transaction,
    // not two independent statements, so a createMany failure after deleteMany
    // succeeds cannot erase the season's rows with nothing to replace them.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]![0]).toHaveLength(2);
    const data = (mocks.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
    // legacy row
    expect(data[0]!["playerName"]).toBe("Alpha Back");
    expect(data[0]!["team"]).toBe("KC");
    expect(data[0]!["position"]).toBe("RB");
    expect(data[0]!["depthRank"]).toBe(1);
    expect(data[0]!["role"]).toBe("RB1");
    expect(data[0]!["playerId"]).toBe("pid-00-1"); // crosswalk via gsis
    expect(data[0]!["fetchedAt"]).toBe(NOW);
    // new-schema row
    expect(data[1]!["playerName"]).toBe("Bravo Wide");
    expect(data[1]!["team"]).toBe("BUF");
    expect(data[1]!["position"]).toBe("WR");
    expect(data[1]!["depthRank"]).toBe(2);
    expect(data[1]!["playerId"]).toBeNull(); // no gsis → unresolved
  });

  it("stops without writing when clearance is denied", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["BLOCKED"] });
    const res = await ingestDepthCharts(2024, { now: NOW, fetcher: async () => ({ records: [] }) });
    expect(res.status).toBe("clearance-denied");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("reports source-error when the fetch throws", async () => {
    const res = await ingestDepthCharts(2024, { now: NOW, fetcher: async () => { throw new Error("down"); } });
    expect(res.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("routes the season replace through db.$transaction, not two bare calls (Devin Review, PR #734)", async () => {
    const records = [{ full_name: "Alpha Back", gsis_id: "00-1", season: "2024", week: "3", club_code: "kc", position: "RB" }];
    await ingestDepthCharts(2024, { now: NOW, fetcher: async () => ({ records }) });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    const ops = mocks.transaction.mock.calls[0]![0] as unknown[];
    expect(ops).toHaveLength(2);
    // The delete and create calls are issued (constructing the transaction's
    // operations) before $transaction is invoked to run them atomically.
    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
  });

  it("propagates a createMany failure rather than reporting a false ok (atomicity depends on this reaching db.$transaction)", async () => {
    mocks.createMany.mockRejectedValueOnce(new Error("constraint violation"));
    const records = [{ full_name: "Alpha Back", gsis_id: "00-1", season: "2024", week: "3", club_code: "kc", position: "RB" }];
    await expect(
      ingestDepthCharts(2024, { now: NOW, fetcher: async () => ({ records }) }),
    ).rejects.toThrow("constraint violation");
  });

  it("batches createMany at 2000 rows so a full-season depth chart doesn't blow Postgres's bound-parameter limit (Devin Review, PR #734)", async () => {
    // Measured live 2026-09-09: depth_charts_2026.csv carried 505,423 rows
    // across all 32 teams. 4,500 generated rows exercises the same code path
    // (3 batches: 2000 + 2000 + 500) without an actually-slow test.
    const records = Array.from({ length: 4500 }, (_, i) => ({
      full_name: `Player ${i}`, gsis_id: `00-${i}`, season: "2024", week: "3", club_code: "KC", position: "RB",
    }));
    const res = await ingestDepthCharts(2024, { now: NOW, fetcher: async () => ({ records }) });

    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(4500); // summed across every batch, not just the first
    expect(mocks.createMany).toHaveBeenCalledTimes(3);
    expect((mocks.createMany.mock.calls[0]![0] as { data: unknown[] }).data).toHaveLength(2000);
    expect((mocks.createMany.mock.calls[1]![0] as { data: unknown[] }).data).toHaveLength(2000);
    expect((mocks.createMany.mock.calls[2]![0] as { data: unknown[] }).data).toHaveLength(500);
    // The delete plus all three batches are one $transaction call, not four
    // independent statements — the atomicity guarantee from the prior fix
    // must survive batching, not just the single-createMany case.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0]![0]).toHaveLength(4);
  });

  it("scopes the 2025+ dt-snapshot schema (no week column) to the single latest dt (Devin Review, PR #734)", async () => {
    // depth_charts_2026.csv carries no week column at all — every row
    // defaults to week 0 — and instead publishes one row per (team,
    // position) for EVERY refresh timestamp since the season began.
    // Measured live 2026-09-09: 172 distinct dt values, 505,423 rows total.
    // Writing every dt unscoped would persist six months of roster churn as
    // one indistinguishable "current" season.
    const records = [
      { dt: "2026-03-22T06:38:42Z", player_name: "Old Starter", team: "kc", pos_abb: "rb", pos_rank: "1" },
      { dt: "2026-09-08T11:56:57Z", player_name: "Current Starter", team: "kc", pos_abb: "rb", pos_rank: "1" },
      { dt: "2026-09-08T11:56:57Z", player_name: "Current Backup", team: "kc", pos_abb: "rb", pos_rank: "2" },
    ];
    const res = await ingestDepthCharts(2026, { now: NOW, fetcher: async () => ({ records }) });

    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(2); // only the 2026-09-08 snapshot, not all 3 rows
    const data = (mocks.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
    expect(data.map((d) => d["playerName"]).sort()).toEqual(["Current Backup", "Current Starter"]);
  });

  it("leaves legacy week-column rows unscoped — every week is a distinct, meaningful row", async () => {
    const records = [
      { full_name: "Week One", gsis_id: "00-1", season: "2024", week: "1", club_code: "kc", position: "RB", depth_team: "1" },
      { full_name: "Week Two", gsis_id: "00-2", season: "2024", week: "2", club_code: "kc", position: "RB", depth_team: "1" },
    ];
    const res = await ingestDepthCharts(2024, { now: NOW, fetcher: async () => ({ records }) });
    expect(res.rowsWritten).toBe(2); // both weeks kept — this is not a dt-only schema
  });
});
