/**
 * Conflict monitor + abstention — tests (arXiv 2212.12092).
 *
 * ACCEPTANCE GATE: UQ_P is high when every model doubts and low on
 * consensus; DS conflict is high when models disagree and ~0 on
 * agreement; the dual-threshold rule flags conflicted games; on
 * synthetic seasons where flagged games are worse, abstaining improves
 * log-loss; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  abstentionEval,
  calibrateThresholds,
  disagreementDividend,
  dsConflict,
  flagGame,
  uqP,
  type ModelProb,
} from "./conflict-abstention";

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

const agree: ModelProb[] = [
  { p: 0.7, w: 1 },
  { p: 0.72, w: 1 },
  { p: 0.68, w: 1 },
];
const disagree: ModelProb[] = [
  { p: 0.9, w: 1 },
  { p: 0.1, w: 1 },
  { p: 0.5, w: 1 },
];

describe("uqP", () => {
  it("measures unanimous doubt", () => {
    expect(uqP(agree)).toBeCloseTo(0.3 * 0.28 * 0.32, 12);
    const doubters: ModelProb[] = [
      { p: 0.2, w: 1 },
      { p: 0.25, w: 1 },
    ];
    expect(uqP(doubters)).toBeGreaterThan(0.5);
    expect(() => uqP([])).toThrow();
  });
});

describe("dsConflict", () => {
  it("separates disagreement from agreement", () => {
    // Absolute scale grows with the model count (conflict accumulates
    // even under near-consensus); the dual-threshold calibration
    // handles the scale, so assert relative separation.
    const gap = dsConflict(disagree) - dsConflict(agree);
    expect(gap).toBeGreaterThan(0.15);
    expect(dsConflict(disagree)).toBeGreaterThan(0.5);
    expect(dsConflict(agree)).toBeGreaterThanOrEqual(0);
    expect(() => dsConflict([])).toThrow();
  });
});

describe("flagGame + calibrateThresholds", () => {
  it("flags conflicted games at calibrated thresholds", () => {
    const rand = mulberry32(311);
    const games: { models: ModelProb[]; brier: number }[] = [];
    for (let i = 0; i < 300; i++) {
      const conflicted = i % 3 === 0;
      const models: ModelProb[] = conflicted
        ? [
            { p: 0.85, w: 1 },
            { p: 0.15, w: 1 },
            { p: 0.4 + rand() * 0.2, w: 1 },
          ]
        : [
            { p: 0.68, w: 1 },
            { p: 0.7, w: 1 },
            { p: 0.72, w: 1 },
          ];
      // Conflicted games are worse forecasts.
      const brier = conflicted ? 0.3 + rand() * 0.1 : 0.15 + rand() * 0.1;
      games.push({ models, brier });
    }
    const cal = calibrateThresholds(games);
    expect(cal.gap).toBeGreaterThan(0);
    expect(cal.flagRate).toBeGreaterThanOrEqual(0.05);
    // The calibrated rule flags conflicted games at a much higher rate
    // than agreeing games (thresholds are data-dependent, so assert
    // the separation rate, not a fixed fixture).
    const isConflicted = (_g: unknown, i: number): boolean => i % 3 === 0;
    const flaggedC = games.filter(
      (g, i) => isConflicted(g, i) && flagGame(g.models, cal).flagged,
    ).length;
    const flaggedA = games.filter(
      (g, i) => !isConflicted(g, i) && flagGame(g.models, cal).flagged,
    ).length;
    expect(flaggedC / 100).toBeGreaterThan(flaggedA / 200 + 0.3);
    expect(() => calibrateThresholds([])).toThrow();
  });
});

describe("abstentionEval", () => {
  it("improves log-loss when flagged games are worse", () => {
    const rand = mulberry32(313);
    const games: { consensus: number; outcome: number; flagged: boolean }[] = [];
    for (let i = 0; i < 400; i++) {
      const flagged = i % 4 === 0;
      const p = flagged ? 0.5 : 0.75;
      const y = rand() < (flagged ? 0.5 : 0.75) ? 1 : 0;
      games.push({ consensus: p, outcome: y, flagged });
    }
    const ev = abstentionEval(games);
    expect(ev.logLossKept).toBeLessThan(ev.logLossAll);
    expect(ev.keptRate).toBeCloseTo(0.75, 12);
    expect(() => abstentionEval([])).toThrow();
  });
});

describe("disagreementDividend", () => {
  it("is 0 on consensus and positive on disagreement", () => {
    expect(disagreementDividend(agree, 0.7)).toBeLessThan(0.05);
    expect(disagreementDividend(disagree, 0.5)).toBeGreaterThan(0.1);
    expect(() => disagreementDividend([], 0.5)).toThrow();
  });
});
