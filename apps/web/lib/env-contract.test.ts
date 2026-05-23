import { describe, expect, it } from "vitest";
import {
  envContract,
  getEnvReadinessReport,
  listEnvRequirements,
} from "./env-contract";

describe("env contract", () => {
  it("keeps environment variable names unique", () => {
    const names = envContract.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("requires launch-critical Stripe, Discord, and email variables", () => {
    const launchNames = listEnvRequirements("vault-launch").map(
      (item) => item.name,
    );

    expect(launchNames).toEqual(
      expect.arrayContaining([
        "STRIPE_VAULT_PRICE_ID",
        "STRIPE_WEBHOOK_SECRET",
        "DISCORD_BOT_TOKEN",
        "DISCORD_GALAXY_GUILD_ID",
        "DISCORD_VAULT_MEMBER_ROLE_ID",
        "DISCORD_VAULT_FOUNDING_MEMBER_ROLE_ID",
        "TRANSACTIONAL_EMAIL_PROVIDER",
        "TRANSACTIONAL_EMAIL_API_KEY",
        "TRANSACTIONAL_EMAIL_FROM",
      ]),
    );
  });

  it("reports missing launch variables without reading real secrets", () => {
    const report = getEnvReadinessReport(
      {
        STRIPE_VAULT_PRICE_ID: "price_test",
      },
      "vault-launch",
    );

    expect(report.ok).toBe(false);
    expect(report.missing.map((item) => item.name)).toContain(
      "DISCORD_BOT_TOKEN",
    );
    expect(report.missing.map((item) => item.name)).not.toContain(
      "STRIPE_VAULT_PRICE_ID",
    );
  });
});
