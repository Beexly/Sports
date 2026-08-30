import { describe, expect, it, vi } from "vitest";
import {
  BACKFILL_CAP,
  BACKFILL_UNRESOLVED_GRACE_DAYS,
  PAID_SCORES_WINDOW_DAYS,
  backfillStaleSettlement,
  type BackfillDb,
} from "./settle-backfill";
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

  it("does not settle in-window picks even if findMany returns them", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([navyFinal()]));
    const db: BackfillDb = {
      pick: { findMany: vi.fn(async () => [row({ daysAgo: 1 })]) },
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

  it("respects the per-run cap", async () => {
    const persistSettled = vi.fn(async () => true);
    const fetchScores = vi.fn(async () => scores([navyFinal()]));
    const many = Array.from({ length: BACKFILL_CAP + 10 }, (_, i) =>
      row({ id: `p${i}`, daysAgo: 5, home: "Navy", away: "Army" }),
    );
    const findMany = vi.fn(async () => many);
    const db: BackfillDb = { pick: { findMany } };

    const result = await backfillStaleSettlement({
      db,
      now: NOW,
      cap: BACKFILL_CAP,
      fetchScores,
      persistSettled,
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: BACKFILL_CAP }));
    expect(result.inspected).toBe(BACKFILL_CAP);
    expect(result.cap).toBe(BACKFILL_CAP);
    expect(result.windowDays).toBe(PAID_SCORES_WINDOW_DAYS);
  });

  it("queries only PENDING published picks older than the paid window", async () => {
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
    const deltaDays = (NOW.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(deltaDays).toBeCloseTo(PAID_SCORES_WINDOW_DAYS, 8);
  });
});
