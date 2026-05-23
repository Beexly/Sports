import type { VaultMembershipSnapshot } from "./types";

const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

export function hasVaultAccess(member: VaultMembershipSnapshot | null): boolean {
  if (!member) {
    return false;
  }

  if (ACCESS_STATUSES.has(member.status)) {
    return true;
  }

  if (member.status !== "canceled" || !member.paidThrough) {
    return false;
  }

  return new Date(member.paidThrough).getTime() > Date.now();
}

export function isFoundingVaultMember(
  member: VaultMembershipSnapshot | null,
): boolean {
  return Boolean(member?.foundingNumber && member.foundingNumber <= 1000);
}
