/**
 * Pairwise matchup ratings — tests (arXiv 2209.06346v2).
 *
 * ACCEPTANCE GATE: recency weights rise with t; SGD recovers known
 * attacker/defender strengths from synthetic matchups; predictions
 * track the true s_ij; the time-ordered backtest beats the expanding
 * attacker-mean baseline; empty inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  fitMatchupRatings,
  predictMatchup,
  recencyWeight,
  timeOrderedMae,
  type MatchupObs,
} from "./matchup-ratings";

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

describe("recencyWeight", () => {
  it("rises with t and spans (0, 1]", () => {
    expect(recencyWeight(0, 0, 16)).toBeCloseTo(1 / 17, 12);
    expect(recencyWeight(16, 0, 16)).toBeCloseTo(1, 12);
    expect(recencyWeight(10, 0, 16)).toBeGreaterThan(recencyWeight(2, 0, 16));
    expect(() => recencyWeight(5, 10, 0)).toThrow();
  });
});

describe("fitMatchupRatings", () => {
  it("recovers attacker and defender strengths", () => {
    const rand = mulberry32(231);
    // True: A=0.5, a = [1.0, -1.0], b = [0.5, -0.5].
    const obs: MatchupObs[] = [];
    for (let t = 0; t < 17; t++) {
      for (const [i, ai] of [["w1", 1.0], ["w2", -1.0]] as const) {
        for (const [j, bj] of [["c1", 0.5], ["c2", -0.5]] as const) {
          obs.push({ i, j, s: 0.5 + ai - bj + (rand() - 0.5) * 0.2, t });
        }
      }
    }
    const r = fitMatchupRatings(obs, { lr: 0.05, epochs: 300, lambda: 0.1, seed: 3 });
    const a1 = r.attack.get("w1") as number;
    const a2 = r.attack.get("w2") as number;
    const b1 = r.defense.get("c1") as number;
    const b2 = r.defense.get("c2") as number;
    expect(a1).toBeGreaterThan(a2);
    expect(b1).toBeGreaterThan(b2);
    // Predicted ordering matches the true matchup ordering.
    expect(predictMatchup(r, "w1", "c2")).toBeGreaterThan(
      predictMatchup(r, "w2", "c1"),
    );
    expect(() => fitMatchupRatings([])).toThrow();
  });

  it("beats the expanding-mean baseline time-ordered", () => {
    const rand = mulberry32(233);
    const obs: MatchupObs[] = [];
    const aStr: Record<string, number> = { w1: 1.2, w2: 0.2, w3: -0.8 };
    const bStr: Record<string, number> = { c1: 0.6, c2: -0.4 };
    for (let t = 0; t < 17; t++) {
      for (const i of Object.keys(aStr)) {
        for (const j of Object.keys(bStr)) {
          obs.push({
            i,
            j,
            s: (aStr[i] as number) - (bStr[j] as number) + (rand() - 0.5) * 0.3,
            t,
          });
        }
      }
    }
    const { model, baseline } = timeOrderedMae(obs, [9, 12, 15], {
      lr: 0.05,
      epochs: 200,
      lambda: 0.3,
      seed: 5,
    });
    // Defender strength is invisible to the attacker-mean baseline.
    expect(model).toBeLessThan(baseline * 0.99);
    expect(() => timeOrderedMae(obs, [])).toThrow();
  });
});
