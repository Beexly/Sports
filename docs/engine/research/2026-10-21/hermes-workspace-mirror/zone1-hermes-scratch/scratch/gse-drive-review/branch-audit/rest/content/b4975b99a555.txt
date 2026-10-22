import { describe, it, expect } from "vitest";
import {
  americanToImpliedProbability,
  removeVig,
  clamp,
  scoreGame,
  scoreGames,
} from "../scoring.js";
import {
  computeLineMovementScore,
  computeRestAdvantageScore,
  computeHistoricalFormScore,
  computeDataQuality,
  computeHeadToHeadScore,
  computeVenueFormScore,
  computeCrossMarketScore,
  computeUncertaintyPenalty,
  computeScheduleStressScore,
} from "../game-context.js";
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

// ============================================================
// Game context signals
// ============================================================

describe("computeLineMovementScore", () => {
  it("returns 0 with no opening line data", () => {
    const { score, delta } = computeLineMovementScore(null, -3.5, "SPREAD", "HOME");
    expect(score).toBe(0);
    expect(delta).toBeNull();
  });

  it("returns 0 when line is unchanged", () => {
    const { score, delta } = computeLineMovementScore(-3.5, -3.5, "SPREAD", "HOME");
    expect(score).toBe(0);
    expect(delta).toBe(0);
  });

  it("positive score when line moves to confirm home pick (spread goes more negative)", () => {
    // Home spread: -3.5 → -4.5 (delta = -1.0): home being bet, confirms HOME pick
    const { score } = computeLineMovementScore(-3.5, -4.5, "SPREAD", "HOME");
    expect(score).toBeGreaterThan(0);
  });

  it("negative score when line moves against home pick (spread goes less negative)", () => {
    // Home spread: -3.5 → -2.5 (delta = +1.0): away being bet, fades HOME pick
    const { score } = computeLineMovementScore(-3.5, -2.5, "SPREAD", "HOME");
    expect(score).toBeLessThan(0);
  });

  it("confirms OVER pick when total moves up", () => {
    const { score } = computeLineMovementScore(48.0, 49.5, "TOTAL", "OVER");
    expect(score).toBeGreaterThan(0);
  });

  it("fades OVER pick when total moves down", () => {
    const { score } = computeLineMovementScore(49.5, 48.0, "TOTAL", "OVER");
    expect(score).toBeLessThan(0);
  });

  it("score is capped at LINE_MOVEMENT_COMPONENT_MAX (15)", () => {
    const { score } = computeLineMovementScore(-3.5, -10.5, "SPREAD", "HOME");
    expect(score).toBeLessThanOrEqual(15);
    expect(score).toBeGreaterThan(0);
  });
});

describe("computeRestAdvantageScore", () => {
  it("returns 0 when no data available", () => {
    const { score } = computeRestAdvantageScore(null, null, false, false, "HOME");
    expect(score).toBe(0);
  });

  it("negative for HOME when home is on back-to-back", () => {
    const { score } = computeRestAdvantageScore(1, 3, true, false, "HOME");
    expect(score).toBeLessThan(0);
  });

  it("positive for HOME when away is on back-to-back", () => {
    const { score } = computeRestAdvantageScore(3, 1, false, true, "HOME");
    expect(score).toBeGreaterThan(0);
  });

  it("positive for AWAY when home is on back-to-back", () => {
    const { score } = computeRestAdvantageScore(1, 3, true, false, "AWAY");
    expect(score).toBeGreaterThan(0);
  });

  it("home with 3 more rest days = positive home advantage", () => {
    const { score } = computeRestAdvantageScore(4, 1, false, false, "HOME");
    expect(score).toBeGreaterThan(0);
  });

  it("score bounded between -10 and +10", () => {
    const { score } = computeRestAdvantageScore(0, 10, true, false, "HOME");
    expect(score).toBeGreaterThanOrEqual(-10);
    expect(score).toBeLessThanOrEqual(10);
  });
});

describe("computeHistoricalFormScore", () => {
  it("returns null signal for small samples", () => {
    const { score, atsPct } = computeHistoricalFormScore({ wins: 3, losses: 1, pushes: 0, sampleSize: 4 }, "Home");
    expect(score).toBe(0);
    expect(atsPct).toBeNull();
  });

  it("returns strong positive signal for 65%+ ATS record", () => {
    const { score } = computeHistoricalFormScore({ wins: 10, losses: 4, pushes: 1, sampleSize: 15 }, "Home");
    expect(score).toBe(10);
  });

  it("returns negative signal for ≤35% ATS record", () => {
    const { score } = computeHistoricalFormScore({ wins: 3, losses: 10, pushes: 2, sampleSize: 15 }, "Home");
    expect(score).toBe(-10);
  });

  it("returns 0 for neutral ATS record (50%)", () => {
    const { score } = computeHistoricalFormScore({ wins: 7, losses: 7, pushes: 1, sampleSize: 15 }, "Home");
    expect(score).toBe(0);
  });
});

describe("computeDataQuality", () => {
  it("returns high quality for fresh, deep, multi-market data", () => {
    const { qualityScore, penalty } = computeDataQuality(12, 2, true, true, true);
    expect(qualityScore).toBeGreaterThanOrEqual(80);
    expect(penalty).toBe(0);
  });

  it("applies penalty for stale data (> 90 min old)", () => {
    const { qualityScore, penalty } = computeDataQuality(5, 120, true, false, false);
    expect(qualityScore).toBeLessThan(50);
    expect(penalty).toBeLessThan(0);
  });

  it("applies larger penalty for very low quality (< 30)", () => {
    const { penalty } = computeDataQuality(0, 200, false, false, false);
    expect(penalty).toBe(-15);
  });

  it("quality score is capped at 100", () => {
    const { qualityScore } = computeDataQuality(20, 0, true, true, true);
    expect(qualityScore).toBeLessThanOrEqual(100);
  });
});

describe("scoreGame — context integration", () => {
  it("lower confidence when data quality is poor (stale, thin market)", () => {
    const base = scoreGame(makeOddsInput());
    const withBadContext = scoreGame(makeOddsInput({
      context: {
        bookmakerCoverageMax: 2,
        dataFreshnessMinutes: 200,  // very stale
        hasSpreadMarket: true,
        hasTotalMarket: false,
        hasH2HMarket: false,
      },
    }));

    const baseConf = base.find((p) => p.pickType === "SPREAD")?.confidence ?? 0;
    const contextConf = withBadContext.find((p) => p.pickType === "SPREAD")?.confidence ?? 0;
    // Stale + thin market should lower confidence
    expect(contextConf).toBeLessThanOrEqual(baseConf);
  });

  it("line movement score appears in factorBreakdown when context provided", () => {
    const picks = scoreGame(makeOddsInput({
      context: {
        openingSpread: -3.5,
        currentSpread: -5.5,  // moved 2pts toward home
        hasSpreadMarket: true,
        hasTotalMarket: true,
        hasH2HMarket: true,
        bookmakerCoverageMax: 5,
        dataFreshnessMinutes: 5,
      },
    }));
    const spreadPick = picks.find((p) => p.pickType === "SPREAD");
    if (spreadPick) {
      // Line movement score should be non-zero
      expect(spreadPick.factorBreakdown.lineMovementScore).not.toBe(0);
    }
  });

  it("modelVersion is v6.0.0", () => {
    const picks = scoreGame(makeOddsInput());
    expect(picks[0]?.modelVersion).toBe("v6.0.0");
  });
});

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

// ============================================================
// v5: Schedule density / stress
// ============================================================

describe("computeScheduleStressScore", () => {
  it("returns 0 when both densities are null", () => {
    const { score, factor } = computeScheduleStressScore(null, null, "HOME");
    expect(score).toBe(0);
    expect(factor).toBeNull();
  });

  it("returns 0 when one density is null (incomplete data)", () => {
    const { score } = computeScheduleStressScore(3, null, "HOME");
    expect(score).toBe(0);
  });

  it("returns 0 when densities are equal (no asymmetry)", () => {
    const { score } = computeScheduleStressScore(3, 3, "HOME");
    expect(score).toBe(0);
  });

  it("returns 0 when density difference is less than 2 (below threshold)", () => {
    const { score } = computeScheduleStressScore(2, 1, "HOME");
    expect(score).toBe(0);
  });

  it("returns 0 for OVER/UNDER picks (totals are side-agnostic)", () => {
    const { score } = computeScheduleStressScore(4, 1, "OVER");
    expect(score).toBe(0);
  });

  it("penalizes HOME pick when home team is on denser schedule", () => {
    // Home played 4 games in last 7 days, away played 1 — home more fatigued
    const { score, factor } = computeScheduleStressScore(4, 1, "HOME");
    expect(score).toBeLessThan(0);
    expect(factor?.impact).toBe("negative");
  });

  it("rewards HOME pick when away team is on denser schedule", () => {
    // Away played 4 games in last 7 days, home played 1 — away more fatigued
    const { score, factor } = computeScheduleStressScore(1, 4, "HOME");
    expect(score).toBeGreaterThan(0);
    expect(factor?.impact).toBe("positive");
  });

  it("flips sign for AWAY pick (symmetric)", () => {
    const homeScore = computeScheduleStressScore(1, 4, "HOME").score;
    const awayScore = computeScheduleStressScore(1, 4, "AWAY").score;
    expect(homeScore).toBeGreaterThan(0);
    expect(awayScore).toBeLessThan(0);
    expect(homeScore).toBe(-awayScore);
  });

  it("caps score at ±5", () => {
    const { score: highHome } = computeScheduleStressScore(7, 0, "HOME");
    const { score: highAway } = computeScheduleStressScore(0, 7, "HOME");
    expect(Math.abs(highHome)).toBeLessThanOrEqual(5);
    expect(Math.abs(highAway)).toBeLessThanOrEqual(5);
  });
});

// ============================================================
// v4: Head-to-head form
// ============================================================

describe("computeHeadToHeadScore", () => {
  it("returns 0 for null input", () => {
    const { score, atsPct, factor } = computeHeadToHeadScore(null);
    expect(score).toBe(0);
    expect(atsPct).toBeNull();
    expect(factor).toBeNull();
  });

  it("returns 0 for sample below minimum (< 5 games)", () => {
    const { score } = computeHeadToHeadScore({ wins: 3, losses: 1, pushes: 0, sampleSize: 4 });
    expect(score).toBe(0);
  });

  it("returns +5 for dominant H2H record (70%+)", () => {
    const { score } = computeHeadToHeadScore({ wins: 8, losses: 2, pushes: 0, sampleSize: 10 });
    expect(score).toBe(5);
  });

  it("returns +3 for favorable H2H record (60–69%)", () => {
    const { score } = computeHeadToHeadScore({ wins: 7, losses: 4, pushes: 0, sampleSize: 11 });
    // 7/11 ≈ 63.6% → should be +3
    expect(score).toBe(3);
  });

  it("returns -5 for poor H2H record (≤30%)", () => {
    const { score } = computeHeadToHeadScore({ wins: 2, losses: 8, pushes: 0, sampleSize: 10 });
    expect(score).toBe(-5);
  });

  it("returns -3 for below-average H2H record (31–40%)", () => {
    const { score } = computeHeadToHeadScore({ wins: 4, losses: 7, pushes: 0, sampleSize: 11 });
    // 4/11 ≈ 36.4% → should be -3
    expect(score).toBe(-3);
  });

  it("returns 0 for neutral H2H record (~50%)", () => {
    const { score } = computeHeadToHeadScore({ wins: 5, losses: 5, pushes: 0, sampleSize: 10 });
    expect(score).toBe(0);
  });

  it("includes positive factor description when score > 0", () => {
    const { factor } = computeHeadToHeadScore({ wins: 8, losses: 2, pushes: 0, sampleSize: 10 });
    expect(factor).not.toBeNull();
    expect(factor?.impact).toBe("positive");
    expect(factor?.name).toBe("Head-to-Head Form");
  });

  it("includes negative factor description when score < 0", () => {
    const { factor } = computeHeadToHeadScore({ wins: 2, losses: 8, pushes: 0, sampleSize: 10 });
    expect(factor).not.toBeNull();
    expect(factor?.impact).toBe("negative");
  });

  it("returns null factor for neutral record", () => {
    const { factor } = computeHeadToHeadScore({ wins: 5, losses: 5, pushes: 0, sampleSize: 10 });
    expect(factor).toBeNull();
  });
});

// ============================================================
// v4: Venue-specific ATS form
// ============================================================

describe("computeVenueFormScore", () => {
  it("returns 0 for null input", () => {
    const { score, factor } = computeVenueFormScore(null, "Home");
    expect(score).toBe(0);
    expect(factor).toBeNull();
  });

  it("returns 0 for sample below minimum (< 5 games)", () => {
    const { score } = computeVenueFormScore({ wins: 3, losses: 1, pushes: 0, sampleSize: 4 }, "Home");
    expect(score).toBe(0);
  });

  it("returns +5 for dominant venue record (65%+)", () => {
    const { score } = computeVenueFormScore({ wins: 7, losses: 3, pushes: 0, sampleSize: 10 }, "Home");
    expect(score).toBe(5);
  });

  it("returns +3 for solid venue record (58–64%)", () => {
    // 6/10 = 60% → +3
    const { score } = computeVenueFormScore({ wins: 6, losses: 4, pushes: 0, sampleSize: 10 }, "Away");
    expect(score).toBe(3);
  });

  it("returns -5 for poor venue record (≤35%)", () => {
    const { score } = computeVenueFormScore({ wins: 3, losses: 9, pushes: 0, sampleSize: 12 }, "Home");
    // 3/12 = 25% → -5
    expect(score).toBe(-5);
  });

  it("returns -3 for below-average venue record (36–42%)", () => {
    // 4/10 = 40% → -3
    const { score } = computeVenueFormScore({ wins: 4, losses: 6, pushes: 0, sampleSize: 10 }, "Away");
    expect(score).toBe(-3);
  });

  it("includes venue label in factor description", () => {
    const { factor } = computeVenueFormScore({ wins: 7, losses: 3, pushes: 0, sampleSize: 10 }, "Home");
    expect(factor?.name).toBe("Home Venue Form");
    expect(factor?.description).toContain("home");
  });
});

// ============================================================
// v4: Cross-market consistency
// ============================================================

describe("computeCrossMarketScore", () => {
  it("returns 0 for non-SPREAD market types", () => {
    const { score } = computeCrossMarketScore("OVER", 0.65, "TOTAL");
    expect(score).toBe(0);
  });

  it("returns 0 when mlFairProbHome is null", () => {
    const { score } = computeCrossMarketScore("HOME", null, "SPREAD");
    expect(score).toBe(0);
  });

  it("returns 0 when ML has weak conviction (within 5% of 50%)", () => {
    const { score } = computeCrossMarketScore("HOME", 0.52, "SPREAD");
    expect(score).toBe(0);
  });

  it("returns +4 when spread and ML agree (both favor home)", () => {
    const { score } = computeCrossMarketScore("HOME", 0.65, "SPREAD");
    expect(score).toBe(4);
  });

  it("returns +4 when spread and ML agree (both favor away)", () => {
    const { score } = computeCrossMarketScore("AWAY", 0.35, "SPREAD");
    expect(score).toBe(4);
  });

  it("returns -3 when spread and ML disagree (spread HOME but ML favors away)", () => {
    const { score } = computeCrossMarketScore("HOME", 0.35, "SPREAD");
    expect(score).toBe(-3);
  });

  it("returns -3 when spread and ML disagree (spread AWAY but ML favors home)", () => {
    const { score } = computeCrossMarketScore("AWAY", 0.65, "SPREAD");
    expect(score).toBe(-3);
  });

  it("includes positive factor when markets agree", () => {
    const { factor } = computeCrossMarketScore("HOME", 0.65, "SPREAD");
    expect(factor?.impact).toBe("positive");
    expect(factor?.name).toBe("Cross-Market Alignment");
  });

  it("includes negative factor when markets diverge", () => {
    const { factor } = computeCrossMarketScore("HOME", 0.35, "SPREAD");
    expect(factor?.impact).toBe("negative");
    expect(factor?.name).toBe("Cross-Market Divergence");
  });
});

// ============================================================
// v4: Uncertainty penalty
// ============================================================

describe("computeUncertaintyPenalty", () => {
  it("returns 0 when no signals conflict", () => {
    const { penalty } = computeUncertaintyPenalty(5, 5, 3, 4);
    expect(penalty).toBe(0);
  });

  it("returns 0 when all signals are neutral", () => {
    const { penalty } = computeUncertaintyPenalty(0, 0, 0, 0);
    expect(penalty).toBe(0);
  });

  it("applies -4 penalty for line movement vs historical conflict", () => {
    // Line moving strongly against (-8), but historical form is positive (+5)
    const { penalty } = computeUncertaintyPenalty(-8, 5, 0, 0);
    expect(penalty).toBeLessThan(0);
    expect(penalty).toBeGreaterThanOrEqual(-8);
  });

  it("applies penalty for market fading historically strong side", () => {
    // Line moving very strongly against (-10), historical form very positive (+7)
    const { penalty } = computeUncertaintyPenalty(-10, 7, 0, 0);
    expect(penalty).toBeLessThan(0);
  });

  it("applies additional penalty when cross-market also disagrees", () => {
    // Line fade + cross-market disagree = multiple conflicts
    const { penalty: single } = computeUncertaintyPenalty(-8, 5, 0, 0);
    const { penalty: multiple } = computeUncertaintyPenalty(-8, 5, 0, -3);
    expect(multiple).toBeLessThanOrEqual(single);
  });

  it("caps penalty at -8 regardless of conflict count", () => {
    // Max conflicts scenario
    const { penalty } = computeUncertaintyPenalty(-12, 10, 5, -3);
    expect(penalty).toBeGreaterThanOrEqual(-8);
  });

  it("includes factor description when penalty applied", () => {
    const { factor } = computeUncertaintyPenalty(-8, 5, 0, 0);
    expect(factor).not.toBeNull();
    expect(factor?.impact).toBe("negative");
    expect(factor?.name).toBe("Signal Conflict");
  });

  it("returns null factor when no conflict", () => {
    const { factor } = computeUncertaintyPenalty(5, 5, 3, 4);
    expect(factor).toBeNull();
  });
});
