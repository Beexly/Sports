import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * SEASON-REPLACE ATOMICITY — the delete-then-insert data-loss class.
 *
 * Every nflverse ingester in `lib/ingestion/` refreshes its slice by DELETING
 * the existing rows and INSERTING the newly-fetched ones. Issued as two
 * separate awaits, a failure landing between them (a row the DB rejects, a
 * connection drop, a pooled-connection or route timeout — these routes run at
 * maxDuration and a full season is heavy) leaves the slice DELETED and never
 * re-inserted. A retry re-enters the same delete-first path, so it cannot
 * self-heal, and the "empty upstream never deletes" guard does not cover it:
 * `data` WAS non-empty; the delete simply landed and the insert did not.
 *
 * These tests assert the contract that makes that impossible: the delete and
 * the insert reach the database as ONE `$transaction`, and a failing insert
 * leaves the previously-stored rows exactly as they were.
 *
 * ── Why the db double models Prisma's laziness ──────────────────────────────
 * A Prisma model method does not execute when it is called; it returns a
 * PrismaPromise that runs when it is awaited, OR is handed unexecuted to
 * `$transaction`, which runs the batch in one database transaction. The double
 * below reproduces exactly that:
 *
 *   - `db.model.deleteMany(...)` / `.createMany(...)` return an inert op
 *     descriptor that is a *thenable*: awaiting it applies it to the in-memory
 *     store IMMEDIATELY and standalone (recorded in `harness.standalone`);
 *   - `db.$transaction([...])` applies the ops against a snapshot and ROLLS
 *     BACK every one of them if any op throws.
 *
 * That distinction is what gives these tests teeth. A version that awaited the
 * two statements separately would apply the delete standalone, so the injected
 * insert failure could not roll it back — the rows would be gone, and the
 * assertions below would fail. A test that only asserted the happy path would
 * pass against that broken version and prove nothing.
 */

const harness = vi.hoisted(() => {
  interface Op {
    readonly model: string;
    readonly op: string;
    readonly args: { data?: unknown[] };
    then(resolve: (v: { count: number }) => void, reject: (e: unknown) => void): void;
  }

  /** In-memory rows per Prisma model name. */
  const rows: Record<string, unknown[]> = {};
  /** Ops that were awaited on their own — i.e. NOT inside a `$transaction`. */
  const standalone: Op[] = [];
  /** One entry per `$transaction` call, holding the ops it was given. */
  const transactions: Op[][] = [];
  /** Failure injection: throw when this model+op is applied. */
  const failOn: { model: string | null; op: string | null } = { model: null, op: null };

  function apply(o: Op): { count: number } {
    if (failOn.model === o.model && failOn.op === o.op) {
      throw new Error(`injected DB failure on ${o.model}.${o.op}`);
    }
    const list = (rows[o.model] ??= []);
    if (o.op === "deleteMany") {
      const count = list.length;
      list.length = 0;
      return { count };
    }
    if (o.op === "createMany") {
      const data = o.args.data ?? [];
      list.push(...data);
      return { count: data.length };
    }
    return { count: 0 };
  }

  function makeOp(model: string, op: string, args: { data?: unknown[] }): Op {
    const self: Op = {
      model,
      op,
      args,
      then(resolve, reject) {
        // Awaited on its own → executes standalone, outside any transaction.
        standalone.push(self);
        try {
          resolve(apply(self));
        } catch (err) {
          reject(err);
        }
      },
    };
    return self;
  }

  async function $transaction(ops: readonly Op[]): Promise<{ count: number }[]> {
    transactions.push([...ops]);
    // Snapshot every touched model so a mid-batch throw restores all of them.
    const snapshot = new Map(Object.entries(rows).map(([k, v]) => [k, v.slice()]));
    try {
      const out: { count: number }[] = [];
      for (const o of ops) out.push(apply(o));
      return out;
    } catch (err) {
      for (const [model, saved] of snapshot) rows[model] = saved;
      throw err;
    }
  }

  const modelProxy = (model: string): Record<string, unknown> =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          const op = String(prop);
          // Reads the ingesters perform before writing (e.g. the gsis
          // crosswalk) resolve normally; only writes become lazy ops.
          if (op === "findMany" || op === "groupBy") return async () => [];
          if (op === "findFirst" || op === "findUnique") return async () => null;
          if (op === "count") return async () => 0;
          return (args: { data?: unknown[] } = {}) => makeOp(model, op, args);
        },
      },
    );

  const db = new Proxy(
    {},
    {
      get(_t, prop) {
        const key = String(prop);
        if (key === "$transaction") return $transaction;
        // Never let the db object itself look like a promise.
        if (key === "then") return undefined;
        return modelProxy(key);
      },
    },
  );

  function reset(): void {
    for (const k of Object.keys(rows)) delete rows[k];
    standalone.length = 0;
    transactions.length = 0;
    failOn.model = null;
    failOn.op = null;
  }

  return { db, rows, standalone, transactions, failOn, reset };
});

vi.mock("@sports/db", () => ({ db: harness.db }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

/**
 * The REAL clearance engine runs for every source, with ONE narrow override:
 * `pfr-advstats-via-nflverse` is `permission_required` in the rights registry,
 * so the real engine denies it and the ingester returns before any write. Its
 * rights gate is not what is under test here (that is covered in
 * ingest-pfr-adv-stats.test.ts, which is where a regression in it belongs);
 * its ATOMICITY is. Every other source — including `nflverse` itself, which is
 * what all the other ingesters clear through — stays on the real engine, so a
 * genuine clearance regression still stops these tests.
 */
vi.mock("@/lib/scraping/clearance-engine", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/scraping/clearance-engine")>();
  return {
    ...actual,
    checkClearance: (request: Parameters<typeof actual.checkClearance>[0], now?: Date) => {
      const real = actual.checkClearance(request, now);
      if (request.source_id !== "pfr-advstats-via-nflverse") return real;
      return { ...real, allowed: true, blocks: [] };
    },
  };
});

import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";
import { ingestDepthCharts } from "@/lib/ingestion/depth-charts";
import { ingestTeamWeekStats } from "@/lib/ingestion/team-week-stats";
import { ingestRushTendencies } from "@/lib/ingestion/rush-tendencies";
import { ingestNextGenStats } from "@/lib/ingestion/next-gen-stats";
import { ingestPfrAdvStats } from "@/lib/ingestion/pfr-adv-stats";
import { ingestHistoricalGames } from "@/lib/ingestion/historical-games";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-14T12:00:00.000Z");
const SEASON = 2024;

type Records = { records: Record<string, string>[] };

/**
 * One entry per ingester that performs a delete-then-insert replace. `run`
 * drives the REAL ingest function with a stub fetcher; `model` is the Prisma
 * model whose rows must survive a failed insert.
 */
const REPLACERS: ReadonlyArray<{
  name: string;
  model: string;
  /** Prisma `where` the delete must carry (the scope of the replace). */
  deleteWhere: Record<string, unknown>;
  run: () => Promise<{ status: string; rowsWritten: number }>;
}> = [
  {
    name: "snap-counts",
    model: "snapCount",
    deleteWhere: { season: SEASON },
    run: () =>
      ingestSnapCounts(SEASON, {
        now: NOW,
        fetcher: async (): Promise<Records> => ({
          records: [{ player: "Alpha Back", season: "2024", week: "3", team: "KC", offense_snaps: "40" }],
        }),
      }),
  },
  {
    name: "injuries",
    model: "injury",
    deleteWhere: { season: SEASON },
    run: () =>
      ingestInjuries(SEASON, {
        now: NOW,
        fetcher: async (): Promise<Records> => ({
          records: [{ full_name: "Alpha Back", gsis_id: "00-1", season: "2024", week: "3", team: "KC", report_status: "Out" }],
        }),
      }),
  },
  {
    name: "depth-charts",
    model: "depthChartEntry",
    deleteWhere: { season: SEASON },
    run: () =>
      ingestDepthCharts(SEASON, {
        now: NOW,
        fetcher: async (): Promise<Records> => ({
          records: [{ full_name: "Alpha Back", gsis_id: "00-1", season: "2024", week: "3", club_code: "kc", position: "RB", depth_team: "1" }],
        }),
      }),
  },
  {
    name: "team-week-stats",
    model: "teamWeekStat",
    deleteWhere: { season: SEASON },
    run: () =>
      ingestTeamWeekStats(SEASON, {
        now: NOW,
        fetcher: async (): Promise<Records> => ({
          records: [{ team: "KC", season: "2024", week: "3", passing_yards: "250", rushing_yards: "100" }],
        }),
      }),
  },
  {
    name: "rush-tendencies",
    model: "playerRushProfile",
    deleteWhere: { season: SEASON },
    run: () =>
      ingestRushTendencies(SEASON, {
        now: NOW,
        fetcher: async (): Promise<Records> => ({
          records: [
            { play_type: "run", rusher_player_id: "00-1", rusher_player_name: "Alpha Back", posteam: "KC", run_gap: "guard", run_location: "left", epa: "0.4" },
          ],
        }),
      }),
  },
  {
    name: "next-gen-stats",
    model: "nextGenStat",
    deleteWhere: { season: SEASON, statType: "rushing" },
    run: () =>
      ingestNextGenStats(SEASON, "rushing", {
        now: NOW,
        fetcher: async (): Promise<Records> => ({
          records: [{ season: "2024", week: "3", player_gsis_id: "00-1", player_display_name: "Alpha Back", team_abbr: "KC" }],
        }),
      }),
  },
  {
    name: "pfr-adv-stats",
    model: "pfrAdvStat",
    deleteWhere: { season: SEASON, statType: "rush" },
    run: () =>
      ingestPfrAdvStats(SEASON, "rush", {
        now: NOW,
        fetcher: async (): Promise<Records> => ({
          records: [{ pfr_player_id: "BackA00", game_id: "2024_03_KC_BUF", player: "Alpha Back", season: "2024", week: "3", team: "KC" }],
        }),
      }),
  },
  // NOT LISTED: team-efficiency. `lib/ingestion/team-efficiency.ts` carries the
  // identical pre-fix shape on main and an atomic replace for it is already in
  // flight on its own branch, so adding it here would collide with that change.
  // It is the reason this suite exists: running these same three cases against
  // that still-unfixed module is what demonstrated the harness detects the
  // defect rather than merely describing it (see the PR body). Add it to this
  // list once that fix lands.
];

beforeEach(() => {
  harness.reset();
  (nflverseIngestionGate as Mock).mockClear();
});

describe.each(REPLACERS)("$name season replace", ({ model, deleteWhere, run }) => {
  it("issues the delete and the insert as ONE $transaction, never as two separate awaits", async () => {
    const res = await run();
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBeGreaterThan(0);

    // Exactly one transaction, carrying both writes in delete → insert order.
    expect(harness.transactions).toHaveLength(1);
    const ops = harness.transactions[0]!;
    expect(ops).toHaveLength(2);
    expect(ops[0]!.model).toBe(model);
    expect(ops[0]!.op).toBe("deleteMany");
    expect(ops[1]!.model).toBe(model);
    expect(ops[1]!.op).toBe("createMany");

    // The delete is scoped to the slice being replaced, not the whole table.
    expect((ops[0]!.args as { where?: unknown }).where).toEqual(deleteWhere);

    // Nothing was executed outside the transaction. This is the assertion the
    // pre-fix two-awaits version cannot satisfy.
    expect(harness.standalone).toHaveLength(0);
  });

  it("preserves the stored rows when the insert fails — a failed refresh must not delete the slice", async () => {
    // Seed the slice with what a previous successful run left behind.
    harness.rows[model] = [{ seeded: 1 }, { seeded: 2 }];

    harness.failOn.model = model;
    harness.failOn.op = "createMany";

    await expect(run()).rejects.toThrow(/injected DB failure/);

    // The whole replace rolled back: the previously-stored rows are untouched.
    // Pre-fix, the standalone `await deleteMany(...)` had already emptied this.
    expect(harness.rows[model]).toEqual([{ seeded: 1 }, { seeded: 2 }]);
  });

  it("reports rowsWritten from the insert's own result, never the delete's count", async () => {
    // A populated slice makes the DELETE's count non-zero and distinct from the
    // insert's, so a version that read the wrong element of the transaction
    // result (or summed both) is caught here.
    const SEEDED = 7;
    harness.rows[model] = Array.from({ length: SEEDED }, (_, i) => ({ seeded: i }));
    const res = await run();
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(harness.rows[model]!.length); // = rows actually inserted
    expect(res.rowsWritten).not.toBe(SEEDED);
    expect(res.rowsWritten).not.toBe(SEEDED + harness.rows[model]!.length);
  });
});

describe("historical-games full-archive replace", () => {
  const fixture = (): Records => ({
    records: [
      { game_id: "2022_01_BUF_LA", season: "2022", week: "1", game_type: "REG", away_team: "BUF", home_team: "LA", away_score: "31", home_score: "10", result: "-21" },
      { game_id: "2023_22_SF_KC", season: "2023", week: "22", game_type: "SB", away_team: "SF", home_team: "KC", away_score: "22", home_score: "25", result: "3" },
    ],
  });

  it("issues the wipe and every insert chunk as ONE $transaction", async () => {
    const res = await ingestHistoricalGames({ now: NOW, fetcher: async () => fixture() });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(2);

    expect(harness.transactions).toHaveLength(1);
    const ops = harness.transactions[0]!;
    expect(ops[0]!.op).toBe("deleteMany");
    // Every remaining op is an insert chunk for the same model.
    expect(ops.slice(1).every((o) => o.op === "createMany" && o.model === "historicalGame")).toBe(true);
    expect(harness.standalone).toHaveLength(0);
  });

  it("preserves the ENTIRE archive when an insert chunk fails — a truncated archive is worse than none", async () => {
    // The archive calibration and backtests read from.
    harness.rows["historicalGame"] = [{ seeded: "2019" }, { seeded: "2020" }, { seeded: "2021" }];

    harness.failOn.model = "historicalGame";
    harness.failOn.op = "createMany";

    await expect(ingestHistoricalGames({ now: NOW, fetcher: async () => fixture() })).rejects.toThrow(
      /injected DB failure/,
    );

    // Pre-fix, the unscoped `deleteMany({})` had already run standalone and the
    // table would be EMPTY (or, with more chunks, silently truncated).
    expect(harness.rows["historicalGame"]).toEqual([{ seeded: "2019" }, { seeded: "2020" }, { seeded: "2021" }]);
  });

  it("reports rowsWritten from the transaction's insert results only, never the delete", async () => {
    const res = await ingestHistoricalGames({ now: NOW, fetcher: async () => fixture() });
    // The delete's count (0 here — empty table) must not be summed into the total.
    expect(res.rowsWritten).toBe(2);
    expect(harness.rows["historicalGame"]).toHaveLength(2);
  });
});
