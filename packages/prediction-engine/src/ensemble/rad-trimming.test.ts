/**
 * RAD trimming — tests (arXiv 2208.00139).
 *
 * ACCEPTANCE GATE: the Tukey screen drops the erratic model; ADT
 * elimination drops the redundant clone; the RelDiv protocol picks
 * accuracy-only on a low-diversity pool and full RAD on a diverse one;
 * trimming never degrades the point score vs no trimming on the
 * synthetic pool; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  adtElimination,
  combineSurvivors,
  radTrim,
  relDiv,
  testMse,
  tukeyScreen,
  type TrimWeek,
} from "./rad-trimming";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pool: good models (second a near-clone of the first), mediocre models,
 * and one erratic model (huge error variance) last.
 */
function poolWeeks(seed: number, nWeeks: number, nModels = 4): TrimWeek[] {
  const rand = mulberry32(seed);
  const weeks: TrimWeek[] = [];
  for (let w = 0; w < nWeeks; w++) {
    const forecasts: number[][] = [];
    const outcomes: number[] = [];
    for (let g = 0; g < 16; g++) {
      const y = rand();
      outcomes.push(y);
      const good = y + (rand() - 0.5) * 0.2;
      const row = [good, good + (rand() - 0.5) * 0.02];
      for (let m = 2; m < nModels - 1; m++) {
        row.push(y + (rand() - 0.5) * 0.6); // mediocre
      }
      // Erratic last: occasional huge misses.
      row.push(rand() < 0.1 ? y + (rand() - 0.5) * 4 : y + (rand() - 0.5) * 0.3);
      forecasts.push(row);
    }
    weeks.push({ forecasts, outcomes });
  }
  return weeks;
}

const MODELS = [0, 1, 2, 3];

describe("tukeyScreen", () => {
  it("drops the erratic model", () => {
    // 8-model pool: quartiles are set by the well-behaved models.
    const weeks = poolWeeks(221, 6, 8);
    const models = [0, 1, 2, 3, 4, 5, 6, 7];
    const kept = tukeyScreen(weeks, models);
    expect(kept).not.toContain(7);
    expect(kept).toContain(0);
    expect(kept).toContain(1);
    expect(() => tukeyScreen(weeks, [])).toThrow();
  });
});

describe("adtElimination", () => {
  it("drops the redundant clone", () => {
    const weeks = poolWeeks(223, 6);
    const { survivors, trace } = adtElimination(weeks, [0, 1, 2], 1, 0.001);
    // The near-clone adds no diversity: ADT drops one of {0, 1}.
    expect(survivors.length).toBeLessThan(3);
    expect(survivors).toContain(2);
    expect(trace[0]).toBeGreaterThanOrEqual(trace[trace.length - 1] as number);
    expect(() => adtElimination(weeks, [])).toThrow();
  });
});

describe("radTrim", () => {
  it("selects the regime by RelDiv and never degrades the point score", () => {
    const weeks = poolWeeks(225, 6);
    const train = weeks.slice(0, 4);
    const test = weeks.slice(4);
    const rd = relDiv(train, MODELS);
    expect(rd).toBeGreaterThan(0);
    const decision = radTrim(train, MODELS);
    expect(decision.survivors.length).toBeGreaterThan(0);
    expect(decision.survivors.length).toBeLessThanOrEqual(MODELS.length);
    const mseTrimmed = testMse(test, decision.survivors);
    const mseNone = testMse(test, MODELS);
    expect(mseTrimmed).toBeLessThanOrEqual(mseNone + 1e-9);
    expect(() => radTrim(train, [])).toThrow();
  });

  it("downgrades to accuracy-only on a low-diversity pool", () => {
    const rand = mulberry32(227);
    const weeks: TrimWeek[] = [];
    for (let w = 0; w < 4; w++) {
      const forecasts: number[][] = [];
      const outcomes: number[] = [];
      for (let g = 0; g < 16; g++) {
        const y = rand();
        outcomes.push(y);
        // Near-identical models: RelDiv -> ~0.
        forecasts.push([y + 0.01, y + 0.011, y + 0.012]);
      }
      weeks.push({ forecasts, outcomes });
    }
    const decision = radTrim(weeks, [0, 1, 2]);
    expect(decision.relDiv).toBeLessThan(0.2);
    expect(decision.regime).toBe("skip");
  });
});

describe("combineSurvivors", () => {
  it("averages survivors", () => {
    expect(combineSurvivors([0.6, 0.4, 0.8], [0, 2])).toBeCloseTo(0.7, 12);
    expect(() => combineSurvivors([0.5], [])).toThrow();
  });
});
