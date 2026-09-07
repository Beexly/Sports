import { describe, expect, it, vi } from "vitest";
import {
  BACKFILL_CAP,
  BACKFILL_UNRESOLVED_GRACE_DAYS,
  BACKFILL_WINDOW_HOURS,
  backfillStaleSettlement,
  type BackfillDb,
} from "./settle-backfill";
import { SETTLEMENT_DEFAULT_GRACE_HOURS } from "../performance/settlement-health";
import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { MultiSourceScoreResult } from "./multi-source-scores";

const NOW = new Date("2026-08-21T18:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function row(overrides: {
  id?: string;
  daysAgo: number;
  sportKey?: string;
  home?: string;
  away?: string;
}): LoadedShape {
  return {
    id: overrides.id ?? "pick-1",
    pickType: "MONEYLINE",
    selection: overrides.home ?? "Navy",
    line: 0,
    clvLockLine: null,
    gameId: `game-${overrides.id ?? "1"}`,
    game: {
      id: `game-${overrides.id ?? "1"}`,
      homeTeamName: overrides.home ?? "Navy",
      awayTeamName: overrides.away ?? "Army",
      commenceTime: daysAgo(overrides.daysAgo),
      sport: { key: overrides.sportKey ?? "americanfootball_ncaaf" },
    },
  };
}

type LoadedShape = Awaited<ReturnType<BackfillDb["pick"]["findMany"]>>[number];

function navyFinal(): NormalizedGame {
  return {
    sourceId: "espn-public-api",
    sport: "ncaaf",
    gameId: "espn-1",
    startTime: daysAgo(5).toISOString(),
    state: "post",
    completed: true,
    statusDetail: "Final",
    venue: null,
    home: { team: "Navy", abbreviation: "NAVY", score: 17 },
    away: { team: "Army", abbreviation: "ARMY", score: 16 },
    attribution: "Scores data via ESPN",
  };
}

function scores(games: NormalizedGame[]): MultiSourceScoreResult {
  return {
    sport: "ncaaf",
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

describe("backfillStaleSettlement", () => {
  it("settles a >3-day PENDING pick through mocked free-source scores", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([navyFinal()]));
    const db: BackfillDb = {
      pick: { findMany: vi.fn(async () => [row({ daysAgo: 5 })]) },
    };

    const result = await backfillStaleSettlement({
      db,
      now: NOW,
      fetchScores,
      persistSettled,
    });

    expect(result.inspected).toBe(1);
    expect(result.settled).toBe(1);
    expect(result.unresolved).toHaveLength(0);
    expect(persistSettled).toHaveBeenCalledWith(
      expect.objectContaining({ pickId: "pick-1", result: "WIN", homeScore: 17, awayScore: 16 }),
    );
    expect(fetchScores).toHaveBeenCalled();
  });

  it("keeps a >14-day unresolvable pick PENDING with an operator flag (no VOID)", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([]));
    const db: BackfillDb = {
      pick: {
        findMany: vi.fn(async () => [row({ id: "old", daysAgo: BACKFILL_UNRESOLVED_GRACE_DAYS + 1 })]),
      },
    };

    const result = await backfillStaleSettlement({
      db,
      now: NOW,
      fetchScores,
      persistSettled,
    });

    expect(result.settled).toBe(0);
    expect(persistSettled).not.toHaveBeenCalled();
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]?.reason).toBe("NO_FINAL");
    expect(result.unresolved[0]?.olderThanGrace).toBe(true);
    expect(result.unresolved[0]?.sourcesTried).toContain("espn-public-api");
  });

  it("the window equals the settlement-health grace, so nothing can be overdue yet outside this lane", () => {
    expect(BACKFILL_WINDOW_HOURS).toBe(SETTLEMENT_DEFAULT_GRACE_HOURS);
  });

  it("does not settle in-window picks (game started under the grace window) even if findMany returns them", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([navyFinal()]));
    const db: BackfillDb = {
      // 2.4h ago: inside the 6h grace, so still the live path's business.
      pick: { findMany: vi.fn(async () => [row({ daysAgo: 0.1 })]) },
    };

    const result = await backfillStaleSettlement({
      db,
      now: NOW,
      fetchScores,
      persistSettled,
    });

    expect(result.skippedInWindow).toBe(1);
    expect(result.inspected).toBe(0);
    expect(result.settled).toBe(0);
    expect(persistSettled).not.toHaveBeenCalled();
    expect(fetchScores).not.toHaveBeenCalled();
  });

  it("reports capReached=false on an exactly-cap backlog and grades all of it", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([navyFinal()]));
    const exactly = Array.from({ length: BACKFILL_CAP }, (_, i) =>
      row({ id: `p${i}`, daysAgo: 5, home: "Navy", away: "Army" }),
    );
    const findMany = vi.fn(async () => exactly);
    const db: BackfillDb = { pick: { findMany } };

    const result = await backfillStaleSettlement({
      db,
      now: NOW,
      cap: BACKFILL_CAP,
      fetchScores,
      persistSettled,
    });

    // We fetch cap + 1 so "rows exist beyond the cap" is decidable.
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: BACKFILL_CAP + 1 }));
    expect(result.inspected).toBe(BACKFILL_CAP);
    // Exactly cap rows: nothing was left unexamined.
    expect(result.capReached).toBe(false);
    expect(result.cap).toBe(BACKFILL_CAP);
  });

  it("reports capReached=true when at least cap+1 stale rows exist", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([navyFinal()]));
    const over = Array.from({ length: BACKFILL_CAP + 1 }, (_, i) =>
      row({ id: `p${i}`, daysAgo: 5, home: "Navy", away: "Army" }),
    );
    const findMany = vi.fn(async () => over);
    const db: BackfillDb = { pick: { findMany } };

    const result = await backfillStaleSettlement({
      db,
      now: NOW,
      cap: BACKFILL_CAP,
      fetchScores,
      persistSettled,
    });

    expect(result.inspected).toBe(BACKFILL_CAP);
    // cap+1 rows exist: rows behind the oldest `cap` were not looked at this
    // run; the flag tells the operator the head of the backlog is saturated.
    expect(result.capReached).toBe(true);
  });

  it("grades a 1-day-old pick: the 6h-to-3d band is no longer skipped", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([{ ...navyFinal(), startTime: daysAgo(1).toISOString() }]));
    const db: BackfillDb = {
      pick: { findMany: vi.fn(async () => [row({ daysAgo: 1 })]) },
    };
    const result = await backfillStaleSettlement({ db, now: NOW, fetchScores, persistSettled });
    expect(result.skippedInWindow).toBe(0);
    expect(result.inspected).toBe(1);
    expect(result.settled).toBe(1);
  });

  it("records a HELD pick in unresolved with its reason instead of dropping it", async () => {
    const persistSettled = vi.fn(async () => true);
    // Two completed finals, same two teams, same start time, different scores:
    // a doubleheader the matcher cannot tell apart → AMBIGUOUS_MATCH hold.
    const g1 = navyFinal();
    const g2: NormalizedGame = { ...navyFinal(), gameId: "espn-2", home: { team: "Navy", abbreviation: "NAVY", score: 3 }, away: { team: "Army", abbreviation: "ARMY", score: 20 } };
    const fetchScores = vi.fn(async () => scores([g1, g2]));
    const db: BackfillDb = {
      pick: { findMany: vi.fn(async () => [row({ daysAgo: 5 })]) },
    };
    const result = await backfillStaleSettlement({ db, now: NOW, fetchScores, persistSettled });
    expect(result.held).toBe(1);
    expect(result.settled).toBe(0);
    expect(persistSettled).not.toHaveBeenCalled();
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]).toMatchObject({ pickId: "pick-1", reason: "AMBIGUOUS_MATCH", olderThanGrace: false });
  });

  it("queries only PENDING published picks older than the grace window", async () => {
    const findMany = vi.fn(async () => []);
    await backfillStaleSettlement({
      db: { pick: { findMany } },
      now: NOW,
      fetchScores: vi.fn(async () => scores([])),
      persistSettled: vi.fn(async () => true),
    });
    const args = findMany.mock.calls[0]?.[0] as {
      where: { result: string; game: { commenceTime: { lt: Date } } };
    };
    expect(args.where.result).toBe("PENDING");
    const cutoff = args.where.game.commenceTime.lt;
    const deltaHours = (NOW.getTime() - cutoff.getTime()) / (60 * 60 * 1000);
    expect(deltaHours).toBeCloseTo(BACKFILL_WINDOW_HOURS, 8);
  });

  it("scopes the query to one sport when sportKey is given, and to every sport otherwise", async () => {
    // A `?sport=` settle cycle must not count another sport's backfill as its
    // own work (starvation decision + picksSettled), so the scope reaches the
    // query itself rather than being filtered after the fact.
    const findMany = vi.fn(async () => []);
    const base = {
      db: { pick: { findMany } },
      now: NOW,
      fetchScores: vi.fn(async () => scores([])),
      persistSettled: vi.fn(async () => true),
    };
    await backfillStaleSettlement({ ...base, sportKey: "americanfootball_nfl" });
    await backfillStaleSettlement({ ...base, sportKey: null });
    await backfillStaleSettlement(base);
    const whereOf = (i: number) =>
      (findMany.mock.calls[i]?.[0] as { where: { game: Record<string, unknown> } }).where.game;
    expect(whereOf(0)).toMatchObject({ sport: { key: "americanfootball_nfl" } });
    expect(whereOf(1)).not.toHaveProperty("sport");
    expect(whereOf(2)).not.toHaveProperty("sport");
  });

  /**
   * A db whose game row is real enough to evaluate the guard predicate the
   * persister now writes, so these tests exercise the rule itself rather than
   * a stub's return value. Prisma rolls the transaction back when the callback
   * throws; the fake cannot undo its own writes, so what it proves is that the
   * persister THROWS instead of returning, which is what triggers that
   * rollback, and that the lane refuses to count the pick as settled.
   */
  function mismatchDb(game: { status: string; homeScore: number | null; awayScore: number | null }): {
    db: BackfillDb;
    game: typeof game;
    pickUpdates: number;
    events: number;
  } {
    const state = { game, pickUpdates: 0, events: 0 };
    const db: BackfillDb = {
      pick: { findMany: vi.fn(async () => [row({ daysAgo: 5 })]) },
      $transaction: vi.fn(async (fn) =>
        fn({
          pick: {
            updateMany: vi.fn(async () => {
              state.pickUpdates += 1;
              return { count: 1 };
            }),
          },
          pickSettlementEvent: {
            create: vi.fn(async () => {
              state.events += 1;
            }),
          },
          postSettlementWork: { createMany: vi.fn(async () => ({ count: 0 })) },
          game: {
            updateMany: vi.fn(async (args: unknown) => {
              const where = (args as { where: { OR: Array<Record<string, unknown>> } }).where;
              const data = (args as { data: { homeScore: number; awayScore: number; status: string } }).data;
              const g = state.game;
              const allowed = where.OR.some((clause) => {
                if ("status" in clause) return g.status !== "FINAL";
                if ("homeScore" in clause && clause["homeScore"] === null) return g.homeScore === null;
                if ("awayScore" in clause && clause["awayScore"] === null) return g.awayScore === null;
                return g.homeScore === clause["homeScore"] && g.awayScore === clause["awayScore"];
              });
              if (!allowed) return { count: 0 };
              state.game = { status: data.status, homeScore: data.homeScore, awayScore: data.awayScore };
              return { count: 1 };
            }),
            findUnique: vi.fn(async () => ({
              homeScore: state.game.homeScore,
              awayScore: state.game.awayScore,
            })),
          },
        }),
      ),
    };
    return {
      db,
      get game() {
        return state.game;
      },
      get pickUpdates() {
        return state.pickUpdates;
      },
      get events() {
        return state.events;
      },
    };
  }

  it("rolls the whole settlement back when the game already carries a different FINAL, rather than grading the pick against a score its own game row contradicts", async () => {
    // The persister used to refuse only the SCORE write and let the pick
    // settlement it had already made stand, with the comment "the pick
    // settlement already happened above". That commits a grade computed from
    // the incoming score onto a row that keeps a different one, and records
    // nothing anywhere. The grade rests on the same contested number as the
    // score, so both go or neither does.
    const fake = mismatchDb({ status: "FINAL", homeScore: 24, awayScore: 17 });
    const fetchScores = vi.fn(async () => scores([navyFinal()]));

    const result = await backfillStaleSettlement({ db: fake.db, now: NOW, fetchScores });

    // The recorded final is untouched: 21-17 (the incoming pair) never lands.
    expect(fake.game).toEqual({ status: "FINAL", homeScore: 24, awayScore: 17 });
    // And the pick is NOT counted settled. It is recorded, not dropped: the
    // zero-sit lane takes it from here under SCORE_MISMATCH_CROSS_PATH.
    expect(result.settled).toBe(0);
    expect(result.held).toBe(1);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]!.reason).toBe("SCORE_MISMATCH");
    expect(result.unresolved[0]!.pickId).toBe("pick-1");
  });

  it("settles normally when the game carries no recorded final", async () => {
    const fake = mismatchDb({ status: "SCHEDULED", homeScore: null, awayScore: null });
    const fetchScores = vi.fn(async () => scores([navyFinal()]));

    const result = await backfillStaleSettlement({ db: fake.db, now: NOW, fetchScores });

    expect(result.settled).toBe(1);
    expect(result.unresolved).toHaveLength(0);
    expect(fake.game).toEqual({ status: "FINAL", homeScore: 17, awayScore: 16 });
    expect(fake.events).toBe(1);
  });

  it("is idempotent: a re-run against the same recorded final settles instead of rolling back", async () => {
    // The guard must separate "a DIFFERENT final is recorded" from "this exact
    // final is already recorded". Only the first is a conflict.
    const fake = mismatchDb({ status: "FINAL", homeScore: 17, awayScore: 16 });
    const fetchScores = vi.fn(async () => scores([navyFinal()]));

    const result = await backfillStaleSettlement({ db: fake.db, now: NOW, fetchScores });

    expect(result.settled).toBe(1);
    expect(result.unresolved).toHaveLength(0);
    expect(fake.game).toEqual({ status: "FINAL", homeScore: 17, awayScore: 16 });
  });
});
