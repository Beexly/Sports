import { describe, it, expect } from "vitest";
import { governCost, requirePaidOperation } from "@/lib/cost/cost-governor";

describe("cost governor", () => {
  it("blocks a paid operation with no valid justification (default posture)", () => {
    expect(governCost({ operation: "llm", justification: "blocked" }).decision).toBe("BLOCK");
  });

  it("blocks when a free, rights-cleared source covers the need", () => {
    const r = governCost({
      operation: "odds_api",
      justification: "no_free_cleared_source",
      freeClearedSourceAvailable: true,
    });
    expect(r.decision).toBe("BLOCK");
    expect(r.reason).toMatch(/free, rights-cleared source/i);
  });

  it("requires owner approval to be explicit, never inferred", () => {
    expect(governCost({ operation: "deploy", justification: "owner_approved" }).decision).toBe("BLOCK");
    expect(
      governCost({ operation: "deploy", justification: "owner_approved", ownerApproved: true }).decision
    ).toBe("ALLOW");
  });

  it("allows a validly justified paid operation", () => {
    expect(governCost({ operation: "odds_api", justification: "required_for_proof" }).decision).toBe("ALLOW");
    expect(governCost({ operation: "llm", justification: "user_facing_value" }).decision).toBe("ALLOW");
  });

  it("requirePaidOperation throws on a blocked operation", () => {
    expect(() => requirePaidOperation({ operation: "storage", justification: "blocked" })).toThrow(/blocked/i);
    expect(() => requirePaidOperation({ operation: "storage", justification: "required_for_revenue" })).not.toThrow();
  });
});
