/**
 * Versioned Platt MAP IRLS artifact — R&D apply OFF.
 */

import type { PlattMap } from "@/lib/calibration/calib-types";

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export function fitPlattIrlS(
  samples: readonly { readonly score: number; readonly outcome: 0 | 1 }[],
  prior = { aMean: 1, aVar: 1, bMean: 0, bVar: 1 },
  maxIter = 25,
  meta?: {
    readonly dateRange?: { from: string; to: string };
    readonly modelVersion?: string;
  },
): PlattMap {
  let A = prior.aMean;
  let B = prior.bMean;
  const precA = 1 / prior.aVar;
  const precB = 1 / prior.bVar;

  for (let iter = 0; iter < maxIter; iter++) {
    let gA = precA * (A - prior.aMean);
    let gB = precB * (B - prior.bMean);
    let hAA = precA;
    let hBB = precB;
    let hAB = 0;

    for (const { score, outcome } of samples) {
      const p = sigmoid(A * score + B);
      const w = Math.max(p * (1 - p), 1e-12);
      const err = p - outcome;
      gA += err * score;
      gB += err;
      hAA += w * score * score;
      hBB += w;
      hAB += w * score;
    }
    const det = hAA * hBB - hAB * hAB;
    if (Math.abs(det) < 1e-18) break;
    const dA = (hBB * gA - hAB * gB) / det;
    const dB = (hAA * gB - hAB * gA) / det;
    A -= dA;
    B -= dB;
    if (dA * dA + dB * dB < 1e-12) break;
  }

  return {
    method: "platt_map_irls",
    A,
    B,
    scoreSpace: "logit",
    prior,
    nTrain: samples.length,
    dateRange: meta?.dateRange ?? { from: "", to: "" },
    modelVersion: meta?.modelVersion ?? "",
  };
}

export function plattPredict(logitScore: number, map: PlattMap): number {
  const p = sigmoid(map.A * logitScore + map.B);
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}
