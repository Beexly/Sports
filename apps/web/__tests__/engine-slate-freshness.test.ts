/**
 * `buildEngineSlate` freshness contract — the defect this pins.
 *
 * MEASURED 2026-09-28 on live Neon: `player_game_stats` held 2026 weeks 1-3
 * (all three re-fetched 90 minutes before the read) while `games` and
 * `team_game_logs` were already scored through 2026-09-27 — a full week ahead.
 *
 * `buildEngineSlate` accepted `week` as a REQUIRED option and then never used
 * it: the stats query filtered on `season` alone. So the report echoed back the
 * week the caller ASKED for, and a projection built from week 3 was described as
 * week 5. Nothing threw, because a projection over stale-but-real data is not a
 * fault any layer can detect — that is what made it worth pinning.
 *
 * The fix reports what the ROWS held (`newestWeek`, `weeksAvailable`, `stale`)
 * alongside what the caller requested (`week`), so the gap is observable instead
 * of inferred from a number that was an input rather than an observation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type StatRow = {
  playerId: string;
  week: number;
  team: string | null;
  opponent: string | null;
  fantasyPointsPpr: number | null;
  receptions: number | null;
  targets: number | null;
};

/** Rows the stubbed playerGameStat.findMany returns for the current test. */
let statRows: StatRow[] = [];

const findMany = vi.fn(async () => statRows);

vi.mock("@sports/db", () => ({
  db: {
    playerGameStat: { findMany: (...a: unknown[]) => findMany(...(a as [])) },
    player: { findMany: async () => [] },
    injury: { findMany: async () => [] },
    depthChartEntry: { findMany: async () => [] },
  },
}));
vi.mock("@/lib/signals/adjustment-layer", () => ({
  computeAdjustments: () => [],
  rollUpByPlayer: () => [],
  parsePosition: (p: string) => p,
}));

const NOW = "2026-09-28T12:00:00.000Z";

function rowsForWeek(week: number, players = 2): StatRow[] {
  return Array.from({ length: players }, (_, i) => ({
    playerId: `p${week}_${i}`,
    week,
    team: "DEN",
    opponent: "KC",
    fantasyPointsPpr: 10 + i,
    receptions: 4,
    targets: 8,
  }));
}

async function load() {
  const mod = await import("@/lib/fantasy/engine-slate");
  return mod.buildEngineSlate;
}

beforeEach(() => {
  statRows = [];
  findMany.mockClear();
});

describe("buildEngineSlate freshness reporting", () => {
  it("reports the requested week unchanged (the input is not the observation)", async () => {
    statRows = rowsForWeek(3);
    const build = await load();
    const r = await build({ season: 2026, week: 5, now: NOW, minGames: 1 });
    expect(r.week).toBe(5);
  });

  it("reports the newest MEASURED week, which may lag the request", async () => {
    // The production shape: data through week 3, caller asks for week 5.
    statRows = [...rowsForWeek(1), ...rowsForWeek(2), ...rowsForWeek(3)];
    const build = await load();
    const r = await build({ season: 2026, week: 5, now: NOW, minGames: 1 });

    expect(r.newestWeek).toBe(3);
    expect(r.weeksAvailable).toBe(3);
    expect(r.stale).toBe(true);
  });

  it("is NOT stale when the data reaches the requested week", async () => {
    statRows = [...rowsForWeek(1), ...rowsForWeek(2), ...rowsForWeek(3)];
    const build = await load();
    const r = await build({ season: 2026, week: 3, now: NOW, minGames: 1 });

    expect(r.newestWeek).toBe(3);
    expect(r.stale).toBe(false);
  });

  it("flags staleness when fewer weeks exist than the projection window wants", async () => {
    // The window is 5 games; with 3 weeks available a player cannot have a full
    // window, so the caller can see the shortfall rather than assume coverage.
    statRows = [...rowsForWeek(1), ...rowsForWeek(2), ...rowsForWeek(3)];
    const build = await load();
    const r = await build({ season: 2026, week: 3, now: NOW, minGames: 1 });

    expect(r.weeksAvailable).toBeLessThan(r.window);
    expect(r.stale).toBe(false); // requested week IS covered
    // The shortfall is still visible as a number, not as an exception.
    expect(r.window).toBeGreaterThan(r.weeksAvailable);
  });

  it("reports zero weeks, not a throw, when no measured data exists", async () => {
    statRows = [];
    const build = await load();
    const r = await build({ season: 2026, week: 5, now: NOW, minGames: 1 });

    expect(r.newestWeek).toBe(0);
    expect(r.weeksAvailable).toBe(0);
    expect(r.stale).toBe(true);
    expect(r.players).toHaveLength(0);
  });

  it("ignores non-finite weeks rather than producing NaN freshness", async () => {
    statRows = [
      { playerId: "a", week: Number.NaN, team: "DEN", opponent: "KC", fantasyPointsPpr: 10, receptions: 4, targets: 8 },
      { playerId: "b", week: 2, team: "DEN", opponent: "KC", fantasyPointsPpr: 11, receptions: 5, targets: 9 },
    ];
    const build = await load();
    const r = await build({ season: 2026, week: 4, now: NOW, minGames: 1 });

    expect(Number.isFinite(r.newestWeek)).toBe(true);
    expect(r.newestWeek).toBe(2);
  });
});
