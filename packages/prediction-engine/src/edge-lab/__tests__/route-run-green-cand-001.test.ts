/**
 * CAND-001 / H0.6 marker test — asserts the REAL published surface of the
 * rush-yards bind, so the candidate ledger's claim about this bind is checked
 * against the code rather than against a note.
 *
 * `priced` is not an exported symbol; it is a field the module stamps onto
 * every `RushYardsBindResult`. The invariant is therefore only meaningful when
 * asserted on an actual result, which is what the second case does — a bind
 * that reached `ok: true` still carries `priced: false`. (Asserting the
 * absence of an export would have been a claim about the test's own imports,
 * not about the bind.)
 */
import { describe, expect, it } from "vitest";
import {
  RUSH_YARDS_BIND_METHOD_TAG,
  bindRushYardsSamples,
} from "../props-hb-rush-yards-bind.js";
import type { CovariateRow } from "../covariate-bus.js";

function rushingRow(week: number): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week,
    statType: "rushing",
    avgSeparation: null,
    avgCushion: null,
    airYardsShare: null,
    avgTimeToThrow: null,
    aggressiveness: null,
    avgIntendedAirYards: null,
    avgCompletedAirYards: null,
    avgAirYardsDifferential: null,
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    avgYac: null,
    pressureRate: null,
    intRate: null,
    fumbleRate: null,
    airYardsPerAttempt: null,
    avgAirYardsToSticks: null,
    missedTackleRate: null,
    passerRating: null,
    ryoePerAtt: null,
    rushPctOverExpected: null,
    passerRatingAllowed: null,
    snapShare: null,
    tflRate: null,
    pdRate: null,
    avgExpectedYac: null,
    expectedRushYards: null,
  };
}

describe("NFL route-run / H0.6 rush-yards bind — CAND-001", () => {
  it("asserts real method tag value imported from bind source", () => {
    expect(RUSH_YARDS_BIND_METHOD_TAG).toBe("rush_yards_bind_v1");
  });

  it("priced:false invariant holds on a result that actually bound", () => {
    const results = bindRushYardsSamples(
      [rushingRow(2)],
      [
        {
          gsisId: "00-0030501-2",
          season: 2024,
          kickoffWeek: 3,
          rush: { attempts: 18, yards: 88 },
        },
      ],
    );
    expect(results).toHaveLength(1);
    // Guard the premise: an `ok: false` result would satisfy `priced === false`
    // vacuously, so the invariant is only informative once the bind succeeded.
    expect(results[0]!.ok).toBe(true);
    expect(results[0]!.priced).toBe(false);
  });
});
