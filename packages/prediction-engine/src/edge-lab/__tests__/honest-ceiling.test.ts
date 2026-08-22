import { describe, it, expect } from "vitest";
import {
  assertClaimWithinCeiling,
  collectCeilingDefects,
  HonestCeilingError,
  BLIND_ATS_CEILING,
  BREAK_EVEN,
  SELECTIVE_CLAIM_FLOOR,
  type SelectiveClaimProof,
} from "../honest-ceiling.js";

/**
 * S2 — the honest ceiling on performance claims.
 *
 * Blind (full-slate) claims above ~56% are fabrication by construction — no
 * proof object rescues them, because a real, sustained blind edge cannot
 * clear that. Selective claims MAY exceed it, but only with a real
 * evidentiary floor: 200+ fired bets, multi-season walk-forward, positive
 * CLV. Absent that floor, the same number is exactly as dishonest.
 */

const PROOF: SelectiveClaimProof = {
  firedBets: 250,
  multiSeasonWalkForward: true,
  positiveClv: true,
};

describe("constants match the doctrine", () => {
  it("BLIND_ATS_CEILING is 56%", () => {
    expect(BLIND_ATS_CEILING).toBe(0.56);
  });
  it("BREAK_EVEN matches the same 52.4% used elsewhere (public-clv-policy)", () => {
    expect(BREAK_EVEN).toBe(0.524);
  });
  it("SELECTIVE_CLAIM_FLOOR requires all three conditions", () => {
    expect(SELECTIVE_CLAIM_FLOOR).toEqual({
      minFiredBets: 200,
      requiresMultiSeasonWalkForward: true,
      requiresPositiveClv: true,
    });
  });
});

describe("blind claims", () => {
  it("passes at or below the ceiling", () => {
    expect(collectCeilingDefects({ scope: "blind", claimedRate: 0.56 })).toEqual([]);
    expect(collectCeilingDefects({ scope: "blind", claimedRate: 0.524 })).toEqual([]);
    expect(() => assertClaimWithinCeiling({ scope: "blind", claimedRate: 0.55 })).not.toThrow();
  });

  it("REGRESSION GUARD: a fabricated '62% blind win rate' style claim is refused", () => {
    const defects = collectCeilingDefects({ scope: "blind", claimedRate: 0.62 });
    expect(defects).toHaveLength(1);
    expect(defects[0]).toMatch(/exceeds the honest ceiling/);
    expect(() => assertClaimWithinCeiling({ scope: "blind", claimedRate: 0.62 })).toThrow(HonestCeilingError);
  });

  it("no proof object rescues an above-ceiling BLIND claim — the claim itself is the defect", () => {
    // A blind claim gets no benefit from selectiveProof at all; supplying one
    // (even a perfect one) must not launder an impossible blind claim.
    const defects = collectCeilingDefects({ scope: "blind", claimedRate: 0.65, selectiveProof: PROOF });
    expect(defects).toHaveLength(1);
    expect(defects[0]).toMatch(/exceeds the honest ceiling/);
  });
});

describe("selective claims at or below the blind ceiling", () => {
  it("need no proof object", () => {
    expect(collectCeilingDefects({ scope: "selective", claimedRate: 0.55 })).toEqual([]);
    expect(() =>
      assertClaimWithinCeiling({ scope: "selective", claimedRate: 0.56 }),
    ).not.toThrow();
  });
});

describe("selective claims above the blind ceiling", () => {
  it("pass with a complete, satisfying proof object", () => {
    const defects = collectCeilingDefects({ scope: "selective", claimedRate: 0.6, selectiveProof: PROOF });
    expect(defects).toEqual([]);
    expect(() =>
      assertClaimWithinCeiling({ scope: "selective", claimedRate: 0.6, selectiveProof: PROOF }),
    ).not.toThrow();
  });

  it("REFUSES with no proof object at all", () => {
    const defects = collectCeilingDefects({ scope: "selective", claimedRate: 0.6 });
    expect(defects).toHaveLength(1);
    expect(defects[0]).toMatch(/requires a proof object; none was supplied/);
  });

  it("REFUSES below the firedBets floor (199 < 200)", () => {
    const defects = collectCeilingDefects({
      scope: "selective",
      claimedRate: 0.6,
      selectiveProof: { ...PROOF, firedBets: 199 },
    });
    expect(defects.some((d) => d.includes("firedBets=199"))).toBe(true);
  });

  it("REFUSES without multi-season walk-forward", () => {
    const defects = collectCeilingDefects({
      scope: "selective",
      claimedRate: 0.6,
      selectiveProof: { ...PROOF, multiSeasonWalkForward: false },
    });
    expect(defects.some((d) => d.includes("multiSeasonWalkForward"))).toBe(true);
  });

  it("REFUSES without positive CLV", () => {
    const defects = collectCeilingDefects({
      scope: "selective",
      claimedRate: 0.6,
      selectiveProof: { ...PROOF, positiveClv: false },
    });
    expect(defects.some((d) => d.includes("positiveClv"))).toBe(true);
  });

  it("reports ALL missing legs at once, not just the first", () => {
    const defects = collectCeilingDefects({
      scope: "selective",
      claimedRate: 0.6,
      selectiveProof: { firedBets: 10, multiSeasonWalkForward: false, positiveClv: false },
    });
    expect(defects.length).toBe(3);
  });

  it("exactly at the floor (200 fired bets) passes", () => {
    const defects = collectCeilingDefects({
      scope: "selective",
      claimedRate: 0.6,
      selectiveProof: { ...PROOF, firedBets: 200 },
    });
    expect(defects).toEqual([]);
  });
});

describe("degenerate inputs — refuse, never guess", () => {
  it("rejects a non-finite rate", () => {
    expect(collectCeilingDefects({ scope: "blind", claimedRate: NaN })).toHaveLength(1);
    expect(collectCeilingDefects({ scope: "blind", claimedRate: Infinity })).toHaveLength(1);
  });
  it("rejects a rate outside [0, 1]", () => {
    expect(collectCeilingDefects({ scope: "blind", claimedRate: 1.5 })).toHaveLength(1);
    expect(collectCeilingDefects({ scope: "blind", claimedRate: -0.1 })).toHaveLength(1);
  });
});

describe("HonestCeilingError", () => {
  it("carries the reasons and a human-readable message with the rate/scope", () => {
    try {
      assertClaimWithinCeiling({ scope: "blind", claimedRate: 0.7 });
      throw new Error("expected assertClaimWithinCeiling to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(HonestCeilingError);
      const e = err as HonestCeilingError;
      expect(e.reasons.length).toBeGreaterThan(0);
      expect(e.message).toContain("blind");
      expect(e.message).toContain("70.0%");
    }
  });
});
