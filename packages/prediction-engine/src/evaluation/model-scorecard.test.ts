/**
 * Four-part model scorecard — tests (arXiv 2210.06327v3).
 *
 * ACCEPTANCE GATE: fitness metrics behave on perfect/coin-flip
 * inputs; the table correlation is 1 on a perfectly reconstructed
 * table; tier accuracy counts exactly; the betting sim shows positive
 * ROI and CLV for an edge-holding model and skips no-edge games;
 * rankingDisagreements flags a component where the Brier-worse model
 * wins; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  bettingSim,
  fitness,
  rankingDisagreements,
  scorecard,
  spearman,
  tableCorrelation,
  tierAccuracy,
  type GameEval,
} from "./model-scorecard";

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

describe("fitness", () => {
  it("is 0 on perfect forecasts", () => {
    const games: GameEval[] = [
      { predicted: 1, actual: 1, closingHomeProb: 0.6 },
      { predicted: 0, actual: 0, closingHomeProb: 0.4 },
    ];
    const f = fitness(games);
    expect(f.mae).toBeCloseTo(0, 8);
    expect(f.brier).toBeCloseTo(0, 8);
    expect(() => fitness([])).toThrow();
  });
});

describe("spearman + tableCorrelation", () => {
  it("is 1 on a perfectly reconstructed table", () => {
    expect(spearman([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 12);
    const tc = tableCorrelation(
      { a: 12, b: 9, c: 6 },
      new Map([["a", 12], ["b", 8], ["c", 5]]),
    );
    expect(tc).toBeCloseTo(1, 12);
    expect(() => spearman([1], [1])).toThrow();
  });
});

describe("tierAccuracy", () => {
  it("counts exactly", () => {
    const t = tierAccuracy({
      predictedPlayoff: new Set(["a", "b", "x"]),
      actualPlayoff: new Set(["a", "b", "c"]),
      predictedDivision: new Set(["a"]),
      actualDivision: new Set(["a"]),
    });
    expect(t.playoffAccuracy).toBeCloseTo(2 / 3, 12);
    expect(t.divisionAccuracy).toBe(1);
  });
});

describe("bettingSim", () => {
  it("shows positive ROI/CLV for an edge-holding model", () => {
    const rand = mulberry32(261);
    const games: GameEval[] = [];
    for (let i = 0; i < 400; i++) {
      const pTrue = 0.4 + rand() * 0.2; // home win prob in [0.4, 0.6]
      const actual = rand() < pTrue ? 1 : 0;
      // Model knows pTrue; close is stale toward 0.5.
      games.push({
        predicted: pTrue,
        actual,
        closingHomeProb: 0.5 + (pTrue - 0.5) * 0.4,
      });
    }
    const sim = bettingSim(games, 0.02);
    expect(sim.nBets).toBeGreaterThan(100);
    expect(sim.roi).toBeGreaterThan(0);
    expect(sim.clv).toBeGreaterThan(0);
    // No-edge model places no bets.
    const flat = bettingSim(
      games.map((g) => ({ ...g, predicted: g.closingHomeProb })),
      0.02,
    );
    expect(flat.nBets).toBe(0);
    expect(flat.roi).toBe(0);
  });
});

describe("scorecard + rankingDisagreements", () => {
  it("flags a Brier-vs-betting disagreement", () => {
    const rand = mulberry32(263);
    const mkGames = (sharp: boolean): GameEval[] => {
      const games: GameEval[] = [];
      for (let i = 0; i < 300; i++) {
        const pTrue = 0.35 + rand() * 0.3;
        const actual = rand() < pTrue ? 1 : 0;
        games.push({
          predicted: sharp ? pTrue : 0.5,
          actual,
          closingHomeProb: 0.5 + (pTrue - 0.5) * 0.4,
        });
      }
      return games;
    };
    const wins = { a: 10, b: 8 };
    const tiers = {
      predictedPlayoff: new Set(["a"]),
      actualPlayoff: new Set(["a"]),
      predictedDivision: new Set(["a"]),
      actualDivision: new Set(["a"]),
    };
    const scSharp = scorecard(mkGames(true), wins, wins, tiers);
    const scFlat = scorecard(mkGames(false), wins, wins, tiers);
    // Sharp model wins on Brier but the disagreement check runs either way.
    const disagreements = rankingDisagreements(scSharp, scFlat);
    expect(Array.isArray(disagreements)).toBe(true);
    // Constructed flip: Brier-worse model with better ROI.
    const flipped = rankingDisagreements(
      { ...scSharp, betting: { ...scSharp.betting, roi: -0.05 } },
      { ...scFlat, betting: { ...scFlat.betting, roi: 0.05 } },
    );
    expect(flipped).toContain("betting.roi");
  });
});
