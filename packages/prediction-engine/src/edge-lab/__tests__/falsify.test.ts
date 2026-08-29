/** SYNTHETIC property tests for falsify kill-test harness (Wave 3, LANE B). */
import { describe, expect, it } from "vitest";
import { falsifyBind, type BacktestRow, type FalsifyOutput } from "../falsify.js";
import { mulberry32 } from "../rng.js";

function synRow(overrides: Partial<BacktestRow>): BacktestRow {
  return {
    season: 2024, outcomeWeek: 5, knownAtWeek: 4, outcome: 1, modelProb: 0.65, marketProb: 0.5,
    ...overrides,
  } as BacktestRow;
}

function cleanRows(n = 150): BacktestRow[] {
  const out: BacktestRow[] = [];
  for (let i = 0; i < n; i++) {
    const kw = Math.max(0, (i % 10) - 2);  // always < ow = 3 + (i % 10) since 2..9 < 3..12 when i%10>=1; enforce explicitly
    const ow = 3 + (i % 10);
    out.push({
      season: 2024,
      outcomeWeek: ow,
      knownAtWeek: kw,
      outcome: 1,
      modelProb: 0.65,
      marketProb: 0.5,
    });
  }
  return out;
}

describe("falsify — 4 kill tests (SYNTHETIC, labeled)", () => {
  it("clean data passes all 4: SURVIVOR", () => {
    const rows = cleanRows(150);
    const res = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.leakage.verdict).toBe("PASS");
    expect(res.shuffle.verdict).toBe("PASS");
    expect(res.split.verdict).toBe("PASS");
    expect(res.multiplicity.verdict).toBe("PASS");
    expect(res.overall.verdict).toBe("SURVIVOR");
  });

  it("lookahead rows killed by leakage", () => {
    const rows: BacktestRow[] = [synRow({ knownAtWeek: 6, outcomeWeek: 5 })];
    // Pad with clean rows so n >= minN; leakage should still kill
    const padded = [...rows, ...cleanRows(120)];
    const res = falsifyBind(padded, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.leakage.verdict).toBe("KILLED");
    expect(res.leakage.detail).toContain("lookahead");
  });

  it("a model with real signal survives shuffle", () => {
    // modelProb deterministically tracks outcome => a genuine, unshuffleable
    // edge => shuffle must PASS (this is the mirror case of the noise test
    // below: the shuffle gate must not kill real signal either).
    const signalRows: BacktestRow[] = [];
    for (let i = 0; i < 120; i++) {
      signalRows.push(synRow({ outcome: i % 3 === 0 ? 1 : 0, modelProb: i % 3 === 0 ? 0.8 : 0.2, marketProb: 0.5 }));
    }
    const res = falsifyBind(signalRows, { minN: 10, shuffleB: 200, seed: 42 });
    expect(res.shuffle.verdict).toBe("PASS");
    expect(res.shuffle.detail).toContain("original effect=");
  });

  it("model opinion uncorrelated with outcome fails shuffle (the bug this regression guards)", () => {
    // Regression test for the CodeRabbit finding: effectSize used to depend only
    // on outcome-vs-market, so permuting row order never changed the statistic and
    // the shuffle gate could never KILL anything. Here modelProb carries a fixed
    // per-row opinion that is genuinely uncorrelated with a seeded-random outcome —
    // a real null case the fixed (model-aware) statistic must be able to reject.
    const rand = mulberry32(2024);
    const noise: BacktestRow[] = [];
    for (let i = 0; i < 150; i++) {
      noise.push(synRow({
        outcome: rand() > 0.5 ? 1 : 0,
        modelProb: i % 2 === 0 ? 0.65 : 0.35,
        marketProb: 0.5,
      }));
    }
    const res = falsifyBind(noise, { minN: 10, shuffleB: 200, seed: 42 });
    expect(res.shuffle.verdict).toBe("KILLED");
    expect(res.shuffle.detail).toContain("original effect=");
  });

  it("sign-flipped second half fails split", () => {
    // effectSize is model-aware: (modelProb - marketProb) * (outcome - marketProb).
    // First 60 rows: model bullish (0.7 vs 0.5) and right (outcome=1) => positive edge.
    // Second 60 rows: model STILL bullish (0.7 vs 0.5) but now wrong (outcome=0) => the
    // edge itself reverses sign, which is what a real split-stability failure looks like.
    const rows: BacktestRow[] = [];
    for (let i = 0; i < 60; i++) rows.push(synRow({ season: 2024, outcome: 1, modelProb: 0.7, marketProb: 0.5, outcomeWeek: i + 1, knownAtWeek: i }));
    for (let i = 0; i < 60; i++) rows.push(synRow({ season: 2025, outcome: 0, modelProb: 0.7, marketProb: 0.5, outcomeWeek: i + 61, knownAtWeek: i + 60 }));
    const res = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.split.verdict).toBe("KILLED");
  });

  it("small n starves", () => {
    const rows = cleanRows(5);
    const res = falsifyBind(rows, { minN: 100, shuffleB: 200, seed: 7 });
    expect(res.overall.verdict).toBe("PARKED");
    expect(res.shuffle.verdict).toBe("PASS");
    expect(res.shuffle.detail).toContain("e=");
    expect(res.overall.reason).toContain("e=");
  });

  it("e-value grows on true signal and decays on noise (deterministic PRNG)", () => {
    // Strong signal rows => multiplicity PASS
    const signal = cleanRows(150).map((r) => ({ ...r, outcome: 1, modelProb: 0.75, marketProb: 0.45 }));
    const sigRes = falsifyBind(signal, { minN: 10, shuffleB: 50, seed: 7 });
    expect(sigRes.multiplicity.verdict).toBe("PASS");

    // Noise => multiplicity KILLED (e decays)
    const rand = mulberry32(1234);
    const noise = cleanRows(150).map((r) => ({ ...r, modelProb: 0.5, marketProb: 0.5, outcome: rand() > 0.5 ? 1 : 0 }));
    const noiseRes = falsifyBind(noise, { minN: 10, shuffleB: 50, seed: 42 });
    expect(noiseRes.multiplicity.verdict).toBe("KILLED");
  });

  it("determinism: same SYNTHETIC input => same output", () => {
    const rows = cleanRows(120);
    const a = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 99 });
    const b = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 99 });
    expect(a.overall.verdict).toBe(b.overall.verdict);
    expect(a.shuffle.detail).toBe(b.shuffle.detail);
  });

  it("small-n dataset with clean gates returns PARKED (not STARVED) and preserves e-value in detail", () => {
    const rows = cleanRows(5);
    const res = falsifyBind(rows, { minN: 100, shuffleB: 200, seed: 7 });
    expect(res.overall.verdict).toBe("PARKED");
    expect(res.overall.reason).toContain("e=");
    // All unrun gates should include preserved e-value
    expect(res.shuffle.detail).toContain("e=");
    expect(res.split.detail).toContain("e=");
    expect(res.multiplicity.detail).toContain("e=");
    // Actual leakage failure must stay KILLED (not PARKED)
    const leakedRows = [synRow({ knownAtWeek: 6, outcomeWeek: 5 }), ...cleanRows(5)];
    const leakRes = falsifyBind(leakedRows, { minN: 100, shuffleB: 50, seed: 7 });
    expect(leakRes.leakage.verdict).toBe("KILLED");
  });

  it("synthetic KNOWN-GOOD edge (strong persistent signal) comes out SURVIVOR", () => {
    const rows: BacktestRow[] = [];
    // 200 rows, 80% outcome=1, split across two seasons. modelProb tracks the
    // per-row outcome (0.75 when outcome=1, 0.30 when outcome=0) so there is
    // genuine model-outcome PAIRING for the shuffle gate to detect — a
    // constant modelProb across every row (the original fixture) makes
    // effectSize invariant to permutation up to floating-point noise only,
    // which is a degenerate tie the shuffle gate can't meaningfully judge.
    for (let season = 2024; season <= 2025; season++) {
      for (let i = 0; i < 100; i++) {
        const outcome = i < 80 ? 1 : 0;
        rows.push({
          season,
          outcomeWeek: (i % 12) + 1,
          knownAtWeek: (i % 12),
          outcome,
          modelProb: outcome === 1 ? 0.75 : 0.30,
          marketProb: 0.45,
        });
      }
    }
    const res = falsifyBind(rows, { minN: 10, shuffleB: 200, seed: 7 });
    expect(res.leakage.verdict).toBe("PASS");
    expect(res.overall.verdict).toBe("SURVIVOR");
  });

  it("synthetic KNOWN-BAD edge (leakage planted) is KILLED by leakage with others PASS/unrun", () => {
    const goodRows = cleanRows(120);
    const badRow = synRow({ knownAtWeek: 10, outcomeWeek: 5 });
    const res = falsifyBind([badRow, ...goodRows], { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.leakage.verdict).toBe("KILLED");
    expect(res.leakage.detail).toContain("lookahead");
    expect(res.overall.verdict).toBe("KILLED");
    expect(res.overall.reason).toContain("lookahead");
  });

});
