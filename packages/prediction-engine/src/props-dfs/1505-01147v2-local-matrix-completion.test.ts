import { describe, it, expect } from "vitest";
import {
  completeMatrix,
  specializationEmbedding,
  imputationRmse,
} from "./1505-01147v2-local-matrix-completion.js";

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

/** Synthetic rank-2 player x stat matrix with 25% missing. */
function simMatrix() {
  const rand = mulberry32(99);
  const m = 14;
  const n = 8;
  const U = Array.from({ length: m }, () => [rand() * 4 - 2, rand() * 4 - 2]);
  const V = Array.from({ length: n }, () => [rand() * 4 - 2, rand() * 4 - 2]);
  const truth = U.map((u) => V.map((v) => u[0]! * v[0]! + u[1]! * v[1]! + rand() * 0.1));
  const mask: boolean[][] = [];
  const M: (number | null)[][] = truth.map((row, i) => {
    mask.push(row.map(() => false));
    return row.map((v, j) => {
      const miss = rand() < 0.25;
      mask[i]![j] = miss;
      return miss ? null : v;
    });
  });
  return { truth, M, mask };
}

describe("completeMatrix", () => {
  it("beats mean imputation on a low-rank matrix with missing entries", () => {
    const { truth, M, mask } = simMatrix();
    const completed = completeMatrix(M, 2, 80);
    // mean-imputation baseline
    const colMean: number[] = [];
    for (let j = 0; j < truth[0]!.length; j++) {
      let s = 0;
      let c = 0;
      for (let i = 0; i < truth.length; i++) {
        const v = M[i]![j];
        if (v != null) {
          s += v;
          c++;
        }
      }
      colMean.push(s / c);
    }
    const meanImp = M.map((row) => row.map((v, j) => (v === null ? colMean[j]! : v)));
    expect(imputationRmse(completed, truth, mask)).toBeLessThan(
      imputationRmse(meanImp as number[][], truth, mask),
    );
  });
  it("returns a complete matrix with no nulls", () => {
    const { M } = simMatrix();
    const completed = completeMatrix(M, 2, 40);
    expect(completed.every((row) => row.every((v) => Number.isFinite(v)))).toBe(true);
  });
});

describe("specializationEmbedding", () => {
  it("emits three numbers per player", () => {
    const { M } = simMatrix();
    const completed = completeMatrix(M, 2, 40);
    const emb = specializationEmbedding(completed);
    expect(emb).toHaveLength(14);
    expect(emb.every((e) => e.length === 3 && e.every(Number.isFinite))).toBe(true);
  });
  it("level component tracks row means", () => {
    const { M } = simMatrix();
    const completed = completeMatrix(M, 2, 40);
    const emb = specializationEmbedding(completed);
    const rowMean = completed.map((r) => r.reduce((s, v) => s + v, 0) / r.length);
    const corr = (a: number[], b: number[]) => {
      const ma = a.reduce((s, x) => s + x, 0) / a.length;
      const mb = b.reduce((s, x) => s + x, 0) / b.length;
      return (
        a.reduce((s, x, i) => s + (x - ma) * (b[i]! - mb), 0) /
        Math.sqrt(
          a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, x) => s + (x - mb) ** 2, 0),
        )
      );
    };
    expect(corr(emb.map((e) => e[0]!), rowMean)).toBeGreaterThan(0.99);
  });
});
