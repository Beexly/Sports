import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { pfrAdvStat: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } } }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestPfrAdvStats } from "@/lib/ingestion/pfr-adv-stats";
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

describe("ingestPfrAdvStats", () => {
  it("maps QB pressure columns and skips rows with no player/game id", async () => {
    const records: Record<string, string>[] = [
      {
        game_id: "2024_01_KC_BAL", season: "2024", week: "1", game_type: "REG", team: "KC", opponent: "BAL",
        pfr_player_name: "P. Mahomes", pfr_player_id: "MahoPa00",
        times_sacked: "2", times_blitzed: "9", times_hurried: "5", times_hit: "4",
        times_pressured: "11", times_pressured_pct: "27.5", passing_bad_throws: "6", passing_bad_throw_pct: "16.2",
      },
      { game_id: "2024_01_KC_BAL", season: "2024", week: "1", pfr_player_id: "", pfr_player_name: "no id" }, // skipped
      { game_id: "", season: "2024", week: "1", pfr_player_id: "X" }, // no game → skipped
    ];
    const res = await ingestPfrAdvStats(2024, "pass", { now: NOW, fetcher: async () => ({ records }) });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(1);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { season: 2024, statType: "pass" } });
    const d = dataOf()[0]!;
    expect(d["pfrPlayerId"]).toBe("MahoPa00");
    expect(d["statType"]).toBe("pass");
    expect(d["timesPressured"]).toBe(11);
    expect(d["timesPressuredPct"]).toBe(27.5);
    expect(d["passingBadThrows"]).toBe(6);
    expect(d["gameKey"]).toBe("2024_01_KC_BAL");
    expect(d["rushingBrokenTackles"]).toBeNull(); // a rushing-only metric stays null for pass
    expect(d["fetchedAt"]).toBe(NOW);
  });

  it("maps rushing before/after-contact metrics and normalizes POST season type", async () => {
    const res = await ingestPfrAdvStats(2024, "rush", {
      now: NOW,
      fetcher: async () => ({
        records: [{
          game_id: "2024_20_SF_DET", season: "2024", week: "20", game_type: "POST", team: "SF",
          pfr_player_name: "C. McCaffrey", pfr_player_id: "McCaCh01", carries: "18",
          rushing_yards_before_contact: "44.0", rushing_yards_after_contact_avg: "2.6", rushing_broken_tackles: "4",
        }],
      }),
    });
    expect(res.status).toBe("ok");
    const d = dataOf()[0]!;
    expect(d["seasonType"]).toBe("POST");
    expect(d["carries"]).toBe(18);
    expect(d["rushingYardsBeforeContact"]).toBe(44);
    expect(d["rushingBrokenTackles"]).toBe(4);
    expect(d["timesPressured"]).toBeNull();
  });

  it("stops on denied clearance and reports source errors without writing", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["B"] });
    expect((await ingestPfrAdvStats(2024, "pass", { fetcher: async () => ({ records: [] }) })).status).toBe("clearance-denied");
    const err = await ingestPfrAdvStats(2024, "pass", { fetcher: async () => { throw new Error("down"); } });
    expect(err.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
