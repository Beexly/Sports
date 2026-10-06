/**
 * QUARANTINED GUARD for `2402-01914v1-glmf-matchup-matrices.ts`.
 *
 * THIS FILE IS DELIBERATELY NOT NAMED `*.test.ts`.
 *
 * The engine vitest config (`packages/prediction-engine/vitest.config.ts`)
 * collects only files whose name ends in `.test.ts`, so it never picks this
 * file up. The two guards below encode the UNBLOCK
 * condition for a known contract violation that nobody has fixed yet, so they
 * are EXPECTED TO FAIL against today's module. Naming them `.test.ts` would put
 * them in the default engine suite and turn the whole suite red for a violation
 * that is not anyone's assigned work. Quarantining them as `.guard.ts` keeps
 * the default suite green while the violation stays written down and runnable.
 *
 * Run them explicitly:
 *
 *     npx vitest run --root packages/prediction-engine glmf-shrinkage-law.guard
 *
 * Contract under test (contract section 3.A), for the record:
 *
 *   1. The module header declares its input matrix X is BINOMIAL: a proportion
 *      over a known denominator (completions/targets, EPA>0 plays/snaps).
 *   2. `alsFactorize` fits that proportion with a Gaussian alternating
 *      least-squares objective plus a ridge `lambda`. Proportions require
 *      beta-binomial empirical Bayes or a logit-normal; classic Gaussian
 *      shrinkage applied to a proportion is the forbidden pairing.
 *   3. Its shrinkage target `mu` is the arithmetic mean of the SAME ratings
 *      array being factorized, a reverse-Stein target: the quantity every
 *      rating is shrunk toward is computed from the ratings themselves.
 *
 * Each guard below asserts the REQUIRED behavior, not the current behavior, so
 * each one fails today by exactly the margin named in the companion
 * `glmf-shrinkage-law.guard.md`.
 *
 * Scope note: this file asserts only. It never modifies the module under test.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  alsFactorize,
  glmfPredict,
} from "./2402-01914v1-glmf-matchup-matrices.js";

type Cell = { u: number; i: number; r: number };
type CellWithTrials = Cell & { trials: number };

/** Deterministic PRNG so every guard verdict is reproducible. */
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

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * A declared-BINOMIAL matchup matrix: every cell is a proportion strictly
 * inside (0, 1), which is the whole point of the contract claim under test.
 * The pool is polarized (an upper and a lower matchup tier) because that is
 * what a real completions/targets matrix looks like, and because a polarized
 * proportion is where a Gaussian objective has the most room to leave the
 * valid probability range.
 */
function binomialMatchupMatrix(
  rand: () => number,
  nU: number,
  nI: number,
  density: number,
): Cell[] {
  const cells: Cell[] = [];
  for (let u = 0; u < nU; u += 1) {
    const level = u % 2 === 0 ? 0.72 : 0.28;
    for (let i = 0; i < nI; i += 1) {
      if (rand() > density) continue;
      const edge = level + 0.22 * Math.sin(u * 1.7 + i * 0.9);
      const r = Math.min(0.97, Math.max(0.03, edge + 0.06 * (rand() - 0.5)));
      cells.push({ u, i, r });
    }
  }
  return cells;
}

const MODULE_REL_PATH = join(
  "src",
  "experimental",
  "2402-01914v1-glmf-matchup-matrices.ts",
);

function readModuleSource(): string {
  const candidates = [
    resolve(process.cwd(), MODULE_REL_PATH),
    resolve(process.cwd(), "packages", "prediction-engine", MODULE_REL_PATH),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return readFileSync(candidate, "utf8");
  }
  throw new Error(
    `glmf-shrinkage-law guard could not locate ${MODULE_REL_PATH} from cwd ${process.cwd()}`,
  );
}

/**
 * Comment stripping keeps the header claim ("binomial matrix") out of the
 * likelihood scan: the guard asks what the CODE models, not what the prose
 * calls it. The `[^:]` prefix keeps a URL's `//` from starting a comment.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * Vocabulary of a binomial-family observation model. Substring tolerant on
 * purpose: the point is that SOME binomial-family likelihood exists in the
 * code, not that it was given one particular name. A beta-binomial empirical
 * Bayes fit, a logit-normal fit, or a binomial log-likelihood with an explicit
 * denominator would each satisfy this.
 */
const BINOMIAL_FAMILY_LIKELIHOOD =
  /lgamma|lgammaln|lchoose|logchoose|binomial|beta|logit|deviance|irls|exposure|trials|denominator|successes|failures/i;

describe("glmf guard 1: the observation model for a BINOMIAL matrix must be binomial, not Gaussian least squares", () => {
  it("every fitted cell prediction must stay a valid probability in [0, 1]", () => {
    const nU = 12;
    const nI = 12;
    // Sparse matrix, latent rank 4, light ridge. A per-user least-squares
    // system with fewer observations than latent dimensions is underdetermined,
    // and nothing in a Gaussian objective keeps the resulting cell value inside
    // the probability range. A binomial observation model does keep it there.
    const cells = binomialMatchupMatrix(mulberry32(20260926), nU, nI, 0.25);
    const { P, Q, bu, bi, mu } = alsFactorize(
      cells,
      nU,
      nI,
      4,
      40,
      0.01,
      mulberry32(11),
    );

    const outOfRange: { u: number; i: number; predicted: number }[] = [];
    for (let u = 0; u < nU; u += 1) {
      for (let i = 0; i < nI; i += 1) {
        const predicted = glmfPredict(P, Q, bu, bi, mu, u, i);
        if (predicted < 0 || predicted > 1) {
          outOfRange.push({ u, i, predicted });
        }
      }
    }

    // A binomial observation model cannot emit a probability below 0 or above
    // 1. The offenders array is asserted empty so a failure names the cells.
    expect(outOfRange).toEqual([]);
  });

  it("the fit must respond to the binomial trial count behind each cell", () => {
    const nU = 10;
    const nI = 9;
    const cells = binomialMatchupMatrix(mulberry32(4242), nU, nI, 0.8);

    // Identical observed proportions; the ONLY difference is how many trials
    // stand behind each one. A binomial likelihood must weight these
    // differently (3/3 is weak evidence, 3000/4000 is decisive).
    const thin: CellWithTrials[] = cells.map((c) => ({ ...c, trials: 1 }));
    const backed: CellWithTrials[] = cells.map((c, idx) => ({
      ...c,
      trials: idx % 2 === 0 ? 3 : 4000,
    }));

    const a = alsFactorize(thin, nU, nI, 2, 25, 0.1, mulberry32(7));
    const b = alsFactorize(backed, nU, nI, 2, 25, 0.1, mulberry32(7));

    const predictedThin = glmfPredict(a.P, a.Q, a.bu, a.bi, a.mu, 3, 4);
    const predictedBacked = glmfPredict(b.P, b.Q, b.bu, b.bi, b.mu, 3, 4);

    // Trial counts are carried on the records already, so this needs no
    // change to the calling convention to be checkable.
    expect(predictedThin).not.toBeCloseTo(predictedBacked, 10);
  });

  it("the module must carry a binomial-family likelihood primitive, not only a ridge least-squares solve", () => {
    const code = stripComments(readModuleSource());
    const hits = code.match(BINOMIAL_FAMILY_LIKELIHOOD) ?? [];
    expect(hits).not.toEqual([]);
  });
});

describe("glmf guard 2: the shrink target must not be derived from the same sample being shrunk", () => {
  const nU = 10;
  const nI = 9;
  const k = 2;
  const iters = 20;
  const ridge = 0.1;

  it("the shrink target must not be the arithmetic mean of the ratings being factorized", () => {
    const cells = binomialMatchupMatrix(mulberry32(90210), nU, nI, 0.8);
    const fit = alsFactorize(cells, nU, nI, k, iters, ridge, mulberry32(3));
    const sampleMean = mean(cells.map((c) => c.r));

    // Reverse-Stein: the target is computed from the very ratings it is used
    // to shrink. A target from a separate prior must not coincide with it.
    expect(Math.abs(fit.mu - sampleMean)).toBeGreaterThan(1e-9);
  });

  it("the shrink target must not move one-for-one with a uniform shift in the sample", () => {
    const base = binomialMatchupMatrix(mulberry32(90211), nU, nI, 0.8);
    const shift = 0.1;
    const shifted = base.map((c) => ({ ...c, r: c.r + shift }));

    const before = alsFactorize(base, nU, nI, k, iters, ridge, mulberry32(3));
    const after = alsFactorize(shifted, nU, nI, k, iters, ridge, mulberry32(3));

    const sampleDelta = mean(shifted.map((c) => c.r)) - mean(base.map((c) => c.r));
    // Fixture sanity: the shift really does move the sample mean by `shift`.
    expect(Math.abs(sampleDelta - shift)).toBeLessThan(1e-9);

    // A target estimated from outside this sample has slope 0 against a
    // uniform shift; an EB target is damped (slope < 1). A reverse-Stein mean
    // has slope exactly 1, which is the defect.
    const slope = (after.mu - before.mu) / sampleDelta;
    expect(Math.abs(slope)).toBeLessThan(1);
  });

  it("one extreme observation must not move the shrink target by the raw arithmetic-mean increment", () => {
    const base = binomialMatchupMatrix(mulberry32(90212), nU, nI, 0.8);
    const idx = base.findIndex((c) => c.u === 0);
    if (idx < 0) throw new Error("fixture produced no cell for u=0");
    const original = base[idx]!;
    const spike = 0.95;
    const spiked = base.map((c, j) => (j === idx ? { ...c, r: spike } : c));

    const before = alsFactorize(base, nU, nI, k, iters, ridge, mulberry32(3));
    const after = alsFactorize(spiked, nU, nI, k, iters, ridge, mulberry32(3));

    const arithmeticIncrement = (spike - original.r) / base.length;
    expect(after.mu - before.mu).not.toBeCloseTo(arithmeticIncrement, 9);
  });
});
