import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Depth-chart ingestion: resolves columns across the legacy (≤2024) and new
 * (2025+) nflverse schemas via multi-name pick, upcases team/position, resolves
 * playerId via gsis crosswalk, skips nameless rows, and replaces the season.
 */

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn(), playerFindMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {
  depthChartEntry: { deleteMany: mocks.deleteMany, createMany: mocks.createMany },
  player: { findMany: mocks.playerFindMany },
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
});
