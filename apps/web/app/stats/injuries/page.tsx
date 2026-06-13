import { Shell, Cards, Badge, SimpleTable } from "../_components";
import { loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Injury Report — Status & Fantasy Impact",
  description: "Current injury status mapped to role and fantasy impact across the player universe.",
  alternates: { canonical: "/stats/injuries" },
};
export default function Page(){
  const players=loadPlayers();
  const flagged=players.filter(p=>p.status!=="Active");
  const rows=flagged.map(p=>({player:p.name,team:p.team,pos:p.position,status:p.status,usage:p.usage_score,fantasy:p.fantasy_edge,missing:p.missing_data}));
  return <Shell title="Injury Report" eyebrow="Status & impact"><Cards items={[{label:"Players tracked",value:players.length},{label:"Status flags",value:flagged.length},{label:"Active",value:players.filter(p=>p.status==="Active").length},{label:"Need live feed",value:players.filter(p=>p.missing_data.some(m=>/injur/i.test(m))).length}]}/>
  <p className="text-ion-1">Current status mapped to role and fantasy impact, so a designation reads as a usage consequence, not just a label.</p>
  <Badge tone="warn">Official injury designations require a licensed feed; status shown is from public roster signal.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
