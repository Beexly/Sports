import { Shell, Cards, Badge, DataTable, BarChart, StatusRibbon, SectionHeader } from "../../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "Trending: What's Moving in NFL Media",
  description: "The players and teams gaining media attention right now.",
  alternates: { canonical: "/stats/media/trending" },
};
export default function Page() {
  const items = loadMediaItems();
  const trending = [...items].sort((a, b) => (b.source_trust ?? 0) - (a.source_trust ?? 0)).slice(0, 30);

  const mentions = new Map<string, number>();
  items.forEach(i => {
    if (Array.isArray(i.detected_players)) {
      i.detected_players.forEach(p => mentions.set(String(p), (mentions.get(String(p)) || 0) + 1));
    }
  });
  const top = [...mentions.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <Shell title="Trending" eyebrow="What's moving">
      <StatusRibbon status="active" label="Trending media updated regularly" />
      <Cards items={[
        { label: "Items", value: items.length },
        { label: "Top mention", value: top ? top[0] : "—" },
        { label: "Platforms", value: new Set(items.map(i => i.platform)).size },
        { label: "Rights", value: "metadata-only" }
      ]} />
      <p className="max-w-3xl text-ion-1">
        The players and teams gaining media attention right now, ranked by source trust.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Metadata only: headlines and mentions, not full content.</Badge>
      </div>
      <div className="border border-mineral bg-eclipse p-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Most mentioned players</p>
        {mentions.size ? (
          <BarChart items={
            [...mentions.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([player, count]) => ({
                label: String(player),
                value: count,
                max: Math.max(...[...mentions.values()]),
                tone: "cyan"
              }))
          } />
        ) : (
          <p className="text-sm text-ion-1">No player mentions detected in this snapshot.</p>
        )}
      </div>
      <div className="space-y-4">
        <SectionHeader title="Top 20 trending items" />
        <DataTable
          rows={trending.map(i => ({
            platform: String(i.platform ?? ""),
            source: String(i.source_name ?? ""),
            title: String(i.title ?? ""),
            players: Array.isArray(i.detected_players) ? i.detected_players.join("; ") : "",
            topics: Array.isArray(i.topics) ? i.topics.join("; ") : "",
            trust: Number(i.source_trust ?? 0)
          }))}
          maxRows={20}
          caption="Top 20 trending media items with platform, source, title, detected players, topics, and source trust"
        />
      </div>
    </Shell>
  );
}
