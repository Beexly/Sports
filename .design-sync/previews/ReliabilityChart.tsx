// Authored design-sync preview for ReliabilityChart.
// FIXTURE: bins below are an illustrative calibration shape for the chart layout only, not a live measurement.
import type { CSSProperties } from "react";
import { ReliabilityChart } from "sports-prediction-platform";

const dark: CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16 };

const bins = [
  { meanForecast: 0.05, observedRate: 0.08, count: 12 },
  { meanForecast: 0.15, observedRate: 0.12, count: 24 },
  { meanForecast: 0.25, observedRate: 0.28, count: 41 },
  { meanForecast: 0.35, observedRate: 0.33, count: 58 },
  { meanForecast: 0.45, observedRate: 0.47, count: 66 },
  { meanForecast: 0.55, observedRate: 0.52, count: 63 },
  { meanForecast: 0.65, observedRate: 0.68, count: 55 },
  { meanForecast: 0.75, observedRate: 0.71, count: 40 },
  { meanForecast: 0.85, observedRate: 0.88, count: 22 },
  { meanForecast: 0.95, observedRate: 0.91, count: 9 },
];

export const Sweep = () => (
  <div style={dark}>
    <ReliabilityChart bins={bins} title="Reliability, moneyline picks" />
  </div>
);

export const Empty = () => (
  <div style={dark}>
    <ReliabilityChart bins={[]} title="Reliability, NFL spreads" />
  </div>
);
