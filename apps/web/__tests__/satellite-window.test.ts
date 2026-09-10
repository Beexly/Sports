import { describe, expect, it } from "vitest";

/**
 * C-244. `/api/cron/refresh-player-stats` gated its satellite ingests (snap
 * counts, injuries, depth charts, Next Gen Stats) behind `?mode=full`, and the
 * scheduled invocation in `vercel.json` carries no query string — so on the
 * schedule they never ran. Measured on production 2026-09-08 via read-only
 * SQL: `depth_chart_entries` held ZERO rows; injuries, snap counts and Next
 * Gen Stats topped out at season 2025, as did `player_game_stats` (nflverse
 * has not published 2026 REG rows yet, so for those three the reading is "not
 * yet due" rather than "stale" — the empty depth-chart table is the
 * unambiguous gap). When 2026 week 1 ships, the primary path picks it up in
 * thirty minutes and the satellites would stay put for the season.
 *
 * These tests pin the decision, including the two ways it must NOT drift: an
 * explicit `?mode=primary` inside the daily window must stay primary, and the
 * twice-hourly cron must not take the heavy path twice.
 */

import { decideSatelliteRun, SATELLITE_DAILY_HOUR_UTC } from "@/lib/ingestion/satellite-window";

const at = (hour: number, minute: number): Date =>
  new Date(Date.UTC(2026, 8, 8, hour, minute, 0));

const params = (query: string): URLSearchParams => new URLSearchParams(query);

describe("the satellite ingests run without anyone passing a query string", () => {
  it("runs them in the daily window, which the cron alone can reach", () => {
    const d = decideSatelliteRun(params(""), at(SATELLITE_DAILY_HOUR_UTC, 0));
    expect(d.runFull).toBe(true);
    expect(d.reason).toBe("daily-window");
  });

  it("takes the heavy path once a day, not twice", () => {
    // The schedule is "0,30 * * * *". Both runs are inside the hour, so an
    // hour-only check would double the load for no extra data.
    expect(decideSatelliteRun(params(""), at(SATELLITE_DAILY_HOUR_UTC, 30)).runFull).toBe(false);
    expect(decideSatelliteRun(params(""), at(SATELLITE_DAILY_HOUR_UTC, 59)).runFull).toBe(false);
  });

  it("leaves every other scheduled invocation primary-only", () => {
    for (let hour = 0; hour < 24; hour++) {
      if (hour === SATELLITE_DAILY_HOUR_UTC) continue;
      const d = decideSatelliteRun(params(""), at(hour, 0));
      expect(d.runFull, `hour ${hour} took the heavy path`).toBe(false);
      expect(d.reason).toBe("primary-only");
    }
  });

  it("counts exactly one heavy run across a full day of the real schedule", () => {
    // The invariant that matters for cost, asserted against the actual cron
    // expression rather than against the implementation's own shape.
    const heavy = [];
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30]) {
        if (decideSatelliteRun(params(""), at(hour, minute)).runFull) heavy.push({ hour, minute });
      }
    }
    expect(heavy).toEqual([{ hour: SATELLITE_DAILY_HOUR_UTC, minute: 0 }]);
  });
});

describe("an explicit mode still decides, in both directions", () => {
  it("honours mode=full and mode=all outside the window", () => {
    expect(decideSatelliteRun(params("mode=full"), at(3, 0))).toEqual({
      runFull: true,
      reason: "requested",
    });
    expect(decideSatelliteRun(params("mode=ALL"), at(3, 0)).runFull).toBe(true);
  });

  it("honours mode=primary INSIDE the window", () => {
    // A clock that overrode a named mode would make the parameter a
    // suggestion. An operator who says primary gets primary.
    const d = decideSatelliteRun(params("mode=primary"), at(SATELLITE_DAILY_HOUR_UTC, 0));
    expect(d.runFull).toBe(false);
    expect(d.reason).toBe("primary-only");
  });

  it("treats an unrecognised mode as primary rather than guessing", () => {
    expect(decideSatelliteRun(params("mode=everything"), at(SATELLITE_DAILY_HOUR_UTC, 0)).runFull).toBe(
      false,
    );
  });

  it("is unaffected by the season override an operator drives backfills with", () => {
    expect(decideSatelliteRun(params("season=2025"), at(SATELLITE_DAILY_HOUR_UTC, 0)).runFull).toBe(
      true,
    );
    expect(decideSatelliteRun(params("season=2025"), at(4, 0)).runFull).toBe(false);
  });
});
