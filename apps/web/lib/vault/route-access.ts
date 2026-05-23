import {
  getVaultAccessState,
  type VaultAccessReason,
} from "./entitlements";
import type { VaultMembershipSnapshot } from "./types";

export type VaultMemberRouteKey =
  | "member_dashboard"
  | "digest_archive"
  | "digest_detail"
  | "office_hours"
  | "quarterly_reviews"
  | "referrals";

export type VaultRouteAccessDecision =
  | {
      route: VaultMemberRouteKey;
      allowed: true;
      reason: VaultAccessReason;
    }
  | {
      route: VaultMemberRouteKey;
      allowed: false;
      reason: VaultAccessReason;
      errorCode: "VAULT_ACCESS_REQUIRED";
    };

export function getVaultRouteAccessDecision(
  route: VaultMemberRouteKey,
  member: VaultMembershipSnapshot | null,
  now = new Date(),
): VaultRouteAccessDecision {
  const access = getVaultAccessState(member, now);

  if (access.hasAccess) {
    return {
      route,
      allowed: true,
      reason: access.reason,
    };
  }

  return {
    route,
    allowed: false,
    reason: access.reason,
    errorCode: "VAULT_ACCESS_REQUIRED",
  };
}
