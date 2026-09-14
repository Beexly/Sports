import type { MetadataRoute } from "next";
import { loadPublicJournalEntries } from "@/lib/journal/load";
import { SITE_URL } from "@/lib/seo/site-url";
import { slugify } from "@/lib/seo/sports-jsonld";
import { db } from "@sports/db";
import { isContestsPublic, isStatsPublic } from "@/lib/launch/public-surface-gate";
import { listEpisodes } from "@/lib/podcast/episodes";
import { listIssues } from "@/lib/newsletter/issues";
import { findTwinCandidate, type GameTwinCandidate } from "@sports/ingestion-pipeline";

/**
 * sitemap.xml — public product URLs + a **bounded** preview set.
 *
 * Preview routes are capped (not 2k FINALs) so crawl budget is not drowned by
 * long-tail matchup pages. Full history stays reachable by navigation, not
 * forced into the sitemap.
 */

/** Max /preview/* URLs in sitemap — density control for launch quality. */
export const SITEMAP_PREVIEW_CAP = 120;

const ROUTES: ReadonlyArray<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/picks", priority: 0.55, changeFrequency: "daily" },
  { path: "/house", priority: 0.8, changeFrequency: "weekly" },
  { path: "/methodology", priority: 0.8, changeFrequency: "monthly" },
  { path: "/how-we-make-money", priority: 0.6, changeFrequency: "monthly" },
  { path: "/pledge", priority: 0.6, changeFrequency: "monthly" },
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
  { path: "/integrity", priority: 0.7, changeFrequency: "monthly" },
  { path: "/proof", priority: 0.7, changeFrequency: "daily" },
  { path: "/engine", priority: 0.7, changeFrequency: "daily" },
  { path: "/verify", priority: 0.6, changeFrequency: "daily" },
  { path: "/clv", priority: 0.7, changeFrequency: "daily" },
  { path: "/calibration", priority: 0.7, changeFrequency: "weekly" },
  { path: "/fable", priority: 0.6, changeFrequency: "weekly" },
  { path: "/kill-ledger", priority: 0.6, changeFrequency: "monthly" },
  { path: "/bookgrade", priority: 0.6, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/board", priority: 0.65, changeFrequency: "daily" },
  { path: "/slate", priority: 0.65, changeFrequency: "daily" },
  // /board/gate is deliberately excluded: it ships illustrative demonstration
  // rows by default (LIVE_BOARD_GATE_SLATE unset) and is noindexed in that
  // mode (see its generateMetadata) — a sitemap entry would tell crawlers to
  // treat a demo as a daily live surface.
  { path: "/today", priority: 0.7, changeFrequency: "daily" },
  { path: "/track", priority: 0.6, changeFrequency: "daily" },
  { path: "/track/platform", priority: 0.5, changeFrequency: "daily" },
  { path: "/trends", priority: 0.6, changeFrequency: "daily" },
  { path: "/parlay-mri", priority: 0.7, changeFrequency: "weekly" },
  { path: "/academy", priority: 0.7, changeFrequency: "weekly" },
  { path: "/intelligence", priority: 0.7, changeFrequency: "weekly" },
  { path: "/intelligence/engines", priority: 0.5, changeFrequency: "monthly" },
  { path: "/intelligence/metrics", priority: 0.5, changeFrequency: "monthly" },
  { path: "/optimizer", priority: 0.5, changeFrequency: "weekly" },
  { path: "/players", priority: 0.7, changeFrequency: "daily" },
  { path: "/nflverse", priority: 0.6, changeFrequency: "weekly" },
  { path: "/mlb", priority: 0.5, changeFrequency: "weekly" },
  { path: "/nhl", priority: 0.5, changeFrequency: "weekly" },
  { path: "/weather", priority: 0.5, changeFrequency: "daily" },
  { path: "/fantasy", priority: 0.6, changeFrequency: "weekly" },
  { path: "/the-beat", priority: 0.6, changeFrequency: "weekly" },
  { path: "/gsn", priority: 0.5, changeFrequency: "weekly" },
  { path: "/podcast", priority: 0.6, changeFrequency: "weekly" },
  { path: "/newsletter", priority: 0.6, changeFrequency: "weekly" },
  { path: "/tools", priority: 0.85, changeFrequency: "weekly" },
  { path: "/tools/ev-calculator", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tools/no-vig-calculator", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tools/odds-converter", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tools/parlay-calculator", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tools/line-movement", priority: 0.65, changeFrequency: "monthly" },
  { path: "/tools/clv-calculator", priority: 0.65, changeFrequency: "monthly" },
  { path: "/cipher", priority: 0.5, changeFrequency: "weekly" },
  { path: "/glass-ledger", priority: 0.55, changeFrequency: "weekly" },
  { path: "/data", priority: 0.5, changeFrequency: "monthly" },
  { path: "/content-lab", priority: 0.4, changeFrequency: "monthly" },
];

/** Upcoming + recent live games only — not thousands of FINAL archives. */
async function loadPreviewGames(): Promise<MetadataRoute.Sitemap> {
  try {
    const now = Date.now();
    const windowStart = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now + 21 * 24 * 60 * 60 * 1000);

    const games = await db.game.findMany({
      where: {
        status: { in: ["SCHEDULED", "LIVE"] },
        commenceTime: { gte: windowStart, lte: windowEnd },
        sport: { is: { active: true } },
      },
      orderBy: { commenceTime: "asc" },
      take: SITEMAP_PREVIEW_CAP,
      select: {
        id: true,
        externalId: true,
        sportId: true,
        mergedIntoGameId: true,
        sport: { select: { name: true, key: true } },
        awayTeamName: true,
        homeTeamName: true,
        commenceTime: true,
        updatedAt: true,
      },
    });

    // Fixture triplication (AGENTS.md "THE LOOP"): the same real-world contest
    // can exist as up to THREE `games` rows (Odds API id / TheRundown id /
    // ESPN feed id), none tombstoned, and each row independently satisfies the
    // query above and would emit the SAME "N game rows -> N sitemap URLs"
    // count for what is one indexable page. De-duplicate on fixture identity,
    // not row id, with the repo's own twin matcher (the one
    // lib/board/state.ts already uses for the same triplication problem on a
    // different surface) rather than a naive string/URL dedup, so a row whose
    // team names differ slightly across feeds (city-only vs full name) still
    // collapses correctly. `orientation === "flipped"` is the matcher's own
    // refusal to treat two rows as the same fixture (home/away disagree) —
    // never collapsed, exactly as the board treats it.
    const twinCandidates: GameTwinCandidate[] = [];
    const deduped: typeof games = [];
    for (const g of games) {
      const twin = findTwinCandidate(twinCandidates, {
        sportId: g.sportId,
        externalId: g.externalId,
        homeTeamName: g.homeTeamName,
        awayTeamName: g.awayTeamName,
        commenceTime: g.commenceTime,
        sportKey: g.sport.key,
      });
      if (twin && twin.orientation !== "flipped") continue;
      twinCandidates.push({
        id: g.id,
        externalId: g.externalId,
        sportId: g.sportId,
        homeTeamName: g.homeTeamName,
        awayTeamName: g.awayTeamName,
        commenceTime: g.commenceTime,
        mergedIntoGameId: g.mergedIntoGameId,
      });
      deduped.push(g);
    }

    const baseUrl = SITE_URL;
    return deduped.map((g) => ({
      url: `${baseUrl}/preview/${slugify(g.sport.name)}/${slugify(g.awayTeamName)}-vs-${slugify(g.homeTeamName)}`,
      lastModified: g.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.55,
    }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const [journalEntries, previewRoutes] = await Promise.all([
    loadPublicJournalEntries(),
    loadPreviewGames(),
  ]);

  const routes = [
    ...ROUTES,
    ...(isStatsPublic()
      ? ([
          { path: "/stats", priority: 0.6, changeFrequency: "weekly" as const },
          { path: "/stats/compare", priority: 0.5, changeFrequency: "weekly" as const },
          { path: "/stats/ask", priority: 0.5, changeFrequency: "weekly" as const },
          { path: "/stats/proof", priority: 0.5, changeFrequency: "weekly" as const },
          { path: "/stats/expert-board", priority: 0.5, changeFrequency: "weekly" as const },
        ] as const)
      : []),
    ...(isContestsPublic()
      ? ([
          { path: "/fantasy/contests", priority: 0.6, changeFrequency: "weekly" as const },
          { path: "/contests", priority: 0.65, changeFrequency: "daily" as const },
        ] as const)
      : []),
  ];

  const staticRoutes = routes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    changeFrequency,
    priority,
  }));

  const podcastRoutes = listEpisodes().map((ep) => ({
    url: `${baseUrl}/podcast/${ep.slug}`,
    lastModified: new Date(ep.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  const newsletterRoutes = listIssues().map((issue) => ({
    url: `${baseUrl}/newsletter/${issue.slug}`,
    lastModified: new Date(issue.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  const journalRoutes = journalEntries.map((entry) => ({
    url: `${baseUrl}/journal/${entry.slug}`,
    lastModified: new Date(entry.publishedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...podcastRoutes, ...newsletterRoutes, ...journalRoutes, ...previewRoutes];
}
