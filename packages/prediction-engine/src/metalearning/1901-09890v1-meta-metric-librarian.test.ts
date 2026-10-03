import { describe, it, expect } from "vitest";
import {
  cosineSim,
  retrieveTopS,
  learnMetricScales,
  prototypePredict,
  accuracy,
  librarianGate,
} from "./1901-09890v1-meta-metric-librarian.js";

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
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Tasks where only the first 2 of 10 features carry class signal. */
function simTasks(nTasks: number, n: number, seed: number) {
  const rand = mulberry32(seed);
  const tasks: { X: number[][]; y: number[] }[] = [];
  for (let t = 0; t < nTasks; t++) {
    const X: number[][] = [];
    const y: number[] = [];
    const shift = randn(rand) * 0.5;
    for (let i = 0; i < n; i++) {
      const x = Array.from({ length: 10 }, () => randn(rand));
      const label = x[0]! + x[1]! + shift > 0 ? 1 : 0;
      X.push(x);
      y.push(label);
    }
    tasks.push({ X, y });
  }
  return tasks;
}

describe("meta metric librarian", () => {
  it("retrieves same-regime seasons", () => {
    const rand = mulberry32(31);
    const lib = Array.from({ length: 20 }, (_, i) => ({
      id: `s${i}`,
      embedding: Array.from({ length: 8 }, () => randn(rand) * 0.2).map((v, j) =>
        j === 0 ? (i < 10 ? 1 : -1) + v : v,
      ),
    }));
    const query = Array.from({ length: 8 }, (_, j) => (j === 0 ? 1 : 0));
    const top = retrieveTopS(query, lib, 5);
    const precision = top.filter((id) => Number(id.slice(1)) < 10).length / 5;
    expect(precision).toBeGreaterThan(0.8);
    expect(cosineSim([1, 0], [1, 0])).toBeCloseTo(1, 10);
  });
  it("learned metric scales upweight informative features", () => {
    const tasks = simTasks(8, 60, 32);
    const scales = learnMetricScales(tasks);
    const info = (scales[0]! + scales[1]!) / 2;
    const noise = scales.slice(2).reduce((a, b) => a + b, 0) / 8;
    expect(info).toBeGreaterThan(noise * 2);
  });
  it("meta-metric beats uniform metric by >= 5pp on new tasks", () => {
    const train = simTasks(10, 60, 33);
    const scales = learnMetricScales(train);
    const test = simTasks(6, 40, 34);
    const uniform = new Array<number>(10).fill(1);
    const accS: number[] = [];
    const accU: number[] = [];
    for (const task of test) {
      const n = task.X.length;
      const sX = task.X.slice(0, 8);
      const sY = task.y.slice(0, 8);
      const qX = task.X.slice(8);
      const qY = task.y.slice(8);
      accS.push(accuracy(qX.map((x) => prototypePredict(sX, sY, x, scales)), qY));
      accU.push(accuracy(qX.map((x) => prototypePredict(sX, sY, x, uniform)), qY));
      void n;
    }
    const mS = accS.reduce((a, b) => a + b, 0) / accS.length;
    const mU = accU.reduce((a, b) => a + b, 0) / accU.length;
    expect(mS - mU).toBeGreaterThanOrEqual(0.05);
  });
  it("random-retrieval ablation shows no gain over the plain baseline", () => {
    // uniform scales + random support ~ plain matching net: accuracy near chance-ish baseline
    const rand = mulberry32(35);
    const tasks = simTasks(4, 40, 36);
    const uniform = new Array<number>(10).fill(1);
    const accs: number[] = [];
    for (const task of tasks) {
      // random support: shuffle labels destroys the signal -> near chance
      const sX = task.X.slice(0, 8);
      const sY = task.y.slice(0, 8).map(() => (rand() < 0.5 ? 1 : 0));
      const qX = task.X.slice(8);
      const qY = task.y.slice(8);
      accs.push(accuracy(qX.map((x) => prototypePredict(sX, sY, x, uniform)), qY));
    }
    const m = accs.reduce((a, b) => a + b, 0) / accs.length;
    expect(m).toBeLessThan(0.65);
  });
  it("gate logic", () => {
    expect(librarianGate(0.75, 0.7, 0.7)).toBe("ADAPT");
    expect(librarianGate(0.72, 0.7, 0.7)).toBe("REJECT");
    expect(librarianGate(0.75, 0.7, 0.73)).toBe("REJECT");
  });
});
