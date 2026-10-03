import { describe, it, expect } from "vitest";
import { orderReplayGames, type ReplayGame } from "../nflverse-replay-parser.js";

// ============================================================
// Ordering-spine determinism for orderReplayGames().
// It is the no-lookahead ordering used by replay-harness.ts (54,77)
// but has no direct test. These pin: stable season/week/gameId sort,
// idempotency, input purity, monotonic chronology, tie-break, empty.
// ============================================================

function game(season: number, week: number, gameId: string): ReplayGame {
  return {
    gameId,
    season,
    week,
    gameType: "REG",
    awayTeam: "AAA",
    homeTeam: "BBB",
    awayScore: 0,
    homeScore: 0,
    totalLine: null,
    spreadLine: null,
  };
}

describe("orderReplayGames — deterministic ordering spine", () => {
  it("sorts strictly by season, then week, then gameId.localeCompare", () => {
    const shuffled: ReplayGame[] = [
      game(2000, 1, "2000_01_DAL_MIA"),
      game(1999, 3, "1999_03_ARI_MIN"),
      game(1999, 1, "1999_01_MIN_ATL"),
      game(1999, 2, "1999_02_MIA_ARI"),
      game(1999, 1, "1999_01_DEN_MIA"),
    ];
    const ordered = orderReplayGames(shuffled);
    expect(ordered.map((g) => g.gameId)).toEqual([
      "1999_01_DEN_MIA", // 1999 W1, DEN < MIN
      "1999_01_MIN_ATL", // 1999 W1
      "1999_02_MIA_ARI", // 1999 W2
      "1999_03_ARI_MIN", // 1999 W3
      "2000_01_DAL_MIA", // 2000 W1
    ]);
  });

  it("is idempotent — ordering an already-ordered list is a no-op", () => {
    const input = [
      game(2000, 1, "2000_01_DAL_MIA"),
      game(1999, 1, "1999_01_MIN_ATL"),
      game(1999, 1, "1999_01_DEN_MIA"),
    ];
    const once = orderReplayGames(input);
    const twice = orderReplayGames(once);
    expect(twice).toEqual(once);
  });

  it("does not mutate the input array (purity)", () => {
    const input = [
      game(2000, 1, "2000_01_DAL_MIA"),
      game(1999, 1, "1999_01_MIN_ATL"),
    ];
    const snapshot = input.map((g) => g.gameId);
    orderReplayGames(input);
    expect(input.map((g) => g.gameId)).toEqual(snapshot);
  });

  it("holds the no-lookahead invariant — every adjacent pair is season/week non-decreasing", () => {
    const ordered = orderReplayGames([
      game(2000, 1, "2000_01_DAL_MIA"),
      game(1999, 4, "1999_04_ATL_DEN"),
      game(1999, 1, "1999_01_MIN_ATL"),
      game(1999, 2, "1999_02_MIA_ARI"),
    ]);
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1]!;
      const cur = ordered[i]!;
      const monotonic =
        cur.season > prev.season ||
        (cur.season === prev.season && cur.week >= prev.week);
      expect(monotonic).toBe(true);
    }
  });

  it("tie-breaks same season+week by gameId localeCompare", () => {
    const ordered = orderReplayGames([
      game(1999, 1, "1999_01_ZZZ_AAA"),
      game(1999, 1, "1999_01_AAA_ZZZ"),
      game(1999, 1, "1999_01_MMM_NNN"),
    ]);
    expect(ordered.map((g) => g.gameId)).toEqual([
      "1999_01_AAA_ZZZ",
      "1999_01_MMM_NNN",
      "1999_01_ZZZ_AAA",
    ]);
  });

  it("returns [] for empty input", () => {
    expect(orderReplayGames([])).toEqual([]);
  });
});
