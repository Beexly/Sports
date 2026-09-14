import { beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/lib/seo/site-url";

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
