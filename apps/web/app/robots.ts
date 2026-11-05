import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site-url";
import { isStatsPublic } from "@/lib/launch/public-surface-gate";
import { AI_CRAWLER_USER_AGENTS } from "@/lib/seo/ai-agent-and-search-seo";

/**
 * robots.txt
 *
 * Disallows internal operator surfaces and foundation-only public dark routes.
 * Complete public products stay crawlable.
 *
 * The `/stats` disallow is gated on the SAME `isStatsPublic()` helper the
 * sitemap uses to decide whether to submit `/stats*`. Both surfaces must agree
 * in BOTH flag states: an ungated disallow means that the moment
 * STATS_PUBLIC=true the sitemap advertises five URLs robots.txt forbids, and
 * Search Console reports "Submitted URL blocked by robots.txt" for every one.
 */

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;
  const disallowed = [
    "/admin",
    "/admin/",
    "/cockpit",
    "/cockpit/",
    "/api/",
    "/auth/",
    "/dashboard",
    "/dashboard/",
    "/brief",
    "/go/",
    // StatKing foundation — public only with STATS_PUBLIC=true.
    // Kept in lockstep with the sitemap's isStatsPublic() gate.
    ...(isStatsPublic() ? [] : ["/stats", "/stats/"]),
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt", "/llms-full.txt", "/.well-known/ai-plugin.json"],
        disallow: disallowed,
      },
      {
        userAgent: AI_CRAWLER_USER_AGENTS,
        allow: ["/", "/llms.txt", "/llms-full.txt", "/.well-known/ai-plugin.json"],
        disallow: disallowed,
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
    host: baseUrl,
  };
}
