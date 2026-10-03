import { describe, expect, it } from "vitest";
import {
  NFL_KEY_NUMBERS,
  NFL_SIGNED_KEY_NUMBERS,
  MIN_SAMPLES_FOR_MARGIN_MIXTURE,
  continuousDensity,
  coverProbability,
  fitNflMarginMixture,
  homeCoverProbability,
  keyMassAt,
  marginsFromTeamGameRecords,
  mixtureCdf,
} from "../margin-mixture-model.js";

/**
 * Synthetic NFL-like home margins: Stern-normal bulk plus extra mass at the
 * classic key numbers. Deterministic — no RNG, no live TeamGameLog I/O.
 */
function nflLikeMargins(): number[] {
  const out: number[] = [];
  // Continuous bulk: integers from −28 to 28 excluding keys, repeated so n is fat.
  for (let m = -28; m <= 28; m++) {
    if ((NFL_SIGNED_KEY_NUMBERS as readonly number[]).includes(m)) continue;
    const copies = 4 + Math.max(0, 8 - Math.abs(m));
    for (let i = 0; i < copies; i++) out.push(m);
  }
  // Extra key-number landings (3 and 7 more common than 6 and 10).
  const extra: Record<number, number> = {
    [-10]: 6,
    [-7]: 14,
    [-6]: 8,
    [-3]: 18,
    3: 18,
    6: 8,
    7: 14,
    10: 6,
  };
  for (const [k, n] of Object.entries(extra)) {
    for (let i = 0; i < n; i++) out.push(Number(k));
  }
  return out;
}

describe("fitNflMarginMixture — mass conservation", () => {
  it("mixture weights integrate to 1 (discrete + continuous)", () => {
    const fit = fitNflMarginMixture(nflLikeMargins());
    expect(fit.verdict).toBe("fitted");
    const disc = fit.keyMasses.reduce((s, km) => s + km.mass, 0);
    expect(disc + fit.continuousWeight).toBeCloseTo(1, 12);
    expect(fit.continuousWeight).toBeGreaterThan(0);
    expect(fit.continuousWeight).toBeLessThan(1);
  });

  it("continuous density Riemann sum plus discrete masses recovers ~1", () => {
    const fit = fitNflMarginMixture(nflLikeMargins());
    expect(fit.verdict).toBe("fitted");
    const lo = -80;
    const hi = 80;
    const dx = 0.05;
    let area = 0;
    for (let x = lo; x <= hi; x += dx) {
      area += continuousDensity(fit, x) * dx;
    }
    const disc = fit.keyMasses.reduce((s, km) => s + km.mass, 0);
    expect(area + disc).toBeCloseTo(1, 2);
  });

  it("CDF at +∞ is 1 and at −∞ is 0", () => {
    const fit = fitNflMarginMixture(nflLikeMargins());
    expect(mixtureCdf(fit, -1e6)).toBeCloseTo(0, 8);
    expect(mixtureCdf(fit, 1e6)).toBeCloseTo(1, 8);
  });
});

describe("fitNflMarginMixture — key-number masses", () => {
  it("places a strictly positive mass at each classic key 3, 7, 6, 10 (both signs)", () => {
    const fit = fitNflMarginMixture(nflLikeMargins());
    expect(fit.verdict).toBe("fitted");
    expect(NFL_KEY_NUMBERS).toEqual([3, 7, 6, 10]);
    for (const k of NFL_SIGNED_KEY_NUMBERS) {
      const km = fit.keyMasses.find((row) => row.margin === k);
      expect(km, `missing mass at ${k}`).toBeTruthy();
      expect(km!.mass).toBeGreaterThan(0);
    }
    // Magnitudes match the classic set — no other discrete locations.
    const mags = new Set(fit.keyMasses.map((km) => Math.abs(km.margin)));
    expect([...mags].sort((a, b) => a - b)).toEqual([3, 6, 7, 10]);
  });

  it("puts more mass on 3 and 7 than on 6 and 10 when the sample does", () => {
    const fit = fitNflMarginMixture(nflLikeMargins());
    expect(keyMassAt(fit, 3)).toBeGreaterThan(keyMassAt(fit, 6));
    expect(keyMassAt(fit, 7)).toBeGreaterThan(keyMassAt(fit, 10));
    expect(keyMassAt(fit, -3)).toBeGreaterThan(keyMassAt(fit, -10));
  });

  it("still keeps unseen keys strictly positive (Laplace floor)", () => {
    const noTens = nflLikeMargins().filter((m) => m !== 10 && m !== -10);
    const fit = fitNflMarginMixture(noTens);
    expect(fit.verdict).toBe("fitted");
    expect(keyMassAt(fit, 10)).toBeGreaterThan(0);
    expect(keyMassAt(fit, -10)).toBeGreaterThan(0);
    expect(fit.keyMasses.find((km) => km.margin === 10)?.count).toBe(0);
  });
});

describe("coverProbability — monotone in the spread", () => {
  it("P(home covers) rises as spreadHome increases (home less favored)", () => {
    const fit = fitNflMarginMixture(nflLikeMargins());
    const spreads = [-14, -10, -7, -3.5, -3, -1, 0, 1, 3, 3.5, 7, 10, 14];
    const probs = spreads.map((s) => homeCoverProbability(fit, s));
    for (const p of probs) {
      expect(p).not.toBeNull();
      expect(p!).toBeGreaterThan(0);
      expect(p!).toBeLessThan(1);
    }
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]!).toBeGreaterThanOrEqual(probs[i - 1]! - 1e-12);
    }
  });

  it("home + away + push sum to 1, and a key-number line has a positive push", () => {
    const fit = fitNflMarginMixture(nflLikeMargins());
    const atThree = coverProbability(fit, -3);
    expect(atThree).not.toBeNull();
    expect(atThree!.home + atThree!.away + atThree!.push).toBeCloseTo(1, 12);
    expect(atThree!.push).toBeGreaterThan(0);
    expect(atThree!.push).toBeCloseTo(keyMassAt(fit, 3), 12);

    const half = coverProbability(fit, -3.5);
    expect(half).not.toBeNull();
    expect(half!.push).toBe(0);
    expect(half!.home + half!.away).toBeCloseTo(1, 12);
  });
});

describe("fitNflMarginMixture — degenerate inputs fail closed", () => {
  it("empty / short samples are insufficient-data, not a fake σ", () => {
    expect(fitNflMarginMixture([]).verdict).toBe("insufficient-data");
    expect(fitNflMarginMixture([]).sigma).toBeNull();
    const short = Array.from({ length: MIN_SAMPLES_FOR_MARGIN_MIXTURE - 1 }, (_, i) => i - 30);
    const r = fitNflMarginMixture(short);
    expect(r.verdict).toBe("insufficient-data");
    expect(r.sigma).toBeNull();
    expect(homeCoverProbability(r, -3)).toBeNull();
  });

  it("non-finite values are dropped before the sample floor", () => {
    const r = fitNflMarginMixture([Number.NaN, Number.POSITIVE_INFINITY, 3, 7]);
    expect(r.verdict).toBe("insufficient-data");
    expect(r.n).toBe(2);
  });

  it("zero-variance leftovers are degenerate, not a cover probability", () => {
    const r = fitNflMarginMixture(new Array(80).fill(3));
    expect(r.verdict).toBe("degenerate");
    expect(r.sigma).toBeNull();
    expect(coverProbability(r, -3)).toBeNull();
  });
});

describe("marginsFromTeamGameRecords — TeamGameLog shape (estimate-phi / team-rates)", () => {
  it("maps teamScore − opponentScore and skips non-finite rows", () => {
    const margins = marginsFromTeamGameRecords([
      { teamScore: 27, opponentScore: 24 },
      { teamScore: 13, opponentScore: 20 },
      { teamScore: Number.NaN, opponentScore: 10 },
    ]);
    expect(margins).toEqual([3, -7]);
    const padded = [
      ...margins,
      ...Array.from({ length: MIN_SAMPLES_FOR_MARGIN_MIXTURE }, (_, i) => (i % 17) - 8),
    ];
    const fit = fitNflMarginMixture(padded);
    expect(fit.verdict).toBe("fitted");
  });
});
