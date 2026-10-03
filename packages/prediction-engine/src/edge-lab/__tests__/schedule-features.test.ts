/**
 * The honesty-critical property under test: rolling features only ever see
 * constituent games that ENDED before the decision cutoff, and their
 * observedAt stamps equal the latest constituent end — so the as-of store's
 * enforcement genuinely covers them.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import { buildScheduleFeatureRows } from "../schedule-features.js";

const T0 = Date.parse("2021-09-01T17:00:00.000Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

function game(i: number, home: string, away: string, hs: number | null, as: number | null, dayOffset: number): GameRow {
  return {
    sport: "nfl",
    gameId: `t${i}`,
    season: 2021,
    week: i,
    startTime: iso(T0 + dayOffset * DAY),
    homeTeam: home,
    awayTeam: away,
    homeScore: hs,
    awayScore: as,
    closing: { spreadHome: -3, total: 44, moneylineHomeDecimal: 1.8, moneylineAwayDecimal: 2.1 },
  };
}

describe("buildScheduleFeatureRows", () => {
  it("emits rows only after MIN_HISTORY games per side, with q from devigged moneyline", () => {
    const games: GameRow[] = [];
    let idx = 0;
    // Two teams play each other 8 times, alternating home/away weekly.
    for (let w = 0; w < 8; w++) {
      games.push(game(idx++, w % 2 ? "B" : "A", w % 2 ? "A" : "B", 24 + w, 20, w * 7));
    }
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildScheduleFeatureRows(games, store);
    // First 5 games per team lack history -> thinHistory skips.
    expect(skipped.thinHistory).toBe(5);
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expect(row.qClose).toBeGreaterThan(0.4);
      expect(row.qClose).toBeLessThan(0.7);
      expect(row.features.size).toBe(3);
    }
    // The store's audit must show zero lookahead across everything served.
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("a game's own result never contributes to its own features (self-exclusion)", () => {
    const games: GameRow[] = [];
    let idx = 0;
    for (let w = 0; w < 7; w++) {
      // Team A always wins big; the pattern would be visible immediately if
      // a game's own result leaked into its own rolling window.
      games.push(game(idx++, "A", "B", 40, 0, w * 7));
    }
    const store = new AsOfFeatureStore();
    const { rows } = buildScheduleFeatureRows(games, store);
    expect(rows.length).toBeGreaterThan(0);
    const first = rows[0]!;
    // Rolling wr diff after 5 A-wins (before game 6) is exactly 1 - 0 = 1;
    // if game 6's own result were included the window math would differ
    // (6 games, still 1.0) — so also check the pd stamp instant: it must be
    // the END of game 5, strictly before game 6's decision time.
    const pdObs = store.get(first.id, "sched:rolling_pd_diff", first.decisionAt);
    expect(pdObs).not.toBeNull();
    expect(Date.parse(pdObs!.observedAt)).toBeLessThan(Date.parse(first.decisionAt));
  });

  it("skips ties, missing odds, and unplayed games with honest counters", () => {
    const store = new AsOfFeatureStore();
    const base: GameRow[] = [];
    let idx = 0;
    for (let w = 0; w < 6; w++) base.push(game(idx++, "A", "B", 20 + w, 10, w * 7));
    const tie = { ...game(idx++, "A", "B", 21, 21, 42) };
    const noScores = { ...game(idx++, "A", "B", null, null, 49) };
    const noOdds: GameRow = {
      ...game(idx++, "A", "B", 30, 20, 56),
      closing: { spreadHome: null, total: null, moneylineHomeDecimal: null, moneylineAwayDecimal: null },
    };
    const { skipped } = buildScheduleFeatureRows([...base, tie, noScores, noOdds], store);
    expect(skipped.tie).toBe(1);
    expect(skipped.noScores).toBe(1);
    expect(skipped.noOdds).toBe(1);
  });
});
