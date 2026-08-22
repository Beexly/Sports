import { describe, expect, it } from "vitest";
import {
  assertDisplaySubstantiated,
  displayIfSubstantiated,
  isDisplaySubstantiated,
  UnsubstantiatedClaimError,
  wilsonLowerBound,
  type DisplayClaim,
} from "../display-substantiated.js";

function validClaim(over: Partial<DisplayClaim> = {}): DisplayClaim {
  const evidence = {
    n: 100,
    successes: 55,
    rate: 0.55,
    lowerConfidenceBound: 0.45,
    boundMethod: "clopper-pearson" as const,
    boundLevel: 0.95,
    clvOrMarketRelative: 0.012,
    provenanceId: "wf-2026-08-21",
    walkForwardProtocol: "purged expanding window, embargo 7d",
    ...(over.evidence ?? {}),
  };
  const { evidence: _ignored, ...rest } = over;
  return {
    claimType: "win_rate",
    value: 0.55,
    evidence,
    ...rest,
  };
}

describe("isDisplaySubstantiated / assertDisplaySubstantiated failing branches", () => {
  it("fails when n < 1", () => {
    const claim = validClaim({ evidence: { ...validClaim().evidence, n: 0 } });
    expect(isDisplaySubstantiated(claim)).toBe(false);
    expect(() => assertDisplaySubstantiated(claim)).toThrow(UnsubstantiatedClaimError);
    expect(() => assertDisplaySubstantiated(claim)).toThrow(/coverage denominator/);
  });

  it("fails when lowerConfidenceBound is non-finite", () => {
    const claim = validClaim({
      evidence: { ...validClaim().evidence, lowerConfidenceBound: Number.NaN },
    });
    expect(isDisplaySubstantiated(claim)).toBe(false);
    expect(() => assertDisplaySubstantiated(claim)).toThrow(/lowerConfidenceBound must be a finite number/);
  });

  it("fails when boundLevel is outside [0.8, 1]", () => {
    const low = validClaim({ evidence: { ...validClaim().evidence, boundLevel: 0.79 } });
    const high = validClaim({ evidence: { ...validClaim().evidence, boundLevel: 1.01 } });
    expect(isDisplaySubstantiated(low)).toBe(false);
    expect(isDisplaySubstantiated(high)).toBe(false);
    expect(() => assertDisplaySubstantiated(low)).toThrow(/boundLevel/);
  });

  it("fails when boundMethod is missing", () => {
    const evidence = { ...validClaim().evidence, boundMethod: "" as never };
    const claim = validClaim({ evidence });
    expect(isDisplaySubstantiated(claim)).toBe(false);
    expect(() => assertDisplaySubstantiated(claim)).toThrow(/boundMethod is required/);
  });

  it("fails when provenanceId or walkForwardProtocol is missing", () => {
    const noProv = validClaim({ evidence: { ...validClaim().evidence, provenanceId: "  " } });
    const noWf = validClaim({ evidence: { ...validClaim().evidence, walkForwardProtocol: "" } });
    expect(isDisplaySubstantiated(noProv)).toBe(false);
    expect(isDisplaySubstantiated(noWf)).toBe(false);
    expect(() => assertDisplaySubstantiated(noProv)).toThrow(/provenanceId/);
    expect(() => assertDisplaySubstantiated(noWf)).toThrow(/walkForwardProtocol/);
  });

  it("requires clvOrMarketRelative for win_rate/roi/ats/clv/selective_rate", () => {
    for (const claimType of ["win_rate", "roi", "ats", "clv", "selective_rate"] as const) {
      const base = validClaim({ claimType });
      const evidence = { ...base.evidence };
      delete (evidence as { clvOrMarketRelative?: number }).clvOrMarketRelative;
      const claim = { ...base, evidence };
      expect(isDisplaySubstantiated(claim)).toBe(false);
      expect(() => assertDisplaySubstantiated(claim)).toThrow(/clvOrMarketRelative/);
    }
  });

  it("fails when LCB exceeds the observed rate", () => {
    const claim = validClaim({
      evidence: { ...validClaim().evidence, rate: 0.5, lowerConfidenceBound: 0.51 },
    });
    expect(isDisplaySubstantiated(claim)).toBe(false);
    expect(() => assertDisplaySubstantiated(claim)).toThrow(/cannot exceed the observed rate/);
  });
});

describe("displayIfSubstantiated", () => {
  it("returns the value when substantiated and null otherwise", () => {
    expect(displayIfSubstantiated(validClaim())).toBe(0.55);
    expect(
      displayIfSubstantiated(validClaim({ evidence: { ...validClaim().evidence, n: 0 } })),
    ).toBeNull();
  });

  it("accepts a fully substantiated claim via assert", () => {
    expect(() => assertDisplaySubstantiated(validClaim())).not.toThrow();
    expect(isDisplaySubstantiated(validClaim())).toBe(true);
  });
});

describe("wilsonLowerBound", () => {
  it("returns 0 when n <= 0", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
    expect(wilsonLowerBound(5, -1)).toBe(0);
  });

  it("matches the textbook n=100, successes=55, z=1.96 lower bound", () => {
    expect(wilsonLowerBound(55, 100, 1.96)).toBeCloseTo(0.4524442703164345, 10);
  });
});
