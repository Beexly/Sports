// Authored design-sync preview for CalibrationCurve.
// FIXTURE: points below are an illustrative calibration shape for the chart layout only, not a live measurement.
import type { CSSProperties } from "react";
import { CalibrationCurve } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, maxWidth: 420 };

const points = [
  { label: "55%", expectedWinRate: 0.55, observedWinRate: 0.53, sampleSize: 62, sufficientSample: true },
  { label: "65%", expectedWinRate: 0.65, observedWinRate: 0.68, sampleSize: 54, sufficientSample: true },
  { label: "75%", expectedWinRate: 0.75, observedWinRate: 0.71, sampleSize: 38, sufficientSample: true },
  { label: "85%", expectedWinRate: 0.85, observedWinRate: 0.88, sampleSize: 31, sufficientSample: true },
];

export const Populated = () => (
  <div style={dark}>
    <CalibrationCurve points={points} sampleSize={185} />
  </div>
);

export const Collecting = () => (
  <div style={dark}>
    <CalibrationCurve
      points={[{ label: "55%", expectedWinRate: 0.55, observedWinRate: 0.6, sampleSize: 14, sufficientSample: false }]}
      sampleSize={14}
    />
  </div>
);
