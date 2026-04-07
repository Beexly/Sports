import { describe, it, expect } from "vitest";
import {
  americanToImpliedProbability,
  clamp,
  scoreGame,
  scoreGames,
} from "../scoring.js";
import type { OddsInput } from "@sports/types";

// ============================================================
// americanToImpliedProbability
// ============================================================

describe("americanToImpliedProbability", () => {
  it("converts positive American odds correctly", () => {
    // +100 = 50% implied probability
    expect(americanToImpliedProbability(100)).toBeCloseTo(0.5);
    // +200 = 33.3%
    expect(americanToImpliedProbability(200)).toBeCloseTo(0.333, 2);
  });

  it("converts negative American odds correctly", () => {
    // -100 = 50%
    expect(americanToImpliedProbability(-100)).toBeCloseTo(0.5);
    // -110 = 52.4% (standard vig)
    expect(americanToImpliedProbability(-110)).toBeCloseTo(0.524, 2);
    // -200 = 66.7%
    expect(americanToImpliedProbability(-200)).toBeCloseTo(0.667, 2);
  });

  it("returns valid probability range", () => {
    const prob = americanToImpliedProbability(-150);
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThan(1);
  });
});

// ============================================================
// clamp
// ============================================================

describe("clamp", () => {
  it("clamps value to minimum", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("clamps value to maximum", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("returns value unchanged when in range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

// ============================================================
// scoreGame
// ============================================================

const makeOddsInput = (overrides: Partial<OddsInput> = {}): OddsInput => ({
  gameId: "game-1",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-10T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: [
    // 4 bookmakers with consistent spread
    {
      bookmaker: "fanduel",
      market: "SPREADS",
      spread: -3.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    },
    {
      bookmaker: "draftkings",
      market: "SPREADS",
      spread: -3.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    },
    {
      bookmaker: "betmgm",
      market: "SPREADS",
      spread: -3.0,
      homeSpreadPrice: -115,
      awaySpreadPrice: -105,
    },
    {
      bookmaker: "caesars",
      market: "SPREADS",
      spread: -3.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    },
    // Totals
    {
      bookmaker: "fanduel",
      market: "TOTALS",
      total: 48.5,
      overPrice: -110,
      underPrice: -110,
    },
    {
      bookmaker: "draftkings",
      market: "TOTALS",
      total: 49.0,
      overPrice: -112,
      underPrice: -108,
    },
    {
      bookmaker: "betmgm",
      market: "TOTALS",
      total: 48.5,
      overPrice: -110,
      underPrice: -110,
    },
    // Moneyline
    {
      bookmaker: "fanduel",
      market: "H2H",
      homePrice: -180,
      awayPrice: 155,
    },
    {
      bookmaker: "draftkings",
      market: "H2H",
      homePrice: -175,
      awayPrice: 150,
    },
    {
      bookmaker: "betmgm",
      market: "H2H",
      homePrice: -180,
      awayPrice: 155,
    },
  ],
  ...overrides,
});

describe("scoreGame", () => {
  it("returns an array of picks", () => {
    const picks = scoreGame(makeOddsInput());
    expect(Array.isArray(picks)).toBe(true);
  });

  it("returns picks sorted by confidence descending", () => {
    const picks = scoreGame(makeOddsInput());
    for (let i = 0; i < picks.length - 1; i++) {
      expect(picks[i]!.confidence).toBeGreaterThanOrEqual(
        picks[i + 1]!.confidence
      );
    }
  });

  it("only returns picks with confidence >= 50", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      expect(pick.confidence).toBeGreaterThanOrEqual(50);
    }
  });

  it("assigns PREMIUM tier to picks with confidence >= 70", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      if (pick.confidence >= 70) {
        expect(pick.tier).toBe("PREMIUM");
      } else {
        expect(pick.tier).toBe("FREE");
      }
    }
  });

  it("each pick has a valid pickType", () => {
    const picks = scoreGame(makeOddsInput());
    const validTypes = new Set(["SPREAD", "MONEYLINE", "TOTAL"]);
    for (const pick of picks) {
      expect(validTypes.has(pick.pickType)).toBe(true);
    }
  });

  it("each pick has model version set", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      expect(pick.modelVersion).toBeTruthy();
      expect(pick.modelVersion).toMatch(/^v\d+\.\d+\.\d+$/);
    }
  });

  it("each pick has non-empty reasoning", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      expect(pick.reasoning.length).toBeGreaterThan(20);
    }
  });

  it("returns empty array when insufficient bookmakers", () => {
    const input = makeOddsInput({
      bookmakerOdds: [
        { bookmaker: "fanduel", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      ],
    });
    const picks = scoreGame(input);
    // Spread pick should be filtered out (< MIN_BOOKMAKERS)
    const spreadPicks = picks.filter((p) => p.pickType === "SPREAD");
    expect(spreadPicks.length).toBe(0);
  });

  it("confidence is within valid range 0-100", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      expect(pick.confidence).toBeGreaterThanOrEqual(0);
      expect(pick.confidence).toBeLessThanOrEqual(100);
    }
  });
});

// ============================================================
// scoreGames
// ============================================================

describe("scoreGames", () => {
  it("scores multiple games and returns all picks sorted by confidence", () => {
    const inputs = [
      makeOddsInput({ gameId: "game-1" }),
      makeOddsInput({
        gameId: "game-2",
        homeTeam: "Cowboys",
        awayTeam: "Giants",
      }),
    ];
    const picks = scoreGames(inputs);

    expect(picks.length).toBeGreaterThan(0);

    // Sorted descending
    for (let i = 0; i < picks.length - 1; i++) {
      expect(picks[i]!.confidence).toBeGreaterThanOrEqual(
        picks[i + 1]!.confidence
      );
    }
  });

  it("returns empty array for empty input", () => {
    expect(scoreGames([])).toEqual([]);
  });
});
