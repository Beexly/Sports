import { describe, it, expect } from "vitest";
import {
  americanToImpliedProbability,
  removeVig,
  clamp,
  scoreGame,
  scoreGames,
} from "../scoring.js";
import type { OddsInput } from "@sports/types";
import { MODEL_VERSION } from "../constants.js";

// ============================================================
// Utility functions
// ============================================================

describe("americanToImpliedProbability", () => {
  it("converts +100 → 50%", () => {
    expect(americanToImpliedProbability(100)).toBeCloseTo(0.5);
  });

  it("converts +200 → 33.3%", () => {
    expect(americanToImpliedProbability(200)).toBeCloseTo(0.333, 2);
  });

  it("converts -110 → 52.4% (standard vig)", () => {
    expect(americanToImpliedProbability(-110)).toBeCloseTo(0.524, 2);
  });

  it("converts -200 → 66.7%", () => {
    expect(americanToImpliedProbability(-200)).toBeCloseTo(0.667, 2);
  });

  it("always returns value in (0, 1)", () => {
    for (const odds of [-500, -150, -110, +100, +150, +300]) {
      const prob = americanToImpliedProbability(odds);
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1);
    }
  });
});

describe("removeVig", () => {
  it("removes vig from balanced -110/-110 market", () => {
    const homeP = americanToImpliedProbability(-110);
    const awayP = americanToImpliedProbability(-110);
    const { home, away } = removeVig(homeP, awayP);
    expect(home).toBeCloseTo(0.5, 3);
    expect(away).toBeCloseTo(0.5, 3);
  });

  it("fair probs sum to 1.0", () => {
    const homeP = americanToImpliedProbability(-180);
    const awayP = americanToImpliedProbability(+155);
    const { home, away } = removeVig(homeP, awayP);
    expect(home + away).toBeCloseTo(1.0, 5);
  });

  it("handles equal zero case gracefully", () => {
    const { home, away } = removeVig(0, 0);
    expect(home).toBe(0.5);
    expect(away).toBe(0.5);
  });
});

describe("clamp", () => {
  it("clamps to minimum", () => expect(clamp(-10, 0, 100)).toBe(0));
  it("clamps to maximum", () => expect(clamp(150, 0, 100)).toBe(100));
  it("passes through in-range values", () => expect(clamp(50, 0, 100)).toBe(50));
  it("handles boundary minimum", () => expect(clamp(0, 0, 100)).toBe(0));
  it("handles boundary maximum", () => expect(clamp(100, 0, 100)).toBe(100));
});

// ============================================================
// Test data builder
// ============================================================

const makeOddsInput = (overrides: Partial<OddsInput> = {}): OddsInput => ({
  gameId: "game-test-1",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: [
    // Spread — 5 books, strong consensus home favored
    { bookmaker: "fanduel",    market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
    { bookmaker: "draftkings", market: "SPREADS", spread: -3.5, homeSpreadPrice: -112, awaySpreadPrice: -108 },
    { bookmaker: "betmgm",     market: "SPREADS", spread: -3.0, homeSpreadPrice: -115, awaySpreadPrice: -105 },
    { bookmaker: "caesars",    market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
    { bookmaker: "pointsbet",  market: "SPREADS", spread: -3.5, homeSpreadPrice: -108, awaySpreadPrice: -112 },
    // Totals — 4 books
    { bookmaker: "fanduel",    market: "TOTALS", total: 48.5, overPrice: -110, underPrice: -110 },
    { bookmaker: "draftkings", market: "TOTALS", total: 49.0, overPrice: -112, underPrice: -108 },
    { bookmaker: "betmgm",     market: "TOTALS", total: 48.5, overPrice: -110, underPrice: -110 },
    { bookmaker: "caesars",    market: "TOTALS", total: 49.0, overPrice: -108, underPrice: -112 },
    // Moneyline — 4 books, home favored
    { bookmaker: "fanduel",    market: "H2H", homePrice: -180, awayPrice: 155 },
    { bookmaker: "draftkings", market: "H2H", homePrice: -175, awayPrice: 150 },
    { bookmaker: "betmgm",     market: "H2H", homePrice: -180, awayPrice: 155 },
    { bookmaker: "caesars",    market: "H2H", homePrice: -185, awayPrice: 160 },
  ],
  ...overrides,
});

// ============================================================
// scoreGame — new precision fields
// ============================================================

describe("scoreGame — precision fields", () => {
  it("returns picks with all required fields", () => {
    const picks = scoreGame(makeOddsInput());
    expect(picks.length).toBeGreaterThan(0);

    for (const pick of picks) {
      // Core
      expect(pick.gameId).toBe("game-test-1");
      expect(pick.selection).toBeTruthy();
      expect(typeof pick.line).toBe("number");

      // New scoring fields
      expect(typeof pick.confidence).toBe("number");
      expect(typeof pick.edgeScore).toBe("number");
      expect(typeof pick.consensusPct).toBe("number");
      expect(typeof pick.bookmakerCount).toBe("number");

      // Classification
      expect(["FREE", "PREMIUM"]).toContain(pick.tier);
      expect(["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY", "LEAN"]).toContain(pick.pickGrade);
      expect(["LOW_RISK", "MODERATE", "HIGH_VARIANCE", "INJURY_RISK", "LINE_STEAM"]).toContain(pick.riskLevel);

      // Explainability
      expect(pick.reasoning.length).toBeGreaterThan(30);
      expect(pick.reasoningShort.length).toBeGreaterThan(10);
      expect(pick.factorBreakdown).toBeTruthy();
      expect(Array.isArray(pick.factorBreakdown.factors)).toBe(true);
      expect(pick.factorBreakdown.factors.length).toBeGreaterThan(0);

      // Metadata
      expect(pick.modelVersion).toBe(MODEL_VERSION);
      expect(pick.dataFreshnessAt).toBeInstanceOf(Date);
    }
  });

  it("confidence is in range 0–100", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      expect(pick.confidence).toBeGreaterThanOrEqual(0);
      expect(pick.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("edgeScore is in range 0–100", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      expect(pick.edgeScore).toBeGreaterThanOrEqual(0);
      expect(pick.edgeScore).toBeLessThanOrEqual(100);
    }
  });

  it("consensusPct is in range 0–1", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      expect(pick.consensusPct).toBeGreaterThanOrEqual(0);
      expect(pick.consensusPct).toBeLessThanOrEqual(1);
    }
  });

  it("bookmakerCount matches actual data", () => {
    const picks = scoreGame(makeOddsInput());
    const spreadPick = picks.find((p) => p.pickType === "SPREAD");
    expect(spreadPick?.bookmakerCount).toBe(5); // 5 spread bookmakers in test data
  });

  it("returns picks sorted by confidence descending", () => {
    const picks = scoreGame(makeOddsInput());
    for (let i = 0; i < picks.length - 1; i++) {
      expect(picks[i]!.confidence).toBeGreaterThanOrEqual(picks[i + 1]!.confidence);
    }
  });

  it("PREMIUM tier only when confidence >= 70", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      if (pick.confidence >= 70) {
        expect(pick.tier).toBe("PREMIUM");
      } else {
        expect(pick.tier).toBe("FREE");
      }
    }
  });

  it("ELITE_PLAY grade requires confidence >= 85 AND edgeScore >= 80", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      if (pick.pickGrade === "ELITE_PLAY") {
        expect(pick.confidence).toBeGreaterThanOrEqual(85);
        expect(pick.edgeScore).toBeGreaterThanOrEqual(80);
      }
    }
  });

  it("factorBreakdown has valid component scores", () => {
    const picks = scoreGame(makeOddsInput());
    for (const pick of picks) {
      const fb = pick.factorBreakdown;
      expect(fb.consensusScore).toBeGreaterThanOrEqual(0);
      expect(fb.marketDepthScore).toBeGreaterThanOrEqual(0);
      expect(fb.edgeScore).toBeGreaterThanOrEqual(0);
      expect(fb.volatilityPenalty).toBeLessThanOrEqual(0);
    }
  });

  it("returns empty array when no bookmakers", () => {
    const input = makeOddsInput({ bookmakerOdds: [] });
    expect(scoreGame(input)).toEqual([]);
  });

  it("filters picks below MIN_PUBLISH_CONFIDENCE", () => {
    // Single book with low consensus = should produce no publishable picks
    const input = makeOddsInput({
      bookmakerOdds: [
        { bookmaker: "fanduel", market: "SPREADS", spread: -1.0, homeSpreadPrice: -105, awaySpreadPrice: -115 },
        // Only 1 bookmaker = below MIN_BOOKMAKERS of 2
      ],
    });
    const picks = scoreGame(input);
    const spreadPicks = picks.filter((p) => p.pickType === "SPREAD");
    expect(spreadPicks.length).toBe(0);
  });
});

// ============================================================
// Risk level classification
// ============================================================

describe("scoreGame — risk level", () => {
  it("deep market with strong consensus = LOW_RISK or MODERATE", () => {
    const picks = scoreGame(makeOddsInput());
    const spread = picks.find((p) => p.pickType === "SPREAD");
    // 5 books, 80% consensus = should be at most MODERATE
    if (spread) {
      expect(["LOW_RISK", "MODERATE"]).toContain(spread.riskLevel);
    }
  });

  it("thin market (2 books) = HIGH_VARIANCE", () => {
    const input = makeOddsInput({
      bookmakerOdds: [
        { bookmaker: "fanduel",    market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { bookmaker: "draftkings", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      ],
    });
    const picks = scoreGame(input);
    const spread = picks.find((p) => p.pickType === "SPREAD");
    if (spread) {
      expect(spread.riskLevel).toBe("HIGH_VARIANCE");
    }
  });
});

// ============================================================
// scoreGames
// ============================================================

describe("scoreGames", () => {
  it("processes multiple games and returns all picks sorted", () => {
    const inputs = [
      makeOddsInput({ gameId: "g1" }),
      makeOddsInput({ gameId: "g2", homeTeam: "Cowboys", awayTeam: "Giants" }),
    ];
    const picks = scoreGames(inputs);
    expect(picks.length).toBeGreaterThan(0);
    for (let i = 0; i < picks.length - 1; i++) {
      expect(picks[i]!.confidence).toBeGreaterThanOrEqual(picks[i + 1]!.confidence);
    }
  });

  it("returns empty array for empty input", () => {
    expect(scoreGames([])).toEqual([]);
  });

  it("passes fetchedAt timestamp through to picks", () => {
    const at = new Date("2026-04-15T12:00:00Z");
    const picks = scoreGames([makeOddsInput()], at);
    for (const pick of picks) {
      expect(pick.dataFreshnessAt).toEqual(at);
    }
  });
});
