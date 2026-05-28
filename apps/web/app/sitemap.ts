import type { MetadataRoute } from "next";
import { loadPublicJournalEntries } from "@/lib/journal/load";
import { SITEMAP_ROUTES } from "@/lib/routes-catalog";

/**
 * sitemap.xml
 *
 * Derived from `lib/routes-catalog.ts` — single source of truth.
 * Add new public routes there; this file consumes them automatically.
 *
 * Blog post URLs come from the journal loader; this stays dynamic so the
 * sitemap reflects newly published entries without redeploy.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com";
  const now = new Date();
  const journalEntries = await loadPublicJournalEntries();

  const staticRoutes = SITEMAP_ROUTES.map(({ path, priority, changeFrequency }) => ({
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
