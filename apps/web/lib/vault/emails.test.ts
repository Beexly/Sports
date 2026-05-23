import { describe, expect, it } from "vitest";
import {
  getEmailScheduledAt,
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
});
