// Authored design-sync preview for MetricHonesty.
import { MetricHonesty } from "sports-prediction-platform";

export const Dark = () => (
  <div style={{ maxWidth: 640, background: "var(--carbon)", padding: 24, borderRadius: 16 }}>
    <MetricHonesty
      measures="How often the model's stated confidence matched the real outcome, across every settled pick."
      doesNotMeasure="Whether any single pick will win. Calibration is a property of the pool, not a promise about one game."
      caveat="Thin sport strata (under 100 settled picks) are shown for transparency but carry wider error bars."
    />
  </div>
);
