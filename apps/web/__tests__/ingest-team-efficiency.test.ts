import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Team-game efficiency ingestion: aggregates play-by-play into offense-produced
 * vs defense-allowed (EPA/play + success) per team-game, excludes non-scrimmage
 * plays, sets opponent/home, and replaces the season. Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { teamGameEfficiency: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } } }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestTeamEfficiency } from "@/lib/ingestion/team-efficiency";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-14T12:00:00.000Z");

function play(o: Partial<Record<string, string>>): Record<string, string> {
  return {
    game_id: "2023_01_DET_KC", season: "2023", week: "1", season_type: "REG",
    home_team: "KC", play_type: "pass", epa: "0", success: "0", ...o,
  } as Record<string, string>;
}

function fixture(): { records: Record<string, string>[] } {
  return { records: [
    play({ posteam: "KC", defteam: "DET", play_type: "pass", epa: "0.5", success: "1" }),
    play({ posteam: "KC", defteam: "DET", play_type: "run", epa: "-0.1", success: "0" }),
    play({ posteam: "DET", defteam: "KC", play_type: "run", epa: "0.1", success: "1" }),
    play({ posteam: "DET", defteam: "KC", play_type: "pass", epa: "0.3", success: "1" }),
    play({ posteam: "KC", defteam: "DET", play_type: "punt", epa: "9", success: "1" }), // non-scrimmage → skipped
  ] };
}

beforeEach(() => {
  mocks.deleteMany.mockReset();
  mocks.createMany.mockReset();
  (nflverseIngestionGate as Mock).mockClear();
  mocks.createMany.mockImplementation(async (a: { data: unknown[] }) => ({ count: a.data.length }));
});

describe("ingestTeamEfficiency", () => {
  it("aggregates offense produced vs defense allowed and excludes non-scrimmage plays", async () => {
    const res = await ingestTeamEfficiency(2023, { now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("ok");
    expect(res.games).toBe(1);
    expect(res.rowsWritten).toBe(2);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { season: 2023 } });

    const data = (mocks.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
    const KC = data.find((d) => d["team"] === "KC")!;
    const DET = data.find((d) => d["team"] === "DET")!;

    // KC offense: mean epa of (0.5, -0.1) = 0.2; success (1,0)=0.5; punt excluded → 2 plays
    expect(KC["plays"]).toBe(2);
    expect(KC["offEpaPerPlay"]).toBeCloseTo(0.2, 4);
    expect(KC["offSuccess"]).toBeCloseTo(0.5, 4);
    // KC defense = DET offense: mean epa (0.1,0.3)=0.2; success 1
    expect(KC["defEpaPerPlay"]).toBeCloseTo(0.2, 4);
    expect(KC["defSuccess"]).toBeCloseTo(1, 4);
    expect(KC["opponent"]).toBe("DET");
    expect(KC["isHome"]).toBe(true);
    expect(KC["season"]).toBe(2023);
    expect(KC["week"]).toBe(1);
    expect((KC["rightsSnapshot"] as { source_id: string }).source_id).toBe("nflverse");
    expect(KC["fetchedAt"]).toBe(NOW);

    expect(DET["opponent"]).toBe("KC");
    expect(DET["isHome"]).toBe(false);
    expect(DET["offEpaPerPlay"]).toBeCloseTo(0.2, 4);
  });

  it("stops without writing when clearance is denied", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["BLOCKED"] });
    const res = await ingestTeamEfficiency(2023, { now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("clearance-denied");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("reports source-error when the fetch throws", async () => {
    const res = await ingestTeamEfficiency(2023, { now: NOW, fetcher: async () => { throw new Error("down"); } });
    expect(res.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
