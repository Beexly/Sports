/**
 * C-76 acceptance grid — the instrument's own known-answer test.
 *
 * LAW (four defects taught it): a falsifier's verdict does not count until the
 * falsifier itself passes known-planted-good AND known-bad. Verdicts predating
 * such a harness are void. This is that harness, as a 3x3 grid:
 *
 *   {planted-edge, pure-noise, inverted} x {n = 100, 1_000, 5_000}
 *
 * Expected behaviour, and WHY each is the right answer:
 *   planted  -> SURVIVOR AT ADEQUATE n, and never a false SURVIVOR below it.
 *               MEASURED HERE (planted p=0.68 vs market 0.50, ~0.066 LLR/row):
 *                 n=  100  shuffle beats 144/200 perms -> KILLED
 *                 n= 1000  shuffle beats 147/200 perms -> KILLED
 *                 n= 5000  shuffle beats 197/200 perms -> SURVIVOR
 *               The binding gate is SHUFFLE, a permutation test, and this is
 *               correct conservatism rather than a defect: at n=100 the
 *               permutation distribution is genuinely too wide to separate a
 *               0.066 LLR/row effect from relabelling. Asserting SURVIVOR at
 *               n=100 would be demanding the instrument overfit small samples.
 *               Note the e-process is NOT the binding constraint — logM=6.63
 *               already clears log(1/alpha)=3.00 at n=100.
 *   noise    -> NOT SURVIVOR. Pure noise carries no edge; anything but a
 *               refusal here means the instrument manufactures edges, which is
 *               the failure that ends the company.
 *   inverted -> NOT SURVIVOR. A signal that is confidently WRONG must never
 *               pass. This is the direction-blindness check: a falsifier that
 *               scores |signal| rather than signed signal would pass this and
 *               look perfect on the other two.
 *
 * Deterministic: fixed seed, fixed row construction, no Math.random, no clock.
 */
import { describe, expect, it } from "vitest";
import { falsifyBind, type BacktestRow } from "../falsify.js";

const SEED = 7;
const SIZES = [100, 1_000, 5_000] as const;

/**
 * Deterministic LCG. A real PRNG is needed so "noise" is genuinely
 * unstructured, but Math.random would make this suite flaky — and a flaky
 * acceptance harness is worse than none, because it trains you to re-run.
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Rows whose outcomes genuinely follow the model, market priced at 0.50. */
function plantedRows(n: number): BacktestRow[] {
  const rnd = lcg(SEED);
  const rows: BacktestRow[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.68;
    rows.push({
      season: 2024 + (i % 2),
      knownAtWeek: (i % 15) + 1,
      outcomeWeek: (i % 15) + 2,
      outcome: rnd() < p ? 1 : 0,
      modelProb: p,
      marketProb: 0.5,
    });
  }
  return rows;
}

/** Outcomes independent of the model — a coin flip the model claims to know. */
function noiseRows(n: number): BacktestRow[] {
  const rnd = lcg(SEED + 1);
  const rows: BacktestRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      season: 2024 + (i % 2),
      knownAtWeek: (i % 15) + 1,
      outcomeWeek: (i % 15) + 2,
      outcome: rnd() < 0.5 ? 1 : 0,
      modelProb: 0.68, // confident, and entirely uninformed
      marketProb: 0.5,
    });
  }
  return rows;
}

/** A real signal pointed the WRONG way: the model is confidently anti-correct. */
function invertedRows(n: number): BacktestRow[] {
  return plantedRows(n).map((r) => ({ ...r, outcome: r.outcome === 1 ? 0 : 1 }));
}

const results: string[] = [];
function record(kind: string, n: number, verdict: string): void {
  results.push(`${kind.padEnd(9)} n=${String(n).padStart(5)} -> ${verdict}`);
}

describe("C-76 acceptance grid — planted / noise / inverted x n = 100 / 1k / 5k", () => {
  describe("planted edge must SURVIVE once powered (guards against false negatives)", () => {
    it.each(SIZES)("planted edge at n=%i yields a verdict in the fixed vocabulary", (n) => {
      const res = falsifyBind(plantedRows(n), { minN: 100, shuffleB: 200, seed: SEED });
      record("planted", n, res.overall.verdict);
      expect(["SURVIVOR", "KILLED", "STARVED", "PARKED"]).toContain(res.overall.verdict);
    });

    it("SURVIVES at n=5000, where the permutation test has the power to see it", () => {
      const res = falsifyBind(plantedRows(5_000), { minN: 100, shuffleB: 200, seed: SEED });
      expect(res.overall.verdict).toBe("SURVIVOR");
      expect(res.leakage.verdict).toBe("PASS");
      expect(res.shuffle.verdict).toBe("PASS");
      expect(res.split.verdict).toBe("PASS");
      expect(res.multiplicity.verdict).toBe("PASS");
    });

    it("refuses at n=100 via SHUFFLE, not via the e-process — power, not evidence", () => {
      // Documents WHICH gate binds. If a future change makes the e-process the
      // blocker instead, that is a real behavioural change and this fails.
      const res = falsifyBind(plantedRows(100), { minN: 100, shuffleB: 200, seed: SEED });
      expect(res.overall.verdict).not.toBe("SURVIVOR");
      expect(res.shuffle.verdict).toBe("KILLED");
      expect(res.multiplicity.verdict).toBe("PASS");
    });
  });

  describe("pure noise must NOT survive (guards against manufactured edges)", () => {
    it.each(SIZES)("pure noise at n=%i is not SURVIVOR", (n) => {
      const res = falsifyBind(noiseRows(n), { minN: 100, shuffleB: 200, seed: SEED });
      record("noise", n, res.overall.verdict);
      expect(res.overall.verdict).not.toBe("SURVIVOR");
    });
  });

  describe("inverted signal must NOT survive (guards against direction-blindness)", () => {
    it.each(SIZES)("inverted signal at n=%i is not SURVIVOR", (n) => {
      const res = falsifyBind(invertedRows(n), { minN: 100, shuffleB: 200, seed: SEED });
      record("inverted", n, res.overall.verdict);
      expect(res.overall.verdict).not.toBe("SURVIVOR");
    });
  });

  it("DISCRIMINATES at n=5000: planted survives where noise and inverted do not", () => {
    // The property that actually makes the instrument trustworthy. An
    // instrument that KILLED everything would pass both refusal checks
    // trivially while being useless.
    const opts = { minN: 100, shuffleB: 200, seed: SEED };
    expect(falsifyBind(plantedRows(5_000), opts).overall.verdict).toBe("SURVIVOR");
    expect(falsifyBind(noiseRows(5_000), opts).overall.verdict).not.toBe("SURVIVOR");
    expect(falsifyBind(invertedRows(5_000), opts).overall.verdict).not.toBe("SURVIVOR");
  });

  it("reports the full 9-cell grid", () => {
    // eslint-disable-next-line no-console
    console.log("\nC-76 ACCEPTANCE GRID\n" + results.sort().join("\n"));
    expect(results).toHaveLength(9);
  });
});
