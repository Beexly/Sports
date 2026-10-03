import { EPISODES, PODCAST_SHOW } from "@/lib/podcast/episodes";

export const dynamic = "force-static";

export function GET() {
  const items = EPISODES.map((ep) => {
    const link = `${PODCAST_SHOW.link}/${ep.slug}`;
    return `
    <item>
      <title><![CDATA[Ep ${ep.number}: ${ep.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(ep.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${ep.summary}]]></description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${PODCAST_SHOW.title}</title>
    <link>${PODCAST_SHOW.link}</link>
    <description>${PODCAST_SHOW.description}</description>
    <language>${PODCAST_SHOW.language}</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
