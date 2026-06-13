import type { MetadataRoute } from "next";

/**
 * robots.txt
 *
 * Disallows internal operator surfaces (cockpit, admin, api routes,
 * dev-only paths) and pre-launch placeholders. Allows the rest. Points
 * crawlers at the sitemap.
 */

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com";

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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
