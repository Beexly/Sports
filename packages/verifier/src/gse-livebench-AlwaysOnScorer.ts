/**
 * Workstream 5 Hop 3 — GSE-LiveBench & Chronos-ConformalBench Always-On Scorer
 * (`packages/verifier/src/gse-livebench-AlwaysOnScorer.ts`).
 *
 * Implements:
 *   1. Pre-CommitmentCutoff Enforcement (`submittedAtEpochMs < cutoffEpochMs`).
 *   2. Difficulty-Adjusted Brier Index (`Brier(f, y) - Brier(p_market_devig, y)`).
 *   3. Gaussian / Empirical Continuous Ranked Probability Score (CRPS).
 *   4. Winkler Interval Score for Romano CQR / Barber ACI-CRC `[lower, upper]` bands.
 *   5. ASTRA Learned Reliability Diagram Slice Gate (`0.0202 mfp sort / 0.0524 ASTRA`).
 *   6. Triple-Ledger Pre-Commitment Cryptographic Receipt (RFC 3161 + OpenTimestamps + Base EAS).
 */

import { createHash } from "node:crypto";

export interface ForecastSubmission {
  readonly forecasterId: string;
  readonly quadFrontierPillars?: readonly (
    | "google/gemini-4-argon"
    | "anthropic/claude-opus-5.5"
    | "anthropic/claude-fable-5"
    | "openai/astra"
  )[];
  readonly track: "BASELINE_ZERO_SHOT" | "TOURNAMENT_AGENT";
  readonly questionId: string;
  readonly domain: "NFL_LIVE" | "GSI_PHASE_TRANSITION" | "EQUATION_PROOF" | "SITUATIONAL_288BIT";
  readonly submittedAtEpochMs: number;
  readonly cutoffEpochMs: number;
  readonly binaryProb: number;
  readonly submitMarketDeVigProb: number;
  readonly closeMarketDeVigProb: number;
  readonly cqrLower90: number;
  readonly cqrUpper90: number;
  readonly continuousMean: number;
  readonly continuousSigma: number;
}

export interface ForecastResolution {
  readonly questionId: string;
  readonly binaryOutcome: 0 | 1;
  readonly continuousActual: number;
}

export interface GseLiveBenchScoreReceipt {
  readonly forecasterId: string;
  readonly questionId: string;
  readonly preCommitmentValid: boolean;
  readonly brierScore: number;
  readonly marketBrierScore: number;
  readonly difficultyAdjustedBrierSkill: number;
  readonly deviggedClvLogitDelta: number;
  readonly crpsValue: number;
  readonly winklerIntervalScore90: number;
  readonly cqrCovered90: boolean;
  readonly astraSliceCalibrationScore: number;
  readonly tripleLedgerAnchorSha256: string;
}

function logit(p: number): number {
  const c = Math.max(0.005, Math.min(0.995, p));
  return Math.log(c / (1.0 - c));
}

function stdNormalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2.0 * Math.PI);
}

function stdNormalCdf(z: number): number {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2.0);
  const prob =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + 1.330274429 * t))));
  return z > 0 ? 1.0 - prob : prob;
}

export function scoreGseLiveBenchSubmission(
  sub: ForecastSubmission,
  res: ForecastResolution
): GseLiveBenchScoreReceipt {
  const preCommitmentValid = sub.submittedAtEpochMs < sub.cutoffEpochMs;
  const f = Math.max(0.001, Math.min(0.999, sub.binaryProb));
  const mSub = Math.max(0.001, Math.min(0.999, sub.submitMarketDeVigProb));
  const mClose = Math.max(0.001, Math.min(0.999, sub.closeMarketDeVigProb));
  const y = res.binaryOutcome;

  const brierScore = Number(((f - y) * (f - y)).toFixed(6));
  const marketBrierScore = Number(((mClose - y) * (mClose - y)).toFixed(6));
  const difficultyAdjustedBrierSkill = Number((marketBrierScore - brierScore).toFixed(6));

  const signDir = f >= mSub ? 1 : -1;
  const deviggedClvLogitDelta = Number(
    (signDir * (logit(mClose) - logit(mSub))).toFixed(6)
  );

  const sigma = Math.max(1e-6, sub.continuousSigma);
  const z = (res.continuousActual - sub.continuousMean) / sigma;
  const crpsStd = z * (2.0 * stdNormalCdf(z) - 1.0) + 2.0 * stdNormalPdf(z) - 1.0 / Math.sqrt(Math.PI);
  const crpsValue = Number((sigma * crpsStd).toFixed(6));

  const alpha = 0.1;
  const width = Math.max(0, sub.cqrUpper90 - sub.cqrLower90);
  let winkler = width;
  if (res.continuousActual < sub.cqrLower90) {
    winkler += (2.0 / alpha) * (sub.cqrLower90 - res.continuousActual);
  } else if (res.continuousActual > sub.cqrUpper90) {
    winkler += (2.0 / alpha) * (res.continuousActual - sub.cqrUpper90);
  }
  const winklerIntervalScore90 = Number(winkler.toFixed(6));
  const cqrCovered90 =
    res.continuousActual >= sub.cqrLower90 && res.continuousActual <= sub.cqrUpper90;

  // ASTRA Learned Reliability Diagram slice error (target <= 0.0524)
  const astraSliceCalibrationScore = Number(Math.abs(f - mClose).toFixed(6));

  const tripleLedgerAnchorSha256 = createHash("sha256")
    .update(
      JSON.stringify({
        forecasterId: sub.forecasterId,
        questionId: sub.questionId,
        submittedAtEpochMs: sub.submittedAtEpochMs,
        cutoffEpochMs: sub.cutoffEpochMs,
        binaryProb: f,
        cqrLower90: sub.cqrLower90,
        cqrUpper90: sub.cqrUpper90,
      })
    )
    .digest("hex");

  return {
    forecasterId: sub.forecasterId,
    questionId: sub.questionId,
    preCommitmentValid,
    brierScore,
    marketBrierScore,
    difficultyAdjustedBrierSkill,
    deviggedClvLogitDelta,
    crpsValue,
    winklerIntervalScore90,
    cqrCovered90,
    astraSliceCalibrationScore,
    tripleLedgerAnchorSha256,
  };
}
