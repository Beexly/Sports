/**
 * Calibration plot data (reliability curve) — internal / ops only.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import { reliabilityCurve } from "@sports/prediction-engine";

export type ReliabilityPlotPoint = {
  readonly binCenter: number;
  readonly meanForecast: number;
  readonly observedRate: number;
  readonly count: number;
};

export function buildReliabilityPlot(
  samples: readonly CalibrationSample[],
  bins = 10,
): {
  readonly points: readonly ReliabilityPlotPoint[];
  readonly perfectLine: readonly { readonly x: number; readonly y: number }[];
  readonly note: string;
} {
  const curve = reliabilityCurve(samples, bins);
  const points: ReliabilityPlotPoint[] = curve.map((c) => ({
    binCenter: (c.binStart + c.binEnd) / 2,
    meanForecast: c.meanForecast,
    observedRate: c.observedRate,
    count: c.count,
  }));
  return {
    points,
    perfectLine: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    note: "Ops/internal only. Not public performance while eligibility RED.",
  };
}
