/**
 * PD model tests (props-hb-pd).
 *
 * H1 Edge #3 — Pass Deflections (PD).
 *
 * PD is an unbounded per-game count: Gamma-Poisson (Negative-Binomial
 * posterior-predictive), the same family as def-snap-share — NOT the
 * Beta-Binomial two-part model used by sacks/pressures/TFL.
 *
 * Verifies:
 *  - Method tag.
 *  - PdSample type shape (games, pd).
 *  - fitPdPrior returns Gamma prior on realistic per-game PD counts.
 *  - posteriorPd updates alpha/beta correctly (alpha + pd, beta + games).
 *  - probOverPd returns a probability in [0, 1].
 *  - Monotonicity: lower line → higher probability.
 *  - Multi-game horizon: more games → wider spread.
 *  - fitPdPrior returns null when all games are 0 (no opportunity).
 *  - fitPdPrior excludes 0-game players (healthy scratch).
 *  - posteriorPd with 0 games stays at the prior (full shrinkage).
 *  - scorePdOver combines prior + history + probOver in one call.
 *  - scorePdOver matches manual posterior + probOverPd.
 */
import { describe, expect, it } from "vitest";

import {
  PD_HB_METHOD_TAG,
  fitPdPrior,
  posteriorPd,
  probOverPd,
  scorePdOver,
  type PdSample,
} from "../props-hb-pd.js";
import { posteriorRate, type GammaPrior, type GammaPosterior } from "../props-hb.js";

describe("pd model contract", () => {
  it("exposes the v1 method tag", () => {
    expect(PD_HB_METHOD_TAG).toBe("props_hb_pd_v1");
  });

  it("PdSample has games + pd fields", () => {
    const sample: PdSample = { games: 14, pd: 18 };
    expect(sample.games).toBe(14);
    expect(sample.pd).toBe(18);
  });

  it("fitPdPrior returns Gamma prior on realistic PD samples", () => {
    // CB ~1.0-1.5 PD/game, S ~0.3-0.6, edge rusher ~0.4-0.8.
    const samples: PdSample[] = [
      { games: 16, pd: 22 },  // 1.38 — high-volume CB
      { games: 16, pd: 18 },  // 1.13 — CB
      { games: 14, pd: 7 },   // 0.50 — safety
      { games: 15, pd: 10 },  // 0.67 — safety
      { games: 16, pd: 8 },   // 0.50 — edge rusher
      { games: 13, pd: 5 },   // 0.38 — edge rusher
    ];
    const prior = fitPdPrior(samples);
    expect(prior).not.toBeNull();
    expect(prior!.alpha).toBeGreaterThan(0);
    expect(prior!.beta).toBeGreaterThan(0);
    // Gamma prior mean = alpha/beta tracks empirical PD rate.
    const priorMean = prior!.alpha / prior!.beta;
    const empiricalMean = (22 + 18 + 7 + 10 + 8 + 5) / (16 + 16 + 14 + 15 + 16 + 13);
    expect(priorMean).toBeCloseTo(empiricalMean, 1);
  });

  it("posteriorPd updates alpha and beta", () => {
    const prior: GammaPrior = { alpha: 8, beta: 10 }; // mean ~ 0.8/game
    const post = posteriorPd(prior, 16, 18); // 18 PDs over 16 games
    expect(post.alpha).toBe(8 + 18); // alpha + pd
    expect(post.beta).toBe(10 + 16); // beta + games
    expect(post.mean).toBe((8 + 18) / (10 + 16));
  });

  it("probOverPd returns a probability in [0, 1]", () => {
    const samples: PdSample[] = [
      { games: 16, pd: 22 }, { games: 16, pd: 18 },
      { games: 14, pd: 7 }, { games: 15, pd: 10 },
      { games: 16, pd: 8 }, { games: 13, pd: 5 },
    ];
    const prior = fitPdPrior(samples)!;
    const post = posteriorPd(prior, 16, 18);
    const p = probOverPd(post, 2);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("probOverPd with explicit GammaPosterior returns in [0, 1]", () => {
    const post: GammaPosterior = { alpha: 26, beta: 26, mean: 1.0 };
    const p = probOverPd(post, 2);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("lower line → higher probability (monotonic)", () => {
    const samples: PdSample[] = [
      { games: 16, pd: 22 }, { games: 16, pd: 18 },
      { games: 14, pd: 7 }, { games: 15, pd: 10 },
    ];
    const prior = fitPdPrior(samples)!;
    const post = posteriorPd(prior, 16, 18); // ~1.1 PD/game posterior
    const pBelow = probOverPd(post, 0.5);   // well below posterior mean
    const pAbove = probOverPd(post, 3.5);   // well above posterior mean
    expect(pBelow).toBeGreaterThan(pAbove);
    expect(pBelow).toBeGreaterThan(0.3);
  });

  it("multi-game horizon: more games → higher P(total > line) at fixed line", () => {
    const samples: PdSample[] = [
      { games: 16, pd: 22 }, { games: 16, pd: 18 },
      { games: 14, pd: 7 }, { games: 15, pd: 10 },
    ];
    const prior = fitPdPrior(samples)!;
    const post = posteriorPd(prior, 16, 18); // ~1.1 PD/game
    // Over 1 game, P(PD > 2) is moderate.
    // Over 4 games, expected total ~4.4, so P(total > 2) should be higher.
    const p1 = probOverPd(post, 2, 1);
    const p4 = probOverPd(post, 2, 4);
    expect(p4).toBeGreaterThan(p1);
  });

  it("probOverPd at line=0 returns 1 (count always >= 0, > 0 when not degenerate)", () => {
    // With a reasonable posterior, P(PD >= 1) over 1 game should be > 0.
    // At line=0, probOver computes P(X > 0) = 1 - P(X = 0).
    const post: GammaPosterior = { alpha: 26, beta: 26, mean: 1.0 };
    const p = probOverPd(post, 0);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("fitPdPrior returns null when all games are 0 (no opportunity)", () => {
    const samples: PdSample[] = [{ games: 0, pd: 0 }, { games: 0, pd: 0 }];
    expect(fitPdPrior(samples)).toBeNull();
  });

  it("fitPdPrior excludes 0-game players (healthy scratch)", () => {
    const samples: PdSample[] = [
      { games: 0, pd: 0 }, // scratch — excluded
      { games: 16, pd: 22 }, { games: 16, pd: 18 },
      { games: 14, pd: 7 }, { games: 15, pd: 10 },
      { games: 16, pd: 8 }, { games: 13, pd: 5 },
    ];
    const prior = fitPdPrior(samples);
    expect(prior).not.toBeNull();
  });

  it("posteriorPd with 0 games stays at the prior (full shrinkage)", () => {
    const prior: GammaPrior = { alpha: 8, beta: 10 };
    const post = posteriorPd(prior, 0, 0);
    expect(post.alpha).toBe(8); // unchanged
    expect(post.beta).toBe(10); // unchanged
  });

  it("probOverPd accepts a posteriorRate-built posterior", () => {
    const prior: GammaPrior = { alpha: 8, beta: 10 };
    const post = posteriorRate(prior, 18, 16); // posteriorRate(prior, total, games)
    const p = probOverPd(post, 2);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
    // Should match posteriorPd with the same inputs
    const post2 = posteriorPd(prior, 16, 18); // posteriorPd(prior, games, pd) → posteriorRate(prior, pd, games)
    expect(post2.alpha).toBe(post.alpha);
    expect(post2.beta).toBe(post.beta);
  });

  it("scorePdOver is in (0, 1) with realistic inputs", () => {
    const samples: PdSample[] = [
      { games: 16, pd: 22 }, { games: 16, pd: 18 },
      { games: 14, pd: 7 }, { games: 15, pd: 10 },
      { games: 16, pd: 8 }, { games: 13, pd: 5 },
    ];
    const pdPrior = fitPdPrior(samples)!;
    const p = scorePdOver({
      pdPrior,
      pdHistory: [{ games: 16, pd: 18 }],
      line: 2,
      games: 1,
    });
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("scorePdOver matches manual posterior + probOverPd", () => {
    const samples: PdSample[] = [
      { games: 16, pd: 22 }, { games: 16, pd: 18 },
      { games: 14, pd: 7 }, { games: 15, pd: 10 },
    ];
    const pdPrior = fitPdPrior(samples)!;
    const pdHistory: PdSample[] = [{ games: 16, pd: 18 }];

    // Manual: accumulate history, update posterior, score.
    let totalPd = 0;
    let totalGames = 0;
    for (const s of pdHistory) {
      totalPd += s.pd;
      totalGames += s.games;
    }
    const manualPost = posteriorPd(pdPrior, totalGames, totalPd);
    const manualP = probOverPd(manualPost, 2, 1);

    const scorableP = scorePdOver({
      pdPrior,
      pdHistory,
      line: 2,
      games: 1,
    });
    expect(scorableP).toBeCloseTo(manualP, 10);
  });

  it("scorePdOver accumulates multi-game history", () => {
    const samples: PdSample[] = [
      { games: 16, pd: 22 }, { games: 16, pd: 18 },
      { games: 14, pd: 7 }, { games: 15, pd: 10 },
    ];
    const pdPrior = fitPdPrior(samples)!;
    const multiHistory: PdSample[] = [
      { games: 8, pd: 10 },
      { games: 6, pd: 4 },
    ];

    const p = scorePdOver({
      pdPrior,
      pdHistory: multiHistory,
      line: 3,
      games: 1,
    });
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);

    // Total games = 14, total pd = 14 → verify posterior is correct
    const post = posteriorPd(pdPrior, 14, 14);
    const manualP = probOverPd(post, 3, 1);
    expect(p).toBeCloseTo(manualP, 10);
  });
});
