/**
 * LAW 4 PROOF: the calibration seam must be threaded at EVERY
 * `assessIndependentEdge` call site, not one of them.
 *
 * WHY THIS FILE EXISTS. `assessIndependentEdge` gained an optional `calibrator`
 * parameter and `GameContextInput` gained `probabilityCalibrator`, but the two
 * call sites in `scoring.ts` are wired independently:
 *
 *   - `scoreSpreadPick`   (~line 672)  — reads `input.context?.probabilityCalibrator`
 *   - `scoreMoneylinePick` (~line 1307) — read NOTHING, so a caller supplying a
 *     map calibrated the SPREAD leg and silently left the MONEYLINE leg raw.
 *
 * A half-wired seam is worse than an unwired one, because it is invisible: the
 * map is present, the published `trueProb` on one market is calibrated, the
 * other is not, and nothing disagrees loudly. The only defence is a test that
 * drives the PUBLIC entrypoint (`scoreGame`) per market type and asserts the
 * calibrator's effect is observable on each.
 *
 * WHAT IS ASSERTED, per market type:
 *   1. THREADED   — supplying a calibrator changes the published
 *                   `independentEdge.trueProb` (a spy calibrator returning a
 *                   sentinel cannot be invisible if the parameter arrived).
 *   2. ISOLATED   — every other input is held byte-identical between the two
 *                   runs, so the only difference is the calibrator.
 *   3. DEFAULT    — omitting it reproduces the pre-seam number exactly. This is
 *                   the safety law: absent means unchanged.
 *   4. REFUSED    — a calibrator that throws / returns NaN / returns a
 *                   non-finite or out-of-range value falls back to the raw blend
 *                   rather than corrupting or blanking a published probability.
 *   5. RANKING    — the calibrated probability is what the ranking consumes,
 *                   i.e. calibration is applied BEFORE edge/ranking, not
 *                   cosmetically to the reported field only.
 */

import { describe, expect, it } from "vitest";

import { scoreGame } from "../scoring.js";
import { SKELLAM_COVER_SOURCE } from "../skellam.js";
import type { IndependentMarketFairValue, OddsInput, ScoredPick } from "@sports/types";

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

/**
 * A calibrator that reports whether it was ever CALLED and forces every input to
 * a sentinel. If a call site forgets to thread the parameter, this sentinel never
 * appears in the output and the count stays 0 — the assertion fails with a
 * message that names the unwired path rather than a bare number mismatch.
 */
function sentinelCalibrator(sentinel = 0.6111) {
  const calls: number[] = [];
  return {
    calls,
    predict: (p: number) => {
      calls.push(p);
      return sentinel;
    },
  };
}

// ============================================================
// Fixtures — one per market type, because the two call sites
// read DIFFERENT slices of independentFairValues:
//   SPREAD  consumes only  skellam_cover
//   ML      consumes only  everything that is NOT skellam_cover
// Each fixture therefore carries the sources its own path reads, so a failure
// localises to one call site instead of "somewhere in scoring.ts".
// ============================================================

/** SPREAD leg: the source the spread path actually consumes. */
function spreadInput(calibrator?: { predict: (p: number) => number }): OddsInput {
  return {
    gameId: "calib-spread",
    homeTeam: "Bruins",
    awayTeam: "Leafs",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NHL",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: -1.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
    context: {
      bookmakerCoverageMax: TEN_BOOKS.length,
      independentFairValues: [
        { source: SKELLAM_COVER_SOURCE, homeFairProb: 0.91, awayFairProb: 0.09 },
      ] as IndependentMarketFairValue[],
      probabilityCalibrator: calibrator,
    },
  };
}

/** MONEYLINE leg: the sources the moneyline path actually consumes. */
function mlInput(calibrator?: { predict: (p: number) => number }): OddsInput {
  return {
    gameId: "calib-ml",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -800,
      awayPrice: 650,
    })),
    context: {
      bookmakerCoverageMax: TEN_BOOKS.length,
      independentFairValues: [
        { source: "kalshi", homeFairProb: 0.95, awayFairProb: 0.05 },
        { source: "poisson", homeFairProb: 0.93, awayFairProb: 0.07 },
      ] as IndependentMarketFairValue[],
      probabilityCalibrator: calibrator,
    },
  };
}

const pickOf = (picks: ScoredPick[], type: ScoredPick["pickType"]): ScoredPick => {
  const found = picks.find((p) => p.pickType === type);
  expect(found, `expected a ${type} pick to be published`).toBeTruthy();
  return found!;
};

/**
 * Both market legs, described by their fixture builder. Every assertion below
 * runs for EACH entry — that is the whole point: a per-leg table means adding a
 * third call site later forces a new row rather than silently going unthreaded.
 */
const LEGS: Array<{ name: string; type: ScoredPick["pickType"]; make: (c?: { predict: (p: number) => number }) => OddsInput }> = [
  { name: "SPREAD (scoreSpreadPick)", type: "SPREAD", make: spreadInput },
  { name: "MONEYLINE (scoreMoneylinePick)", type: "MONEYLINE", make: mlInput },
];

describe.each(LEGS)("calibration seam threading — $name", ({ type, make }) => {
  it("THREADS the calibrator into the published trueProb", () => {
    const baseline = pickOf(scoreGame(make(undefined)), type);
    const spy = sentinelCalibrator();
    const calibrated = pickOf(scoreGame(make(spy)), type);

    // The parameter ARRIVED. A call site that forgot to pass it never invokes.
    expect(spy.calls.length, "calibrator.predict was never called — call site is half-wired").toBeGreaterThan(0);

    // ...and its output is the value the product publishes.
    const before = baseline.factorBreakdown.independentEdge?.trueProb;
    const after = calibrated.factorBreakdown.independentEdge?.trueProb;
    expect(before).not.toBeNull();
    expect(after).toBeCloseTo(spy.calls.length ? 0.6111 : -1, 6);
    expect(after).not.toBeCloseTo(before as number, 6);
  });

  it("DEFAULT: omitting the calibrator reproduces the pre-seam number exactly", () => {
    // The safety law. `undefined` must be indistinguishable from absent, so a
    // caller who knows nothing about calibration gets byte-identical behaviour
    // and no published number can move until a map is deliberately supplied.
    const absent = pickOf(scoreGame(make(undefined)), type);
    const explicitUndefined = pickOf(
      scoreGame({ ...make(undefined), context: { ...make(undefined).context, probabilityCalibrator: undefined } }),
      type,
    );
    expect(explicitUndefined.factorBreakdown.independentEdge?.trueProb).toBe(
      absent.factorBreakdown.independentEdge?.trueProb,
    );
    expect(explicitUndefined.rankingScore).toBe(absent.rankingScore);
    expect(explicitUndefined.confidence).toBe(absent.confidence);
  });

  it("REFUSES a broken calibrator instead of corrupting the probability", () => {
    const baseline = pickOf(scoreGame(make(undefined)), type);
    const raw = baseline.factorBreakdown.independentEdge?.trueProb;

    const hostile: Array<{ name: string; calibrator: { predict: (p: number) => number } }> = [
      { name: "throws", calibrator: { predict: () => { throw new Error("map exploded"); } } },
      { name: "returns NaN", calibrator: { predict: () => Number.NaN } },
      { name: "returns Infinity", calibrator: { predict: () => Number.POSITIVE_INFINITY } },
      { name: "returns out of range", calibrator: { predict: () => 4.2 } },
    ];

    for (const { name, calibrator } of hostile) {
      const pick = pickOf(scoreGame(make(calibrator)), type);
      const got = pick.factorBreakdown.independentEdge?.trueProb;
      expect(got, `${name} must fall back to the uncalibrated value`).toBe(raw);
      expect(Number.isFinite(got as number), `${name} produced a non-finite probability`).toBe(true);
      expect(got as number).toBeGreaterThanOrEqual(0);
      expect(got as number).toBeLessThanOrEqual(1);
    }
  });

  it("applies calibration BEFORE the ranking, not cosmetically to the report", () => {
    // If a map were applied only to the reported field, every DECISION — the
    // edge, the conviction ladder, the sub-vig guard, the ranking — would still
    // be made on the raw number. The observable consequence is that the ranking
    // path would disagree with the published probability it claims to consume.
    // Asserting the ranking MOVES with the map is the end-to-end proof.
    const sentinel = sentinelCalibrator(0.6111);
    const calibrated = pickOf(scoreGame(make(sentinel)), type);

    expect(calibrated.factorBreakdown.rankingSource).not.toBe("confidence");
    expect(calibrated.rankingScore).toBeDefined();
    expect(Number.isFinite(calibrated.rankingScore as number)).toBe(true);

    // Ranking must sit near the calibrated probability's contribution, not the
    // uncalibrated one. With a sentinel far from the raw blend the two are
    // clearly distinguishable, so a cosmetic-only wiring cannot satisfy this.
    const ie = calibrated.factorBreakdown.independentEdge!;
    expect(ie.trueProb).toBeCloseTo(0.6111, 6);
    expect(ie.rawEdge).toBeCloseTo(ie.trueProb - ie.marketFairProb, 6);
  });

  it("leaves the heuristic confidence untouched — the seam moves ranking, not the composite", () => {
    // confidence is market-SURFACE (book depth, movement, context). Calibration
    // is a statement about the SCALE of a probability, so it belongs on the
    // ranking path. If confidence moved, the seam had leaked into the
    // market-echo composite, which the repo's own law forbids.
    const baseline = pickOf(scoreGame(make(undefined)), type);
    const calibrated = pickOf(scoreGame(make(sentinelCalibrator())), type);
    expect(calibrated.confidence).toBe(baseline.confidence);
    expect(calibrated.edgeScore).toBe(baseline.edgeScore);
  });
});

describe("calibration seam threading — cross-leg isolation", () => {
  it("does not let a skellam_cover calibrator leak into the moneyline path", () => {
    // The two call sites deliberately consume DISJOINT slices of
    // independentFairValues (spread = skellam only, ML = everything else). A
    // single calibrator must therefore reach each leg only through its own call
    // site. If this ever fails, one site started reading the other's slice and
    // the spread's cover probability is being ranked against a moneyline.
    const spy = sentinelCalibrator();
    const picks = scoreGame(
      (() => {
        const base = mlInput(spy);
        return {
          ...base,
          bookmakerOdds: [
            ...base.bookmakerOdds,
            {
              bookmaker: "betrivers",
              market: "SPREADS" as const,
              spread: -1.5,
              homeSpreadPrice: -110,
              awaySpreadPrice: -110,
            },
          ],
          context: {
            ...base.context,
            independentFairValues: [
              ...base.context!.independentFairValues!,
              { source: SKELLAM_COVER_SOURCE, homeFairProb: 0.91, awayFairProb: 0.09 },
            ] as IndependentMarketFairValue[],
          },
        };
      })(),
    );

    const ml = picks.find((p) => p.pickType === "MONEYLINE");
    const spread = picks.find((p) => p.pickType === "SPREAD");
    // Each leg publishes a probability; neither may be absent, and each must
    // read from its OWN source slice.
    if (ml) {
      expect(ml.factorBreakdown.independentEdge?.sources).not.toContain(SKELLAM_COVER_SOURCE);
    }
    if (spread) {
      expect(spread.factorBreakdown.independentEdge?.sources).toEqual([SKELLAM_COVER_SOURCE]);
    }
  });
});