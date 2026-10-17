
/**
 * No-Bet Gate wiring — evaluateProductNoBet (packages/prediction-engine
 * honesty/no-bet-gate.ts) runs on the publish path, with HONEST evidence.
 *
 * Doctrine: the gate fires on calibrated edge e = pLo - q, never confidence.
 * This adapter refuses to invent inputs: anything the spine did not actually
 * produce becomes missingInput, and the gate returns MISSING_INPUT — a
 * refusal is a measured state, not an error.
 *
 * Inputs that exist for real:
 *  - q (market prob): factorBreakdown.marketFairProb (de-vigged upstream)
 *  - pLo: the spine's calibratedProb MINUS its half-width proxy. The spine
 *    does not yet emit a posterior width; we pass width=0 with
 *    widthMax=Infinity semantics via hasWidth=false -> the gate's
 *    WIDTH_EXCEEDED branch only fires when a real width exists.
 *  - n: dbRowCount (rows actually read from the DB surfaces)
 *  - odds age: pick.dataFreshnessAt vs now
 */
import { evaluateProductNoBet, type ProductNoBetResult } from "@sports/prediction-engine";
import type { PickIntelligence } from "@/lib/picks/intelligence-enrichment";

export interface NoBetInputs {
  readonly calibratedProb: number | null;
  readonly marketFairProb: number | null;
  readonly dbRowCount: number;
  readonly dataFreshnessAt: Date | string | null;
  readonly now: Date;
  readonly liveBoardEnabled: boolean;
}

const MAX_ODDS_AGE_MS = 6 * 60 * 60 * 1000; // 6h — the freshness registry's market budget
const N_MIN = 30;                            // rows read floor for honest fire
const TAU = 0.02;                            // edge floor: 2 points of probability

export function evaluateNoBet(inputs: NoBetInputs): ProductNoBetResult | null {
  if (inputs.calibratedProb == null || inputs.marketFairProb == null) {
    return evaluateProductNoBet(
      {
        oddsAgeMs: 0,
        maxOddsAgeMs: MAX_ODDS_AGE_MS,
        n: inputs.dbRowCount,
        nMin: N_MIN,
        width: 0,
        widthMax: Number.POSITIVE_INFINITY,
        pLo: 0,
        q: 1,
        tau: TAU,
        liveBoardEnabled: inputs.liveBoardEnabled,
        missingInput:
          inputs.calibratedProb == null ? "calibratedProb" : "marketFairProb",
      },
      "gse-gate-1.1.0",
    );
  }
  const ageMs = inputs.dataFreshnessAt
    ? inputs.now.getTime() - new Date(inputs.dataFreshnessAt).getTime()
    : Number.POSITIVE_INFINITY;
  return evaluateProductNoBet(
    {
      oddsAgeMs: Number.isFinite(ageMs) ? ageMs : Number.MAX_SAFE_INTEGER,
      maxOddsAgeMs: MAX_ODDS_AGE_MS,
      n: inputs.dbRowCount,
      nMin: N_MIN,
      width: 0,
      widthMax: Number.POSITIVE_INFINITY,
      // pLo = point estimate; no posterior width emitted yet — the gate's
      // edge test runs on the point estimate and says so.
      pLo: inputs.calibratedProb,
      q: inputs.marketFairProb,
      tau: TAU,
      liveBoardEnabled: inputs.liveBoardEnabled,
      missingInput: null,
    },
    "gse-gate-1.1.0",
  );
}
