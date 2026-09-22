import { describe, expect, it } from "vitest";
import {
  effectiveWeight,
  fitStatic,
  fitTVC,
  meanLogLoss,
  predictTVC,
  type TVCGame,
} from "./time-varying-weights";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Data where the true weight of x drifts linearly with the week. */
function driftingSeason(seed = 3, n = 600): TVCGame[] {
  const rand = mulberry32(seed);
  const games: TVCGame[] = [];
  for (let i = 0; i < n; i++) {
    const week = 1 + Math.floor(rand() * 17);
    const x = rand() * 4 - 2;
    const trueW = 1.5 - 0.12 * week; // weight decays as games accumulate
    const p = 1 / (1 + Math.exp(-(0.3 + trueW * x)));
    games.push({ features: [x], week, homeWin: rand() < p });
  }
  return games;
}

describe("time-varying-weights", () => {
  it("TVC beats the static model on log-loss when weights truly drift", () => {
    const games = driftingSeason();
    const train = games.slice(0, 400);
    const holdout = games.slice(400);
    const tvc = fitTVC(train);
    const stat = fitStatic(train);
    expect(tvc).not.toBeNull();
    expect(stat).not.toBeNull();
    const llTvc = meanLogLoss(tvc!, holdout);
    const llStat = meanLogLoss(stat!, holdout);
    expect(llTvc).toBeLessThan(llStat - 0.001);
  });

  it("recovers the sign of the drift", () => {
    const model = fitTVC(driftingSeason(5, 800));
    expect(model).not.toBeNull();
    // True weight falls with week -> beta negative.
    expect(model!.beta[0]).toBeLessThan(0);
    expect(effectiveWeight(model!, 0, 1)).toBeGreaterThan(
      effectiveWeight(model!, 0, 17),
    );
  });

  it("regime flags shift weights discontinuously", () => {
    const rand = mulberry32(9);
    const games: TVCGame[] = [];
    for (let i = 0; i < 500; i++) {
      const x = rand() * 4 - 2;
      const postBye = rand() < 0.3;
      const z = 0.2 + 0.8 * x + (postBye ? 1.2 : 0);
      games.push({
        features: [x],
        week: 5,
        homeWin: rand() < 1 / (1 + Math.exp(-z)),
        regimes: { postBye },
      });
    }
    const model = fitTVC(games);
    expect(model).not.toBeNull();
    expect(model!.regimeNames).toContain("postBye");
    const idx = model!.nFeatures + model!.regimeNames.indexOf("postBye");
    expect(model!.alpha[idx]).toBeGreaterThan(0.3);
    const p1 = predictTVC(model!, [0.5], 5, { postBye: true });
    const p0 = predictTVC(model!, [0.5], 5, { postBye: false });
    expect(p1).toBeGreaterThan(p0);
  });

  it("predictions stay in [0,1] and fitTVC handles degenerate input", () => {
    const model = fitTVC(driftingSeason(11, 200));
    expect(predictTVC(model!, [100], 17)).toBeLessThanOrEqual(1);
    expect(predictTVC(model!, [-100], 1)).toBeGreaterThanOrEqual(0);
    expect(fitTVC([])).toBeNull();
    expect(() =>
      fitTVC([
        { features: [1], week: 1, homeWin: true },
        { features: [1, 2], week: 1, homeWin: false },
      ]),
    ).toThrow();
    expect(() => predictTVC(model!, [1, 2], 3)).toThrow();
  });
});
