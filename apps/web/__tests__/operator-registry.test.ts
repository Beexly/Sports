import { describe, expect, it } from "vitest";
import {
  assertPromoPublishAllowed,
  getOperator,
  isOperatorLicensedInState,
  listPublicOperators,
  OperatorRegistryError,
  summarizeRegistry,
} from "@/lib/cockpit/operator-registry";

describe("operator registry", () => {
  it("normalizes operator lookup keys", () => {
    expect(getOperator("STELLAR")?.key).toBe("stellar");
    expect(getOperator("missing")).toBeUndefined();
  });

  it("blocks demo operators from promo publishing", () => {
    expect(() => assertPromoPublishAllowed("stellar")).toThrow(
      OperatorRegistryError
    );
  });

  it("blocks operators that are not in the registry at all", () => {
    expect(() => assertPromoPublishAllowed("totally-unknown-book")).toThrow(
      /not in the registry/
    );
  });

  it("blocks real but not-yet-partnered operators (affiliate not signed)", () => {
    // DraftKings is a real, recognized operator but KNOWN_NOT_PARTNERED until
    // an affiliate agreement is signed and its class is flipped to APPROVED_PARTNER.
    expect(getOperator("draftkings")?.operatorClass).toBe("KNOWN_NOT_PARTNERED");
    expect(() => assertPromoPublishAllowed("draftkings")).toThrow(
      /only APPROVED_PARTNER/
    );
  });

  it("does not expose public operators without approved partners", () => {
    expect(listPublicOperators()).toHaveLength(0);
  });

  it("returns false for state licensing unless a state is explicitly listed", () => {
    expect(isOperatorLicensedInState("stellar", "NJ")).toBe(false);
    expect(isOperatorLicensedInState("missing", "NJ")).toBe(false);
  });

  it("summarizes registry counts", () => {
    expect(summarizeRegistry()).toEqual({
      total: 11,
      byClass: {
        APPROVED_PARTNER: 0,
        KNOWN_NOT_PARTNERED: 7,
        DEMO: 4,
        BLOCKED: 0,
      },
      publishablePartners: 0,
    });
  });
});
