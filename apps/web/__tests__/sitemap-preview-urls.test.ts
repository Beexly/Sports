import { beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/lib/seo/site-url";
import { SITEMAP_PREVIEW_CAP } from "@/app/sitemap";

/**
 * sitemap.xml preview URLs — slug form ONLY.
 *
 * The sitemap used to emit `/preview/${slugify(g.sportId)}/…`, and slugify of
 * a cuid is the cuid — ~731 cuid-form URLs got indexed. The preview page now
 * 308s those to the canonical `/preview/<slugify(Sport.name)>/<matchup>` form,
 * and the sitemap must advertise ONLY that form (a sitemap should never point
 * crawlers at URLs that redirect). Pinned here: the emitted preview entry is
 * built from `game.sport.name`, and no URL carries a cuid-shaped segment.
 */

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@/lib/journal/load", () => ({
  loadPublicJournalEntries: async () => [],
}));

vi.mock("@sports/db", () => ({
  db: { game: { findMany: mocks.gameFindMany } },
}));

import sitemap from "@/app/sitemap";

beforeEach(() => {
  mocks.gameFindMany.mockReset().mockResolvedValue([
    {
      sport: { name: "NFL" }, // required relation — the slug source, never sportId
      awayTeamName: "Baltimore Ravens",
      homeTeamName: "Cleveland Browns",
      commenceTime: new Date("2026-07-12T20:00:00.000Z"),
      updatedAt: new Date("2026-07-10T09:00:00.000Z"),
    },
  ]);
});

describe("sitemap — preview URLs emit the sport-slug form only", () => {
  it("builds the preview entry from slugify(Sport.name)", async () => {
    const entries = await sitemap();
    const preview = entries.filter((e) => e.url.includes("/preview/"));
    expect(preview).toHaveLength(1);
    expect(preview[0]?.url).toBe(
      `${SITE_URL}/preview/nfl/baltimore-ravens-vs-cleveland-browns`,
    );
  });

  it("never emits a cuid-shaped sport segment", async () => {
    const entries = await sitemap();
    // Cuid shape: "c" + 20+ lowercase alphanumerics (slugify of a cuid is the
    // cuid itself — the exact regression that indexed 731 cuid URLs).
    const cuidSegment = /\/preview\/c[a-z0-9]{20,}\//;
    for (const entry of entries) {
      expect(entry.url).not.toMatch(cuidSegment);
    }
  });
});

describe("sitemap — de-duplicates triplicated fixtures (AGENTS.md: up to 3 `games` rows per real contest)", () => {
  it("collapses same-fixture rows (same team pair, same sport, kickoff within 18h) to ONE URL", async () => {
    // Mirrors the Atlanta @ Pittsburgh example in AGENTS.md: one games row
    // per feed (Odds API id, `espn:<sportKey>:`, `espn:<short>:`), none
    // tombstoned, same teams, kickoff clocks minutes apart.
    mocks.gameFindMany.mockReset().mockResolvedValue([
      {
        id: "g-odds-api",
        externalId: "odds-api-abc123",
        sportId: "sport-nfl",
        mergedIntoGameId: null,
        sport: { name: "NFL", key: "americanfootball_nfl" },
        awayTeamName: "Atlanta Falcons",
        homeTeamName: "Pittsburgh Steelers",
        commenceTime: new Date("2026-09-14T17:00:00.000Z"),
        updatedAt: new Date("2026-09-14T09:00:00.000Z"),
      },
      {
        id: "g-espn-full",
        externalId: "espn:americanfootball_nfl:401671000",
        sportId: "sport-nfl",
        mergedIntoGameId: null,
        sport: { name: "NFL", key: "americanfootball_nfl" },
        awayTeamName: "Atlanta Falcons",
        homeTeamName: "Pittsburgh Steelers",
        commenceTime: new Date("2026-09-14T17:00:00.000Z"),
        updatedAt: new Date("2026-09-14T08:00:00.000Z"),
      },
      {
        id: "g-espn-short",
        externalId: "espn:nfl:401671000",
        sportId: "sport-nfl",
        mergedIntoGameId: null,
        sport: { name: "NFL", key: "americanfootball_nfl" },
        awayTeamName: "Atlanta Falcons",
        homeTeamName: "Pittsburgh Steelers",
        commenceTime: new Date("2026-09-14T17:05:00.000Z"),
        updatedAt: new Date("2026-09-14T07:00:00.000Z"),
      },
    ]);

    const entries = await sitemap();
    const preview = entries.filter((e) => e.url.includes("/preview/"));
    expect(preview).toHaveLength(1);
    expect(preview[0]?.url).toBe(
      `${SITE_URL}/preview/nfl/atlanta-falcons-vs-pittsburgh-steelers`,
    );
  });

  it("negative control: two genuinely different fixtures each keep their own URL", async () => {
    mocks.gameFindMany.mockReset().mockResolvedValue([
      {
        id: "g1",
        externalId: "odds-api-1",
        sportId: "sport-nfl",
        mergedIntoGameId: null,
        sport: { name: "NFL", key: "americanfootball_nfl" },
        awayTeamName: "Baltimore Ravens",
        homeTeamName: "Cleveland Browns",
        commenceTime: new Date("2026-09-14T17:00:00.000Z"),
        updatedAt: new Date("2026-09-14T09:00:00.000Z"),
      },
      {
        id: "g2",
        externalId: "odds-api-2",
        sportId: "sport-nfl",
        mergedIntoGameId: null,
        sport: { name: "NFL", key: "americanfootball_nfl" },
        awayTeamName: "Chicago Bears",
        homeTeamName: "Carolina Panthers",
        commenceTime: new Date("2026-09-14T20:00:00.000Z"),
        updatedAt: new Date("2026-09-14T09:00:00.000Z"),
      },
    ]);

    const entries = await sitemap();
    const preview = entries.filter((e) => e.url.includes("/preview/"));
    expect(preview).toHaveLength(2);
  });
});

describe("sitemap — dedup does not shrink the output below the cap (Devin Review, #819)", () => {
  it("requests a bounded over-fetch (3x the cap), not exactly the cap", async () => {
    mocks.gameFindMany.mockReset().mockResolvedValue([]);
    await sitemap();
    expect(mocks.gameFindMany).toHaveBeenCalledTimes(1);
    const args = mocks.gameFindMany.mock.calls[0]?.[0] as { take?: number };
    expect(args.take).toBe(SITEMAP_PREVIEW_CAP * 3);
  });

  it("recovers up to the full cap of UNIQUE fixtures even when triplication is front-loaded", async () => {
    // Devin's exact counterexample: "if the first 120 rows represent 40
    // triplicated fixtures, this code emits 40 previews even when 80
    // additional unique fixtures fall inside the window." Construct
    // SITEMAP_PREVIEW_CAP distinct fixtures, each present 3 times
    // consecutively (worst-case front-loading), for 3x the cap in raw rows —
    // exactly what the over-fetch now requests.
    const rows: unknown[] = [];
    for (let i = 0; i < SITEMAP_PREVIEW_CAP; i++) {
      // Fixed-width, zero-padded index: an unpadded numeric suffix (e.g.
      // "Team 1" vs "Team 10") would prefix-match under matchTeamSide's
      // city-name prefix rule and wrongly collapse two DIFFERENT fixtures —
      // a test-data artifact, not the thing this test is pinning. Equal
      // widths make every name either an exact match or no match at all.
      const idx = String(i).padStart(4, "0");
      const away = `Away Team ${idx}`;
      const home = `Home Team ${idx}`;
      const commenceTime = new Date(Date.UTC(2026, 8, 14, 17, 0, 0) + i * 60_000);
      for (const feed of ["odds-api", "espn:americanfootball_nfl:", "espn:nfl:"]) {
        rows.push({
          id: `g-${i}-${feed}`,
          externalId: `${feed}-${i}`,
          sportId: "sport-nfl",
          mergedIntoGameId: null,
          sport: { name: "NFL", key: "americanfootball_nfl" },
          awayTeamName: away,
          homeTeamName: home,
          commenceTime,
          updatedAt: commenceTime,
        });
      }
    }
    mocks.gameFindMany.mockReset().mockResolvedValue(rows);

    const entries = await sitemap();
    const preview = entries.filter((e) => e.url.includes("/preview/"));
    expect(preview).toHaveLength(SITEMAP_PREVIEW_CAP);
    // Every emitted URL is genuinely unique — the fix recovered CAP distinct
    // fixtures from 3x CAP raw (triplicated) rows, not CAP/3.
    expect(new Set(preview.map((e) => e.url)).size).toBe(SITEMAP_PREVIEW_CAP);
  });
});
