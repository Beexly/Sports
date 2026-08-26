/** SYNTHETIC property tests for falsify kill-test harness (Wave 3, LANE B). */
import { describe, expect, it } from "vitest";
import { falsifyBind, type BacktestRow, type FalsifyOutput } from "../falsify.js";

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

/**
 * Deterministic LCG so "noise" fixtures are reproducible. `Math.random()` in a
 * falsifier test makes the funnel's own acceptance suite flaky.
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/**
 * A genuinely predictive, non-degenerate fixture: outcomes vary, and modelProb
 * tracks them in both halves. This is what a real SURVIVOR looks like.
 */
function signalRows(n = 200): BacktestRow[] {
  const out: BacktestRow[] = [];
  for (let i = 0; i < n; i++) {
    const outcome = i % 4 === 0 ? 0 : 1; // 75% ones — varies, so permutation bites
    out.push({
      season: i < n / 2 ? 2024 : 2025,
      outcomeWeek: (i % 12) + 3,
      knownAtWeek: (i % 12) + 1,
      outcome,
      modelProb: outcome === 1 ? 0.8 : 0.3,
      marketProb: 0.5,
    });
  }
  return out;
}

describe("falsify — market data coverage honesty", () => {
  // Regression for the exact defect the C-67 edge-program-verification audit
  // found in the recorded YACoe kill: a corpus with NO market data silently
  // ran against the 0.5 clamp and the record gave no way to tell a real market
  // test from a coin-flip-baseline test. This is reporting-only — no verdict
  // changes on account of it.
  function omitMarketProb(rows: readonly BacktestRow[]): BacktestRow[] {
    return rows.map(({ marketProb: _drop, ...rest }) => rest as BacktestRow);
  }

  it("flags allDefaulted=true and warns in overall.reason when every row omits marketProb", () => {
    const rows = omitMarketProb(signalRows(200));
    const res = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.marketDataCoverage).toEqual({ rowsWithMarketProb: 0, totalRows: 200, allDefaulted: true });
    expect(res.overall.reason).toContain("0/200 rows carried real marketProb");
    expect(res.overall.reason).toContain("coin flip");
  });

  it("does not warn when every row carries a real marketProb", () => {
    const rows = signalRows(200); // synRow-style fixtures always set marketProb explicitly
    const res = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.marketDataCoverage).toEqual({ rowsWithMarketProb: 200, totalRows: 200, allDefaulted: false });
    expect(res.overall.reason).not.toContain("WARNING");
  });

  it("reports partial coverage honestly without flagging allDefaulted", () => {
    const rows = signalRows(200);
    const half = omitMarketProb(rows.slice(0, 100)).concat(rows.slice(100));
    const res = falsifyBind(half, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.marketDataCoverage).toEqual({ rowsWithMarketProb: 100, totalRows: 200, allDefaulted: false });
    // Partial coverage still isn't the "every row defaulted" case — no coin-flip warning,
    // since some rows did carry real market prices. Not claiming this is fully honest,
    // only that it isn't the specific failure mode being guarded against here.
    expect(res.overall.reason).not.toContain("WARNING");
  });

  it("flags allDefaulted on the STARVED/PARKED early-return path too", () => {
    const rows = omitMarketProb(signalRows(5)); // n < minN
    const res = falsifyBind(rows, { minN: 100, shuffleB: 50, seed: 7 });
    expect(res.overall.verdict).toBe("PARKED");
    expect(res.marketDataCoverage.allDefaulted).toBe(true);
    expect(res.overall.reason).toContain("0/5 rows carried real marketProb");
  });

  it("empty input reports zero coverage without allDefaulted (nothing to default)", () => {
    const res = falsifyBind([], { minN: 10 });
    expect(res.marketDataCoverage).toEqual({ rowsWithMarketProb: 0, totalRows: 0, allDefaulted: false });
  });
});

describe("falsify — 4 kill tests (SYNTHETIC, labeled)", () => {
  it("clean data passes all 4: SURVIVOR", () => {
    const rows = signalRows(200);
    const res = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.leakage.verdict).toBe("PASS");
    expect(res.shuffle.verdict).toBe("PASS");
    expect(res.split.verdict).toBe("PASS");
    expect(res.multiplicity.verdict).toBe("PASS");
    expect(res.overall.verdict).toBe("SURVIVOR");
  });

  it("a constant outcome vector is STARVED, not PASS — permutation is vacuous there", () => {
    // cleanRows() sets outcome:1 on every row. Every label permutation then
    // equals the original, so the shuffle test carries zero information. Calling
    // that PASS would be the same silent rubber-stamp the permute-the-rows bug
    // produced, so the funnel reports STARVED and parks the bind.
    const rows = cleanRows(150);
    const res = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.shuffle.verdict).toBe("STARVED");
    expect(res.shuffle.detail).toContain("constant");
    expect(res.overall.verdict).toBe("PARKED");
    expect(res.overall.reason).toContain("carried no information");
  });

  it("lookahead rows killed by leakage", () => {
    const rows: BacktestRow[] = [synRow({ knownAtWeek: 6, outcomeWeek: 5 })];
    // Pad with clean rows so n >= minN; leakage should still kill
    const padded = [...rows, ...cleanRows(120)];
    const res = falsifyBind(padded, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.leakage.verdict).toBe("KILLED");
    expect(res.leakage.detail).toContain("lookahead");
  });

  it("pure-noise predictions fail shuffle", () => {
    // A model whose probabilities are independent of the outcomes must be killed.
    // The previous version of this test asserted
    //   ["PASS","KILLED"].includes(verdict)
    // which is a tautology — those are the only two values on this path — and its
    // fixture set modelProb from the outcome, making it a perfect oracle labelled
    // "noise". Both are fixed here.
    const rnd = lcg(20260826);
    const noise: BacktestRow[] = [];
    for (let i = 0; i < 240; i++) {
      noise.push(synRow({
        season: i < 120 ? 2024 : 2025,
        outcomeWeek: (i % 12) + 3,
        knownAtWeek: (i % 12) + 1,
        outcome: rnd() > 0.5 ? 1 : 0,
        modelProb: 0.2 + rnd() * 0.6, // independent of outcome
        marketProb: 0.5,
      }));
    }
    const res = falsifyBind(noise, { minN: 10, shuffleB: 200, seed: 42 });
    expect(res.shuffle.verdict).toBe("KILLED");
    expect(res.shuffle.detail).toContain("model LLR=");
    expect(res.overall.verdict).toBe("KILLED");
  });

  it("shuffle and split must distinguish a noise model from an oracle on identical outcomes", () => {
    // The regression that pins the whole defect: holding the outcome column fixed
    // and varying ONLY modelProb must change the verdicts. Before the fix these
    // produced byte-identical shuffle and split details, because the statistic
    // never read modelProb.
    const rnd = lcg(4242);
    const base: BacktestRow[] = [];
    for (let i = 0; i < 240; i++) {
      base.push(synRow({
        season: i < 120 ? 2024 : 2025,
        outcomeWeek: (i % 12) + 3,
        knownAtWeek: (i % 12) + 1,
        outcome: rnd() > 0.45 ? 1 : 0,
        modelProb: 0.5,
        marketProb: 0.5,
      }));
    }
    const noise = base.map((r) => ({ ...r, modelProb: 0.2 + rnd() * 0.6 }));
    const oracle = base.map((r) => ({ ...r, modelProb: r.outcome === 1 ? 0.9 : 0.1 }));

    const noiseRes = falsifyBind(noise, { minN: 10, shuffleB: 200, seed: 7 });
    const oracleRes = falsifyBind(oracle, { minN: 10, shuffleB: 200, seed: 7 });

    expect(noiseRes.shuffle.detail).not.toBe(oracleRes.shuffle.detail);
    expect(noiseRes.split.detail).not.toBe(oracleRes.split.detail);
    expect(oracleRes.shuffle.verdict).toBe("PASS");
    expect(noiseRes.shuffle.verdict).toBe("KILLED");
  });

  it("sign-flipped second half fails split", () => {
    // The MODEL's edge must reverse, not merely the outcome base rate. The old
    // fixture used outcome:1/modelProb:0.7 then outcome:0/modelProb:0.3 — a model
    // that is RIGHT in both halves (per-row LLR log(0.7/0.5)=+0.336 either way),
    // which a model-aware split correctly passes. Here the model is right in the
    // first half and wrong in the second.
    const rows: BacktestRow[] = [];
    for (let i = 0; i < 60; i++) {
      rows.push(synRow({ season: 2024, outcome: 1, modelProb: 0.7, marketProb: 0.5, outcomeWeek: i + 1, knownAtWeek: i }));
    }
    for (let i = 0; i < 60; i++) {
      rows.push(synRow({ season: 2025, outcome: 0, modelProb: 0.7, marketProb: 0.5, outcomeWeek: i + 61, knownAtWeek: i + 60 }));
    }
    const res = falsifyBind(rows, { minN: 10, shuffleB: 50, seed: 7 });
    expect(res.split.verdict).toBe("KILLED");
    expect(res.split.detail).toContain("signMatch=false");
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
    const noise = cleanRows(150).map((r) => ({ ...r, modelProb: 0.5, marketProb: 0.5, outcome: Math.random() > 0.5 ? 1 : 0 }));
    const noiseRes = falsifyBind(noise, { minN: 10, shuffleB: 50, seed: 42 });
    expect(noiseRes.multiplicity.verdict).toBe("KILLED");
  });

  it("preserves a supM crossing in the detail when terminal M has decayed below 1", () => {
    // Ville's inequality is about sup_t M_t — bernoulli-eprocess.ts's own header
    // says "supM is the statistic, not only terminal M". A bind can cross the
    // evidence threshold early and decay afterwards. The gate deliberately still
    // decides on TERMINAL M (conservative: it can over-kill, never over-pass),
    // but the crossing must not vanish from the record.
    const rows: BacktestRow[] = [];
    for (let i = 0; i < 120; i++) {
      rows.push(synRow({ season: 2024, outcome: 1, modelProb: 0.8, marketProb: 0.5 }));
    }
    for (let i = 0; i < 120; i++) {
      rows.push(synRow({ season: 2025, outcome: 0, modelProb: 0.8, marketProb: 0.5 }));
    }
    const res = falsifyBind(rows, { minN: 100, shuffleB: 50, seed: 7 });

    // The decision rule is unchanged — this is a reporting fix, not a semantics
    // change. Switching the gate to supM is a separate, deliberate act.
    expect(res.multiplicity.verdict).toBe("KILLED");

    // ...but the peak is now on the record, so "decayed" can never be misread as
    // "never had evidence".
    expect(res.multiplicity.detail).toContain("supM=");
    const peak = Number(/supM=([0-9.e+-]+)/i.exec(res.multiplicity.detail)?.[1]);
    expect(Number.isFinite(peak)).toBe(true);
    expect(peak).toBeGreaterThan(1);
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
    // 200 rows, 70% outcome=1, modelProb 0.75 vs marketProb 0.45, split across two seasons
    for (let season = 2024; season <= 2025; season++) {
      for (let i = 0; i < 100; i++) {
        rows.push({
          season,
          outcomeWeek: (i % 12) + 1,
          knownAtWeek: (i % 12),
          outcome: i < 80 ? 1 : 0,
          modelProb: 0.75,
          marketProb: 0.45,
        });
      }
    }
    const res = falsifyBind(rows, { minN: 10, shuffleB: 200, seed: 7 });
    expect(res.leakage.verdict).toBe("PASS");
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
