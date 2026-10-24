/**
 * The panel DGP the lagged-DYNOTEARS tests share.
 *
 * IT LIVES HERE RATHER THAN BEING COPIED INTO EACH TEST FILE, for the same reason the PRNG
 * lives in ./test-prng.ts: a generator copied twice is a generator that will drift. Two files
 * that were supposed to measure the same panel would quietly measure different panels, and
 * the "scale invariance" comparison between them would then be a comparison of two different
 * datasets -- which passes for the wrong reason and measures nothing.
 *
 * The PRNG is imported from ./test-prng.js, so there is exactly one copy of the generator in
 * the repository.
 */
import { mulberry32 } from "./test-prng.js";

function randn(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * A panel DGP with a v-structure contemporaneously and one lagged edge.
 *
 *   x0(t) = e0(t)                     white noise
 *   x2(t) = e2(t)                     white noise
 *   x1(t) = 0.9 x0(t) + 0.8 x2(t) + e1(t)      contemporaneous 0 -> 1 and 2 -> 1
 *   x3(t) = 0.9 x1(t-1) + e3(t)                lagged 1 -> 3 at lag 1
 *
 * WHY A V-STRUCTURE AND NOT A CHAIN. In a linear-Gaussian model, the direction of a
 * contemporaneous edge is not identified by the likelihood: 0 -> 1 and 1 -> 0 fit the same
 * joint density to the last decimal, and the objective here returns the same value for both
 * (measured: -0.5373613 forward vs -0.5373681 reverse). A chain is therefore a COIN FLIP for
 * the estimator, and a test built on one asserts the optimiser's arbitrary tie-break rather
 * than the estimator's correctness. A v-structure -- a COLLIDER -- is not Markov equivalent to
 * its reversal: x0 and x2 are marginally independent but conditionally dependent given x1, and
 * the reversed model predicts independence. The collider is what makes the direction
 * identifiable, so that is what the recovery test is built on.
 *
 * @param n entities per time slice
 * @param T number of time slices
 * @param seed the PRNG seed
 */
export function simPanel(n: number, T: number, seed: number): number[][][] {
  const rand = mulberry32(seed);
  const frames: number[][][] = [];
  let prev: number[][] = [];
  for (let t = 0; t < T; t++) {
    const cur: number[][] = [];
    for (let i = 0; i < n; i++) {
      const p = prev[i];
      const x0 = randn(rand);
      const x2 = randn(rand);
      const x1 = 0.9 * x0 + 0.8 * x2 + randn(rand);
      const x3 = p ? 0.9 * p[1]! + randn(rand) : randn(rand);
      cur.push([x0, x1, x2, x3]);
    }
    frames.push(cur);
    prev = cur;
  }
  return frames;
}

/** Multiply the listed feature columns by a positive constant. */
export function scaleColumns(
  frames: number[][][],
  columns: number[],
  factor: number,
): number[][][] {
  return frames.map((frame) =>
    frame.map((row) => row.map((v, j) => (columns.includes(j) ? v * factor : v))),
  );
}
