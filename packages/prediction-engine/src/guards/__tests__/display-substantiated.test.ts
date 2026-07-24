import { describe, expect, it } from "vitest";
import {
  assertDisplaySubstantiated,
  displayIfSubstantiated,
  isDisplaySubstantiated,
  UnsubstantiatedClaimError,
  wilsonLowerBound,
  type DisplayClaim,
  type SubstantiationEvidence,
} from "../display-substantiated.js";

function validEvidence(overrides: Partial<SubstantiationEvidence> = {}): SubstantiationEvidence {
  return {
    n: 250,
    successes: 140,
    rate: 0.56,
    lowerConfidenceBound: 0.4961,
    boundMethod: "wilson",
    boundLevel: 0.95,
    clvOrMarketRelative: 1.8,
    provenanceId: "run_2026-07-24_walkforward_v5",
    walkForwardProtocol: "expanding-window, 2024-2026, no-lookahead",
    ...overrides,
  };
}

function claim(evidenceOverrides: Partial<SubstantiationEvidence> = {}, value = 56): DisplayClaim {
  return {
    claimType: "win_rate",
    value,
    evidence: validEvidence(evidenceOverrides),
  };
}

describe("display-substantiated — passes when fully substantiated", () => {
  it("isDisplaySubstantiated is true for a complete, coherent claim", () => {
    expect(isDisplaySubstantiated(claim())).toBe(true);
  });

  it("assertDisplaySubstantiated does not throw for a complete, coherent claim", () => {
    expect(() => assertDisplaySubstantiated(claim())).not.toThrow();
  });

  it("displayIfSubstantiated returns the value when substantiated", () => {
    expect(displayIfSubstantiated(claim({}, 56))).toBe(56);
  });

  it("accepts clopper-pearson and other-validated bound methods too", () => {
    expect(isDisplaySubstantiated(claim({ boundMethod: "clopper-pearson" }))).toBe(true);
    expect(isDisplaySubstantiated(claim({ boundMethod: "other-validated" }))).toBe(true);
  });

  it("does not require successes, rate, clvOrMarketRelative, or notes", () => {
    const minimal: DisplayClaim = {
      claimType: "edge",
      value: 3.2,
      evidence: {
        n: 10,
        lowerConfidenceBound: 0.1,
        boundMethod: "wilson",
        boundLevel: 0.9,
        provenanceId: "prov-1",
        walkForwardProtocol: "walk-forward window A",
      },
    };
    expect(isDisplaySubstantiated(minimal)).toBe(true);
  });
});

describe("display-substantiated — blocks on missing/invalid evidence", () => {
  it("throws when n < 1", () => {
    expect(() => assertDisplaySubstantiated(claim({ n: 0 }))).toThrow(UnsubstantiatedClaimError);
    expect(() => assertDisplaySubstantiated(claim({ n: -5 }))).toThrow(UnsubstantiatedClaimError);
    expect(isDisplaySubstantiated(claim({ n: 0 }))).toBe(false);
  });

  it("throws when n is not finite", () => {
    expect(isDisplaySubstantiated(claim({ n: NaN }))).toBe(false);
    expect(isDisplaySubstantiated(claim({ n: Infinity }))).toBe(false);
  });

  it("throws when lowerConfidenceBound is not a finite number", () => {
    expect(isDisplaySubstantiated(claim({ lowerConfidenceBound: NaN }))).toBe(false);
    expect(isDisplaySubstantiated(claim({ lowerConfidenceBound: Infinity }))).toBe(false);
    expect(() => assertDisplaySubstantiated(claim({ lowerConfidenceBound: NaN }))).toThrow(
      UnsubstantiatedClaimError,
    );
  });

  it("throws when boundLevel is out of [0.8, 1]", () => {
    expect(isDisplaySubstantiated(claim({ boundLevel: 0.5 }))).toBe(false);
    expect(isDisplaySubstantiated(claim({ boundLevel: 1.01 }))).toBe(false);
  });

  it("throws when boundLevel is NaN (invalid, not merely out of range)", () => {
    // A NaN boundLevel must not silently satisfy `< MIN` / `> 1` comparisons.
    expect(isDisplaySubstantiated(claim({ boundLevel: NaN }))).toBe(false);
    expect(() => assertDisplaySubstantiated(claim({ boundLevel: NaN }))).toThrow(
      UnsubstantiatedClaimError,
    );
  });

  it("throws when boundMethod is missing or empty", () => {
    expect(isDisplaySubstantiated(claim({ boundMethod: undefined as unknown as "wilson" }))).toBe(
      false,
    );
    expect(isDisplaySubstantiated(claim({ boundMethod: "" as unknown as "wilson" }))).toBe(false);
  });

  it("throws when provenanceId is missing, empty, or whitespace-only", () => {
    expect(isDisplaySubstantiated(claim({ provenanceId: "" }))).toBe(false);
    expect(isDisplaySubstantiated(claim({ provenanceId: "   " }))).toBe(false);
    expect(
      isDisplaySubstantiated(claim({ provenanceId: undefined as unknown as string })),
    ).toBe(false);
  });

  it("throws when walkForwardProtocol is missing, empty, or whitespace-only", () => {
    expect(isDisplaySubstantiated(claim({ walkForwardProtocol: "" }))).toBe(false);
    expect(isDisplaySubstantiated(claim({ walkForwardProtocol: "   " }))).toBe(false);
    expect(
      isDisplaySubstantiated(claim({ walkForwardProtocol: undefined as unknown as string })),
    ).toBe(false);
  });

  it("reports every failing reason at once, not just the first", () => {
    try {
      assertDisplaySubstantiated(
        claim({ n: 0, provenanceId: "", walkForwardProtocol: "", boundLevel: 0.1 }),
      );
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsubstantiatedClaimError);
      const e = err as UnsubstantiatedClaimError;
      expect(e.reasons.length).toBeGreaterThanOrEqual(4);
      expect(e.claim.claimType).toBe("win_rate");
      expect(e.message).toContain("win_rate");
    }
  });
});

describe("display-substantiated — rate vs LCB consistency", () => {
  it("blocks when the lower confidence bound exceeds the observed rate", () => {
    expect(isDisplaySubstantiated(claim({ rate: 0.5, lowerConfidenceBound: 0.6 }))).toBe(false);
  });

  it("allows the LCB to equal the rate (degenerate but coherent)", () => {
    expect(isDisplaySubstantiated(claim({ rate: 0.5, lowerConfidenceBound: 0.5 }))).toBe(true);
  });

  it("allows tiny floating point overshoot within tolerance", () => {
    expect(isDisplaySubstantiated(claim({ rate: 0.5, lowerConfidenceBound: 0.5 + 1e-9 }))).toBe(
      true,
    );
  });

  it("skips the rate/LCB consistency check entirely when rate is not provided", () => {
    // A claim type where "rate" doesn't apply (e.g. CLV in bps) must not be
    // penalized for omitting it.
    expect(
      isDisplaySubstantiated(claim({ rate: undefined, lowerConfidenceBound: 999 })),
    ).toBe(true);
  });
});

describe("displayIfSubstantiated", () => {
  it("returns null when the claim fails substantiation", () => {
    expect(displayIfSubstantiated(claim({ n: 0 }))).toBeNull();
    expect(displayIfSubstantiated(claim({ provenanceId: "" }))).toBeNull();
  });

  it("returns the exact claimed value (not a recomputed one) when substantiated", () => {
    expect(displayIfSubstantiated(claim({}, 73.4))).toBe(73.4);
  });
});

describe("wilsonLowerBound", () => {
  it("returns 0 for n <= 0", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(5, -1)).toBe(0);
  });

  it("is always within [0, 1]", () => {
    for (const [s, n] of [
      [0, 10],
      [10, 10],
      [1, 3],
      [999, 1000],
    ] as const) {
      const lb = wilsonLowerBound(s, n);
      expect(lb).toBeGreaterThanOrEqual(0);
      expect(lb).toBeLessThanOrEqual(1);
    }
  });

  it("never exceeds the observed rate", () => {
    for (const [s, n] of [
      [55, 100],
      [1, 2],
      [999, 1000],
    ] as const) {
      const lb = wilsonLowerBound(s, n);
      expect(lb).toBeLessThanOrEqual(s / n + 1e-9);
    }
  });

  it("widens (LCB drops further below the rate) with a smaller sample for the same observed rate", () => {
    const smallSample = wilsonLowerBound(5, 10); // 50% on n=10
    const largeSample = wilsonLowerBound(500, 1000); // 50% on n=1000
    expect(largeSample).toBeGreaterThan(smallSample);
  });

  it("matches the well-known Wilson value for 55/100 at the default 1.96 z", () => {
    // Reference value from the standard Wilson score interval formula.
    expect(wilsonLowerBound(55, 100)).toBeCloseTo(0.4524, 3);
  });

  it("feeds cleanly into a substantiated claim end-to-end", () => {
    const n = 400;
    const successes = 230;
    const rate = successes / n;
    const lcb = wilsonLowerBound(successes, n);
    const evidence: SubstantiationEvidence = {
      n,
      successes,
      rate,
      lowerConfidenceBound: lcb,
      boundMethod: "wilson",
      boundLevel: 0.95,
      provenanceId: "run_end_to_end",
      walkForwardProtocol: "expanding-window walk-forward",
    };
    expect(isDisplaySubstantiated({ claimType: "win_rate", value: rate * 100, evidence })).toBe(
      true,
    );
  });
});
