/**
 * Unit tests for the win-probability (WP → WPA) module.
 *
 * Synthetic deterministic fixtures: leading-late plays are labelled wins,
 * trailing-late plays losses, so the fitted logistic has real directional signal.
 */

import { describe, expect, it } from "vitest";
import {
  MIN_WP_PLAYS_TO_FIT,
  WIN_PROBABILITY_FEATURE_KEYS,
  fitWinProbabilityModel,
  predictWinProbability,
  winProbabilityAdded,
  type WpPlay,
} from "../win-probability.js";
import { computeFeatureSchemaHash } from "../types.js";

function play(partial: Partial<WpPlay> & { posteamWon: 0 | 1 }): WpPlay {
  return {
    playId: "g-1",
    scoreDifferential: 0,
    gameSecondsRemaining: 1800,
    yardline100: 50,
    down: 1,
    ydstogo: 10,
    posteamTimeouts: 3,
    defteamTimeouts: 3,
    spreadLine: 0,
    ...partial,
  };
}

/** Leaders late win, trailers late lose; midgame mixed — real separable signal. */
function corpus(): WpPlay[] {
  const plays: WpPlay[] = [];
  const n = MIN_WP_PLAYS_TO_FIT + 400;
  for (let i = 0; i < n; i++) {
    const bucket = i % 4;
    if (bucket === 0) {
      plays.push(play({ scoreDifferential: 14, gameSecondsRemaining: 120, posteamWon: 1 }));
    } else if (bucket === 1) {
      plays.push(play({ scoreDifferential: -14, gameSecondsRemaining: 120, posteamWon: 0 }));
    } else if (bucket === 2) {
      plays.push(play({ scoreDifferential: 7, gameSecondsRemaining: 1500, posteamWon: 1 }));
    } else {
      plays.push(play({ scoreDifferential: -7, gameSecondsRemaining: 1500, posteamWon: 0 }));
    }
  }
  return plays;
}

describe("fitWinProbabilityModel", () => {
  it("returns null below the sample floor", () => {
    expect(fitWinProbabilityModel(corpus().slice(0, MIN_WP_PLAYS_TO_FIT - 1))).toBeNull();
  });

  it("returns null on degenerate labels (all wins)", () => {
    const plays = corpus().map((p) => play({ ...p, posteamWon: 1 }));
    expect(fitWinProbabilityModel(plays)).toBeNull();
  });

  it("stamps logistic-regression provenance with a stable schema hash", () => {
    const plays = corpus();
    const model = fitWinProbabilityModel(plays);
    expect(model).not.toBeNull();
    if (!model) return;
    expect(model.provenance.method).toBe("logistic-regression");
    // Pinned LITERAL — an independent value that catches feature-contract drift a
    // recompute-from-the-same-constant assertion cannot (both would move together).
    expect(model.provenance.featureSchemaHash).toBe("5678f5c9");
    // Secondary consistency check: source constant and stamped hash still agree.
    expect(model.provenance.featureSchemaHash).toBe(
      computeFeatureSchemaHash(WIN_PROBABILITY_FEATURE_KEYS),
    );
    expect(model.provenance.sampleSize).toBe(plays.length);
  });

  it("is deterministic across two fits", () => {
    const plays = corpus();
    expect(JSON.stringify(fitWinProbabilityModel(plays))).toBe(
      JSON.stringify(fitWinProbabilityModel(plays)),
    );
  });
});

describe("predictWinProbability", () => {
  const model = fitWinProbabilityModel(corpus())!;

  it("stays in the open interval (0,1) for every fixture (no clamp)", () => {
    for (const diff of [-21, -7, 0, 7, 21]) {
      for (const t of [30, 900, 1800]) {
        const wp = predictWinProbability(model, play({ scoreDifferential: diff, gameSecondsRemaining: t, posteamWon: 1 }));
        expect(wp).toBeGreaterThan(0);
        expect(wp).toBeLessThan(1);
      }
    }
  });

  it("drives toward 1 when leading big late and toward 0 when trailing big late", () => {
    const leading = predictWinProbability(model, play({ scoreDifferential: 21, gameSecondsRemaining: 60, posteamWon: 1 }));
    const trailing = predictWinProbability(model, play({ scoreDifferential: -21, gameSecondsRemaining: 60, posteamWon: 0 }));
    expect(leading).toBeGreaterThan(0.8);
    expect(trailing).toBeLessThan(0.2);
  });
});

describe("non-finite input hardening (WP surface stays in (0,1))", () => {
  it("coerces a NaN posteamTimeouts at predict → WP strictly in (0,1)", () => {
    const model = fitWinProbabilityModel(corpus())!;
    // Number("NA") === NaN — a bad timeout column would make WP = σ(NaN) = NaN.
    const wp = predictWinProbability(model, play({ posteamTimeouts: Number("NA"), posteamWon: 1 }));
    expect(Number.isFinite(wp)).toBe(true);
    expect(wp).toBeGreaterThan(0);
    expect(wp).toBeLessThan(1);
  });

  it("a single NaN-timeout training row does not poison the fitted surface", () => {
    const poisoned: WpPlay[] = [
      play({ posteamTimeouts: Number("NA"), posteamWon: 1 }),
      ...corpus(),
    ];
    const model = fitWinProbabilityModel(poisoned);
    expect(model).not.toBeNull();
    if (!model) return;
    const wp = predictWinProbability(
      model,
      play({ scoreDifferential: 7, gameSecondsRemaining: 600, posteamWon: 1 }),
    );
    expect(Number.isFinite(wp)).toBe(true);
    expect(wp).toBeGreaterThan(0);
    expect(wp).toBeLessThan(1);
  });
});

describe("winProbabilityAdded — possession flip COMPLEMENTS (1 - p), not negates", () => {
  const model = fitWinProbabilityModel(corpus())!;

  it("uses the complement of WP(after) on a possession change", () => {
    const before = play({ scoreDifferential: 3, gameSecondsRemaining: 600, posteamWon: 1 });
    const after = play({ scoreDifferential: -3, gameSecondsRemaining: 580, posteamWon: 0 });
    const wpBefore = predictWinProbability(model, before);
    const w = predictWinProbability(model, after);

    const flip = winProbabilityAdded(model, before, after, true);
    // Correct: complement.
    expect(flip).toBeCloseTo(1 - w - wpBefore, 9);
    // NOT the negation form (guard against the classic bug).
    expect(flip).not.toBeCloseTo(-w - wpBefore, 6);
  });

  it("no-flip is a plain difference", () => {
    const before = play({ scoreDifferential: 3, gameSecondsRemaining: 600, posteamWon: 1 });
    const after = play({ scoreDifferential: 6, gameSecondsRemaining: 580, posteamWon: 1 });
    const expected = predictWinProbability(model, after) - predictWinProbability(model, before);
    expect(winProbabilityAdded(model, before, after, false)).toBeCloseTo(expected, 9);
  });
});
