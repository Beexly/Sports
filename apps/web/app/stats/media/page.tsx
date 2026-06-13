import Link from "next/link";
import { Shell, Cards, DataTable, BarChart, StatusRibbon } from "../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "Media Intelligence — Player & Team Mentions",
  description: "A rights-aware media signal layer: where players and teams are discussed, and why it matters.",
  alternates: { canonical: "/stats/media" },
};
export default function Page() {
  const items = loadMediaItems();
  const youtube = items.filter(i => i.platform === 'youtube').length;
  const reddit = items.filter(i => i.platform === 'reddit').length;
  const podcasts = items.filter(i => i.platform === 'podcasts').length;
  const rss = items.filter(i => i.platform === 'rss').length;

  return (
    <Shell title="Media Intelligence">
      <StatusRibbon status="fixture" label="Media metadata updated regularly" />
      <Cards items={[
        { label: "Metadata items", value: items.length },
        { label: "YouTube", value: youtube },
        { label: "Reddit", value: reddit },
        { label: "Podcasts/RSS", value: podcasts + rss }
      ]} />
      <div className="flex gap-3 flex-wrap mb-6">
        {[
          { label: "YouTube", href: "/stats/media/youtube" },
          { label: "Reddit", href: "/stats/media/reddit" },
          { label: "Podcasts", href: "/stats/media/podcasts" },
          { label: "RSS", href: "/stats/media/rss" },
          { label: "Trending", href: "/stats/media/trending" },
          { label: "Signals", href: "/stats/media/signals" }
        ].map(p => (
          <Link
            key={p.href}
            className="border border-mineral px-3 py-2 text-sm text-ion-1 hover:border-orbital-cyan hover:text-orbital-cyan transition-colors"
            href={p.href}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <BarChart items={[
        { label: "YouTube", value: youtube, max: Math.max(youtube, reddit, podcasts, rss), tone: "cyan" },
        { label: "Reddit", value: reddit, max: Math.max(youtube, reddit, podcasts, rss), tone: "amber" },
        { label: "Podcasts", value: podcasts, max: Math.max(youtube, reddit, podcasts, rss), tone: "cyan" },
        { label: "RSS", value: rss, max: Math.max(youtube, reddit, podcasts, rss), tone: "amber" }
      ]} />
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Recent Media Items</h2>
        <DataTable
          rows={items.slice(0, 25).map(i => ({
            platform: String(i.platform ?? ""),
            source: String(i.source_name ?? ""),
            title: String(i.title ?? ""),
            players: Array.isArray(i.detected_players) ? i.detected_players.join("; ") : "",
            trust: Number(i.source_trust ?? 0)
          }))}
          maxRows={25}
        />
      </div>
    </Shell>
  );
}
