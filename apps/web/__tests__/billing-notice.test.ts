import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

/**
 * Dunning UX: getBillingNotice derives the dashboard billing banner
 * from subscription state server-side, and the banner renders the
 * right message per notice kind with the billing-portal button.
 */

const mocks = vi.hoisted(() => ({
  subscriptionFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: { subscription: { findUnique: mocks.subscriptionFindUnique } },
}));

import { getBillingNotice } from "@/lib/billing/notice";
import { PAST_DUE_GRACE_DAYS } from "@/lib/entitlements";
import { BillingNoticeBanner } from "@/components/ui/billing-notice-banner";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("getBillingNotice", () => {
  beforeEach(() => {
    mocks.subscriptionFindUnique.mockReset();
  });

  it("returns null when the user has no subscription record", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue(null);
    expect(await getBillingNotice("user_1")).toBeNull();
  });

  it("returns null for a healthy ACTIVE subscription", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({
      tier: "PRO",
      status: "ACTIVE",
      pastDueSince: null,
    });
    expect(await getBillingNotice("user_1")).toBeNull();
  });

  it("returns null for FREE-tier records regardless of status", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({
      tier: "FREE",
      status: "PAST_DUE",
      pastDueSince: new Date(),
    });
    expect(await getBillingNotice("user_1")).toBeNull();
  });

  it("reports PAST_DUE_IN_GRACE with the grace deadline while inside the window", async () => {
    const pastDueSince = new Date(Date.now() - 2 * DAY_MS);
    mocks.subscriptionFindUnique.mockResolvedValue({
      tier: "PRO",
      status: "PAST_DUE",
      pastDueSince,
    });

    const notice = await getBillingNotice("user_1");

    expect(notice).not.toBeNull();
    expect(notice!.kind).toBe("PAST_DUE_IN_GRACE");
    expect(notice!.tier).toBe("PRO");
    expect(notice!.graceEndsAt!.getTime()).toBe(
      pastDueSince.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS
    );
  });

  it("reports PAST_DUE_EXPIRED once the grace window has passed", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({
      tier: "ELITE",
      status: "PAST_DUE",
      pastDueSince: new Date(Date.now() - (PAST_DUE_GRACE_DAYS + 1) * DAY_MS),
    });

    const notice = await getBillingNotice("user_1");

    expect(notice!.kind).toBe("PAST_DUE_EXPIRED");
    expect(notice!.tier).toBe("ELITE");
  });

  it("reports PAST_DUE_EXPIRED when the anchor is missing (fails closed, matching entitlements)", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({
      tier: "PRO",
      status: "PAST_DUE",
      pastDueSince: null,
    });

    const notice = await getBillingNotice("user_1");

    expect(notice!.kind).toBe("PAST_DUE_EXPIRED");
    expect(notice!.graceEndsAt).toBeNull();
  });

  it("reports INCOMPLETE for subscriptions stuck on payment setup", async () => {
    mocks.subscriptionFindUnique.mockResolvedValue({
      tier: "PRO",
      status: "INCOMPLETE",
      pastDueSince: null,
    });

    const notice = await getBillingNotice("user_1");

    expect(notice!.kind).toBe("INCOMPLETE");
  });

  it("returns null instead of throwing when the DB lookup fails (best-effort banner)", async () => {
    mocks.subscriptionFindUnique.mockRejectedValue(new Error("db down"));
    expect(await getBillingNotice("user_1")).toBeNull();
  });
});

describe("BillingNoticeBanner", () => {
  it("renders the in-grace message with the deadline and the portal button", () => {
    const graceEndsAt = new Date("2026-06-18T16:00:00.000Z");
    render(
      createElement(BillingNoticeBanner, {
        notice: { kind: "PAST_DUE_IN_GRACE", tier: "PRO", graceEndsAt },
      })
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/your card needs attention/i)).toBeInTheDocument();
    expect(screen.getByText(/you keep full access/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage billing/i })).toBeInTheDocument();
  });

  it("renders the paused message after grace expiry", () => {
    render(
      createElement(BillingNoticeBanner, {
        notice: { kind: "PAST_DUE_EXPIRED", tier: "ELITE", graceEndsAt: null },
      })
    );

    expect(screen.getByText(/elite access is paused/i)).toBeInTheDocument();
    expect(screen.getByText(/grace window has ended/i)).toBeInTheDocument();
  });

  it("renders the verification message for INCOMPLETE payments", () => {
    render(
      createElement(BillingNoticeBanner, {
        notice: { kind: "INCOMPLETE", tier: "PRO", graceEndsAt: null },
      })
    );

    expect(screen.getByText(/finish setting up your payment/i)).toBeInTheDocument();
  });
});
