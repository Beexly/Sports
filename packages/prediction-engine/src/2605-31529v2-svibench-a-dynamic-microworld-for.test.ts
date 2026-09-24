/**
 * Vitest suite for arXiv:2605.31529v2 (SVI-Bench: A Dynamic Microworld for Strategic Video Intelligence).
 * Gate: ADAPT the data-engine pattern and T5 eval protocol if: the NFL pilot corpus (10 games) achieves ≥ 95% auto-consistency of generated instances against play-by-play logs, and the T5-style eval reproduces the paper's qualitative pattern (accuracy degrading with horizon, CE measurable and improvable with finetuning).
 */
import { describe, it, expect } from "vitest";
import { alignClock, entityResolution, qcGates, mcForecastEval } from "./2605-31529v2-svibench-a-dynamic-microworld-for";

describe("2605-31529v2 SVI data-engine pattern", () => {
  it("clock alignment finds the true offset", () => {
    const pbp = [100, 200, 300, 400];
    const clips = [95, 195, 295]; // 5s early
    const { offset, matchRate } = alignClock(clips, pbp, [0, 5, 10], 2);
    expect(offset).toBe(5);
    expect(matchRate).toBe(1);
    expect(() => alignClock([], pbp, [0], 2)).toThrow();
  });
  it("entity resolution matches greedily above threshold", () => {
    const sim = [
      [0.9, 0.1],
      [0.2, 0.85],
    ];
    expect(entityResolution(sim, 0.5)).toBe(1);
    expect(entityResolution(sim, 0.95)).toBe(0);
    expect(() => entityResolution([], 0.5)).toThrow();
  });
  it("QC gates name the failing stages", () => {
    expect(qcGates({ hasSchema: true, pbpConsistent: true, duplicate: false })).toEqual([]);
    expect(qcGates({ hasSchema: false, pbpConsistent: true, duplicate: true })).toEqual(["schema", "dedupe"]);
  });
  it("forecast eval reports accuracy decay and CE", () => {
    const correct = [true, true, false, true, false, false];
    const horizons = [5, 8, 30, 35, 60, 70];
    const conf = [0.9, 0.8, 0.6, 0.55, 0.5, 0.45];
    const { accByHorizon, ce } = mcForecastEval(correct, horizons, conf, [[0, 20], [20, 50], [50, 100]]);
    expect(accByHorizon[0]).toBeGreaterThan(accByHorizon[2] ?? 1);
    expect(ce).toBeGreaterThanOrEqual(0);
    expect(() => mcForecastEval([true], [1, 2], [0.5], [[0, 10]])).toThrow();
  });
});
