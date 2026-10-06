import { describe, it, expect } from "vitest";
import {
  innerAdapt,
  queryLoss,
  mamlMetaLoss,
  foMetaGradient,
  metaTrain,
  FewShotTask,
} from "./1703-03400v3-maml-rookie-adapter.js";

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

/** Tasks: y = m_t * x + noise, slope varies per task (like team-seasons). */
function simTasks(nTasks: number, K: number, seed: number): FewShotTask[] {
  const rand = mulberry32(seed);
  const tasks: FewShotTask[] = [];
  for (let t = 0; t < nTasks; t++) {
    const m = (rand() * 2 - 1) * 2;
    const mk = (n: number) => {
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < n; i++) {
        const x = rand() * 2 - 1;
        X.push([x]);
        y.push(m * x + (rand() - 0.5) * 0.2);
      }
      return { X, y };
    };
    const s = mk(K);
    const q = mk(30);
    tasks.push({ supportX: s.X, supportY: s.y, queryX: q.X, queryY: q.y });
  }
  return tasks;
}

describe("maml-rookie-adapter", () => {
  const tasks = simTasks(24, 4, 5);
  it("meta-learned init adapts better than a cold init at K=4", () => {
    const cold = [0];
    const meta = metaTrain([0], tasks, 0.5, 1, 0.5, 60);
    expect(mamlMetaLoss(meta, tasks, 0.5, 1)).toBeLessThan(mamlMetaLoss(cold, tasks, 0.5, 1));
  });
  it("query loss is non-increasing over 1->5 inner steps (no overfit)", () => {
    const meta = metaTrain([0], tasks, 0.3, 1, 0.5, 60);
    const l1 = mamlMetaLoss(meta, tasks, 0.3, 1);
    const l5 = mamlMetaLoss(meta, tasks, 0.3, 5);
    expect(l5).toBeLessThanOrEqual(l1 + 1e-9);
  });
  it("adaptation moves toward the task solution", () => {
    const task = tasks[0]!;
    const before = queryLoss([0], task, 0.5, 0);
    const after = queryLoss([0], task, 0.5, 3);
    expect(after).toBeLessThan(before);
  });
  it("first-order meta-gradient is a descent direction", () => {
    const g = foMetaGradient([0.3], tasks.slice(0, 4), 0.5, 1);
    const eps = 1e-6;
    const num =
      (mamlMetaLoss([0.3 + eps], tasks.slice(0, 4), 0.5, 1) -
        mamlMetaLoss([0.3], tasks.slice(0, 4), 0.5, 1)) /
      eps;
    // FOMAML deliberately drops the Hessian term, so the magnitudes differ from
    // exact finite differences; what must hold is the descent direction (sign).
    expect(Math.sign(g[0]!)).toBe(Math.sign(num));
    const base = mamlMetaLoss([0.3], tasks.slice(0, 4), 0.5, 1);
    const stepped = [0.3 - 0.1 * g[0]!];
    expect(mamlMetaLoss(stepped, tasks.slice(0, 4), 0.5, 1)).toBeLessThan(base);
  });
  it("innerAdapt is a no-op at 0 steps", () => {
    expect(innerAdapt([0.7], tasks[0]!, 0.5, 0)).toEqual([0.7]);
  });
});
