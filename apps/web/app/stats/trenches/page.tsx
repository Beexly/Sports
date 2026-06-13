import { Shell, Cards, Badge, SimpleTable } from "../_components";
import { loadTeams } from "@/lib/statking/product";
export const metadata = {
  title: "Trenches — Line Play & Pressure Context",
  description: "Line-play and pressure context that shapes player opportunity.",
  alternates: { canonical: "/stats/trenches" },
};
export default function Page(){
  const teams=[...loadTeams()].sort((a,b)=>a.defensive_environment-b.defensive_environment);
  const rows=teams.map(t=>({team:t.name,protection_proxy:t.offensive_environment,pressure_proxy:t.defensive_environment,pace:t.pace_proxy,confidence:t.data_confidence+"%"}));
  return <Shell title="Trenches" eyebrow="Line play & pressure"><Cards items={[{label:"Teams",value:teams.length},{label:"Signal",value:"team-level proxy"},{label:"Direct OL/DL",value:"license-gated"},{label:"Status",value:"proxy"}]}/>
  <p className="text-ion-1">Line play shapes every skill-position number. Direct OL/DL tracking is license-gated, so this shows the team-level protection and pressure environment as the honest proxy.</p>
  <Badge tone="warn">Proxy, not snap-level charting.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
