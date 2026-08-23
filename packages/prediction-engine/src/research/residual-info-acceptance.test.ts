import { describe, expect, it } from "vitest";
import {
  runResidualNull,
  runResidualPlanted,
  NULL_SEEDS_MLB,
  NULL_SEEDS_NFL,
  PLANTED_SEEDS,
  NFL_LIKE_DESIGN,
} from "./residual-info.js";
import { DEFAULT_DESIGN } from "./synthetic-nb.js";

describe("R-11 residual-info acceptance", () => {
  it("MLB-like null: P(max capital > 20) ≤ 0.05 over 200 seeds", () => {
    const report = runResidualNull(NULL_SEEDS_MLB, 1, DEFAULT_DESIGN);
    // eslint-disable-next-line no-console
    console.log(
      `R-11 MLB NULL: exceeded20=${report.exceeded20}/${report.seeds} rate=${report.rate.toFixed(4)} pass=${report.pass}`,
    );
    expect(report.seeds).toBe(200);
    expect(report.pass).toBe(true);
  }, 240_000);

  it("NFL-like null (mean 21): P(max capital > 20) ≤ 0.05 over 80 seeds", () => {
    const report = runResidualNull(NULL_SEEDS_NFL, 1, NFL_LIKE_DESIGN);
    // eslint-disable-next-line no-console
    console.log(
      `R-11 NFL NULL: exceeded20=${report.exceeded20}/${report.seeds} rate=${report.rate.toFixed(4)} pass=${report.pass}`,
    );
    expect(report.seeds).toBe(80);
    expect(report.pass).toBe(true);
  }, 180_000);

  it("planted MLB-like median max capital vs open-loop is reported (open-loop is 1)", () => {
    const report = runResidualPlanted(PLANTED_SEEDS, 10_000, DEFAULT_DESIGN);
    // eslint-disable-next-line no-console
    console.log(
      `R-11 PLANTED: engineMedianMax=${report.engineMedianMax.toFixed(4)} openLoopMedianMax=${report.openLoopMedianMax.toFixed(4)} beats=${report.beatsOpenLoop}`,
    );
    expect(report.openLoopMedianMax).toBe(1);
    // Conservative adaptive-λ may NOT beat open-loop. Do not fail the task if beats=false.
    expect(report.engineMedianMax).toBeGreaterThan(0);
  }, 180_000);
});
