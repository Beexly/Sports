import { describe, it, expect } from "vitest";
import { projectPlayerSeason, backtestProjections, type PlayerSeasonLine } from "../player-projection.js";

describe("projectPlayerSeason", () => {
  it("returns the conservative prior when there is no usable history", () => {
    const p = projectPlayerSeason([], 2026);
    expect(p.projectedPprPerGame).toBe(6);
    expect(p.basisSeasons).toBe(0);
    expect(p.priorGames).toBe(0);
  });

  it("recency+games-weights recent seasons and regresses toward the prior", () => {
    // 2023 weighted 0.6, 2022 0.3, 2021 0.1; all 16 games.
    // observed = (9.6*18 + 4.8*12 + 1.6*10) / 16 = 15.4
    // projected = (48*15.4 + 8*6) / 56 ≈ 14.06
    const history: PlayerSeasonLine[] = [
      { season: 2021, games: 16, pprPerGame: 10 },
      { season: 2022, games: 16, pprPerGame: 12 },
      { season: 2023, games: 16, pprPerGame: 18 },
    ];
    const p = projectPlayerSeason(history, 2024);
    expect(p.basisSeasons).toBe(3);
    expect(p.priorGames).toBe(48);
    expect(p.projectedPprPerGame).toBeCloseTo(14.06, 1);
  });

  it("ignores seasons at or after the target season", () => {
    const history: PlayerSeasonLine[] = [
      { season: 2023, games: 16, pprPerGame: 12 },
      { season: 2024, games: 16, pprPerGame: 25 }, // must be ignored when projecting 2024
    ];
    const p = projectPlayerSeason(history, 2024);
    expect(p.basisSeasons).toBe(1);
    expect(p.priorGames).toBe(16);
    // only 2023 used → regressed toward prior, well below the future 25
    expect(p.projectedPprPerGame).toBeLessThan(12);
  });

  it("regresses a tiny-sample player hard toward the prior", () => {
    const big = projectPlayerSeason([{ season: 2023, games: 16, pprPerGame: 20 }], 2024);
    const tiny = projectPlayerSeason([{ season: 2023, games: 1, pprPerGame: 20 }], 2024);
    expect(tiny.projectedPprPerGame).toBeLessThan(big.projectedPprPerGame); // less data → more regression
  });
});

describe("backtestProjections", () => {
  it("computes MAE, bias, and the carry-forward baseline over real season chains", () => {
    const histories: PlayerSeasonLine[][] = [
      [
        { season: 2021, games: 16, pprPerGame: 10 },
        { season: 2022, games: 16, pprPerGame: 14 },
        { season: 2023, games: 16, pprPerGame: 10 },
      ],
    ];
    const bt = backtestProjections(histories);
    expect(bt.sampleSize).toBe(2); // seasons 2022 and 2023 have a prior
    expect(bt.mae).toBeGreaterThanOrEqual(0);
    expect(bt.naiveMae).toBeGreaterThanOrEqual(0);
    expect(bt.skillVsNaive).toBeCloseTo(bt.naiveMae - bt.mae, 2);
  });

  it("returns a zeroed report when there are no projectable seasons", () => {
    expect(backtestProjections([]).sampleSize).toBe(0);
    expect(backtestProjections([[{ season: 2023, games: 16, pprPerGame: 10 }]]).sampleSize).toBe(0); // single season, no prior
  });
});
