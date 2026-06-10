import { NextResponse } from "next/server";
import {
  isPodcastEnabled,
  loadPodcastManifest,
  publishableEpisodes,
} from "@/lib/podcast/manifest";

/**
 * Podcast RSS feed (POD-01) — gated OFF by default.
 *
 * Serves ONLY founder-published episodes from content/podcast/manifest.json
 * (added by hand after the founder listens to the rendered audio — see
 * docs/command-center/launch/weekly-podcast-design.md). Returns 404 until
 * PODCAST_ENABLED="true", so the launch surface is unaffected.
 */

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<NextResponse> {
  if (!isPodcastEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const siteUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com";
  const manifest = loadPodcastManifest();
  const episodes = publishableEpisodes(manifest);

  const items = episodes
    .map((e) => {
      const audio = e.audioUrl.startsWith("http") ? e.audioUrl : `${siteUrl}${e.audioUrl}`;
      const duration =
        typeof e.durationSec === "number" && e.durationSec > 0
          ? `\n      <itunes:duration>${Math.round(e.durationSec)}</itunes:duration>`
          : "";
      return `    <item>
      <title>${escapeXml(e.title)}</title>
      <description>${escapeXml(e.description ?? "")}</description>
      <pubDate>${new Date(e.date).toUTCString()}</pubDate>
      <enclosure url="${escapeXml(audio)}" type="audio/wav" />
      <guid isPermaLink="false">${escapeXml(`${e.date}-${e.title}`)}</guid>${duration}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${escapeXml(manifest.showTitle || "Galaxy Sports Edge — Weekly")}</title>
    <link>${siteUrl}/podcast</link>
    <description>${escapeXml(
      (manifest.showDescription ||
        "The week's record, graded in public — wins, losses, and the games we passed on.") +
        " Episodes use an AI-generated version of Garrett Baxley's own voice reading human-approved scripts."
    )}</description>
    <language>en-us</language>
    <itunes:author>Garrett Baxley</itunes:author>
${items}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
