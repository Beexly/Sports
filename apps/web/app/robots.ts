import type { MetadataRoute } from "next";
import { isStatsPublic } from "@/lib/launch/public-surface-gate";
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
          // DERIVED FROM THE SAME GATE THE SITEMAP USES (C-185).
          //
          // These two lines used to be unconditional while sitemap.ts adds
          // /stats, /stats/compare, /stats/ask, /stats/proof and
          // /stats/expert-board the moment isStatsPublic() is true. Submitting
          // a URL in the sitemap that robots.txt forbids is the "Indexed,
          // though blocked by robots.txt" state: the page is neither properly
          // crawled nor cleanly excluded, and Search Console reports it as an
          // error against the site. Latent today because the gate is off,
          // which is why it is worth fixing before it is turned on.
          ...(isStatsPublic() ? [] : ["/stats", "/stats/"]),
        ],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/news-sitemap.xml`],
    host: baseUrl,
  };
}
