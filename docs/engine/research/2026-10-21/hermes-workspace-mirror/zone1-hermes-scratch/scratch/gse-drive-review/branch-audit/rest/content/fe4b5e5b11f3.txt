import { describe, it, expect } from "vitest";
import { computeGameContext } from "../game-context.js";
import type { GameContextInput } from "@sports/types";

function minimalContext(overrides: Partial<GameContextInput> = {}): GameContextInput {
  return {
    bookmakerCoverageMax: 8,
    dataFreshnessMinutes: 15,
    hasSpreadMarket: true,
    hasTotalMarket: true,
    hasH2HMarket: false,
    ...overrides,
  };
}

describe("computeGameContext — output shape", () => {
  it("returns all required score fields", () => {
    const result = computeGameContext(minimalContext(), "SPREAD", "HOME");
    expect(typeof result.lineMovementScore).toBe("number");
    expect(typeof result.restAdvantageScore).toBe("number");
    expect(typeof result.historicalFormScore).toBe("number");
    expect(typeof result.dataQualityPenalty).toBe("number");
    expect(typeof result.dataQualityScore).toBe("number");
    expect(typeof result.headToHeadScore).toBe("number");
    expect(typeof result.venueFormScore).toBe("number");
    expect(typeof result.uncertaintyPenalty).toBe("number");
    expect(typeof result.crossMarketScore).toBe("number");
    expect(typeof result.scheduleStressScore).toBe("number");
    expect(Array.isArray(result.factors)).toBe(true);
  });

  it("returns zero movement score when no opening spread is provided", () => {
    const result = computeGameContext(minimalContext(), "SPREAD", "HOME");
    expect(result.lineMovementScore).toBe(0);
  });

  it("returns zero rest score when no rest data is provided", () => {
    const result = computeGameContext(minimalContext(), "SPREAD", "HOME");
    expect(result.restAdvantageScore).toBe(0);
  });

  it("returns zero historical form score when no ATS form is provided", () => {
    const result = computeGameContext(minimalContext(), "SPREAD", "HOME");
    expect(result.historicalFormScore).toBe(0);
  });
});

describe("computeGameContext — SPREAD vs TOTAL market type", () => {
  it("uses spread line movement for SPREAD picks", () => {
    // Opening spread -3.5 → current -2.5 (spread moved toward AWAY — fades HOME pick)
    const ctx = minimalContext({ openingSpread: -3.5, currentSpread: -2.5 });
    const result = computeGameContext(ctx, "SPREAD", "HOME");
    expect(result.lineMovementScore).toBeLessThan(0); // delta > 0 → fades HOME
  });

  it("uses total line movement for TOTAL picks", () => {
    // Opening total 48 → current 50 (total moved up — sharp money on OVER, confirms OVER bet)
    const ctx = minimalContext({ openingTotal: 48, currentTotal: 50 });
    const resultOver = computeGameContext(ctx, "TOTAL", "OVER");
    const resultUnder = computeGameContext(ctx, "TOTAL", "UNDER");
    expect(resultOver.lineMovementScore).toBeGreaterThan(0); // total up → confirms OVER
    expect(resultUnder.lineMovementScore).toBeLessThan(0);   // total up → fades UNDER
  });

  it("TOTAL picks produce zero rest advantage (rest is side-agnostic for totals)", () => {
    const ctx = minimalContext({ restDaysHome: 5, restDaysAway: 1 });
    const result = computeGameContext(ctx, "TOTAL", "OVER");
    expect(result.restAdvantageScore).toBe(0);
  });

  it("SPREAD picks can have a non-zero rest advantage", () => {
    // 5 rest days for HOME vs 1 for AWAY — large rest advantage
    const ctx = minimalContext({ restDaysHome: 5, restDaysAway: 1 });
    const result = computeGameContext(ctx, "SPREAD", "HOME");
    expect(result.restAdvantageScore).toBeGreaterThan(0);
  });
});

describe("computeGameContext — HOME vs AWAY routing", () => {
  it("uses homeAtsForm for HOME picks", () => {
    const ctx = minimalContext({
      homeAtsForm: { wins: 18, losses: 7, pushes: 0, sampleSize: 25 },
      awayAtsForm: { wins: 5, losses: 20, pushes: 0, sampleSize: 25 },
    });
    const homeResult = computeGameContext(ctx, "SPREAD", "HOME");
    const awayResult = computeGameContext(ctx, "SPREAD", "AWAY");
    // Home team is 18-7 (strong ATS) — should produce positive form for HOME pick
    expect(homeResult.historicalFormScore).toBeGreaterThan(0);
    // Away team is 5-20 (weak ATS) — should produce negative form for AWAY pick
    expect(awayResult.historicalFormScore).toBeLessThan(0);
  });

  it("uses awayAtsFormAway for AWAY picks (venue-specific)", () => {
    const ctx = minimalContext({
      homeAtsFormAtHome: { wins: 18, losses: 7, pushes: 0, sampleSize: 25 },
      awayAtsFormAway: { wins: 5, losses: 20, pushes: 0, sampleSize: 25 },
    });
    const homeResult = computeGameContext(ctx, "SPREAD", "HOME");
    const awayResult = computeGameContext(ctx, "SPREAD", "AWAY");
    expect(homeResult.venueFormScore).toBeGreaterThan(0); // home strong at home
    expect(awayResult.venueFormScore).toBeLessThan(0);    // away weak on road
  });
});

describe("computeGameContext — head-to-head (HOME/AWAY picks only)", () => {
  it("includes H2H score for SPREAD HOME picks when H2H data is present", () => {
    const ctx = minimalContext({
      headToHeadForm: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
    });
    const result = computeGameContext(ctx, "SPREAD", "HOME");
    expect(result.headToHeadScore).toBeGreaterThan(0);
  });

  it("excludes H2H score for TOTAL picks (not applicable)", () => {
    const ctx = minimalContext({
      headToHeadForm: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
    });
    const result = computeGameContext(ctx, "TOTAL", "OVER");
    expect(result.headToHeadScore).toBe(0);
  });
});

describe("computeGameContext — data quality", () => {
  it("returns a non-zero dataQualityScore when coverage is present", () => {
    const result = computeGameContext(
      minimalContext({ bookmakerCoverageMax: 10, dataFreshnessMinutes: 5 }),
      "SPREAD",
      "HOME"
    );
    expect(result.dataQualityScore).toBeGreaterThan(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(100);
  });
});

describe("computeGameContext — factors array", () => {
  it("produces at least one factor when line movement is present", () => {
    const ctx = minimalContext({ openingSpread: -3.5, currentSpread: -5.5 });
    const result = computeGameContext(ctx, "SPREAD", "HOME");
    const lmFactor = result.factors.find((f) => f.name.toLowerCase().includes("line") || f.name.toLowerCase().includes("movement"));
    expect(lmFactor).toBeDefined();
  });

  it("factors list grows as more signals are present", () => {
    const minResult = computeGameContext(minimalContext(), "SPREAD", "HOME");
    const richResult = computeGameContext(
      minimalContext({
        openingSpread: -3.5,
        currentSpread: -5.5,
        restDaysHome: 4,
        restDaysAway: 1,
        homeAtsForm: { wins: 15, losses: 10, pushes: 0, sampleSize: 25 },
      }),
      "SPREAD",
      "HOME"
    );
    expect(richResult.factors.length).toBeGreaterThan(minResult.factors.length);
  });
});
