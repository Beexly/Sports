import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GradedEventInput } from "./alert-eligibility";

/**
 * alert-dispatch.ts — now wired to two real channels (push fan-out +
 * email), both mocked at the module boundary so this test never hits real
 * network. Pins:
 *   - the pre-existing gating outcomes (disabled/not_graded/tier_ineligible)
 *     are UNCHANGED by real channel wiring — an ineligible call still
 *     performs zero I/O (never touches the push subscription lookup).
 *   - "no_channel_wired" is preserved verbatim for the case neither
 *     channel is configured at all (the pre-wiring default state).
 *   - a channel failure never takes down the other channel or the caller.
 *   - `sent: true` is claimed ONLY when a channel actually delivered.
 */

const mocks = vi.hoisted(() => ({
  listPushSubscriptionsForUser: vi.fn(),
  sendWebPushAlert: vi.fn(),
  isWebPushConfigured: vi.fn(),
  sendAlertEmail: vi.fn(),
  isEmailConfigured: vi.fn(),
}));

vi.mock("@/lib/push/subscription-db", () => ({
  listPushSubscriptionsForUser: mocks.listPushSubscriptionsForUser,
}));

vi.mock("./channels/web-push-channel", () => ({
  sendWebPushAlert: mocks.sendWebPushAlert,
  isWebPushConfigured: mocks.isWebPushConfigured,
}));

vi.mock("./channels/email-channel", () => ({
  sendAlertEmail: mocks.sendAlertEmail,
  isEmailConfigured: mocks.isEmailConfigured,
}));

import { dispatchWatchlistAlert, isWatchlistAlertsEnabled } from "./alert-dispatch";

const ORIGINAL_ENV = process.env["WATCHLIST_ALERTS_ENABLED"];

beforeEach(() => {
  delete process.env["WATCHLIST_ALERTS_ENABLED"];
  mocks.listPushSubscriptionsForUser.mockReset();
  mocks.sendWebPushAlert.mockReset();
  mocks.isWebPushConfigured.mockReset().mockReturnValue(false);
  mocks.sendAlertEmail.mockReset();
  mocks.isEmailConfigured.mockReset().mockReturnValue(false);
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env["WATCHLIST_ALERTS_ENABLED"];
  } else {
    process.env["WATCHLIST_ALERTS_ENABLED"] = ORIGINAL_ENV;
  }
});

const gradedWin: GradedEventInput = {
  pickResult: "WIN",
  settledAt: new Date("2026-07-16T20:00:00.000Z"),
};
const ungradedPending: GradedEventInput = { pickResult: "PENDING", settledAt: null };

function payload(event: GradedEventInput) {
  return {
    userId: "user-1",
    entityType: "TEAM" as const,
    entityId: "team-1",
    event,
    message: "Chiefs -3.5 graded WIN.",
  };
}

const FAKE_DB = { irrelevant: true };

describe("isWatchlistAlertsEnabled", () => {
  it("defaults OFF when unset", () => {
    expect(isWatchlistAlertsEnabled({})).toBe(false);
  });

  it("is on only for the exact string 'true'", () => {
    expect(isWatchlistAlertsEnabled({ WATCHLIST_ALERTS_ENABLED: "true" })).toBe(true);
    expect(isWatchlistAlertsEnabled({ WATCHLIST_ALERTS_ENABLED: "1" })).toBe(false);
    expect(isWatchlistAlertsEnabled({ WATCHLIST_ALERTS_ENABLED: "TRUE" })).toBe(false);
  });
});

describe("dispatchWatchlistAlert — gating is unchanged by real channel wiring", () => {
  it("no-ops with outcome 'disabled' when the flag is unset (default) — zero I/O", async () => {
    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), { canGetAlerts: true });
    expect(result).toEqual({ sent: false, outcome: "disabled", channels: [] });
    expect(mocks.listPushSubscriptionsForUser).not.toHaveBeenCalled();
    expect(mocks.sendAlertEmail).not.toHaveBeenCalled();
  });

  it("PLANTED UNGRADED EVENT: never sends even when enabled + Elite, flag on — zero I/O", async () => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    const result = await dispatchWatchlistAlert(FAKE_DB, payload(ungradedPending), {
      canGetAlerts: true,
    });
    expect(result).toEqual({ sent: false, outcome: "not_graded", channels: [] });
    expect(mocks.listPushSubscriptionsForUser).not.toHaveBeenCalled();
  });

  it("blocks a non-Elite recipient even for a graded event with the flag on — zero I/O", async () => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), {
      canGetAlerts: false,
    });
    expect(result).toEqual({ sent: false, outcome: "tier_ineligible", channels: [] });
    expect(mocks.listPushSubscriptionsForUser).not.toHaveBeenCalled();
  });

  it("never throws even on a malformed payload", async () => {
    // @ts-expect-error — deliberately malformed to exercise the catch-all.
    await expect(dispatchWatchlistAlert(FAKE_DB, null, { canGetAlerts: true })).resolves.toEqual({
      sent: false,
      outcome: "disabled",
      channels: [],
    });
  });
});

describe("dispatchWatchlistAlert — eligible, neither channel configured", () => {
  it("reports 'no_channel_wired' (the pre-wiring honest default state)", async () => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    mocks.listPushSubscriptionsForUser.mockResolvedValue({ ok: true, data: [] });

    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), { canGetAlerts: true });
    expect(result.sent).toBe(false);
    expect(result.outcome).toBe("no_channel_wired");
  });
});

describe("dispatchWatchlistAlert — push fan-out", () => {
  beforeEach(() => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    mocks.isWebPushConfigured.mockReturnValue(true);
  });

  it("eligible, push configured, but zero stored subscriptions and no verified email → no_recipients", async () => {
    mocks.listPushSubscriptionsForUser.mockResolvedValue({ ok: true, data: [] });

    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), { canGetAlerts: true });
    expect(result).toEqual({
      sent: false,
      outcome: "no_recipients",
      channels: [
        { channel: "push", sent: false, detail: "no_subscriptions" },
        { channel: "email", sent: false, detail: "no_verified_email" },
      ],
    });
  });

  it("sends to every stored subscription, isolating one device's failure from another's success", async () => {
    mocks.listPushSubscriptionsForUser.mockResolvedValue({
      ok: true,
      data: [
        { id: "sub-1", userId: "user-1", endpoint: "https://a", p256dh: "p1", auth: "a1" },
        { id: "sub-2", userId: "user-1", endpoint: "https://b", p256dh: "p2", auth: "a2" },
      ],
    });
    mocks.sendWebPushAlert
      .mockResolvedValueOnce({ sent: false, detail: "send_failed" })
      .mockResolvedValueOnce({ sent: true, detail: "sent" });

    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), { canGetAlerts: true });
    expect(result.sent).toBe(true);
    expect(result.outcome).toBe("dispatched");
    expect(result.channels).toEqual([
      { channel: "push", sent: false, detail: "send_failed" },
      { channel: "push", sent: true, detail: "sent" },
      { channel: "email", sent: false, detail: "no_verified_email" },
    ]);
    expect(mocks.sendWebPushAlert).toHaveBeenCalledTimes(2);
  });

  it("every device failing → delivery_failed, not dispatched, and never sent:true", async () => {
    mocks.listPushSubscriptionsForUser.mockResolvedValue({
      ok: true,
      data: [{ id: "sub-1", userId: "user-1", endpoint: "https://a", p256dh: "p1", auth: "a1" }],
    });
    mocks.sendWebPushAlert.mockResolvedValue({ sent: false, detail: "send_failed" });

    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), { canGetAlerts: true });
    expect(result.sent).toBe(false);
    expect(result.outcome).toBe("delivery_failed");
  });

  it("a table_missing push lookup degrades to zero subscriptions, never throws", async () => {
    mocks.listPushSubscriptionsForUser.mockResolvedValue({ ok: false, reason: "table_missing" });

    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), { canGetAlerts: true });
    expect(result.sent).toBe(false);
    expect(result.channels[0]).toEqual({ channel: "push", sent: false, detail: "lookup_failed" });
  });
});

describe("dispatchWatchlistAlert — email", () => {
  beforeEach(() => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    mocks.listPushSubscriptionsForUser.mockResolvedValue({ ok: true, data: [] });
    mocks.isEmailConfigured.mockReturnValue(true);
  });

  it("never emails an unverified/missing address", async () => {
    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), { canGetAlerts: true });
    expect(mocks.sendAlertEmail).not.toHaveBeenCalled();
    expect(result.channels).toContainEqual({
      channel: "email",
      sent: false,
      detail: "no_verified_email",
    });
  });

  it("emails a verified address and reports sent:true", async () => {
    mocks.sendAlertEmail.mockResolvedValue({ sent: true, detail: "sent" });

    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), {
      canGetAlerts: true,
      verifiedEmail: "user@example.com",
    });
    expect(result.sent).toBe(true);
    expect(result.outcome).toBe("dispatched");
    expect(mocks.sendAlertEmail).toHaveBeenCalledWith(
      "user@example.com",
      "GalaxySportsEdge — your watchlist pick graded",
      "Chiefs -3.5 graded WIN.",
    );
  });

  it("cross-channel isolation: push fails entirely but a working email channel still delivers", async () => {
    mocks.isWebPushConfigured.mockReturnValue(true);
    mocks.listPushSubscriptionsForUser.mockResolvedValue({
      ok: true,
      data: [{ id: "sub-1", userId: "user-1", endpoint: "https://a", p256dh: "p1", auth: "a1" }],
    });
    mocks.sendWebPushAlert.mockResolvedValue({ sent: false, detail: "send_failed" });
    mocks.sendAlertEmail.mockResolvedValue({ sent: true, detail: "sent" });

    const result = await dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), {
      canGetAlerts: true,
      verifiedEmail: "user@example.com",
    });
    expect(result.sent).toBe(true);
    expect(result.outcome).toBe("dispatched");
    expect(result.channels).toEqual([
      { channel: "push", sent: false, detail: "send_failed" },
      { channel: "email", sent: true, detail: "sent" },
    ]);
  });

  it("a rejected email send never throws out of dispatchWatchlistAlert (belt-and-suspenders on top of the channel's own fail-isolation)", async () => {
    mocks.sendAlertEmail.mockRejectedValue(new Error("boom"));

    // sendAlertEmail itself is fail-isolated in production (see
    // email-channel.test.ts); this simulates a contract violation to prove
    // dispatchWatchlistAlert's own top-level try/catch is a real backstop,
    // not just documentation.
    await expect(
      dispatchWatchlistAlert(FAKE_DB, payload(gradedWin), {
        canGetAlerts: true,
        verifiedEmail: "user@example.com",
      }),
    ).resolves.toEqual({ sent: false, outcome: "disabled", channels: [] });
  });
});
