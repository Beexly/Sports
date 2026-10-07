import { describe, it, expect } from "vitest";
import {
  americanToImpliedProbability,
  impliedProbabilityToAmerican,
  averageAmericanPrices,
  boundAmericanPrice,
  removeVig,
  MAX_ABS_AMERICAN_PRICE,
} from "../scoring.js";
import { deriveClosingSnapshotFromOdds, gradePickClv, type ClosingOddsRow } from "../clv-capture.js";

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
    // Still null when a counterpart side is supplied but our side is empty.
    expect(averageAmericanPrices([], [-110, -105])).toBeNull();
  });
});

/**
 * Regression #2 (2026-08-25): averaging WITH-VIG probabilities and converting
 * back is unbounded and hold-weighted. On heavy favourites the mean sits near
 * 1.0 and `impliedProbabilityToAmerican` explodes — recorded lock prices as
 * extreme as −21200 against closes that never leave ±390. `gradePickClv` takes
 * `lockPrice` as-is with no bound, so the artifact lands in the CLV ledger and
 * biases the beat-close rate.
 *
 * The fix is two independent parts, pinned separately below:
 *   (a) de-vig with `removeVig` BEFORE averaging when the counterpart side is
 *       available, so the mean is over fair probabilities, not hold-weighted
 *       ones;
 *   (b) `boundAmericanPrice` — a pathological quote can never be recorded.
 */
describe("averageAmericanPrices — de-vig before averaging + plausibility bound", () => {
  it("a heavy-favourite book set can no longer be recorded as an absurd price", () => {
    // Books quoting a lock: the old path returned impliedProbabilityToAmerican
    // of the with-vig mean, unbounded — magnitudes in the tens of thousands.
    const favourite = [-21200, -18000, -25000];
    const dog = [4200, 3600, 5000];

    const naiveOldPath = impliedProbabilityToAmerican(
      favourite.reduce((s, p) => s + americanToImpliedProbability(p), 0) / favourite.length,
    );
    // Prove the old path really did produce an implausible price.
    expect(Math.abs(naiveOldPath)).toBeGreaterThan(MAX_ABS_AMERICAN_PRICE);

    const avg = averageAmericanPrices(favourite, dog)!;
    expect(Math.abs(avg)).toBeLessThanOrEqual(MAX_ABS_AMERICAN_PRICE);
    expect(avg).toBeLessThan(0); // still a favourite — the sign is not lost
    // And the single-sided path (no counterpart to de-vig against) is bounded too.
    expect(Math.abs(averageAmericanPrices(favourite)!)).toBeLessThanOrEqual(
      MAX_ABS_AMERICAN_PRICE,
    );
  });

  it("boundAmericanPrice clamps magnitude and rejects non-finite input", () => {
    expect(boundAmericanPrice(-99999900)).toBe(-MAX_ABS_AMERICAN_PRICE);
    expect(boundAmericanPrice(99999900)).toBe(MAX_ABS_AMERICAN_PRICE);
    expect(boundAmericanPrice(-390)).toBe(-390);
    expect(boundAmericanPrice(Number.NaN)).toBe(-MAX_ABS_AMERICAN_PRICE);
  });

  it("two books with KNOWN, DIFFERENT vig: the mean is over fair probabilities", () => {
    // Book A: -110 / -110 → implied 0.52381 / 0.52381, hold 1.047619, fair 0.5
    // Book B: -400 / +250 → implied 0.8     / 0.285714, hold 1.085714, fair 0.736842
    const side = [-110, -400];
    const counterpart = [-110, 250];

    const fairA = removeVig(
      americanToImpliedProbability(-110),
      americanToImpliedProbability(-110),
    ).home;
    const fairB = removeVig(
      americanToImpliedProbability(-400),
      americanToImpliedProbability(250),
    ).home;
    expect(fairA).toBeCloseTo(0.5, 10);
    expect(fairB).toBeCloseTo(0.736842, 6);

    // Averaged in FAIR space, then returned to the market scale at the mean
    // observed hold: mean fair 0.618421 × mean hold 1.066667 = 0.659649 → -194.
    expect(averageAmericanPrices(side, counterpart)).toBe(-194);

    // The old with-vig mean is hold-weighted: it over-weights the higher-hold
    // book and quotes the favourite SHORTER than the fair consensus supports.
    const withVigMean = impliedProbabilityToAmerican(
      (americanToImpliedProbability(-110) + americanToImpliedProbability(-400)) / 2,
    );
    expect(withVigMean).toBe(-196);
    expect(averageAmericanPrices(side, counterpart)!).toBeGreaterThan(withVigMean);
  });

  it("a single book round-trips exactly: de-vig → average → re-vig adds no distortion", () => {
    // n=1 has no hold-weighting to correct, so the consensus IS that book's
    // price. This pins that the fair-space detour is exact, not lossy — the
    // guarantee that lets the two-book case above be read as a real correction.
    expect(averageAmericanPrices([-400], [250])).toBe(-400);
    expect(averageAmericanPrices([-110], [-110])).toBe(-110);
    expect(averageAmericanPrices([250], [-400])).toBe(250);
  });

  it("a lone pathological quote cannot reach gradePickClv as a lock price", () => {
    const close = {
      spreadHome: null,
      total: null,
      mlHomePrice: -390,
      mlAwayPrice: 310,
      capturedAt: COMMENCE,
      bookmakerCount: 2,
    };
    const gradeAt = (lockPrice: number) =>
      gradePickClv({
        pickType: "MONEYLINE",
        selection: "Home Team",
        homeTeamName: "Home Team",
        awayTeamName: "Away Team",
        lockLine: null,
        lockPrice,
        close,
      })!;

    const lock = averageAmericanPrices([-21200], [4200])!;
    // The guarantee: whatever the books said, what gets RECORDED is a price.
    expect(Math.abs(lock)).toBeLessThanOrEqual(MAX_ABS_AMERICAN_PRICE);
    expect(lock).toBe(-MAX_ABS_AMERICAN_PRICE);

    // And the ledger entry it produces is strictly less distorted than the
    // unbounded artifact the old path recorded (-21200 vs a -390 close).
    expect(Math.abs(gradeAt(lock).value)).toBeLessThan(Math.abs(gradeAt(-21200).value));
    expect(Number.isFinite(gradeAt(lock).value)).toBe(true);
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
