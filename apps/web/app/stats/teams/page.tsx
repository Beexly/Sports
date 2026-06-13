import { Shell, Cards, SimpleTable } from "../_components";
import { loadTeams } from "@/lib/statking/product";
export const metadata = {
  title: "Team Environments — Pace, Offense & Defense",
  description: "Team environment metrics: pace, offensive and defensive context, and fantasy environment.",
  alternates: { canonical: "/stats/teams" },
};
export default function Page(){ const teams=loadTeams(); return <Shell title="Team Environments"><Cards items={[{label:"Teams",value:teams.length},{label:"Top offense",value:[...teams].sort((a,b)=>b.offensive_environment-a.offensive_environment)[0]?.team_id ?? "—"},{label:"Top fantasy env",value:[...teams].sort((a,b)=>b.fantasy_environment-a.fantasy_environment)[0]?.team_id ?? "—"},{label:"Avg confidence",value:Math.round(teams.reduce((a,t)=>a+t.data_confidence,0)/teams.length)+"%"}]}/><SimpleTable rows={teams}/></Shell>}
