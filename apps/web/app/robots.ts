import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site-url";

/**
 * robots.txt
 *
 * Disallows internal operator surfaces and foundation-only public dark routes.
 * Complete public products stay crawlable.
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
          // StatKing foundation — public only with STATS_PUBLIC=true
          "/stats",
          "/stats/",
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
    host: baseUrl,
  };
}
