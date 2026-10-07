/**
 * INT model tests (props-hb-int).
 *
 * H2 Edge — Interceptions. Beta-Binomial over attempts.
 *
 * Tests:
 *  - Method tag.
 *  - fitIntPrior on realistic CB/S safety spread (1.5-7% INT rate).
 *  - fitIntPrior returns null when all attempts are 0.
 *  - posteriorInt: alpha += ints, beta += attempts - ints.
 *  - probOverInt: monotonicity (lower line → higher p), bounds [0, 1].
 *  - zero attempts → posterior unchanged (full shrinkage).
 */
import { describe, it, expect } from "vitest";
import {
  INT_HB_METHOD_TAG,
  fitIntPrior,
  intPosterior,
  probOverInt,
  type IntSample,
} from "../props-hb-int.js";

describe("int model contract", () => {
  it("method tag is stamped", () => {
    expect(INT_HB_METHOD_TAG).toBe("props_hb_int_v1");
  });

  // Wide spread across positions: deep CBs 0.5%, slot CBs 3-5%, safeties 8-12%.
  // INT rates are low-variance Poisson (1-2 per season), so we need large
  // between-player spread to exceed sampling noise for the Beta fit.
  const NFL_SAMPLES: IntSample[] = [
    { attempts: 85, ints: 1 },   // 1.18% — deep outside CB
    { attempts: 90, ints: 1 },   // 1.11% — deep outside CB
    { attempts: 70, ints: 3 },   // 4.29% — slot CB
    { attempts: 65, ints: 4 },   // 6.15% — slot CB
    { attempts: 48, ints: 5 },   // 10.4% — safety
    { attempts: 52, ints: 6 },   // 11.5% — aggressive safety
  ];

  it("fitIntPrior returns beta params on realistic INT samples", () => {
    const prior = fitIntPrior(NFL_SAMPLES);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
    // Gamma prior mean = alpha / (alpha + beta) for Beta
    const priorMean = prior!.alpha / (prior!.alpha + prior!.beta);
    expect(priorMean).toBeGreaterThan(0.01);  // at least 1%
    expect(priorMean).toBeLessThan(0.12);     // less than 12%
  });

  it("fitIntPrior returns null when all attempts are 0", () => {
    const samples: IntSample[] = [
      { attempts: 0, ints: 0 },
      { attempts: 0, ints: 0 },
    ];
    expect(fitIntPrior(samples)).toBeNull();
  });

  it("fitIntPrior excludes zero-attempt games (healthy scratch)", () => {
    const samples: IntSample[] = [
      { attempts: 0, ints: 0 }, // scratch — excluded
      ...NFL_SAMPLES,
    ];
    const prior = fitIntPrior(samples);
    expect(prior).not.toBeNull();
  });

  it("posteriorInt updates alpha/beta correctly", () => {
    const prior = { alpha: 3, beta: 97 }; // 3% prior
    const post = intPosterior(prior, 4, 100); // 4 INTs on 100 attempts
    expect(post.alpha).toBe(7);   // 3 + 4
    expect(post.beta).toBe(97 + 96);   // 97 + (100 - 4) = 97 + 96 = 193
    expect(post.mean).toBeCloseTo(7 / 200, 12);
  });

  it("posteriorInt with 0 attempts leaves prior unchanged", () => {
    const prior = { alpha: 3, beta: 97 };
    const post = intPosterior(prior, 0, 0);
    expect(post.alpha).toBe(3);
    expect(post.beta).toBe(97);
  });

  it("probOverInt: lower line → higher probability (monotonic)", () => {
    const prior = fitIntPrior(NFL_SAMPLES)!;
    const post = intPosterior(prior, 3, 80);
    const pLow = probOverInt(post, 0, 50);  // P(INT > 0 | 50 att)
    const pHigh = probOverInt(post, 3, 50); // P(INT > 3 | 50 att)
    expect(pLow).toBeGreaterThan(pHigh);
  });

  it("probOverInt returns a probability in [0, 1]", () => {
    const prior = fitIntPrior(NFL_SAMPLES)!;
    const post = intPosterior(prior, 2, 70);
    const p = probOverInt(post, 1, 70);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("probOverInt: 0 attempts → P(INT > 0) = 0 (hurdle)", () => {
    const prior = fitIntPrior(NFL_SAMPLES)!;
    const post = intPosterior(prior, 0, 0);
    expect(probOverInt(post, 0, 0)).toBe(0);
  });

  it("probOverInt: negative line → probability 1", () => {
    const prior = fitIntPrior(NFL_SAMPLES)!;
    const post = intPosterior(prior, 3, 80);
    expect(probOverInt(post, -1, 80)).toBe(1);
  });
});
