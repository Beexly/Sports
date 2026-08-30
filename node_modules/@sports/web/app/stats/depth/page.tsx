import { Shell, Cards, DataTable, StatusRibbon, InsightCard, SectionHeader } from "../_components";
import { loadDepthChart, playerNameMap } from "@/lib/statking/product";
export const metadata = {
  title: "Depth Charts: Role & Opportunity by Team",
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
      <InsightCard
        eyebrow="How to Use Depth Charts"
        headline="Role and opportunity before the stat line"
        body="Depth position predicts target share and carry share before box scores confirm it. A WR2 in a pass-heavy offense may be worth more than a WR1 in a run-first scheme. Use depth + team environment together for the clearest opportunity read. Sample coverage expands as roster sources activate."
        tone="neutral"
      />
      <SectionHeader title="Depth by Team" />
      <div>
        <DataTable
          rows={[...depth]
            .sort((a, b) => a.team.localeCompare(b.team) || a.position.localeCompare(b.position))
            .slice(0, 100)
            .map(d => ({
              team: String(d.team ?? ""),
              position: String(d.position ?? ""),
              player: names.get(d.player_id) ?? String(d.player_id),
              role: String(d.role ?? "") || "—",
              lineage: (Array.isArray(d.source_lineage) ? d.source_lineage.join("; ") : String(d.source_lineage ?? "")) || "—"
            }))}
          maxRows={100}
          caption="Depth chart spots by team and position with StatKing role and source lineage"
        />
      </div>
    </Shell>
  );
}
