/**
 * C-417 acceptance — reporter-wire watchlist alerts + beat-report live loader.
 *
 * DoD pins:
 *   1. One alert per (player, signal, source); never a repeat on re-run.
 *   2. Signal unique key stays one row per (team, signal, season); multi-source
 *      corroboration lives in rightsSnapshot.reports, never extra Signal rows.
 *   3. beat-report loader: NewsItem[] from stored Signals; two distinct
 *      Beat/Insider/Verified sources within six hours; self-sourced GSN never
 *      counts; live defaults false (operator switch).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  watchlistFindMany: vi.fn(),
  playerFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  getUserEntitlements: vi.fn(),
  dispatchWatchlistAlert: vi.fn(),
  signalFindMany: vi.fn(),
}));

vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("@/lib/watchlist/alert-dispatch", () => ({
  dispatchWatchlistAlert: mocks.dispatchWatchlistAlert,
}));
vi.mock("@sports/db", () => ({
  db: {
    signal: { findMany: mocks.signalFindMany },
  },
  isStubMode: () => false,
}));

import {
  ALERTABLE_WIRE_SIGNALS,
  buildWireReportMessage,
  dispatchWireReportAlerts,
  isAlertableWireSignal,
  matchWatchedPlayersInHeadline,
} from "@/lib/watchlist/wire-alert-hook";
import {
  CORROBORATION_WINDOW_MINUTES,
  mergeWireReports,
  signalRowToNewsItems,
  type WireNewReport,
  type WireReport,
} from "@/lib/news/wire-store";
import { loadBeatReportWireFromStore } from "@/lib/news/wire-store";
import { createBeatReportSignalFromStore } from "@/lib/conviction/signals/beat-report";
import { corroborate } from "@/lib/news/impact";
import type { GateCandidate } from "@/lib/conviction/gate-contract";

const NOW = new Date("2026-09-15T18:00:00Z");

function db(overrides: Record<string, unknown> = {}) {
  return {
    watchlist: { findMany: overrides.watchlistFindMany ?? mocks.watchlistFindMany },
    player: { findMany: overrides.playerFindMany ?? mocks.playerFindMany },
    user: { findUnique: overrides.userFindUnique ?? mocks.userFindUnique },
    signal: { findMany: overrides.signalFindMany ?? mocks.signalFindMany },
  };
}

function report(over: Partial<WireReport> = {}): WireReport {
  return {
    sourceId: "https://bsky.app/profile/beat.a/rss",
    sourceName: "Beat A",
    headline: "Patrick Mahomes ruled out for Sunday",
    url: "https://bsky.app/profile/beat.a/rss",
    tier: "Beat",
    capturedAt: "2026-09-15T17:30:00.000Z",
    ...over,
  };
}

function newReport(over: Partial<WireNewReport> = {}): WireNewReport {
  return {
    team: "KC",
    signal: "injury-out",
    key: "wire.injury-out",
    report: report(),
    ...over,
  };
}

beforeEach(() => {
  mocks.watchlistFindMany.mockReset();
  mocks.playerFindMany.mockReset();
  mocks.userFindUnique.mockReset();
  mocks.getUserEntitlements.mockReset();
  mocks.dispatchWatchlistAlert.mockReset().mockResolvedValue({
    sent: true,
    outcome: "dispatched",
    channels: [],
  });
  mocks.signalFindMany.mockReset();
});

describe("C-417 — alertable signal set", () => {
  it("alerts on injury/role/depth/suspension and never on weather/trade/scheme/coach-report", () => {
    expect(ALERTABLE_WIRE_SIGNALS.has("injury-out")).toBe(true);
    expect(ALERTABLE_WIRE_SIGNALS.has("injury-return")).toBe(true);
    expect(ALERTABLE_WIRE_SIGNALS.has("role-up")).toBe(true);
    expect(ALERTABLE_WIRE_SIGNALS.has("role-down")).toBe(true);
    expect(ALERTABLE_WIRE_SIGNALS.has("depth-chart")).toBe(true);
    expect(ALERTABLE_WIRE_SIGNALS.has("suspension")).toBe(true);
    expect(isAlertableWireSignal("weather")).toBe(false);
    expect(isAlertableWireSignal("trade")).toBe(false);
    expect(isAlertableWireSignal("scheme")).toBe(false);
    expect(isAlertableWireSignal("coach-report")).toBe(false);
  });
});

describe("C-417 — rightsSnapshot.reports merge (no extra Signal rows)", () => {
  it("a second distinct source is added; the same source on re-run is not", () => {
    const a = report();
    const first = mergeWireReports(undefined, a, { now: NOW });
    expect(first.added).toBe(true);
    expect(first.reports).toHaveLength(1);

    // Same source re-posts (cron re-run / refreshed headline) — not new.
    const rerun = mergeWireReports(first.reports, { ...a, headline: "updated" }, { now: NOW });
    expect(rerun.added).toBe(false);
    expect(rerun.reports).toHaveLength(1);
    expect(rerun.reports[0]!.headline).toBe("updated");

    // A second Beat source on the same (team, signal) — IS new.
    const b = report({
      sourceId: "https://bsky.app/profile/beat.b/rss",
      sourceName: "Beat B",
    });
    const second = mergeWireReports(rerun.reports, b, { now: NOW });
    expect(second.added).toBe(true);
    expect(second.reports).toHaveLength(2);
  });

  it("prunes reports outside the six-hour corroboration window", () => {
    const fresh = report({ capturedAt: "2026-09-15T17:00:00.000Z" });
    const stale = report({
      sourceId: "https://old.example/rss",
      sourceName: "Old Source",
      capturedAt: "2026-09-15T08:00:00.000Z", // 9h before fresh
    });
    const merged = mergeWireReports([stale], fresh, { now: NOW });
    expect(merged.reports.map((r) => r.sourceId)).toEqual([fresh.sourceId]);
    expect(CORROBORATION_WINDOW_MINUTES).toBe(360);
  });

  it("expands one Signal row into one NewsItem per report, dropping self-sourced GSN", () => {
    const items = signalRowToNewsItems(
      {
        id: "sig-1",
        entityId: "KC",
        key: "wire.injury-out",
        capturedAt: NOW,
        sourceId: "https://a/rss",
        rightsSnapshot: {
          sourceName: "Beat A",
          headline: "Patrick Mahomes ruled out",
          url: "https://a/rss",
          tier: "Beat",
          feedUrl: "https://a/rss",
          reports: [
            report({ sourceId: "https://a/rss", sourceName: "Beat A" }),
            report({
              sourceId: "https://b/rss",
              sourceName: "Beat B",
              headline: "Mahomes ruled out, per source",
            }),
            report({
              sourceId: "https://galaxysportsedge.com/journal/rss.xml",
              sourceName: "Galaxy Sports Network",
              tier: "Verified",
              selfSourced: true,
            }),
          ],
        },
      },
      { now: NOW, playerByName: ["Patrick Mahomes"] },
    );
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.source !== "Galaxy Sports Network")).toBe(true);
    expect(items[0]!.player).toBe("Patrick Mahomes");
    // Two distinct sources on the same team+player+signal => corroborated.
    const corr = corroborate(items);
    expect(corr.get(items[0]!.id)!.confirmed).toBe(true);
    expect(corr.get(items[0]!.id)!.sources).toBe(2);
  });
});

describe("C-417 — wire → watchlist alerts", () => {
  it("ONE new report for a watched player → ONE dispatch; re-run with zero new reports dispatches nothing", async () => {
    mocks.watchlistFindMany.mockImplementation(async (args: { where: Record<string, unknown> }) => {
      if (args.where.entityId) return [{ id: "w1", userId: "u1", entityType: "PLAYER", entityId: "p1" }];
      return [{ id: "w1", userId: "u1", entityType: "PLAYER", entityId: "p1" }];
    });
    mocks.playerFindMany.mockResolvedValue([{ id: "p1", fullName: "Patrick Mahomes" }]);
    mocks.userFindUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: new Date("2026-01-01T00:00:00Z"),
    });
    mocks.getUserEntitlements.mockResolvedValue({ canGetAlerts: true });

    const first = await dispatchWireReportAlerts(db(), [newReport()], NOW);
    expect(first.newReports).toBe(1);
    expect(first.matchedReports).toBe(1);
    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);
    const [, payload, recipient] = mocks.dispatchWatchlistAlert.mock.calls[0]!;
    expect(payload.event).toMatchObject({
      kind: "status_change",
      statusKind: "wire_report",
      playerName: "Patrick Mahomes",
      signalType: "injury-out",
      sourceName: "Beat A",
    });
    expect(payload.message).toContain("Patrick Mahomes");
    expect(payload.message).toContain("Beat A");
    expect(recipient.canGetAlerts).toBe(true);
    expect(recipient.verifiedEmail).toBe("a@b.com");

    // Re-run: refreshWireFromRoster returns [] because the source is already stored.
    mocks.dispatchWatchlistAlert.mockClear();
    const rerun = await dispatchWireReportAlerts(db(), [], NOW);
    expect(rerun.dispatches).toHaveLength(0);
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
  });

  it("a SECOND distinct source on the same story is a new alert (one per player, signal, source)", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "w1", userId: "u1", entityType: "PLAYER", entityId: "p1" },
    ]);
    mocks.playerFindMany.mockResolvedValue([{ id: "p1", fullName: "Patrick Mahomes" }]);
    mocks.userFindUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: new Date("2026-01-01T00:00:00Z"),
    });
    mocks.getUserEntitlements.mockResolvedValue({ canGetAlerts: true });

    const secondSource = newReport({
      report: report({
        sourceId: "https://bsky.app/profile/beat.b/rss",
        sourceName: "Beat B",
        headline: "Chiefs QB Patrick Mahomes ruled out",
      }),
    });
    const result = await dispatchWireReportAlerts(db(), [secondSource], NOW);
    expect(result.dispatches).toHaveLength(1);
    expect(result.dispatches[0]!.sourceId).toBe("https://bsky.app/profile/beat.b/rss");
    expect(mocks.dispatchWatchlistAlert).toHaveBeenCalledTimes(1);
  });

  it("never alerts when the headline names no watched player", async () => {
    mocks.watchlistFindMany.mockResolvedValue([
      { id: "w1", userId: "u1", entityType: "PLAYER", entityId: "p1" },
    ]);
    mocks.playerFindMany.mockResolvedValue([{ id: "p1", fullName: "Patrick Mahomes" }]);
    const result = await dispatchWireReportAlerts(
      db(),
      [newReport({ report: report({ headline: "Some other team's depth chart moves" }) })],
      NOW,
    );
    expect(result.matchedReports).toBe(0);
    expect(mocks.dispatchWatchlistAlert).not.toHaveBeenCalled();
  });

  it("skips non-alertable wire signals even when the player matches", async () => {
    const result = await dispatchWireReportAlerts(
      db(),
      [newReport({ signal: "weather", key: "wire.weather" })],
      NOW,
    );
    expect(result.newReports).toBe(1);
    expect(result.matchedReports).toBe(0);
    expect(mocks.watchlistFindMany).not.toHaveBeenCalled();
  });

  it("FAIL-ISOLATION: a throwing watchlist lookup never throws back into the cron", async () => {
    mocks.watchlistFindMany.mockRejectedValue(new Error("table missing"));
    await expect(dispatchWireReportAlerts(db(), [newReport()], NOW)).resolves.toMatchObject({
      newReports: 1,
    });
  });

  it("matches unique last names of 4+ chars but never ambiguous short ones", () => {
    const players = [
      { playerId: "p1", playerName: "Patrick Mahomes" },
      { playerId: "p2", playerName: "Travis Kelce" },
      { playerId: "p3", playerName: "Chris Jones" },
    ];
    expect(matchWatchedPlayersInHeadline("Mahomes ruled out", players).map((p) => p.playerId)).toEqual([
      "p1",
    ]);
    // "Jones" alone would be fine if unique; two Joneses must not both fire on one name.
    const twoJones = [
      { playerId: "a", playerName: "Julio Jones" },
      { playerId: "b", playerName: "Daniel Jones" },
    ];
    expect(matchWatchedPlayersInHeadline("Jones questionable", twoJones)).toEqual([]);
  });

  it("builds a data-backed message with no invented stats", () => {
    const msg = buildWireReportMessage(
      { playerId: "p1", playerName: "Patrick Mahomes" },
      "injury-out",
      report(),
    );
    expect(msg).toBe(
      'Patrick Mahomes: Beat A reports ruled out — "Patrick Mahomes ruled out for Sunday".',
    );
  });
});

describe("C-417 — beat-report live loader", () => {
  function candidate(over: Partial<GateCandidate> = {}): GateCandidate {
    return {
      gameId: "g-1",
      sportKey: "americanfootball_nfl",
      homeTeamName: "Kansas City Chiefs",
      awayTeamName: "Cincinnati Bengals",
      commenceTime: new Date("2026-09-14T17:00:00Z"),
      pickType: "MONEYLINE",
      selection: "Kansas City Chiefs",
      side: "home",
      line: null,
      ...over,
    };
  }

  it("returns null when live is false (operator switch defaults off), even with a loud store", async () => {
    mocks.signalFindMany.mockResolvedValue([
      {
        id: "sig-1",
        entityId: "KC",
        key: "wire.injury-out",
        capturedAt: new Date("2026-09-15T17:00:00Z"),
        sourceId: "https://a/rss",
        rightsSnapshot: {
          sourceName: "Beat A",
          headline: "Patrick Mahomes ruled out",
          url: "https://a/rss",
          tier: "Beat",
          feedUrl: "https://a/rss",
          reports: [
            report({ sourceId: "https://a/rss", sourceName: "Beat A" }),
            report({ sourceId: "https://b/rss", sourceName: "Beat B" }),
          ],
        },
      },
    ]);
    const fn = createBeatReportSignalFromStore({
      live: false,
      loadPlayerNames: async () => ["Patrick Mahomes"],
      dbArg: db(),
      now: () => NOW,
    });
    expect(await fn(candidate())).toBeNull();
  });

  it("CONTRADICTS when two distinct Beat sources on our side report injury-out (live:true)", async () => {
    mocks.signalFindMany.mockResolvedValue([
      {
        id: "sig-1",
        entityId: "KC",
        key: "wire.injury-out",
        capturedAt: new Date("2026-09-15T17:00:00Z"),
        sourceId: "https://a/rss",
        rightsSnapshot: {
          sourceName: "Beat A",
          headline: "Patrick Mahomes ruled out for Sunday",
          url: "https://a/rss",
          tier: "Beat",
          feedUrl: "https://a/rss",
          reports: [
            report({
              sourceId: "https://a/rss",
              sourceName: "Beat A",
              headline: "Patrick Mahomes ruled out for Sunday",
            }),
            report({
              sourceId: "https://b/rss",
              sourceName: "Beat B",
              headline: "Sources: Mahomes will not play",
            }),
          ],
        },
      },
    ]);
    const fn = createBeatReportSignalFromStore({
      live: true,
      loadPlayerNames: async () => ["Patrick Mahomes"],
      dbArg: db(),
      now: () => NOW,
    });
    const read = await fn(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.key).toBe("beat-report");
    expect(read?.basis).toContain("corroborate");
  });

  it("returns null on a single uncorroborated source from the store", async () => {
    mocks.signalFindMany.mockResolvedValue([
      {
        id: "sig-1",
        entityId: "KC",
        key: "wire.injury-out",
        capturedAt: new Date("2026-09-15T17:00:00Z"),
        sourceId: "https://a/rss",
        rightsSnapshot: {
          sourceName: "Beat A",
          headline: "Patrick Mahomes ruled out",
          url: "https://a/rss",
          tier: "Beat",
          feedUrl: "https://a/rss",
          reports: [report()],
        },
      },
    ]);
    const fn = createBeatReportSignalFromStore({
      live: true,
      loadPlayerNames: async () => ["Patrick Mahomes"],
      dbArg: db(),
      now: () => NOW,
    });
    expect(await fn(candidate())).toBeNull();
  });

  it("loadBeatReportWireFromStore filters Aggregator and self-sourced reports", async () => {
    mocks.signalFindMany.mockResolvedValue([
      {
        id: "sig-1",
        entityId: "KC",
        key: "wire.injury-out",
        capturedAt: new Date("2026-09-15T17:00:00Z"),
        sourceId: "https://a/rss",
        rightsSnapshot: {
          sourceName: "Beat A",
          headline: "Patrick Mahomes ruled out",
          url: "https://a/rss",
          tier: "Beat",
          feedUrl: "https://a/rss",
          reports: [
            report(),
            report({
              sourceId: "https://agg/rss",
              sourceName: "Aggregator",
              tier: "Aggregator",
            }),
            report({
              sourceId: "https://gsn/rss",
              sourceName: "Galaxy Sports Network",
              tier: "Verified",
              selfSourced: true,
            }),
          ],
        },
      },
    ]);
    const items = await loadBeatReportWireFromStore(
      { home: "Kansas City Chiefs", away: "Cincinnati Bengals" },
      { now: NOW, dbArg: db(), playerNames: ["Patrick Mahomes"] },
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.tier).toBe("Beat");
    expect(items[0]!.source).toBe("Beat A");
  });
});
