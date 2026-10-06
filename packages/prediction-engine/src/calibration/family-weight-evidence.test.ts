/**
 * Family-weight evidence census — tests.
 *
 * These pin HONESTY properties, not features. The expensive failures this
 * guards against are the ones that produced the false CONFIRMS stamp on 788
 * rows (8bda5340a) and the legacy-vs-current pooling error (SURF-7): reporting
 * a number that looks measured when the real story is a confound.
 */

import { describe, expect, it } from "vitest";
import {
  censusFamilyWeights,
  EVIDENCE_SATURATION_ROWS,
  familiesRestingOnPriors,
  findCollinearFamilies,
  formatFamilyWeightReport,
  MAX_PICKTYPE_SHARE,
  MIN_ABS_Z,
  MIN_STRATUM_OBSERVATIONS,
  pickTypeMixDistance,
  stratifiedZ,
  twoProportionZ,
  twoTailedP,
  type FamilyStratum,
} from "./family-weight-evidence.js";

/** Build a stratum with a given win rate and row count. */
function stratum(
  family: string,
  present: boolean,
  pickType: string,
  n: number,
  winRate: number,
  fixtures = n,
): FamilyStratum {
  const wins = Math.round(n * winRate);
  return { family, present, pickType, wins, losses: n - wins, distinctFixtures: fixtures };
}

describe("twoProportionZ", () => {
  it("returns null when either arm is empty rather than ±Infinity", () => {
    // A z of Infinity is a division by zero wearing a lab coat, not a measurement.
    expect(twoProportionZ(0, 0, 10, 100)).toBeNull();
    expect(twoProportionZ(10, 100, 0, 0)).toBeNull();
  });

  it("returns a finite z even when one arm is all-wins, if the pooled rate has variance", () => {
    // 100/100 vs 50/100 is a real, testable difference — the pooled rate is
    // 0.75 so the standard error is well defined. The guard below is about a
    // POOLED rate of 0 or 1, not about a saturated arm.
    const z = twoProportionZ(100, 100, 50, 100);
    expect(z).not.toBeNull();
    expect(Number.isFinite(z as number)).toBe(true);
  });

  it("returns null when the POOLED rate has no variance", () => {
    // Both arms perfect: pooled p = 1, standard error = 0, z would be ±Inf.
    expect(twoProportionZ(100, 100, 200, 200)).toBeNull();
    expect(twoProportionZ(0, 50, 0, 50)).toBeNull();
  });

  it("is positive when the first arm wins more and antisymmetric on swap", () => {
    const z = twoProportionZ(600, 1000, 400, 1000);
    expect(z).not.toBeNull();
    expect(z as number).toBeGreaterThan(0);
    const swapped = twoProportionZ(400, 1000, 600, 1000);
    expect(Math.abs((swapped as number) + (z as number))).toBeLessThan(1e-9);
  });
});

describe("twoTailedP", () => {
  it("maps |z| to a small p only once it clears the threshold", () => {
    expect(twoTailedP(0)).toBeGreaterThan(0.5);
    expect(twoTailedP(MIN_ABS_Z)).toBeLessThan(0.06);
    expect(twoTailedP(5)).toBeLessThan(1e-6);
  });

  it("is symmetric and bounded for any input", () => {
    expect(Math.abs(twoTailedP(2) - twoTailedP(-2))).toBeLessThan(1e-12);
    for (const z of [-40, -1, 0, 1, 40]) {
      const p = twoTailedP(z);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("refuses to produce a number for a non-finite z", () => {
    expect(twoTailedP(Number.NaN)).toBe(1);
    expect(twoTailedP(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("censusFamilyWeights — the MONEYLINE confound (the real 2026-09-29 finding)", () => {
  // Reproduces the shape that made my first pass report every family
  // "ANTI-PREDICTIVE": the zero-flag bucket is 100% MONEYLINE, and moneyline
  // is the market CLV-1 already measured as losing to the close hardest.
  const confounded: FamilyStratum[] = [
    stratum("rest", false, "MONEYLINE", 933, 0.6259),
    stratum("rest", true, "SPREAD", 1187, 0.5215),
    stratum("rest", true, "TOTAL", 155, 0.5016),
  ];

  it("refuses a bet-type proxy as unmeasurable instead of calling it anti-predictive", () => {
    const [m] = censusFamilyWeights(confounded);
    expect(m?.verdict).toBe("unmeasurable");
    expect(m?.suggestedMultiplier).toBeNull();
    expect(m?.z).toBeNull();
    expect(m?.reason).toContain("bet-type proxy");
  });

  it("names the composition difference that disqualified the comparison", () => {
    const [m] = censusFamilyWeights(confounded);
    // Absent arm is 933/933 MONEYLINE and present is 100% SPREAD/TOTAL, so the
    // two mixes are fully disjoint: total-variation distance = 1.
    expect(m?.betTypeMixDistance).toBeGreaterThanOrEqual(MAX_PICKTYPE_SHARE);
  });

  it("does NOT call a single-pickType family a proxy when both arms match", () => {
    // The guard tests composition DIFFERENCE between arms, not absolute
    // concentration. An all-SPREAD family measured entirely within SPREAD is
    // a clean comparison and must not be refused for that alone.
    const bothSpread: FamilyStratum[] = [
      stratum("sp", false, "SPREAD", 900, 0.50),
      stratum("sp", true, "SPREAD", 900, 0.62),
    ];
    const [m] = censusFamilyWeights(bothSpread);
    expect(m?.verdict).toBe("earned");
    expect(m?.betTypeMixDistance).toBe(0);
  });

  it("a genuinely balanced family at the same rates IS measurable and anti-predictive", () => {
    // Same effect size, but the comparison is not a bet-type proxy. This is the
    // control: the refusal above must come from confounding, not from the z.
    const clean: FamilyStratum[] = [
      stratum("rest", false, "MONEYLINE", 933, 0.6259),
      stratum("rest", false, "SPREAD", 933, 0.6259),
      stratum("rest", true, "SPREAD", 1187, 0.5215),
      stratum("rest", true, "TOTAL", 933, 0.5215),
    ];
    const [m] = censusFamilyWeights(clean);
    expect(m?.verdict).toBe("anti-predictive");
    expect(m?.z).not.toBeNull();
    expect((m?.z as number)).toBeLessThan(-MIN_ABS_Z);
  });
});

describe("censusFamilyWeights — evidence floors", () => {
  it("returns insufficient-evidence (not zero) below the row floor", () => {
    const thin: FamilyStratum[] = [
      stratum("thin", false, "SPREAD", 40, 0.5),
      stratum("thin", true, "SPREAD", 40, 0.9),
    ];
    const [m] = censusFamilyWeights(thin);
    expect(m?.verdict).toBe("insufficient-evidence");
    // null !== 0. "We do not know" is not the same claim as "no effect".
    expect(m?.suggestedMultiplier).toBeNull();
    // The reason must say WHY we don't know — underpowered strata — not just
    // that a verdict came back inconclusive.
    expect(m?.reason).toContain("underpowered");
    expect(m?.strataTested).toBe(0);
    expect(m?.strataDropped).toBe(1);
  });

  it("refuses a family with only one presence state as unmeasurable", () => {
    const oneArm: FamilyStratum[] = [stratum("onlypresent", true, "SPREAD", 500, 0.5)];
    const [m] = censusFamilyWeights(oneArm);
    expect(m?.verdict).toBe("unmeasurable");
    expect(m?.suggestedMultiplier).toBeNull();
  });

  it("ignores rows with no observations and non-finite counts", () => {
    const junk: FamilyStratum[] = [
      { family: "junk", present: true, pickType: "SPREAD", wins: 0, losses: 0, distinctFixtures: 0 },
      { family: "junk", present: true, pickType: "SPREAD", wins: Number.NaN, losses: 5, distinctFixtures: 5 },
      { family: "junk", present: true, pickType: "SPREAD", wins: -3, losses: 5, distinctFixtures: 5 },
    ];
    expect(censusFamilyWeights(junk)).toHaveLength(0);
  });

  it("reports distinct fixtures so row-level correlation stays visible", () => {
    const correlated: FamilyStratum[] = [
      stratum("venue", false, "SPREAD", 2000, 0.5, 100),
      stratum("venue", true, "SPREAD", 2000, 0.8, 100),
    ];
    const [m] = censusFamilyWeights(correlated);
    // 2,000 rows but only 100 distinct fixtures — the number is reported, not hidden.
    expect(m?.distinctFixtures).toBe(100);
  });
});

describe("censusFamilyWeights — direction and multiplier", () => {
  it("marks a reliably positive family earned with a positive multiplier", () => {
    const good: FamilyStratum[] = [
      stratum("good", false, "SPREAD", 2000, 0.45),
      stratum("good", false, "TOTAL", 2000, 0.45),
      stratum("good", true, "SPREAD", 2000, 0.60),
      stratum("good", true, "TOTAL", 2000, 0.60),
    ];
    const [m] = censusFamilyWeights(good);
    expect(m?.verdict).toBe("earned");
    expect(m?.suggestedMultiplier).toBeGreaterThan(0);
    expect((m?.suggestedMultiplier as number)).toBeLessThanOrEqual(1);
  });

  it("marks a reliably negative family anti-predictive with a NEGATIVE multiplier", () => {
    const bad: FamilyStratum[] = [
      stratum("bad", false, "SPREAD", 2000, 0.60),
      stratum("bad", false, "TOTAL", 2000, 0.60),
      stratum("bad", true, "SPREAD", 2000, 0.45),
      stratum("bad", true, "TOTAL", 2000, 0.45),
    ];
    const [m] = censusFamilyWeights(bad);
    expect(m?.verdict).toBe("anti-predictive");
    // Dropping it silently would misrepresent what the data says.
    expect(m?.suggestedMultiplier).toBeLessThan(0);
  });

  it("calls a well-powered family with no reliable difference inert at multiplier 0", () => {
    const flat: FamilyStratum[] = [
      stratum("flat", false, "SPREAD", 5000, 0.501),
      stratum("flat", true, "SPREAD", 5000, 0.503),
    ];
    const [m] = censusFamilyWeights(flat);
    expect(m?.verdict).toBe("inert");
    expect(m?.suggestedMultiplier).toBe(0);
    expect(Math.abs(m?.z as number)).toBeLessThan(MIN_ABS_Z);
  });

  it("throttles a token arm so it cannot buy a full-strength weight", () => {
    // 200,000 rows in the absent arm must not lend its size to a 100-row present
    // arm. This is the bug the first version of the evidence factor had.
    const huge = 200_000;
    const token = MIN_STRATUM_OBSERVATIONS;
    const skew: FamilyStratum[] = [
      stratum("skew", false, "SPREAD", huge, 0.50),
      stratum("skew", true, "SPREAD", token, 0.95),
    ];
    const [m] = censusFamilyWeights(skew);
    expect(m?.verdict).toBe("earned");
    // sqrt(100 / 1000) = 0.316 of full weight, however large the other arm is.
    expect(m?.suggestedMultiplier as number).toBeLessThan(0.5);
  });

  it("is MONOTONE increasing in the smaller arm, and saturates rather than growing without bound", () => {
    // The property that makes the throttle a throttle. Every arm here faces an
    // identical 200,000-row opposite arm, so only the thin side varies.
    const huge = 200_000;
    const multiplierFor = (thin: number): number => {
      const [m] = censusFamilyWeights([
        stratum("mono", false, "SPREAD", huge, 0.50),
        stratum("mono", true, "SPREAD", thin, 0.95),
      ]);
      return m?.suggestedMultiplier as number;
    };
    const atFloor = multiplierFor(MIN_STRATUM_OBSERVATIONS);
    const at5x = multiplierFor(MIN_STRATUM_OBSERVATIONS * 5);
    const atSaturation = multiplierFor(EVIDENCE_SATURATION_ROWS);
    const beyondSaturation = multiplierFor(EVIDENCE_SATURATION_ROWS * 100);

    expect(at5x).toBeGreaterThan(atFloor);
    expect(atSaturation).toBeGreaterThan(at5x);
    // Saturates: more rows in the thin arm cannot push the weight past 1.
    expect(beyondSaturation).toBeCloseTo(atSaturation, 6);
    expect(beyondSaturation).toBeLessThanOrEqual(1);
  });

  it("reaches the unsaturated bound only when BOTH arms are large", () => {
    // At a 12pp lift the multiplier is bounded by the effect size, not just by
    // evidence: tanh(0.12 * 4) = 0.446. So the invariant is "large arms reach
    // the tanh bound", never "large arms mean 0.9".
    const lift = 0.12;
    const bound = Math.tanh(lift * 4);
    const balanced = (n: number): FamilyStratum[] => [
      stratum("bal", false, "SPREAD", n, 0.50),
      stratum("bal", true, "SPREAD", n, 0.50 + lift),
    ];
    const [thinBoth] = censusFamilyWeights(balanced(MIN_STRATUM_OBSERVATIONS));
    const [bigBoth] = censusFamilyWeights(balanced(EVIDENCE_SATURATION_ROWS * 2));

    // Thin both sides: throttled well below the bound.
    expect(thinBoth?.suggestedMultiplier as number).toBeLessThan(bound * 0.6);
    // Large both sides: evidence saturates, so the multiplier IS the bound.
    expect(bigBoth?.suggestedMultiplier as number).toBeCloseTo(bound, 4);
  });

  it("keeps the multiplier inside (−1, 1) for an implausibly large effect", () => {
    const [m] = censusFamilyWeights([
      stratum("huge", false, "SPREAD", 50_000, 0.01),
      stratum("huge", true, "SPREAD", 50_000, 0.99),
    ]);
    const mult = m?.suggestedMultiplier as number;
    expect(mult).toBeGreaterThan(0);
    expect(mult).toBeLessThanOrEqual(1);
  });

  it("stratifiedZ REPRODUCES the plain pooled z for a single stratum", () => {
    // The invariant that caught a real bug: combining one stratum must return
    // that stratum's z exactly. A wrong fixed-effect form (Σw·z instead of
    // Σz·√w) returns z·w ≈ z/var, which for these numbers is z ≈ 20 and reads
    // as overwhelming evidence where there is none.
    const one: FamilyStratum[] = [
      stratum("one", false, "SPREAD", 5_000, 0.501),
      stratum("one", true, "SPREAD", 5_000, 0.503),
    ];
    const strat = stratifiedZ(one, "one");
    const pooled = twoProportionZ(
      Math.round(5_000 * 0.503),
      5_000,
      Math.round(5_000 * 0.501),
      5_000,
    );
    expect(strat.tested).toBe(1);
    expect(strat.z).toBeCloseTo(pooled as number, 6);
  });

  it("drops an underpowered stratum and reports it instead of pooling it", () => {
    // TOTAL has only 30 rows in each arm — under the 100-row per-stratum floor.
    // Pooling it would let 30 rows of TOTAL inherit the weight of a 10,000-row
    // SPREAD measurement, which is the same class of error as pooling the
    // bet-type arms. It must be excluded AND reported as excluded.
    const mixed: FamilyStratum[] = [
      stratum("mix", false, "SPREAD", 10_000, 0.50),
      stratum("mix", true, "SPREAD", 10_000, 0.60),
      stratum("mix", false, "TOTAL", 30, 0.00),
      stratum("mix", true, "TOTAL", 30, 1.00),
    ];
    const [m] = censusFamilyWeights(mixed);
    expect(m?.strataTested).toBe(1);
    expect(m?.strataDropped).toBe(1);
    expect(m?.verdict).toBe("earned");
    // The verdict comes from SPREAD alone, so the lift reflects SPREAD.
    expect(m?.suggestedMultiplier as number).toBeCloseTo(Math.tanh(0.1 * 4), 2);
    expect(m?.reason).toContain("1 underpowered");
  });

  it("does not let a dropped stratum's extreme effect leak into the lift", () => {
    // Same as above, but the dropped TOTAL stratum is 100% wins vs 0% wins.
    // If it leaked, the multiplier would be pinned near +1.0 instead of
    // reflecting SPREAD's +10pp.
    const leaked: FamilyStratum[] = [
      stratum("leak", false, "SPREAD", 10_000, 0.50),
      stratum("leak", true, "SPREAD", 10_000, 0.60),
      stratum("leak", false, "TOTAL", 30, 0),
      stratum("leak", true, "TOTAL", 30, 30),
    ];
    const [m] = censusFamilyWeights(leaked);
    const mult = m?.suggestedMultiplier as number;
    expect(mult).toBeLessThan(0.5);
    expect(m?.strataDropped).toBe(1);
  });
});

describe("findCollinearFamilies", () => {
  it("flags the schedule/line_movement pair that is one column in practice", () => {
    // Measured 2026-09-29: the two flags disagree on 0 of 4,135 settled rows.
    const rows: FamilyStratum[] = [
      stratum("line_movement", true, "SPREAD", 700, 0.52),
      stratum("line_movement", false, "MONEYLINE", 300, 0.62),
      stratum("schedule", true, "SPREAD", 700, 0.52),
      stratum("schedule", false, "MONEYLINE", 300, 0.62),
    ];
    const collinear = findCollinearFamilies(rows);
    expect(collinear.get("line_movement")).toEqual(["schedule"]);
    expect(collinear.get("schedule")).toEqual(["line_movement"]);
  });

  it("does not flag families that genuinely differ", () => {
    const rows: FamilyStratum[] = [
      stratum("rest", true, "SPREAD", 700, 0.52),
      stratum("rest", false, "MONEYLINE", 300, 0.62),
      stratum("venue", true, "SPREAD", 640, 0.55),
      stratum("venue", false, "MONEYLINE", 300, 0.62),
    ];
    expect(findCollinearFamilies(rows).size).toBe(0);
  });

  it("surfaces the collinearity in the measurement reason", () => {
    // Both arms match on pickType (all SPREAD) so the comparison is not a
    // bet-type proxy, and the two families are observationally identical.
    const rows: FamilyStratum[] = [
      stratum("line_movement", false, "SPREAD", 2000, 0.45),
      stratum("line_movement", true, "SPREAD", 2000, 0.60),
      stratum("schedule", false, "SPREAD", 2000, 0.45),
      stratum("schedule", true, "SPREAD", 2000, 0.60),
    ];
    const m = censusFamilyWeights(rows).find((x) => x.family === "line_movement");
    expect(m?.verdict).toBe("earned");
    expect(m?.collinearWith).toContain("schedule");
    expect(m?.reason).toContain("collinear");
  });
});

describe("report", () => {
  const rows: FamilyStratum[] = [
    stratum("good", false, "SPREAD", 2000, 0.45),
    stratum("good", false, "TOTAL", 2000, 0.45),
    stratum("good", true, "SPREAD", 2000, 0.60),
    stratum("good", true, "TOTAL", 2000, 0.60),
    stratum("thin", false, "SPREAD", 40, 0.5),
    stratum("thin", true, "SPREAD", 40, 0.9),
  ];

  it("counts every non-earned family as resting on an unmeasured prior", () => {
    const ms = censusFamilyWeights(rows);
    expect(ms).toHaveLength(2);
    const priors = familiesRestingOnPriors(ms);
    expect(priors.map((p) => p.family)).toEqual(["thin"]);
  });

  it("is deterministic and sorted so two runs can be diffed", () => {
    const a = censusFamilyWeights(rows);
    const b = censusFamilyWeights([...rows].reverse());
    expect(a.map((m) => m.family)).toEqual(b.map((m) => m.family));
    expect(a.map((m) => m.verdict)).toEqual(b.map((m) => m.verdict));
  });

  it("gives every measurement a non-empty reason", () => {
    for (const m of censusFamilyWeights(rows)) {
      expect(m.reason.length).toBeGreaterThan(0);
    }
  });

  it("states plainly when nothing was measured instead of printing an empty table", () => {
    const text = formatFamilyWeightReport([]);
    expect(text).toContain("nothing was measured");
  });

  it("prints a nonzero count of families still on priors", () => {
    const text = formatFamilyWeightReport(censusFamilyWeights(rows));
    expect(text).toContain("do NOT rest on measured evidence");
  });
});
