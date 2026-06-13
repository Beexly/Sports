import { Shell, Cards, DataTable, StatusRibbon } from "../../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "Podcast Intelligence — NFL Audio Signal",
  description: "Metadata-level podcast intelligence tracking player and team mentions across NFL shows.",
  alternates: { canonical: "/stats/media/podcasts" },
};
export default function Page() {
  const items = loadMediaItems().filter(i => i.platform === "podcasts");
  const metadataOnly = items.filter(i => i.rights_mode === 'metadata_only').length;
  const avgTrust = Math.round(items.reduce((a, i) => a + (i.source_trust ?? 0), 0) / Math.max(1, items.length));
  const needsActivation = items.filter(i => i.activation_status).length;

  return (
    <Shell title="Podcasts Intelligence">
      <StatusRibbon status="fixture" label="Podcast metadata snapshot" />
      <Cards items={[
        { label: "Tracked", value: items.length },
        { label: "Metadata only", value: metadataOnly },
        { label: "Avg trust", value: avgTrust },
        { label: "Needs activation", value: needsActivation }
      ]} />
      <p className="text-ion-1">
        Metadata-level podcast intelligence tracking player and team mentions across NFL shows. Episode titles, hosts, and detected topics only.
      </p>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Podcasts</h2>
        <DataTable
          rows={items.map(i => ({
            source: String(i.source_name ?? ""),
            title: String(i.title ?? ""),
            players: Array.isArray(i.detected_players) ? i.detected_players.join("; ") : "",
            rights_mode: String(i.rights_mode ?? ""),
            trust: Number(i.source_trust ?? 0)
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
