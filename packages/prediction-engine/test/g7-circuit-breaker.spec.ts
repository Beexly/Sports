/**
 * G7 -- the calibration-drift circuit breaker, per market family.
 *
 * WHAT THIS SUITE IS FOR.
 *
 * `settlement-loop.ts` computes G7's RULE correctly and its own gate pins the boundary. What
 * was missing was the thing the spec's rule actually says: "halts firing on that MARKET
 * FAMILY". A rule that takes a bag of samples cannot know which family it is judging, so it
 * was never wired, and even if it had been, it would have judged a MIXTURE of families
 * against each other.
 *
 * AND THE BIGGER FINDING: the spec's threshold, applied literally, is not a drift detector.
 * It is a halt-everything switch. Measured over 400 PERFECTLY CALIBRATED families -- p
 * spread across the probability range, outcomes drawn FROM those forecasts, so no drift at
 * all -- the rule `ECE_30 - ECE_250 > 0.02` halts **397 of 400**. The reason is that a
 * binned ECE is an ABSOLUTE value, so its expectation under perfect calibration is not
 * zero, and the smaller (30-sample) window has the larger fluctuation. The spec's threshold
 * is 0.219 of ONE standard error.
 *
 * So this suite tests the FAMILY behaviour AND the noise floor:
 *
 *   1. A family that drifts HALTS, and the verdict carries the evidence.
 *   2. A family that does NOT drift keeps emitting -- including a family whose raw
 *      difference EXCEEDS the spec's 0.02, which is the case the spec's rule gets wrong.
 *   3. A family's verdict is INDEPENDENT of every other family's observations.
 *   4. The fast window is the MOST RECENT, ordered by settlement time.
 *   5. The noise floor is the BIAS EXCESS plus the spec's threshold plus the sigma band.
 *   6. A family with too FEW observations is not judged, and one with invalid observations
 *      is not judged either.
 *   7. The group key is the repo's own `sport|market` shape, so the halt list it produces is
 *      the shape the durable pause reader actually checks.
 *   8. The spec's verdict and the usable verdict are BOTH reported, so a reader can see
 *      which one the gate used and why they differ.
 */
import { describe, expect, it } from "vitest";

import {
  G7_MIN_FAMILY_SAMPLES,
  G7_NOISE_SIGMA,
  eceNoise,
  g7CircuitBreaker,
  g7DriftVerdict,
  g7HaltNote,
  g7HaltedGroupKeys,
  g7VerdictForFamily,
  marketFamilyKey,
  type SettledObservation,
} from "../src/learning/g7-circuit-breaker.js";
import { G7_ECE_HALT_THRESHOLD } from "../src/learning/settlement-loop.js";

/**
 * A deterministic generator. No Math.random anywhere in this suite -- a test whose inputs
 * move is a test that passes sometimes.
 */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

/**
 * A PERFECTLY CALIBRATED family: p spread over the probability range, and the outcome drawn
 * FROM p. By construction there is no drift, and this is the family the spec's rule
 * mis-halts.
 *
 * The spread matters. A family whose forecasts are all 0.5 puts every observation in one
 * calibration bin, so its ECE is the |observed frequency - 0.5| of a single bin -- pure
 * sampling noise, and not the thing a calibration rule is about. The first version of this
 * fixture used p=0.5, and it "passed" only because the noise happened to fall under the
 * threshold on that one seed.
 */
function calibratedFamily(
  groupKey: string,
  n: number,
  seed: number,
  startAt = 1_700_000_000_000,
): SettledObservation[] {
  const rand = makeRng(seed);
  const out: SettledObservation[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.05 + 0.9 * rand();
    out.push({ groupKey, p, y: rand() < p ? 1 : 0, settledAt: startAt + i * 60_000 });
  }
  return out;
}

/**
 * A GENUINELY DRIFTING family: the OLD window was calibrated, and the RECENT window
 * forecasts 0.95 for EVERY bet while the outcome is a coin flip. That is overconfidence --
 * the forecast says "sure thing" and reality says "coin flip" -- so the recent bin has mean
 * forecast 0.95 and observed frequency ~0.5.
 *
 * The first version of this generator pushed the LOSERS to 0.05, which is PERFECTLY
 * calibrated (it is right about the losers too) and so measured nothing. That is worth
 * recording: a "drift" fixture that does not drift will make any threshold look like it
 * works.
 */
function driftingFamily(
  groupKey: string,
  n: number,
  recentCount: number,
  seed: number,
  startAt = 1_700_000_000_000,
): SettledObservation[] {
  const rand = makeRng(seed);
  const out: SettledObservation[] = [];
  for (let i = 0; i < n; i++) {
    if (i >= n - recentCount) {
      out.push({ groupKey, p: 0.95, y: rand() < 0.5 ? 1 : 0, settledAt: startAt + i * 60_000 });
    } else {
      const p = 0.05 + 0.9 * rand();
      out.push({ groupKey, p, y: rand() < p ? 1 : 0, settledAt: startAt + i * 60_000 });
    }
  }
  return out;
}

describe("G7 -- the calibration-drift circuit breaker, per market family", () => {
  it("a family whose RECENT window drifted HALTS, and the verdict carries the evidence", () => {
    const obs = driftingFamily("nfl|MONEYLINE", 300, 30, 4242);
    const report = g7CircuitBreaker(obs);

    expect(report.haltedGroups).toEqual(["nfl|MONEYLINE"]);
    const verdict = report.verdicts[0]!;
    expect(verdict.halt).toBe(true);
    expect(verdict.reason).toBe("drift_above_threshold");
    // The EVIDENCE, not just the boolean. A reader must be able to check the number.
    expect(Number.isFinite(verdict.eceFast)).toBe(true);
    expect(Number.isFinite(verdict.eceSlow)).toBe(true);
    expect(verdict.difference).toBeCloseTo(verdict.eceFast - verdict.eceSlow, 12);
    expect(verdict.threshold).toBe(G7_ECE_HALT_THRESHOLD);
    // The fast window is the recent 30, the slow baseline the recent 250.
    expect(verdict.fastN).toBe(30);
    expect(verdict.slowN).toBe(250);
  });

  /**
   * THE MOST IMPORTANT TEST IN THIS FILE.
   *
   * A family with NO DRIFT must keep emitting, EVEN WHEN ITS RAW DIFFERENCE EXCEEDS THE
   * SPEC'S 0.02 THRESHOLD.
   *
   * This is the case the spec's literal rule gets wrong, and measured over 400 calibrated
   * families it is the COMMON case: the spec's rule halts 397 of 400 of them. If this test
   * were written to assert the spec's rule, it would have to assert a false halt -- which
   * is why the noise floor is here, and why the spec's verdict is reported separately rather
   * than acted on.
   */
  it("a family with NO drift keeps emitting, even when its raw difference exceeds 0.02", () => {
    // Build calibrated families and find one whose RAW difference clears the spec's
    // threshold -- i.e. the spec's rule WOULD halt it -- and check the gate does not.
    let sawSpecWouldHalt = false;
    for (let seed = 1; seed <= 40; seed++) {
      const obs = calibratedFamily("nfl|MONEYLINE", 300, seed * 1013);
      const verdict = g7VerdictForFamily("nfl|MONEYLINE", obs);
      if (verdict.specHalt) {
        sawSpecWouldHalt = true;
        // The spec's rule says halt; the gate says no.
        expect(verdict.halt).toBe(false);
        expect(verdict.reason).toBe("no_drift");
        // And the noise floor is what did it -- the difference did not clear it.
        expect(verdict.difference).toBeLessThanOrEqual(verdict.noiseFloor);
        return;
      }
    }
    // If no calibrated family cleared the spec's threshold in 40 tries, the test would be
    // vacuous, so FAIL rather than pass silently.
    expect(
      sawSpecWouldHalt,
      "no calibrated family cleared the spec's 0.02 threshold -- the test is vacuous",
    ).toBe(true);
  });

  it("over 40 calibrated families, NONE is halted, and the ones that clear 0.02 are the spec's false positives", () => {
    let specWouldHalt = 0;
    let halted = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const verdict = g7VerdictForFamily(
        "nfl|MONEYLINE",
        calibratedFamily("nfl|MONEYLINE", 300, seed * 7919),
      );
      if (verdict.specHalt) specWouldHalt++;
      if (verdict.halt) halted++;
    }
    // The spec's rule is wrong often.
    expect(specWouldHalt).toBeGreaterThan(0);
    // The gate is right.
    expect(halted).toBe(0);
  });

  it("a genuinely drifting family is halted, across many seeds", () => {
    let halted = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const verdict = g7VerdictForFamily(
        "nfl|MONEYLINE",
        driftingFamily("nfl|MONEYLINE", 300, 30, seed * 6151),
      );
      if (verdict.halt) halted++;
    }
    expect(halted, "the drift detector must catch real drift, not just avoid false alarms").toBe(20);
  });

  it("the noise floor is the BIAS EXCESS plus the threshold plus the sigma band", () => {
    const obs = driftingFamily("nfl|MONEYLINE", 300, 30, 99);
    const probs = obs.map((o) => o.p);
    const outcomes = obs.map((o) => o.y);
    const drift = g7DriftVerdict(probs, outcomes);

    const fastNoise = eceNoise(probs.slice(-30), outcomes.slice(-30));
    const slowNoise = eceNoise(probs.slice(-250), outcomes.slice(-250));
    const expectedFloor =
      fastNoise.bias -
      slowNoise.bias +
      G7_ECE_HALT_THRESHOLD +
      G7_NOISE_SIGMA * Math.hypot(fastNoise.standardError, slowNoise.standardError);
    expect(drift.noiseFloor).toBeCloseTo(expectedFloor, 12);
    // And the spec's threshold is a COMPONENT of the floor, not replaced by it.
    expect(drift.threshold).toBe(G7_ECE_HALT_THRESHOLD);
    expect(drift.noiseFloor).toBeGreaterThan(G7_ECE_HALT_THRESHOLD);
  });

  /**
   * THE NOISE NUMBERS ARE COMPUTED INDEPENDENTLY HERE.
   *
   * The test above recomputes the expected floor with `eceNoise` -- the SAME function the
   * module uses. That makes it a tautology: change `eceNoise` and both sides move together,
   * so the test still passes. A mutation sweep caught exactly that ("the standard error is
   * computed with the wrong rate" survived).
   *
   * So the bias and the standard error are RECOMPUTED HERE, from the bin structure, with
   * no reference to the module's helper. If the module's arithmetic drifts from the
   * definition, this test fails.
   *
   * THE DEFINITION BEING PINNED. For each non-empty bin, with the bin's mean forecast
   * p_bar, count N, and the bin's observed rate y_bar:
   *   sigma  = sqrt(p_bar (1 - p_bar) / N)      the standard error of the bin's frequency
   *   bias   = sum_k (N_k/N) * sigma * sqrt(2/pi)   the expected |deviation| of the ECE
   *   se^2   = sum_k (N_k/N)^2 * sigma^2        the variance of the ECE estimate
   */
  it("the bias and standard error match an INDEPENDENT recomputation from the bin structure", () => {
    const obs = calibratedFamily("nfl|MONEYLINE", 300, 13);
    const probs = obs.map((o) => o.p);
    const outcomes = obs.map((o) => o.y);
    const BIN_COUNT = 10;

    /** An independent implementation, written from the definition above. */
    function independentNoise(ps: readonly number[], ys: readonly number[]) {
      const bins = Array.from({ length: BIN_COUNT }, () => ({ count: 0, pSum: 0 }));
      for (let k = 0; k < ps.length; k++) {
        let idx = Math.floor((ps[k] as number) * BIN_COUNT);
        if (idx < 0) idx = 0;
        if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
        const b = bins[idx]!;
        b.count += 1;
        b.pSum += ps[k] as number;
      }
      const n = ps.length;
      let bias = 0;
      let variance = 0;
      for (const b of bins) {
        if (b.count === 0) continue;
        const pBar = b.pSum / b.count;
        const sigma = Math.sqrt((pBar * (1 - pBar)) / b.count);
        bias += (b.count / n) * sigma * Math.sqrt(2 / Math.PI);
        variance += (b.count / n) ** 2 * sigma * sigma;
      }
      return { bias, standardError: Math.sqrt(variance) };
    }

    for (const [label, window] of [
      ["fast", 30],
      ["slow", 250],
    ] as const) {
      const ps = probs.slice(-window);
      const ys = outcomes.slice(-window);
      const mine = independentNoise(ps, ys);
      const theirs = eceNoise(ps, ys);
      expect(theirs.bias, `${label} bias`).toBeCloseTo(mine.bias, 12);
      expect(theirs.standardError, `${label} standard error`).toBeCloseTo(mine.standardError, 12);
    }

    // And the drift verdict's own reported numbers must agree with the independent ones, so
    // a change to the module's arithmetic cannot hide behind a shared helper.
    const drift = g7DriftVerdict(probs, outcomes);
    const fastIndependent = independentNoise(probs.slice(-30), outcomes.slice(-30));
    const slowIndependent = independentNoise(probs.slice(-250), outcomes.slice(-250));
    expect(drift.biasFast).toBeCloseTo(fastIndependent.bias, 12);
    expect(drift.biasSlow).toBeCloseTo(slowIndependent.bias, 12);
    expect(drift.standardErrorFast).toBeCloseTo(fastIndependent.standardError, 12);
    expect(drift.standardErrorSlow).toBeCloseTo(slowIndependent.standardError, 12);
  });

  it("the noise floor of a perfectly calibrated family is POSITIVE -- the bias is real", () => {
    const obs = calibratedFamily("nfl|MONEYLINE", 300, 7);
    const probs = obs.map((o) => o.p);
    const outcomes = obs.map((o) => o.y);
    const fastNoise = eceNoise(probs.slice(-30), outcomes.slice(-30));
    const slowNoise = eceNoise(probs.slice(-250), outcomes.slice(-250));
    // The fast window's expected ECE exceeds the slow one's, because it is smaller.
    expect(fastNoise.bias).toBeGreaterThan(slowNoise.bias);
    expect(fastNoise.standardError).toBeGreaterThan(slowNoise.standardError);
  });

  /**
   * THE INDEPENDENCE PROPERTY. This is the one that makes "per family" true.
   *
   * A drifting family must still be caught when a healthy family is present, and the healthy
   * family must not be dragged down by it. If the implementation shared a window, a
   * normalisation, or an accumulator across families, one of these two assertions would fail.
   */
  it("a family's verdict does NOT depend on any other family's observations", () => {
    const drifting = driftingFamily("nfl|MONEYLINE", 300, 30, 11);
    const healthy = calibratedFamily("nfl|PROP", 300, 22);

    const together = g7CircuitBreaker([...drifting, ...healthy]);
    expect(together.haltedGroups).toEqual(["nfl|MONEYLINE"]);
    expect(together.emittingGroups).toEqual(["nfl|PROP"]);

    // And the SAME verdict, computed alone. This is the strong form: the numbers are
    // identical, not merely the same halt/no-halt answer.
    const alone = g7CircuitBreaker(drifting);
    const vTogether = together.verdicts.find((v) => v.groupKey === "nfl|MONEYLINE")!;
    const vAlone = alone.verdicts[0]!;
    expect(vAlone.eceFast).toBe(vTogether.eceFast);
    expect(vAlone.eceSlow).toBe(vTogether.eceSlow);
    expect(vAlone.difference).toBe(vTogether.difference);
    expect(vAlone.fastN).toBe(vTogether.fastN);
    expect(vAlone.slowN).toBe(vTogether.slowN);
  });

  /**
   * THE FAST WINDOW IS THE MOST RECENT, BY SETTLEMENT TIME.
   *
   * If the window were the last N in ARRAY order, then handing the same observations in a
   * different order would change the verdict -- and a rule whose answer depends on the
   * order the caller happened to supply is not a drift rule. This is the regression guard
   * for exactly that.
   */
  it("the fast window is the most RECENT by settlement time, not the last N in array order", () => {
    const obs = driftingFamily("nfl|MONEYLINE", 300, 30, 5);
    // Reverse the array. The verdict must be IDENTICAL.
    const forward = g7VerdictForFamily("nfl|MONEYLINE", obs);
    const reversed = g7VerdictForFamily("nfl|MONEYLINE", [...obs].reverse());
    expect(reversed.eceFast).toBe(forward.eceFast);
    expect(reversed.difference).toBe(forward.difference);
    expect(reversed.halt).toBe(forward.halt);
    expect(reversed.halt).toBe(true);
  });

  it("a family with too FEW observations is NOT judged, and keeps emitting", () => {
    // Nine observations: nowhere near the 30 the fast window needs. A family with no
    // evidence is not a family PROVEN to have drifted.
    const few = calibratedFamily("nfl|PROP", 9, 3);
    const report = g7CircuitBreaker(few);
    expect(report.haltedGroups).toEqual([]);
    const v = report.verdicts[0]!;
    expect(v.reason).toBe("insufficient_samples");
    expect(v.halt).toBe(false);
    expect(v.fastN).toBeLessThan(G7_MIN_FAMILY_SAMPLES);
  });

  it("invalid observations are REJECTED, and the family is not judged on them", () => {
    const good = driftingFamily("nfl|MONEYLINE", 300, 30, 8);
    const report = g7CircuitBreaker([
      ...good,
      { groupKey: "nfl|MONEYLINE", p: 1.5, y: 1, settledAt: 1_800_000_000_000 },
      { groupKey: "nfl|MONEYLINE", p: 0.5, y: 7 as unknown as 0, settledAt: 1_800_000_000_001 },
      { groupKey: "nfl|MONEYLINE", p: 0.5, y: 1, settledAt: NaN },
    ]);
    // The bad ones are REPORTED, not silently dropped.
    expect(report.rejected.length).toBe(3);
    expect(report.rejected[0]!.reason).toContain("out of range");
    // And the good data still drives the verdict.
    expect(report.haltedGroups).toEqual(["nfl|MONEYLINE"]);
  });

  it("a family with ONLY invalid observations is reported, not invented", () => {
    const report = g7CircuitBreaker([
      { groupKey: "nfl|MONEYLINE", p: 2, y: 1, settledAt: 1_800_000_000_000 },
    ]);
    expect(report.verdicts.length).toBe(0);
    expect(report.haltedGroups).toEqual([]);
    expect(report.rejected.length).toBe(1);
  });

  /**
   * THE GROUP KEY IS THE REPO'S OWN SHAPE.
   *
   * `selective-publish-runtime.ts` builds `${pick.sportKey}|${pick.pickType}` and checks
   * `pausedGroups.includes(groupKey)`. If this module built a different shape, the halt list
   * it produces would never match, and the "gate" would silently never fire. The key is
   * pinned to the reader's shape.
   */
  it("the group key is the repo's `sport|market` shape, and the halt list is a flat array", () => {
    expect(marketFamilyKey("nfl", "MONEYLINE")).toBe("nfl|MONEYLINE");
    expect(marketFamilyKey(null, null)).toBe("unknown|unknown");
    expect(marketFamilyKey("", "")).toBe("unknown|unknown");

    const obs = [
      ...driftingFamily("nfl|MONEYLINE", 300, 30, 4),
      ...calibratedFamily("nfl|SPREAD", 300, 33),
    ];
    const report = g7CircuitBreaker(obs);
    // The list is a flat array of keys -- exactly what `pausedGroups.includes(groupKey)`
    // is handed.
    const keys = g7HaltedGroupKeys(report);
    expect(Array.isArray(keys)).toBe(true);
    expect(keys).toEqual(["nfl|MONEYLINE"]);
    for (const k of keys) expect(typeof k).toBe("string");
  });

  it("the halt note states the rule, the numbers and the window sizes", () => {
    const obs = driftingFamily("nfl|MONEYLINE", 300, 30, 6);
    const report = g7CircuitBreaker(obs);
    const note = g7HaltNote(report);
    // A bare "paused" gives a reader nothing to check the decision against.
    expect(note).toContain("nfl|MONEYLINE");
    expect(note).toContain("ECE30");
    expect(note).toContain("ECE250");
    expect(note).toContain("0.02");
    expect(note).toContain("n=250");
  });

  it("the note for a clean run says so, and names no family", () => {
    const obs = calibratedFamily("nfl|MONEYLINE", 300, 2);
    const note = g7HaltNote(g7CircuitBreaker(obs));
    expect(note).toContain("no market family");
    expect(note).not.toContain("nfl|MONEYLINE");
  });
});
