import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyStoredLine,
  isNonStandardRunline,
  isOffHalfPointGrid,
  lineIntegrityVoidEnabled,
  runLineIntegrityLane,
  surveyLineIntegrity,
  unpublishDefectiveUnsettledPicks,
  voidDefectiveSettledPicks,
  type LineIntegrityDb,
  type LineIntegrityPickRow,
} from "@/lib/settlement/line-integrity-lane";

/**
 * C-271 (ledger C-197/C-270). Every value here is a LINE or a pick STATE:
 * no scores, win rates or product data.
 */

const FLAG = "LINE_INTEGRITY_VOID_ENABLED";
afterEach(() => {
  delete process.env[FLAG];
  vi.restoreAllMocks();
});

type OddsRow = { id: string; bookmaker: string; spread: number | null; total: number | null };

function pickRow(over: Partial<LineIntegrityPickRow> = {}): LineIntegrityPickRow {
  return {
    id: "pick-1",
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Fixture Home Bears -3.2",
    line: -3.25,
    result: "LOSS",
    settledAt: new Date("2026-09-01T23:00:00Z"),
    isPublished: true,
    generatedAt: new Date("2026-09-01T12:00:00Z"),
    modelVersion: "v5.2.7",
    game: { id: "game-1", sport: { key: "americanfootball_nfl" } },
    ...over,
  };
}

/** Minimal structural double; records every write so the assertions can read them. */
function makeDb(args: {
  picks: LineIntegrityPickRow[];
  odds: OddsRow[];
  oddsThrows?: boolean;
  updateCount?: number;
}) {
  const pickUpdates: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  const work: Array<unknown> = [];
  const memories: Array<Record<string, unknown>> = [];
  let oddsQueries = 0;
  const db = {
    pick: {
      findMany: async (q: Record<string, unknown>) => {
        const where = q["where"] as Record<string, unknown>;
        return args.picks.filter((p) => {
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
      findMany: async (q: Record<string, unknown>) => {
        oddsQueries += 1;
        if (args.oddsThrows) throw new Error("odds read boom");
        const where = q["where"] as Record<string, unknown>;
        const market = where["market"];
        return args.odds.filter((o) => (market === "SPREADS" ? o.spread !== null : o.total !== null));
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
        pickSettlementEvent: { create: async (q: Record<string, unknown>) => events.push(q) },
        jarvisMemoryEvent: { create: async (q: Record<string, unknown>) => memories.push(q) },
        postSettlementWork: {
          createMany: async (q: Record<string, unknown>) => {
            work.push(q);
            return { count: 2 };
          },
        },
      } as never),
  };
  return { db: db as unknown as LineIntegrityDb, pickUpdates, events, work, memories, oddsQueries: () => oddsQueries };
}

describe("classifyStoredLine", () => {
  it("passes a stored line a book actually quoted", () => {
    const v = classifyStoredLine(-3.5, [
      { id: "o1", bookmaker: "a", line: -3 },
      { id: "o2", bookmaker: "b", line: -3.5 },
    ]);
    expect(v.kind).toBe("ok");
  });

  it("flags a mean that sits between the quoted lines, and reports the nearest", () => {
    const v = classifyStoredLine(-3.25, [
      { id: "o1", bookmaker: "a", line: -3 },
      { id: "o2", bookmaker: "b", line: -3.5 },
      { id: "o3", bookmaker: "c", line: -7 },
    ]);
    expect(v).toMatchObject({ kind: "defect", defect: "LINE_NOT_QUOTED" });
    if (v.kind !== "defect") throw new Error("unreachable");
    // -3 and -3.5 are equidistant from -3.25. The scan keeps the FIRST on a
    // tie, and that is all `bookLine` claims to be: the nearest quoted line,
    // reported so the evidence shows how far off the stored value was. It is
    // not a corrected line and nothing grades against it.
    expect(v.bookLine).toBe(-3);
    expect(v.sourceIds).toEqual(["o1", "o2", "o3"]);
  });

  it("reports the strictly nearest quoted line when there is no tie", () => {
    const v = classifyStoredLine(-3.4, [
      { id: "o1", bookmaker: "a", line: -3 },
      { id: "o2", bookmaker: "b", line: -3.5 },
    ]);
    if (v.kind !== "defect") throw new Error("unreachable");
    expect(v.bookLine).toBe(-3.5);
  });

  it("separates 'no book quoted anything' from 'books quoted, just not this'", () => {
    const v = classifyStoredLine(-3.25, []);
    expect(v).toMatchObject({ kind: "defect", defect: "NO_QUOTE_ROWS", bookLine: null });
  });

  it("ignores rows carrying no line for this market", () => {
    const v = classifyStoredLine(-3.25, [{ id: "o1", bookmaker: "a", line: null }]);
    expect(v).toMatchObject({ kind: "defect", defect: "NO_QUOTE_ROWS" });
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
    expect(h.events).toHaveLength(0);
  });
});

describe("VOID half with the flag ON", () => {
  const defectiveOdds: OddsRow[] = [
    { id: "o1", bookmaker: "a", spread: -3, total: null },
    { id: "o2", bookmaker: "b", spread: -3.5, total: null },
  ];

  it("voids a settled published pick whose line no book quoted", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: new Date("2026-09-08T00:00:00Z") });
    expect(half.acted).toBe(1);
    expect(half.actions[0]).toMatchObject({ defect: "LINE_NOT_QUOTED", storedLine: -3.25 });
  });

  it("NEVER re-stamps settledAt and never rewrites the result in place", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds });
    await voidDefectiveSettledPicks({ db: h.db, enabled: true, now: new Date("2026-09-08T00:00:00Z") });
    const data = h.pickUpdates[0]!["data"] as Record<string, unknown>;
    expect(data).toEqual({ result: "VOID" });
    expect(Object.keys(data)).not.toContain("settledAt");
    // The event carries the ORIGINAL settlement time, not the decision time.
    const ev = h.events[0]!["data"] as Record<string, unknown>;
    expect(ev["settledAt"]).toEqual(new Date("2026-09-01T23:00:00Z"));
    expect(ev["result"]).toBe("VOID");
  });

  it("writes one settlement event carrying reason, RCA code and evidence", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds });
    await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(h.events).toHaveLength(1);
    const payload = (h.events[0]!["data"] as Record<string, unknown>)["payload"] as Record<string, unknown>;
    expect(payload["rcaCode"]).toBe("LINE_NOT_QUOTED");
    expect(payload["reason"]).toContain("not quoted by any bookmaker");
    const evidence = payload["evidence"] as Record<string, unknown>;
    expect(evidence).toMatchObject({ storedLine: -3.25, bookLine: -3, priorResult: "LOSS" });
    expect(evidence["sourceIds"]).toEqual(["o1", "o2"]);
    expect(evidence["settledAt"]).toBe("2026-09-01T23:00:00.000Z");
  });

  it("leaves a pick whose line a book quoted alone", async () => {
    const h = makeDb({ picks: [pickRow({ line: -3.5 })], odds: defectiveOdds });
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.LINE_IS_QUOTED).toBe(1);
    expect(h.events).toHaveLength(0);
  });

  it("voids nothing when the odds read fails — no evidence, no action", async () => {
    const h = makeDb({ picks: [pickRow()], odds: defectiveOdds, oddsThrows: true });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const half = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(0);
    expect(half.skippedByReason.ODDS_READ_FAILED).toBe(1);
    expect(h.events).toHaveLength(0);
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
    const first = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(first.acted).toBe(1);
    // The write the lane issued, applied to the double's row.
    rows[0] = pickRow({ result: "VOID" });
    const second = await voidDefectiveSettledPicks({ db: h.db, enabled: true });
    expect(second.inspected).toBe(0);
    expect(second.acted).toBe(0);
    expect(h.events).toHaveLength(1);
  });
});

describe("UNPUBLISH half with the flag ON", () => {
  const defectiveTotals: OddsRow[] = [
    { id: "t1", bookmaker: "a", spread: null, total: 44 },
    { id: "t2", bookmaker: "b", spread: null, total: 44.5 },
  ];

  it("unpublishes an unsettled published pick with the same defect", async () => {
    const row = pickRow({ pickType: "TOTAL", line: 44.333333333333336, result: "PENDING", settledAt: null });
    const h = makeDb({ picks: [row], odds: defectiveTotals });
    const half = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true });
    expect(half.acted).toBe(1);
    expect(h.pickUpdates[0]!["data"]).toEqual({ isPublished: false });
    // Never deleted, never graded, and no settlement event: it stays PENDING.
    expect(h.pickUpdates[0]!["where"]).toMatchObject({ result: "PENDING", isPublished: true });
    expect(h.events).toHaveLength(0);
    // But an append-only record IS written, in the same transaction, so the
    // ops surface can count what this half did.
    expect(h.memories).toHaveLength(1);
    const mem = h.memories[0]!["data"] as Record<string, unknown>;
    expect(mem["scope"]).toBe("settlement.line-integrity");
    expect(mem["metadata"]).toMatchObject({ action: "UNPUBLISH", rcaCode: "LINE_NOT_QUOTED", storedLine: 44.333333333333336 });
  });

  it("is idempotent: the second run selects nothing because it is unpublished", async () => {
    const rows = [pickRow({ pickType: "TOTAL", line: 44.333333333333336, result: "PENDING", settledAt: null })];
    const h = makeDb({ picks: rows, odds: defectiveTotals });
    expect((await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true })).acted).toBe(1);
    rows.length = 0;
    const second = await unpublishDefectiveUnsettledPicks({ db: h.db, enabled: true });
    expect(second.inspected).toBe(0);
    expect(second.acted).toBe(0);
  });
});

describe("surveyLineIntegrity — the ops truth-surface block (C-272)", () => {
  const spreadQuotes: OddsRow[] = [
    { id: "o1", bookmaker: "a", spread: -3, total: null },
    { id: "o2", bookmaker: "b", spread: -3.5, total: null },
  ];

  function surveyDb(picks: LineIntegrityPickRow[], counts = { events: 4, memories: 7 }) {
    const base = makeDb({ picks, odds: spreadQuotes });
    const db = base.db as unknown as Record<string, unknown>;
    db["pickSettlementEvent"] = { count: async () => counts.events };
    db["jarvisMemoryEvent"] = { count: async () => counts.memories, create: async () => undefined };
    return base.db;
  }

  it("counts off-grid published unsettled picks by sport and market, exactly", async () => {
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
    expect(s.publishedUnsettledOffGridOrBadRunlineBy).toEqual([
      { sportKey: "americanfootball_nfl", pickType: "SPREAD", count: 1 },
      { sportKey: "americanfootball_nfl", pickType: "TOTAL", count: 1 },
    ]);
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

  it("flags the cap so a floor is never read as a total", async () => {
    const picks = Array.from({ length: 3 }, (_, i) =>
      pickRow({ id: `p${i}`, result: "LOSS", line: -3.25 }),
    );
    const s = await surveyLineIntegrity(surveyDb(picks), { cap: 2, env: {} });
    expect(s.remainingInspected).toBe(2);
    expect(s.remainingToVoid).toBe(2);
    expect(s.remainingCapReached).toBe(true);
  });

  it("reports what the lane did and whether either flag is on", async () => {
    const s = await surveyLineIntegrity(surveyDb([]), {
      env: { LINE_INTEGRITY_VOID_ENABLED: "true" },
    });
    expect(s.voidedByLane).toBe(4);
    expect(s.unpublishedByLane).toBe(7);
    expect(s.laneEnabled).toBe(true);
    expect(s.publishGuardEnabled).toBe(false);
  });

  it("writes nothing", async () => {
    const picks = [pickRow({ id: "p1", result: "LOSS", line: -3.25 })];
    const base = makeDb({ picks, odds: spreadQuotes });
    const db = base.db as unknown as Record<string, unknown>;
    db["pickSettlementEvent"] = { count: async () => 0 };
    db["jarvisMemoryEvent"] = { count: async () => 0, create: async () => undefined };
    await surveyLineIntegrity(base.db, { env: {} });
    expect(base.pickUpdates).toHaveLength(0);
    expect(base.events).toHaveLength(0);
  });
});
