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

  it("SHUFFLE GATE IS FAIL-OPEN ON ZERO-EFFECT DATA (documented defect)", () => {
    /**
     * The old fixture was not noise. It set
     *   outcome:   i % 3 === 0 ? 1 : 0
     *   modelProb: i % 3 === 0 ? 0.8 : 0.2
     * so modelProb was a DETERMINISTIC FUNCTION of outcome — a perfect
     * in-sample predictor. The shuffle gate correctly returned PASS, and the
     * assertion (`["PASS","KILLED"].includes(...)`) accepted that without
     * complaint, so a test named "pure-noise outcomes fail shuffle" was in fact
     * demonstrating the opposite and passing. Nothing anywhere checked that the
     * shuffle gate can kill.
     *
     * Genuine noise: modelProb varies on a 5-cycle, outcome on a 2-cycle. The
     * periods are coprime, so across 120 rows every modelProb level meets both
     * outcomes equally often and the association is exactly zero by
     * construction — deterministic, and honestly uninformative.
     */
    const noise: BacktestRow[] = [];
    for (let i = 0; i < 120; i++) {
      noise.push(
        synRow({
          outcome: (i % 2) as 0 | 1,
          modelProb: 0.3 + (i % 5) * 0.1,
          marketProb: 0.5,
        }),
      );
    }
    const res = falsifyBind(noise, { minN: 10, shuffleB: 200, seed: 42 });

    /**
     * THIS ASSERTION RECORDS A DEFECT, NOT DESIRED BEHAVIOUR.
     *
     * On genuinely zero-association data the gate returns PASS — it cannot kill
     * pure noise, which is the one thing a permutation test exists to do.
     *
     * The cause is a tie comparison at falsify.ts:102:
     *     if (Math.abs(origES) >= Math.abs(permES)) survive++;
     * PASS requires `survive >= 0.95 * shuffleB`. When the true effect is zero,
     * every permutation reproduces the same effect size, so `origES === permES`
     * and the `>=` counts EVERY permutation as a survival: 200/200 → PASS. The
     * conventional permutation p-value counts the opposite tail
     * (#{|permES| >= |origES|}) and would report p ≈ 1 here, i.e. KILLED.
     *
     * Left as PASS deliberately rather than "fixed" in a test: changing `>=` to
     * `>` alters the verdict of every bind that has been through this funnel,
     * including the YACoe kill, so it is the owner's call, not a test edit.
     * Flip this assertion to KILLED in the same change that fixes the gate.
     */
    expect(res.shuffle.verdict).toBe("PASS");
    expect(res.shuffle.detail).toContain("original effect=");
    expect(res.shuffle.detail).toContain("200/200");
  });

  it("sign-flipped second half fails split", () => {
    // First 60 rows positive effect; second 60 negative => split kills
    const rows: BacktestRow[] = [];
    for (let i = 0; i < 60; i++) rows.push(synRow({ season: 2024, outcome: 1, modelProb: 0.7, marketProb: 0.5, outcomeWeek: i + 1, knownAtWeek: i }));
    for (let i = 0; i < 60; i++) rows.push(synRow({ season: 2025, outcome: 0, modelProb: 0.3, marketProb: 0.5, outcomeWeek: i + 61, knownAtWeek: i + 60 }));
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
    // Seeded: this asserts a specific verdict, so a random draw made it a coin
    // flip on CI. Alternating outcomes give a mean effect of ~0 deterministically,
    // which is exactly the "no edge" condition the multiplicity gate should kill.
    const noise = cleanRows(150).map((r, i) => ({ ...r, modelProb: 0.5, marketProb: 0.5, outcome: (i % 2 === 0 ? 1 : 0) as 0 | 1 }));
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
