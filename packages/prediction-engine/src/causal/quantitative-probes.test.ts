/**
 * Quantitative-probe release gate — tests (arXiv 2209.03013v1).
 *
 * ACCEPTANCE GATE: sign/range/null probes hit on conforming estimates
 * and miss on violations; the suite releases at >= 0.8 hit rate with
 * all nulls holding and blocks when a null probe fails; failure
 * clusters localize by subgraph; the adversarial flip drops hit rate
 * below 0.5; Spearman behaves on monotone data; empty suites throw.
 */
import { describe, expect, it } from "vitest";
import {
  adversarialFlip,
  checkProbe,
  runProbeSuite,
  spearman,
  type Probe,
} from "./quantitative-probes";

const PROBES: Probe[] = [
  {
    id: "ate_pressure_epa",
    estimand: "ATE(pressure +10pp -> def EPA/play)",
    kind: "sign",
    sign: -1,
    minAbs: 0.05,
    subgraph: "defense",
  },
  {
    id: "ate_turnover_wp",
    estimand: "ATE(turnover margin +1 -> win prob)",
    kind: "range",
    range: [0.08, 0.25],
    subgraph: "overall",
  },
  {
    id: "ate_rest_epa",
    estimand: "ATE(rest days -> offensive EPA)",
    kind: "null",
    nullTol: 0.02,
    subgraph: "offense",
  },
  {
    id: "ate_blitz_epa",
    estimand: "ATE(blitz +10pp -> def EPA/play)",
    kind: "sign",
    sign: -1,
    minAbs: 0.03,
    subgraph: "defense",
  },
];

describe("checkProbe", () => {
  it("checks sign, range, and null probes", () => {
    expect(checkProbe(PROBES[0] as Probe, -0.07).hit).toBe(true);
    expect(checkProbe(PROBES[0] as Probe, 0.07).hit).toBe(false); // wrong sign
    expect(checkProbe(PROBES[0] as Probe, -0.01).hit).toBe(false); // too small
    expect(checkProbe(PROBES[1] as Probe, 0.15).hit).toBe(true);
    expect(checkProbe(PROBES[1] as Probe, 0.5).hit).toBe(false);
    expect(checkProbe(PROBES[2] as Probe, 0.005).hit).toBe(true);
    expect(checkProbe(PROBES[2] as Probe, 0.1).hit).toBe(false); // phantom effect
  });
});

describe("runProbeSuite", () => {
  it("releases when hit rate >= 0.8 and all nulls hold", () => {
    const report = runProbeSuite(
      PROBES,
      new Map([
        ["ate_pressure_epa", -0.07],
        ["ate_turnover_wp", 0.15],
        ["ate_rest_epa", 0.005],
        ["ate_blitz_epa", -0.04],
      ]),
    );
    expect(report.hitRate).toBe(1);
    expect(report.nullHoldRate).toBe(1);
    expect(report.release).toBe(true);
    expect(report.bySubgraph["defense"]?.hitRate).toBe(1);
  });

  it("blocks release when a null probe fails", () => {
    const report = runProbeSuite(PROBES, [
      { probeId: "ate_pressure_epa", effect: -0.07 },
      { probeId: "ate_turnover_wp", effect: 0.15 },
      { probeId: "ate_rest_epa", effect: 0.09 }, // phantom causal claim
      { probeId: "ate_blitz_epa", effect: -0.04 },
    ]);
    expect(report.hitRate).toBe(0.75);
    expect(report.release).toBe(false);
    // Failure localizes to the offense subgraph.
    expect(report.bySubgraph["offense"]?.hitRate).toBe(0);
    expect(report.bySubgraph["defense"]?.hitRate).toBe(1);
  });

  it("marks missing estimates as misses", () => {
    const report = runProbeSuite(PROBES, new Map([["ate_pressure_epa", -0.07]]));
    expect(report.hits).toBe(1);
    expect(report.release).toBe(false);
    expect(() => runProbeSuite([], new Map())).toThrow();
  });
});

describe("adversarialFlip", () => {
  it("drops hit rate below 0.5 on flipped knowledge", () => {
    const estimates = new Map([
      ["ate_pressure_epa", -0.07],
      ["ate_turnover_wp", 0.15],
      ["ate_rest_epa", 0.005],
      ["ate_blitz_epa", -0.04],
    ]);
    const flipped = adversarialFlip(PROBES);
    const report = runProbeSuite(flipped, estimates);
    // Flipped sign probes now expect +: both miss; flipped range
    // [-0.25,-0.08] misses 0.15; null still holds.
    expect(report.hitRate).toBeLessThan(0.5);
  });
});

describe("spearman", () => {
  it("correlates monotone series", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 12);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 12);
    expect(() => spearman([1], [1])).toThrow();
    expect(() => spearman([1, 2], [1])).toThrow();
  });
});
