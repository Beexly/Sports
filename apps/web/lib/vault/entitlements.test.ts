import { describe, expect, it } from "vitest";
import { hasVaultAccess, isFoundingVaultMember } from "./entitlements";
import type { VaultMembershipSnapshot } from "./types";

function member(
  overrides: Partial<VaultMembershipSnapshot>,
): VaultMembershipSnapshot {
  return {
    memberId: "mem_123",
    email: "member@example.com",
    status: "active",
    ...overrides,
  };
}

describe("Vault entitlements", () => {
  it("grants access to active, trialing, and past-due members", () => {
    expect(hasVaultAccess(member({ status: "active" }))).toBe(true);
    expect(hasVaultAccess(member({ status: "trialing" }))).toBe(true);
    expect(hasVaultAccess(member({ status: "past_due" }))).toBe(true);
  });

  it("keeps canceled members active through paid term", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();

    expect(hasVaultAccess(member({ status: "canceled", paidThrough: future }))).toBe(
      true,
    );
    expect(hasVaultAccess(member({ status: "canceled", paidThrough: past }))).toBe(
      false,
    );
  });

  it("identifies founding members by founding number", () => {
    expect(isFoundingVaultMember(member({ foundingNumber: 1 }))).toBe(true);
    expect(isFoundingVaultMember(member({ foundingNumber: 1000 }))).toBe(true);
    expect(isFoundingVaultMember(member({ foundingNumber: 1001 }))).toBe(false);
  });
});
