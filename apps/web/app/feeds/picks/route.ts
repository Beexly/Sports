import { NextResponse } from "next/server";
import {
  buildRss2Feed,
  type FeedOptions,
} from "@/lib/distribution/rss-builder";

export const revalidate = 3600; // 1 hour

export async function GET() {
  const options: FeedOptions = {
    title: "Galaxy Sports Edge — Recent Picks",
    link: "https://galaxysportsedge.com",
    feedUrl: "https://galaxysportsedge.com/feeds/picks",
    description:
      "Sports intelligence picks. Public analysis only — not financial advice.",
    language: "en-us",
    copyright: `© ${new Date().getFullYear()} Galaxy Sports Edge`,
    ttl: 60,
  };

  // Items would come from a DB loader in production.
  // For now, return an honest empty feed (no fabricated picks).
  const items = [] as const;

  const xml = buildRss2Feed(options, items);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
