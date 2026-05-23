import { describe, expect, it } from "vitest";
import {
  getOnboardingRepairTasks,
  getProofSurfaceRepairTasks,
  getProviderRepairTasks,
} from "./admin-repair-tasks";

describe("admin repair tasks", () => {
  it("creates p0 repair tasks for onboarding repair failures", () => {
    expect(
      getOnboardingRepairTasks({
        checkoutSessionId: "cs_test",
        email: "member@example.com",
        status: "repair_required",
        ageMinutes: 16,
        missing: [
          { step: "discord_role_granted", severity: "repair" },
          { step: "dashboard_viewed", severity: "watch" },
        ],
      }),
    ).toEqual([
      {
        source: "vault_onboarding",
        severity: "p0",
        title: "Repair Vault onboarding: discord_role_granted",
        entityKey: "cs_test",
        reason:
          "member@example.com is missing discord_role_granted 16 minutes after payment.",
      },
    ]);
  });

  it("does not create repair tasks for pending watch-only onboarding health", () => {
    expect(
      getOnboardingRepairTasks({
        checkoutSessionId: "cs_test",
        email: "member@example.com",
        status: "pending",
        ageMinutes: 5,
        missing: [{ step: "welcome_email_sent", severity: "watch" }],
      }),
    ).toEqual([]);
  });

  it("creates provider tasks for stale and unconfigured heartbeats", () => {
    expect(
      getProviderRepairTasks([
        {
          key: "stripe_webhook",
          label: "Stripe webhook receipt",
          maxStaleMinutes: 60,
          lastOkAt: "2026-05-23T10:00:00.000Z",
          ageMinutes: 61,
          status: "stale",
        },
        {
          key: "discord_bot",
          label: "Discord bot permissions",
          maxStaleMinutes: 60,
          lastOkAt: null,
          ageMinutes: null,
          status: "unconfigured",
        },
      ]),
    ).toEqual([
      {
        source: "provider_heartbeat",
        severity: "p0",
        title: "Check provider: Stripe webhook receipt",
        entityKey: "stripe_webhook",
        reason: "Stripe webhook receipt heartbeat is 61 minutes old.",
      },
      {
        source: "provider_heartbeat",
        severity: "p1",
        title: "Check provider: Discord bot permissions",
        entityKey: "discord_bot",
        reason: "Discord bot permissions heartbeat is not configured.",
      },
    ]);
  });

  it("creates proof-surface tasks only for stale proof surfaces", () => {
    expect(
      getProofSurfaceRepairTasks([
        {
          surface: "methodology",
          label: "Methodology",
          updatedAt: "2026-05-01T00:00:00.000Z",
          maxStaleDays: 30,
          ageDays: 5,
          status: "fresh",
        },
        {
          surface: "loss-room",
          label: "Loss Room",
          updatedAt: "2026-05-01T00:00:00.000Z",
          maxStaleDays: 7,
          ageDays: 8,
          status: "stale",
        },
      ]),
    ).toEqual([
      {
        source: "proof_surface_freshness",
        severity: "p1",
        title: "Refresh proof surface: Loss Room",
        entityKey: "loss-room",
        reason: "Loss Room is 8 days old; max stale window is 7 days.",
      },
    ]);
  });
});
