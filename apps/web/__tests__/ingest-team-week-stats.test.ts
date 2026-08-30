import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { teamWeekStat: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } } }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestTeamWeekStats } from "@/lib/ingestion/team-week-stats";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-15T12:00:00.000Z");

beforeEach(() => {
  mocks.deleteMany.mockReset();
  mocks.createMany.mockReset();
  (nflverseIngestionGate as Mock).mockClear();
  mocks.createMany.mockImplementation(async (a: { data: unknown[] }) => ({ count: a.data.length }));
});

function dataOf(): Array<Record<string, unknown>> {
  return (mocks.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
}

describe("ingestTeamWeekStats", () => {
  it("maps offensive EPA/CPOE + defensive box and skips teamless rows", async () => {
    const records: Record<string, string>[] = [
      {
        season: "2024", week: "5", team: "KC", season_type: "REG", opponent_team: "NO",
        completions: "24", attempts: "34", passing_yards: "291", passing_tds: "2",
        passing_epa: "7.3", passing_cpoe: "3.1", carries: "28", rushing_yards: "131",
        rushing_epa: "2.1", def_sacks: "3.5", def_interceptions: "1", def_qb_hits: "8",
      },
      { season: "2024", week: "5", team: "", opponent_team: "X" }, // no team → skipped
    ];
    const res = await ingestTeamWeekStats(2024, { now: NOW, fetcher: async () => ({ records }) });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(1);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { season: 2024 } });
    const d = dataOf()[0]!;
    expect(d["team"]).toBe("KC");
    expect(d["opponent"]).toBe("NO");
    expect(d["passEpa"]).toBe(7.3);
    expect(d["passCpoe"]).toBe(3.1);
    expect(d["completions"]).toBe(24);
    expect(d["defSacks"]).toBe(3.5); // half-sacks preserved as Float
    expect(d["defInterceptions"]).toBe(1);
    expect(d["fetchedAt"]).toBe(NOW);
  });

  it("stops on denied clearance and reports source errors without writing", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["B"] });
    expect((await ingestTeamWeekStats(2024, { fetcher: async () => ({ records: [] }) })).status).toBe("clearance-denied");
    const err = await ingestTeamWeekStats(2024, { fetcher: async () => { throw new Error("down"); } });
    expect(err.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
