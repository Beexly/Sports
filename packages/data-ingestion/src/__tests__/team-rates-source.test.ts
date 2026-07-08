import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Behavioral tests for the team-rate source — the thin DB glue that feeds REAL
 * TeamGameLog scores to the pure Poisson team-rate model.
 *
 * Pins the invariants the module header promises:
 *   - leakage-safety: `before` excludes any log on/after the predicted game
 *     (look-ahead bias would silently inflate backtest results)
 *   - real-scores-only: the query demands non-null scores, and a defensive
 *     filter drops any null row that slips through
 *   - honest-empty: no history → [] / null (model declines; nothing fabricated)
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  aggregate: vi.fn<(args: unknown) => Promise<{ _avg: { teamScore: number | null } }>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    teamGameLog: { findMany: mocks.findMany, aggregate: mocks.aggregate },
  },
}));

import { getTeamScoringRecords, getLeagueAverageScored } from "../team-rates-source";

beforeEach(() => {
  mocks.findMany.mockReset();
  mocks.aggregate.mockReset();
});

describe("getTeamScoringRecords", () => {
  it("queries real completed games only, most-recent first, default window 20", async () => {
    mocks.findMany.mockResolvedValue([]);
    await getTeamScoringRecords("Arsenal", "soccer_epl");

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany.mock.calls[0]?.[0]).toEqual({
      where: {
        teamName: "Arsenal",
        sport: "soccer_epl",
        teamScore: { not: null },
        opponentScore: { not: null },
      },
      orderBy: { gameDate: "desc" },
      take: 20,
      select: { teamScore: true, opponentScore: true, isBootstrap: true },
    });
  });

  it("leakage-safety: `before` adds a strict gameDate < cutoff; omitting it adds no date clause", async () => {
    mocks.findMany.mockResolvedValue([]);
    const cutoff = new Date("2026-07-04T19:00:00Z");
    await getTeamScoringRecords("Arsenal", "soccer_epl", 10, cutoff);

    const withBefore = mocks.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      take: number;
    };
    expect(withBefore.where["gameDate"]).toEqual({ lt: cutoff });
    expect(withBefore.take).toBe(10);

    await getTeamScoringRecords("Arsenal", "soccer_epl");
    const withoutBefore = mocks.findMany.mock.calls[1]?.[0] as { where: Record<string, unknown> };
    expect(withoutBefore.where).not.toHaveProperty("gameDate");
  });

  it("maps rows to TeamScoringRecord and drops any null-score row defensively", async () => {
    mocks.findMany.mockResolvedValue([
      { teamScore: 3, opponentScore: 1, isBootstrap: false },
      { teamScore: null, opponentScore: 2, isBootstrap: false }, // must be dropped
      { teamScore: 0, opponentScore: 0, isBootstrap: true },
    ]);
    const records = await getTeamScoringRecords("Arsenal", "soccer_epl");
    expect(records).toEqual([
      { teamScore: 3, opponentScore: 1, isBootstrap: false },
      { teamScore: 0, opponentScore: 0, isBootstrap: true },
    ]);
  });

  it("honest-empty: no scored history → [] (pure model then returns no opinion)", async () => {
    mocks.findMany.mockResolvedValue([]);
    await expect(getTeamScoringRecords("Newco FC", "soccer_epl")).resolves.toEqual([]);
  });
});

describe("getLeagueAverageScored", () => {
  it("averages real team scores for the sport, honoring the leakage cutoff", async () => {
    mocks.aggregate.mockResolvedValue({ _avg: { teamScore: 2.75 } });
    const cutoff = new Date("2026-07-04T19:00:00Z");
    await expect(getLeagueAverageScored("soccer_epl", cutoff)).resolves.toBe(2.75);

    expect(mocks.aggregate.mock.calls[0]?.[0]).toEqual({
      where: {
        sport: "soccer_epl",
        teamScore: { not: null },
        gameDate: { lt: cutoff },
      },
      _avg: { teamScore: true },
    });
  });

  it("no fabricated anchor: empty history → null, never a made-up league average", async () => {
    mocks.aggregate.mockResolvedValue({ _avg: { teamScore: null } });
    await expect(getLeagueAverageScored("soccer_epl")).resolves.toBeNull();
    const args = mocks.aggregate.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).not.toHaveProperty("gameDate");
  });
});
