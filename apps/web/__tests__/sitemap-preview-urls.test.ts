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
