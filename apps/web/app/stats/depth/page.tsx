import { Shell, Cards, Badge, DataTable, StatusRibbon } from "../_components";
import { loadDepthChart, playerNameMap } from "@/lib/statking/product";
export const metadata = {
  title: "Depth Charts — Role & Opportunity by Team",
  description: "Team depth charts mapped to StatKing role and opportunity signals.",
  alternates: { canonical: "/stats/depth" },
};
export default function Page() {
  const names = playerNameMap();
  const depth = loadDepthChart();

  return (
    <Shell title="Depth Charts" eyebrow="Role & opportunity">
      <StatusRibbon status="fixture" label="Depth charts updated every sync cycle" />
      <Cards items={[
        { label: "Teams charted", value: new Set(depth.map(d => d.team)).size },
        { label: "Positions", value: new Set(depth.map(d => d.position)).size },
        { label: "Charted spots", value: depth.length },
        { label: "Status", value: "sample" }
      ]} />
      <p className="text-ion-1">
        Team depth mapped to StatKing role and opportunity, with source lineage on every row.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Sample depth — full-league charting expands as roster sources activate.</Badge>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Depth Chart</h2>
        <DataTable
          rows={[...depth]
            .sort((a, b) => a.team.localeCompare(b.team) || a.position.localeCompare(b.position))
            .slice(0, 60)
            .map(d => ({
              team: String(d.team ?? ""),
              position: String(d.position ?? ""),
              player: names.get(d.player_id) ?? String(d.player_id),
              role: String(d.role ?? ""),
              lineage: Array.isArray(d.source_lineage) ? d.source_lineage.join("; ") : String(d.source_lineage ?? "")
            }))}
          maxRows={60}
        />
      </div>
    </Shell>
  );
}
