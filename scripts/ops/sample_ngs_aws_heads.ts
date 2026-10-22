/**
 * Reproducible 3-head sample runner for the Stream 13A CNN-attention coverage pipeline.
 *
 * Why this exists: `runNgsAwsCnnAttentionCoveragePipeline` has no CLI entry point in
 * `coverage-scheme.ts`, so the only way to publish a real numeric 3-head sample as a
 * verification proof is to call it from a committed script. This keeps the proof
 * reproducible from the repo alone (no scratchpad, no hand-typed numbers).
 *
 * Usage:
 *   npx tsx scripts/ops/sample_ngs_aws_heads.ts
 *   npx tsx scripts/ops/sample_ngs_aws_heads.ts --json
 *
 * Exit code 0 on a well-formed sample; 1 if the pipeline output fails the sanity gates.
 */

import {
  runNgsAwsCnnAttentionCoveragePipeline,
  type TrackingFrame,
} from "../../packages/prediction-engine/src/nfl/coverage-scheme.js";

function frame(seed: number): TrackingFrame {
  const defenders = Array.from({ length: 11 }, (_, i) => ({
    x: 5 + i * 0.8 + seed * 0.1,
    y: 10 + (i % 5) * 2,
    reportedSpeed: 6,
    reportedAcceleration: 1,
    displacementYards: 0.65,
  }));
  const offense = Array.from({ length: 10 }, (_, i) => ({
    x: 10 + i * 0.7,
    y: 8 + (i % 4) * 3 + seed * 0.2,
    reportedSpeed: 7,
    reportedAcceleration: 1,
    displacementYards: 0.7,
  }));
  return { defenders, offense };
}

const asJson = process.argv.includes("--json");

const result = runNgsAwsCnnAttentionCoveragePipeline({
  frames: [frame(0), frame(1), frame(2), frame(3)],
});

const meanProbs = result.classification.meanClassProbabilities;
const variance = result.classification.epistemicVariance;
const probSum = meanProbs.reduce((s, v) => s + v, 0);
const alphaSum = result.alpha.reduce((s, v) => s + v, 0);
const finite = (arr: readonly number[]) => arr.every((v) => Number.isFinite(v));

const sample = {
  stream: "13A:runNgsAwsCnnAttentionCoveragePipeline",
  tensorDims: result.tensorDims,
  attentionAlpha: result.alpha.map((v) => Number(v.toFixed(6))),
  attentionAlphaSum: Number(alphaSum.toFixed(9)),
  heads: {
    head1_classification: {
      coverageFamily: result.classification.coverageFamily,
      predictedProbability: Number(result.classification.predictedProbability.toFixed(6)),
      meanClassProbabilities: meanProbs.map((v) => Number(v.toFixed(6))),
      meanClassProbabilitiesSum: Number(probSum.toFixed(9)),
      epistemicVariance: variance.map((v) => Number(v.toFixed(6))),
      uncertaintyEstimationMethod: "deterministic_head_disagreement",
    },
    head2_globalDiscovery: {
      referenceCount: result.globalDiscovery.referenceCount,
      referenceSource: result.globalDiscovery.referenceSource,
    },
    head3_guidedGradCam: {
      rankedPairs: result.instanceHighlights.rankedPairs.length,
      guidedGradCamFrames: result.instanceHighlights.guidedGradCam.length,
      peakFrame: result.instanceHighlights.peakFrame,
      method: "guided_gradcam",
    },
  },
  streamCalls: result.streamCalls,
};

const checks: Array<[string, boolean]> = [
  ["tensorDims.frames === 4", result.tensorDims.frames === 4],
  ["attention alpha sums to 1 (1e-6)", Math.abs(alphaSum - 1) < 1e-6],
  ["class probabilities sum to 1 (1e-6)", Math.abs(probSum - 1) < 1e-6],
  ["class probabilities all finite", finite(meanProbs)],
  ["epistemic variance all finite", finite(variance)],
  ["predictedProbability > 0", result.classification.predictedProbability > 0],
  ["rankedPairs === 10", result.instanceHighlights.rankedPairs.length === 10],
  ["guidedGradCam length === 4", result.instanceHighlights.guidedGradCam.length === 4],
  ["peakFrame in [0,4)", result.instanceHighlights.peakFrame >= 0 && result.instanceHighlights.peakFrame < 4],
  ["six stages called in order", result.streamCalls.length === 6],
];

if (asJson) {
  console.log(JSON.stringify(sample, null, 2));
} else {
  console.log("=== Stream 13A 3-head sample ===");
  console.log(`tensor: T=${result.tensorDims.frames} x 11 defenders x 10 offense x 8 channels`);
  console.log(`attention alpha: [${sample.attentionAlpha.join(", ")}] sum=${sample.attentionAlphaSum}`);
  console.log(`head1 coverageFamily=${sample.heads.head1_classification.coverageFamily} p=${sample.heads.head1_classification.predictedProbability}`);
  console.log(`head1 meanClassProbabilities: [${sample.heads.head1_classification.meanClassProbabilities.join(", ")}] sum=${sample.heads.head1_classification.meanClassProbabilitiesSum}`);
  console.log(`head1 epistemicVariance: [${sample.heads.head1_classification.epistemicVariance.join(", ")}]`);
  console.log(`head2 referenceCount=${sample.heads.head2_globalDiscovery.referenceCount} referenceSource=${sample.heads.head2_globalDiscovery.referenceSource}`);
  console.log(`head3 rankedPairs=${sample.heads.head3_guidedGradCam.rankedPairs} peakFrame=${sample.heads.head3_guidedGradCam.peakFrame} method=${sample.heads.head3_guidedGradCam.method}`);
}

const failed = checks.filter(([, ok]) => !ok);
if (failed.length > 0) {
  console.error("SAMPLE FAILED:", failed.map(([name]) => name).join("; "));
  process.exit(1);
}
console.log("SAMPLE OK: 10/10 pipeline sanity checks passed");
