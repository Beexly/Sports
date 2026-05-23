import { describe, expect, it } from "vitest";
import { createDiscordRoleAssignmentPlan } from "./discord";

describe("Vault Discord role planning", () => {
  it("returns null when no Discord user is mapped", () => {
    expect(
      createDiscordRoleAssignmentPlan({
        memberId: "mem_1",
        email: "member@example.com",
        status: "active",
      }),
    ).toBeNull();
  });

  it("plans Vault and founding roles when env role IDs exist", () => {
    process.env.DISCORD_VAULT_MEMBER_ROLE_ID = "role_vault";
    process.env.DISCORD_VAULT_FOUNDING_MEMBER_ROLE_ID = "role_founder";

    expect(
      createDiscordRoleAssignmentPlan({
        memberId: "mem_1",
        email: "member@example.com",
        discordUserId: "discord_1",
        foundingNumber: 12,
        status: "active",
      }),
    ).toEqual({
      memberId: "mem_1",
      discordUserId: "discord_1",
      rolesToGrant: ["role_vault", "role_founder"],
      rolesToRemove: [],
      shouldSendWelcomeDm: true,
    });
  });
});
