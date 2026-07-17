import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dispatchWatchlistAlert, isWatchlistAlertsEnabled } from "./alert-dispatch";
import type { GradedEventInput } from "./alert-eligibility";

/**
 * alert-dispatch.ts is INERT by default (WATCHLIST_ALERTS_ENABLED unset).
 * No SMTP/push channel is wired in this repo yet, so even a fully-eligible
 * alert today reports `sent: false, outcome: "no_channel_wired"` — that is
 * the honest, ships-dark state, not a bug.
 */

const ORIGINAL_ENV = process.env["WATCHLIST_ALERTS_ENABLED"];

beforeEach(() => {
  delete process.env["WATCHLIST_ALERTS_ENABLED"];
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

describe("dispatchWatchlistAlert — never sends without a real channel", () => {
  it("no-ops with outcome 'disabled' when the flag is unset (default)", async () => {
    const result = await dispatchWatchlistAlert(payload(gradedWin), { canGetAlerts: true });
    expect(result).toEqual({ sent: false, outcome: "disabled" });
  });

  it("PLANTED UNGRADED EVENT: never sends even when enabled + Elite, flag on", async () => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    const result = await dispatchWatchlistAlert(payload(ungradedPending), { canGetAlerts: true });
    expect(result).toEqual({ sent: false, outcome: "not_graded" });
  });

  it("blocks a non-Elite recipient even for a graded event with the flag on", async () => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    const result = await dispatchWatchlistAlert(payload(gradedWin), { canGetAlerts: false });
    expect(result).toEqual({ sent: false, outcome: "tier_ineligible" });
  });

  it("a fully-eligible alert (enabled, Elite, graded) still reports sent:false — no channel is wired", async () => {
    process.env["WATCHLIST_ALERTS_ENABLED"] = "true";
    const result = await dispatchWatchlistAlert(payload(gradedWin), { canGetAlerts: true });
    expect(result).toEqual({ sent: false, outcome: "no_channel_wired" });
  });

  it("never throws even on a malformed payload", async () => {
    // @ts-expect-error — deliberately malformed to exercise the catch-all.
    await expect(dispatchWatchlistAlert(null, { canGetAlerts: true })).resolves.toEqual({
      sent: false,
      outcome: "disabled",
    });
  });
});
