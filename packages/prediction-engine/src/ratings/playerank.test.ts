import { describe, expect, it } from "vitest";
import {
  aggregateTeamVector,
  auc,
  detectRoles,
  formRating,
  playerGameRating,
  trainTeamModel,
} from "./playerank";

const feats = ["targets", "recYards", "tds"];

describe("playerank", () => {
  it("aggregateTeamVector averages the player games", () => {
    const v = aggregateTeamVector(
      [
        { targets: 1, recYards: 0.5, tds: 0 },
        { targets: 0, recYards: 1, tds: 1 },
      ],
      feats,
    );
    expect(v).toEqual([0.5, 0.75, 0.5]);
    expect(aggregateTeamVector([], feats)).toEqual([0, 0, 0]);
  });

  it("trainTeamModel learns that yards win games", () => {
    let s = 41;
    const rng = (): number => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const games = Array.from({ length: 300 }, () => {
      const y = rng();
      return { teamVector: [rng(), y, rng() * 0.2], won: rng() < y ? 1 : (0 as 0 | 1) };
    });
    const w = trainTeamModel(games);
    expect(w[1]).toBeGreaterThan(0); // recYards weight positive
    const scores = games.map((g) =>
      1 / (1 + Math.exp(-(g.teamVector.reduce((a, v, j) => a + v * (w[j] ?? 0), w[3] ?? 0)))),
    );
    expect(auc(scores, games.map((g) => g.won))).toBeGreaterThan(0.7);
    expect(() => trainTeamModel([])).toThrow();
  });

  it("playerGameRating is the linear form; formRating smooths", () => {
    const w = [1, 2, 0, 0.5];
    expect(playerGameRating(w, { targets: 1, recYards: 1, tds: 0 }, feats)).toBeCloseTo(3.5, 12);
    const fr = formRating([1, 1, 1, 1]);
    expect(fr[3]).toBe(1); // constant series stays constant
    const fr2 = formRating([0, 10]);
    expect(fr2[1]).toBeLessThan(10); // EWMA smooths the spike
    expect(fr2[1]).toBeGreaterThan(0);
    expect(() => formRating([1], 0)).toThrow();
  });

  it("detectRoles separates slot from outside by snap position", () => {
    // Seeds are the first k entries: lead with one slot and one outside WR
    // so init is unambiguous; outside WRs share a side for determinism.
    const snaps = [
      { id: "s1", x: 0, y: 5 },
      { id: "o1", x: -20, y: 5 },
      { id: "s2", x: 1, y: 6 },
      { id: "o2", x: -22, y: 6 },
    ];
    const roles = detectRoles(snaps, 2);
    expect(roles["s1"]).toBe(roles["s2"]);
    expect(roles["o1"]).toBe(roles["o2"]);
    expect(roles["s1"]).not.toBe(roles["o1"]);
    expect(detectRoles([], 2)).toEqual({});
    expect(() => detectRoles(snaps, 0)).toThrow();
  });

  it("auc is 1 for perfect separation, 0.5 for noise", () => {
    expect(auc([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0])).toBe(1);
    expect(auc([0.5, 0.5, 0.5, 0.5], [1, 1, 0, 0])).toBe(0.5);
    expect(() => auc([], [])).toThrow();
  });
});
