import Link from "next/link";
import { Shell, Cards, DataTable, BarChart, StatusRibbon } from "../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "Media Intelligence: Player & Team Mentions",
  description: "A rights-aware media signal layer: where players and teams are discussed, and why it matters.",
  alternates: { canonical: "/stats/media" },
};

const PLATFORMS = [
  { key: "youtube", label: "YouTube" },
  { key: "reddit", label: "Reddit" },
  { key: "podcasts", label: "Podcasts" },
  { key: "rss", label: "RSS" },
] as const;

function FilterTabs({ selected }: { selected?: string }) {
  const base = "border px-3 py-2 text-sm transition-colors whitespace-nowrap";
  const on = "border-orbital-cyan text-orbital-cyan";
  const off = "border-mineral text-ion-1 hover:border-orbital-cyan hover:text-orbital-cyan";
  return (
    <div className="flex gap-3 flex-wrap mb-6">
      <Link href="/stats/media" className={`${base} ${!selected ? on : off}`}>All</Link>
      {PLATFORMS.map((p) => (
        <Link key={p.key} href={`/stats/media?platform=${p.key}`} className={`${base} ${selected === p.key ? on : off}`}>{p.label}</Link>
      ))}
      {/* Trending & Signals are distinct cross-platform views, not single-platform filters. */}
      <Link href="/stats/media/trending" className={`${base} ${off}`}>Trending</Link>
      <Link href="/stats/media/signals" className={`${base} ${off}`}>Signals</Link>
    </div>
  );
}

export default function Page({ searchParams }: { searchParams?: { platform?: string } }) {
  const items = loadMediaItems();
  const selected = PLATFORMS.find((p) => p.key === searchParams?.platform)?.key;

  // Per-platform view (folds in the former /stats/media/{youtube,reddit,podcasts,rss} pages).
  if (selected) {
    const f = items.filter((i) => i.platform === selected);
    const metadataOnly = f.filter((i) => i.rights_mode === "metadata_only").length;
    const avgTrust = Math.round(f.reduce((a, i) => a + (i.source_trust ?? 0), 0) / Math.max(1, f.length));
    const needsActivation = f.filter((i) => i.activation_status).length;
    const label = PLATFORMS.find((p) => p.key === selected)!.label;
    return (
      <Shell title="Media Intelligence">
        <StatusRibbon status="fixture" label="Media metadata snapshot" />
        <FilterTabs selected={selected} />
        <Cards items={[
          { label: "Tracked", value: f.length },
          { label: "Metadata only", value: metadataOnly },
          { label: "Avg trust", value: avgTrust },
          { label: "Needs activation", value: needsActivation },
        ]} />
        <p className="text-ion-1">{label} mentions: titles, sources, and detected players only (metadata-level, rights-aware).</p>
        <div>
          <h2 className="text-2xl font-semibold text-ion-white mb-4">{label}</h2>
          <DataTable
            rows={f.map((i) => ({
              source: String(i.source_name ?? ""),
              title: String(i.title ?? ""),
              players: Array.isArray(i.detected_players) ? i.detected_players.join("; ") : "",
              rights_mode: String(i.rights_mode ?? ""),
              trust: Number(i.source_trust ?? 0),
            }))}
            maxRows={50}
          />
        </div>
      </Shell>
    );
  }

  // Overview (all platforms).
  const youtube = items.filter((i) => i.platform === "youtube").length;
  const reddit = items.filter((i) => i.platform === "reddit").length;
  const podcasts = items.filter((i) => i.platform === "podcasts").length;
  const rss = items.filter((i) => i.platform === "rss").length;
  const max = Math.max(youtube, reddit, podcasts, rss, 1);
  return (
    <Shell title="Media Intelligence">
      <StatusRibbon status="fixture" label="Media metadata updated regularly" />
      <FilterTabs />
      <Cards items={[
        { label: "Metadata items", value: items.length },
        { label: "YouTube", value: youtube },
        { label: "Reddit", value: reddit },
        { label: "Podcasts/RSS", value: podcasts + rss },
      ]} />
      <BarChart items={[
        { label: "YouTube", value: youtube, max, tone: "cyan" },
        { label: "Reddit", value: reddit, max, tone: "amber" },
        { label: "Podcasts", value: podcasts, max, tone: "cyan" },
        { label: "RSS", value: rss, max, tone: "amber" },
      ]} />
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Recent Media Items</h2>
        <DataTable
          rows={items.slice(0, 25).map((i) => ({
            platform: String(i.platform ?? ""),
            source: String(i.source_name ?? ""),
            title: String(i.title ?? ""),
            players: Array.isArray(i.detected_players) ? i.detected_players.join("; ") : "",
            trust: Number(i.source_trust ?? 0),
          }))}
          maxRows={25}
        />
      </div>
    </Shell>
  );
}
