import { Shell, Cards, DataTable, BarChart, StatusRibbon, HeroStat } from "../_components";
import { loadTeams } from "@/lib/statking/product";
export const metadata = {
  title: "Scheme — Team Tendencies & Context",
  description: "Scheme and team-context signals layered onto player opportunity.",
  alternates: { canonical: "/stats/scheme" },
};
export default function Page() {
  const teams = [...loadTeams()].sort((a, b) => b.offensive_environment - a.offensive_environment);
  const n = Math.max(1, teams.length);
  const avgOffEnv = Math.round(teams.reduce((a, t) => a + (t.offensive_environment ?? 0), 0) / n);
  const avgDefEnv = Math.round(teams.reduce((a, t) => a + (t.defensive_environment ?? 0), 0) / n);
  const avgPace = Math.round(teams.reduce((a, t) => a + (t.pace_proxy ?? 0), 0) / n);

  return (
    <Shell title="Scheme & Team Context" eyebrow="Environment">
      <StatusRibbon status="fixture" label="Team scheme contexts updated every sync cycle" />
      <Cards items={[
        { label: "Teams", value: teams.length },
        { label: "Avg off env", value: avgOffEnv },
        { label: "Avg def env", value: avgDefEnv },
        { label: "Avg pace", value: avgPace }
      ]} />
      <p className="text-ion-1">
        Team environment is the context every player number sits inside — offense, defense, and pace, ranked.
      </p>
      {teams.length > 0 && (
        <HeroStat
          label="Top Offensive Environment"
          value={teams[0]?.name ?? "—"}
          sublabel={`Off Env: ${Number(teams[0]?.offensive_environment ?? 0)}`}
          tone="cyan"
        />
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {teams.slice(0, 8).map(team => (
          <div key={team.team_id} className="border border-mineral bg-eclipse p-4">
            <p className="text-ion-white font-semibold mb-3">{team.name}</p>
            <BarChart items={[
              { label: "Offensive env", value: Number(team.offensive_environment ?? 0), max: 100, tone: "cyan" },
              { label: "Defensive env", value: Number(team.defensive_environment ?? 0), max: 100, tone: "amber" },
              { label: "Pace", value: Number(team.pace_proxy ?? 0), max: 100, tone: "cyan" }
            ]} />
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Teams</h2>
        <DataTable
          rows={teams.map(t => ({
            team: String(t.name ?? ""),
            off_env: Number(t.offensive_environment ?? 0),
            def_env: Number(t.defensive_environment ?? 0),
            fantasy_env: Number(t.fantasy_environment ?? 0),
            pace: Number(t.pace_proxy ?? 0),
            confidence: String(t.data_confidence ?? 0) + "%"
          }))}
          maxRows={32}
        />
      </div>
    </Shell>
  );
}
