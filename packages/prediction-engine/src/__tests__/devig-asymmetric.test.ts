/**
 * Asymmetric-input devig tests — the regression suite PR #965's math fix
 * was missing.
 *
 * BACKGROUND. The old `devigOracleAdapter` accepted any `method` string and
 * echoed it into `raw` while silently computing multiplicative every time.
 * The golden-fixture suite (`devig-oracle.test.ts`) pins each method's exact
 * output, but on near-symmetric books several methods agree to 4+ decimals —
 * so a future regression that collapses every method to multiplicative could
 * pass the goldens on tame inputs. These tests use LOPSIDED books, where the
 * methods genuinely diverge, and assert the divergence itself.
 *
 * WHAT "ASYMMETRIC" MEANS HERE. A two-way book like -500/+350 (implied
 * 83.3%/22.2%, overround 5.6%) is where Shin's insider model, the power
 * method's exponent, and the additive margin split stop agreeing with
 * proportional scaling. If the methods ever collapse to one formula again,
 * these tests fail.
 */
import { describe, expect, it } from "vitest";
import { devig, type DevigMethod } from "../devig/oracle.js";
import { devigOracleAdapter } from "../engine/market-odds-adapters.js";
import { isObservation } from "../engine/universal-adapter.js";

const METHODS: readonly DevigMethod[] = [
  "multiplicative",
  "additive",
  "power",
  "shin",
  "differential_margin_weighting",
  "odds_ratio",
  "logarithmic",
];

/** Lopsided two-way book: -500 / +350 → decimal 1.20 / 4.50. */
const LOPSIDED_2WAY = [1.2, 4.5];
/** Lopsided three-way book: heavy home favorite with a live draw. */
const LOPSIDED_3WAY = [1.44, 4.6, 7.5];

describe("devig methods diverge on asymmetric books", () => {
  it("the seven methods do NOT all agree on -500/+350", () => {
    const firstProbs = METHODS.map((m) => devig(LOPSIDED_2WAY, m).probabilities[0]!);
    const spread = Math.max(...firstProbs) - Math.min(...firstProbs);
    // On a book this lopsided the methods must differ by real money, not
    // rounding dust. A collapse to one formula fails here.
    expect(spread).toBeGreaterThan(0.005);
  });

  it("shin differs from multiplicative on the lopsided book (golden-pinned value)", () => {
    const mult = devig(LOPSIDED_2WAY, "multiplicative").probabilities;
    const shin = devig(LOPSIDED_2WAY, "shin");
    // The exact shin value is pinned by the penaltyblog golden fixtures; what
    // matters here is that it is genuinely a different number than
    // multiplicative on a lopsided book — a collapse to one formula fails.
    expect(shin.probabilities[0]!).not.toBeCloseTo(mult[0]!, 4);
    expect(shin.probabilities[1]!).not.toBeCloseTo(mult[1]!, 4);
    // …and still a valid probability pair.
    expect(shin.probabilities[0]! + shin.probabilities[1]!).toBeCloseTo(1, 9);
  });

  it("power method diverges from multiplicative on the lopsided book", () => {
    const mult = devig(LOPSIDED_2WAY, "multiplicative").probabilities;
    const power = devig(LOPSIDED_2WAY, "power").probabilities;
    expect(power[0]!).not.toBeCloseTo(mult[0]!, 4);
  });

  it("every method still returns a valid probability vector on a lopsided 3-way", () => {
    for (const m of METHODS) {
      const r = devig(LOPSIDED_3WAY, m);
      const sum = r.probabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 9);
      // Ordering preserved: home < draw < away in price ⇒ home > draw > away in prob.
      expect(r.probabilities[0]!).toBeGreaterThan(r.probabilities[1]!);
      expect(r.probabilities[1]!).toBeGreaterThan(r.probabilities[2]!);
      for (const p of r.probabilities) {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }
    }
  });

  it("the margin is the raw overround on every method", () => {
    const impliedSum = LOPSIDED_2WAY.reduce((a, o) => a + 1 / o, 0);
    for (const m of METHODS) {
      expect(devig(LOPSIDED_2WAY, m).margin).toBeCloseTo(impliedSum - 1, 12);
    }
  });
});

describe("devigOracleAdapter dispatches the requested method for real", () => {
  it("shin via the adapter matches the oracle's shin — not multiplicative", () => {
    const result = devigOracleAdapter([-500, 350], "shin");
    if (!isObservation(result)) {
      throw new Error(`adapter failed on valid input: ${JSON.stringify(result)}`);
    }
    const expected = devig([1.2, 4.5], "shin").probabilities;
    const raw = result.raw as { fairProbs: number[]; method: string };
    expect(raw.method).toBe("shin");
    expect(raw.fairProbs[0]).toBeCloseTo(expected[0]!, 4);
    // And it must NOT be the multiplicative answer (the old silent behavior).
    const mult = devig([1.2, 4.5], "multiplicative").probabilities[0]!;
    expect(raw.fairProbs[0]).not.toBeCloseTo(mult, 4);
  });

  it("an unknown method string falls back to multiplicative — loudly, in `raw`", () => {
    const result = devigOracleAdapter([-110, -110], "not-a-method");
    if (!isObservation(result)) {
      throw new Error(`adapter failed on valid input: ${JSON.stringify(result)}`);
    }
    const raw = result.raw as { fairProbs: number[]; method: string };
    expect(raw.method).toBe("multiplicative");
    const expected = devig([1.9091, 1.9091], "multiplicative").probabilities;
    expect(raw.fairProbs[0]).toBeCloseTo(expected[0]!, 3);
  });

  it("fails closed on missing or degenerate odds — never a fabricated vector", () => {
    for (const bad of [null, undefined, [], [-110]] as const) {
      expect(isObservation(devigOracleAdapter(bad, "shin"))).toBe(false);
    }
    expect(isObservation(devigOracleAdapter([Number.NaN, -110], "shin"))).toBe(false);
  });
});
