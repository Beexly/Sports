import { describe, expect, it } from "vitest";
import {
  createDiscordRoleAssignmentPlan,
  createDiscordRoleSyncPlan,
} from "./discord";

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

  it("does not re-grant roles already present", () => {
    process.env.DISCORD_VAULT_MEMBER_ROLE_ID = "role_vault";
    process.env.DISCORD_VAULT_FOUNDING_MEMBER_ROLE_ID = "role_founder";

    expect(
      createDiscordRoleSyncPlan(
        {
          memberId: "mem_1",
          email: "member@example.com",
          discordUserId: "discord_1",
          foundingNumber: 12,
          status: "active",
        },
        ["role_vault"],
      ),
    ).toEqual({
      memberId: "mem_1",
      discordUserId: "discord_1",
      rolesToGrant: ["role_founder"],
      rolesToRemove: [],
      shouldSendWelcomeDm: false,
    });
  });

  it("removes managed roles when Vault access has ended", () => {
    process.env.DISCORD_VAULT_MEMBER_ROLE_ID = "role_vault";
    process.env.DISCORD_VAULT_FOUNDING_MEMBER_ROLE_ID = "role_founder";

    expect(
      createDiscordRoleSyncPlan(
        {
          memberId: "mem_1",
          email: "member@example.com",
          discordUserId: "discord_1",
          foundingNumber: 12,
          status: "expired",
          paidThrough: "2026-05-01T00:00:00.000Z",
        },
        ["role_vault", "role_founder", "role_unmanaged"],
        new Date("2026-05-23T00:00:00.000Z"),
      ),
    ).toEqual({
      memberId: "mem_1",
      discordUserId: "discord_1",
      rolesToGrant: [],
      rolesToRemove: ["role_vault", "role_founder"],
      shouldSendWelcomeDm: false,
    });
  });

  it("keeps canceled members in Discord through the paid term", () => {
    process.env.DISCORD_VAULT_MEMBER_ROLE_ID = "role_vault";
    process.env.DISCORD_VAULT_FOUNDING_MEMBER_ROLE_ID = "role_founder";

    expect(
      createDiscordRoleSyncPlan(
        {
          memberId: "mem_1",
          email: "member@example.com",
          discordUserId: "discord_1",
          foundingNumber: 51,
          status: "canceled",
          paidThrough: "2026-06-01T00:00:00.000Z",
        },
        [],
        new Date("2026-05-23T00:00:00.000Z"),
      ),
    ).toMatchObject({
      rolesToGrant: ["role_vault"],
      rolesToRemove: [],
    });
  });
});
