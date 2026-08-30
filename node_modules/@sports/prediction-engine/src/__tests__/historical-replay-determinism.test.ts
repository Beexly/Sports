import { describe, it, expect } from "vitest";
import {
  replayAndSettleGame,
  type RawScheduleRow,
  type SettledHistoricalPick,
} from "../historical-replay.js";

/**
 * Full-output DETERMINISM of the historical replay+settle pipeline.
 *
 * The frozen-model backfill must be reproducible to the last field: two replays of
 * the SAME played row must yield byte-identical SettledHistoricalPick[]. The existing
 * historical-replay.test.ts only compares idempotency keys and a `pickType:selection:
 * confidence` string projection — it would miss drift in edgeScore, marketFairProb,
 * entryOdds, asOf, clvValue, or field ordering. This test asserts the ENTIRE settled
 * output is equal (deep .toEqual) AND adds a coarse JSON.stringify fingerprint to
 * catch field-order / NaN / undefined-vs-missing drift that a structural compare can
 * mask.
 */

// A representative PLAYED row: KC home favored by 3, total 47, KC ML -150 / DET +130,
// final 27-20 (KC by 7).
function playedRow(overrides: Partial<RawScheduleRow> = {}): RawScheduleRow {
  return {
    gameKey: "2023_05_DET_KC",
    season: 2023,
    week: 5,
    gameType: "REG",
    homeTeam: "KC",
    awayTeam: "DET",
    commenceTime: "2023-10-08T17:00:00.000Z",
    spreadLine: -3,
    totalLine: 47,
    homeMoneyline: -150,
    awayMoneyline: 130,
    restHome: 7,
    restAway: 7,
    homeScore: 27,
    awayScore: 20,
    result: 7,
    ...overrides,
  };
}

describe("historical replay — full-output determinism", () => {
  it("two replays of the same played row produce identical SettledHistoricalPick[] (every field)", () => {
    const row = playedRow();
    const run1: SettledHistoricalPick[] = replayAndSettleGame(row);
    const run2: SettledHistoricalPick[] = replayAndSettleGame(row);

    expect(run1.length).toBeGreaterThan(0);
    // Deep structural equality over the ENTIRE output — stronger than the existing
    // idempotency-key / string-projection comparison.
    expect(run1).toEqual(run2);
  });

  it("coarse JSON fingerprint is identical (catches field-order / NaN / undefined drift)", () => {
    const row = playedRow();
    const run1 = replayAndSettleGame(row);
    const run2 = replayAndSettleGame(row);
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  it("determinism holds for a different played outcome too (away blowout)", () => {
    const row = playedRow({ homeScore: 0, awayScore: 40, result: -40 });
    const run1 = replayAndSettleGame(row);
    const run2 = replayAndSettleGame(row);
    expect(run1).toEqual(run2);
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});
