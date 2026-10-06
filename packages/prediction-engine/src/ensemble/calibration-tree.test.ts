import { describe, expect, it } from "vitest";
import {
  fitCalibrationTree,
  leafCount,
  predictCalibrated,
  treeRMSE,
  type CalibRow,
} from "./calibration-tree";

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

/** Two regimes: divisional games hit at 65%, others at 35%. */
function regimeData(seed = 5, n = 400): CalibRow[] {
  const rand = mulberry32(seed);
  const rows: CalibRow[] = [];
  for (let i = 0; i < n; i++) {
    const divisional = rand() < 0.5 ? 1 : 0;
    const p = divisional ? 0.65 : 0.35;
    rows.push({
      score: 0.5,
      context: { divisional, spread: Math.abs(rand() * 10) },
      outcome: rand() < p ? 1 : 0,
    });
  }
  return rows;
}

describe("calibration-tree", () => {
  it("splits on the regime attribute and recovers local rates", () => {
    const rows = regimeData();
    const tree = fitCalibrationTree(rows, { minLeaf: 15, maxDepth: 3 });
    expect(leafCount(tree)).toBeGreaterThan(1);
    const pDiv = predictCalibrated(tree, { divisional: 1, spread: 3 });
    const pOther = predictCalibrated(tree, { divisional: 0, spread: 3 });
    expect(pDiv).toBeGreaterThan(0.55);
    expect(pOther).toBeLessThan(0.45);
    // Tree RMSE beats the global-mean baseline.
    const global = rows.reduce((a, r) => a + r.outcome, 0) / rows.length;
    let s = 0;
    for (const r of rows) s += (r.outcome - global) ** 2;
    const globalRmse = Math.sqrt(s / rows.length);
    expect(treeRMSE(tree, rows)).toBeLessThan(globalRmse);
  });

  it("collapses to a single node when miscalibration is global", () => {
    const rand = mulberry32(8);
    const rows: CalibRow[] = [];
    for (let i = 0; i < 300; i++) {
      rows.push({
        score: 0.5,
        context: { spread: rand() * 10, total: 40 + rand() * 10 },
        outcome: rand() < 0.5 ? 1 : 0,
      });
    }
    const tree = fitCalibrationTree(rows, { minLeaf: 15, maxDepth: 3, minGain: 0.02 });
    expect(leafCount(tree)).toBe(1);
    expect(tree.prob).toBeCloseTo(0.5, 1);
  });

  it("respects the minimum leaf size", () => {
    const rows = regimeData(21, 200);
    const tree = fitCalibrationTree(rows, { minLeaf: 40, maxDepth: 5 });
    const check = (node: Parameters<typeof leafCount>[0]): void => {
      if (node.prob !== null) {
        expect(node.n).toBeGreaterThanOrEqual(40);
      } else {
        check(node.left!);
        check(node.right!);
      }
    };
    check(tree);
  });

  it("uses the model score as a splitting feature when it carries signal", () => {
    const rand = mulberry32(13);
    const rows: CalibRow[] = [];
    for (let i = 0; i < 400; i++) {
      const score = rand();
      rows.push({
        score,
        context: { score, spread: 3 },
        outcome: rand() < score ? 1 : 0,
      });
    }
    const tree = fitCalibrationTree(rows, { minLeaf: 20, maxDepth: 3 });
    expect(leafCount(tree)).toBeGreaterThan(1);
    const lo = predictCalibrated(tree, { score: 0.1, spread: 3 });
    const hi = predictCalibrated(tree, { score: 0.9, spread: 3 });
    expect(hi).toBeGreaterThan(lo + 0.3);
  });

  it("empty input throws", () => {
    expect(() => fitCalibrationTree([])).toThrow();
  });
});
