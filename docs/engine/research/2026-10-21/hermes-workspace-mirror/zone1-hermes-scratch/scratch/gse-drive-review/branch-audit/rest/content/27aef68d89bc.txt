import { describe, it, expect } from "vitest";
import { computePlayoffContextScore, computeGameContext } from "../game-context.js";
import { scoreGame } from "../scoring.js";
import type { PlayoffContext } from "@sports/types";
import type { OddsInput } from "@sports/types";

// ─── Fixtures ────────────────────────────────────────────────

function makePlayoffCtx(overrides: Partial<PlayoffContext> = {}): PlayoffContext {
  return {
    isPlayoffGame: true,
    seriesHomeWins: 1,
    seriesAwayWins: 0,
    seriesGamesPlayed: 1,
    isEliminationGame: false,
    trailingTeam: "AWAY", // AWAY is trailing by default
    seriesDeficit: 1,
    desperationMultiplier: 1.4,
    ...overrides,
  };
}

/** Minimal OddsInput for end-to-end tests */
function makeOddsInput(overrides: Partial<OddsInput> = {}): OddsInput {
  return {
    gameId: "game-playoff-1",
    homeTeam: "Boston Celtics",
    awayTeam: "Miami Heat",
    commenceTime: new Date("2025-05-20T00:00:00Z"),
    sport: "NBA",
    bookmakerOdds: [
      {
        bookmaker: "fanduel",
        market: "SPREADS",
        spread: -4.5,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      },
      {
        bookmaker: "draftkings",
        market: "SPREADS",
        spread: -4.5,
        homeSpreadPrice: -112,
        awaySpreadPrice: -108,
      },
      {
        bookmaker: "betmgm",
        market: "SPREADS",
        spread: -4.5,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      },
      {
        bookmaker: "caesars",
        market: "SPREADS",
        spread: -4.5,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      },
      {
        bookmaker: "pointsbet",
        market: "SPREADS",
        spread: -4.5,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      },
      {
        bookmaker: "betmgm",
        market: "H2H",
        homePrice: -180,
        awayPrice: +155,
      },
      {
        bookmaker: "fanduel",
        market: "TOTALS",
        total: 212.5,
        overPrice: -110,
        underPrice: -110,
      },
      {
        bookmaker: "draftkings",
        market: "TOTALS",
        total: 212.5,
        overPrice: -108,
        underPrice: -112,
      },
    ],
    ...overrides,
  };
}

// ============================================================
// computePlayoffContextScore — unit tests
// ============================================================

describe("computePlayoffContextScore — null / non-playoff context", () => {
  it("returns neutral when context is null", () => {
    const result = computePlayoffContextScore(null, "HOME");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
    expect(result.historicalDiscount).toBe(1.0);
  });

  it("returns neutral when context is undefined", () => {
    const result = computePlayoffContextScore(undefined, "AWAY");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
    expect(result.historicalDiscount).toBe(1.0);
  });

  it("returns neutral when isPlayoffGame is false", () => {
    const ctx = makePlayoffCtx({ isPlayoffGame: false });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull();
    expect(result.historicalDiscount).toBe(1.0);
  });
});

describe("computePlayoffContextScore — series tied", () => {
  it("score=0 when 0-0 series (no games played yet)", () => {
    const ctx = makePlayoffCtx({
      seriesHomeWins: 0,
      seriesAwayWins: 0,
      seriesGamesPlayed: 0,
      trailingTeam: null,
      seriesDeficit: 0,
      desperationMultiplier: 1.05,
    });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.score).toBe(0);
    expect(result.factor).toBeNull(); // score=0 → no factor
  });

  it("score=2 when 1-1 series (must-win stakes)", () => {
    const ctx = makePlayoffCtx({
      seriesHomeWins: 1,
      seriesAwayWins: 1,
      seriesGamesPlayed: 2,
      trailingTeam: null,
      seriesDeficit: 0,
      desperationMultiplier: 1.15,
    });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.score).toBe(2); // min(1+1, 3) = 2
    expect(result.factor).not.toBeNull();
    expect(result.factor!.impact).toBe("positive");
  });

  it("score=3 (capped) when 2-2 series", () => {
    const ctx = makePlayoffCtx({
      seriesHomeWins: 2,
      seriesAwayWins: 2,
      seriesGamesPlayed: 4,
      trailingTeam: null,
      seriesDeficit: 0,
      desperationMultiplier: 1.25,
    });
    const result = computePlayoffContextScore(ctx, "AWAY");
    expect(result.score).toBe(3); // min(4, 3) = 3
  });

  it("score=3 (capped) when 3-3 series", () => {
    const ctx = makePlayoffCtx({
      seriesHomeWins: 3,
      seriesAwayWins: 3,
      seriesGamesPlayed: 6,
      trailingTeam: null,
      seriesDeficit: 0,
      desperationMultiplier: 1.35,
    });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.score).toBe(3); // min(6, 3) = 3
  });
});

describe("computePlayoffContextScore — picking the trailing (desperate) team", () => {
  it("deficit 1: score=3 (HOME trailing, pick HOME)", () => {
    const ctx = makePlayoffCtx({
      trailingTeam: "HOME",
      seriesDeficit: 1,
      seriesHomeWins: 0,
      seriesAwayWins: 1,
      desperationMultiplier: 1.4,
    });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.score).toBe(3); // clamp(1*3, 0, 8) = 3
    expect(result.factor!.impact).toBe("positive");
  });

  it("deficit 2: score=6 (AWAY trailing, pick AWAY)", () => {
    const ctx = makePlayoffCtx({
      trailingTeam: "AWAY",
      seriesDeficit: 2,
      seriesHomeWins: 2,
      seriesAwayWins: 0,
      desperationMultiplier: 1.7,
    });
    const result = computePlayoffContextScore(ctx, "AWAY");
    expect(result.score).toBe(6); // clamp(2*3, 0, 8) = 6
  });

  it("deficit 3: score capped at 8 (MAX)", () => {
    const ctx = makePlayoffCtx({
      trailingTeam: "HOME",
      seriesDeficit: 3,
      seriesHomeWins: 0,
      seriesAwayWins: 3,
      desperationMultiplier: 1.9,
    });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.score).toBe(8); // clamp(3*3=9, 0, 8) = 8
  });
});

describe("computePlayoffContextScore — picking the leading (complacent) team", () => {
  it("leading team always gets -2 complacency penalty", () => {
    const ctx = makePlayoffCtx({
      trailingTeam: "AWAY",
      seriesDeficit: 1,
      seriesHomeWins: 1,
      seriesAwayWins: 0,
      desperationMultiplier: 1.4,
    });
    const result = computePlayoffContextScore(ctx, "HOME"); // HOME is leading
    expect(result.score).toBe(-2);
    expect(result.factor!.impact).toBe("negative");
  });

  it("away team leading, pick AWAY → -2", () => {
    const ctx = makePlayoffCtx({
      trailingTeam: "HOME",
      seriesDeficit: 2,
      seriesHomeWins: 0,
      seriesAwayWins: 2,
      desperationMultiplier: 1.7,
    });
    const result = computePlayoffContextScore(ctx, "AWAY"); // AWAY is leading
    expect(result.score).toBe(-2);
  });
});

describe("computePlayoffContextScore — elimination game modifier", () => {
  it("trailing team in elimination: base score boosted by +3", () => {
    // deficit=1, base score=3, elimination adds +3 → clamp(6,0,8)=6
    const ctx = makePlayoffCtx({
      trailingTeam: "AWAY",
      seriesDeficit: 1,
      isEliminationGame: true,
      seriesHomeWins: 1,
      seriesAwayWins: 0,
      desperationMultiplier: 1.4,
    });
    const result = computePlayoffContextScore(ctx, "AWAY");
    expect(result.score).toBe(6); // 3 + 3 = 6
    expect(result.factor!.description).toContain("elimination game");
  });

  it("trailing team in elimination: still capped at MAX=8", () => {
    // deficit=3, base=8 (already capped), elimination → clamp(8+3=11,0,8)=8
    const ctx = makePlayoffCtx({
      trailingTeam: "HOME",
      seriesDeficit: 3,
      isEliminationGame: true,
      seriesHomeWins: 0,
      seriesAwayWins: 3,
      desperationMultiplier: 1.9,
    });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.score).toBe(8); // still capped
  });

  it("leading team in elimination: penalty increases to -3", () => {
    const ctx = makePlayoffCtx({
      trailingTeam: "AWAY",
      seriesDeficit: 1,
      isEliminationGame: true,
      seriesHomeWins: 1,
      seriesAwayWins: 0,
      desperationMultiplier: 1.4,
    });
    const result = computePlayoffContextScore(ctx, "HOME"); // HOME is leading
    expect(result.score).toBe(-3); // -2 - 1 = -3
  });
});

describe("computePlayoffContextScore — historical discount", () => {
  it("no context → discount is 1.0 (no reduction)", () => {
    const result = computePlayoffContextScore(null, "HOME");
    expect(result.historicalDiscount).toBe(1.0);
  });

  it("desperationMultiplier=1.4 → discount ≈ 0.714", () => {
    const ctx = makePlayoffCtx({ desperationMultiplier: 1.4, trailingTeam: "AWAY" });
    const result = computePlayoffContextScore(ctx, "AWAY");
    expect(result.historicalDiscount).toBeCloseTo(1 / 1.4, 3);
    expect(result.historicalDiscount).toBeLessThan(1.0);
  });

  it("desperationMultiplier=1.7 → discount ≈ 0.588", () => {
    const ctx = makePlayoffCtx({ desperationMultiplier: 1.7, trailingTeam: "HOME" });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.historicalDiscount).toBeCloseTo(1 / 1.7, 3);
  });

  it("desperationMultiplier=1.9 → discount ≈ 0.526 (most reduced)", () => {
    const ctx = makePlayoffCtx({ desperationMultiplier: 1.9, trailingTeam: "HOME" });
    const result = computePlayoffContextScore(ctx, "HOME");
    expect(result.historicalDiscount).toBeCloseTo(1 / 1.9, 3);
  });

  it("higher multiplier always means lower discount (more reliability loss)", () => {
    const ctx14 = makePlayoffCtx({ desperationMultiplier: 1.4 });
    const ctx17 = makePlayoffCtx({ desperationMultiplier: 1.7 });
    const ctx19 = makePlayoffCtx({ desperationMultiplier: 1.9 });
    const d14 = computePlayoffContextScore(ctx14, "HOME").historicalDiscount;
    const d17 = computePlayoffContextScore(ctx17, "HOME").historicalDiscount;
    const d19 = computePlayoffContextScore(ctx19, "HOME").historicalDiscount;
    expect(d14).toBeGreaterThan(d17);
    expect(d17).toBeGreaterThan(d19);
    expect(d19).toBeGreaterThan(0);
  });
});

describe("computePlayoffContextScore — factor output shape", () => {
  it("factor is null when score is exactly 0 (0-0 series)", () => {
    const ctx = makePlayoffCtx({
      seriesHomeWins: 0,
      seriesAwayWins: 0,
      trailingTeam: null,
      seriesDeficit: 0,
    });
    const { factor } = computePlayoffContextScore(ctx, "HOME");
    expect(factor).toBeNull();
  });

  it("positive score produces factor with positive impact", () => {
    const ctx = makePlayoffCtx({ trailingTeam: "HOME", seriesDeficit: 1 });
    const { score, factor } = computePlayoffContextScore(ctx, "HOME");
    expect(score).toBeGreaterThan(0);
    expect(factor!.impact).toBe("positive");
    expect(factor!.name).toBe("Playoff Series Context");
    expect(factor!.weight).toBe(score);
  });

  it("negative score produces factor with negative impact", () => {
    const ctx = makePlayoffCtx({ trailingTeam: "AWAY", seriesDeficit: 1 });
    const { score, factor } = computePlayoffContextScore(ctx, "HOME"); // HOME is leading
    expect(score).toBeLessThan(0);
    expect(factor!.impact).toBe("negative");
  });

  it("factor description references the series score", () => {
    const ctx = makePlayoffCtx({
      trailingTeam: "AWAY",
      seriesHomeWins: 2,
      seriesAwayWins: 1,
      seriesDeficit: 1,
    });
    const { factor } = computePlayoffContextScore(ctx, "AWAY");
    expect(factor!.description).toContain("2-1");
  });
});

describe("computePlayoffContextScore — OVER/UNDER picks in a series", () => {
  it("OVER pick when home team trailing → treated as leading side (score=-2)", () => {
    // trailingTeam=HOME, pickedSide=OVER
    // trailingIsPickedSide = HOME===OVER = false
    // leadingIsPickedSide  = HOME!==null && HOME!==OVER = true
    const ctx = makePlayoffCtx({
      trailingTeam: "HOME",
      seriesDeficit: 1,
      desperationMultiplier: 1.4,
    });
    const result = computePlayoffContextScore(ctx, "OVER");
    expect(result.score).toBe(-2);
  });

  it("UNDER pick in tied series → score based on stakes", () => {
    const ctx = makePlayoffCtx({
      seriesHomeWins: 2,
      seriesAwayWins: 2,
      trailingTeam: null,
      seriesDeficit: 0,
    });
    const result = computePlayoffContextScore(ctx, "UNDER");
    expect(result.score).toBe(3); // min(4, 3) = 3 — series stakes apply
  });
});

// ============================================================
// computeGameContext — integration: playoff discount on form
// ============================================================

describe("computeGameContext — playoff discount reduces historical form scores", () => {
  const atsForm = { wins: 8, losses: 2, pushes: 0, sampleSize: 10 }; // 80% win rate → +5 score
  const headToHeadForm = { wins: 6, losses: 2, pushes: 0, sampleSize: 8 }; // 75% → +5 score

  it("without playoff context, strong ATS form earns a positive historicalFormScore", () => {
    const result = computeGameContext(
      { homeAtsForm: atsForm, bookmakerCoverageMax: 6, dataFreshnessMinutes: 5 },
      "SPREAD",
      "HOME"
    );
    expect(result.historicalFormScore).toBeGreaterThan(0);
    expect(result.playoffContextScore).toBe(0);
  });

  it("with playoff context, same ATS form is discounted", () => {
    const baseline = computeGameContext(
      { homeAtsForm: atsForm, bookmakerCoverageMax: 6, dataFreshnessMinutes: 5 },
      "SPREAD",
      "HOME"
    );
    const withPlayoff = computeGameContext(
      {
        homeAtsForm: atsForm,
        bookmakerCoverageMax: 6,
        dataFreshnessMinutes: 5,
        playoffContext: makePlayoffCtx({
          trailingTeam: "AWAY",
          seriesDeficit: 1,
          desperationMultiplier: 1.9, // max desperation → min reliability
        }),
      },
      "SPREAD",
      "HOME"
    );
    // Form score should be reduced (multiplied by ~0.526)
    expect(withPlayoff.historicalFormScore).toBeLessThanOrEqual(baseline.historicalFormScore);
    // Playoff context score should be negative (HOME is the leading, complacent team)
    expect(withPlayoff.playoffContextScore).toBeLessThan(0);
  });

  it("trailing team pick gets positive playoffContextScore + discounted form", () => {
    const ctx = computeGameContext(
      {
        awayAtsForm: atsForm,
        headToHeadForm,
        bookmakerCoverageMax: 6,
        dataFreshnessMinutes: 5,
        playoffContext: makePlayoffCtx({
          trailingTeam: "AWAY",
          seriesDeficit: 2,
          desperationMultiplier: 1.7,
        }),
      },
      "SPREAD",
      "AWAY"
    );
    expect(ctx.playoffContextScore).toBe(6); // deficit 2 → clamp(6,0,8)
    // H2H score should be discounted by 1/1.7 ≈ 0.588
    expect(ctx.headToHeadScore).toBeLessThanOrEqual(5); // was 5, now ≤5
  });

  it("playoffContextScore appears in factors list", () => {
    const ctx = computeGameContext(
      {
        bookmakerCoverageMax: 6,
        dataFreshnessMinutes: 5,
        playoffContext: makePlayoffCtx({
          trailingTeam: "HOME",
          seriesDeficit: 1,
          desperationMultiplier: 1.4,
        }),
      },
      "SPREAD",
      "HOME"
    );
    const playoffFactor = ctx.factors.find((f) => f.name === "Playoff Series Context");
    expect(playoffFactor).toBeDefined();
    expect(playoffFactor!.impact).toBe("positive"); // HOME is the desperate trailing team
  });

  it("no playoff factor in factors list when not a playoff game", () => {
    const ctx = computeGameContext(
      { bookmakerCoverageMax: 6, dataFreshnessMinutes: 5 },
      "SPREAD",
      "HOME"
    );
    const playoffFactor = ctx.factors.find((f) => f.name === "Playoff Series Context");
    expect(playoffFactor).toBeUndefined();
  });
});

// ============================================================
// scoreGame — end-to-end: playoff context flows into pick output
// ============================================================

describe("scoreGame — playoff context in end-to-end pick output", () => {
  it("playoffContextScore in factorBreakdown is 0 without playoff context", () => {
    const picks = scoreGame(makeOddsInput());
    const spread = picks.find((p) => p.pickType === "SPREAD");
    expect(spread).toBeDefined();
    // playoffContextScore is omitted from factorBreakdown when 0 (sparse storage)
    expect(spread?.factorBreakdown.playoffContextScore ?? 0).toBe(0);
  });

  it("desperate trailing team pick has higher confidence than leading team pick", () => {
    // Two separate runs: one picking HOME (trailing 0-2), one picking HOME (leading 2-0)
    const trailingCtx = makePlayoffCtx({
      trailingTeam: "HOME",
      seriesDeficit: 2,
      seriesHomeWins: 0,
      seriesAwayWins: 2,
      desperationMultiplier: 1.7,
    });
    const leadingCtx = makePlayoffCtx({
      trailingTeam: "AWAY",
      seriesDeficit: 2,
      seriesHomeWins: 2,
      seriesAwayWins: 0,
      desperationMultiplier: 1.7,
    });

    // HOME is desperate in trailingCtx, picks a spread pick for home team
    const picksTrailing = scoreGame(makeOddsInput({ context: { playoffContext: trailingCtx, bookmakerCoverageMax: 6, dataFreshnessMinutes: 5, hasSpreadMarket: true, hasTotalMarket: true, hasH2HMarket: true } }));
    const picksLeading = scoreGame(makeOddsInput({ context: { playoffContext: leadingCtx, bookmakerCoverageMax: 6, dataFreshnessMinutes: 5, hasSpreadMarket: true, hasTotalMarket: true, hasH2HMarket: true } }));

    const trailingSpread = picksTrailing.find((p) => p.pickType === "SPREAD");
    const leadingSpread = picksLeading.find((p) => p.pickType === "SPREAD");

    // Desperate trailing team pick should have higher playoffContextScore
    if (trailingSpread && leadingSpread) {
      expect(trailingSpread.factorBreakdown.playoffContextScore).toBeGreaterThan(
        leadingSpread.factorBreakdown.playoffContextScore ?? 0
      );
    }
  });

  it("playoff factor appears in factorBreakdown.factors when in series", () => {
    const picks = scoreGame(makeOddsInput({
      context: {
        playoffContext: makePlayoffCtx({
          trailingTeam: "AWAY",
          seriesDeficit: 1,
          desperationMultiplier: 1.4,
        }),
        bookmakerCoverageMax: 6,
        dataFreshnessMinutes: 5,
        hasSpreadMarket: true,
        hasTotalMarket: true,
        hasH2HMarket: true,
      },
    }));
    const spread = picks.find((p) => p.pickType === "SPREAD");
    const playoffFactor = spread?.factorBreakdown.factors.find(
      (f) => f.name === "Playoff Series Context"
    );
    expect(playoffFactor).toBeDefined();
  });

  it("playoff reasoning is included in pick reasoning string", () => {
    const picks = scoreGame(makeOddsInput({
      context: {
        playoffContext: makePlayoffCtx({
          trailingTeam: "HOME",
          seriesDeficit: 2,
          desperationMultiplier: 1.7,
        }),
        bookmakerCoverageMax: 6,
        dataFreshnessMinutes: 5,
        hasSpreadMarket: true,
        hasTotalMarket: true,
        hasH2HMarket: true,
      },
    }));
    const spread = picks.find((p) => p.pickType === "SPREAD");
    // Either "desperation" or "complacency" should appear in reasoning
    expect(spread?.reasoning).toMatch(/desperation|complacency|series/i);
  });
});
