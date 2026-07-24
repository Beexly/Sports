import type { MetadataRoute } from "next";
import { loadPublicJournalEntries } from "@/lib/journal/load";
import { SITE_URL } from "@/lib/seo/site-url";
import { slugify } from "@/lib/seo/sports-jsonld";
import { db } from "@sports/db";

/**
 * sitemap.xml
 *
 * Static list of public-facing URLs. Blog post URLs are intentionally
 * omitted while PUBLIC_BLOG_ENABLED is false; once the gate flips, swap
 * this for a dynamic generator that reads published ContentDraft slugs.
 *
 * Preview routes (/preview/[sport]/[slug]) are generated dynamically from the
 * Game table — thousands of long-tail indexable matchup pages at no extra cost.
 */

const ROUTES: ReadonlyArray<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/picks", priority: 0.9, changeFrequency: "hourly" },
  { path: "/house", priority: 0.8, changeFrequency: "weekly" },
  { path: "/methodology", priority: 0.8, changeFrequency: "monthly" },
  { path: "/how-we-make-money", priority: 0.6, changeFrequency: "monthly" },
  { path: "/performance", priority: 0.7, changeFrequency: "daily" },
  { path: "/journal", priority: 0.7, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" },
  { path: "/observatory", priority: 0.6, changeFrequency: "weekly" },
  { path: "/airwave", priority: 0.6, changeFrequency: "weekly" },
  { path: "/vault", priority: 0.6, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/press", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/responsible-play", priority: 0.5, changeFrequency: "monthly" },
  { path: "/vs/tout-services", priority: 0.6, changeFrequency: "monthly" },
  { path: "/how-to-verify-a-record", priority: 0.7, changeFrequency: "monthly" },
  { path: "/accountability", priority: 0.7, changeFrequency: "weekly" },
  { path: "/proof", priority: 0.7, changeFrequency: "daily" },
  { path: "/engine", priority: 0.7, changeFrequency: "daily" },
  { path: "/verify", priority: 0.6, changeFrequency: "daily" },
  { path: "/clv", priority: 0.7, changeFrequency: "daily" },
  { path: "/calibration", priority: 0.7, changeFrequency: "weekly" },
  { path: "/fable", priority: 0.6, changeFrequency: "weekly" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  // Daily intelligence surfaces
  { path: "/board", priority: 0.8, changeFrequency: "daily" },
  // The selective gate, run in public. Listed because a page whose purpose is
  // to be checked by strangers has to be reachable by one.
  { path: "/board/gate", priority: 0.7, changeFrequency: "daily" },
  // NOTE: /brief is intentionally omitted — it is robots-disallowed + noindex
  // (internal surface). A sitemap must never advertise a blocked URL.
  { path: "/today", priority: 0.7, changeFrequency: "daily" },
  { path: "/track", priority: 0.6, changeFrequency: "daily" },
  { path: "/trends", priority: 0.6, changeFrequency: "daily" },
  // Tools & education
  { path: "/parlay-mri", priority: 0.7, changeFrequency: "weekly" },
  { path: "/academy", priority: 0.7, changeFrequency: "weekly" },
  { path: "/intelligence", priority: 0.7, changeFrequency: "weekly" },
  { path: "/intelligence/engines", priority: 0.5, changeFrequency: "monthly" },
  { path: "/intelligence/metrics", priority: 0.5, changeFrequency: "monthly" },
  { path: "/optimizer", priority: 0.5, changeFrequency: "weekly" },
  // Player & sport hubs
  { path: "/players", priority: 0.7, changeFrequency: "daily" },
  { path: "/nflverse", priority: 0.6, changeFrequency: "weekly" },
  { path: "/mlb", priority: 0.5, changeFrequency: "weekly" },
  { path: "/nhl", priority: 0.5, changeFrequency: "weekly" },
  { path: "/weather", priority: 0.5, changeFrequency: "daily" },
  { path: "/fantasy", priority: 0.6, changeFrequency: "weekly" },
  { path: "/the-beat", priority: 0.6, changeFrequency: "weekly" },
  { path: "/gsn", priority: 0.5, changeFrequency: "weekly" },
  // StatKing public surfaces
  { path: "/stats", priority: 0.6, changeFrequency: "weekly" },
  { path: "/stats/compare", priority: 0.5, changeFrequency: "weekly" },
  { path: "/stats/ask", priority: 0.5, changeFrequency: "weekly" },
  { path: "/stats/proof", priority: 0.5, changeFrequency: "weekly" },
  { path: "/stats/expert-board", priority: 0.5, changeFrequency: "weekly" },
  { path: "/tools", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tools/ev-calculator", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tools/no-vig-calculator", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tools/odds-converter", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tools/parlay-calculator", priority: 0.6, changeFrequency: "monthly" },
];

/** Load upcoming + recent games for preview page URLs (bounded, DB-safe). */
async function loadPreviewGames(): Promise<MetadataRoute.Sitemap> {
  try {
    const games = await db.game.findMany({
      where: {
        status: { in: ["SCHEDULED", "LIVE", "FINAL"] },
        // Must agree with resolveSportParam's active filter: the resolver
        // 404s inactive sports, so the sitemap must not advertise them.
        sport: { is: { active: true } },
      },
      orderBy: { commenceTime: "desc" },
      take: 2000, // well within sitemap's 50 k URL limit
      select: {
        sport: { select: { name: true } }, // required relation — one joined query
        awayTeamName: true,
        homeTeamName: true,
        commenceTime: true,
        updatedAt: true,
      },
    });

    const baseUrl = SITE_URL;

    // The [sport] segment is slugify(Sport.name) — the canonical form the
    // preview page renders (legacy cuid URLs 308 to it). Known edge: if two
    // active sports ever shared a name-slug, the loser's game URLs would
    // resolve to the winner's namespace and 404 at game lookup — acceptable,
    // guarded by the resolver's ambiguity tests + zero collisions in seed data.
    return games.map((g) => ({
      url: `${baseUrl}/preview/${slugify(g.sport.name)}/${slugify(g.awayTeamName)}-vs-${slugify(g.homeTeamName)}`,
      lastModified: g.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time — return empty rather than crashing the build
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const [journalEntries, previewRoutes] = await Promise.all([
    loadPublicJournalEntries(),
    loadPreviewGames(),
  ]);

  // No lastModified on static routes: stamping them with request time claims
  // every page changed today, which teaches crawlers the field is noise.
  // Real change dates stay on journal/preview entries below.
  const staticRoutes = ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    changeFrequency,
    priority,
  }));

  const journalRoutes = journalEntries.map((entry) => ({
    url: `${baseUrl}/journal/${entry.slug}`,
    lastModified: new Date(entry.publishedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...journalRoutes, ...previewRoutes];
}
