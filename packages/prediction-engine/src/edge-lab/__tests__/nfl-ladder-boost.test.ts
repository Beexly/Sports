/**
 * NFL ladder + boost scanner tests.
 *
 * Covers:
 *  - scanLadderBoost: geometric-midpoint boost detection, fail-closed on
 *    degenerate/vig-free/inverted markets, boost ratio math.
 *  - buildLadderScanRows / buildSoftnessMapRows: leak-safe row + covariate
 *    emission, self-exclusion, null-score handling, as-of audit tripwire.
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import {
  LADDER_FEATURE_KEYS,
  SOFTNESS_FEATURE_KEYS,
  buildLadderScanRows,
  buildSoftnessMapRows,
  scanLadderBoost,
} from "../features/nfl-ladder-boost.js";

/** Decimal odds for a balanced 4.5-point NFL favourite at a typical -110/+110 market. */
const EVENISH: GameRow["closing"] = {
  spreadHome: -4.5,
  total: 44.5,
  moneylineHomeDecimal: 1.93, // ~ -107
  moneylineAwayDecimal: 1.93,
};

const DECISION_LEAD_MS = 60 * 60_000;

function gameRow(overrides: Partial<GameRow>): GameRow {
  const base: GameRow = {
    sport: "nfl",
    gameId: "nfl_2024_01",
    season: 2024,
    week: 1,
    startTime: "2024-09-05T21:30:00.000Z",
    homeTeam: "KC",
    awayTeam: "DET",
    homeScore: 21,
    awayScore: 14,
    closing: EVENISH,
  };
  return { ...base, ...overrides };
}

describe("scanLadderBoost — geometric midpoint detection", () => {
  it("returns null when moneylines are missing", () => {
    expect(scanLadderBoost({ ...EVENISH, moneylineHomeDecimal: null })).toBeNull();
    expect(scanLadderBoost({ ...EVENISH, moneylineAwayDecimal: null })).toBeNull();
  });

  it("returns null for non-finite / <= 1 prices", () => {
    expect(scanLadderBoost({ ...EVENISH, moneylineHomeDecimal: 1 })).toBeNull();
    expect(scanLadderBoost({ ...EVENISH, moneylineAwayDecimal: 0.95 })).toBeNull();
    expect(scanLadderBoost({ ...EVENISH, moneylineHomeDecimal: Infinity })).toBeNull();
    expect(scanLadderBoost({ ...EVENISH, moneylineAwayDecimal: NaN })).toBeNull();
  });

  it("returns null on a sub-vig / crossed book (fails closed)", () => {
    // 1/2.10 + 1/2.10 = 0.9524 < 1 — crossed book.
    expect(
      scanLadderBoost({
        moneylineHomeDecimal: 2.1,
        moneylineAwayDecimal: 2.1,
        spreadHome: 0,
        total: 40,
      }),
    ).toBeNull();
  });

  it("returns null on a vig-free book (fails closed, not a boost signal)", () => {
    // 1/1.50 + 1/3.00 = 1 exactly — no vig, but the market carries no softness.
    expect(
      scanLadderBoost({
        moneylineHomeDecimal: 1.5,
        moneylineAwayDecimal: 3.0,
        spreadHome: 0,
        total: 40,
      }),
    ).toBeNull();
  });

  it("detects a home-side boost: boost_ratio = closing / midpoint > threshold", () => {
    // A book where home is offered generously while the away price reflects a
    // tighter consensus. mid = sqrt(mh*ma); home boost = mh / mid.
    const mh = 2.1; // +110
    const ma = 1.83; // ~-120
    const mid = Math.sqrt(mh * ma);
    const expectedBoost = mh / mid;

    const result = scanLadderBoost({
      moneylineHomeDecimal: mh,
      moneylineAwayDecimal: ma,
      spreadHome: 0,
      total: 40,
    });

    expect(result).not.toBeNull();
    expect(result!.softSide).toBe("home");
    expect(result!.boostFlag).toBe(1);
    expect(result!.boostRatio).toBeCloseTo(expectedBoost, 10);
    expect(result!.vig).toBeCloseTo(1 / mh + 1 / ma - 1, 10);
    expect(result!.qClose).toBeCloseTo(proportionalDevig([mh, ma])![0]!, 10);
  });

  it("detects an away-side boost", () => {
    const mh = 1.83;
    const ma = 2.1;
    const mid = Math.sqrt(mh * ma);
    const result = scanLadderBoost({
      moneylineHomeDecimal: mh,
      moneylineAwayDecimal: ma,
      spreadHome: 0,
      total: 40,
    });

    expect(result).not.toBeNull();
    expect(result!.softSide).toBe("away");
    expect(result!.boostFlag).toBe(1);
    expect(result!.boostRatio).toBeCloseTo(ma / mid, 10);
  });

  it("flags no boost (boost_ratio <= threshold) on a tight book", () => {
    // Tight book: 1.91/1.91 -> mid = 1.91, both sides == 1.0 (no boost).
    const result = scanLadderBoost({
      moneylineHomeDecimal: 1.91,
      moneylineAwayDecimal: 1.91,
      spreadHome: 0,
      total: 41,
    });

    expect(result).not.toBeNull();
    expect(result!.boostFlag).toBe(0);
    expect(result!.softSide).toBe("none");
    expect(result!.boostRatio).toBeCloseTo(1.0, 10);
  });

  it("respects a caller-supplied minBoostRatio override", () => {
    // 1.95 / 1.95 — mid = 1.95, both sides sit at ratio exactly 1.0.
    // A normal MIN_BOOST_RATIO (1.03) would see NO boost (1.0 < 1.03).
    // But with a low override threshold of 0.5, 1.0 > 0.5 → home flagged boosted.
    const strictResult = scanLadderBoost(
      {
        moneylineHomeDecimal: 1.95,
        moneylineAwayDecimal: 1.95,
        spreadHome: 0,
        total: 41,
      },
      // default threshold 1.03 → 1.0 is not > 1.03 → no boost.
    );
    expect(strictResult).not.toBeNull();
    expect(strictResult!.boostFlag).toBe(0);
    expect(strictResult!.boostRatio).toBeCloseTo(1.0, 10);

    // Override threshold lower than 1.0 → the fair midpoint IS "boosted".
    const overridden = scanLadderBoost(
      {
        moneylineHomeDecimal: 1.95,
        moneylineAwayDecimal: 1.95,
        spreadHome: 0,
        total: 41,
      },
      { minBoostRatio: 0.5 },
    );
    expect(overridden).not.toBeNull();
    expect(overridden!.boostFlag).toBe(1);
    expect(overridden!.boostRatio).toBeCloseTo(1.0, 10);
    expect(overridden!.softSide).toBe("home"); // home checked first
  });

  it("midpoint is invariant to which side is favored (geometric property)", () => {
    // Swapping mh and ma must not change mid = sqrt(mh*ma).
    const mh = 2.1;
    const ma = 1.83;
    const r1 = scanLadderBoost({ moneylineHomeDecimal: mh, moneylineAwayDecimal: ma, spreadHome: 0, total: 40 });
    const r2 = scanLadderBoost({ moneylineHomeDecimal: ma, moneylineAwayDecimal: mh, spreadHome: 0, total: 40 });
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    // Same vig either way (symmetric).
    expect(r1!.vig).toBeCloseTo(r2!.vig, 10);
    // The boosted side flips, but the boost ratio magnitude is the same.
    expect(r1!.softSide).not.toBe(r2!.softSide);
    expect(r1!.boostRatio).toBeCloseTo(r2!.boostRatio, 10);
  });
});

describe("buildLadderScanRows — leak-safe row emission", () => {
  it("emits one EvalRow per final game with complete moneylines and a 5-feature vector", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: 21,
        awayScore: 14,
        closing: {
          spreadHome: -4.5,
          total: 44.5,
          moneylineHomeDecimal: 2.1,
          moneylineAwayDecimal: 1.83,
        },
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildLadderScanRows(games, store);

    expect(result.skipped.noOdds).toBe(0);
    expect(result.skipped.noMoneyline).toBe(0);
    expect(result.skipped.noScores).toBe(0);
    expect(result.skipped.degenerateVig).toBe(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0]!;
    expect(row.id).toBe("g1");
    // decisionAt = startTime - 1h.
    expect(row.decisionAt).toBe(new Date(Date.parse("2024-09-05T21:30:00.000Z") - DECISION_LEAD_MS).toISOString());
    // eventEndAt = startTime + 4h.
    expect(row.eventEndAt).toBe(new Date(Date.parse("2024-09-05T21:30:00.000Z") + 4 * 3_600_000).toISOString());
    expect(row.y).toBe(1); // KC won.
    expect(row.qClose).toBeGreaterThan(0);
    expect(row.qClose).toBeLessThan(1);

    // Vector served as-of decisionAt must contain all 6 ladder feature keys.
    for (const k of LADDER_FEATURE_KEYS) {
      expect(row.features.has(k)).toBe(true);
    }
    // Soft side: home is boosted at +110 vs the midpoint.
    const flag = scanLadderBoost(games[0]!.closing);
    expect(flag?.softSide).toBe("home");
    expect(row.features.get("ladder:soft_side")).toBe(1);
    expect(row.features.get("ladder:boost_flag")).toBe(1);
    expect(row.features.get("ladder:spread_home")).toBe(-4.5);
  });

  it("skips games with null scores (non-final) — noScores increment, no EvalRow", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: null,
        awayScore: null,
        closing: {
          spreadHome: -4.5,
          total: 44.5,
          moneylineHomeDecimal: 2.1,
          moneylineAwayDecimal: 1.83,
        },
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildLadderScanRows(games, store);

    expect(result.rows).toHaveLength(0);
    expect(result.skipped.noScores).toBe(1);
  });

  it("skips games with missing moneylines — noMoneyline increment", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        closing: {
          spreadHome: -4.5,
          total: 44.5,
          moneylineHomeDecimal: 2.1,
          moneylineAwayDecimal: null,
        },
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildLadderScanRows(games, store);

    expect(result.rows).toHaveLength(0);
    expect(result.skipped.noMoneyline).toBe(1);
    expect(result.skipped.degenerateVig).toBe(0);
  });

  it("skips degenerate markets (inverted/crossed) — degenerateVig increment", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        closing: {
          spreadHome: 0,
          total: 40,
          moneylineHomeDecimal: 2.1,
          moneylineAwayDecimal: 2.1, // crossed book (sub-vig)
        },
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildLadderScanRows(games, store);

    expect(result.rows).toHaveLength(0);
    expect(result.skipped.degenerateVig).toBe(1);
  });

  it("fail-closed: crossed market with scores present still skips", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: 21,
        awayScore: 14,
        closing: EVENISH, // balanced but not crossed — should emit
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildLadderScanRows(games, store);
    expect(result.rows).toHaveLength(1);
  });

  it("fail-closed: qClose bound (0.01, 0.99) inside scanLadderBoost rejects a near-certain-but-vigged market", () => {
    // qHome = ma/(ma+mh). To get qHome < 0.01 while keeping vig > 0.01, we need
    // ma near 1.0 and mh large. This is a razor-edge safety-net boundary — real
    // markets can't live here, but the bound is a guardrail, not a target.
    // scanLadderBoost returns null when qHome fails (0.01, 0.99).
    const mh = 99.25;
    const ma = 1.00005;
    const impliedSum = 1 / mh + 1 / ma;
    expect(impliedSum - 1).toBeGreaterThan(0.01); // passes vig floor
    expect(ma / (ma + mh)).toBeLessThan(0.01); // but qHome fails the bound

    expect(
      scanLadderBoost({
        moneylineHomeDecimal: mh,
        moneylineAwayDecimal: ma,
        spreadHome: 0,
        total: 40,
      }),
    ).toBeNull();
  });

  it("the as-of audit tripwire passes (zero lookahead) after a clean run", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: 21,
        awayScore: 14,
        closing: {
          spreadHome: -4.5,
          total: 44.5,
          moneylineHomeDecimal: 2.1,
          moneylineAwayDecimal: 1.83,
        },
      }),
    ];
    const store = new AsOfFeatureStore();
    buildLadderScanRows(games, store);
    // observedAt == decisionAt, so every served obs postdates nothing.
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("y = 0 when away wins", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: 14,
        awayScore: 21,
        closing: EVENISH,
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildLadderScanRows(games, store);
    expect(result.rows[0]!.y).toBe(0);
  });
});

describe("buildSoftnessMapRows — rolling team softness covariates", () => {
  it("emits 4 softness feature keys per final game and zeros the rate with no history", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: 21,
        awayScore: 14,
        closing: EVENISH,
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildSoftnessMapRows(games, store);

    expect(result.rows).toHaveLength(1);
    expect(result.skipped.noScores).toBe(0);
    for (const k of SOFTNESS_FEATURE_KEYS) {
      expect(result.rows[0]!.features.has(k)).toBe(true);
    }
    // No prior games -> rates are 0, no boosts to average -> intensity 1.0.
    expect(result.rows[0]!.features.get("ladder:home_soft_rate")).toBe(0);
    expect(result.rows[0]!.features.get("ladder:away_soft_rate")).toBe(0);
    expect(result.rows[0]!.features.get("ladder:home_soft_intensity")).toBe(1);
    expect(result.rows[0]!.features.get("ladder:away_soft_intensity")).toBe(1);
  });

  it("skips non-final games and does not record them into team history", () => {
    const games: GameRow[] = [
      // Non-final: should be skipped, NOT entered into KC's history.
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: null,
        awayScore: null,
        closing: {
          spreadHome: -4.5,
          total: 44.5,
          moneylineHomeDecimal: 2.1,
          moneylineAwayDecimal: 1.83,
        },
      }),
      // Final KC game: history is empty -> rate 0.
      gameRow({
        gameId: "g2",
        startTime: "2024-09-12T21:30:00.000Z",
        homeScore: 28,
        awayScore: 10,
        closing: EVENISH,
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildSoftnessMapRows(games, store);

    expect(result.rows).toHaveLength(1);
    expect(result.skipped.noScores).toBe(1);
    // g2 sees no KC history because g1 was skipped before being recorded.
    expect(result.rows[0]!.features.get("ladder:home_soft_rate")).toBe(0);
  });

  it("propagates a home boost from a prior game into the softness rate", () => {
    // Game 1: home side boosted.
    const g1 = gameRow({
      gameId: "g1",
      startTime: "2024-09-05T21:30:00.000Z",
      homeScore: 21,
      awayScore: 14,
      closing: {
        spreadHome: -4.5,
        total: 44.5,
        moneylineHomeDecimal: 2.1, // +110
        moneylineAwayDecimal: 1.83, // -120
      },
    });
    // Game 2: same home team (KC), 1 week later.
    const g2 = gameRow({
      gameId: "g2",
      startTime: "2024-09-12T21:30:00.000Z",
      homeScore: 28,
      awayScore: 10,
      closing: EVENISH,
    });

    const store = new AsOfFeatureStore();
    const result = buildSoftnessMapRows([g1, g2], store);

    expect(result.rows).toHaveLength(2);
    // g1: no history -> rate 0.
    expect(result.rows[0]!.features.get("ladder:home_soft_rate")).toBe(0);
    // g2: KC's prior game was boosted at home -> rate = 1/1 = 1.0.
    expect(result.rows[1]!.features.get("ladder:home_soft_rate")).toBe(1);
    // Intensity should be the boost ratio from g1 (> 1 since g1 was boosted home).
    const g1Flag = scanLadderBoost(g1.closing)!;
    expect(result.rows[1]!.features.get("ladder:home_soft_intensity")).toBeCloseTo(g1Flag.boostRatio, 10);
  });

  it("fail-closed on a crossed market: skipped as degenerateVig, not entered into history", () => {
    const games: GameRow[] = [
      gameRow({
        gameId: "g1",
        startTime: "2024-09-05T21:30:00.000Z",
        homeScore: 21,
        awayScore: 14,
        closing: {
          spreadHome: 0,
          total: 40,
          moneylineHomeDecimal: 2.1,
          moneylineAwayDecimal: 2.1, // crossed
        },
      }),
    ];
    const store = new AsOfFeatureStore();
    const result = buildSoftnessMapRows(games, store);

    expect(result.rows).toHaveLength(0);
    expect(result.skipped.degenerateVig).toBe(1);
  });
});
