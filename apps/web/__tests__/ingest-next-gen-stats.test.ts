import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { nextGenStat: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } } }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestNextGenStats } from "@/lib/ingestion/next-gen-stats";
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

describe("ingestNextGenStats", () => {
  it("maps receiving tracking columns and skips week-0 season aggregates", async () => {
    const records: Record<string, string>[] = [
      {
        season: "2024", season_type: "REG", week: "0", player_gsis_id: "00-9", // season-agg → skipped
        player_display_name: "X", player_position: "WR", team_abbr: "KC", avg_separation: "9.9",
      },
      {
        season: "2024", season_type: "REG", week: "3", player_gsis_id: "00-9",
        player_display_name: "A. Receiver", player_position: "WR", team_abbr: "KC",
        avg_cushion: "5.5", avg_separation: "3.1", avg_intended_air_yards: "8.0",
        percent_share_of_intended_air_yards: "22.5", catch_percentage: "70.0",
        avg_yac: "5.0", avg_expected_yac: "4.2", avg_yac_above_expectation: "0.8",
      },
      { season: "2024", season_type: "REG", week: "4", player_gsis_id: "", player_display_name: "no id" }, // skipped
    ];
    const res = await ingestNextGenStats(2024, "receiving", { now: NOW, fetcher: async () => ({ records }) });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(1);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { season: 2024, statType: "receiving" } });
    const d = dataOf()[0]!;
    expect(d["gsisId"]).toBe("00-9");
    expect(d["statType"]).toBe("receiving");
    expect(d["week"]).toBe(3);
    expect(d["avgSeparation"]).toBe(3.1);
    expect(d["avgCushion"]).toBe(5.5);
    expect(d["avgYacAboveExpectation"]).toBe(0.8);
    expect(d["cpoe"]).toBeNull(); // a passing-only metric stays null for receiving
    expect(d["fetchedAt"]).toBe(NOW);
  });

  it("maps passing CPOE and rushing over-expected metrics", async () => {
    const passing = await ingestNextGenStats(2024, "passing", {
      now: NOW,
      fetcher: async () => ({
        records: [{
          season: "2024", season_type: "REG", week: "1", player_gsis_id: "00-1",
          player_display_name: "QB", team_abbr: "BUF", avg_time_to_throw: "2.7",
          completion_percentage: "68.0", expected_completion_percentage: "64.0",
          completion_percentage_above_expectation: "4.0", passer_rating: "101.2",
        }],
      }),
    });
    expect(passing.status).toBe("ok");
    expect(dataOf()[0]!["cpoe"]).toBe(4);
    expect(dataOf()[0]!["avgTimeToThrow"]).toBe(2.7);

    mocks.createMany.mockClear();
    const rushing = await ingestNextGenStats(2024, "rushing", {
      now: NOW,
      fetcher: async () => ({
        records: [{
          season: "2024", season_type: "REG", week: "1", player_gsis_id: "00-2",
          player_display_name: "RB", team_abbr: "SF", efficiency: "3.9",
          rush_yards_over_expected: "12.5", rush_yards_over_expected_per_att: "0.9",
          percent_attempts_gte_eight_defenders: "18.2",
        }],
      }),
    });
    expect(rushing.status).toBe("ok");
    expect(dataOf()[0]!["rushYardsOverExpected"]).toBe(12.5);
    expect(dataOf()[0]!["rushPctOverExpected"]).toBeNull();
  });

  it("stops on denied clearance and reports source errors without writing", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["B"] });
    expect((await ingestNextGenStats(2024, "passing", { fetcher: async () => ({ records: [] }) })).status).toBe("clearance-denied");
    const err = await ingestNextGenStats(2024, "passing", { fetcher: async () => { throw new Error("down"); } });
    expect(err.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
