import { describe, expect, it } from "vitest";
import {
  getVaultAccessState,
  hasVaultAccess,
  isFoundingVaultMember,
} from "./entitlements";
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
    const now = new Date("2026-05-23T10:00:00.000Z");
    const future = "2026-05-23T10:01:00.000Z";
    const past = "2026-05-23T09:59:00.000Z";

    expect(
      hasVaultAccess(member({ status: "canceled", paidThrough: future }), now),
    ).toBe(true);
    expect(
      hasVaultAccess(member({ status: "canceled", paidThrough: past }), now),
    ).toBe(false);
  });

  it("returns explainable access-state reasons", () => {
    const now = new Date("2026-05-23T10:00:00.000Z");

    expect(getVaultAccessState(null, now)).toEqual({
      hasAccess: false,
      reason: "no_member",
    });
    expect(getVaultAccessState(member({ status: "active" }), now)).toEqual({
      hasAccess: true,
      reason: "status_grants_access",
    });
    expect(
      getVaultAccessState(
        member({
          status: "active",
          paidThrough: "2026-05-23T09:59:00.000Z",
        }),
        now,
      ),
    ).toEqual({
      hasAccess: false,
      reason: "paid_term_expired",
    });
    expect(
      getVaultAccessState(member({ status: "refunded" }), now),
    ).toEqual({
      hasAccess: false,
      reason: "status_denies_access",
    });
  });

  it("denies malformed canceled paid-through timestamps", () => {
    expect(
      getVaultAccessState(
        member({ status: "canceled", paidThrough: "not-a-date" }),
        new Date("2026-05-23T10:00:00.000Z"),
      ),
    ).toEqual({
      hasAccess: false,
      reason: "paid_term_expired",
    });
  });

  it("denies expired and refunded members", () => {
    expect(hasVaultAccess(member({ status: "expired" }))).toBe(false);
    expect(hasVaultAccess(member({ status: "refunded" }))).toBe(false);
  });

  it("identifies founding members by founding number", () => {
    expect(isFoundingVaultMember(member({ foundingNumber: 1 }))).toBe(true);
    expect(isFoundingVaultMember(member({ foundingNumber: 1000 }))).toBe(true);
    expect(isFoundingVaultMember(member({ foundingNumber: 1001 }))).toBe(false);
  });
});
