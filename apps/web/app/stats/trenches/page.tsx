import { Shell, Cards, DataTable, StatusRibbon, BarChart, InsightCard, SectionHeader } from "../_components";
import { loadTeams } from "@/lib/statking/product";
export const metadata = {
  title: "Trenches: Line Play & Pressure Context",
  description: "Line-play and pressure context that shapes player opportunity.",
  alternates: { canonical: "/stats/trenches" },
};
export default function Page() {
  const teams = [...loadTeams()].sort((a, b) => (a.defensive_environment ?? 0) - (b.defensive_environment ?? 0));
  // Display order only: the protection chart ranks by the protection proxy it
  // plots, highest first, so the bar lengths and the ordering tell one story.
  const byProtection = [...teams].sort((a, b) => (b.offensive_environment ?? 0) - (a.offensive_environment ?? 0));

  return (
    <Shell title="Trenches" eyebrow="Line play & pressure">
      <StatusRibbon status="fixture" label="Fixture snapshot: team-level proxies, not live line charting" />
      <Cards items={[
        { label: "Teams", value: teams.length },
        { label: "Signal", value: "team-level proxy" },
        { label: "Direct OL/DL", value: "license-gated" },
        { label: "Status", value: "proxy" }
      ]} />
      <InsightCard
        eyebrow="About Trenches Data"
        headline="Snap-level OL/DL data is license-gated. Here's the honest proxy"
        body="Direct snap-level charting (NGS, PFF grades) requires licensing we don't hold yet. Protection Proxy = team offensive environment scaled to line-performance signal. Pressure Proxy = team defensive environment. These are real team-level signals, not fabricated, just not yet drill-down line grades."
        tone="warn"
      />
      <SectionHeader title="Teams by Protection Score" eyebrow="Proxy ranking" />
      {byProtection.length === 0 ? (
        <p className="border border-mineral bg-eclipse/40 px-4 py-6 text-center text-sm text-ion-1">
          No teams in the current snapshot. Rankings appear once the team sync populates.
        </p>
      ) : (
        <div className="border border-mineral bg-eclipse p-4">
          <BarChart items={byProtection.map(t => ({
            label: String(t.name ?? t.team_id ?? ""),
            value: Number(t.offensive_environment ?? 0),
            max: 100,
            tone: "cyan"
          }))} />
        </div>
      )}
      <SectionHeader title="All Teams" eyebrow={teams.length + " teams"} />
      <div>
        <DataTable
          caption="Team line-play proxies: protection proxy, pressure proxy, pace, and data confidence per team"
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
