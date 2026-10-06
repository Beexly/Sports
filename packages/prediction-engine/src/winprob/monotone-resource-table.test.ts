/**
 * Monotone game-state resource table — tests (arXiv 1810.00908).
 *
 * ACCEPTANCE GATE: exact monotonicity, RMSE not worse than unconstrained
 * empirical table on noisy holdout data, degenerate inputs handled.
 */
import { describe, expect, it } from "vitest";
import {
  fitResourceTable,
  isMonotone,
  resourceValue,
  tableRMSE,
  type GameState,
} from "./monotone-resource-table";

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

const T_EDGES = [0, 15, 30, 45, 60];
const S_EDGES = [-28, -14, -7, 0, 7, 14, 28];
const O_EDGES = [0, 1, 2, 3];

function synth(n: number, seed: number): GameState[] {
  const rand = mulberry32(seed);
  const out: GameState[] = [];
  for (let i = 0; i < n; i++) {
    const t = rand() * 60;
    const s = (rand() * 2 - 1) * 28;
    const to = Math.floor(rand() * 4);
    // True resource: monotone in all three axes + noise.
    const truth = 0.25 * t + 0.9 * s + 1.5 * to;
    const gauss = (rand() + rand() + rand() - 1.5) * 8;
    out.push({ t, s, to, remainingDiff: truth + gauss });
  }
  return out;
}

describe("fitResourceTable", () => {
  it("is exactly monotone across all cells", () => {
    const table = fitResourceTable(synth(4000, 21), T_EDGES, S_EDGES, O_EDGES)!;
    expect(isMonotone(table)).toBe(true);
  });

  it("beats the unconstrained empirical table on noisy holdout RMSE", () => {
    const train = synth(3000, 22);
    const holdout = synth(2000, 23);
    const table = fitResourceTable(train, T_EDGES, S_EDGES, O_EDGES)!;
    // Unconstrained: raw cell means without isotonic smoothing.
    const nt = T_EDGES.length - 1;
    const ns = S_EDGES.length - 1;
    const no = O_EDGES.length - 1;
    const sum: number[][][] = Array.from({ length: nt }, () =>
      Array.from({ length: ns }, () => new Array<number>(no).fill(0)),
    );
    const cnt: number[][][] = Array.from({ length: nt }, () =>
      Array.from({ length: ns }, () => new Array<number>(no).fill(0)),
    );
    const global = train.reduce((a, g) => a + g.remainingDiff, 0) / train.length;
    const bin = (edges: readonly number[], v: number): number => {
      const nb = edges.length - 1;
      if (v <= (edges[0] as number)) return 0;
      for (let i = 0; i < nb; i++) if (v < (edges[i + 1] as number)) return i;
      return nb - 1;
    };
    for (const g of train) {
      const it = bin(T_EDGES, g.t);
      const is = bin(S_EDGES, g.s);
      const io = bin(O_EDGES, g.to);
      ((sum[it] as number[][])[is] as number[])[io] =
        (((sum[it] as number[][])[is] as number[])[io] ?? 0) + g.remainingDiff;
      ((cnt[it] as number[][])[is] as number[])[io] =
        (((cnt[it] as number[][])[is] as number[])[io] ?? 0) + 1;
    }
    let sse = 0;
    for (const g of holdout) {
      const it = bin(T_EDGES, g.t);
      const is = bin(S_EDGES, g.s);
      const io = bin(O_EDGES, g.to);
      const c = ((cnt[it] as number[][])[is] as number[])[io] ?? 0;
      const pred = c > 0 ? (((sum[it] as number[][])[is] as number[])[io] ?? 0) / c : global;
      sse += (g.remainingDiff - pred) ** 2;
    }
    const unconstrainedRmse = Math.sqrt(sse / holdout.length);
    expect(tableRMSE(table, holdout)).toBeLessThanOrEqual(unconstrainedRmse);
  });

  it("resource value rises with lead, time, and timeouts", () => {
    const table = fitResourceTable(synth(4000, 24), T_EDGES, S_EDGES, O_EDGES)!;
    expect(resourceValue(table, 30, 7, 2)).toBeGreaterThan(resourceValue(table, 30, -7, 2));
    expect(resourceValue(table, 45, 0, 2)).toBeGreaterThan(resourceValue(table, 15, 0, 2));
    expect(resourceValue(table, 30, 0, 3)).toBeGreaterThan(resourceValue(table, 30, 0, 0));
  });

  it("returns null on empty input and throws on degenerate edges", () => {
    expect(fitResourceTable([], T_EDGES, S_EDGES, O_EDGES)).toBeNull();
    expect(() => fitResourceTable(synth(10, 1), [0], S_EDGES, O_EDGES)).toThrow();
    expect(() => tableRMSE(fitResourceTable(synth(10, 2), T_EDGES, S_EDGES, O_EDGES)!, [])).toThrow();
  });
});
