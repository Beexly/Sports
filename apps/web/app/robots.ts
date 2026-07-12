import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site-url";

/**
 * robots.txt
 *
 * Disallows internal operator surfaces (cockpit, admin, api routes,
 * dev-only paths) and pre-launch placeholders. Allows the rest. Points
 * crawlers at the sitemap.
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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
