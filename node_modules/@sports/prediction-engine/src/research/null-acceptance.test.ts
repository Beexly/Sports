import { describe, expect, it } from "vitest";
import { runNullSuite, runPlantedComparison } from "./capital.js";

/**
 * Acceptance is non-negotiable. If the null rate is above α the engine is
 * discarded, not tuned. This file reports the number either way.
 */
describe("R-9 acceptance", () => {
  it("null test: ≥200 pure-noise seeds, P(max capital > 20) ≤ 0.05", () => {
    const report = runNullSuite(200, 1);
    // Always print so RESULTS.md can cite a number we actually observed.
    // eslint-disable-next-line no-console
    console.log(
      `R-9 NULL: exceeded20=${report.exceeded20}/${report.seeds} rate=${report.rate.toFixed(4)} pass=${report.pass}`,
    );
    expect(report.seeds).toBe(200);
    expect(report.pass).toBe(true);
  }, 180_000);

  it("planted-edge median max capital beats open-loop", () => {
    const report = runPlantedComparison(40, 10_000);
    // eslint-disable-next-line no-console
    console.log(
      `R-9 PLANTED: engineMedianMax=${report.engineMedianMax.toFixed(4)} openLoopMedianMax=${report.openLoopMedianMax.toFixed(4)} beats=${report.beatsOpenLoop}`,
    );
    expect(report.beatsOpenLoop).toBe(true);
  }, 120_000);
});
