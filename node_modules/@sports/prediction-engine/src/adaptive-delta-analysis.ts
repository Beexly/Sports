/**
 * Hedge adaptive-δ analysis — regret, weight concentration, integrity.
 *
 * Complements runAdaptiveDeltaHedge with ops-facing metrics:
 *   - cumulative regret vs best fixed δ
 *   - weight entropy / concentration on recommended δ
 *   - published vs sit-out Brier vs UNC integrity
 *
 * Shadow only. Does not write SELECTIVE_PUBLISH_DELTA.
 */

import {
  expertLossAtDelta,
  runAdaptiveDeltaHedge,
  type AdaptiveDeltaOptions,
  type AdaptiveDeltaReport,
  type DeltaExpertSample,
} from "./adaptive-delta-hedge.js";

export type HedgeAdaptiveDeltaAnalysis = {
  readonly report: AdaptiveDeltaReport;
  /** meanLossHedge − meanLossBestFixed (≤0 is good). */
  readonly regretVsBestFixed: number;
  /** Normalized entropy of final weights in [0,1] (1=uniform). */
  readonly weightEntropyNorm: number;
  /** Mass on recommendedDelta. */
  readonly weightOnRecommended: number;
  /** Mean Brier on rounds the chosen expert published. */
  readonly publishedBrier: number;
  /** Mean Brier on rounds the chosen expert sat out (should ≈ UNC if no skill in middle). */
  readonly sitOutBrier: number;
  readonly sitOutN: number;
  readonly publishedN: number;
  /** |sitOutBrier − sitOutLoss| — small means sit-out cost is honest. */
  readonly sitOutIntegrityGap: number;
  readonly integrityStatus: "ok" | "warn_sitout_skill" | "warn_toxic_middle" | "insufficient_n";
  readonly operatorHint: string;
  readonly priced: false;
  readonly status: "shadow";
};

function entropyNorm(ws: readonly number[]): number {
  const m = ws.length;
  if (m <= 1) return 0;
  let h = 0;
  for (const w of ws) {
    if (w > 0) h -= w * Math.log(w);
  }
  return h / Math.log(m);
}

/**
 * Run Hedge and attach analysis metrics for bake-off / ops surface.
 */
export function analyzeAdaptiveDeltaHedge(
  samples: readonly DeltaExpertSample[],
  options: AdaptiveDeltaOptions = {},
): HedgeAdaptiveDeltaAnalysis {
  const report = runAdaptiveDeltaHedge(samples, options);
  const sitOutLoss = options.sitOutLoss ?? 0.25;

  let pubSum = 0;
  let pubN = 0;
  let sitSum = 0;
  let sitN = 0;
  for (const step of report.steps) {
    const br = (step.p - step.y) ** 2;
    if (step.published) {
      pubSum += br;
      pubN += 1;
    } else {
      sitSum += br;
      sitN += 1;
    }
  }

  const publishedBrier = pubN === 0 ? NaN : pubSum / pubN;
  const sitOutBrier = sitN === 0 ? NaN : sitSum / sitN;
  const regretVsBestFixed =
    Number.isFinite(report.meanLossHedge) && Number.isFinite(report.meanLossBestFixed)
      ? report.meanLossHedge - report.meanLossBestFixed
      : NaN;
  const weightEntropyNorm = entropyNorm(report.finalWeights);
  const recIdx = report.deltas.indexOf(report.recommendedDelta);
  const weightOnRecommended =
    recIdx >= 0 ? report.finalWeights[recIdx]! : 0;
  const sitOutIntegrityGap =
    Number.isFinite(sitOutBrier) ? Math.abs(sitOutBrier - sitOutLoss) : NaN;

  let integrityStatus: HedgeAdaptiveDeltaAnalysis["integrityStatus"] =
    "insufficient_n";
  if (report.n >= 40) {
    // Skill hidden in middle: sit-out Brier much better than UNC → wrong to sit out
    if (Number.isFinite(sitOutBrier) && sitOutBrier < sitOutLoss - 0.04) {
      integrityStatus = "warn_sitout_skill";
    } else if (
      Number.isFinite(sitOutBrier) &&
      sitOutBrier > sitOutLoss + 0.06
    ) {
      // Toxic middle: sitting out discards worse-than-coin mass (good)
      integrityStatus = "ok";
    } else {
      integrityStatus = "ok";
    }
  }

  const operatorHint =
    integrityStatus === "warn_sitout_skill"
      ? `Sit-out region has real skill (Brier ${sitOutBrier.toFixed(4)} ≪ UNC ${sitOutLoss}). Lower δ or improve mid-probability ranking before raising selective threshold. recommendedΔ=${report.recommendedDelta}. Shadow only.`
      : report.n < 40
        ? `Insufficient n=${report.n} for Hedge recommendation. Keep current selective δ. Shadow only.`
        : `Hedge recommends δ=${report.recommendedDelta} (best-fixed=${report.bestFixedDelta}, regret=${Number.isFinite(regretVsBestFixed) ? regretVsBestFixed.toFixed(4) : "n/a"}). weight@rec=${weightOnRecommended.toFixed(2)}. Advisory only — SELECTIVE_PUBLISH_DELTA not written.`;

  return {
    report,
    regretVsBestFixed,
    weightEntropyNorm,
    weightOnRecommended,
    publishedBrier,
    sitOutBrier,
    sitOutN: sitN,
    publishedN: pubN,
    sitOutIntegrityGap,
    integrityStatus,
    operatorHint,
    priced: false,
    status: "shadow",
  };
}

/** Re-export for convenience. */
export { expertLossAtDelta, runAdaptiveDeltaHedge };
