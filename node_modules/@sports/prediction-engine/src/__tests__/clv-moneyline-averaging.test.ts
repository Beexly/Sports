import { describe, it, expect } from "vitest";
import {
  americanToImpliedProbability,
  impliedProbabilityToAmerican,
  averageAmericanPrices,
} from "../scoring.js";
import { deriveClosingSnapshotFromOdds, type ClosingOddsRow } from "../clv-capture.js";

/**
 * Regression: moneyline prices must be averaged in PROBABILITY space.
 *
 * Adversarial-review finding (money-paths agent, 2026-07-11): the closing
 * snapshot and the pick lock both averaged raw American prices across books.
 * American odds are discontinuous across ±100, so averaging books that
 * straddle pick'em yields a non-price near 0 that maps to ~0.98 implied
 * probability — fabricating a ~40-point CLV swing and a bogus BEAT/LOST
 * verdict that feeds the ESTABLISHED pricing-phase gate and the Elite CLV
 * ledger. These pins prove the discontinuity can no longer poison CLV.
 */

const COMMENCE = new Date("2026-04-15T18:00:00Z");
const t = (iso: string) => new Date(iso);
function h2h(homePrice: number, awayPrice: number, fetchedAt: Date): ClosingOddsRow {
  return { market: "H2H", spread: null, total: null, homePrice, awayPrice, fetchedAt };
}

describe("american <-> implied round-trips", () => {
  it("inverse is exact on real prices away from the pick'em degeneracy", () => {
    // +100 and -100 both encode 0.5 implied, so the inverse canonicalizes the
    // pair to -100 — probability-preserving, not string-preserving.
    for (const price of [-350, -150, -110, 120, 250, 600]) {
      const back = impliedProbabilityToAmerican(americanToImpliedProbability(price));
      expect(back).toBe(price);
    }
  });

  it("pick'em: +100 and -100 are the same probability and canonicalize together", () => {
    expect(americanToImpliedProbability(100)).toBe(0.5);
    expect(americanToImpliedProbability(-100)).toBe(0.5);
    expect(impliedProbabilityToAmerican(0.5)).toBe(-100);
    expect(Number.isFinite(impliedProbabilityToAmerican(0))).toBe(true);
    expect(Number.isFinite(impliedProbabilityToAmerican(1))).toBe(true);
  });
});

describe("averageAmericanPrices — probability-space averaging", () => {
  it("books straddling pick'em do NOT produce a near-zero non-price", () => {
    // Naive American-space avg([-102, +105]) = +2 → implied ~0.98 (the bug).
    const avg = averageAmericanPrices([-102, 105])!;
    const implied = americanToImpliedProbability(avg);
    // True mean implied of -102 and +105: (0.5049 + 0.4878) / 2 ≈ 0.4964.
    expect(implied).toBeGreaterThan(0.48);
    expect(implied).toBeLessThan(0.52);
    // And nowhere near the fabricated 0.98 the old path produced.
    expect(implied).toBeLessThan(0.6);
  });

  it("agrees with naive averaging when all books are on the same side of 100", () => {
    // Two clear favorites: prob-space mean is close to American-space mean here.
    const avg = averageAmericanPrices([-150, -170])!;
    const implied = americanToImpliedProbability(avg);
    const trueMean =
      (americanToImpliedProbability(-150) + americanToImpliedProbability(-170)) / 2;
    expect(Math.abs(implied - trueMean)).toBeLessThan(0.005);
  });

  it("returns null for an empty set", () => {
    expect(averageAmericanPrices([])).toBeNull();
  });
});

describe("deriveClosingSnapshotFromOdds — ML close is prob-averaged", () => {
  it("a straddling closing batch yields a sane ML close, not a ±0.98 artifact", () => {
    const rows = [
      h2h(-104, 102, t("2026-04-15T17:50:00Z")),
      h2h(101, -103, t("2026-04-15T17:50:00Z")),
    ];
    const snap = deriveClosingSnapshotFromOdds(rows, COMMENCE);
    expect(snap.mlHomePrice).not.toBeNull();
    const homeImplied = americanToImpliedProbability(snap.mlHomePrice!);
    expect(homeImplied).toBeGreaterThan(0.45);
    expect(homeImplied).toBeLessThan(0.55);
  });
});
