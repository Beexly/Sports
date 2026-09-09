import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyStoredLine,
  isNonStandardRunline,
  isOffHalfPointGrid,
  latestQuotePerBookmaker,
  lineIntegrityGradingLine,
  lineIntegrityVoidEnabled,
  runLineIntegrityLane,
  surveyLineIntegrity,
  unpublishDefectiveUnsettledPicks,
  voidDefectiveSettledPicks,
  type LineIntegrityDb,
  type LineIntegrityPickRow,
} from "@/lib/settlement/line-integrity-lane";
import { NON_BOOK_BOOKMAKER_KEYS } from "@/lib/calibration/publish-time-market-p";
import { NON_BOOK_BOOKMAKER_KEYS as SCRIPT_NON_BOOK_KEYS } from "../../../scripts/ops/lib/regrade-line-selection";

/**
 * C-271 (ledger C-197/C-270). Every value here is a LINE or a pick STATE:
 * no scores, win rates or product data.
 */

const FLAG = "LINE_INTEGRITY_VOID_ENABLED";
afterEach(() => {
  delete process.env[FLAG];
  vi.restoreAllMocks();
});

type OddsRow = {
  id: string;
  bookmaker: string;
  fetchedAt: Date;
  spread: number | null;
  total: number | null;
};

const T0 = new Date("2026-09-01T09:00:00Z");
const PUBLISH = new Date("2026-09-01T12:00:00Z");

function pickRow(over: Partial<LineIntegrityPickRow> = {}): LineIntegrityPickRow {
  return {
    id: "pick-1",
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Fixture Home Bears -3.2",
    line: -3.25,
    clvLockLine: null,
    result: "LOSS",
    settledAt: new Date("2026-09-01T23:00:00Z"),
    isPublished: true,
    generatedAt: PUBLISH,
    modelVersion: "v5.2.7",
    game: { id: "game-1", sport: { key: "americanfootball_nfl" } },
    ...over,
  };
}

const odds = (
  id: string,
  bookmaker: string,
  spread: number | null,
  total: number | null = null,
  fetchedAt: Date = T0,
): OddsRow => ({ id, bookmaker, fetchedAt, spread, total });

/** Minimal structural double; records every write so the assertions can read them. */
function makeDb(args: {
  picks: LineIntegrityPickRow[];
  odds: OddsRow[];
  oddsThrows?: boolean;
  updateCount?: number;
}) {
  const pickUpdates: Array<Record<string, unknown>> = [];
  const memories: Array<Record<string, unknown>> = [];
  const work: Array<unknown> = [];
  const pickQueries: Array<Record<string, unknown>> = [];
  let oddsQueries = 0;

  const db = {
    pick: {
      findMany: async (q: Record<string, unknown>) => {
        pickQueries.push(q);
        const where = q["where"] as Record<string, unknown>;
        const scoped = (where["game"] as { sport?: { key?: string } } | undefined)?.sport?.key;
        return args.picks.filter((p) => {
          if (scoped && p.game.sport?.key !== scoped) return false;
          if (where["result"] === "PENDING") return p.result === "PENDING";
          const r = where["result"] as { in?: string[] } | undefined;
          return r?.in ? r.in.includes(p.result) : true;
        });
      },
      updateMany: async (q: Record<string, unknown>) => {
        pickUpdates.push(q);
        return { count: args.updateCount ?? 1 };
      },
    },
    odds: {
      findMany: async () => {
        oddsQueries += 1;
        if (args.oddsThrows) throw new Error("odds read boom");
        return args.odds;
      },
    },
    jarvisMemoryEvent: {
      create: async (q: Record<string, unknown>) => memories.push(q),
      count: async () => 0,
    },
    $transaction: async (fn: (tx: never) => Promise<{ count: number }>) =>
      fn({
        pick: {
          updateMany: async (q: Record<string, unknown>) => {
            pickUpdates.push(q);
            return { count: args.updateCount ?? 1 };
          },
        },
        // FAITHFUL TO THE DATABASE: PickSettlementEvent.pickId is @unique and a
        // settled pick already owns its grading event, so any attempt to create
        // a second one MUST blow up here. The first version of this lane did
        // exactly that and voided nothing in production, while an earlier,
        // permissive double let the tests pass (Devin Review, #733).
        pickSettlementEvent: {
          create: async () => {
            throw new Error(
              "Unique constraint failed on the fields: (`pickId`) — a settled pick already has one",
            );
          },
        },
        jarvisMemoryEvent: { create: async (q: Record<string, unknown>) => memories.push(q) },
        postSettlementWork: {
          createMany: async (q: Record<string, unknown>) => {
            work.push(q);
            return { count: 2 };
          },
        },
      } as never),
  };
  return {
    db: db as unknown as LineIntegrityDb,
    pickUpdates,
    memories,
    work,
    pickQueries,
    oddsQueries: () => oddsQueries,
  };
}

describe("latestQuotePerBookmaker — the publish-time resolver contract", () => {
  it("keeps each real book's latest snapshot at or before publish", () => {
    const rows = [
      odds("a1", "dk", -3, null, new Date("2026-09-01T08:00:00Z")),
      odds("a2", "dk", -3.5, null, new Date("2026-09-01T11:00:00Z")),
      odds("b1", "fd", -3.5, null, new Date("2026-09-01T09:00:00Z")),
    ];
    expect(latestQuotePerBookmaker(rows.map(toQuote), PUBLISH).map((q) => [q.bookmaker, q.line])).toEqual([
      ["dk", -3.5],
      ["fd", -3.5],
    ]);
  });

  it("drops a row a book posted AFTER we published", () => {
    const rows = [
      odds("a1", "dk", -7, null, new Date("2026-09-01T18:00:00Z")),
      odds("b1", "fd", -3.5),
    ];
    expect(latestQuotePerBookmaker(rows.map(toQuote), PUBLISH).map((q) => q.bookmaker)).toEqual(["fd"]);
  });

  it("drops non-book writers and rows carrying no line", () => {
    const rows = [odds("x", "rundown_default", -3.5), odds("y", "dk", null), odds("z", " ", -3.5)];
    expect(latestQuotePerBookmaker(rows.map(toQuote), PUBLISH)).toEqual([]);
  });
});

function toQuote(o: OddsRow) {
  return { id: o.id, bookmaker: o.bookmaker, fetchedAt: o.fetchedAt, line: o.spread };
}

describe("lineIntegrityGradingLine — the no-drift rule", () => {
  it("prefers the immutable lock and honours a genuine zero", () => {
    expect(lineIntegrityGradingLine({ clvLockLine: -3.5, line: -3.25 })).toBe(-3.5);
    expect(lineIntegrityGradingLine({ clvLockLine: 0, line: -3.25 })).toBe(0);
    expect(lineIntegrityGradingLine({ clvLockLine: null, line: -3.25 })).toBe(-3.25);
  });
});

describe("classifyStoredLine", () => {
  it("passes a stored line a book actually quoted", () => {
    const v = classifyStoredLine(-3.5, [
      { id: "o1", bookmaker: "a", fetchedAt: T0, line: -3 },
      { id: "o2", bookmaker: "b", fetchedAt: T0, line: -3.5 },
    ]);
    expect(v.kind).toBe("ok");
  });

  it("flags a mean between the quoted lines and reports the nearest", () => {
    const v = classifyStoredLine(-3.25, [
      { id: "o1", bookmaker: "a", fetchedAt: T0, line: -3 },
      { id: "o2", bookmaker: "b", fetchedAt: T0, line: -3.5 },
      { id: "o3", bookmaker: "c", fetchedAt: T0, line: -7 },
    ]);
    expect(v).toMatchObject({ kind: "defect", defect: "LINE_NOT_QUOTED" });
    if (v.kind !== "defect") throw new Error("unreachable");
    // -3 and -3.5 are equidistant; the scan keeps the FIRST on a tie. bookLine
    // is only "the nearest quoted line", never a corrected line to grade against.
    expect(v.bookLine).toBe(-3);
    expect(v.sourceIds).toEqual(["o1", "o2", "o3"]);
  });

  it("separates 'no book quoted anything' from 'books quoted, just not this'", () => {
    expect(classifyStoredLine(-3.25, [])).toMatchObject({
      kind: "defect",
      defect: "NO_QUOTE_ROWS",
      bookLine: null,
    });
  });
});

describe("SQL-free screens (the truth-surface proxies)", () => {
  it("isOffHalfPointGrid catches a between-lines mean and clears grid values", () => {
    expect(isOffHalfPointGrid(-3.25)).toBe(true);
    expect(isOffHalfPointGrid(-53.833333333333336)).toBe(true);
    expect(isOffHalfPointGrid(-3.5)).toBe(false);
    expect(isOffHalfPointGrid(44)).toBe(false);
    expect(isOffHalfPointGrid(Number.NaN)).toBe(true);
  });

  it("isNonStandardRunline is baseball SPREAD only", () => {
    expect(isNonStandardRunline("baseball_mlb", "SPREAD", -13.5)).toBe(true);
    expect(isNonStandardRunline("baseball_mlb", "SPREAD", -1.5)).toBe(false);
    expect(isNonStandardRunline("baseball_mlb", "TOTAL", 8.833)).toBe(false);
    expect(isNonStandardRunline("americanfootball_nfl", "SPREAD", -13.5)).toBe(false);
  });
});

describe("lineIntegrityVoidEnabled", () => {
  it("is off unless the flag is exactly true", () => {
    expect(lineIntegrityVoidEnabled({})).toBe(false);
    expect(lineIntegrityVoidEnabled({ [FLAG]: "false" })).toBe(false);
    expect(lineIntegrityVoidEnabled({ [FLAG]: "1" })).toBe(false);
    expect(lineIntegrityVoidEnabled({ [FLAG]: " TRUE " })).toBe(true);
  });
});

describe("the lane with the flag OFF", () => {
  it("reads nothing and writes nothing", async () => {
    const h = makeDb({ picks: [pickRow()], odds: [] });
    const findMany = vi.spyOn(h.db.pick, "findMany");
    const result = await runLineIntegrityLane({ db: h.db });
    expect(result.enabled).toBe(false);
    expect(result.voids.acted).toBe(0);
    expect(result.unpublished.acted).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
    expect(h.pickUpdates).toHaveLength(0);
    expect(h.memories).toHaveLength(0);
  });
});

describe("VOID half with the flag ON", () => {
  const defectiveOdds: OddsRow[] = [odds("o1", "a", -3), odds("o2", "b", -3.5)];

  it("voids a settled published pick whose graded line no book quoted", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
    expect(half.actions[0]).toMatchObject({ defect: "LINE_NOT_QUOTED", storedLine: -3.25 });
  });

  it("never attempts a second PickSettlementEvent — the pickId is @unique", async () => {
    // The double throws a unique violation if the lane touches it. Reaching
    // acted=1 proves the lane records the withdrawal elsewhere.
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
    expect(half.skippedByReason.WRITE_FAILED).toBe(0);
    const mem = h.memories[0]!["data"] as Record<string, unknown>;
    expect(mem["scope"]).toBe("settlement.line-integrity");
    expect(mem["metadata"]).toMatchObject({ action: "VOID", rcaCode: "LINE_NOT_QUOTED" });
  });

  it("NEVER re-stamps settledAt and never rewrites the result in place", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds });
    await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    const data = h.pickUpdates[0]!["data"] as Record<string, unknown>;
    expect(data).toEqual({ result: "VOID" });
    expect(Object.keys(data)).not.toContain("settledAt");
  });

  it("carries the grading line, the drifting line and the source ids as evidence", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds });
    await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    const meta = (h.memories[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    const evidence = meta["evidence"] as Record<string, unknown>;
    expect(evidence).toMatchObject({ gradingLine: -3.25, storedLine: -3.25, bookLine: -3, priorResult: "LOSS" });
    expect(evidence["sourceIds"]).toEqual(["o1", "o2"]);
    expect(evidence["settledAt"]).toBe("2026-09-01T23:00:00.000Z");
  });

  it("judges the LOCKED line, not the drifted one", async () => {
    // line has drifted onto a quoted value, but the pick was graded at -3.25.
    const h = makeDb({ picks: [pickRow({ line: -3.5, clvLockLine: -3.25 })], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
    const meta = (h.memories[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    expect((meta["evidence"] as Record<string, unknown>)["gradingLine"]).toBe(-3.25);
  });

  it("leaves a pick alone when its LOCKED line was quoted, even if `line` drifted off-grid", async () => {
    const h = makeDb({ picks: [pickRow({ line: -3.25, clvLockLine: -3.5 })], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.LINE_IS_QUOTED).toBe(1);
  });

  it("a SUPERSEDED quote cannot vouch for the line", async () => {
    // dk quoted -3.25 early, then moved to -3.5. Only the latest counts, so the
    // pick is still defective. Matching against every historical row would have
    // skipped it — failing open.
    const h = makeDb({
      picks: [pickRow()],
      odds: [
        odds("old", "dk", -3.25, null, new Date("2026-09-01T08:00:00Z")),
        odds("new", "dk", -3.5, null, new Date("2026-09-01T11:00:00Z")),
      ],
    });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
  });

  it("a non-book writer cannot vouch for the line", async () => {
    const h = makeDb({ picks: [pickRow()], odds: [odds("r", "rundown_default", -3.25)] });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
    const meta = (h.memories[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    expect((meta["evidence"] as Record<string, unknown>)["defect"]).toBe("NO_QUOTE_ROWS");
  });

  it("voids nothing when the odds read fails — no evidence, no action", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds, oddsThrows: true });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.ODDS_READ_FAILED).toBe(1);
    expect(h.memories).toHaveLength(0);
  });

  it("skips MONEYLINE, which carries no line", async () => {
    const h = makeDb({ picks: [pickRow({ pickType: "MONEYLINE" })], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.MARKET_OUT_OF_SCOPE).toBe(1);
    expect(h.oddsQueries()).toBe(0);
  });

  it("counts a race loser as WRITE_RACE_LOST, not as a void", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds, updateCount: 0 });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.WRITE_RACE_LOST).toBe(1);
  });

  it("is idempotent: the second run selects nothing because the row is now VOID", async () => {
    const rows = [pickRow()];
    const h = makeDb({ picks: rows, odds: defectiveOdds });
    expect((await voidDefectiveSettledPicks({ db: h.db, enabled: true })).acted).toBe(1);
    rows[0] = pickRow({ result: "VOID" });
    const second = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(second.inspected).toBe(0);
    expect(second.acted).toBe(0);
    expect(h.memories).toHaveLength(1);
  });

  it("a sport-scoped cycle cannot act on another sport", async () => {
    const h = makeDb({
      picks: [
        pickRow({ id: "nfl", game: { id: "g1", sport: { key: "americanfootball_nfl" } } }),
        pickRow({ id: "mlb", game: { id: "g2", sport: { key: "baseball_mlb" } } }),
      ],
      odds: defectiveOdds,
    });
    const half = await voidDefectiveSettledPicks({
      db: h.db,
      enabled: true,
      sportKey: "baseball_mlb",
    });
    expect(half.inspected).toBe(1);
    expect(half.actions.map((a) => a.pickId)).toEqual(["mlb"]);
    expect(h.pickQueries[0]!["where"]).toMatchObject({ game: { sport: { key: "baseball_mlb" } } });
  });
});

describe("UNPUBLISH half with the flag ON", () => {
  const defectiveTotals: OddsRow[] = [odds("t1", "a", null, 44), odds("t2", "b", null, 44.5)];

  it("unpublishes an unsettled published pick with the same defect", async () => {
    const row = pickRow({
      pickType: "TOTAL",
      line: 44.333333333333336,
      result: "PENDING",
      settledAt: null,
    });
    const h = makeDb({ picks: [row], odds: defectiveTotals });
    const half = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(1);
    expect(h.pickUpdates[0]!["data"]).toEqual({ isPublished: false });
    // Never deleted, never graded: it stays PENDING.
    expect(h.pickUpdates[0]!["where"]).toMatchObject({ result: "PENDING", isPublished: true });
    expect(h.memories).toHaveLength(1);
    const mem = h.memories[0]!["data"] as Record<string, unknown>;
    expect(mem["metadata"]).toMatchObject({ action: "UNPUBLISH", storedLine: 44.333333333333336 });
  });

  it("is idempotent: the second run selects nothing because it is unpublished", async () => {
    const rows = [
      pickRow({ pickType: "TOTAL", line: 44.333333333333336, result: "PENDING", settledAt: null }),
    ];
    const h = makeDb({ picks: rows, odds: defectiveTotals });
    expect((await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true })).acted).toBe(1);
    rows.length = 0;
    const second = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true });
    expect(second.inspected).toBe(0);
    expect(second.acted).toBe(0);
  });
});

describe("surveyLineIntegrity — the ops truth-surface block (C-272)", () => {
  const spreadQuotes: OddsRow[] = [odds("o1", "a", -3), odds("o2", "b", -3.5)];

  function surveyDb(picks: LineIntegrityPickRow[], counts = { voids: 4, unpublished: 7 }) {
    const base = makeDb({ picks, odds: spreadQuotes });
    const db = base.db as unknown as Record<string, unknown>;
    db["jarvisMemoryEvent"] = {
      create: async () => undefined,
      count: async (q: Record<string, unknown>) => {
        const where = q["where"] as Record<string, unknown>;
        const meta = where["metadata"] as { equals?: string } | undefined;
        return meta?.equals === "VOID" ? counts.voids : counts.unpublished;
      },
    };
    return base.db;
  }

  it("counts off-grid published unsettled picks by sport and market", async () => {
    const db = surveyDb([
      pickRow({ id: "p1", result: "PENDING", settledAt: null, line: -3.25 }),
      pickRow({ id: "p2", result: "PENDING", settledAt: null, line: -3.5 }),
      pickRow({
        id: "p3",
        result: "PENDING",
        settledAt: null,
        pickType: "TOTAL",
        line: 44.333333333333336,
      }),
    ]);
    const s = await surveyLineIntegrity(db, { env: {} });
    expect(s.publishedUnsettledOffGridOrBadRunline).toBe(2);
    expect(s.publishedUnsettledOffGridOrBadRunlineInspected).toBe(3);
    expect(s.publishedUnsettledOffGridOrBadRunlineCapReached).toBe(false);
    expect(s.publishedUnsettledOffGridOrBadRunlineBy).toEqual([
      { sportKey: "americanfootball_nfl", pickType: "SPREAD", count: 1 },
      { sportKey: "americanfootball_nfl", pickType: "TOTAL", count: 1 },
    ]);
  });

  it("screens the GRADING line, so a drifted `line` neither hides nor invents a defect", async () => {
    const db = surveyDb([
      // line off-grid, lock on-grid -> NOT counted
      pickRow({ id: "p1", result: "PENDING", settledAt: null, line: -3.25, clvLockLine: -3.5 }),
      // line on-grid, lock off-grid -> counted
      pickRow({ id: "p2", result: "PENDING", settledAt: null, line: -3.5, clvLockLine: -3.25 }),
    ]);
    const s = await surveyLineIntegrity(db, { env: {} });
    expect(s.publishedUnsettledOffGridOrBadRunline).toBe(1);
  });

  it("counts an MLB spread off the run-line ladder that the grid screen alone would miss", async () => {
    const db = surveyDb([
      pickRow({
        id: "p1",
        result: "PENDING",
        settledAt: null,
        line: -13.5, // ON the half-point grid, but never a run line
        game: { id: "game-1", sport: { key: "baseball_mlb" } },
      }),
    ]);
    const s = await surveyLineIntegrity(db, { env: {} });
    expect(s.publishedUnsettledOffGridOrBadRunline).toBe(1);
  });

  it("reports the exact not-quoted counts with their own denominators", async () => {
    const db = surveyDb([
      pickRow({ id: "p1", result: "PENDING", settledAt: null, line: -3.25 }),
      pickRow({ id: "p2", result: "LOSS", line: -3.25 }),
      pickRow({ id: "p3", result: "WIN", line: -3.5 }),
    ]);
    const s = await surveyLineIntegrity(db, { env: {} });
    expect(s.publishedUnsettledInspected).toBe(1);
    expect(s.publishedUnsettledNotQuoted).toBe(1);
    expect(s.remainingInspected).toBe(2);
    expect(s.remainingToVoid).toBe(1); // p2 only; p3's -3.5 IS quoted
    expect(s.remainingCapReached).toBe(false);
  });

  it("flags every cap so a floor is never read as a total", async () => {
    const picks = Array.from({ length: 3 }, (_, i) =>
      pickRow({ id: `p${i}`, result: "LOSS", line: -3.25 }),
    );
    const s = await surveyLineIntegrity(surveyDb(picks), { cap: 2, env: {} });
    expect(s.remainingInspected).toBe(2);
    expect(s.remainingToVoid).toBe(2);
    expect(s.remainingCapReached).toBe(true);
  });

  it("the off-grid screen carries its own cap flag too", async () => {
    const picks = Array.from({ length: 3 }, (_, i) =>
      pickRow({ id: `p${i}`, result: "PENDING", settledAt: null, line: -3.25 }),
    );
    const s = await surveyLineIntegrity(surveyDb(picks), { cap: 2, env: {} });
    expect(s.publishedUnsettledOffGridOrBadRunline).toBe(2);
    expect(s.publishedUnsettledOffGridOrBadRunlineInspected).toBe(2);
    expect(s.publishedUnsettledOffGridOrBadRunlineCapReached).toBe(true);
  });

  it("reports what the lane did, by action, and whether either flag is on", async () => {
    const s = await surveyLineIntegrity(surveyDb([]), {
      env: { LINE_INTEGRITY_VOID_ENABLED: "true" },
    });
    expect(s.voidedByLane).toBe(4);
    expect(s.unpublishedByLane).toBe(7);
    expect(s.laneEnabled).toBe(true);
    expect(s.publishGuardEnabled).toBe(false);
  });

  it("writes nothing", async () => {
    const base = makeDb({ picks: [pickRow({ id: "p1", result: "LOSS", line: -3.25 })], odds: spreadQuotes });
    const db = base.db as unknown as Record<string, unknown>;
    db["jarvisMemoryEvent"] = { create: async () => undefined, count: async () => 0 };
    await surveyLineIntegrity(base.db, { env: {} });
    expect(base.pickUpdates).toHaveLength(0);
    expect(base.memories).toHaveLength(0);
  });
});

describe("no divergent copies of the non-book bookmaker list", () => {
  it("the dry-run tool's list matches the canonical calibration one", () => {
    // The lane imports the canonical predicate directly. The dry-run tool
    // (scripts/ops/lib) is deliberately dependency-free so it typechecks with no
    // DATABASE_URL, so it keeps its own copy — pinned here so the two cannot
    // drift apart silently (Devin Review, #733).
    expect([...SCRIPT_NON_BOOK_KEYS].sort()).toEqual([...NON_BOOK_BOOKMAKER_KEYS].sort());
  });
});
