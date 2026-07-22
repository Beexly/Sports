import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEntitlements } from "@sports/types";

/**
 * settlement-hook.ts — the fan-out the outbox worker calls per settled pick.
 * Pins:
 *   - matches followers by TEAM entityId against BOTH home and away teams
 *   - resolves verifiedEmail from emailVerified (never mails an unconfirmed
 *     address)
 *   - skips non-ELITE followers without ever calling dispatch for them
 *   - FAIL-ISOLATION: a throwing DB lookup, a throwing dispatch call, and a
 *     bad individual follower row all resolve without throwing — this must
 *     never be able to fail the settlement job that calls it.
 */

const mocks = vi.hoisted(() => ({
  watchlistFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  getUserEntitlements: vi.fn(),
  dispatchWatchlistAlert: vi.fn(),
}));

vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("./alert-dispatch", () => ({ dispatchWatchlistAlert: mocks.dispatchWatchlistAlert }));

import { notifyWatchlistFollowersForGradedPick, type GradedPickNotifyEvent } from "./settlement-hook";

function db(overrides: Partial<{ watchlistFindMany: unknown; userFindUnique: unknown }> = {}) {
  return {
    watchlist: { findMany: overrides.watchlistFindMany ?? mocks.watchlistFindMany },
    user: { findUnique: overrides.userFindUnique ?? mocks.userFindUnique },
  };
}

function event(overrides: Partial<GradedPickNotifyEvent> = {}): GradedPickNotifyEvent {
  return {
    pickId: "pick-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    result: "WIN",
    settledAt: new Date("2026-07-19T20:00:00.000Z"),
    sportKey: "americanfootball_nfl",
    homeTeam: { id: "team-home", name: "Chiefs" },
    awayTeam: { id: "team-away", name: "Raiders" },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.watchlistFindMany.mockReset();
  mocks.userFindUnique.mockReset();
  mocks.getUserEntitlements.mockReset();
  mocks.dispatchWatchlistAlert.mockReset().mockResolvedValue({
    sent: true,
    outcome: "dispatched",
    channels: [],
  });
});

describe("notifyWatchlistFollowersForGradedPick", () => {
  it("no-ops with zero I/O when neither team has a resolvable id", async () => {
    await notifyWatchlistFollowersForGradedPick(
      db(),
      event({ homeTeam: { id: null, name: "Chiefs" }, awayTeam: { id: null, name: "Raiders" } }),
    );
    expect(mocks.watchlistFindMany).not.toHaveBeenCalled();
  });

  it("queries watchlist entries for BOTH home and away team ids", async () => {
    mocks.watchlistFindMany.mockResolvedValue([]);
    await notifyWatchlistFollowersForGradedPick(db(), event());
    expect(mocks.watchlistFindMany).toHaveBeenCalledWith({
      where: { entityType: "TEAM", entityId: { in: ["team-home", "team-away"] } },
    });
  });

  it("no-ops when nobody follows either team", async () => {
    mocks.watchlistFindMany.mockResolvedValue([]);
    await notifyWatchlistFollowersForGradedPick(db(), event());
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
  });

  it("dispatches to an ELITE follower with a verified email", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "TEAM", entityId: "team-home" },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));

    await notifyWatchlistFollowersForGradedPick(db(), event());

    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);
    const [dbArg, payload, recipient] = mocks.dispatchWatchlistAlert.mock.calls[0]!;
    expect(dbArg).toBeDefined();
    expect(payload).toMatchObject({
      userId: "user-1",
      entityType: "TEAM",
      entityId: "team-home",
      event: { pickResult: "WIN", settledAt: event().settledAt },
      message: "Chiefs: Chiefs -3.5 graded WIN.",
    });
    expect(recipient).toEqual({ canGetAlerts: true, verifiedEmail: "user@example.com" });
  });

  it("never leaks an unverified email into the dispatch call", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "TEAM", entityId: "team-home" },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: null,
    });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));

    await notifyWatchlistFollowersForGradedPick(db(), event());

    const [, , recipient] = mocks.dispatchWatchlistAlert.mock.calls[0]!;
    expect(recipient.verifiedEmail).toBeNull();
  });

  it("still calls dispatch for a non-ELITE follower — dispatchWatchlistAlert owns the tier gate, not this module", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "TEAM", entityId: "team-away" },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));

    await notifyWatchlistFollowersForGradedPick(db(), event());

    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);
    const [, , recipient] = mocks.dispatchWatchlistAlert.mock.calls[0]!;
    expect(recipient.canGetAlerts).toBe(false);
  });

  it("skips a follower whose user row is gone (deleted account) without throwing", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "ghost-user", entityType: "TEAM", entityId: "team-home" },
    ]);
    mocks.userFindUnique.mockResolvedValue(null);

    const summary = await notifyWatchlistFollowersForGradedPick(db(), event());
    expect(summary).toEqual({ followersMatched: 1, dispatches: [] });
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
  });

  it("FAIL-ISOLATION: a throwing watchlist lookup never propagates", async () => {
    mocks.watchlistFindMany.mockRejectedValue(new Error("db down"));
    await expect(notifyWatchlistFollowersForGradedPick(db(), event())).resolves.toEqual({
      followersMatched: 0,
      dispatches: [],
    });
  });

  it("FAIL-ISOLATION: one follower's dispatch throwing doesn't stop the next follower's", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "TEAM", entityId: "team-home" },
      { id: "wl-2", userId: "user-2", entityType: "TEAM", entityId: "team-away" },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-x",
      email: "user@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));
    mocks.dispatchWatchlistAlert
      .mockRejectedValueOnce(new Error("channel exploded"))
      .mockResolvedValueOnce({ sent: true, outcome: "dispatched", channels: [] });

    const summary = await notifyWatchlistFollowersForGradedPick(db(), event());
    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(2);
    // Both attempts are recorded honestly — the exploded one as hook_error,
    // the surviving one as dispatched.
    expect(summary.dispatches).toHaveLength(2);
    expect(summary.dispatches[0]).toMatchObject({ sent: false, outcome: "hook_error" });
    expect(summary.dispatches[1]).toMatchObject({ sent: true, outcome: "dispatched" });
  });

  it("FAIL-ISOLATION: getUserEntitlements throwing for one follower doesn't stop the run", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "TEAM", entityId: "team-home" },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.getUserEntitlements.mockRejectedValue(new Error("entitlements lookup failed"));

    await expect(notifyWatchlistFollowersForGradedPick(db(), event())).resolves.toEqual({
      followersMatched: 1,
      dispatches: [],
    });
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
  });
});
