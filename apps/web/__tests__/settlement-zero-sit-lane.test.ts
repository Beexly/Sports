import { describe, expect, it } from "vitest";
import {
  ZERO_SIT_ROUTE_TAIL_RESERVE_MS,
  ZERO_SIT_VOID_MIN_AGE_HOURS,
  boardListing,
  decideZeroSitVoid,
  fixtureListedOnBoard,
  runZeroSitLane,
  scoreboardDatesPublishedFirst,
  unpublishStalePendingPicks,
  voidSittingPicks,
  zeroSitDeadline,
  type ZeroSitDb,
  type ZeroSitPickRow,
  type ZeroSitTx,
  type ZeroSitVoidEventPayload,
} from "@/lib/settlement/zero-sit-lane";
import type { SettlementOutcome } from "@/lib/data-sources/free-settlement";
import {
  STALE_PENDING_PICK_MAX_AGE_DAYS,
  staleUnstartedPublishedPendingWhere,
} from "@/lib/board/stale-pick-policy";
import { loadSettlementHealth } from "@/lib/performance/settlement-health";
import type { NormalizedGame } from "@/lib/data-sources/free-adapters/espn-scores";
import type { MultiSourceScoreResult } from "@/lib/data-sources/multi-source-scores";
import type { fetchScoresMultiSource } from "@/lib/data-sources/multi-source-scores";

/**
 * Zero-sit lane (WP-29, C-106). Test fixtures only: every team name, score and
 * time below is a labelled fixture, not product data. Nothing touches the
 * network or a database; the db is an in-memory fake with the lane's
 * structural surface.
 */

const NOW = new Date("2026-09-06T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const hoursAgo = (h: number): Date => new Date(NOW.getTime() - h * HOUR);
const daysFromNow = (d: number): Date => new Date(NOW.getTime() + d * DAY);

type FakeRow = ZeroSitPickRow & { result: string };

function row(overrides: {
  id: string;
  commenceTime: Date;
  home?: string;
  away?: string;
  sportKey?: string;
  isPublished?: boolean;
  result?: string;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  updatedAt?: Date;
  dataFreshnessAt?: Date | null;
  generatedAt?: Date;
  pickType?: string;
  selection?: string;
}): FakeRow {
  const home = overrides.home ?? "Fixture Home Sox";
  const away = overrides.away ?? "Fixture Away Birds";
  return {
    id: overrides.id,
    pickType: overrides.pickType ?? "MONEYLINE",
    selection: overrides.selection ?? `${home} ML (-120)`,
    line: 0,
    clvLockLine: null,
    isPublished: overrides.isPublished ?? true,
    modelVersion: "vTEST",
    generatedAt: overrides.generatedAt ?? hoursAgo(100),
    dataFreshnessAt: overrides.dataFreshnessAt === undefined ? hoursAgo(1) : overrides.dataFreshnessAt,
    gameId: `game-${overrides.id}`,
    result: overrides.result ?? "PENDING",
    game: {
      id: `game-${overrides.id}`,
      homeTeamName: home,
      awayTeamName: away,
      commenceTime: overrides.commenceTime,
      status: overrides.status ?? "SCHEDULED",
      homeScore: overrides.homeScore ?? null,
      awayScore: overrides.awayScore ?? null,
      updatedAt: overrides.updatedAt ?? overrides.commenceTime,
      sport: { key: overrides.sportKey ?? "baseball_mlb" },
    },
  };
}

function boardGame(overrides: {
  id: string;
  home: string;
  away: string;
  startTime: Date;
  homeScore?: number | null;
  awayScore?: number | null;
  completed?: boolean;
  statusDetail?: string;
}): NormalizedGame {
  const completed = overrides.completed ?? true;
  return {
    sourceId: "espn-public-api",
    sport: "mlb",
    gameId: overrides.id,
    startTime: overrides.startTime.toISOString(),
    state: completed ? "post" : "pre",
    completed,
    statusDetail: overrides.statusDetail ?? (completed ? "Final" : "Scheduled"),
    venue: null,
    home: {
      team: overrides.home,
      abbreviation: overrides.home.slice(0, 3).toUpperCase(),
      score: overrides.homeScore ?? null,
    },
    away: {
      team: overrides.away,
      abbreviation: overrides.away.slice(0, 3).toUpperCase(),
      score: overrides.awayScore ?? null,
    },
    attribution: "Scores data via ESPN",
  };
}

type Where = {
  result?: string;
  isPublished?: boolean;
  id?: string | { in: string[] };
  OR?: Array<{ dataFreshnessAt?: { lt?: Date } | null; generatedAt?: { lt?: Date } }>;
  game?: { commenceTime?: { lt?: Date; gt?: Date }; sport?: { key: string } };
};

/** One matcher for every fake pick query so a where fragment means the same thing on both sides of the transaction. */
function matchesWhere(r: FakeRow, where: Where): boolean {
  if (typeof where.id === "string" && r.id !== where.id) return false;
  if (where.id && typeof where.id !== "string" && !where.id.in.includes(r.id)) return false;
  if (where.result !== undefined && r.result !== where.result) return false;
  if (where.isPublished !== undefined && r.isPublished !== where.isPublished) return false;
  const sportKey = where.game?.sport?.key;
  if (sportKey && r.game.sport?.key !== sportKey) return false;
  const lt = where.game?.commenceTime?.lt;
  if (lt && !(r.game.commenceTime < lt)) return false;
  const gt = where.game?.commenceTime?.gt;
  if (gt && !(r.game.commenceTime > gt)) return false;
  const staleCutoff = where.OR?.[0]?.dataFreshnessAt;
  const cutoff = staleCutoff && "lt" in staleCutoff ? staleCutoff.lt : undefined;
  if (cutoff && !isStale(r, cutoff)) return false;
  return true;
}

type Fake = {
  db: ZeroSitDb;
  rows: FakeRow[];
  events: Array<{ pickId: string; result: string; payload: ZeroSitVoidEventPayload; status: string }>;
  memories: Array<Record<string, unknown>>;
  gameUpdates: Array<Record<string, unknown>>;
  workEnqueued: number;
  /** When set, pick.updateMany reports zero rows (simulates a lost race). */
  loseRace: boolean;
  /** When set, pickSettlementEvent.create throws for this pick id (simulates a poison row). */
  failEventFor: string | null;
  /**
   * Runs after tx.pick.updateMany, inside the settlement transaction. Lets a
   * test commit a change to the stored game between the two writes, which is
   * the only window in which the game-cancel bound can refuse on its own.
   */
  afterPickWrite: (() => void) | null;
};

function isStale(r: FakeRow, cutoff: Date): boolean {
  return r.dataFreshnessAt ? r.dataFreshnessAt < cutoff : r.generatedAt < cutoff;
}

function makeFake(rows: FakeRow[]): Fake {
  const fake: Fake = {
    rows,
    events: [],
    memories: [],
    gameUpdates: [],
    workEnqueued: 0,
    loseRace: false,
    failEventFor: null,
    afterPickWrite: null,
    db: {
      pick: {
        findMany: async (args) => {
          const where = args["where"] as Where;
          // Candidates come back as SNAPSHOTS, the way a real query does: the
          // lane holds plain objects, and a later write to the stored row does
          // not reach back into them. Tests that move a game underneath an
          // in-flight candidate depend on this separation.
          return rows.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r, game: { ...r.game } }));
        },
      },
      $transaction: async (fn) => fn(tx),
    },
  };
  const tx: ZeroSitTx = {
    pick: {
      findMany: async (args) => {
        const where = args["where"] as Where;
        return rows.filter((r) => matchesWhere(r, where)).map((r) => ({ id: r.id }));
      },
      updateMany: async (args) => {
        if (fake.loseRace) return { count: 0 };
        const where = args["where"] as Where;
        const data = args["data"] as { result?: string; settledAt?: Date; isPublished?: boolean };
        let count = 0;
        for (const r of rows) {
          if (!matchesWhere(r, where)) continue;
          if (data.result) r.result = data.result;
          if (data.isPublished !== undefined) r.isPublished = data.isPublished;
          count++;
        }
        fake.afterPickWrite?.();
        return { count };
      },
    },
    pickSettlementEvent: {
      create: async (args) => {
        const data = args["data"] as Fake["events"][number];
        if (fake.failEventFor === data.pickId) throw new Error("fixture: unique collision on pickId");
        fake.events.push(data);
      },
    },
    postSettlementWork: {
      createMany: async (args: { data: unknown[] }) => {
        fake.workEnqueued += args.data.length;
        return { count: args.data.length };
      },
    },
    game: {
      updateMany: async (args) => {
        fake.gameUpdates.push(args);
        const where = args["where"] as {
          id: string;
          status?: { in: string[] };
          commenceTime?: { lt?: Date };
        };
        const data = args["data"] as { status: string };
        let count = 0;
        for (const r of rows) {
          if (r.game.id !== where.id) continue;
          if (where.status && !where.status.in.includes(r.game.status)) continue;
          const before = where.commenceTime?.lt;
          if (before && !(r.game.commenceTime < before)) continue;
          r.game.status = data.status;
          count++;
        }
        return { count: count > 0 ? 1 : 0 };
      },
    },
    jarvisMemoryEvent: {
      create: async (args) => {
        fake.memories.push(args["data"] as Record<string, unknown>);
      },
    },
  };
  return fake;
}

type ScoreboardCall = { sport: string; espnDateKeys: readonly string[]; strictEspn: boolean | undefined };

function scoreboard(
  games: readonly NormalizedGame[],
  errors: string[] = [],
  calls?: ScoreboardCall[],
): typeof fetchScoresMultiSource {
  return async (sport, opts): Promise<MultiSourceScoreResult> => {
    calls?.push({ sport, espnDateKeys: opts?.espnDateKeys ?? [], strictEspn: opts?.strictEspn });
    return {
      sport,
      primary: "espn-public-api",
      used: games.length > 0 ? "espn-public-api" : null,
      attempted: ["espn-public-api"],
      games,
      failover: false,
      errors,
      oddsApiRequired: false,
      datesRequested: [...(opts?.espnDateKeys ?? [])],
    };
  };
}

const SOX = "Fixture Home Sox";
const BIRDS = "Fixture Away Birds";

describe("zero-sit lane: VOID half", () => {
  it("voids a 25h NO_FINAL pick whose fixture is on the board with OVERDUE_NO_SCORE and an outbox event carrying the RCA code", async () => {
    const kickoff = hoursAgo(25);
    const fake = makeFake([row({ id: "p-nofinal", commenceTime: kickoff })]);
    // The fixture is listed (still not completed 25h later), so it is not FIXTURE_NOT_FOUND.
    const board = [boardGame({ id: "e1", home: SOX, away: BIRDS, startTime: kickoff, completed: false })];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });

    expect(res.inspected).toBe(1);
    expect(res.voided).toBe(1);
    expect(res.byCode.OVERDUE_NO_SCORE).toBe(1);
    expect(fake.rows[0]!.result).toBe("VOID");
    expect(fake.events).toHaveLength(1);
    const ev = fake.events[0]!;
    expect(ev.pickId).toBe("p-nofinal");
    expect(ev.result).toBe("VOID");
    expect(ev.status).toBe("PENDING");
    expect(ev.payload.kind).toBe("ZERO_SIT_VOID");
    expect(ev.payload.rcaCode).toBe("OVERDUE_NO_SCORE");
    expect(ev.payload.settledAt).toBe(NOW.toISOString());
    expect(ev.payload.actor).toMatch(/zero-sit/);
    expect(fake.workEnqueued).toBe(2);
    expect(fake.gameUpdates).toHaveLength(0);
  });

  it("leaves a 23h pick untouched (below the minimum age)", async () => {
    const fake = makeFake([row({ id: "p-23h", commenceTime: hoursAgo(23) })]);
    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard([]) });
    expect(res.inspected).toBe(0);
    expect(res.voided).toBe(0);
    expect(fake.rows[0]!.result).toBe("PENDING");
    expect(fake.events).toHaveLength(0);

    // The pure decision refuses too, even if such a row were handed to it.
    const decision = decideZeroSitVoid({
      row: fake.rows[0]!,
      outcome: { pickId: "p-23h", status: "PENDING", reason: "NO_FINAL" },
      board: [],
      now: NOW,
    });
    expect(decision).toEqual({ kind: "skip", reason: "UNDER_MIN_AGE" });
    expect(ZERO_SIT_VOID_MIN_AGE_HOURS).toBe(24);
  });

  it("voids a SCORE_MISMATCH_CROSS_PATH aged from kickoff whatever game.updatedAt reads; under 24h past kickoff it skips as MISMATCH_UNDER_24H", async () => {
    // game.updatedAt is a Prisma @updatedAt column bumped every cycle (enrichGameContext
    // writes FINAL rows too), so a row refreshed one minute ago must still void.
    const old = row({
      id: "p-old-mismatch",
      commenceTime: hoursAgo(30),
      status: "FINAL",
      homeScore: 3,
      awayScore: 1,
      updatedAt: new Date(NOW.getTime() - 60 * 1000),
    });
    const young = row({
      id: "p-young-mismatch",
      commenceTime: hoursAgo(20),
      status: "FINAL",
      homeScore: 3,
      awayScore: 1,
      updatedAt: hoursAgo(19),
    });
    const fake = makeFake([old, young]);
    // The free board says 3-4 for the fixture: every grader refuses to write.
    const board = [boardGame({ id: "e1", home: SOX, away: BIRDS, startTime: old.game.commenceTime, homeScore: 3, awayScore: 4 })];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });

    expect(res.inspected).toBe(1); // the 20h row is under the floor and never selected
    expect(res.voided).toBe(1);
    expect(res.byCode.SCORE_MISMATCH_CROSS_PATH).toBe(1);
    expect(old.result).toBe("VOID");
    expect(young.result).toBe("PENDING");
    expect(fake.events).toHaveLength(1);
    expect(fake.events[0]!.payload.rcaCode).toBe("SCORE_MISMATCH_CROSS_PATH");
    expect(fake.events[0]!.payload.evidence).toMatchObject({
      recorded: { homeScore: 3, awayScore: 1 },
      incoming: { homeScore: 3, awayScore: 4 },
      agedFrom: "commenceTime",
      ageHours: 30,
    });

    // The pure decision on the same conflicting final: 20h past kickoff keeps the
    // mismatch-specific skip; 30h past kickoff voids regardless of updatedAt.
    const conflicting = (pickId: string): SettlementOutcome => ({
      pickId,
      status: "SETTLED",
      result: "LOSS",
      confirmation: "SINGLE_SOURCE",
      homeScore: 3,
      awayScore: 4,
      sources: ["espn-public-api"],
    });
    expect(decideZeroSitVoid({ row: young, outcome: conflicting(young.id), board, now: NOW })).toEqual({
      kind: "skip",
      reason: "MISMATCH_UNDER_24H",
    });
    expect(decideZeroSitVoid({ row: old, outcome: conflicting(old.id), board, now: NOW })).toMatchObject({
      kind: "void",
      rcaCode: "SCORE_MISMATCH_CROSS_PATH",
    });
  });

  it("voids a FIXTURE_NOT_FOUND pick on a POSTPONED row but leaves the row POSTPONED: the predicate names only SCHEDULED and LIVE, never POSTPONED, FINAL or CANCELED", async () => {
    // A postponed contest may be rescheduled outside the original date window;
    // the original board no longer listing it is not positive evidence of
    // cancellation, so the row keeps its status while the pick is voided.
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-postponed", commenceTime: kickoff, status: "POSTPONED", home: "Phantom Rebels", away: "Phantom Cardinals" }),
    ]);

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard([]) });

    expect(res.voided).toBe(1);
    expect(res.byCode.FIXTURE_NOT_FOUND).toBe(1);
    expect(res.gamesCanceled).toBe(0);
    expect(fake.rows[0]!.result).toBe("VOID");
    expect(fake.rows[0]!.game.status).toBe("POSTPONED");
    expect(fake.events[0]!.payload.rcaCode).toBe("FIXTURE_NOT_FOUND");
    expect(fake.gameUpdates).toHaveLength(1);
    const where = (fake.gameUpdates[0] as { where: { id: string; status: { in: string[] } } }).where;
    expect(where.id).toBe("game-p-postponed");
    expect(where.status.in).toEqual(["SCHEDULED", "LIVE"]);
    expect(where.status.in).not.toContain("POSTPONED");
    expect(where.status.in).not.toContain("FINAL");
    expect(where.status.in).not.toContain("CANCELED");
  });

  it("refuses the VOID when the game is rescheduled into the future between the candidate read and the write, and leaves the pick PENDING", async () => {
    // EVERY void this lane issues is gated on the game having commenced more
    // than ZERO_SIT_VOID_MIN_AGE_HOURS ago, and that age is measured on the
    // commenceTime captured when the candidates were loaded. The scoreboard
    // fetch sits between that read and the write, so a schedule correction can
    // land in a window that is seconds to minutes wide. Without the kickoff
    // bound in the WRITE, the pick is VOIDed permanently on an age that no
    // longer holds; with it, the statement matches nothing and the pick stays
    // PENDING for the next cycle.
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-moved", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" }),
    ]);
    const rescheduleDuringFetch: typeof fetchScoresMultiSource = async (sport, opts) => {
      // The reschedule commits while the lane is out on the network. The
      // candidate the lane holds still carries the original kickoff.
      fake.rows[0]!.game.commenceTime = daysFromNow(2);
      return scoreboard([])(sport, opts);
    };

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: rescheduleDuringFetch });

    expect(res.voided).toBe(0);
    expect(res.skippedByReason.WRITE_RACE_LOST).toBe(1);
    expect(fake.rows[0]!.result).toBe("PENDING");
    expect(fake.events).toHaveLength(0);
    expect(fake.rows[0]!.game.status).toBe("SCHEDULED");
  });

  it("refuses the game CANCELED write when the reschedule lands between the two writes inside the transaction", async () => {
    // The pick statement locks the PICK row, not the game, so a reschedule can
    // still commit between the two writes of one transaction. The pick is
    // voided here (its own bound still held), but the game must not be marked
    // CANCELED once it is scheduled in the future.
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-cancel-race", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" }),
    ]);
    fake.afterPickWrite = (): void => {
      fake.rows[0]!.game.commenceTime = daysFromNow(2);
    };

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard([]) });

    expect(res.voided).toBe(1);
    expect(res.byCode.FIXTURE_NOT_FOUND).toBe(1);
    expect(res.gamesCanceled).toBe(0);
    expect(fake.rows[0]!.game.status).toBe("SCHEDULED");
    const where = (fake.gameUpdates[0] as { where: { commenceTime?: { lt?: Date } } }).where;
    expect(where.commenceTime?.lt).toBeInstanceOf(Date);
  });

  it("voids FIXTURE_NOT_FOUND only when the board fetch succeeded and lists neither team, and marks the game CANCELED", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([row({ id: "p-phantom", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" })]);
    const board = [
      boardGame({ id: "e-other", home: "Other Mariners", away: "Other Rangers", startTime: kickoff, homeScore: 2, awayScore: 5 }),
    ];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });

    expect(res.voided).toBe(1);
    expect(res.byCode.FIXTURE_NOT_FOUND).toBe(1);
    expect(res.gamesCanceled).toBe(1);
    expect(fake.rows[0]!.result).toBe("VOID");
    expect(fake.rows[0]!.game.status).toBe("CANCELED");
    expect(fake.gameUpdates[0]).toMatchObject({
      where: { id: "game-p-phantom", status: { in: ["SCHEDULED", "LIVE"] } },
      data: { status: "CANCELED" },
    });
    expect(fake.events[0]!.payload.rcaCode).toBe("FIXTURE_NOT_FOUND");
  });

  it("a scoreboard fetch failure (ESPN error or throw) leaves every pick PENDING and writes nothing", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([row({ id: "p-phantom", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" })]);

    const withError = await voidSittingPicks({
      db: fake.db,
      now: NOW,
      fetchScores: scoreboard([], ["espn 20260905: HTTP 500"]),
    });
    expect(withError.voided).toBe(0);
    expect(withError.skippedByReason.SCOREBOARD_FETCH_FAILED).toBe(1);
    expect(withError.scoreboardFailures).toEqual([{ sportKey: "baseball_mlb", errors: ["espn 20260905: HTTP 500"] }]);

    const thrown = await voidSittingPicks({
      db: fake.db,
      now: NOW,
      fetchScores: async () => {
        throw new Error("network down");
      },
    });
    expect(thrown.voided).toBe(0);
    expect(thrown.skippedByReason.SCOREBOARD_FETCH_FAILED).toBe(1);

    expect(fake.rows[0]!.result).toBe("PENDING");
    expect(fake.rows[0]!.game.status).toBe("SCHEDULED");
    expect(fake.events).toHaveLength(0);
    expect(fake.gameUpdates).toHaveLength(0);
  });

  it("asks for a strict ESPN board and treats a lost division group (FBS 503, FCS healthy) as a fetch failure: nothing voided, nothing canceled", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-fbs", commenceTime: kickoff, sportKey: "americanfootball_ncaaf", home: "Phantom Rebels", away: "Phantom Cardinals" }),
    ]);
    const calls: ScoreboardCall[] = [];
    // The FCS-only board that fetchEspnScoreboard would have returned silently
    // before strictEspn; with it, the date surfaces as an espn error.
    const fcsOnly = [boardGame({ id: "e-fcs", home: "Other Bison", away: "Other Jackrabbits", startTime: kickoff, homeScore: 21, awayScore: 14 })];
    const res = await voidSittingPicks({
      db: fake.db,
      now: NOW,
      fetchScores: scoreboard(fcsOnly, ["espn 20260905: ESPN scoreboard ncaaf groups=80 HTTP 503"], calls),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.strictEspn).toBe(true);
    expect(res.voided).toBe(0);
    expect(res.gamesCanceled).toBe(0);
    expect(res.skippedByReason.SCOREBOARD_FETCH_FAILED).toBe(1);
    expect(res.scoreboardFailures).toEqual([
      { sportKey: "americanfootball_ncaaf", errors: ["espn 20260905: ESPN scoreboard ncaaf groups=80 HTTP 503"] },
    ]);
    expect(fake.rows[0]!.result).toBe("PENDING");
    expect(fake.rows[0]!.game.status).toBe("SCHEDULED");
    expect(fake.events).toHaveLength(0);
    expect(fake.gameUpdates).toHaveLength(0);
  });

  it("FIXTURE_NOT_FOUND when one team played another opponent: voided with per-team evidence, game row NOT canceled", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([row({ id: "p-onesided", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" })]);
    const board = [boardGame({ id: "e1", home: "Phantom Rebels", away: "Other Wildcats", startTime: kickoff, homeScore: 31, awayScore: 10 })];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });

    expect(res.voided).toBe(1);
    expect(res.byCode.FIXTURE_NOT_FOUND).toBe(1);
    expect(res.gamesCanceled).toBe(0);
    expect(fake.gameUpdates).toHaveLength(0);
    expect(fake.rows[0]!.game.status).toBe("SCHEDULED");
    expect(fake.events[0]!.payload.rcaCode).toBe("FIXTURE_NOT_FOUND");
    expect(fake.events[0]!.payload.evidence).toMatchObject({ fixtureListed: false, homeListed: true, awayListed: false });
    expect(fake.events[0]!.payload.reason).toMatch(/another opponent/);
  });

  it("skips RESCHEDULED_PENDING when the listed fixture was moved to a start still inside the minimum age", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([row({ id: "p-rainout", commenceTime: kickoff })]);
    // ESPN lists the same fixture, not completed, now starting 6h ago (moved to the next evening).
    const board = [boardGame({ id: "e1", home: SOX, away: BIRDS, startTime: hoursAgo(6), completed: false })];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });

    expect(res.voided).toBe(0);
    expect(res.skippedByReason.RESCHEDULED_PENDING).toBe(1);
    expect(fake.rows[0]!.result).toBe("PENDING");
    expect(fake.events).toHaveLength(0);
  });

  it("a game row already FINAL that the free board cannot tie to the stored names is OVERDUE_NO_SCORE with the recorded final, never FIXTURE_NOT_FOUND", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-cityfinal", commenceTime: kickoff, home: "Nowhere City", away: "Elsewhere Town", status: "FINAL", homeScore: 4, awayScore: 2, updatedAt: hoursAgo(28) }),
    ]);
    const board = [boardGame({ id: "e1", home: "Other Mariners", away: "Other Rangers", startTime: kickoff, homeScore: 2, awayScore: 5 })];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });

    expect(res.voided).toBe(1);
    expect(res.byCode.OVERDUE_NO_SCORE).toBe(1);
    expect(res.byCode.FIXTURE_NOT_FOUND).toBe(0);
    expect(res.gamesCanceled).toBe(0);
    expect(fake.rows[0]!.game.status).toBe("FINAL");
    expect(fake.events[0]!.payload.evidence).toMatchObject({
      fixtureListed: false,
      recorded: { homeScore: 4, awayScore: 2, recordedAt: hoursAgo(28).toISOString() },
      matcherReason: "NO_FINAL",
    });
  });

  it("isolates a write failure to its pick (WRITE_FAILED) and keeps voiding the rest", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-poison", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" }),
      row({ id: "p-healthy", commenceTime: kickoff, home: "Phantom Bears", away: "Phantom Lions" }),
    ]);
    fake.failEventFor = "p-poison";

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard([]) });

    expect(res.inspected).toBe(2);
    expect(res.voided).toBe(1);
    expect(res.skippedByReason.WRITE_FAILED).toBe(1);
    expect(res.skipped).toEqual([{ pickId: "p-poison", sportKey: "baseball_mlb", reason: "WRITE_FAILED" }]);
    expect(fake.events.map((e) => e.pickId)).toEqual(["p-healthy"]);
    expect(fake.rows[1]!.result).toBe("VOID");
  });

  it("budgets scoreboard dates published rows first so an unpublished tail cannot starve the acceptance cohort", async () => {
    const publishedKickoff = hoursAgo(30);
    const unpublishedKickoff = hoursAgo(30 + 72);
    const fake = makeFake([
      row({ id: "p-old-hidden", commenceTime: unpublishedKickoff, isPublished: false, home: "Phantom Rebels", away: "Phantom Cardinals" }),
      row({ id: "p-published", commenceTime: publishedKickoff, home: "Phantom Bears", away: "Phantom Lions" }),
    ]);
    const calls: ScoreboardCall[] = [];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, scoreboardMaxDays: 1, fetchScores: scoreboard([], [], calls) });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.espnDateKeys).toHaveLength(1);
    expect(res.voids.map((v) => v.pickId)).toEqual(["p-published"]);
    expect(res.skippedByReason.DATE_NOT_FETCHED).toBe(1);
    expect(fake.rows[0]!.result).toBe("PENDING");
    expect(fake.rows[1]!.result).toBe("VOID");

    // The pure helper: oldest-first would have picked the unpublished day; published wins the budget.
    const keys = scoreboardDatesPublishedFirst(fake.rows, { now: NOW, maxDays: 1 });
    expect(keys.espnKeys).toEqual(calls[0]!.espnDateKeys);
    const both = scoreboardDatesPublishedFirst(fake.rows, { now: NOW, maxDays: 21 });
    expect(both.espnKeys).toHaveLength(2);
    expect(both.espnKeys[0]).toBe(keys.espnKeys[0]);
    expect(both.isoKeys).toEqual(both.espnKeys.map((k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`));
  });

  it("secondary-source errors (unregistered sources refused by clearance) do not block the lane", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([row({ id: "p-phantom", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" })]);
    const res = await voidSittingPicks({
      db: fake.db,
      now: NOW,
      fetchScores: scoreboard([], ["mlb-statsapi: clearance-denied [SOURCE_NOT_REGISTERED]"]),
    });
    expect(res.voided).toBe(1);
    expect(res.byCode.FIXTURE_NOT_FOUND).toBe(1);
  });

  it("voids AMBIGUOUS_TEAM_NAME when the free matcher holds a city-only row that names two teams on the board", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([row({ id: "p-city", commenceTime: kickoff, home: "New York", away: "Tampa Bay", selection: "Tampa Bay ML (+110)" })]);
    const board = [
      boardGame({ id: "e1", home: "New York Yankees", away: "Tampa Bay Rays", startTime: kickoff, homeScore: 3, awayScore: 1 }),
      boardGame({ id: "e2", home: "New York Mets", away: "Miami Marlins", startTime: kickoff, homeScore: 2, awayScore: 6 }),
    ];

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });

    expect(res.voided).toBe(1);
    expect(res.byCode.AMBIGUOUS_TEAM_NAME).toBe(1);
    expect(fake.events[0]!.payload.rcaCode).toBe("AMBIGUOUS_TEAM_NAME");
    expect(fake.events[0]!.payload.evidence).toMatchObject({
      homeTeamName: "New York",
      awayTeamName: "Tampa Bay",
      matcherHold: "AMBIGUOUS_MATCH",
      cause: "CITY_ONLY_NAME",
    });

    // The same hold with candidate sources is the doubleheader case (names fine, timing ambiguous).
    const decision = decideZeroSitVoid({
      row: fake.rows[0]!,
      outcome: { pickId: "p-city", status: "HELD", reason: "AMBIGUOUS_MATCH", sources: ["espn-public-api", "espn-public-api"] },
      board: [],
      now: NOW,
    });
    expect(decision.kind).toBe("void");
    if (decision.kind === "void") {
      expect(decision.rcaCode).toBe("AMBIGUOUS_TEAM_NAME");
      expect(decision.evidence).toMatchObject({ cause: "MULTIPLE_FINALS" });
    }
  });

  it("never voids a pick with a usable, consistent final (the graders own it)", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([row({ id: "p-gradable", commenceTime: kickoff })]);
    const board = [boardGame({ id: "e1", home: SOX, away: BIRDS, startTime: kickoff, homeScore: 5, awayScore: 2 })];
    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard(board) });
    expect(res.voided).toBe(0);
    expect(res.skippedByReason.GRADABLE).toBe(1);
    expect(fake.rows[0]!.result).toBe("PENDING");
    expect(fake.events).toHaveLength(0);
  });

  it("is idempotent: non-PENDING picks are never loaded and a lost write race appends no event", async () => {
    const kickoff = hoursAgo(30);
    const alreadyVoid = row({ id: "p-done", commenceTime: kickoff, result: "VOID", home: "Phantom Rebels", away: "Phantom Cardinals" });
    const racing = row({ id: "p-race", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" });
    const fake = makeFake([alreadyVoid, racing]);
    fake.loseRace = true;

    const res = await voidSittingPicks({ db: fake.db, now: NOW, fetchScores: scoreboard([]) });

    expect(res.inspected).toBe(1);
    expect(res.voided).toBe(0);
    expect(res.skippedByReason.WRITE_RACE_LOST).toBe(1);
    expect(fake.events).toHaveLength(0);
  });

  it("honours the ?sport= scope", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-mlb", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" }),
      row({ id: "p-nfl", commenceTime: kickoff, sportKey: "americanfootball_nfl", home: "Phantom Rebels", away: "Phantom Cardinals" }),
    ]);
    const res = await voidSittingPicks({ db: fake.db, now: NOW, sportKey: "americanfootball_nfl", fetchScores: scoreboard([]) });
    expect(res.inspected).toBe(1);
    expect(res.voids.map((v) => v.pickId)).toEqual(["p-nfl"]);
    expect(fake.rows[0]!.result).toBe("PENDING");
  });

  // ── Route deadline ─────────────────────────────────────────────────────────

  /** A clock the tests step: each read returns the next value, the last one repeats. */
  function steppedClock(reads: readonly number[]): { clock: () => number; reads: () => number } {
    let i = 0;
    return {
      clock: () => reads[Math.min(i++, reads.length - 1)]!,
      reads: () => i,
    };
  }

  it("stops before the next scoreboard fetch once the route deadline has passed and reports the remainder", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-mlb", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" }),
      row({ id: "p-nfl", commenceTime: kickoff, sportKey: "americanfootball_nfl", home: "Phantom Rebels", away: "Phantom Cardinals" }),
    ]);
    const calls: ScoreboardCall[] = [];
    // Reads: before the MLB fetch (in budget), before the MLB write (in budget),
    // before the NFL fetch (past the deadline).
    const ticker = steppedClock([1_000, 2_000, 99_000]);

    const res = await voidSittingPicks({
      db: fake.db,
      now: NOW,
      deadlineAtMs: 50_000,
      clock: ticker.clock,
      fetchScores: scoreboard([], [], calls),
    });

    expect(calls).toHaveLength(1); // the NFL board was never fetched
    expect(ticker.reads()).toBe(3);
    expect(res.inspected).toBe(2);
    expect(res.voided).toBe(1);
    expect(res.voids.map((v) => v.pickId)).toEqual(["p-mlb"]);
    expect(res.deadlineHit).toBe(true);
    expect(res.remaining).toBe(1);
    expect(fake.rows[1]!.result).toBe("PENDING");
    expect(fake.events).toHaveLength(1);
  });

  it("stops before a candidate write once the deadline has passed; the row stays PENDING for the next cycle", async () => {
    const kickoff = hoursAgo(30);
    const fake = makeFake([
      row({ id: "p-first", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" }),
      row({ id: "p-second", commenceTime: kickoff, home: "Phantom Bears", away: "Phantom Lions" }),
    ]);
    // Reads: before the one fetch, before the first write (both in budget),
    // before the second write (past the deadline).
    const ticker = steppedClock([1_000, 2_000, 99_000]);

    const res = await voidSittingPicks({ db: fake.db, now: NOW, deadlineAtMs: 50_000, clock: ticker.clock, fetchScores: scoreboard([]) });

    expect(ticker.reads()).toBe(3);
    expect(res.voided).toBe(1);
    expect(res.voids.map((v) => v.pickId)).toEqual(["p-first"]);
    expect(res.deadlineHit).toBe(true);
    expect(res.remaining).toBe(1);
    expect(fake.rows[1]!.result).toBe("PENDING");
    expect(fake.events).toHaveLength(1);
  });

  it("under the deadline the lane behaves exactly as with no deadline: every candidate inspected, nothing remaining", async () => {
    const kickoff = hoursAgo(30);
    const build = (): Fake =>
      makeFake([
        row({ id: "p-mlb", commenceTime: kickoff, home: "Phantom Rebels", away: "Phantom Cardinals" }),
        row({ id: "p-nfl", commenceTime: kickoff, sportKey: "americanfootball_nfl", home: "Phantom Rebels", away: "Phantom Cardinals" }),
      ]);
    const bounded = build();
    const unbounded = build();

    const withDeadline = await voidSittingPicks({
      db: bounded.db,
      now: NOW,
      deadlineAtMs: 1_000_000,
      clock: () => 1_000,
      fetchScores: scoreboard([]),
    });
    const withoutDeadline = await voidSittingPicks({ db: unbounded.db, now: NOW, fetchScores: scoreboard([]) });

    for (const res of [withDeadline, withoutDeadline]) {
      expect(res.inspected).toBe(2);
      expect(res.voided).toBe(2);
      expect(res.deadlineHit).toBe(false);
      expect(res.remaining).toBe(0);
    }
    expect(withDeadline.voids.map((v) => v.pickId)).toEqual(withoutDeadline.voids.map((v) => v.pickId));
    expect(bounded.events).toHaveLength(2);
    expect(unbounded.events).toHaveLength(2);
  });

  it("runZeroSitLane passes the route deadline to the void half", async () => {
    const fake = makeFake([
      row({ id: "p-phantom", commenceTime: hoursAgo(30), home: "Phantom Rebels", away: "Phantom Cardinals" }),
    ]);
    const res = await runZeroSitLane({ db: fake.db, now: NOW, deadlineAtMs: 10, clock: () => 20, fetchScores: scoreboard([]) });
    expect(res.voids.deadlineHit).toBe(true);
    expect(res.voids.remaining).toBe(1);
    expect(res.voids.voided).toBe(0);
    expect(fake.rows[0]!.result).toBe("PENDING");
  });
});

describe("zero-sit lane: pure helpers", () => {
  it("zeroSitDeadline leaves the tail reserve inside the route's maxDuration", () => {
    expect(ZERO_SIT_ROUTE_TAIL_RESERVE_MS).toBeGreaterThanOrEqual(60_000);
    expect(zeroSitDeadline(1_000, 300)).toBe(1_000 + 300 * 1000 - ZERO_SIT_ROUTE_TAIL_RESERVE_MS);
  });

  it("boardListing is bipartite: the fixture is listed only when one event pairs both teams; per-team flags say who appears at all", () => {
    const kickoff = hoursAgo(30);
    const pick = { homeTeam: SOX, awayTeam: BIRDS, gameDateIso: kickoff.toISOString() };

    // Home team on the board against someone else: home listed, fixture not.
    const oneSided = [boardGame({ id: "e1", home: SOX, away: "Someone Else", startTime: kickoff, completed: false })];
    expect(boardListing(pick, oneSided)).toMatchObject({ fixtureListed: false, homeListed: true, awayListed: false, fixtureEvents: [] });
    expect(fixtureListedOnBoard(pick, oneSided)).toBe(false);

    // Both teams, either orientation, any state.
    const paired = [boardGame({ id: "e2", home: BIRDS, away: SOX, startTime: kickoff, completed: false })];
    const listing = boardListing(pick, paired);
    expect(listing).toMatchObject({ fixtureListed: true, homeListed: true, awayListed: true });
    expect(listing.fixtureEvents.map((e) => e.gameId)).toEqual(["e2"]);
    expect(fixtureListedOnBoard(pick, paired)).toBe(true);

    expect(boardListing({ ...pick, homeTeam: "Nobody Here", awayTeam: "Nobody There" }, paired)).toMatchObject({
      fixtureListed: false,
      homeListed: false,
      awayListed: false,
    });
    // Three days away is a different slate.
    const farBoard = [boardGame({ id: "e3", home: SOX, away: BIRDS, startTime: hoursAgo(30 + 72) })];
    expect(boardListing(pick, farBoard)).toMatchObject({ fixtureListed: false, homeListed: false, awayListed: false });
  });

  it("decideZeroSitVoid skips DISPUTED holds, orientation failures and postponed voids", () => {
    const base = row({ id: "p", commenceTime: hoursAgo(30) });
    expect(
      decideZeroSitVoid({ row: base, outcome: { pickId: "p", status: "HELD", reason: "DISPUTED", sources: ["a", "b"] }, board: [], now: NOW }),
    ).toEqual({ kind: "skip", reason: "DISPUTED_HOLD" });
    expect(
      decideZeroSitVoid({ row: base, outcome: { pickId: "p", status: "PENDING", reason: "ORIENT_FAIL" }, board: [], now: NOW }),
    ).toEqual({ kind: "skip", reason: "ORIENT_FAIL" });
    expect(
      decideZeroSitVoid({
        row: base,
        outcome: {
          pickId: "p",
          status: "SETTLED",
          result: "VOID",
          confirmation: "SINGLE_SOURCE",
          homeScore: null,
          awayScore: null,
          sources: ["espn-public-api"],
          voidReason: "POSTPONED_OR_CANCELLED",
        },
        board: [],
        now: NOW,
      }),
    ).toEqual({ kind: "skip", reason: "GRADABLE" });
  });
});

describe("zero-sit lane: STALE half", () => {
  it("unpublishes a stale published PENDING pick on an unstarted game and records the action", async () => {
    const stale = row({
      id: "p-stale",
      commenceTime: daysFromNow(5),
      dataFreshnessAt: new Date(NOW.getTime() - (STALE_PENDING_PICK_MAX_AGE_DAYS + 6) * DAY),
      generatedAt: new Date(NOW.getTime() - 100 * DAY),
    });
    const fake = makeFake([stale]);

    const res = await unpublishStalePendingPicks({ db: fake.db, now: NOW });

    expect(res.selected).toBe(1);
    expect(res.unpublished).toBe(1);
    expect(res.recorded).toBe(1);
    expect(res.pickIds).toEqual(["p-stale"]);
    expect(stale.isPublished).toBe(false);
    expect(stale.result).toBe("PENDING"); // never voided, never deleted
    expect(fake.memories).toHaveLength(1);
    const memory = fake.memories[0]!;
    expect(memory["source_ref"]).toBe("p-stale");
    expect(memory["scope"]).toBe("settlement.zero-sit");
    expect(memory["metadata"]).toMatchObject({
      action: "UNPUBLISH",
      rcaCode: "STALE_UNSTARTED_PICK",
      pickId: "p-stale",
      gameId: "game-p-stale",
      maxAgeDays: STALE_PENDING_PICK_MAX_AGE_DAYS,
      staleDays: STALE_PENDING_PICK_MAX_AGE_DAYS + 6,
    });
    expect(fake.events).toHaveLength(0); // the outbox is for results only
  });

  it("leaves a fresh unstarted pick, an already-unpublished pick and a started game untouched", async () => {
    const fresh = row({ id: "p-fresh", commenceTime: daysFromNow(5), dataFreshnessAt: hoursAgo(20) });
    const hidden = row({
      id: "p-hidden",
      commenceTime: daysFromNow(5),
      isPublished: false,
      dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY),
    });
    const started = row({ id: "p-started", commenceTime: hoursAgo(2), dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY) });
    const fake = makeFake([fresh, hidden, started]);

    const res = await unpublishStalePendingPicks({ db: fake.db, now: NOW });

    expect(res.selected).toBe(0);
    expect(res.unpublished).toBe(0);
    expect(fresh.isPublished).toBe(true);
    expect(started.isPublished).toBe(true);
    expect(fake.memories).toHaveLength(0);
  });

  it("records only rows still eligible inside the transaction (idempotent under a race)", async () => {
    const stale = row({
      id: "p-stale",
      commenceTime: daysFromNow(5),
      dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY),
    });
    const fake = makeFake([stale]);
    // Someone else unpublished it between the select and the transaction.
    const originalTransaction = fake.db.$transaction;
    fake.db = {
      ...fake.db,
      $transaction: async (fn) => {
        stale.isPublished = false;
        return originalTransaction(fn);
      },
    };
    const res = await unpublishStalePendingPicks({ db: fake.db, now: NOW });
    expect(res.selected).toBe(1);
    expect(res.unpublished).toBe(0);
    expect(res.recorded).toBe(0);
    expect(fake.memories).toHaveLength(0);
  });

  it("leaves a pick the pipeline refreshed between the read and the transaction published, with no event", async () => {
    const stale = row({
      id: "p-stale",
      commenceTime: daysFromNow(5),
      dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY),
    });
    const fake = makeFake([stale]);
    // refresh-odds stamped dataFreshnessAt after our select: the row is fresh again.
    const originalTransaction = fake.db.$transaction;
    fake.db = {
      ...fake.db,
      $transaction: async (fn) => {
        stale.dataFreshnessAt = hoursAgo(1);
        return originalTransaction(fn);
      },
    };
    const res = await unpublishStalePendingPicks({ db: fake.db, now: NOW });
    expect(res.selected).toBe(1);
    expect(res.unpublished).toBe(0);
    expect(res.recorded).toBe(0);
    expect(res.pickIds).toEqual([]);
    expect(stale.isPublished).toBe(true);
    expect(fake.memories).toHaveLength(0);
  });

  it("leaves a pick whose kickoff moved into the past between the read and the transaction untouched", async () => {
    const stale = row({
      id: "p-stale",
      commenceTime: daysFromNow(5),
      dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY),
    });
    const fake = makeFake([stale]);
    // A schedule correction pulled the kickoff to before `now`: no longer unstarted, the void half owns it.
    const originalTransaction = fake.db.$transaction;
    fake.db = {
      ...fake.db,
      $transaction: async (fn) => {
        stale.game.commenceTime = hoursAgo(1);
        return originalTransaction(fn);
      },
    };
    const res = await unpublishStalePendingPicks({ db: fake.db, now: NOW });
    expect(res.unpublished).toBe(0);
    expect(res.recorded).toBe(0);
    expect(stale.isPublished).toBe(true);
    expect(fake.memories).toHaveLength(0);
  });

  it("records events and returns ids only for the rows the bulk update actually changed", async () => {
    const a = row({ id: "p-a", commenceTime: daysFromNow(3), dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY) });
    const b = row({ id: "p-b", commenceTime: daysFromNow(4), dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY) });
    const c = row({ id: "p-c", commenceTime: daysFromNow(5), dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY) });
    const fake = makeFake([a, b, c]);
    // The in-transaction re-select still lists all three; b is refreshed after
    // it returns and before the update runs, so the update's own predicate
    // must skip b and the lane must reconcile the count with the id list.
    const originalTransaction = fake.db.$transaction;
    let reselects = 0;
    fake.db = {
      ...fake.db,
      $transaction: async (fn) =>
        originalTransaction(async (tx) =>
          fn({
            ...tx,
            pick: {
              ...tx.pick,
              findMany: async (args) => {
                const found = await tx.pick.findMany(args);
                reselects++;
                if (reselects === 1) b.dataFreshnessAt = hoursAgo(1);
                return found;
              },
            },
          }),
        ),
    };
    const res = await unpublishStalePendingPicks({ db: fake.db, now: NOW });
    expect(res.selected).toBe(3);
    expect(res.unpublished).toBe(2);
    expect(res.recorded).toBe(2);
    expect(res.pickIds).toEqual(["p-a", "p-c"]);
    expect(a.isPublished).toBe(false);
    expect(b.isPublished).toBe(true);
    expect(c.isPublished).toBe(false);
    expect(fake.memories.map((m) => m["source_ref"])).toEqual(["p-a", "p-c"]);
    expect(reselects).toBe(2); // the eligible re-select plus the still-published reconciliation
  });

  it("runZeroSitLane runs both halves under one clock and scope", async () => {
    const stale = row({ id: "p-stale", commenceTime: daysFromNow(5), dataFreshnessAt: new Date(NOW.getTime() - 30 * DAY) });
    const phantom = row({ id: "p-phantom", commenceTime: hoursAgo(30), home: "Phantom Rebels", away: "Phantom Cardinals" });
    const fake = makeFake([stale, phantom]);
    const res = await runZeroSitLane({ db: fake.db, now: NOW, fetchScores: scoreboard([]) });
    expect(res.lane).toBe("zero-sit");
    expect(res.stale.unpublished).toBe(1);
    expect(res.voids.voided).toBe(1);
    expect(res.voids.byCode.FIXTURE_NOT_FOUND).toBe(1);
  });
});

describe("truth surface exclusions", () => {
  it("the stale selection counts only published PENDING picks on unstarted games past the freshness window", () => {
    const where = staleUnstartedPublishedPendingWhere(NOW);
    const cutoff = new Date(NOW.getTime() - STALE_PENDING_PICK_MAX_AGE_DAYS * DAY);
    expect(where).toEqual({
      isPublished: true,
      result: "PENDING",
      game: { commenceTime: { gt: NOW } },
      OR: [{ dataFreshnessAt: { lt: cutoff } }, { dataFreshnessAt: null, generatedAt: { lt: cutoff } }],
    });
    // An unpublished row (what the lane produces) and a VOID row both fall out of this count.
    expect(where.isPublished).toBe(true);
    expect(where.result).toBe("PENDING");
    expect(staleUnstartedPublishedPendingWhere(NOW, "baseball_mlb").game).toEqual({
      commenceTime: { gt: NOW },
      sport: { key: "baseball_mlb" },
    });
  });

  it("settlement.overduePending counts only published PENDING picks, so VOIDed rows leave the band", async () => {
    const wheres: Record<string, unknown>[] = [];
    await loadSettlementHealth(
      {
        pick: {
          count: async ({ where }) => {
            wheres.push(where);
            return where["result"] === "PENDING" ? 0 : 10;
          },
        },
      },
      { now: NOW, graceHours: 6 },
    );
    const overdue = wheres.find((w) => w["result"] === "PENDING");
    expect(overdue).toBeDefined();
    expect(overdue!["isPublished"]).toBe(true);
    expect(overdue!["result"]).toBe("PENDING");
    expect(overdue!["game"]).toEqual({ commenceTime: { lt: new Date(NOW.getTime() - 6 * HOUR) } });
  });
});
