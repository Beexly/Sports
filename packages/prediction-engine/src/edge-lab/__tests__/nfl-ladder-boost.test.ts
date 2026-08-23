/**
 * NFL ladder + boost scanner — softness map tests.
 *
 * H0 item 2 — detect market softness, do NOT fire live p.
 *
 * Tests cover:
 *  - scanLadderBoost: tight book (no flag), boosted home side, boosted away
 *    side, wide-but-symmetric (no boost), missing moneylines (null),
 *    sub-vig / crossed book (null), invalid odds (null).
 *  - buildLadderScanRows: leak-safety (as-of audit clean), skip counters,
 *    correct feature key count, qClose from closing devig (not result).
 *  - buildSoftnessMapRows: rolling soft-rate/intensity from prior games only,
 *    self-exclusion (latest game's boost not in its own features),
 *    independent home/away tracking.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import {
  buildLadderScanRows,
  buildSoftnessMapRows,
  LADDER_FEATURE_KEYS,
  scanLadderBoost,
  SOFTNESS_FEATURE_KEYS,
} from "../features/nfl-ladder-boost.js";

const T0 = Date.parse("2021-09-12T10:00:00.000Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

function game(
  i: number,
  hs: number | null,
  as_: number | null,
  mlHome: number | null,
  mlAway: number | null,
  dayOffset: number,
  extra: Partial<GameRow> = {},
): GameRow {
  return {
    sport: "nfl",
    gameId: `g${i}`,
    season: 2021,
    week: Math.floor(dayOffset / 7) + 1,
    startTime: iso(T0 + dayOffset * DAY),
    homeTeam: "A",
    awayTeam: "B",
    homeScore: hs,
    awayScore: as_,
    closing: {
      spreadHome: -3,
      total: 44,
      moneylineHomeDecimal: mlHome,
      moneylineAwayDecimal: mlAway,
    },
    ...extra,
  };
}

// ── scanLadderBoost unit tests ──────────────────────────────────────────────

describe("scanLadderBoost", () => {
  it("tight symmetric book (-110 vs -110): no boost, no soft side", () => {
    // 1.9091 each → mid = 1.9091 → boost = 1.0 for both → not boosted.
    const flag = scanLadderBoost({
      spreadHome: -3,
      total: 44,
      moneylineHomeDecimal: 1.9091,
      moneylineAwayDecimal: 1.9091,
    });
    expect(flag).not.toBeNull();
    expect(flag!.boostFlag).toBe(0);
    expect(flag!.softSide).toBe("none");
    expect(flag!.boostRatio).toBeCloseTo(1.0, 2);
    // vig = 2/1.9091 - 1 ≈ 0.0476
    expect(flag!.vig).toBeCloseTo(0.0476, 3);
  });

  it("boosted home side: 2.5 (home +150) vs 1.6 (away -163) → home flagged", () => {
    // mid = sqrt(2.5 * 1.6) = sqrt(4.0) = 2.0
    // boost_home = 2.5/2.0 = 1.25 → > 1.03 ✓
    // boost_away = 1.6/2.0 = 0.80 → < 1
    // vig = 1/2.5 + 1/1.6 - 1 = 0.4 + 0.625 - 1 = 0.025
    const flag = scanLadderBoost({
      spreadHome: -3,
      total: 44,
      moneylineHomeDecimal: 2.5,
      moneylineAwayDecimal: 1.6,
    });
    expect(flag).not.toBeNull();
    expect(flag!.boostFlag).toBe(1);
    expect(flag!.softSide).toBe("home");
    expect(flag!.boostRatio).toBeCloseTo(1.25, 2);
    expect(flag!.vig).toBeCloseTo(0.025, 3);
  });

  it("boosted away side: 1.6 (home -163) vs 2.5 (away +150) → away flagged", () => {
    // mid = sqrt(1.6 * 2.5) = 2.0
    // boost_home = 1.6/2.0 = 0.80 → < 1
    // boost_away = 2.5/2.0 = 1.25 → > 1.03 ✓
    const flag = scanLadderBoost({
      spreadHome: -3,
      total: 44,
      moneylineHomeDecimal: 1.6,
      moneylineAwayDecimal: 2.5,
    });
    expect(flag).not.toBeNull();
    expect(flag!.boostFlag).toBe(1);
    expect(flag!.softSide).toBe("away");
    expect(flag!.boostRatio).toBeCloseTo(1.25, 2);
  });

  it("wide but symmetric book (2.0 vs 1.9): no boost (both near midpoint)", () => {
    // mid = sqrt(2.0 * 1.9) = sqrt(3.8) = 1.9494
    // boost_home = 2.0/1.9494 = 1.026 → < 1.03 → not boosted
    // boost_away = 1.9/1.9494 = 0.974 → < 1 → not boosted
    // vig = 0.5 + 0.5263 - 1 = 0.0263
    const flag = scanLadderBoost({
      spreadHome: -3,
      total: 44,
      moneylineHomeDecimal: 2.0,
      moneylineAwayDecimal: 1.9,
    });
    expect(flag).not.toBeNull();
    expect(flag!.boostFlag).toBe(0);
    expect(flag!.softSide).toBe("none");
  });
});

describe("scanLadderBoost — fail closed", () => {
  it("returns null when either moneyline is null", () => {
    expect(
      scanLadderBoost({ spreadHome: -3, total: 44, moneylineHomeDecimal: null, moneylineAwayDecimal: 2.0 }),
    ).toBeNull();
    expect(
      scanLadderBoost({ spreadHome: -3, total: 44, moneylineHomeDecimal: 2.0, moneylineAwayDecimal: null }),
    ).toBeNull();
  });

  it("returns null when odds are ≤ 1 (invalid decimal)", () => {
    expect(
      scanLadderBoost({ spreadHome: -3, total: 44, moneylineHomeDecimal: 1.0, moneylineAwayDecimal: 2.0 }),
    ).toBeNull();
    expect(
      scanLadderBoost({ spreadHome: -3, total: 44, moneylineHomeDecimal: 2.0, moneylineAwayDecimal: 0.5 }),
    ).toBeNull();
  });

  it("returns null on sub-vig / crossed book (sum of implied < 1)", () => {
    // 2.5 + 2.5 → implied 0.4+0.4 = 0.8 < 1 → sub-vig
    expect(
      scanLadderBoost({ spreadHome: -3, total: 44, moneylineHomeDecimal: 2.5, moneylineAwayDecimal: 2.5 }),
    ).toBeNull();
  });
});

// ── buildLadderScanRows integration tests ─────────────────────────────────

describe("buildLadderScanRows", () => {
  it("flags a boosted home side as a soft rung", () => {
    const store = new AsOfFeatureStore();
    const games = [
      game(0, 24, 20, 1.9091, 1.9091, 0),    // tight
      game(1, 21, 17, 2.5, 1.6, 7),           // home boosted
    ];
    const { rows } = buildLadderScanRows(games, store);
    expect(rows).toHaveLength(2);
    const r = rows[1]!;
    expect(r.features.get("ladder:boost_flag")).toBe(1);
    expect(r.features.get("ladder:soft_side")).toBe(1); // home = 1
    expect(r.features.get("ladder:spread_home")).toBe(-3);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("tight book: boost_flag = 0, soft_side = 0", () => {
    const store = new AsOfFeatureStore();
    const games = [game(0, 24, 20, 1.9091, 1.9091, 0)];
    const { rows } = buildLadderScanRows(games, store);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.features.get("ladder:boost_flag")).toBe(0);
    expect(rows[0]!.features.get("ladder:soft_side")).toBe(0);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("skips games with null moneylines (honest counter)", () => {
    const store = new AsOfFeatureStore();
    const games = [game(0, 24, 20, null, 2.0, 0)];
    const { rows, skipped } = buildLadderScanRows(games, store);
    expect(rows).toHaveLength(0);
    expect(skipped.noMoneyline).toBe(1);
  });

  it("qClose comes from the closing line devig, never the result", () => {
    const store = new AsOfFeatureStore();
    // -105 / -105 → 1.950 each → devig → ~0.5127 each
    const games = [game(0, 50, 0, 1.95, 1.95, 0)];
    const { rows } = buildLadderScanRows(games, store);
    expect(rows[0]!.qClose).toBeCloseTo(0.5, 2);
    // The y (outcome) is 1 (home won 50-0) but qClose must NOT reflect that result.
    expect(rows[0]!.qClose).not.toBeCloseTo(1, 1);
  });

  it("produces exactly LADDER_FEATURE_KEYS per game", () => {
    const store = new AsOfFeatureStore();
    const games = [game(0, 24, 20, 2.0, 1.9, 0)];
    const { rows } = buildLadderScanRows(games, store);
    const keys = [...rows[0]!.features.keys()].sort();
    expect(keys).toEqual([...LADDER_FEATURE_KEYS].sort());
  });

  it("skip counters are mutually exclusive and exhaustive", () => {
    const store = new AsOfFeatureStore();
    const games = [
      game(0, 24, 20, null, 2.0, 0),    // noMoneyline
      game(1, 24, 20, 2.5, 2.5, 7),      // sub-vig → degenerateVig
    ];
    const { rows, skipped } = buildLadderScanRows(games, store);
    expect(rows).toHaveLength(0);
    expect(skipped.noMoneyline).toBe(1);
    expect(skipped.degenerateVig).toBe(1);
    expect(skipped.noOdds).toBe(0);
  });
});

// ── buildSoftnessMapRows integration tests ────────────────────────────────

describe("buildSoftnessMapRows", () => {
  it("soft rate grows as a team accumulates boosted games", () => {
    const store = new AsOfFeatureStore();
    const games = [
      game(0, 24, 20, 1.9091, 1.9091, 0), // tight book, no boost
      game(1, 24, 20, 2.5, 1.6, 7),        // home boosted
      game(2, 24, 20, 2.5, 1.6, 14),       // home boosted again
    ];
    const { rows } = buildSoftnessMapRows(games, store, { window: 8 });
    expect(rows).toHaveLength(3);
    // g0: no history → soft rates = 0
    expect(rows[0]!.features.get("ladder:home_soft_rate")).toBe(0);
    expect(rows[0]!.features.get("ladder:away_soft_rate")).toBe(0);
    // g1: g0 was tight (no boost) → home_soft_rate = 0/1 = 0
    expect(rows[1]!.features.get("ladder:home_soft_rate")).toBe(0);
    // g2: g0 (no boost) + g1 (boost) → home_soft_rate = 1/2 = 0.5
    expect(rows[2]!.features.get("ladder:home_soft_rate")).toBeCloseTo(0.5, 2);
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("self-exclusion: the latest game's own boost does not enter its features", () => {
    const store = new AsOfFeatureStore();
    const games = [
      game(0, 24, 20, 1.9091, 1.9091, 0),
      game(1, 24, 20, 1.9091, 1.9091, 7),
      game(2, 24, 20, 2.5, 1.6, 14), // boosted, but g2's features come from g0+g1 only
    ];
    const { rows } = buildSoftnessMapRows(games, store, { window: 8 });
    // g2's home_soft_rate uses only g0 (tight) and g1 (tight) → 0
    expect(rows[2]!.features.get("ladder:home_soft_rate")).toBe(0);
  });

  it("away-side soft rate tracks away boosts independently", () => {
    const store = new AsOfFeatureStore();
    const games = [
      game(0, 24, 20, 1.6, 2.5, 0), // away boosted (B is away)
      game(1, 24, 20, 1.6, 2.5, 7), // away boosted again
    ];
    const { rows } = buildSoftnessMapRows(games, store, { window: 8 });
    // g0: no history → 0
    expect(rows[0]!.features.get("ladder:away_soft_rate")).toBe(0);
    // g1: g0 had away-boost → away_soft_rate = 1/1 = 1.0
    expect(rows[1]!.features.get("ladder:away_soft_rate")).toBeCloseTo(1.0, 2);
    // home should be 0 (no home-side boosts)
    expect(rows[1]!.features.get("ladder:home_soft_rate")).toBe(0);
  });

  it("produces exactly SOFTNESS_FEATURE_KEYS per game", () => {
    const store = new AsOfFeatureStore();
    const games = [game(0, 24, 20, 1.9091, 1.9091, 0)];
    const { rows } = buildSoftnessMapRows(games, store, { window: 8 });
    expect(rows).toHaveLength(1);
    const keys = [...rows[0]!.features.keys()].sort();
    expect(keys).toEqual([...SOFTNESS_FEATURE_KEYS].sort());
  });

  it("as-of store asserts no lookahead across all served reads", () => {
    const store = new AsOfFeatureStore();
    const games = [
      game(0, 24, 20, 1.9091, 1.9091, 0),
      game(1, 24, 20, 2.5, 1.6, 7),
      game(2, 24, 20, 1.9091, 1.9091, 14),
      game(3, 21, 17, 2.5, 1.6, 21),
    ];
    buildSoftnessMapRows(games, store, { window: 8 });
    expect(() => store.assertNoLookahead()).not.toThrow();
  });
});
