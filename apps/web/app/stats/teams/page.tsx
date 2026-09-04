import { Shell, Cards, DataTable, BarChart, StatusRibbon, HeroStat, InsightCard, SectionHeader } from "../_components";
import { loadTeams } from "@/lib/statking/product";
import { STAT_PLACEHOLDER } from "@/lib/format/stat";
export const metadata = {
  title: "Team Environments: Pace, Offense & Defense",
  description: "Team environment metrics: pace, offensive and defensive context, and fantasy environment.",
  alternates: { canonical: "/stats/teams" },
};
export default function Page() {
  const teams = loadTeams();
  const topOffense = [...teams].sort((a, b) => b.offensive_environment - a.offensive_environment)[0];
  const topFantasy = [...teams].sort((a, b) => b.fantasy_environment - a.fantasy_environment)[0];
  // An empty snapshot divides by zero: `avgConfidence + "%"` rendered the
  // literal string "NaN%" in a customer-facing stat card, and the leader notes
  // captioned a missing team with a fabricated "env: 0". Missing data takes the
  // em-dash placeholder and drops the note entirely (lib/format/stat.ts
  // doctrine) — never "NaN", never an invented zero.
  const avgConfidence =
    teams.length > 0
      ? `${Math.round(teams.reduce((a, t) => a + t.data_confidence, 0) / teams.length)}%`
      : STAT_PLACEHOLDER;

  return (
    <Shell title="Team Environments">
      <StatusRibbon status="fixture" label="Team environments updated every sync cycle" />
      <Cards items={[
        { label: "Teams", value: teams.length },
        topOffense
          ? { label: "Top offense", value: topOffense.team_id, note: "Offensive env: " + Number(topOffense.offensive_environment ?? 0) }
          : { label: "Top offense", value: STAT_PLACEHOLDER },
        topFantasy
          ? { label: "Top fantasy env", value: topFantasy.team_id, note: "Fantasy env: " + Number(topFantasy.fantasy_environment ?? 0) }
          : { label: "Top fantasy env", value: STAT_PLACEHOLDER },
        { label: "Avg confidence", value: avgConfidence }
      ]} />
      {teams.length === 0 && (
        <p
          data-testid="stats-teams-empty"
          className="border border-mineral bg-eclipse/40 px-4 py-4 text-sm text-ion-1"
        >
          The team-environment snapshot is empty — no teams have loaded yet.
          Nothing is broken; this page fills in on the next sync cycle.
        </p>
      )}
      <InsightCard
        eyebrow="Why Team Environment Matters"
        headline="A player's ceiling is set by their team context, not just their talent"
        body="High offensive environment = more play-calling volume and pass-friendly looks. High fantasy environment = historical correlation with skill-player targets and opportunity. Use these to separate players stuck in bad systems from those with a real path to production."
        tone="neutral"
      />
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
              tone="cyan"
            />
          )}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {teams.map(team => (
          <div key={team.team_id} className="border border-mineral bg-eclipse p-4">
            <p className="text-ion-white font-semibold mb-3">{team.team_id}</p>
            <BarChart items={[
              { label: "Offensive env", value: Number(team.offensive_environment ?? 0), max: 100, tone: "cyan" },
              { label: "Defensive env", value: Number(team.defensive_environment ?? 0), max: 100, tone: "neutral" },
              { label: "Fantasy env", value: Number(team.fantasy_environment ?? 0), max: 100, tone: "cyan" }
            ]} />
            <p className="mt-3 text-xs text-ion-2 tabular-nums">Confidence: {String(team.data_confidence ?? 0)}%</p>
          </div>
        ))}
      </div>
      <SectionHeader title="All Team Environments" eyebrow={teams.length + " teams"} />
      <div>
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
          caption="Offensive, defensive, and fantasy environment scores with pace proxy and data confidence per team"
        />
      </div>
    </Shell>
  );
}
