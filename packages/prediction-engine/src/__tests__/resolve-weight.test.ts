import { describe, it, expect } from "vitest";
import { resolveWeight, CATEGORY_PRIORS } from "../signal-ledger-populator.js";
import { composeLedger } from "../signal-ledger.js";

describe("resolveWeight — the flat-1.0 substitution and its traps", () => {
  const HEALTH_PRIOR = CATEGORY_PRIORS["HEALTH"]!.weight;

  it("returns the category prior when no measured table is supplied", () => {
    expect(resolveWeight("injury.availability", "HEALTH")).toEqual({
      weight: HEALTH_PRIOR,
      source: "prior-unmeasured",
    });
    // Omitting the table must be byte-identical to pre-change behavior.
    expect(resolveWeight("pgs.fantasy_ppr", "PRODUCTION").weight).toBe(
      CATEGORY_PRIORS["PRODUCTION"]!.weight,
    );
  });

  it("substitutes the MEASURED weight for the flat prior", () => {
    const r = resolveWeight("pgs.fantasy_ppr", "PRODUCTION", { "pgs.fantasy_ppr": 0.37 });
    expect(r).toEqual({ weight: 0.37, source: "measured" });
    expect(r.weight).not.toBe(CATEGORY_PRIORS["PRODUCTION"]!.weight);
  });

  it("honours a MEASURED ZERO instead of falling back to the prior", () => {
    // THE TRAP. `measured[k] ?? prior` reads 0 as absent and silently restores
    // the flat 1.0 for exactly the keys the fit said earn nothing — which is the
    // defect re-entered through a nullish check.
    const r = resolveWeight("pgs.fantasy_ppr", "PRODUCTION", { "pgs.fantasy_ppr": 0 });
    expect(r.weight).toBe(0);
    expect(r.source).toBe("measured");
  });

  it("falls back to the prior for a key the fit never covered", () => {
    // Unjoinable is missing evidence, not proven zero effect. Zeroing it would
    // claim the measurement rather than report the gap.
    const r = resolveWeight("ngs.cpoe", "PRODUCTION", { "pgs.fantasy_ppr": 0.5 });
    expect(r.weight).toBe(CATEGORY_PRIORS["PRODUCTION"]!.weight);
    expect(r.source).toBe("prior-unmeasured");
  });

  it("ignores a non-finite measured weight rather than propagating it", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const r = resolveWeight("pgs.fantasy_ppr", "PRODUCTION", { "pgs.fantasy_ppr": bad });
      expect(r.weight).toBe(CATEGORY_PRIORS["PRODUCTION"]!.weight);
      expect(r.source).toBe("prior-unmeasured");
    }
  });

  it("clamps a negative measured weight to 0 — the schema forbids it", () => {
    // Signal.weight is documented >= 0 and compositeScore clamps anyway; an
    // unclamped negative would be a row the schema rejects and the composer eats.
    const r = resolveWeight("inverted", "HEALTH", { inverted: -0.5 });
    expect(r.weight).toBe(0);
    expect(r.source).toBe("measured");
  });
});

describe("the substituted weight actually reaches the composer", () => {
  const NOW = "2026-09-27T12:00:00.000Z";
  // DIFFERENT readings on purpose. `compositeScore` is a weighted AVERAGE
  // (sum(v*w) / sum(w)), so with two identical values the blend is that value no
  // matter how the weights fall — weighting only changes the ATTRIBUTION. To
  // prove the fitted weight moves the SCORE, the two keys must disagree, and
  // then the blend must move toward whichever key was given more weight.
  const rows = [
    {
      key: "pgs.fantasy_ppr",
      value: 0.2, // fitted: weak (0.1)
      weight: 0.1,
      confidence: 0.9,
      capturedAt: NOW,
    },
    {
      key: "pgs.target_share",
      value: 0.9, // fitted: strong (1.0)
      weight: 1.0,
      confidence: 0.9,
      capturedAt: NOW,
    },
  ];

  it("shifts the blended score toward the key the fit says is stronger", () => {
    const equal = composeLedger(
      rows.map((r) => ({ ...r, weight: 1 })),
      { now: NOW, halfLifeDays: 0 },
    );
    const measured = composeLedger(rows, { now: NOW, halfLifeDays: 0 });

    // Flat 1.0 weights them equally: the midpoint of 0.2 and 0.9.
    expect(equal.score).toBeCloseTo(0.55, 6);
    expect(equal.totalWeight).toBeCloseTo(2 * 0.9, 4);

    // Weighting by measured power pulls the blend toward the STRONG key (0.9),
    // so it rises above the unweighted midpoint.
    expect(measured.score).toBeGreaterThan(equal.score);
    expect(measured.score).toBeLessThan(0.9);
    expect(measured.score).toBeGreaterThan(0.55);

    // And the attribution says which key is driving it.
    const top = measured.contributions[0]!;
    expect(top.key).toBe("pgs.target_share");
    expect(top.weightShare).toBeGreaterThan(0.5);
  });

  it("moves the blend DOWN when the measurement favours the LOWER reading", () => {
    // The same arithmetic in the other direction. Without this the first test
    // would also pass if the substitution simply moved every score upward.
    const flipped = composeLedger(
      [
        { ...rows[0]!, weight: 1.0 },
        { ...rows[1]!, weight: 0.1 },
      ],
      { now: NOW, halfLifeDays: 0 },
    );
    expect(flipped.score).toBeLessThan(0.55);
    expect(flipped.score).toBeGreaterThan(0.2);
  });

  it("an all-zero fitted table contributes nothing rather than erroring", () => {
    const zeroed = composeLedger(
      rows.map((r) => ({ ...r, weight: 0 })),
      { now: NOW, halfLifeDays: 0 },
    );
    // totalWeight 0 is the documented inert path: score 0, not NaN.
    expect(zeroed.score).toBe(0);
    expect(zeroed.totalWeight).toBe(0);
    expect(zeroed.signalsUsed).toBe(0);
    expect(Number.isNaN(zeroed.score)).toBe(false);
  });
});