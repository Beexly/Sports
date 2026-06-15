import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Snap-counts and injuries ingestion. Both: clear nflverse via the shared gate,
 * stamp rights + fetchedAt, parse numbers, skip nameless rows, and replace the
 * season idempotently (deleteMany + createMany). A denied gate or source error
 * writes nothing.
 */

const mocks = vi.hoisted(() => ({
  snapDelete: vi.fn(), snapCreate: vi.fn(),
  injDelete: vi.fn(), injCreate: vi.fn(),
  playerFindMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    snapCount: { deleteMany: mocks.snapDelete, createMany: mocks.snapCreate },
    injury: { deleteMany: mocks.injDelete, createMany: mocks.injCreate },
    player: { findMany: mocks.playerFindMany },
  },
}));

// Real gate by default (proves nflverse clears); overridable for the denied test.
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-14T12:00:00.000Z");

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  (nflverseIngestionGate as Mock).mockClear();
  mocks.snapCreate.mockImplementation(async (a: { data: unknown[] }) => ({ count: a.data.length }));
  mocks.injCreate.mockImplementation(async (a: { data: unknown[] }) => ({ count: a.data.length }));
  mocks.playerFindMany.mockResolvedValue([{ id: "pid-00-1", gsisId: "00-1" }]);
});

describe("ingestSnapCounts", () => {
  function fixture(): { records: Record<string, string>[] } {
    return { records: [
      { player: "Alpha Back", pfr_player_id: "AB0", season: "2024", week: "1", game_type: "REG", team: "KC", opponent: "DEN", position: "RB", offense_snaps: "40", offense_pct: "0.62", st_snaps: "3", st_pct: "0.1" },
      { player: "Bravo Wide", pfr_player_id: "BW0", season: "2024", week: "2", game_type: "POST", team: "BUF", opponent: "MIA", position: "WR", offense_snaps: "55", offense_pct: "0.88" },
      { player: "", pfr_player_id: "X", season: "2024", week: "1" }, // nameless → skipped
    ] };
  }

  it("clears, parses, skips nameless rows, and replaces the season", async () => {
    const res = await ingestSnapCounts(2024, { now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(2);
    expect(mocks.snapDelete).toHaveBeenCalledWith({ where: { season: 2024 } });
    const data = (mocks.snapCreate.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
    expect(data).toHaveLength(2);
    expect(data[0]!["offenseSnaps"]).toBe(40);
    expect(data[0]!["offensePct"]).toBe(0.62);
    expect(data[0]!["defenseSnaps"]).toBeNull();
    expect(data[0]!["fetchedAt"]).toBe(NOW);
    expect((data[0]!["rightsSnapshot"] as { source_id: string }).source_id).toBe("nflverse");
    expect(data[1]!["seasonType"]).toBe("POST");
  });

  it("stops without writing when clearance is denied", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["BLOCKED"] });
    const res = await ingestSnapCounts(2024, { now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("clearance-denied");
    expect(mocks.snapDelete).not.toHaveBeenCalled();
  });

  it("reports source-error and writes nothing when the fetch throws", async () => {
    const res = await ingestSnapCounts(2024, { now: NOW, fetcher: async () => { throw new Error("down"); } });
    expect(res.status).toBe("source-error");
    expect(mocks.snapDelete).not.toHaveBeenCalled();
  });
});

describe("ingestInjuries", () => {
  function fixture(): { records: Record<string, string>[] } {
    return { records: [
      { full_name: "Alpha Back", gsis_id: "00-1", season: "2024", week: "3", team: "KC", position: "RB", report_status: "Questionable", practice_status: "Limited", report_primary_injury: "Ankle" },
      { full_name: "", gsis_id: "X", week: "3" }, // nameless → skipped
    ] };
  }

  it("clears, maps report fields, and replaces the season", async () => {
    const res = await ingestInjuries(2024, { now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(1);
    expect(mocks.injDelete).toHaveBeenCalledWith({ where: { season: 2024 } });
    const data = (mocks.injCreate.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data;
    expect(data[0]!["reportStatus"]).toBe("Questionable");
    expect(data[0]!["primaryInjury"]).toBe("Ankle");
    expect(data[0]!["gsisId"]).toBe("00-1");
    expect(data[0]!["playerId"]).toBe("pid-00-1"); // crosswalk resolved via gsisId
    expect(data[0]!["fetchedAt"]).toBe(NOW);
  });

  it("stops without writing when clearance is denied", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["BLOCKED"] });
    const res = await ingestInjuries(2024, { now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("clearance-denied");
    expect(mocks.injCreate).not.toHaveBeenCalled();
  });
});
