import { Shell, Cards, SimpleTable } from "../_components";
import { loadTeams } from "@/lib/statking/product";
export const metadata = {
  title: "Scheme — Team Tendencies & Context",
  description: "Scheme and team-context signals layered onto player opportunity.",
  alternates: { canonical: "/stats/scheme" },
};
export default function Page(){
  const teams=[...loadTeams()].sort((a,b)=>b.offensive_environment-a.offensive_environment);
  const rows=teams.map(t=>({team:t.name,off_env:t.offensive_environment,def_env:t.defensive_environment,fantasy_env:t.fantasy_environment,pace:t.pace_proxy,confidence:t.data_confidence+"%"}));
  const n=Math.max(1,teams.length);
  return <Shell title="Scheme & Team Context" eyebrow="Environment"><Cards items={[{label:"Teams",value:teams.length},{label:"Avg off env",value:Math.round(teams.reduce((a,t)=>a+t.offensive_environment,0)/n)},{label:"Avg def env",value:Math.round(teams.reduce((a,t)=>a+t.defensive_environment,0)/n)},{label:"Avg pace",value:Math.round(teams.reduce((a,t)=>a+t.pace_proxy,0)/n)}]}/>
  <p className="text-ion-1">Team environment is the context every player number sits inside — offense, defense, and pace, ranked.</p>
  <SimpleTable rows={rows}/></Shell>;
}
