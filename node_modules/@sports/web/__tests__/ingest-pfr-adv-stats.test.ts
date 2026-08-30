import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// ── Hoisted mock for @sports/db ─────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { pfrAdvStat: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } } }));

// ── Hoisted mock for nflverseIngestionGate ───────────────────────────────────────
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

// ── Hoisted mock for clearance engine ────────────────────────────────────────────
// P4-05 added a PFR-specific checkClearance gate for `pfr-advstats-via-nflverse`
// (status: permission_required, automation_allowed: false in the real registry).
// In unit tests the happy path must proceed, so we mock checkClearance to return
// allowed=true for both `pfr-advstats-via-nflverse` and `nflverse`. Individual
// tests can override the mock to simulate denial.
const cmocks = vi.hoisted(() => ({ checkClearance: vi.fn() }));
vi.mock("@/lib/scraping/clearance-engine", () => ({ checkClearance: cmocks.checkClearance }));

import { ingestPfrAdvStats } from "@/lib/ingestion/pfr-adv-stats";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-15T12:00:00.000Z");

/** Build a minimal allowed ClearanceResult for the given source_id. */
function allowedClearance(source_id: string) {
  return {
    allowed: true,
    requiresReview: false,
    source_id,
    mode: "open_dataset_ingest" as const,
    tool_id: "fetch-native" as const,
    intents: [] as readonly string[],
    blocks: [] as readonly { code: string; message: string }[],
    warnings: [] as readonly string[],
    rightsSnapshot: { source_id, source_url: "https://github.com/nflverse/nflverse-data", status: "approved_open_license" },
    checkedAt: NOW.toISOString(),
  };
}

beforeEach(() => {
  mocks.deleteMany.mockReset();
  mocks.createMany.mockReset();
  (nflverseIngestionGate as Mock).mockClear();
  (cmocks.checkClearance as Mock).mockImplementation((req: { source_id?: string }) =>
    allowedClearance(req.source_id ?? "nflverse"),
  );
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
