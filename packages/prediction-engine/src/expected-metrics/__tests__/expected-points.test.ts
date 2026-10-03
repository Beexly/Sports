/**
 * Unit tests for the expected-points (EP → EPA) module.
 *
 * Synthetic, deterministic fixtures: a large set of goal-line plays that lead to
 * touchdowns and a large set of own-1 plays that lead to opponent scores, so the
 * fitted surface has real directional signal without touching any network or clock.
 */

import { describe, expect, it } from "vitest";
import {
  deriveNextScore,
  EP_OUTCOMES,
  EXPECTED_POINTS_FEATURE_KEYS,
  MIN_EP_PLAYS_TO_FIT,
  expectedPointsAdded,
  fitExpectedPointsModel,
  predictExpectedPoints,
  predictScoreDistribution,
  type EpPlay,
  type NextScoreOutcome,
  type RawScoringContext,
} from "../expected-points.js";
import { computeFeatureSchemaHash } from "../types.js";

/** Deterministic pseudo-random in [0,1) so fixtures vary without a clock. */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function play(partial: Partial<EpPlay> & { nextScore: NextScoreOutcome | null }): EpPlay {
  return {
    playId: "g-1",
    down: 1,
    ydstogo: 10,
    yardline100: 50,
    halfSecondsRemaining: 900,
    goalToGo: 0,
    ...partial,
  };
}

/**
 * Build a labelled corpus: near the opponent goal → TD-heavy; deep in own end →
 * opponent-score-heavy; midfield → mixed field goals / none. Includes a handful of
 * rare safeties so the SAFETY head can fit (togglable).
 */
function corpus(includeSafety: boolean, includeOppSafety: boolean): EpPlay[] {
  const rnd = prng(42);
  const plays: EpPlay[] = [];
  const n = MIN_EP_PLAYS_TO_FIT + 400;
  for (let i = 0; i < n; i++) {
    const bucket = i % 5;
    if (bucket === 0) {
      // Goal-to-go near opponent end zone → mostly TD.
      const scored = rnd() < 0.8;
      plays.push(
        play({
          yardline100: 2,
          ydstogo: 2,
          goalToGo: 1,
          down: 1,
          nextScore: scored ? "TD" : "FG",
        }),
      );
    } else if (bucket === 1) {
      // Red zone → TD or FG.
      plays.push(play({ yardline100: 15, ydstogo: 8, nextScore: rnd() < 0.5 ? "TD" : "FG" }));
    } else if (bucket === 2) {
      // Midfield → FG or NONE.
      plays.push(play({ yardline100: 50, ydstogo: 10, nextScore: rnd() < 0.5 ? "FG" : "NONE" }));
    } else if (bucket === 3) {
      // Backed up own end → opponent scores or safety.
      const roll = rnd();
      const label: NextScoreOutcome =
        includeOppSafety && roll < 0.05 ? "OPP_SAFETY" : roll < 0.6 ? "OPP_TD" : "OPP_FG";
      plays.push(play({ yardline100: 95, ydstogo: 12, nextScore: label }));
    } else {
      // Own territory → NONE mostly, rare own safety.
      const roll = rnd();
      const label: NextScoreOutcome = includeSafety && roll < 0.05 ? "SAFETY" : "NONE";
      plays.push(play({ yardline100: 80, ydstogo: 10, nextScore: label }));
    }
  }
  return plays;
}

describe("fitExpectedPointsModel", () => {
  it("returns null below the sample floor", () => {
    const few = corpus(true, true).slice(0, MIN_EP_PLAYS_TO_FIT - 1);
    expect(fitExpectedPointsModel(few)).toBeNull();
  });

  it("returns null when a REQUIRED head has no positives", () => {
    // Strip every TD label → the required TD head is degenerate.
    const plays = corpus(true, true).map((p) =>
      p.nextScore === "TD" ? play({ ...p, nextScore: "FG" }) : p,
    );
    expect(fitExpectedPointsModel(plays)).toBeNull();
  });

  it("still fits when only a RARE head (SAFETY) has no positives (graceful degradation)", () => {
    const model = fitExpectedPointsModel(corpus(false, true));
    expect(model).not.toBeNull();
    if (!model) return;
    const safetyIdx = EP_OUTCOMES.indexOf("SAFETY");
    expect(model.perOutcome[safetyIdx]).toBeNull();
    // A required head is present.
    expect(model.perOutcome[EP_OUTCOMES.indexOf("TD")]).not.toBeNull();
  });

  it("stamps provenance with the schema hash, method, and usable sample size", () => {
    const plays = corpus(true, true);
    const model = fitExpectedPointsModel(plays);
    expect(model).not.toBeNull();
    if (!model) return;
    expect(model.provenance.method).toBe("multinomial-ovr-logistic");
    // Pinned LITERAL — an independent value that catches feature-contract drift a
    // recompute-from-the-same-constant assertion cannot (both would move together).
    expect(model.provenance.featureSchemaHash).toBe("dd4831b9");
    // Secondary consistency check: source constant and stamped hash still agree.
    expect(model.provenance.featureSchemaHash).toBe(
      computeFeatureSchemaHash(EXPECTED_POINTS_FEATURE_KEYS),
    );
    expect(model.provenance.sampleSize).toBe(plays.length);
  });

  it("is deterministic — two fits produce identical coefficients and hash", () => {
    const plays = corpus(true, true);
    const a = fitExpectedPointsModel(plays);
    const b = fitExpectedPointsModel(plays);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("predictScoreDistribution / predictExpectedPoints", () => {
  const model = fitExpectedPointsModel(corpus(false, true))!;

  it("produces a valid probability vector (sums to 1, entries in [0,1])", () => {
    const dist = predictScoreDistribution(model, play({ yardline100: 30, nextScore: null }));
    let sum = 0;
    for (const p of dist) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      sum += p;
    }
    expect(sum).toBeCloseTo(1, 9);
    // The null SAFETY head contributes raw 0 yet the vector still normalizes.
    expect(dist[EP_OUTCOMES.indexOf("SAFETY")]).toBe(0);
  });

  it("keeps EP within [-7, 7] for every fixture", () => {
    for (const yl of [1, 5, 20, 50, 80, 95, 99]) {
      const ep = predictExpectedPoints(model, play({ yardline100: yl, nextScore: null }));
      expect(ep).toBeGreaterThanOrEqual(-7);
      expect(ep).toBeLessThanOrEqual(7);
    }
  });

  it("expects more points near the opponent goal than deep in own territory", () => {
    const nearGoal = predictExpectedPoints(
      model,
      play({ yardline100: 2, ydstogo: 2, goalToGo: 1, nextScore: null }),
    );
    const ownEnd = predictExpectedPoints(model, play({ yardline100: 95, ydstogo: 12, nextScore: null }));
    expect(nearGoal).toBeGreaterThan(ownEnd);
  });
});

describe("non-finite input hardening (EP surface stays bounded)", () => {
  it("imputes a NaN halfSecondsRemaining at predict → finite EP within [-7,7] (~uniform)", () => {
    const model = fitExpectedPointsModel(corpus(false, true))!;
    // Number("NA") === NaN — the exact way a bad clock column arrives from a loader.
    const nanClock = play({ yardline100: 30, halfSecondsRemaining: Number("NA"), nextScore: null });
    const ep = predictExpectedPoints(model, nanClock);
    expect(Number.isFinite(ep)).toBe(true);
    expect(ep).toBeGreaterThanOrEqual(-7);
    expect(ep).toBeLessThanOrEqual(7);
  });

  it("a single NaN-halfSeconds training play does not NaN-poison the fitted model", () => {
    const poisoned: EpPlay[] = [
      play({ yardline100: 50, ydstogo: 10, halfSecondsRemaining: Number("NA"), nextScore: "NONE" }),
      ...corpus(false, true),
    ];
    const model = fitExpectedPointsModel(poisoned);
    expect(model).not.toBeNull();
    if (!model) return;
    // Sampled prediction on a well-formed state must be finite (weights not NaN).
    const ep = predictExpectedPoints(model, play({ yardline100: 20, ydstogo: 8, nextScore: null }));
    expect(Number.isFinite(ep)).toBe(true);
    expect(ep).toBeGreaterThanOrEqual(-7);
    expect(ep).toBeLessThanOrEqual(7);
  });
});

describe("expectedPointsAdded — possession flip negates", () => {
  const model = fitExpectedPointsModel(corpus(false, true))!;

  it("flip minus no-flip equals -2·EP(after) and the losing case is more negative", () => {
    const before = play({ yardline100: 40, nextScore: null });
    // Construct `after` with EP(after) > 0 (near opponent goal from the new frame).
    const after = play({ yardline100: 20, ydstogo: 8, nextScore: null });
    const epAfter = predictExpectedPoints(model, after);
    expect(epAfter).toBeGreaterThan(0);

    const flip = expectedPointsAdded(model, before, after, true);
    const noFlip = expectedPointsAdded(model, before, after, false);
    expect(flip - noFlip).toBeCloseTo(-2 * epAfter, 9);
    expect(flip).toBeLessThan(noFlip);
  });
});

describe("deriveNextScore", () => {
  function ctx(partial: Partial<RawScoringContext>): RawScoringContext {
    return { half: 1, posteam: "AAA", scoringTeam: null, scoreType: null, ...partial };
  }

  it("stamps preceding same-half plays in the possession frame", () => {
    const plays: RawScoringContext[] = [
      ctx({ posteam: "AAA" }),
      ctx({ posteam: "AAA" }),
      ctx({ posteam: "AAA", scoringTeam: "AAA", scoreType: "TD" }), // own TD
      ctx({ posteam: "BBB" }),
      ctx({ posteam: "BBB", scoringTeam: "AAA", scoreType: "FG" }), // opponent FG for BBB
    ];
    const labels = deriveNextScore(plays);
    expect(labels[0]).toBe("TD");
    expect(labels[1]).toBe("TD");
    expect(labels[2]).toBe("TD");
    expect(labels[3]).toBe("OPP_FG");
    expect(labels[4]).toBe("OPP_FG");
  });

  it("labels a scoreless tail (and the second half) NONE, not null", () => {
    const plays: RawScoringContext[] = [
      ctx({ half: 1, posteam: "AAA", scoringTeam: "AAA", scoreType: "FG" }),
      ctx({ half: 1, posteam: "AAA" }), // after the last first-half score → NONE
      ctx({ half: 2, posteam: "BBB" }), // second half, no score → NONE
    ];
    const labels = deriveNextScore(plays);
    expect(labels[0]).toBe("FG");
    expect(labels[1]).toBe("NONE");
    expect(labels[2]).toBe("NONE");
  });

  it("does not cross a half boundary when scanning forward", () => {
    const plays: RawScoringContext[] = [
      ctx({ half: 1, posteam: "AAA" }),
      ctx({ half: 2, posteam: "AAA", scoringTeam: "AAA", scoreType: "TD" }),
    ];
    // The first-half play must NOT see the second-half TD.
    expect(deriveNextScore(plays)[0]).toBe("NONE");
  });
});
