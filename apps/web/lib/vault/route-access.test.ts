import { describe, expect, it } from "vitest";
import { getVaultRouteAccessDecision } from "./route-access";

describe("Vault route access", () => {
  it("allows member routes when entitlement grants access", () => {
    expect(
      getVaultRouteAccessDecision(
        "member_dashboard",
        {
          memberId: "mem_1",
          email: "member@example.com",
          status: "active",
        },
        new Date("2026-05-23T10:00:00.000Z"),
      ),
    ).toEqual({
      route: "member_dashboard",
      allowed: true,
      reason: "status_grants_access",
    });
  });

  it("denies member routes with explainable reason codes", () => {
    expect(
      getVaultRouteAccessDecision(
        "quarterly_reviews",
        {
          memberId: "mem_1",
          email: "member@example.com",
          status: "refunded",
        },
        new Date("2026-05-23T10:00:00.000Z"),
      ),
    ).toEqual({
      route: "quarterly_reviews",
      allowed: false,
      reason: "status_denies_access",
      errorCode: "VAULT_ACCESS_REQUIRED",
    });
  });
});
