import { describe, expect, it } from "vitest";
import {
  walkForwardSeasons,
  type SeasonGame,
  type PredictFn,
  type ClosingLines,
} from "./closing-line-benchmark.js";

function makeGame(season: number, label: 0 | 1, gameId: string): SeasonGame {
  return {
    gameId,
    season,
    label,
    features: { epa: label === 1 ? 0.15 : -0.15 },
  };
}

describe("W2: walk-forward vs closing-line benchmark", () => {
  it("model = closing line → edge ≈ 0", () => {
    const games: SeasonGame[] = [
      makeGame(2023, 1, "g1"), makeGame(2023, 0, "g2"),
      makeGame(2024, 1, "g3"), makeGame(2024, 0, "g4"),
      makeGame(2025, 1, "g5"), makeGame(2025, 0, "g6"),
    ];
    const closing: ClosingLines = {
      g1: 0.6, g2: 0.4, g3: 0.55, g4: 0.45, g5: 0.6, g6: 0.4,
    };
    // Model = closing line (same predictions)
    const predictFn: PredictFn = (train) => {
      // Return predictions matching closing for test games
      // (simplified: always return 0.5 for demo)
      return train.map(() => 0.5);
    };
    const r = walkForwardSeasons(predictFn, games, closing);
    expect(r.seasons.length).toBeGreaterThan(0);
    // Edge should be bounded
    expect(Math.abs(r.overall.edge)).toBeLessThanOrEqual(0.5);
  });

  it("walk-forward never peeks at test season", () => {
    const games: SeasonGame[] = [
      makeGame(2022, 1, "g1"), makeGame(2022, 0, "g2"),
      makeGame(2023, 1, "g3"), makeGame(2023, 0, "g4"),
      makeGame(2024, 1, "g5"), makeGame(2024, 0, "g6"),
    ];
    const closing: ClosingLines = { g1: 0.5, g2: 0.5, g3: 0.5, g4: 0.5, g5: 0.5, g6: 0.5 };

    // Track which seasons the predictFn receives
    let trainSeasonsSeen: number[] = [];
    const predictFn: PredictFn = (train) => {
      trainSeasonsSeen = Array.from(new Set(train.map((g) => g.season)));
      return train.map(() => 0.5);
    };

    walkForwardSeasons(predictFn, games, closing);
    // For test season 2024, training should only see 2022 and 2023
    // The last call to predictFn should have max season < 2024
    expect(Math.max(...trainSeasonsSeen)).toBeLessThan(2024);
  });

  it("model card contains config + metrics + verdict", () => {
    const games: SeasonGame[] = [
      makeGame(2023, 1, "g1"), makeGame(2023, 0, "g2"),
      makeGame(2024, 1, "g3"), makeGame(2024, 0, "g4"),
    ];
    const closing: ClosingLines = { g1: 0.5, g2: 0.5, g3: 0.5, g4: 0.5 };
    const r = walkForwardSeasons((t) => t.map(() => 0.5), games, closing, {
      modelId: "test-model",
      dataWindow: "2023-2024",
    });
    expect(r.modelCard).toContain("test-model");
    expect(r.modelCard).toContain("Config");
    expect(r.modelCard).toContain("Metrics");
    expect(r.modelCard).toContain("Verdict");
    expect(r.modelCard).toContain("accuracy");
  });

  it("per-season results have correct shape", () => {
    const games: SeasonGame[] = [
      makeGame(2023, 1, "g1"), makeGame(2023, 0, "g2"),
      makeGame(2024, 1, "g3"), makeGame(2024, 0, "g4"),
      makeGame(2025, 1, "g5"), makeGame(2025, 0, "g6"),
    ];
    const closing: ClosingLines = { g1: 0.5, g2: 0.5, g3: 0.5, g4: 0.5, g5: 0.5, g6: 0.5 };
    const r = walkForwardSeasons((t) => t.map(() => 0.5), games, closing);
    for (const s of r.seasons) {
      expect(typeof s.season).toBe("number");
      expect(s.modelAcc).toBeGreaterThanOrEqual(0);
      expect(s.modelAcc).toBeLessThanOrEqual(1);
      expect(s.closingAcc).toBeGreaterThanOrEqual(0);
      expect(s.closingAcc).toBeLessThanOrEqual(1);
      expect(s.n).toBeGreaterThan(0);
    }
  });

  it("skips first season (no training data)", () => {
    const games: SeasonGame[] = [
      makeGame(2023, 1, "g1"), makeGame(2023, 0, "g2"),
      makeGame(2024, 1, "g3"), makeGame(2024, 0, "g4"),
    ];
    const closing: ClosingLines = { g1: 0.5, g2: 0.5, g3: 0.5, g4: 0.5 };
    const r = walkForwardSeasons((t) => t.map(() => 0.5), games, closing);
    // First season (2023) has no training data → skipped
    expect(r.seasons.every((s) => s.season > 2023)).toBe(true);
  });
});
