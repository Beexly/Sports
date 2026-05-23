import type { VaultMembershipSnapshot } from "./types";

const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

export type VaultAccessReason =
  | "no_member"
  | "status_grants_access"
  | "canceled_paid_term_active"
  | "paid_term_expired"
  | "status_denies_access";

export type VaultAccessState = {
  hasAccess: boolean;
  reason: VaultAccessReason;
};

function isFutureDate(value: string | null | undefined, now: Date) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

export function getVaultAccessState(
  member: VaultMembershipSnapshot | null,
  now = new Date(),
): VaultAccessState {
  if (!member) {
    return {
      hasAccess: false,
      reason: "no_member",
    };
  }

  if (ACCESS_STATUSES.has(member.status)) {
    if (member.paidThrough && !isFutureDate(member.paidThrough, now)) {
      return {
        hasAccess: false,
        reason: "paid_term_expired",
      };
    }

    return {
      hasAccess: true,
      reason: "status_grants_access",
    };
  }

  if (member.status === "canceled" && isFutureDate(member.paidThrough, now)) {
    return {
      hasAccess: true,
      reason: "canceled_paid_term_active",
    };
  }

  if (member.status === "canceled") {
    return {
      hasAccess: false,
      reason: "paid_term_expired",
    };
  }

  return {
    hasAccess: false,
    reason: "status_denies_access",
  };
}

export function hasVaultAccess(
  member: VaultMembershipSnapshot | null,
  now = new Date(),
): boolean {
  return getVaultAccessState(member, now).hasAccess;
}

export function isFoundingVaultMember(
  member: VaultMembershipSnapshot | null,
): boolean {
  return Boolean(member?.foundingNumber && member.foundingNumber <= 1000);
}
