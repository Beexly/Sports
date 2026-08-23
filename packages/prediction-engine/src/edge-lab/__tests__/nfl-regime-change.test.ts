/**
 * NFL change-point / regime detector tests.
 *
 * Covers:
 *  - scanRegimeChange: z-score computation, threshold direction, fail-closed
 *    on insufficient history / no dispersion / invalid market.
 *  - buildRegimeChangeRows: leak-safe row emission, self-exclusion (prior
 *    games only), null-score skip, as-of audit tripwire.
 */
import { describe, expect, it } from "vitest";
import { AsOfFeatureStore } from "../asof-store.js";
import type { GameRow } from "../game-row.js";
import {
  buildRegimeChangeRows,
  scanRegimeChange,
  CHANGEPOINT_FEATURE_KEYS,
} from "../features/nfl-regime-change.js";

const DECISION_LEAD_MS = 60 * 60_000;
const GAME_DURATION_MS = 4 * 3_600_000;

const EVENISH = {
  spreadHome: 0,
  total: 41,
  moneylineHomeDecimal: 1.95,
  moneylineAwayDecimal: 1.95,
} as const;

/** Helper: build a GameRow with overrides. Scores default to final. */
function gameRow(overrides: {
  gameId: string;
  startTime: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore: number | null;
  awayScore: number | null;
  closing?: {
    spreadHome: number | null;
    total: number | null;
    moneylineHomeDecimal: number | null;
    moneylineAwayDecimal: number | null;
  };
}): GameRow {
  return {
    sport: "nfl",
    gameId: overrides.gameId,
    season: 2024,
    week: 1,
    startTime: overrides.startTime,
    homeTeam: overrides.homeTeam ?? "KC",
    awayTeam: overrides.awayTeam ?? "BUF",
    homeScore: overrides.homeScore,
    awayScore: overrides.awayScore,
    closing: overrides.closing ?? EVENISH,
  };
}

const iso = (ms: number): string => new Date(ms).toISOString();
const T0 = Date.parse("2024-09-05T21:30:00.000Z");

/** 8 games, KC always home vs BUF always away, with qClose varying enough to
 * maintain non-zero dispersion (std > 0) in the trailing window. */
function buildStableGames(): GameRow[] {
  const games: GameRow[] = [];
  // Prices vary slightly so qHome has spread: ~0.52, 0.53, 0.51, 0.52, ...
  const prices: Array<[number, number]> = [
    [1.85, 2.0],
    [1.83, 2.05],
    [1.87, 1.95],
    [1.85, 2.0],
    [1.84, 2.03],
    [1.86, 1.97],
    [1.85, 2.0],
    [1.83, 2.05],
  ];
  for (let i = 0; i < 8; i++) {
    const [mh, ma] = prices[i]!;
    games.push(
      gameRow({
        gameId: `g${i}`,
        startTime: iso(T0 + i * 7 * 24 * 3_600_000),
        homeTeam: "KC",
        awayTeam: "BUF",
        homeScore: 21 + i,
        awayScore: 14,
        closing: { ...EVENISH, moneylineHomeDecimal: mh, moneylineAwayDecimal: ma },
      }),
    );
  }
  return games;
}

describe("scanRegimeChange", () => {
  it("returns null when history is below minHistory", () => {
    expect(
      scanRegimeChange(EVENISH, [0.5, 0.6], [0.5, 0.4], { minHistory: 4 }),
    ).toBeNull();
    expect(
      scanRegimeChange(EVENISH, [0.5, 0.6, 0.5, 0.5], [0.5, 0.4], { minHistory: 4 }),
    ).toBeNull();
  });

  it("returns null when history has no dispersion (std == 0)", () => {
    const hist = [0.6, 0.6, 0.6, 0.6]; // zero variance
    expect(scanRegimeChange(EVENISH, hist, hist, { minHistory: 4 })).toBeNull();
  });

  it("computes z-scores and zero shifts for a stable regime", () => {
    // qHome = 0.5 (1.95/1.95 even). History centered on 0.5 with small spread.
    const homeHist = [0.52, 0.48, 0.51, 0.49];
    const awayHist = [0.48, 0.52, 0.49, 0.51];
    const result = scanRegimeChange(EVENISH, homeHist, awayHist, {
      zThreshold: 1.5,
      minHistory: 4,
    });
    expect(result).not.toBeNull();
    expect(result!.shiftHome).toBe(0);
    expect(result!.shiftAway).toBe(0);
    expect(result!.volHome).toBeCloseTo(0.0158, 3);
    expect(result!.qClose).toBeCloseTo(0.5, 10);
  });

  it("fires a +shift when qHome jumps up beyond threshold", () => {
    // History: qHome tightly around 0.4 (home underdog).
    // Current: EVENISH qHome = 0.5 — a step UP for the home side.
    // With low dispersion, 0.5 vs mean 0.4 should exceed z=1.5.
    const homeHist = [0.41, 0.39, 0.40, 0.40]; // mean 0.4, std ~0.008
    const awayHist = [0.59, 0.61, 0.60, 0.60]; // mean 0.6, std ~0.008
    const result = scanRegimeChange(EVENISH, homeHist, awayHist, {
      zThreshold: 1.5,
      minHistory: 4,
    });
    expect(result).not.toBeNull();
    expect(result!.shiftHome).toBe(1);
    expect(result!.zHome).toBeGreaterThan(1.5);
  });

  it("fires a -shift when qHome drops below threshold", () => {
    // History: qHome tightly around 0.6 (home favorite).
    // Current: EVENISH qHome = 0.5 — a step DOWN.
    const homeHist = [0.61, 0.59, 0.60, 0.60]; // mean 0.6, std ~0.008
    const awayHist = [0.39, 0.41, 0.40, 0.40];
    const result = scanRegimeChange(EVENISH, homeHist, awayHist, {
      zThreshold: 1.5,
      minHistory: 4,
    });
    expect(result).not.toBeNull();
    expect(result!.shiftHome).toBe(-1);
    expect(result!.zHome).toBeLessThan(-1.5);
  });

  it("returns null on missing moneylines", () => {
    const missingMl = { ...EVENISH, moneylineHomeDecimal: null, moneylineAwayDecimal: 1.95 };
    expect(
      scanRegimeChange(missingMl, [0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]),
    ).toBeNull();
  });

  it("returns null on a crossed (sub-vig) book", () => {
    const crossed = { ...EVENISH, moneylineHomeDecimal: 2.1, moneylineAwayDecimal: 2.1 };
    expect(
      scanRegimeChange(crossed, [0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]),
    ).toBeNull(); // devig returns null for sub-vig
  });

  it("returns null on invalid odds (d <= 1)", () => {
    const invalid = { ...EVENISH, moneylineHomeDecimal: 0.5, moneylineAwayDecimal: 2.0 };
    expect(
      scanRegimeChange(invalid, [0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]),
    ).toBeNull();
  });

  it("respects a higher zThreshold override (no shift on a 1-sigma move)", () => {
    // 0.5 vs mean 0.4 with std ~0.05 -> z ~ 2.0. With threshold 5, no shift.
    const homeHist = [0.45, 0.35, 0.40, 0.40];
    const awayHist = [0.55, 0.65, 0.60, 0.60];
    const result = scanRegimeChange(EVENISH, homeHist, awayHist, {
      zThreshold: 5,
      minHistory: 4,
    });
    expect(result).not.toBeNull();
    expect(result!.shiftHome).toBe(0);
    expect(result!.zHome).toBeCloseTo(2.83, 1);
  });
});

describe("buildRegimeChangeRows", () => {
  it("emits rows only when both teams have >= minHistory prior games", () => {
    const games = buildStableGames();
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    // Games 0-3: insufficientHistory (no prior history yet).
    // Games 4-7: both teams have 4 prior games on their side -> evaluated.
    expect(result.rows.length).toBe(4);
    expect(result.skipped.insufficientHistory).toBe(4);
    expect(result.skipped.noScores).toBe(0);
    expect(result.rows.length + Object.values(result.skipped).reduce((a, b) => a + b, 0)).toBe(8);
  });

  it("skips non-final games via noScores", () => {
    const games: GameRow[] = [];
    const prices: Array<[number, number]> = [
      [1.85, 2.0],
      [1.83, 2.05],
      [1.87, 1.95],
      [1.85, 2.0],
      [1.84, 2.03],
      [1.86, 1.97],
      [1.85, 2.0],
    ];
    for (let i = 0; i < 7; i++) {
      const scores: [number | null, number | null] =
        i === 2 ? [null, null] : [21 + i, 14];
      const [mh, ma] = prices[i]!;
      games.push(
        gameRow({
          gameId: `g${i}`,
          startTime: iso(T0 + i * 7 * 24 * 3_600_000),
          homeTeam: "KC",
          awayTeam: "BUF",
          homeScore: scores[0],
          awayScore: scores[1],
          closing: { ...EVENISH, moneylineHomeDecimal: mh, moneylineAwayDecimal: ma },
        }),
      );
    }
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    expect(result.skipped.noScores).toBe(1);
    // Game 2 (null scores) is skipped before recording history.
    // Games 0,1: insufficient (< 4 prior). Game 2: noScores. Games 3,4:
    // insufficient (history excludes g2). Game 5: 4 prior valid (0,1,3,4).
    // Game 6: 5 prior valid. With varied prices, std > 0 so rows emit.
    const totalSkipped = Object.values(result.skipped).reduce((a, b) => a + b, 0);
    expect(result.rows.length + totalSkipped).toBe(7);
    expect(result.skipped.insufficientHistory).toBe(4);
    expect(result.rows.length).toBe(2);
  });

  it("skip reasons are mutually exclusive and exhaustive", () => {
    // Mix of valid games and invalid markets.
    const games: GameRow[] = [];
    const validPrices: Array<[number, number]> = [
      [1.85, 2.0],
      [1.83, 2.05],
      [1.87, 1.95],
      [1.85, 2.0],
      [1.84, 2.03],
      [1.86, 1.97],
      [1.85, 2.0],
      [1.83, 2.05],
    ];
    for (let i = 0; i < 8; i++) {
      let closing: GameRow["closing"];
      if (i === 0) {
        closing = { ...EVENISH, moneylineHomeDecimal: null, moneylineAwayDecimal: 1.95 }; // noMoneyline
      } else if (i === 1) {
        closing = { ...EVENISH, moneylineHomeDecimal: 2.1, moneylineAwayDecimal: 2.1 }; // degenerateVig (crossed)
      } else {
        const [mh, ma] = validPrices[i]!;
        closing = { ...EVENISH, moneylineHomeDecimal: mh, moneylineAwayDecimal: ma };
      }
      games.push(
        gameRow({
          gameId: `g${i}`,
          startTime: iso(T0 + i * 7 * 24 * 3_600_000),
          homeTeam: "KC",
          awayTeam: "BUF",
          homeScore: 21 + i,
          awayScore: 14,
          closing,
        }),
      );
    }
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    const total = Object.values(result.skipped).reduce((a, b) => a + b, 0);
    expect(total + result.rows.length).toBe(8);
    expect(result.skipped.noMoneyline).toBe(1);
    expect(result.skipped.degenerateVig).toBe(1);
    // i=0 (noMoneyline) and i=1 (degenerateVig) don't contribute history.
    // i=2,3: insufficient (history < 4).
    // i=4: 2 prior valid -> insufficient.
    // i=5: 3 prior valid -> insufficient.
    // i=6: 4 prior valid -> evaluated.
    // i=7: 5 prior valid -> evaluated.
    expect(result.skipped.insufficientHistory).toBe(4);
    expect(result.rows.length).toBe(2);
  });

  it("the as-of audit tripwire passes (zero lookahead) after a clean run", () => {
    const games = buildStableGames();
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    store.assertNoLookahead();
    expect(result.rows.length).toBe(4);
  });

  it("features vector covers the full CHANGEPOINT_FEATURE_KEYS set", () => {
    const games = buildStableGames();
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    for (const row of result.rows) {
      for (const key of CHANGEPOINT_FEATURE_KEYS) {
        expect(row.features.has(key)).toBe(true);
      }
    }
  });

  it("decisionAt is exactly kickoff - DECISION_LEAD_MS", () => {
    const games = buildStableGames();
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    // The last emitted row corresponds to the last game (index 7).
    const last = result.rows[result.rows.length - 1];
    expect(last).toBeDefined();
    expect(last!.decisionAt).toBe(
      new Date(T0 + 7 * 7 * 24 * 3_600_000 - DECISION_LEAD_MS).toISOString(),
    );
  });

  it("self-exclusion: a game's own qClose is not in its own regime history", () => {
    // KC always home, BUF always away. Prices vary so dispersion > 0.
    // First 4 games: mild fav (q ~ 0.52). Last 4: strong fav (q ~ 0.65).
    // Game 4+ should detect the regime step.
    const games: GameRow[] = [];
    const prices: Array<[number, number]> = [
      [1.85, 2.0],   // mild
      [1.83, 2.05],  // mild
      [1.87, 1.95],  // mild
      [1.85, 2.0],   // mild
      [1.5, 2.7],    // strong fav (regime shift)
      [1.52, 2.65],
      [1.48, 2.75],
      [1.5, 2.7],
    ];
    for (let i = 0; i < 8; i++) {
      const [mh, ma] = prices[i]!;
      games.push(
        gameRow({
          gameId: `g${i}`,
          startTime: iso(T0 + i * 7 * 24 * 3_600_000),
          homeTeam: "KC",
          awayTeam: "BUF",
          homeScore: 21 + i,
          awayScore: 14,
          closing: { ...EVENISH, moneylineHomeDecimal: mh, moneylineAwayDecimal: ma },
        }),
      );
    }
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    // Games 0-3: insufficient history.
    // Games 4-7: 4 prior games each -> evaluated (with dispersion).
    expect(result.rows.length).toBe(4);
    store.assertNoLookahead();
  });

  it("canonicalizes relocated team codes (OAK -> LV)", () => {
    // KC vs (OAK|LV) across 6 games. Same franchise key.
    const games: GameRow[] = [];
    const prices: Array<[number, number]> = [
      [1.85, 2.0],
      [1.87, 1.95],
      [1.83, 2.05],
      [1.85, 2.0],
      [1.84, 2.03],
      [1.86, 1.97],
    ];
    for (let i = 0; i < 6; i++) {
      const team = i % 2 === 0 ? "OAK" : "LV";
      const [mh, ma] = prices[i]!;
      games.push(
        gameRow({
          gameId: `g${i}`,
          startTime: iso(T0 + i * 7 * 24 * 3_600_000),
          homeTeam: team,
          awayTeam: "KC",
          homeScore: 21 + i,
          awayScore: 14,
          closing: { ...EVENISH, moneylineHomeDecimal: mh, moneylineAwayDecimal: ma },
        }),
      );
    }
    const store = new AsOfFeatureStore();
    const result = buildRegimeChangeRows(games, store);
    // After 4 prior games (both teams canonicalized), games 4-5 are evaluated.
    expect(result.rows.length).toBe(2);
    expect(result.skipped.insufficientHistory).toBe(4);
  });
});
