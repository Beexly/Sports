import { Shell, Cards, Badge, DataTable, StatusRibbon, InsightCard } from "../../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "Media Signals: Cross-Source Player Buzz",
  description: "Cross-source media signal candidates surfaced for review.",
  alternates: { canonical: "/stats/media/signals" },
};
export default function Page() {
  const items = loadMediaItems();
  const signals = items.filter(i => Boolean(i.signal_candidate) && i.signal_candidate !== "none");

  return (
    <Shell title="Media Signals" eyebrow="Cross-source buzz">
      <StatusRibbon status="active" label="Media signals updated regularly" />
      <Cards items={[
        { label: "Metadata items", value: items.length },
        { label: "Signal candidates", value: signals.length },
        { label: "Platforms", value: new Set(items.map(i => i.platform)).size },
        { label: "Rights", value: "metadata-only" }
      ]} />
      <p className="text-ion-1">
        Where the same player or topic is surfacing across platforms: the cross-source agreement that makes a media signal worth a look.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Metadata only; article bodies and transcripts are never extracted.</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {signals.slice(0, 6).map((i, idx) => (
          <InsightCard
            key={idx}
            eyebrow={String(i.platform ?? "").toUpperCase()}
            headline={String(i.signal_candidate ?? "")}
            body={`Source: ${i.source_name ?? "—"}. Players: ${Array.isArray(i.detected_players) ? i.detected_players.join(", ") : "—"}`}
            tone="good"
          />
        ))}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Signal Candidates</h2>
        <DataTable
          rows={signals.slice(0, 30).map(i => ({
            platform: String(i.platform ?? ""),
            source: String(i.source_name ?? ""),
            signal: String(i.signal_candidate ?? ""),
            players: Array.isArray(i.detected_players) ? i.detected_players.join("; ") : "",
            topics: Array.isArray(i.topics) ? i.topics.join("; ") : "",
            trust: Number(i.source_trust ?? 0)
          }))}
          maxRows={30}
        />
      </div>
    </Shell>
  );
}
