/**
 * Temperature scaling on logit — R&D only (apply OFF).
 * Temperature ⊂ Platt ⊂ hierarchical Platt.
 */

import type { TemperatureMap } from "@/lib/calibration/calib-types";

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

export function temperaturePredict(logit: number, T: number): number {
  const t = Math.max(1e-6, T);
  const p = 1 / (1 + Math.exp(-(logit / t)));
  return clampP(p);
}

/** Line search T on train log-loss (holdout caller passes holdout slice). */
export function fitTemperature(
  samples: readonly { readonly logit: number; readonly outcome: 0 | 1 }[],
  meta?: {
    readonly dateRange?: { from: string; to: string };
    readonly modelVersion?: string;
  },
): TemperatureMap {
  let bestT = 1;
  let bestLoss = Infinity;
  if (samples.length === 0) {
    return {
      method: "temperature",
      T: 1,
      scoreSpace: "logit",
      nTrain: 0,
      dateRange: meta?.dateRange ?? { from: "", to: "" },
      modelVersion: meta?.modelVersion ?? "",
    };
  }
  for (let t = 0.5; t <= 5; t += 0.05) {
    let loss = 0;
    for (const { logit, outcome } of samples) {
      const p = temperaturePredict(logit, t);
      loss -= outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p);
    }
    if (loss < bestLoss) {
      bestLoss = loss;
      bestT = t;
    }
  }
  return {
    method: "temperature",
    T: bestT,
    scoreSpace: "logit",
    nTrain: samples.length,
    dateRange: meta?.dateRange ?? { from: "", to: "" },
    modelVersion: meta?.modelVersion ?? "",
  };
}

export function temperatureMapPredict(logitScore: number, map: TemperatureMap): number {
  return temperaturePredict(logitScore, map.T);
}
