import { describe, expect, it } from "vitest";
import {
  assertDisplaySubstantiated,
  isDisplaySubstantiated,
  displayIfSubstantiated,
  wilsonLowerBound,
  UnsubstantiatedClaimError,
  type DisplayClaim,
  type SubstantiationEvidence,
} from "../display-substantiated.js";

/**
 * Display-substantiation guard suite (handoff Task 1.3): the guard must BLOCK
 * when evidence fields are missing and PASS when the bundle is complete and
 * the lower bound is coherent with the observed rate.
 *
 * The point of these tests is that the guard fails CLOSED. Every "missing
 * field" case below asserts a throw, not a fallback value — a guard that
 * silently degrades to a permissive default would defeat its own purpose.
 */

const completeEvidence: SubstantiationEvidence = {
  n: 812,
  successes: 474,
  rate: 0.5837,
  lowerConfidenceBound: 0.5495,
  boundMethod: "wilson",
  boundLevel: 0.95,
  clvOrMarketRelative: 41,
  provenanceId: "walkforward-2026-07-24-abc123",
  walkForwardProtocol: "expanding-window walk-forward, as-of snapshots, no lookahead",
};

const completeClaim: DisplayClaim = {
  claimType: "win_rate",
  value: 0.5837,
  evidence: completeEvidence,
};

/** Build a claim whose evidence has one field replaced by an invalid value. */
function claimWith(patch: Partial<SubstantiationEvidence>): DisplayClaim {
  return { ...completeClaim, evidence: { ...completeEvidence, ...patch } };
}

describe("display guard — passes only on a complete, coherent evidence bundle", () => {
  it("accepts the fully substantiated claim", () => {
    expect(isDisplaySubstantiated(completeClaim)).toBe(true);
    expect(() => assertDisplaySubstantiated(completeClaim)).not.toThrow();
    expect(displayIfSubstantiated(completeClaim)).toBe(completeClaim.value);
  });

  it("accepts a claim with no CLV backing, since clvOrMarketRelative is optional for non-market metrics", () => {
    const noClv = claimWith({ clvOrMarketRelative: null });

    expect(isDisplaySubstantiated(noClv)).toBe(true);
    expect(() => assertDisplaySubstantiated(noClv)).not.toThrow();
  });

  it("accepts a claim with no observed rate, since the LCB-vs-rate coherence check only applies when a rate is present", () => {
    const noRate = claimWith({ rate: undefined });

    expect(isDisplaySubstantiated(noRate)).toBe(true);
  });
});

describe("display guard — blocks when required evidence is missing or invalid", () => {
  const missingFieldCases: ReadonlyArray<{
    readonly label: string;
    readonly patch: Partial<SubstantiationEvidence>;
    readonly reasonFragment: string;
  }> = [
    { label: "no coverage denominator (n = 0)", patch: { n: 0 }, reasonFragment: "coverage denominator" },
    { label: "negative coverage denominator", patch: { n: -5 }, reasonFragment: "coverage denominator" },
    { label: "non-finite coverage denominator", patch: { n: Number.NaN }, reasonFragment: "coverage denominator" },
    {
      label: "non-finite lower confidence bound",
      patch: { lowerConfidenceBound: Number.NaN },
      reasonFragment: "lowerConfidenceBound must be a finite number",
    },
    { label: "bound level below the floor", patch: { boundLevel: 0.5 }, reasonFragment: "boundLevel" },
    { label: "bound level above 1", patch: { boundLevel: 1.5 }, reasonFragment: "boundLevel" },
    {
      label: "empty provenance id",
      patch: { provenanceId: "   " },
      reasonFragment: "provenanceId is required",
    },
    {
      label: "empty walk-forward protocol",
      patch: { walkForwardProtocol: "" },
      reasonFragment: "walkForwardProtocol is required",
    },
  ];

  for (const { label, patch, reasonFragment } of missingFieldCases) {
    it(`blocks: ${label}`, () => {
      const claim = claimWith(patch);

      expect(isDisplaySubstantiated(claim)).toBe(false);
      expect(() => assertDisplaySubstantiated(claim)).toThrow(UnsubstantiatedClaimError);
      expect(displayIfSubstantiated(claim)).toBeNull();

      try {
        assertDisplaySubstantiated(claim);
        throw new Error("expected assertDisplaySubstantiated to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(UnsubstantiatedClaimError);
        const reasons = (error as UnsubstantiatedClaimError).reasons.join("; ");
        expect(reasons).toContain(reasonFragment);
      }
    });
  }

  it("blocks an incoherent bundle where the lower bound exceeds the observed rate", () => {
    const incoherent = claimWith({ rate: 0.52, lowerConfidenceBound: 0.61 });

    expect(isDisplaySubstantiated(incoherent)).toBe(false);
    expect(() => assertDisplaySubstantiated(incoherent)).toThrow(
      /lowerConfidenceBound cannot exceed the observed rate/,
    );
  });

  it("reports every failure at once, not just the first, so a caller can fix the whole bundle", () => {
    const multiplyBroken = claimWith({
      n: 0,
      provenanceId: "",
      walkForwardProtocol: "",
    });

    try {
      assertDisplaySubstantiated(multiplyBroken);
      throw new Error("expected assertDisplaySubstantiated to throw");
    } catch (error) {
      const { reasons } = error as UnsubstantiatedClaimError;
      expect(reasons.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("carries the offending claim on the error for audit", () => {
    const claim = claimWith({ n: 0 });

    try {
      assertDisplaySubstantiated(claim);
      throw new Error("expected assertDisplaySubstantiated to throw");
    } catch (error) {
      expect((error as UnsubstantiatedClaimError).claim).toEqual(claim);
      expect((error as UnsubstantiatedClaimError).name).toBe("UnsubstantiatedClaimError");
    }
  });
});

describe("wilsonLowerBound", () => {
  it("returns 0 for an empty sample rather than NaN", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("never exceeds the observed rate, and never goes below 0", () => {
    const cases: ReadonlyArray<readonly [number, number]> = [
      [0, 10],
      [1, 10],
      [5, 10],
      [9, 10],
      [10, 10],
      [474, 812],
      [1, 1],
    ];

    for (const [successes, n] of cases) {
      const lcb = wilsonLowerBound(successes, n);
      expect(lcb).toBeGreaterThanOrEqual(0);
      expect(lcb).toBeLessThanOrEqual(successes / n + 1e-9);
    }
  });

  it("tightens toward the observed rate as the sample grows", () => {
    const smallSample = wilsonLowerBound(30, 50);
    const largeSample = wilsonLowerBound(3000, 5000);

    // Same 60% observed rate, far more evidence ⇒ the bound sits closer to it.
    expect(0.6 - largeSample).toBeLessThan(0.6 - smallSample);
  });

  it("produces a bound that the guard itself accepts as coherent", () => {
    const successes = 474;
    const n = 812;
    const rate = successes / n;
    const claim: DisplayClaim = {
      claimType: "win_rate",
      value: rate,
      evidence: {
        ...completeEvidence,
        n,
        successes,
        rate,
        lowerConfidenceBound: wilsonLowerBound(successes, n),
      },
    };

    expect(isDisplaySubstantiated(claim)).toBe(true);
  });
});
