import { Shell, Cards, DataTable, StatusRibbon } from "../../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "YouTube Intelligence — Video Signal",
  description: "Video metadata intelligence tracking NFL player and team coverage.",
  alternates: { canonical: "/stats/media/youtube" },
};
export default function Page() {
  const items = loadMediaItems().filter(i => i.platform === "youtube");
  const metadataOnly = items.filter(i => i.rights_mode === 'metadata_only').length;
  const avgTrust = Math.round(items.reduce((a, i) => a + (i.source_trust ?? 0), 0) / Math.max(1, items.length));
  const needsActivation = items.filter(i => i.activation_status).length;

  return (
    <Shell title="Youtube Intelligence">
      <StatusRibbon status="fixture" label="YouTube metadata snapshot" />
      <Cards items={[
        { label: "Tracked", value: items.length },
        { label: "Metadata only", value: metadataOnly },
        { label: "Avg trust", value: avgTrust },
        { label: "Needs activation", value: needsActivation }
      ]} />
      <p className="text-ion-1">
        Video metadata intelligence tracking NFL player and team coverage across YouTube channels.
      </p>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">YouTube Channels</h2>
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
