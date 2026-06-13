import { Shell, Cards, Badge, DataTable, StatusRibbon, BarChart } from "../_components";
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
      <p className="text-ion-1">
        Line play shapes every skill-position number. Direct OL/DL tracking is license-gated, so this shows the team-level protection and pressure environment as the honest proxy.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Proxy, not snap-level charting.</Badge>
      </div>
      <div className="border border-mineral bg-eclipse p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Teams Ranked by Protection</p>
        <BarChart items={teams.slice(0, 10).map(t => ({
          label: String(t.team_id ?? ""),
          value: Number(t.offensive_environment ?? 0),
          max: 100,
          tone: "cyan"
        }))} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Teams</h2>
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
