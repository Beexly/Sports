/**
 * Anchored live win probability — tests (arXiv 2204.11777).
 *
 * ACCEPTANCE GATE: the anchor dominates at kickoff and vanishes late;
 * early-game blowout leads do not overreact (regularized toward anchor);
 * the in-game component is monotone in score differential; fitting
 * recovers sensible parameters and beats the raw anchor on Brier;
 * degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  anchorWeight,
  anchoredLiveWp,
  fitAnchorParams,
  heldOutBrier,
  inGameComponent,
  type GameState,
} from "./anchored-live-wp";

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

const P = { kappa: 2, alpha: 0.15, betaPoss: 0.3 };

describe("anchorWeight", () => {
  it("decays from ~1 at kickoff to ~0 late", () => {
    expect(anchorWeight(3600, 2)).toBeCloseTo(1, 12);
    expect(anchorWeight(0, 2)).toBeCloseTo(Math.exp(-2), 12);
    expect(anchorWeight(1800, 2)).toBeGreaterThan(anchorWeight(0, 2));
    expect(() => anchorWeight(-5, 2)).toThrow();
    expect(() => anchorWeight(100, -1)).toThrow();
  });
});

describe("inGameComponent", () => {
  it("is monotone in score differential", () => {
    const s = (d: number): GameState => ({
      secondsLeft: 900,
      scoreDiff: d,
      possession: 0,
      yardsToGo: 0,
      timeoutFrac: 1,
    });
    expect(inGameComponent(s(14), P)).toBeGreaterThan(inGameComponent(s(0), P));
    expect(inGameComponent(s(0), P)).toBeGreaterThan(inGameComponent(s(-14), P));
    expect(inGameComponent(s(0), P)).toBeCloseTo(0.5, 12);
  });
});

describe("anchoredLiveWp", () => {
  it("regularizes early blowouts toward the anchor", () => {
    const early14: GameState = {
      secondsLeft: 3300,
      scoreDiff: 14,
      possession: 0,
      yardsToGo: 0,
      timeoutFrac: 1,
    };
    const p = anchoredLiveWp(0.55, early14, P);
    // Anchor weight ~ exp(-2 * 300/3600) ~= 0.85: mostly anchor.
    expect(p).toBeGreaterThan(0.55);
    expect(p).toBeLessThan(0.75); // no MLE-style overreaction
    // Late and close: the in-game component dominates.
    const late0: GameState = {
      secondsLeft: 120,
      scoreDiff: 0,
      possession: 1,
      yardsToGo: 0,
      timeoutFrac: 0.5,
    };
    const pl = anchoredLiveWp(0.5, late0, P);
    expect(pl).toBeGreaterThan(0.5); // possession bump lifts it above a toss-up
    expect(() => anchoredLiveWp(0, early14, P)).toThrow();
  });
});

describe("fitAnchorParams", () => {
  it("learns parameters that beat the raw anchor on Brier", () => {
    const rand = mulberry32(171);
    const rows: { anchor: number; state: GameState; won: number }[] = [];
    for (let i = 0; i < 800; i++) {
      const anchor = 0.3 + rand() * 0.4;
      const secondsLeft = rand() * 3600;
      const scoreDiff = Math.round((rand() - 0.5) * 28);
      // True model: anchor early, score differential late.
      const w = Math.exp(-2 * (1 - secondsLeft / 3600));
      const pTrue = w * anchor + (1 - w) * (1 / (1 + Math.exp(-0.15 * scoreDiff)));
      const state: GameState = {
        secondsLeft,
        scoreDiff,
        possession: 0,
        yardsToGo: 0,
        timeoutFrac: 1,
      };
      rows.push({ anchor, state, won: rand() < pTrue ? 1 : 0 });
    }
    const params = fitAnchorParams(rows);
    expect(params.kappa).toBeGreaterThan(0);
    expect(params.alpha).toBeGreaterThan(0);
    const brierFit = heldOutBrier(rows, params);
    const brierAnchor = rows.reduce((a, r) => a + (r.anchor - r.won) ** 2, 0) / rows.length;
    expect(brierFit).toBeLessThan(brierAnchor);
    expect(() => fitAnchorParams([])).toThrow();
    expect(() => heldOutBrier([], params)).toThrow();
  });
});
