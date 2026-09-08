import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedGame } from "@/lib/data-sources/free-adapters/espn-scores";
import type { MultiSourceScoreResult } from "@/lib/data-sources/multi-source-scores";

/**
 * C-95: the free grader stamps the line-archive CLOSE tag after a successful
 * settle write, as the paid grader (settle-sport.ts) always has. Until this
 * change settle-sport.ts:867 was the only CLOSE caller, so every pick graded by
 * the free ESPN lane had no close for its CLV ledger.
 *
 * The runner is driven end to end here: one PENDING NFL moneyline, one ESPN
 * final, a transaction client that accepts the settlement, and an
 * oddsLineSnapshot delegate that records what the archive asked of it.
 */

// The runner stamps settledAt from the wall clock, so the fixture kickoff must
// sit in the real past (the write refuses a kickoff after settledAt).
const KICKOFF = new Date("2026-09-06T00:20:00.000Z");
const NOW = new Date("2026-09-06T08:00:00.000Z");

type AnyFn = (...args: unknown[]) => Promise<unknown>;

const mocks = vi.hoisted(() => ({
  pickFindMany: vi.fn<AnyFn>(),
  pickUpdateMany: vi.fn<AnyFn>(),
  snapshotFindMany: vi.fn<AnyFn>(),
  snapshotUpdate: vi.fn<AnyFn>(),
  fetchScoresMultiSource: vi.fn<AnyFn>(),
}));

/**
 * A permissive Prisma stand-in: the two delegates under test are explicit, the
 * transaction client accepts the settlement, and every other delegate/method
 * resolves to an empty value so the post-settle bookkeeping (CLV grade,
 * snapshot outcome, learning) runs without a database.
 */
function defaultFor(method: string): unknown {
  if (method === "findMany") return [];
  if (method === "count") return 0;
  if (method === "createMany" || method === "updateMany" || method === "deleteMany") return { count: 0 };
  return null;
}
function permissiveDelegate(overrides: Record<string, AnyFn> = {}): Record<string, AnyFn> {
  return new Proxy(overrides, {
    get: (target, method) => {
      if (typeof method !== "string") return undefined;
      return target[method] ?? (async () => defaultFor(method));
    },
  });
}
function txClient(): Record<string, unknown> {
  return {
    game: permissiveDelegate({
      findUnique: async () => ({ commenceTime: KICKOFF, homeScore: null, awayScore: null, status: "SCHEDULED" }),
      updateMany: async () => ({ count: 1 }),
    }),
    pick: permissiveDelegate({
      updateMany: mocks.pickUpdateMany,
      findUnique: async () => ({ result: "PENDING" }),
    }),
    pickSettlementEvent: permissiveDelegate({ create: async (args) => args }),
    postSettlementWork: permissiveDelegate({ createMany: async () => ({ count: 2 }) }),
  };
}

vi.mock("@sports/db", () => {
  const delegates: Record<string, unknown> = {
    pick: permissiveDelegate({ findMany: mocks.pickFindMany }),
    oddsLineSnapshot: permissiveDelegate({ findMany: mocks.snapshotFindMany, update: mocks.snapshotUpdate }),
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient()),
  };
  const db = new Proxy(delegates, {
    get: (target, delegate) => {
      if (typeof delegate !== "string") return undefined;
      return target[delegate] ?? permissiveDelegate();
    },
  });
  return { db };
});

vi.mock("@/lib/data-sources/multi-source-scores", () => ({
  fetchScoresMultiSource: mocks.fetchScoresMultiSource,
}));

import { runFreePathSettlement } from "@/lib/data-sources/free-settlement-runner";
import { stampClosingLinesAfterSettle } from "@/lib/settlement/close-stamp";

function pendingRow() {
  return {
    id: "p1",
    pickType: "MONEYLINE",
    selection: "Seattle Seahawks",
    line: 0,
    modelVersion: "v5.2.7",
    edgeScore: null,
    clvLockLine: null,
    clvLockPrice: null,
    gameId: "g1",
    isBootstrap: false,
    bookmakerCount: 3,
    confidence: 60,
    factorBreakdown: null,
    game: {
      id: "g1",
      homeTeamName: "Seattle Seahawks",
      awayTeamName: "New England Patriots",
      commenceTime: KICKOFF,
      dataQualityScore: 80,
    },
  };
}

function espnFinal(): NormalizedGame {
  return {
    sourceId: "espn-public-api",
    sport: "nfl",
    gameId: "401872656",
    startTime: KICKOFF.toISOString(),
    state: "post",
    completed: true,
    statusDetail: "Final",
    venue: null,
    home: { team: "Seattle Seahawks", abbreviation: "SEA", score: 24 },
    away: { team: "New England Patriots", abbreviation: "NE", score: 17 },
    attribution: "Scores data via ESPN",
  };
}

function scores(games: NormalizedGame[]): MultiSourceScoreResult {
  return {
    sport: "nfl",
    primary: "espn-public-api",
    used: games.length ? "espn-public-api" : null,
    attempted: ["espn-public-api"],
    games,
    failover: false,
    errors: [],
    oddsApiRequired: false,
    datesRequested: [],
  };
}

const ORIGINAL_ENV = process.env["LINE_ARCHIVE_ENABLED"];
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  process.env["LINE_ARCHIVE_ENABLED"] = "true";
  mocks.pickFindMany.mockResolvedValue([pendingRow()]);
  mocks.pickUpdateMany.mockResolvedValue({ count: 1 });
  mocks.fetchScoresMultiSource.mockResolvedValue(scores([espnFinal()]));
  mocks.snapshotFindMany.mockResolvedValue([
    { id: "snap-1", market: "MONEYLINE", book: "draftkings", side: "home", capturedAt: new Date("2026-09-05T23:50:00Z"), phase: "OPEN" },
  ]);
  mocks.snapshotUpdate.mockResolvedValue({});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  vi.restoreAllMocks();
  if (ORIGINAL_ENV === undefined) delete process.env["LINE_ARCHIVE_ENABLED"];
  else process.env["LINE_ARCHIVE_ENABLED"] = ORIGINAL_ENV;
});

describe("free grader stamps the line-archive CLOSE after a successful settle (C-95)", () => {
  it("re-tags the last pre-kickoff snapshot CLOSE for the game it just graded", async () => {
    const result = await runFreePathSettlement({ sportKey: "americanfootball_nfl", now: NOW });

    expect(result.picksSettled).toBe(1);
    expect(mocks.pickUpdateMany).toHaveBeenCalledTimes(1);
    // The archive was asked about THIS game, bounded at ITS kickoff.
    expect(mocks.snapshotFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.snapshotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameId: "g1", capturedAt: { lte: KICKOFF } } }),
    );
    expect(mocks.snapshotUpdate).toHaveBeenCalledWith({ where: { id: "snap-1" }, data: { phase: "CLOSE" } });
  });

  it("stamps nothing when the settle write was refused (the pick stays PENDING)", async () => {
    mocks.pickUpdateMany.mockResolvedValue({ count: 0 });

    const result = await runFreePathSettlement({ sportKey: "americanfootball_nfl", now: NOW });

    expect(result.picksSettled).toBe(0);
    expect(mocks.snapshotFindMany).not.toHaveBeenCalled();
    expect(mocks.snapshotUpdate).not.toHaveBeenCalled();
  });

  it("is a zero-DB-call no-op when LINE_ARCHIVE_ENABLED is unset (hard gate)", async () => {
    delete process.env["LINE_ARCHIVE_ENABLED"];

    const result = await runFreePathSettlement({ sportKey: "americanfootball_nfl", now: NOW });

    expect(result.picksSettled).toBe(1);
    expect(mocks.snapshotFindMany).not.toHaveBeenCalled();
  });
});

describe("stampClosingLinesAfterSettle", () => {
  it("never throws and warns when the archive reports an error, so a grade can never be failed by a line tag", async () => {
    const db = {
      oddsLineSnapshot: {
        findMany: async () => {
          throw new Error("connection reset");
        },
        update: async () => ({}),
      },
    };
    const result = await stampClosingLinesAfterSettle(db, "g1", KICKOFF, "[test]");
    expect(result).toMatchObject({ enabled: true, updated: 0, error: "connection reset" });
    expect(warn.mock.calls.flat().join(" ")).toContain("markClosingSnapshots failed for g1");
  });

  it("returns enabled:false and touches nothing when the gate is off", async () => {
    delete process.env["LINE_ARCHIVE_ENABLED"];
    const findMany = vi.fn();
    const result = await stampClosingLinesAfterSettle({ oddsLineSnapshot: { findMany } }, "g1", KICKOFF, "[test]");
    expect(result).toEqual({ enabled: false, updated: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });
});
