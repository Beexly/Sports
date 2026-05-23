import { getVaultDiscordConfig } from "./config";
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
  if (!member.discordUserId) {
    return null;
  }

  const config = getVaultDiscordConfig();
  const rolesToGrant = [config.vaultMemberRoleId];

  if (member.foundingNumber && member.foundingNumber <= 50) {
    rolesToGrant.push(config.vaultFoundingMemberRoleId);
  }

  return {
    memberId: member.memberId,
    discordUserId: member.discordUserId,
    rolesToGrant: rolesToGrant.filter((roleId): roleId is string =>
      Boolean(roleId),
    ),
    rolesToRemove: [],
    shouldSendWelcomeDm: member.status === "active",
  };
}
