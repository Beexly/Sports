/**
 * C-416 — wire-store acceptance: classification → Signal upsert shape,
 * honest empty store, DEMO_WIRE gone, season gate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WIRE_KEY_PREFIX,
  dedupeCandidates,
  feedIdFor,
  isInNflWireSeason,
  signalRowToNewsItem,
  signalTypeFromKey,
  toWireCandidate,
  wireCategoryFor,
  wireKeyFor,
  wireSeasonLabel,
  wireValueFor,
} from "./wire-store";
import { TIER_WEIGHT, SIGNAL_MAGNITUDES } from "./impact";

const NOW = new Date("2026-09-15T18:00:00Z");
const FEED = {
  url: "https://bsky.app/profile/example.bsky.social/rss",
  source: "Example Beat (Outlet)",
  tier: "Beat" as const,
  team: "ATL",
};

describe("wire-store season gate", () => {
  it("is in season Sep–early Feb, out Mar–Aug", () => {
    expect(isInNflWireSeason(new Date("2026-09-15T12:00:00Z"))).toBe(true);
    expect(isInNflWireSeason(new Date("2026-01-15T12:00:00Z"))).toBe(true);
    expect(isInNflWireSeason(new Date("2026-02-01T12:00:00Z"))).toBe(true);
    expect(isInNflWireSeason(new Date("2026-03-01T12:00:00Z"))).toBe(false);
    expect(isInNflWireSeason(new Date("2026-08-15T12:00:00Z"))).toBe(false);
  });

  it("labels the season by September start year", () => {
    expect(wireSeasonLabel(new Date("2026-09-15T12:00:00Z"))).toBe(2026);
    expect(wireSeasonLabel(new Date("2026-01-15T12:00:00Z"))).toBe(2025);
  });
});

describe("wire-store classify → upsert candidate", () => {
  it("builds a team Signal with wire.<signal> key, tier confidence, and rightsSnapshot", () => {
    const c = toWireCandidate(
      FEED,
      {
        title: "Falcons RB ruled out for Sunday",
        pubDate: "Tue, 15 Sep 2026 17:30:00 GMT",
      },
      NOW,
    );
    expect(c).not.toBeNull();
    expect(c!.entityType).toBe("team");
    expect(c!.entityId).toBe("ATL");
    expect(c!.key).toBe("wire.injury-out");
    expect(c!.category).toBe("INJURIES");
    expect(c!.confidence).toBe(TIER_WEIGHT.Beat);
    expect(c!.sourceId).toBe(feedIdFor(FEED));
    expect(c!.season).toBe(2026);
    expect(c!.week).toBe(0);
    expect(c!.capturedAt.toISOString()).toBe("2026-09-15T17:30:00.000Z");
    expect(c!.rightsSnapshot).toEqual({
      sourceName: "Example Beat (Outlet)",
      headline: "Falcons RB ruled out for Sunday",
      url: FEED.url,
      tier: "Beat",
      feedUrl: FEED.url,
    });
    expect(c!.value).toBe(wireValueFor("injury-out"));
    expect(c!.valueRaw).toBe(SIGNAL_MAGNITUDES["injury-out"].fantasy);
  });

  it("drops unclassifiable headlines and missing/unparseable pubDates", () => {
    expect(toWireCandidate(FEED, { title: "Cowboys beat Giants 24-17", pubDate: "Tue, 15 Sep 2026 17:30:00 GMT" }, NOW)).toBeNull();
    expect(toWireCandidate(FEED, { title: "Falcons RB ruled out", pubDate: null }, NOW)).toBeNull();
    expect(toWireCandidate(FEED, { title: "Falcons RB ruled out", pubDate: "not-a-date" }, NOW)).toBeNull();
  });

  it("drops stale items beyond the 48h window", () => {
    const stale = toWireCandidate(
      FEED,
      { title: "Falcons RB ruled out", pubDate: "Sun, 13 Sep 2026 12:00:00 GMT" },
      NOW,
    );
    expect(stale).toBeNull();
  });

  it("collapses duplicate (source, headline) candidates in one cycle", () => {
    const a = toWireCandidate(FEED, { title: "Coach says RB will start", pubDate: "Tue, 15 Sep 2026 17:00:00 GMT" }, NOW)!;
    const b = { ...a };
    const out = dedupeCandidates([a, b]);
    expect(out).toHaveLength(1);
  });
});

describe("wire-store row → NewsItem", () => {
  it("round-trips a stored Signal into a NewsItem with minutesAgo", () => {
    const capturedAt = new Date("2026-09-15T17:00:00Z");
    const item = signalRowToNewsItem(
      {
        id: "sig-1",
        entityId: "ATL",
        key: wireKeyFor("injury-out"),
        capturedAt,
        sourceId: FEED.url,
        rightsSnapshot: {
          sourceName: FEED.source,
          headline: "Falcons RB ruled out for Sunday",
          url: FEED.url,
          tier: "Beat",
          feedUrl: FEED.url,
        },
      },
      NOW,
    );
    expect(item).not.toBeNull();
    expect(item!.id).toBe("sig-1");
    expect(item!.team).toBe("ATL");
    expect(item!.source).toBe(FEED.source);
    expect(item!.tier).toBe("Beat");
    expect(item!.signal).toBe("injury-out");
    expect(item!.headline).toBe("Falcons RB ruled out for Sunday");
    expect(item!.minutesAgo).toBe(60);
  });

  it("rejects rows without a wire key or rights snapshot", () => {
    expect(signalTypeFromKey("ngs.separation")).toBeNull();
    expect(
      signalRowToNewsItem(
        { id: "x", entityId: "ATL", key: "ngs.separation", capturedAt: NOW, sourceId: "s", rightsSnapshot: {} },
        NOW,
      ),
    ).toBeNull();
    expect(
      signalRowToNewsItem(
        {
          id: "x",
          entityId: "ATL",
          key: WIRE_KEY_PREFIX + "injury-out",
          capturedAt: NOW,
          sourceId: "s",
          rightsSnapshot: null,
        },
        NOW,
      ),
    ).toBeNull();
  });
});

describe("wire categories and values", () => {
  it("maps every SignalType to a category and a −1..1 value", () => {
    for (const signal of Object.keys(SIGNAL_MAGNITUDES) as Array<keyof typeof SIGNAL_MAGNITUDES>) {
      const cat = wireCategoryFor(signal);
      expect(cat.length).toBeGreaterThan(0);
      const v = wireValueFor(signal);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
    }
    expect(wireCategoryFor("injury-out")).toBe("INJURIES");
    expect(wireCategoryFor("weather")).toBe("WEATHER");
    expect(wireCategoryFor("coach-report")).toBe("MARKET_SENTIMENT");
  });
});

describe("C-416 honesty surface", () => {
  it("exports no fictional DEMO_WIRE from wire.ts", async () => {
    const wire = await import("./wire");
    expect("DEMO_WIRE" in wire).toBe(false);
  });

  it("coach-report is in the impact magnitude table (the beat-report TODO)", () => {
    expect(SIGNAL_MAGNITUDES["coach-report"]).toBeDefined();
    expect(SIGNAL_MAGNITUDES["coach-report"].label).toBe("Coach report");
  });
});

// ── store I/O with a mocked db ─────────────────────────────────────────────

const dbMocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { signal: { upsert: dbMocks.upsert, findMany: dbMocks.findMany } },
  isStubMode: () => false,
}));

describe("wire-store I/O", () => {
  beforeEach(() => {
    dbMocks.upsert.mockReset();
    dbMocks.findMany.mockReset();
  });

  it("refreshWireFromRoster skips out of season without fetching", async () => {
    const { refreshWireFromRoster } = await import("./wire-store");
    const result = await refreshWireFromRoster({
      now: new Date("2026-06-15T12:00:00Z"),
    });
    expect(result.skipped).toBe("out-of-season");
    expect(dbMocks.upsert).not.toHaveBeenCalled();
  });

  it("refreshWireFromRoster upserts one Signal per classified candidate", async () => {
    const { refreshWireFromRoster } = await import("./wire-store");
    dbMocks.upsert.mockResolvedValue({});
    // Force in-season; inject a feed and stub fetch to a fixed XML.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `<rss><channel>
          <item><title>Falcons RB ruled out for Sunday</title><pubDate>Tue, 15 Sep 2026 17:30:00 GMT</pubDate></item>
          <item><title>Cowboys beat Giants 24-17</title><pubDate>Tue, 15 Sep 2026 17:00:00 GMT</pubDate></item>
        </channel></rss>`,
        { status: 200, headers: { "content-type": "application/rss+xml" } },
      ),
    );
    try {
      const result = await refreshWireFromRoster({
        now: new Date("2026-09-15T18:00:00Z"),
        force: true,
        feeds: [FEED],
      });
      expect(result.skipped).toBeNull();
      expect(result.configured).toBe(1);
      expect(result.reached).toBe(1);
      expect(result.classified).toBe(1);
      expect(result.upserted).toBe(1);
      expect(dbMocks.upsert).toHaveBeenCalledTimes(1);
      const arg = dbMocks.upsert.mock.calls[0]![0] as {
        where: { entityType_entityId_key_season_week: Record<string, unknown> };
        create: Record<string, unknown>;
      };
      expect(arg.where.entityType_entityId_key_season_week).toMatchObject({
        entityType: "team",
        entityId: "ATL",
        key: "wire.injury-out",
        season: 2026,
        week: 0,
      });
      expect(arg.create.confidence).toBe(TIER_WEIGHT.Beat);
      expect(arg.create.sourceId).toBe(FEED.url);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("loadWireFromStore maps rows to NewsItems and is empty-honest", async () => {
    const { loadWireFromStore } = await import("./wire-store");
    dbMocks.findMany.mockResolvedValue([
      {
        id: "sig-1",
        entityId: "ATL",
        key: "wire.injury-out",
        capturedAt: new Date("2026-09-15T17:00:00Z"),
        sourceId: FEED.url,
        rightsSnapshot: {
          sourceName: FEED.source,
          headline: "Falcons RB ruled out for Sunday",
          url: FEED.url,
          tier: "Beat",
          feedUrl: FEED.url,
        },
      },
    ]);
    const loaded = await loadWireFromStore({ now: NOW });
    expect(loaded.failed).toBe(false);
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0]!.headline).toBe("Falcons RB ruled out for Sunday");

    dbMocks.findMany.mockResolvedValue([]);
    const empty = await loadWireFromStore({ now: NOW });
    expect(empty.failed).toBe(false);
    expect(empty.items).toEqual([]);
  });

  it("loadWireFromStore reports failure without inventing items", async () => {
    const { loadWireFromStore } = await import("./wire-store");
    dbMocks.findMany.mockRejectedValue(new Error("db down"));
    const failed = await loadWireFromStore({ now: NOW });
    expect(failed.failed).toBe(true);
    expect(failed.items).toEqual([]);
  });
});
