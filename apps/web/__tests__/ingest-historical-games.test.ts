import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Historical-games ingestion: clears nflverse via the shared gate, parses
 * closing lines + final result, skips invalid rows, derives result from scores
 * when absent, and replaces the table (chunked createMany). Stamps rights +
 * fetchedAt. A denied gate or source error writes nothing.
 */

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { historicalGame: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } } }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestHistoricalGames } from "@/lib/ingestion/historical-games";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-14T12:00:00.000Z");

function fixture(): { records: Record<string, string>[] } {
  return { records: [
    { game_id: "2022_01_BUF_LA", season: "2022", week: "1", game_type: "REG", away_team: "BUF", home_team: "LA", away_score: "31", home_score: "10", result: "-21", spread_line: "-2.5", total_line: "52", away_moneyline: "-130", home_moneyline: "110" },
    { game_id: "2023_22_SF_KC", season: "2023", week: "22", game_type: "SB", away_team: "SF", home_team: "KC", away_score: "22", home_score: "25", result: "3", spread_line: "2", total_line: "47.5" },
    { season: "2024", week: "1", away_team: "", home_team: "X" }, // missing away team → skipped
    { season: "", week: "1", away_team: "A", home_team: "B" },     // missing season → skipped
  ] };
}

beforeEach(() => {
  mocks.deleteMany.mockReset();
  mocks.createMany.mockReset();
  (nflverseIngestionGate as Mock).mockClear();
  mocks.createMany.mockImplementation(async (a: { data: unknown[] }) => ({ count: a.data.length }));
});

describe("ingestHistoricalGames", () => {
  it("clears, parses closing lines + result, skips invalid rows, counts seasons", async () => {
    const res = await ingestHistoricalGames({ now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(2);
    expect(res.seasons).toBe(2);
    expect(mocks.deleteMany).toHaveBeenCalledWith({});
    const data = (mocks.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
    expect(data[0]!["gameKey"]).toBe("2022_01_BUF_LA");
    expect(data[0]!["spreadLine"]).toBe(-2.5);
    expect(data[0]!["result"]).toBe(-21);
    expect(data[0]!["awayMoneyline"]).toBe(-130);
    expect(data[0]!["gameType"]).toBe("REG");
    expect((data[0]!["rightsSnapshot"] as { source_id: string }).source_id).toBe("nflverse");
    expect(data[0]!["fetchedAt"]).toBe(NOW);
    expect(data[1]!["gameType"]).toBe("SB"); // playoff game_type preserved
    expect(data[1]!["result"]).toBe(3);
  });

  it("derives result from scores when the result column is absent", async () => {
    const res = await ingestHistoricalGames({ now: NOW, fetcher: async () => ({ records: [
      { game_id: "g1", season: "2020", week: "5", game_type: "REG", away_team: "A", home_team: "B", away_score: "14", home_score: "20" },
    ] }) });
    expect(res.status).toBe("ok");
    const data = (mocks.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
    expect(data[0]!["result"]).toBe(6); // 20 - 14
  });

  it("stops without writing when clearance is denied", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["BLOCKED"] });
    const res = await ingestHistoricalGames({ now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("clearance-denied");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("reports source-error when the fetch throws", async () => {
    const res = await ingestHistoricalGames({ now: NOW, fetcher: async () => { throw new Error("down"); } });
    expect(res.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("NEVER wipes the archive on an empty (or all-invalid) upstream response", async () => {
    // A transient empty/truncated feed must preserve the existing archive:
    // no deleteMany, and a source-error status instead of a silent wipe.
    const empty = await ingestHistoricalGames({ now: NOW, fetcher: async () => ({ records: [] }) });
    expect(empty.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();

    // Rows that all fail validation also yield zero usable data → still no wipe.
    const allInvalid = await ingestHistoricalGames({ now: NOW, fetcher: async () => ({ records: [
      { season: "", week: "1", away_team: "", home_team: "" },
    ] }) });
    expect(allInvalid.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
