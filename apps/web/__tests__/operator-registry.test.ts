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

  it("blocks unknown operators from promo publishing", () => {
    expect(() => assertPromoPublishAllowed("draftkings")).toThrow(
      /not in the registry/
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
      total: 4,
      byClass: {
        APPROVED_PARTNER: 0,
        KNOWN_NOT_PARTNERED: 0,
        DEMO: 4,
        BLOCKED: 0,
      },
      publishablePartners: 0,
    });
  });
});
