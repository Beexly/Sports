import { Shell, Cards, DataTable, StatusRibbon, BarChart, InsightCard, SectionHeader } from "../_components";
import { loadTeams } from "@/lib/statking/product";
export const metadata = {
  title: "Trenches — Line Play & Pressure Context",
  description: "Line-play and pressure context that shapes player opportunity.",
  alternates: { canonical: "/stats/trenches" },
};
export default function Page() {
  const teams = [...loadTeams()].sort((a, b) => (a.defensive_environment ?? 0) - (b.defensive_environment ?? 0));

  return (
    <Shell title="Trenches" eyebrow="Line play & pressure">
      <StatusRibbon status="fixture" label="Trenches data updated every sync cycle" />
      <Cards items={[
        { label: "Teams", value: teams.length },
        { label: "Signal", value: "team-level proxy" },
        { label: "Direct OL/DL", value: "license-gated" },
        { label: "Status", value: "proxy" }
      ]} />
      <InsightCard
        eyebrow="About Trenches Data"
        headline="Snap-level OL/DL data is license-gated — here's the honest proxy"
        body="Direct snap-level charting (NGS, PFF grades) requires licensing we don't hold yet. Protection Proxy = team offensive environment scaled to line-performance signal. Pressure Proxy = team defensive environment. These are real team-level signals, not fabricated — just not yet drill-down line grades."
        tone="warn"
      />
      <SectionHeader title="Teams by Protection Score" eyebrow="Proxy ranking" />
      <div className="border border-mineral bg-eclipse p-4">
        <BarChart items={teams.map(t => ({
          label: String(t.team_id ?? ""),
          value: Number(t.offensive_environment ?? 0),
          max: 100,
          tone: "cyan"
        }))} />
      </div>
      <SectionHeader title="All Teams" />
      <div>
        <DataTable
          rows={teams.map(t => ({
            team: String(t.name ?? ""),
            protection_proxy: Number(t.offensive_environment ?? 0),
            pressure_proxy: Number(t.defensive_environment ?? 0),
            pace: Number(t.pace_proxy ?? 0),
            confidence: String(t.data_confidence ?? 0) + "%"
          }))}
          maxRows={32}
        />
      </div>
    </Shell>
  );
}
