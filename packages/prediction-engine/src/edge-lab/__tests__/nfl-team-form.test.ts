/**
 * The honesty-critical properties under test for the team-form candidates:
 * per-game pbp aggregation is additive and honestly counted, windows pool the
 * last N PRIOR games only (self-exclusion, strict pre-decision cutoff),
 * pooling is per-play (not mean-of-rates), and observedAt stamps equal the
 * end of the LAST constituent game — so the as-of store's enforcement
 * genuinely covers these features. Fixtures only; no network.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import {
  aggregateNflPbpTeamGames,
  buildTeamFormFeatureRows,
  NFL_TEAM_FORM_FEATURE_KEYS,
  type TeamFormPbpRow,
} from "../features/nfl-team-form.js";

const T0 = Date.parse("2021-09-01T17:00:00.000Z");
const DAY = 86_400_000;
const GAME_DURATION_MS = 4 * 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function game(
  i: number,
  home: string,
  away: string,
  hs: number | null,
  as: number | null,
  dayOffset: number,
): GameRow {
  return {
    sport: "nfl",
    gameId: `g${i}`,
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

function pbpRow(
  gameId: string,
  posteam: string,
  defteam: string,
  playType: string,
  epa: string,
  seasonType = "REG",
): TeamFormPbpRow {
  return { game_id: gameId, season_type: seasonType, posteam, defteam, play_type: playType, epa };
}

/** n scrimmage plays for `off` totalling `epaSum`, `passes` of them passes. */
function plays(
  gameId: string,
  off: string,
  def: string,
  n: number,
  epaSum: number,
  passes: number,
): TeamFormPbpRow[] {
  const rows: TeamFormPbpRow[] = [];
  const perPlay = epaSum / n;
  for (let k = 0; k < n; k++) {
    rows.push(pbpRow(gameId, off, def, k < passes ? "pass" : "run", String(perPlay)));
  }
  return rows;
}

describe("aggregateNflPbpTeamGames", () => {
  it("folds scrimmage rows into additive per-team-per-game sums with honest drop counters", () => {
    const rows: TeamFormPbpRow[] = [
      pbpRow("g1", "A", "B", "pass", "0.5"),
      pbpRow("g1", "A", "B", "run", "-0.2"),
      pbpRow("g1", "A", "B", "pass", "0"), // epa 0 is NOT a success
      pbpRow("g1", "B", "A", "run", "1.25"),
      pbpRow("g1", "A", "B", "punt", "0.1"), // not scrimmage
      pbpRow("g1", "A", "B", "pass", ""), // no epa
      pbpRow("g1", "A", "B", "pass", "0.9", "POST"), // not REG
      pbpRow("", "A", "B", "pass", "0.9"), // no identity
    ];
    const { byGame, counts } = aggregateNflPbpTeamGames(rows);

    expect(counts.sourceRows).toBe(8);
    expect(counts.droppedNonReg).toBe(1);
    expect(counts.droppedNotScrimmage).toBe(2);
    expect(counts.droppedNoEpa).toBe(1);
    expect(counts.usableRows).toBe(4);
    expect(counts.games).toBe(1);

    const a = byGame.get("g1")?.get("A");
    expect(a).toBeDefined();
    expect(a!.offPlays).toBe(3);
    expect(a!.offEpaSum).toBeCloseTo(0.3, 12);
    expect(a!.offSuccessPlays).toBe(1);
    expect(a!.offPassPlays).toBe(2);
    expect(a!.defPlays).toBe(1);
    expect(a!.defEpaAllowedSum).toBeCloseTo(1.25, 12);

    const b = byGame.get("g1")?.get("B");
    expect(b!.offPlays).toBe(1);
    expect(b!.offEpaSum).toBeCloseTo(1.25, 12);
    expect(b!.defPlays).toBe(3);
    expect(b!.defEpaAllowedSum).toBeCloseTo(0.3, 12);
  });
});

describe("buildTeamFormFeatureRows", () => {
  it("pools per-play over the last N prior games (window truncation + unequal play counts)", () => {
    // A hosts B four times; feature the 4th game with window=2, minHistory=2.
    const games = [0, 1, 2, 3].map((i) => game(i, "A", "B", 24, 20, i * 7));
    const pbp: TeamFormPbpRow[] = [
      // g0 MUST be excluded by the window (only last 2 prior games count).
      ...plays("g0", "A", "B", 10, 100, 10),
      ...plays("g0", "B", "A", 10, -100, 0),
      // Window constituents g1 + g2, unequal play counts for A's offense:
      // pooled = (2.0 + (-0.8)) / (2 + 8) = 0.12 — NOT mean-of-rates 0.45.
      ...plays("g1", "A", "B", 2, 2.0, 2),
      ...plays("g1", "B", "A", 10, 1.0, 5),
      ...plays("g2", "A", "B", 8, -0.8, 0),
      ...plays("g2", "B", "A", 10, 1.0, 5),
      // g3's own plays exist but must be self-excluded from its own features.
      ...plays("g3", "A", "B", 10, 500, 10),
      ...plays("g3", "B", "A", 10, -500, 0),
    ];
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildTeamFormFeatureRows(
      games,
      aggregateNflPbpTeamGames(pbp),
      store,
      { window: 2, minHistory: 2, minPlaysPerGame: 1 },
    );

    expect(skipped.thinHistory).toBe(2); // g0 (no history) + g1 (one prior game)
    expect(rows.length).toBe(2); // g2 (window g0+g1) and g3 (window g1+g2)
    const featured = rows[1]!;
    expect(featured.id).toBe("g3");

    const aOff = 1.2 / 10; // pooled A offense over g1+g2
    const bOff = 2.0 / 20; // pooled B offense over g1+g2
    const aDefAllowed = bOff; // A's defense faced exactly B's offense
    const bDefAllowed = aOff;
    expect(featured.features.get("form:off_epa_pp_diff")).toBeCloseTo(aOff - bOff, 12);
    expect(featured.features.get("form:def_epa_pp_allowed_diff")).toBeCloseTo(
      aDefAllowed - bDefAllowed,
      12,
    );
    // net = (off − defAllowed) home-minus-away ≡ off_diff − def_diff.
    expect(featured.features.get("form:net_epa_pp_diff")).toBeCloseTo(
      (aOff - bOff) - (aDefAllowed - bDefAllowed),
      12,
    );
    // Pass rate: A threw 2 of 10 window plays; B threw 10 of 20.
    expect(featured.features.get("form:pass_rate_diff")).toBeCloseTo(2 / 10 - 10 / 20, 12);
    // Success: A had 2 positive-EPA plays (g1) of 10; B all 20 positive.
    expect(featured.features.get("form:off_success_rate_diff")).toBeCloseTo(2 / 10 - 1, 12);
    expect(featured.features.size).toBe(NFL_TEAM_FORM_FEATURE_KEYS.length);

    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("stamps observedAt with the END of the LAST window constituent, strictly pre-decision", () => {
    const games = [0, 1, 2, 3].map((i) => game(i, "A", "B", 24, 20, i * 7));
    const pbp: TeamFormPbpRow[] = games.flatMap((g) => [
      ...plays(g.gameId, "A", "B", 5, 1.0, 3),
      ...plays(g.gameId, "B", "A", 5, -1.0, 2),
    ]);
    const store = new AsOfFeatureStore();
    const { rows } = buildTeamFormFeatureRows(games, aggregateNflPbpTeamGames(pbp), store, {
      window: 2,
      minHistory: 2,
      minPlaysPerGame: 1,
    });
    const featured = rows[rows.length - 1]!;
    expect(featured.id).toBe("g3");

    // Last constituent of g3's window is g2 → observedAt = g2's end instant.
    const g2End = iso(T0 + 2 * 7 * DAY + GAME_DURATION_MS);
    for (const key of NFL_TEAM_FORM_FEATURE_KEYS) {
      const obs = store.get(featured.id, key, featured.decisionAt);
      expect(obs).not.toBeNull();
      expect(obs!.observedAt).toBe(g2End);
      expect(Date.parse(obs!.observedAt)).toBeLessThan(Date.parse(featured.decisionAt));
    }
  });

  it("a game's own plays never contribute to its own features (self-exclusion)", () => {
    // Identical history everywhere; the featured game's own aggregate is a
    // huge outlier that would be visible immediately if it leaked.
    const games = [0, 1, 2].map((i) => game(i, "A", "B", 24, 20, i * 7));
    const clean: TeamFormPbpRow[] = [
      ...plays("g0", "A", "B", 5, 0.5, 3),
      ...plays("g0", "B", "A", 5, 0.5, 3),
      ...plays("g1", "A", "B", 5, 0.5, 3),
      ...plays("g1", "B", "A", 5, 0.5, 3),
    ];
    const poisonedG2 = [
      ...plays("g2", "A", "B", 5, 9999, 5),
      ...plays("g2", "B", "A", 5, -9999, 0),
    ];
    const store = new AsOfFeatureStore();
    const { rows } = buildTeamFormFeatureRows(
      games,
      aggregateNflPbpTeamGames([...clean, ...poisonedG2]),
      store,
      { window: 2, minHistory: 2, minPlaysPerGame: 1 },
    );
    expect(rows.length).toBe(1);
    const featured = rows[0]!;
    expect(featured.id).toBe("g2");
    // Symmetric history → every diff is exactly 0; any g2 leakage would be huge.
    expect(featured.features.get("form:off_epa_pp_diff")).toBeCloseTo(0, 12);
    expect(featured.features.get("form:net_epa_pp_diff")).toBeCloseTo(0, 12);
  });

  it("skips ties, missing odds, and unplayed games with honest counters", () => {
    const base = [0, 1].map((i) => game(i, "A", "B", 24, 20, i * 7));
    const tie = game(2, "A", "B", 21, 21, 14);
    const noScores = game(3, "A", "B", null, null, 21);
    const noOdds: GameRow = {
      ...game(4, "A", "B", 30, 20, 28),
      closing: { spreadHome: null, total: null, moneylineHomeDecimal: null, moneylineAwayDecimal: null },
    };
    const pbp: TeamFormPbpRow[] = [...base, tie, noOdds].flatMap((g) => [
      ...plays(g.gameId, "A", "B", 5, 1.0, 3),
      ...plays(g.gameId, "B", "A", 5, 1.0, 3),
    ]);
    const store = new AsOfFeatureStore();
    const { rows, skipped } = buildTeamFormFeatureRows(
      [...base, tie, noScores, noOdds],
      aggregateNflPbpTeamGames(pbp),
      store,
      { window: 2, minHistory: 1, minPlaysPerGame: 1 },
    );
    expect(skipped.tie).toBe(1);
    expect(skipped.noScores).toBe(1);
    expect(skipped.noOdds).toBe(1);
    expect(skipped.thinHistory).toBe(1); // g0 has no prior history
    expect(rows.length).toBe(1); // g1
  });

  it("joins era team codes to pbp's retroactive current codes (OAK→LV continuity)", () => {
    // games.csv era code "OAK" hosts; pbp keys the same franchise "LV"
    // (verified live behavior of the 2019 asset). Later the franchise appears
    // as "LV" in games.csv too — its OAK-era history must carry over.
    const games: GameRow[] = [
      { ...game(0, "OAK", "B", 24, 20, 0) },
      { ...game(1, "OAK", "B", 24, 20, 7) },
      { ...game(2, "LV", "B", 24, 20, 14) },
    ];
    const pbp: TeamFormPbpRow[] = [
      ...plays("g0", "LV", "B", 5, 1.0, 3),
      ...plays("g0", "B", "LV", 5, -1.0, 2),
      ...plays("g1", "LV", "B", 5, 1.0, 3),
      ...plays("g1", "B", "LV", 5, -1.0, 2),
      ...plays("g2", "LV", "B", 5, 42, 3), // own game — self-excluded from its own features
      ...plays("g2", "B", "LV", 5, -42, 2),
    ];
    const store = new AsOfFeatureStore();
    const { rows, historyCounts } = buildTeamFormFeatureRows(
      games,
      aggregateNflPbpTeamGames(pbp),
      store,
      { window: 2, minHistory: 2, minPlaysPerGame: 1 },
    );
    expect(historyCounts.gamesMissingAggregates).toBe(0);
    expect(historyCounts.gamesFullyJoined).toBe(3);
    // The LV-coded game 2 is featured from the OAK-era window (g0 + g1).
    expect(rows.length).toBe(1);
    expect(rows[0]!.id).toBe("g2");
    expect(rows[0]!.features.get("form:off_epa_pp_diff")).toBeCloseTo(0.2 - -0.2, 12);
  });

  it("rejects thin-play aggregates from history and counts unjoined completed games", () => {
    const games = [0, 1, 2].map((i) => game(i, "A", "B", 24, 20, i * 7));
    const pbp: TeamFormPbpRow[] = [
      // g0: A has only 2 offensive plays — below minPlaysPerGame 3 → rejected
      // for A AND rejected for B's defense (defPlays 2 < 3).
      ...plays("g0", "A", "B", 2, 1.0, 1),
      ...plays("g0", "B", "A", 5, 1.0, 3),
      // g1: both sides healthy.
      ...plays("g1", "A", "B", 5, 1.0, 3),
      ...plays("g1", "B", "A", 5, 1.0, 3),
      // g2 (featured) needs no own pbp — and has none: counted missing.
    ];
    const store = new AsOfFeatureStore();
    const { rows, skipped, historyCounts } = buildTeamFormFeatureRows(
      games,
      aggregateNflPbpTeamGames(pbp),
      store,
      { window: 3, minHistory: 2, minPlaysPerGame: 3 },
    );
    // Both g0 aggregates fail the floor (A: offPlays 2; B: defPlays 2).
    expect(historyCounts.aggregatesRejectedThinPlays).toBe(2);
    expect(historyCounts.gamesFullyJoined).toBe(1); // g1 only
    expect(historyCounts.gamesMissingAggregates).toBe(1); // g2 has no pbp
    // Each side has only ONE usable history game (g1) < minHistory 2 → skipped.
    expect(skipped.thinHistory).toBe(3);
    expect(rows.length).toBe(0);
  });
});
