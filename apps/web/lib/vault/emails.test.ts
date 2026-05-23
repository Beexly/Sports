import { describe, expect, it } from "vitest";
import {
  getEmailScheduledAt,
  getLifecycleEmailDeliveryDecision,
  getLifecycleEmailScheduleItem,
  shouldSkipLifecycleEmail,
  vaultLifecycleEmailSchedule,
  vaultRenewalEmailSchedule,
  vaultRetentionEmailSchedule,
  vaultWelcomeEmailSchedule,
} from "./emails";

describe("Vault lifecycle email schedule", () => {
  it("keeps the welcome sequence on days 0, 1, 3, 7, and 14", () => {
    expect(vaultWelcomeEmailSchedule.map((item) => item.dayOffset)).toEqual([
      0, 1, 3, 7, 14,
    ]);
    expect(vaultWelcomeEmailSchedule.every((item) => item.anchor === "joined_at")).toBe(
      true,
    );
  });

  it("includes retention and renewal cadence from the operating specs", () => {
    expect(vaultRetentionEmailSchedule.map((item) => item.dayOffset)).toEqual([
      30, 60, 90, 180, 335, 365,
    ]);
    expect(vaultRenewalEmailSchedule.map((item) => item.dayOffset)).toEqual([
      -35, -21, -7, 0, 0, 14, 30,
    ]);
    expect(vaultLifecycleEmailSchedule.length).toBe(18);
  });

  it("computes due dates from an anchor date", () => {
    expect(getEmailScheduledAt("2026-05-23T10:00:00.000Z", 3)).toBe(
      "2026-05-26T10:00:00.000Z",
    );
    expect(getEmailScheduledAt("2026-05-23T10:00:00.000Z", -7)).toBe(
      "2026-05-16T10:00:00.000Z",
    );
  });

  it("skips active-member emails when membership is no longer active", () => {
    expect(
      shouldSkipLifecycleEmail(vaultWelcomeEmailSchedule[1], {
        membershipActive: false,
      }),
    ).toBe(true);
  });

  it("skips the day-60 retention email when engagement is healthy", () => {
    const day60 = vaultRetentionEmailSchedule.find(
      (item) => item.templateId === "vault-retention-day-60",
    );

    expect(day60).toBeDefined();
    expect(
      shouldSkipLifecycleEmail(day60!, {
        membershipActive: true,
        engagementHealthy: true,
      }),
    ).toBe(true);
  });

  it("finds schedule items by template id", () => {
    expect(getLifecycleEmailScheduleItem("vault-welcome-day-0")).toMatchObject({
      templateId: "vault-welcome-day-0",
      anchor: "joined_at",
    });
    expect(getLifecycleEmailScheduleItem("not-real")).toBeNull();
  });

  it("sends due lifecycle email rows exactly when eligible", () => {
    expect(
      getLifecycleEmailDeliveryDecision(
        {
          id: "email_1",
          templateId: "vault-welcome-day-0",
          scheduledFor: "2026-05-23T10:00:00.000Z",
          status: "scheduled",
        },
        {
          now: new Date("2026-05-23T10:01:00.000Z"),
          membershipActive: true,
        },
      ),
    ).toEqual({
      status: "send",
      reason: "due",
      lifecycleEmailId: "email_1",
      templateId: "vault-welcome-day-0",
    });
  });

  it("waits for future lifecycle email rows", () => {
    expect(
      getLifecycleEmailDeliveryDecision(
        {
          id: "email_1",
          templateId: "vault-welcome-day-1",
          scheduledFor: "2026-05-24T10:00:00.000Z",
          status: "scheduled",
        },
        {
          now: new Date("2026-05-23T10:00:00.000Z"),
          membershipActive: true,
        },
      ),
    ).toMatchObject({ status: "wait", reason: "not_due" });
  });

  it("skips lifecycle email rows that should not send to inactive or healthy members", () => {
    expect(
      getLifecycleEmailDeliveryDecision(
        {
          id: "email_1",
          templateId: "vault-welcome-day-1",
          scheduledFor: "2026-05-24T10:00:00.000Z",
          status: "scheduled",
        },
        {
          now: new Date("2026-05-25T10:00:00.000Z"),
          membershipActive: false,
        },
      ),
    ).toMatchObject({ status: "skip", reason: "membership_inactive" });

    expect(
      getLifecycleEmailDeliveryDecision(
        {
          id: "email_2",
          templateId: "vault-retention-day-60",
          scheduledFor: "2026-07-22T10:00:00.000Z",
          status: "scheduled",
        },
        {
          now: new Date("2026-07-22T10:00:00.000Z"),
          membershipActive: true,
          engagementHealthy: true,
        },
      ),
    ).toMatchObject({ status: "skip", reason: "engagement_healthy" });
  });

  it("holds lifecycle rows that need operator or provider repair", () => {
    expect(
      getLifecycleEmailDeliveryDecision(
        {
          id: "email_1",
          templateId: "vault-welcome-day-0",
          scheduledFor: "2026-05-23T10:00:00.000Z",
          status: "paused",
        },
        { membershipActive: true },
      ),
    ).toMatchObject({ status: "hold", reason: "paused" });

    expect(
      getLifecycleEmailDeliveryDecision(
        {
          id: "email_2",
          templateId: "vault-welcome-day-0",
          scheduledFor: "2026-05-23T10:00:00.000Z",
          status: "failed",
          sendAttempts: 3,
        },
        { membershipActive: true },
      ),
    ).toMatchObject({ status: "hold", reason: "max_attempts_reached" });

    expect(
      getLifecycleEmailDeliveryDecision(
        {
          id: "email_3",
          templateId: "not-real",
          scheduledFor: "2026-05-23T10:00:00.000Z",
          status: "scheduled",
        },
        { membershipActive: true },
      ),
    ).toMatchObject({ status: "hold", reason: "unknown_template" });
  });
});
