/**
 * More on verification of probability forecasts for football outcomes: score decompositions, reliability, and discrimination analyses
 *
 * arXiv:2106.14345v2 · lane:calibration · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Install the standard verification suite for GSE's published probabilities (win prob, over prob,
 * ATS cover prob): implement the three Brier decompositions exactly as eqs. (1)/(2)/(4) with
 * Siegert binning (eq. 7) + PAV isotonic binning on every backtest window (2020-2026 nflverse,
 * ~1,900 games): report BRS, REL, RES, DIS, VPB, VPW, RIL, COV, skill vs climatology, side-by-side
 * GSE vs de-vigged Pinnacle/OddsAPI consensus; run a weekly logistic calibration monitor
 * (logit(cover) = alpha + beta logit(GSE prob) per market, Wald alert if alpha != 0 or beta != 1);
 * add a joint (win x over) calibration check via copula-style joint reliability diagrams (NFL
 * edges live in the joint tail: favorite-wins-and-covers) with the CORP/T-PAV estimator from paper
 * 0469 for binning. Framed as engine-honesty infrastructure for calibration reporting, not as a
 * prediction objective.
 *
 * ACCEPTANCE GATE: Adopt the suite as the standard diagnostic if: on the 2025 test window, the decomposition
 * reveals an actionable deficiency the current Brier-only reporting misses — e.g., RES_GSE <
 * RES_market - 0.03 on either event, or the logistic test rejects alpha=0 at p<0.01 for a GSE
 * market.
 *
 * Ingest role: feature builder (forecast verification suite: decompositions + reliability + discrimination).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2106.14345v2" as const;
export const LANE = "calibration" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the suite as the standard diagnostic if: on the 2025 test window, the decomposition
 * reveals an actionable deficiency the current Brier-only reporting misses — e.g., RES_GSE <
 * RES_market - 0.03 on either event, or the logistic test rejects alpha=0 at p<0.01 for a GSE
 * market.`;

export const CONFIG = {
  enabled: false,
  outcomes: ["home", "draw", "away"],
  decompose: ["brier", "rps", "ignorance"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TernaryForecast {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly outcome: 0 | 1 | 2;
}

export function isTernaryForecast(x: unknown): x is TernaryForecast {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const ps = [o["pHome"], o["pDraw"], o["pAway"]];
  return (
    ps.every((p) => isFiniteNumber(p) && (p as number) >= 0 && (p as number) <= 1) &&
    Math.abs((ps[0] as number) + (ps[1] as number) + (ps[2] as number) - 1) < 1e-9 &&
    (o["outcome"] === 0 || o["outcome"] === 1 || o["outcome"] === 2)
  );
}

/** Ranked probability score for ternary outcomes. */
export function rps(f: TernaryForecast): number | null {
  if (!isTernaryForecast(f)) return null;
  const cumF = [f.pHome, f.pHome + f.pDraw];
  const cumO = [f.outcome <= 0 ? 1 : 0, f.outcome <= 1 ? 1 : 0];
  return ((cumF[0]! - cumO[0]!) ** 2 + (cumF[1]! - cumO[1]!) ** 2) / 2;
}

/** Ignorance (log) score for ternary outcomes. */
export function ignorance(f: TernaryForecast): number | null {
  if (!isTernaryForecast(f)) return null;
  const p = [f.pHome, f.pDraw, f.pAway][f.outcome] ?? 0;
  if (p <= 0) return null;
  return -Math.log(p);
}

/** Reliability table per outcome class. */
export function reliabilityByOutcome(
  forecasts: readonly unknown[],
  nBins = 10,
): Array<{ outcome: number; bins: Array<{ pMean: number; freq: number; n: number }> }> {
  const v: TernaryForecast[] = [];
  for (const x of forecasts) if (isTernaryForecast(x)) v.push(x);
  return [0, 1, 2].map((oc) => {
    const bins: Array<{ ps: number[]; hits: number }> = Array.from({ length: nBins }, () => ({ ps: [], hits: 0 }));
    for (const f of v) {
      const p = [f.pHome, f.pDraw, f.pAway][oc] ?? 0;
      const b = Math.min(nBins - 1, Math.floor(p * nBins));
      const slot = bins[b];
      if (slot) {
        slot.ps.push(p);
        if (f.outcome === oc) slot.hits++;
      }
    }
    return {
      outcome: oc,
      bins: bins
        .filter((b) => b.ps.length > 0)
        .map((b) => ({
          pMean: b.ps.reduce((a, x) => a + x, 0) / b.ps.length,
          freq: b.hits / b.ps.length,
          n: b.ps.length,
        })),
    };
  });
}

/** Discrimination: mean forecast for the event when it occurred vs not. */
export function discrimination(
  forecasts: readonly unknown[],
  outcome: 0 | 1 | 2,
): { hitMean: number; missMean: number; diff: number } | null {
  const v: TernaryForecast[] = [];
  for (const x of forecasts) if (isTernaryForecast(x)) v.push(x);
  if (v.length === 0) return null;
  const hits: number[] = [];
  const misses: number[] = [];
  for (const f of v) {
    const p = [f.pHome, f.pDraw, f.pAway][outcome] ?? 0;
    if (f.outcome === outcome) hits.push(p);
    else misses.push(p);
  }
  if (hits.length === 0 || misses.length === 0) return null;
  const hitMean = hits.reduce((a, b) => a + b, 0) / hits.length;
  const missMean = misses.reduce((a, b) => a + b, 0) / misses.length;
  return { hitMean, missMean, diff: hitMean - missMean };
}
