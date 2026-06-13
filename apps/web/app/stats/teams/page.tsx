import { Shell, Cards, DataTable, BarChart, StatusRibbon, HeroStat } from "../_components";
import { loadTeams } from "@/lib/statking/product";
export const metadata = {
  title: "Team Environments — Pace, Offense & Defense",
  description: "Team environment metrics: pace, offensive and defensive context, and fantasy environment.",
  alternates: { canonical: "/stats/teams" },
};
export default function Page() {
  const teams = loadTeams();
  const topOffense = [...teams].sort((a, b) => b.offensive_environment - a.offensive_environment)[0];
  const topFantasy = [...teams].sort((a, b) => b.fantasy_environment - a.fantasy_environment)[0];
  const avgConfidence = Math.round(teams.reduce((a, t) => a + t.data_confidence, 0) / teams.length);

  return (
    <Shell title="Team Environments">
      <StatusRibbon status="fixture" label="Team environments updated every sync cycle" />
      <Cards items={[
        { label: "Teams", value: teams.length },
        { label: "Top offense", value: topOffense?.team_id ?? "—" },
        { label: "Top fantasy env", value: topFantasy?.team_id ?? "—" },
        { label: "Avg confidence", value: avgConfidence + "%" }
      ]} />
      {topOffense && (
        <div className="grid gap-4 md:grid-cols-2">
          <HeroStat
            label="Top Offensive Environment"
            value={topOffense.team_id}
            sublabel={`Environment: ${Number(topOffense.offensive_environment ?? 0)}`}
            tone="cyan"
          />
          {topFantasy && (
            <HeroStat
              label="Top Fantasy Environment"
              value={topFantasy.team_id}
              sublabel={`Environment: ${Number(topFantasy.fantasy_environment ?? 0)}`}
              tone="amber"
            />
          )}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {teams.slice(0, 8).map(team => (
          <div key={team.team_id} className="border border-mineral bg-eclipse p-4">
            <p className="text-ion-white font-semibold mb-3">{team.team_id}</p>
            <BarChart items={[
              { label: "Offensive env", value: Number(team.offensive_environment ?? 0), max: 100, tone: "cyan" },
              { label: "Defensive env", value: Number(team.defensive_environment ?? 0), max: 100, tone: "amber" },
              { label: "Fantasy env", value: Number(team.fantasy_environment ?? 0), max: 100, tone: "cyan" }
            ]} />
            <p className="mt-3 text-xs text-ion-2">Confidence: {String(team.data_confidence ?? 0)}%</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Teams</h2>
        <DataTable
          rows={teams.map(t => ({
            team: String(t.team_id ?? ""),
            offensive_env: Number(t.offensive_environment ?? 0),
            defensive_env: Number(t.defensive_environment ?? 0),
            fantasy_env: Number(t.fantasy_environment ?? 0),
            pace_proxy: Number(t.pace_proxy ?? 0),
            confidence: String(t.data_confidence ?? 0) + "%"
          }))}
          maxRows={32}
        />
      </div>
    </Shell>
  );
}
