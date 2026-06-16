import type { MetadataRoute } from "next";
import { loadPublicJournalEntries } from "@/lib/journal/load";
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
  { path: "/accountability", priority: 0.7, changeFrequency: "weekly" },
  { path: "/proof", priority: 0.7, changeFrequency: "daily" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  // Daily intelligence surfaces
  { path: "/board", priority: 0.8, changeFrequency: "daily" },
  { path: "/brief", priority: 0.8, changeFrequency: "daily" },
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
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Load upcoming + recent games for preview page URLs (bounded, DB-safe). */
async function loadPreviewGames(): Promise<MetadataRoute.Sitemap> {
  try {
    const games = await db.game.findMany({
      where: {
        status: { in: ["SCHEDULED", "LIVE", "FINAL"] },
      },
      orderBy: { commenceTime: "desc" },
      take: 2000, // well within sitemap's 50 k URL limit
      select: {
        sportId: true,
        awayTeamName: true,
        homeTeamName: true,
        commenceTime: true,
        updatedAt: true,
      },
    });

    const baseUrl =
      process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com";

    return games.map((g) => ({
      url: `${baseUrl}/preview/${slugify(g.sportId)}/${slugify(g.awayTeamName)}-vs-${slugify(g.homeTeamName)}`,
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
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com";
  const now = new Date();
  const [journalEntries, previewRoutes] = await Promise.all([
    loadPublicJournalEntries(),
    loadPreviewGames(),
  ]);

  const staticRoutes = ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
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
