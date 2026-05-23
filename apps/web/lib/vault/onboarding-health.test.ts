import { describe, expect, it } from "vitest";
import {
  getOnboardingFailureRate,
  getVaultOnboardingHealth,
} from "./onboarding-health";

const paidAt = "2026-05-23T10:00:00.000Z";

describe("Vault onboarding health", () => {
  it("stays pending before the repair window closes", () => {
    const health = getVaultOnboardingHealth(
      {
        checkoutSessionId: "cs_test",
        email: "member@example.com",
        paidAt,
        timestamps: {
          payment_confirmed: paidAt,
        },
      },
      new Date("2026-05-23T10:10:00.000Z"),
    );

    expect(health.status).toBe("pending");
    expect(health.missing.every((step) => step.severity === "watch")).toBe(
      true,
    );
  });

  it("requires repair when access-critical steps are missing after 15 minutes", () => {
    const health = getVaultOnboardingHealth(
      {
        checkoutSessionId: "cs_test",
        email: "member@example.com",
        paidAt,
        timestamps: {
          payment_confirmed: paidAt,
          member_created: paidAt,
        },
      },
      new Date("2026-05-23T10:16:00.000Z"),
    );

    expect(health.status).toBe("repair_required");
    expect(health.missing).toEqual([
      { step: "discord_role_granted", severity: "repair" },
      { step: "welcome_email_sent", severity: "repair" },
    ]);
  });

  it("treats dashboard view as a day-one watch signal, not an immediate repair", () => {
    const health = getVaultOnboardingHealth(
      {
        checkoutSessionId: "cs_test",
        email: "member@example.com",
        paidAt,
        timestamps: {
          payment_confirmed: paidAt,
          member_created: paidAt,
          discord_role_granted: paidAt,
          welcome_email_sent: paidAt,
        },
      },
      new Date("2026-05-24T10:01:00.000Z"),
    );

    expect(health.status).toBe("pending");
    expect(health.missing).toEqual([
      { step: "dashboard_viewed", severity: "watch" },
    ]);
  });

  it("calculates rolling repair failure rate", () => {
    expect(getOnboardingFailureRate(100, 6)).toBe(0.06);
    expect(getOnboardingFailureRate(0, 6)).toBe(0);
  });
});
