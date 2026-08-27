import { describe, it, expect } from "vitest";
import { dischargeRelationClaims, type RelationClaim, type RelationFact } from "./relation-claim-guard";

describe("dischargeRelationClaims", () => {
  it("discharges a claim that exactly matches its fact", () => {
    const claims: RelationClaim[] = [{ relation: "ATS_RECORD", subject: "PHI", window: 10, value: 7 }];
    const facts: RelationFact[] = [{ relation: "ATS_RECORD", subject: "PHI", window: 10, value: 7 }];
    const result = dischargeRelationClaims(claims, facts);
    expect(result.ok).toBe(true);
    expect(result.claimCount).toBe(1);
    expect(result.failed).toEqual([]);
  });

  it("catches the headline failure mode: a value that is real in the payload but attached to the wrong relation — flat value-membership would wrongly ground this", () => {
    const claims: RelationClaim[] = [{ relation: "ATS_RECORD", subject: "PHI", window: 10, value: 7 }];
    const facts: RelationFact[] = [
      { relation: "ATS_RECORD", subject: "PHI", window: 10, value: 5 }, // the TRUE ATS record
      { relation: "OVER_RECORD", subject: "PHI", window: 10, value: 7 }, // 7 is real, but for a different relation
    ];
    const result = dischargeRelationClaims(claims, facts);
    expect(result.ok).toBe(false);
    expect(result.failed).toEqual(claims);
  });

  it("fails a claim whose value is correct for the relation but attached to the wrong subject", () => {
    const claims: RelationClaim[] = [{ relation: "ATS_RECORD", subject: "PHI", value: 7 }];
    const facts: RelationFact[] = [
      { relation: "ATS_RECORD", subject: "DAL", value: 7 }, // right relation+value, wrong team
    ];
    expect(dischargeRelationClaims(claims, facts).ok).toBe(false);
  });

  it("fails a claim whose relation+subject+value are correct but the window doesn't match", () => {
    const claims: RelationClaim[] = [{ relation: "ATS_RECORD", subject: "PHI", window: 10, value: 7 }];
    const facts: RelationFact[] = [{ relation: "ATS_RECORD", subject: "PHI", window: 5, value: 7 }];
    expect(dischargeRelationClaims(claims, facts).ok).toBe(false);
  });

  it("treats an omitted window on both claim and fact as a matching (consistent) key", () => {
    const claims: RelationClaim[] = [{ relation: "SEASON_WINS", subject: "PHI", value: 12 }];
    const facts: RelationFact[] = [{ relation: "SEASON_WINS", subject: "PHI", value: 12 }];
    expect(dischargeRelationClaims(claims, facts).ok).toBe(true);
  });

  it("respects tolerance: within it discharges, just outside it fails", () => {
    const facts: RelationFact[] = [{ relation: "PPG", subject: "PHI", value: 24.5 }];
    const inTolerance = dischargeRelationClaims([{ relation: "PPG", subject: "PHI", value: 24.55 }], facts, 0.1);
    expect(inTolerance.ok).toBe(true);
    const outOfTolerance = dischargeRelationClaims([{ relation: "PPG", subject: "PHI", value: 24.7 }], facts, 0.1);
    expect(outOfTolerance.ok).toBe(false);
  });

  it("reports exactly the failed claims among a mix of grounded and fabricated ones", () => {
    const claims: RelationClaim[] = [
      { relation: "ATS_RECORD", subject: "PHI", value: 7 }, // grounded
      { relation: "ATS_RECORD", subject: "DAL", value: 99 }, // fabricated -- no such fact at all
      { relation: "OVER_RECORD", subject: "PHI", value: 5 }, // grounded
    ];
    const facts: RelationFact[] = [
      { relation: "ATS_RECORD", subject: "PHI", value: 7 },
      { relation: "OVER_RECORD", subject: "PHI", value: 5 },
    ];
    const result = dischargeRelationClaims(claims, facts);
    expect(result.ok).toBe(false);
    expect(result.claimCount).toBe(3);
    expect(result.failed).toEqual([{ relation: "ATS_RECORD", subject: "DAL", value: 99 }]);
  });

  it("passes vacuously on an empty claim list, regardless of the fact payload", () => {
    const result = dischargeRelationClaims([], [{ relation: "ATS_RECORD", subject: "PHI", value: 7 }]);
    expect(result.ok).toBe(true);
    expect(result.claimCount).toBe(0);
  });

  it("never requires every fact to be claimed -- unclaimed facts are fine", () => {
    const claims: RelationClaim[] = [{ relation: "ATS_RECORD", subject: "PHI", value: 7 }];
    const facts: RelationFact[] = [
      { relation: "ATS_RECORD", subject: "PHI", value: 7 },
      { relation: "OVER_RECORD", subject: "PHI", value: 5 }, // unclaimed, irrelevant
    ];
    expect(dischargeRelationClaims(claims, facts).ok).toBe(true);
  });

  it("throws on an ambiguous payload — two facts sharing the same (relation, subject, window) key", () => {
    const facts: RelationFact[] = [
      { relation: "ATS_RECORD", subject: "PHI", value: 7 },
      { relation: "ATS_RECORD", subject: "PHI", value: 8 }, // same key, conflicting value
    ];
    expect(() => dischargeRelationClaims([], facts)).toThrow(RangeError);
  });

  it("throws on a non-finite or negative tolerance", () => {
    expect(() => dischargeRelationClaims([], [], Infinity)).toThrow(RangeError);
    expect(() => dischargeRelationClaims([], [], NaN)).toThrow(RangeError);
    expect(() => dischargeRelationClaims([], [], -0.1)).toThrow(RangeError);
  });

  it("is deterministic across repeated calls on identical input", () => {
    const claims: RelationClaim[] = [{ relation: "ATS_RECORD", subject: "PHI", window: 10, value: 7 }];
    const facts: RelationFact[] = [{ relation: "ATS_RECORD", subject: "PHI", window: 10, value: 7.02 }];
    const a = dischargeRelationClaims(claims, facts);
    const b = dischargeRelationClaims(claims, facts);
    expect(a).toEqual(b);
  });
});
