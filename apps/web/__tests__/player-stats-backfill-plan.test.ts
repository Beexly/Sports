import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The data-derived backfill cursor: the seasons that already hold persisted
 * PlayerGameStat rows ARE the progress record (no new tables, no stored
 * cursor). These tests pin that successive runs advance exactly one season per
 * invocation, newest-first, and terminate at a steady-state current-season
 * refresh — the self-driving path the daily cron relies on.
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(args?: unknown) => Promise<{ season: number }[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: { playerGameStat: { findMany: mocks.findMany } },
}));

import { planPlayerStatsRun, TREND_BACKFILL_SEASONS } from "@/lib/ingestion/player-stats-backfill";
import { NFLVERSE_TREND_PLANS } from "@sports/data-ingestion";

// July 2026 → the labelled current season is 2025 (pre-September).
const NOW = new Date("2026-07-01T12:00:00Z");
const CURRENT = 2025;

describe("planPlayerStatsRun", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValue([]);
  });

  it("sizes the window one season beyond the declared trend minimum", () => {
    expect(TREND_BACKFILL_SEASONS).toBe(NFLVERSE_TREND_PLANS["qb-age-rb-target-share"].minimumSeasons + 1);
    expect(TREND_BACKFILL_SEASONS).toBe(6);
  });

  it("starts the backfill at the newest missing season when nothing is persisted", async () => {
    const plan = await planPlayerStatsRun(NOW);
    expect(plan.mode).toBe("backfill");
    expect(plan.season).toBe(CURRENT);
    expect(plan.targetSeasons).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    expect(plan.missingSeasons).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    expect(plan.backfillComplete).toBe(false);
  });

  it("advances exactly one season per run and terminates at steady-state", async () => {
    const persisted = new Set<number>();
    mocks.findMany.mockImplementation(async () =>
      [...persisted].sort().map((season) => ({ season })),
    );

    const ingested: number[] = [];
    for (let run = 0; run < TREND_BACKFILL_SEASONS; run++) {
      const plan = await planPlayerStatsRun(NOW);
      expect(plan.mode).toBe("backfill");
      expect(persisted.has(plan.season)).toBe(false); // never re-picks a done season
      ingested.push(plan.season);
      persisted.add(plan.season); // simulate the run persisting that season
    }

    // Newest-first walk: current season lands on day one, then history.
    expect(ingested).toEqual([2025, 2024, 2023, 2022, 2021, 2020]);

    // Window full → steady-state refresh of the current season, forever after.
    const steady = await planPlayerStatsRun(NOW);
    expect(steady.mode).toBe("steady-state");
    expect(steady.season).toBe(CURRENT);
    expect(steady.backfillComplete).toBe(true);
    expect(steady.missingSeasons).toEqual([]);
  });

  it("re-anchors onto the labelled season at the September rollover so the new season is ingested", async () => {
    // The cursor follows ingestionTargetNflSeason() (the labelled season), not
    // the completed-REG display floor: September 2026 must make 2026 show up
    // as the newest missing season, or the crons keep re-ingesting 2025 for
    // the whole 2026 season (observed in production 2026-09-02). The days
    // before nflverse publishes week 1 are covered by the route's
    // rollover-starvation guard, not by refusing to target the season.
    mocks.findMany.mockResolvedValue(
      [2021, 2022, 2023, 2024, 2025].map((season) => ({ season })),
    );
    const plan = await planPlayerStatsRun(new Date("2026-09-15T12:00:00Z"));
    expect(plan.mode).toBe("backfill");
    expect(plan.season).toBe(2026);
    expect(plan.targetSeasons).toEqual([2021, 2022, 2023, 2024, 2025, 2026]);
    expect(plan.missingSeasons).toEqual([2026]);
    expect(plan.backfillComplete).toBe(false);
  });

  it("stays on the prior season until September (labelled season is still last year)", async () => {
    mocks.findMany.mockResolvedValue(
      [2020, 2021, 2022, 2023, 2024, 2025].map((season) => ({ season })),
    );
    const plan = await planPlayerStatsRun(new Date("2026-08-15T12:00:00Z"));
    expect(plan.mode).toBe("steady-state");
    expect(plan.season).toBe(2025);
    expect(plan.missingSeasons).toEqual([]);
  });
});
