/**
 * Vitest suite for arXiv:2410.09190v2 (Time to Retrain? Detecting Concept Drifts in Machine Learning Systems).
 * Gate: ADOPT the inspector monitor if on 2020–2025 nflverse: (i) PHT disagreement alarms precede ≥50% of labeled regime-change episodes by ≥1 week, (ii) ≤2 false alarms per season, (iii) refit-on-alarm does not degrade Brier by more than 0.002 vs frozen baseline on non-alarm weeks, and (iv) the pipeline runs end-to-end in the weekly cron in <5 minutes.
 */
import { describe, it, expect } from "vitest";
import { rollingMean, driftAlerts } from "./2410-09190v2-time-to-retrain-detecting-concept";

describe("2410-09190v2 GSE concept-drift monitor", () => {
  it("fires after k consecutive degraded weeks", () => {
    const losses = [0.2, 0.21, 0.2, 0.35, 0.36, 0.37, 0.2, 0.2];
    const a = driftAlerts(losses, 0.2, 0.07, 3, 2, 2);
    expect(a).toEqual([5]);
    expect(driftAlerts(losses, 0.2, 0.5, 3, 2, 0)).toEqual([]);
    expect(() => driftAlerts(losses, 0.2, 0.1, 0, 2, 0)).toThrow();
  });
  it("rolling mean uses the trailing window", () => {
    expect(rollingMean([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
    expect(() => rollingMean([1], 0)).toThrow();
  });
});
