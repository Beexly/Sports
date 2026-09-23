import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Team-game efficiency ingestion: aggregates play-by-play into offense-produced
 * vs defense-allowed (EPA/play + success) per team-game, excludes non-scrimmage
 * plays, sets opponent/home, and replaces the season. Only the DB is mocked.
 */

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn(), transaction: vi.fn() }));
vi.mock("@sports/db", () => ({
  db: {
    $transaction: mocks.transaction,
    teamGameEfficiency: { deleteMany: mocks.deleteMany, createMany: mocks.createMany },
  },
}));
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

/**
 * Prisma's model methods return unexecuted PrismaPromise operations; only the
 * enclosing `$transaction` runs them. The doubles mirror that: deleteMany /
 * createMany hand back an inert descriptor, and `$transaction` is what turns
 * descriptors into results. So a version that awaited the two statements
 * separately would never produce a `$transaction` call to assert on.
 */
type Op = { __op: "deleteMany" | "createMany"; args: { data?: unknown[] } };

beforeEach(() => {
  mocks.deleteMany.mockReset();
  mocks.createMany.mockReset();
  mocks.transaction.mockReset();
  (nflverseIngestionGate as Mock).mockClear();
  mocks.deleteMany.mockImplementation((args: Op["args"]) => ({ __op: "deleteMany", args }));
  mocks.createMany.mockImplementation((args: Op["args"]) => ({ __op: "createMany", args }));
  mocks.transaction.mockImplementation(async (ops: readonly Op[]) =>
    ops.map((op) => ({ count: op.__op === "createMany" ? (op.args.data?.length ?? 0) : 0 })),
  );
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

  // --- atomic season replace (data-loss regression guards) ---

  it("issues the delete and the insert as ONE $transaction, not two awaits", async () => {
    const res = await ingestTeamEfficiency(2023, { now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(2);

    // Exactly one transaction, carrying both writes in delete→insert order.
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    const ops = mocks.transaction.mock.calls[0]![0] as readonly Op[];
    expect(ops).toHaveLength(2);
    expect(ops[0]).toBe(mocks.deleteMany.mock.results[0]!.value);
    expect(ops[1]).toBe(mocks.createMany.mock.results[0]!.value);
    expect(ops[0]!.__op).toBe("deleteMany");
    expect(ops[1]!.__op).toBe("createMany");

    // Each write is enqueued once — never also issued outside the transaction.
    expect(mocks.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
  });

  it("does NOT delete the season when the upstream yields no usable rows", async () => {
    // Structurally fine response, zero scrimmage plays → nothing to replace with.
    const res = await ingestTeamEfficiency(2023, {
      now: NOW,
      fetcher: async () => ({ records: [play({ posteam: "KC", defteam: "DET", play_type: "punt", epa: "1" })] }),
    });
    expect(res.status).toBe("source-error");
    expect(res.rowsWritten).toBe(0);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("sets skipDuplicates so a racing manual crawl cannot abort the run on P2002", async () => {
    await ingestTeamEfficiency(2023, { now: NOW, fetcher: async () => fixture() });
    const args = mocks.createMany.mock.calls[0]![0] as { skipDuplicates?: boolean };
    expect(args.skipDuplicates).toBe(true);
  });
});
