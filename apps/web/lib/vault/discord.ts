import { getVaultDiscordConfig } from "./config";
import { getVaultAccessState } from "./entitlements";
import type { VaultMembershipSnapshot } from "./types";

export type DiscordRoleAssignmentPlan = {
  memberId: string;
  discordUserId: string;
  rolesToGrant: string[];
  rolesToRemove: string[];
  shouldSendWelcomeDm: boolean;
};

export function createDiscordRoleAssignmentPlan(
  member: VaultMembershipSnapshot,
): DiscordRoleAssignmentPlan | null {
  return createDiscordRoleSyncPlan(member, []);
}

export function createDiscordRoleSyncPlan(
  member: VaultMembershipSnapshot,
  currentRoleIds: readonly string[],
  now = new Date(),
): DiscordRoleAssignmentPlan | null {
  if (!member.discordUserId) {
    return null;
  }

  const config = getVaultDiscordConfig();
  const vaultMemberRoleId = config.vaultMemberRoleId;
  const vaultFoundingMemberRoleId = config.vaultFoundingMemberRoleId;
  const managedRoles = [
    vaultMemberRoleId,
    vaultFoundingMemberRoleId,
  ].filter((roleId): roleId is string => Boolean(roleId));
  const currentRoles = new Set(currentRoleIds);
  const accessState = getVaultAccessState(member, now);

  if (!accessState.hasAccess) {
    return {
      memberId: member.memberId,
      discordUserId: member.discordUserId,
      rolesToGrant: [],
      rolesToRemove: managedRoles.filter((roleId) => currentRoles.has(roleId)),
      shouldSendWelcomeDm: false,
    };
  }

  const desiredRoles = [vaultMemberRoleId];

  if (member.foundingNumber && member.foundingNumber <= 50) {
    desiredRoles.push(vaultFoundingMemberRoleId);
  }

  const rolesToGrant = desiredRoles
    .filter((roleId): roleId is string => Boolean(roleId))
    .filter((roleId) => !currentRoles.has(roleId));
  const rolesToRemove = managedRoles.filter(
    (roleId) => !desiredRoles.includes(roleId) && currentRoles.has(roleId),
  );

  return {
    memberId: member.memberId,
    discordUserId: member.discordUserId,
    rolesToGrant,
    rolesToRemove,
    shouldSendWelcomeDm:
      member.status === "active" &&
      Boolean(vaultMemberRoleId) &&
      rolesToGrant.includes(vaultMemberRoleId!),
  };
}
