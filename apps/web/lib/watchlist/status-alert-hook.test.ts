import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEntitlements } from "@sports/types";

/**
 * status-alert-hook.ts — C-413's fan-out for watched-player injury /
 * depth-chart status changes.
 *
 * DoD pin: ONE status change → ONE dispatch; a re-run against unchanged
 * upstream data dispatches NOTHING (the diff is the dedup — there is no
 * "already notified" ledger).
 *
 * Also pins:
 *   - the Elite gate is owned by dispatchWatchlistAlert, not this module
 *     (a FREE follower still reaches dispatch; dispatch returns tier_ineligible)
 *   - verifiedEmail is resolved from emailVerified, never a raw address
 *   - FAIL-ISOLATION: a throwing lookup / dispatch never throws back into
 *     the injury cron that calls this.
 */

const mocks = vi.hoisted(() => ({
  watchlistFindMany: vi.fn(),
  injuryFindMany: vi.fn(),
  depthFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  getUserEntitlements: vi.fn(),
  dispatchWatchlistAlert: vi.fn(),
}));

vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("./alert-dispatch", () => ({ dispatchWatchlistAlert: mocks.dispatchWatchlistAlert }));

import {
  diffPlayerStatus,
  buildStatusChangeMessage,
  getWatchedPlayerIds,
  snapshotWatchedPlayerStatus,
  notifyWatchlistFollowersForStatusChanges,
  loadStatusSnapshot,
  dispatchStatusChangeAlerts,
  type PlayerStatusSnapshot,
} from "./status-alert-hook";

function db(
  overrides: Partial<{
    watchlistFindMany: unknown;
    injuryFindMany: unknown;
    depthFindMany: unknown;
    userFindUnique: unknown;
  }> = {},
) {
  return {
    watchlist: { findMany: overrides.watchlistFindMany ?? mocks.watchlistFindMany },
    injury: { findMany: overrides.injuryFindMany ?? mocks.injuryFindMany },
    depthChartEntry: { findMany: overrides.depthFindMany ?? mocks.depthFindMany },
    user: { findUnique: overrides.userFindUnique ?? mocks.userFindUnique },
  };
}

const healthy: PlayerStatusSnapshot = {
  playerId: "player-1",
  playerName: "Patrick Mahomes",
  injuryStatus: null,
  depthRank: 1,
};
const questionable: PlayerStatusSnapshot = {
  ...healthy,
  injuryStatus: "Questionable",
};
const out: PlayerStatusSnapshot = {
  ...healthy,
  injuryStatus: "Out",
};

beforeEach(() => {
  mocks.watchlistFindMany.mockReset();
  mocks.injuryFindMany.mockReset();
  mocks.depthFindMany.mockReset();
  mocks.userFindUnique.mockReset();
  mocks.getUserEntitlements.mockReset();
  mocks.dispatchWatchlistAlert.mockReset().mockResolvedValue({
    sent: true,
    outcome: "dispatched",
    channels: [],
  });
});

describe("diffPlayerStatus — the dedup IS the diff", () => {
  it("returns one injury change when reportStatus moves", () => {
    const changes = diffPlayerStatus([questionable], [out]);
    expect(changes).toEqual([
      {
        playerId: "player-1",
        playerName: "Patrick Mahomes",
        statusKind: "injury",
        previous: "Questionable",
        current: "Out",
      },
    ]);
  });

  it("returns one depth-chart change when the slot moves", () => {
    const changes = diffPlayerStatus(
      [{ ...healthy, depthRank: 2 }],
      [{ ...healthy, depthRank: 1 }],
    );
    expect(changes).toEqual([
      {
        playerId: "player-1",
        playerName: "Patrick Mahomes",
        statusKind: "depth_chart",
        previous: "2",
        current: "1",
      },
    ]);
  });

  it("returns BOTH changes when injury and depth move together", () => {
    const changes = diffPlayerStatus(
      [{ ...healthy, injuryStatus: "Questionable", depthRank: 2 }],
      [{ ...healthy, injuryStatus: "Out", depthRank: 1 }],
    );
    expect(changes).toHaveLength(2);
    expect(changes.map((c) => c.statusKind).sort()).toEqual(["depth_chart", "injury"]);
  });

  it("RE-RUN: identical snapshots produce zero changes", () => {
    // This is the entire no-duplicate-on-re-run guarantee. The cron
    // re-ingests the same upstream rows; before === after; nothing fires.
    expect(diffPlayerStatus([out], [out])).toEqual([]);
    expect(diffPlayerStatus([healthy], [healthy])).toEqual([]);
  });

  it("first observation (player absent from before) is not a change", () => {
    expect(diffPlayerStatus([], [out])).toEqual([]);
  });

  it("a player dropping out of the after-snapshot is not a change", () => {
    expect(diffPlayerStatus([out], [])).toEqual([]);
  });
});

describe("buildStatusChangeMessage", () => {
  it("describes an injury move with both published values, nothing invented", () => {
    expect(
      buildStatusChangeMessage({
        playerId: "p",
        playerName: "Patrick Mahomes",
        statusKind: "injury",
        previous: "Questionable",
        current: "Out",
      }),
    ).toBe("Patrick Mahomes: injury status changed from Questionable to Out.");
  });

  it("describes a depth-chart move", () => {
    expect(
      buildStatusChangeMessage({
        playerId: "p",
        playerName: "Isiah Pacheco",
        statusKind: "depth_chart",
        previous: "2",
        current: "1",
      }),
    ).toBe("Isiah Pacheco: depth-chart slot changed from 2 to 1.");
  });

  it("honestly labels a null previous/current rather than inventing a value", () => {
    expect(
      buildStatusChangeMessage({
        playerId: "p",
        playerName: "X",
        statusKind: "injury",
        previous: null,
        current: "Out",
      }),
    ).toBe("X: injury status changed from not on the injury report to Out.");
  });
});

describe("getWatchedPlayerIds", () => {
  it("deduplicates PLAYER entityIds across followers", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "w1", userId: "u1", entityType: "PLAYER", entityId: "player-1" },
      { id: "w2", userId: "u2", entityType: "PLAYER", entityId: "player-1" },
      { id: "w3", userId: "u1", entityType: "PLAYER", entityId: "player-2" },
    ]);
    expect(await getWatchedPlayerIds(db())).toEqual(["player-1", "player-2"]);
    expect(mocks.watchlistFindMany).toHaveBeenCalledWith({ where: { entityType: "PLAYER" } });
  });

  it("FAIL-ISOLATION: a throwing watchlist lookup resolves to empty, never throws", async () => {
    mocks.watchlistFindMany.mockRejectedValue(new Error("table missing"));
    await expect(getWatchedPlayerIds(db())).resolves.toEqual([]);
  });
});

describe("snapshotWatchedPlayerStatus", () => {
  it("takes the latest week per player and joins injury + depth", async () => {
    mocks.injuryFindMany.mockResolvedValue([
      { playerId: "player-1", playerName: "Patrick Mahomes", reportStatus: "Out", week: 3 },
      { playerId: "player-1", playerName: "Patrick Mahomes", reportStatus: "Questionable", week: 2 },
    ]);
    mocks.depthFindMany.mockResolvedValue([
      { playerId: "player-1", playerName: "Patrick Mahomes", depthRank: 1, week: 0 },
    ]);

    const snap = await snapshotWatchedPlayerStatus(db(), ["player-1"], 2026);
    expect(snap).toEqual([
      {
        playerId: "player-1",
        playerName: "Patrick Mahomes",
        injuryStatus: "Out",
        depthRank: 1,
      },
    ]);
  });

  it("zero I/O when the watched-id list is empty", async () => {
    expect(await snapshotWatchedPlayerStatus(db(), [], 2026)).toEqual([]);
    expect(mocks.injuryFindMany).not.toHaveBeenCalled();
  });
});

describe("notifyWatchlistFollowersForStatusChanges — DoD", () => {
  const change = {
    playerId: "player-1",
    playerName: "Patrick Mahomes",
    statusKind: "injury" as const,
    previous: "Questionable",
    current: "Out",
  };

  beforeEach(() => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "PLAYER", entityId: "player-1" },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));
  });

  it("ONE status change → ONE dispatch through dispatchWatchlistAlert", async () => {
    const summary = await notifyWatchlistFollowersForStatusChanges(
      db(),
      [change],
      new Date("2026-09-15T12:00:00.000Z"),
    );

    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);
    const [dbArg, payload, recipient] = mocks.dispatchWatchlistAlert.mock.calls[0]!;
    expect(dbArg).toBeDefined();
    expect(payload).toMatchObject({
      userId: "user-1",
      entityType: "PLAYER",
      entityId: "player-1",
      event: {
        kind: "status_change",
        statusKind: "injury",
        playerName: "Patrick Mahomes",
        previous: "Questionable",
        current: "Out",
        changedAt: new Date("2026-09-15T12:00:00.000Z"),
      },
      message: "Patrick Mahomes: injury status changed from Questionable to Out.",
    });
    expect(recipient).toEqual({ canGetAlerts: true, verifiedEmail: "user@example.com" });
    expect(summary).toMatchObject({ changesDetected: 1, followersMatched: 1 });
    expect(summary.dispatches).toHaveLength(1);
    expect(summary.dispatches[0]).toMatchObject({ sent: true, outcome: "dispatched" });
  });

  it("RE-RUN with zero changes dispatches NOTHING (the DoD half)", async () => {
    // First run: the real change.
    await notifyWatchlistFollowersForStatusChanges(db(), [change], new Date());
    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);

    // Re-run: the cron re-snapshots, the diff is empty, nothing fires.
    mocks.dispatchWatchlistAlert.mockClear();
    const rerun = await notifyWatchlistFollowersForStatusChanges(db(), [], new Date());
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
    expect(rerun).toEqual({ changesDetected: 0, followersMatched: 0, dispatches: [] });
  });

  it("still calls dispatch for a non-ELITE follower — dispatchWatchlistAlert owns the tier gate", async () => {
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("FREE"));

    await notifyWatchlistFollowersForStatusChanges(db(), [change], new Date());

    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);
    const [, , recipient] = mocks.dispatchWatchlistAlert.mock.calls[0]!;
    expect(recipient.canGetAlerts).toBe(false);
  });

  it("never leaks an unverified email into the dispatch call", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: null,
    });

    await notifyWatchlistFollowersForStatusChanges(db(), [change], new Date());

    const [, , recipient] = mocks.dispatchWatchlistAlert.mock.calls[0]!;
    expect(recipient.verifiedEmail).toBeNull();
  });

  it("skips a follower whose user row is gone without throwing", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const summary = await notifyWatchlistFollowersForStatusChanges(db(), [change], new Date());
    expect(summary.dispatches).toEqual([]);
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
  });

  it("FAIL-ISOLATION: one follower's dispatch throwing doesn't stop the next", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "PLAYER", entityId: "player-1" },
      { id: "wl-2", userId: "user-2", entityType: "PLAYER", entityId: "player-1" },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-x",
      email: "user@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.dispatchWatchlistAlert
      .mockRejectedValueOnce(new Error("channel exploded"))
      .mockResolvedValueOnce({ sent: true, outcome: "dispatched", channels: [] });

    const summary = await notifyWatchlistFollowersForStatusChanges(db(), [change], new Date());
    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(2);
    expect(summary.dispatches[0]).toMatchObject({ sent: false, outcome: "hook_error" });
    expect(summary.dispatches[1]).toMatchObject({ sent: true, outcome: "dispatched" });
  });

  it("FAIL-ISOLATION: a throwing watchlist lookup never propagates", async () => {
    mocks.watchlistFindMany.mockRejectedValue(new Error("db down"));
    await expect(
      notifyWatchlistFollowersForStatusChanges(db(), [change], new Date()),
    ).resolves.toMatchObject({ changesDetected: 1, followersMatched: 0, dispatches: [] });
  });
});

describe("loadStatusSnapshot + dispatchStatusChangeAlerts — the cron seam", () => {
  it("full cycle: one real change → one dispatch; identical re-run → zero", async () => {
    // Pre-ingest: player is Questionable.
    let injuryRows = [
      { playerId: "player-1", playerName: "Patrick Mahomes", reportStatus: "Questionable", week: 2 },
    ];
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "wl-1", userId: "user-1", entityType: "PLAYER", entityId: "player-1" },
    ]);
    mocks.injuryFindMany.mockImplementation(async () => injuryRows);
    mocks.depthFindMany.mockResolvedValue([
      { playerId: "player-1", playerName: "Patrick Mahomes", depthRank: 1, week: 0 },
    ]);
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.getUserEntitlements.mockResolvedValue(getEntitlements("ELITE"));

    const before = await loadStatusSnapshot(db(), 2026);
    expect(before.playerIds).toEqual(["player-1"]);
    expect(before.snapshot[0]?.injuryStatus).toBe("Questionable");

    // "Ingest" flips the published status to Out.
    injuryRows = [
      { playerId: "player-1", playerName: "Patrick Mahomes", reportStatus: "Out", week: 3 },
    ];

    const first = await dispatchStatusChangeAlerts(db(), before.snapshot, 2026);
    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({ changesDetected: 1, followersMatched: 1 });
    expect(first.dispatches[0]).toMatchObject({ sent: true, outcome: "dispatched" });

    // RE-RUN: the cron snapshots again (now Out), ingests the same Out row,
    // diffs, and finds nothing. No second dispatch.
    mocks.dispatchWatchlistAlert.mockClear();
    const beforeRerun = await loadStatusSnapshot(db(), 2026);
    expect(beforeRerun.snapshot[0]?.injuryStatus).toBe("Out");
    const second = await dispatchStatusChangeAlerts(db(), beforeRerun.snapshot, 2026);
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
    expect(second).toEqual({ changesDetected: 0, followersMatched: 0, dispatches: [] });
  });

  it("FAIL-ISOLATION: dispatchStatusChangeAlerts never throws into the cron", async () => {
    mocks.injuryFindMany.mockRejectedValue(new Error("db down"));
    await expect(
      dispatchStatusChangeAlerts(db(), [healthy], 2026),
    ).resolves.toEqual({ changesDetected: 0, followersMatched: 0, dispatches: [] });
  });
});
