import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site-url";
import { isStatsPublic } from "@/lib/launch/public-surface-gate";

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

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
    host: baseUrl,
  };
}
