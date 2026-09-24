import { describe, expect, it } from "vitest";
import {
  augmentationWeights,
  slidingStateFeatures,
  tierBrier,
  weightedLogistic,
} from "./mixed-tier-training";
import type { TieredGame } from "./mixed-tier-training";

let s = 31;
const rng = (): number => {
  s = (1664525 * s + 1013904223) >>> 0;
  return s / 4294967296;
};
// 400 regular + 40 playoff games; playoff signal is noisier (scarce tier).
const games: TieredGame[] = [];
for (let i = 0; i < 400; i++) {
  const x = (rng() - 0.5) * 10;
  games.push({ features: [x], homeWin: rng() < 1 / (1 + Math.exp(-0.3 * x)) ? 1 : 0, tier: "regular" });
}
for (let i = 0; i < 40; i++) {
  const x = (rng() - 0.5) * 10;
  games.push({ features: [x], homeWin: rng() < 1 / (1 + Math.exp(-0.5 * x)) ? 1 : 0, tier: "playoff" });
}

describe("mixed-tier-training", () => {
  it("augmentationWeights up-weights the playoff tier", () => {
    const w = augmentationWeights(games, 5);
    expect(w.filter((_, i) => games[i]!.tier === "playoff").every((x) => x === 5)).toBe(true);
    expect(w.filter((_, i) => games[i]!.tier === "regular").every((x) => x === 1)).toBe(true);
    expect(() => augmentationWeights(games, 0.5)).toThrow();
  });

  it("weightedLogistic recovers a positive slope", () => {
    const beta = weightedLogistic(games, augmentationWeights(games, 5));
    expect(beta[0]).toBeGreaterThan(0);
  });

  it("augmentation does not explode playoff Brier vs playoff-only", () => {
    const aug = weightedLogistic(games, augmentationWeights(games, 5));
    const poGames = games.filter((g) => g.tier === "playoff");
    const poOnly = weightedLogistic(poGames, poGames.map(() => 1));
    const bAug = tierBrier(games, aug, "playoff");
    const bPo = tierBrier(games, poOnly, "playoff");
    // scarce tier: augmentation should be competitive (the gate tests ≥0.002 wins in production)
    expect(Math.abs(bAug - bPo)).toBeLessThan(0.05);
    expect(tierBrier([], aug, "playoff")).toBeNaN();
  });

  it("slidingStateFeatures computes trailing-window deltas", () => {
    const f = slidingStateFeatures([0, 3, 7, 7], [0, 0.5, 1.0, 0.2], 2);
    expect(f[2]!.scoreDelta).toBe(7); // 7 - 0
    expect(f[2]!.epaDelta).toBeCloseTo(1.0, 12);
    expect(f[0]!.drivesAgo).toBe(0);
    expect(() => slidingStateFeatures([1], [1, 2], 2)).toThrow("mismatch");
  });
});
