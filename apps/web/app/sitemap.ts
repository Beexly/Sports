import type { MetadataRoute } from "next";
import { loadPublicJournalEntries } from "@/lib/journal/load";

/**
 * sitemap.xml
 *
 * Static list of public-facing URLs. Blog post URLs are intentionally
 * omitted while PUBLIC_BLOG_ENABLED is false; once the gate flips, swap
 * this for a dynamic generator that reads published ContentDraft slugs.
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com";
  const now = new Date();
  const journalEntries = await loadPublicJournalEntries();

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

  return [...staticRoutes, ...journalRoutes];
}
