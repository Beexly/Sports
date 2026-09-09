import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyStoredLine,
  isNonStandardRunline,
  isOffHalfPointGrid,
  judgementFor,
  latestQuotePerBookmaker,
  lineIntegrityDeadline,
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
 * C-282 (ledger C-197/C-281). Every value here is a LINE or a pick STATE:
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
    clvLockLine: -3.25,
    proofReceipt: null,
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
        let rows = args.picks.filter((p) => {
          if (scoped && p.game.sport?.key !== scoped) return false;
          if (where["result"] === "PENDING") return p.result === "PENDING";
          const r = where["result"] as { in?: string[] } | undefined;
          return r?.in ? r.in.includes(p.result) : true;
        });
        // Prisma cursor + skip:1 semantics, on the id ordering the lane asks for.
        rows = [...rows].sort((a, b) => a.id.localeCompare(b.id));
        const cur = (q["cursor"] as { id?: string } | undefined)?.id;
        if (cur) {
          const at = rows.findIndex((p) => p.id === cur);
          rows = at >= 0 ? rows.slice(at + 1) : rows;
        }
        const take = q["take"] as number | undefined;
        return take === undefined ? rows : rows.slice(0, take);
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
      // Cursor store: newest matching write wins, exactly as readCursor's
      // created_at DESC take 1 does against the real table.
      findMany: async (q: Record<string, unknown>) => {
        const where = q["where"] as Record<string, unknown>;
        const halfName = (where["metadata"] as { equals?: string } | undefined)?.equals;
        const matches = memories
          .map((m) => (m["data"] as Record<string, unknown>))
          .filter((d) => d["scope"] === "settlement.line-integrity.cursor")
          .filter((d) => (d["metadata"] as { half?: string }).half === halfName);
        const last = matches[matches.length - 1];
        return last ? [{ metadata: last["metadata"] }] : [];
      },
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
            work.push({ op: "createMany", ...q });
            return { count: 2 };
          },
          updateMany: async (q: Record<string, unknown>) => {
            work.push({ op: "updateMany", ...q });
            return { count: 1 };
          },
        },
      } as never),
  };
  /** Only the VOID/UNPUBLISH records — cursor writes live in the same table. */
  const actions = (): Array<Record<string, unknown>> =>
    memories.filter(
      (m) => (m["data"] as Record<string, unknown>)["scope"] === "settlement.line-integrity",
    );
  return {
    db: db as unknown as LineIntegrityDb,
    pickUpdates,
    memories,
    actions,
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
    const mem = h.actions()[0]!["data"] as Record<string, unknown>;
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
    const meta = (h.actions()[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    const evidence = meta["evidence"] as Record<string, unknown>;
    expect(evidence).toMatchObject({
      judgedLine: -3.25,
      judgedBasis: "clv_lock_at_publish",
      storedLine: -3.25,
      bookLine: -3,
      priorResult: "LOSS",
    });
    expect(evidence["sourceIds"]).toEqual(["o1", "o2"]);
    expect(evidence["settledAt"]).toBe("2026-09-01T23:00:00.000Z");
  });

  it("judges the LOCKED line, not the drifted one", async () => {
    // line has drifted onto a quoted value, but the pick was graded at -3.25.
    const h = makeDb({ picks: [pickRow({ line: -3.5, clvLockLine: -3.25 })], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
    const meta = (h.actions()[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    expect((meta["evidence"] as Record<string, unknown>)["judgedLine"]).toBe(-3.25);
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
    const meta = (h.actions()[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    expect((meta["evidence"] as Record<string, unknown>)["defect"]).toBe("NO_QUOTE_ROWS");
  });

  it("voids nothing when the odds read fails — no evidence, no action", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds, oddsThrows: true });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.ODDS_READ_FAILED).toBe(1);
    expect(h.actions()).toHaveLength(0);
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
    expect(h.actions()).toHaveLength(1);
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

describe("the sweep cursor — capped cycles must make progress", () => {
  const quotes: OddsRow[] = [odds("o1", "a", -3), odds("o2", "b", -3.5)];

  /** Two CLEAN picks (-3.5 is quoted) ahead of one DEFECTIVE pick (-3.25). */
  const population = (): LineIntegrityPickRow[] => [
    pickRow({ id: "a-clean", line: -3.5, clvLockLine: -3.5 }),
    pickRow({ id: "b-clean", line: -3.5, clvLockLine: -3.5 }),
    pickRow({ id: "c-defect", line: -3.25, clvLockLine: -3.25 }),
  ];

  it("reaches a defect sitting behind a full page of valid picks", async () => {
    const picks = population();
    const h = makeDb({ picks, odds: quotes });
    // Cap 2: cycle one sees only the two clean rows and acts on nothing.
    const first = await voidDefectiveSettledPicks({ db: h.db, enabled: true, cap: 2, now: PUBLISH });
    expect(first.inspected).toBe(2);
    expect(first.acted).toBe(0);
    expect(first.capReached).toBe(true);

    // Cycle two resumes AFTER them and finds the defect. Without the cursor
    // this would re-select the same two clean rows forever and the defect
    // would never be voided (Devin Review, #733 round 2).
    const second = await voidDefectiveSettledPicks({ db: h.db, enabled: true, cap: 2, now: PUBLISH });
    expect(second.acted).toBe(1);
    expect(second.actions[0]!.pickId).toBe("c-defect");
  });

  it("wraps once the sweep runs out, so later arrivals are not stranded", async () => {
    const picks = population();
    const h = makeDb({ picks, odds: quotes });
    await voidDefectiveSettledPicks({ db: h.db, enabled: true, cap: 2, now: PUBLISH });
    const second = await voidDefectiveSettledPicks({ db: h.db, enabled: true, cap: 2, now: PUBLISH });
    expect(second.capReached).toBe(false); // end of population -> cursor resets
    // A pick generated long ago can settle later and land BEHIND the cursor,
    // so the next sweep must start over rather than stop.
    const before = h.pickQueries.length;
    const third = await voidDefectiveSettledPicks({ db: h.db, enabled: true, cap: 2, now: PUBLISH });
    expect(third.inspected).toBe(2);
    // The third sweep issued its query with NO cursor — it restarted.
    expect(h.pickQueries[before]!["cursor"]).toBeUndefined();
    expect(third.actions).toEqual([]); // the two it re-inspects are the clean ones
  });

  it("the unpublish half keeps its own cursor, independent of the void half", async () => {
    const h = makeDb({
      picks: [
        pickRow({ id: "s1", line: -3.5, clvLockLine: -3.5 }),
        pickRow({ id: "p1", line: -3.5, result: "PENDING", settledAt: null }),
        pickRow({ id: "p2", line: -3.25, result: "PENDING", settledAt: null }),
      ],
      odds: quotes,
    });
    await voidDefectiveSettledPicks({ db: h.db, enabled: true, cap: 1, now: PUBLISH });
    // The void half advanced its own cursor; the unpublish half starts fresh.
    const un = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true, cap: 1, now: PUBLISH });
    expect(un.inspected).toBe(1);
    expect(un.acted).toBe(0); // p1 is clean; the cursor lets p2 come next cycle
    const un2 = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true, cap: 1, now: PUBLISH });
    expect(un2.acted).toBe(1);
    expect(un2.actions[0]!.pickId).toBe("p2");
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
    expect(h.actions()).toHaveLength(1);
    const mem = h.actions()[0]!["data"] as Record<string, unknown>;
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

describe("settled vs pending judge DIFFERENT lines (Devin round 3)", () => {
  const quotes: OddsRow[] = [odds("o1", "a", -3), odds("o2", "b", -3.5)];

  it("PENDING: an unplaceable DISPLAYED line is unpublished even when the lock was fine", async () => {
    // The lock (-3.5) was quoted, but the member is looking at -3.25 right now.
    const row = pickRow({ line: -3.25, clvLockLine: -3.5, result: "PENDING", settledAt: null });
    const h = makeDb({ picks: [row], odds: quotes });
    const half = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
    const meta = (h.actions()[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    expect(meta).toMatchObject({ judgedLine: -3.25, judgedBasis: "displayed_line_now" });
  });

  it("PENDING: a placeable displayed line stays up even when the lock drifted off", async () => {
    const row = pickRow({ line: -3.5, clvLockLine: -3.25, result: "PENDING", settledAt: null });
    const h = makeDb({ picks: [row], odds: quotes });
    const half = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.LINE_IS_QUOTED).toBe(1);
  });

  it("judgementFor names the line and the clock for each mode", () => {
    const row = pickRow({ line: -1, clvLockLine: -2 });
    expect(judgementFor(row, "void", PUBLISH)).toMatchObject({ line: -2, basis: "clv_lock_at_publish" });
    expect(judgementFor(row, "unpublish", PUBLISH)).toMatchObject({
      line: -1,
      basis: "displayed_line_now",
    });
  });
});

describe("legacy settled rows with no publication lock (Devin round 3)", () => {
  const quotes: OddsRow[] = [odds("o1", "a", -3), odds("o2", "b", -3.5)];

  it("SKIPS rather than judging a refreshed line against publish-time odds", async () => {
    const h = makeDb({
      picks: [pickRow({ line: -3.25, clvLockLine: null, proofReceipt: null })],
      odds: quotes,
    });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.NO_PUBLISH_LOCK).toBe(1);
    expect(h.actions()).toHaveLength(0);
  });

  it("uses the immutable proof receipt when one exists, at ITS asOf", async () => {
    const h = makeDb({
      picks: [
        pickRow({
          line: -3.5, // refreshed since; must not be what is judged
          clvLockLine: null,
          proofReceipt: { line: -3.25, asOf: PUBLISH },
        }),
      ],
      odds: quotes,
    });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(1);
    const meta = (h.actions()[0]!["data"] as Record<string, unknown>)["metadata"] as Record<string, unknown>;
    expect((meta["evidence"] as Record<string, unknown>)["judgedBasis"]).toBe("proof_receipt_at_as_of");
    expect((meta["evidence"] as Record<string, unknown>)["judgedLine"]).toBe(-3.25);
  });

  it("a receipt whose line WAS quoted leaves the pick alone", async () => {
    const h = makeDb({
      picks: [
        pickRow({ line: -3.25, clvLockLine: null, proofReceipt: { line: -3.5, asOf: PUBLISH } }),
      ],
      odds: quotes,
    });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.LINE_IS_QUOTED).toBe(1);
  });
});

describe("the route deadline (Devin round 3)", () => {
  const quotes: OddsRow[] = [odds("o1", "a", -3), odds("o2", "b", -3.5)];

  it("stops before the next read once the budget is spent, leaving the rest for next cycle", async () => {
    const picks = Array.from({ length: 4 }, (_, i) =>
      pickRow({ id: `p${i}`, line: -3.25, clvLockLine: -3.25 }),
    );
    const h = makeDb({ picks, odds: quotes });
    let t = 1_000;
    const half = await voidDefectiveSettledPicks({
      db: h.db,
      enabled: true,
      now: PUBLISH,
      deadlineAtMs: 1_002,
      clock: () => (t += 1), // 1001 (ok), 1002 (spent)
    });
    expect(half.deadlineHit).toBe(true);
    expect(half.acted).toBeLessThan(4);
    expect(half.skippedByReason.DEADLINE_REACHED).toBeGreaterThan(0);
  });

  it("touches nothing at all when the budget is already spent", async () => {
    const h = makeDb({ picks: [pickRow({ line: -3.25, clvLockLine: -3.25 })], odds: quotes });
    const half = await voidDefectiveSettledPicks({
      db: h.db,
      enabled: true,
      now: PUBLISH,
      deadlineAtMs: 0,
      clock: () => 1,
    });
    expect(half.acted).toBe(0);
    expect(half.deadlineHit).toBe(true);
    expect(h.oddsQueries()).toBe(0);
    expect(h.actions()).toHaveLength(0);
  });

  it("lineIntegrityDeadline leaves the route a tail reserve", () => {
    expect(lineIntegrityDeadline(1_000, 300)).toBe(1_000 + 300_000 - 60_000);
  });
});

describe("post-settlement work is REOPENED, not just enqueued (Devin rounds 3-4)", () => {
  it("resets SNAPSHOT_OUTCOME — and ONLY that — so the withdrawn outcome is recomputed", async () => {
    const h = makeDb({
      picks: [pickRow()],
      odds: [odds("o1", "a", -3), odds("o2", "b", -3.5)],
    });
    await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: PUBLISH });
    const reopens = h.work.filter((w) => (w as { op?: string }).op === "updateMany");
    // Round 3 reopened CLV_GRADE too. Round 4 found that the CLV drain accepts
    // any non-PENDING result, so that reopen would have MINTED a fresh public
    // CLV verdict for a pick we had just withdrawn. The snapshot is reopened
    // (its drain treats VOID as a real result); CLV is not.
    expect(reopens).toHaveLength(1);
    const only = reopens[0] as { where: { kind: string }; data: Record<string, unknown> };
    expect(only.where.kind).toBe("SNAPSHOT_OUTCOME");
    expect(only.data).toMatchObject({ status: "PENDING", completedAt: null });

    const enqueued = h.work
      .filter((w) => (w as { op?: string }).op === "createMany")
      .flatMap((w) => ((w as { data?: Array<{ kind: string }> }).data ?? []).map((d) => d.kind));
    expect(enqueued).toEqual(["SNAPSHOT_OUTCOME"]);
  });
});

describe("the sweep cursor is scoped per sport (Devin round 3)", () => {
  it("a sport-scoped run does not advance the unscoped cursor", async () => {
    const h = makeDb({
      picks: [pickRow({ id: "mlb", game: { id: "g", sport: { key: "baseball_mlb" } } })],
      odds: [odds("o1", "a", -3), odds("o2", "b", -3.5)],
    });
    await voidDefectiveSettledPicks({
      db: h.db,
      enabled: true,
      cap: 1,
      sportKey: "baseball_mlb",
      now: PUBLISH,
    });
    const cursors = h.memories
      .map((m) => m["data"] as Record<string, unknown>)
      .filter((d) => d["scope"] === "settlement.line-integrity.cursor")
      .map((d) => (d["metadata"] as { half?: string }).half);
    expect(cursors).toEqual(["void:baseball_mlb"]);
    expect(cursors).not.toContain("void:*");
  });
});

describe("surveyLineIntegrity — the ops truth-surface block (C-283)", () => {
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
      pickRow({ id: "p3", result: "WIN", line: -3.5, clvLockLine: -3.5 }),
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
