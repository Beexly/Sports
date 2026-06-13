import { Shell, Cards, Badge, SimpleTable } from "../_components";
import { loadDepthChart, playerNameMap } from "@/lib/statking/product";
export const metadata = {
  title: "Depth Charts — Role & Opportunity by Team",
  description: "Team depth charts mapped to StatKing role and opportunity signals.",
  alternates: { canonical: "/stats/depth" },
};
export default function Page(){
  const names=playerNameMap(); const depth=loadDepthChart();
  const rows=[...depth].sort((a,b)=>a.team.localeCompare(b.team)||a.position.localeCompare(b.position)).slice(0,60).map(d=>({team:d.team,position:d.position,player:names.get(d.player_id)??d.player_id,role:d.role,lineage:d.source_lineage}));
  return <Shell title="Depth Charts" eyebrow="Role & opportunity"><Cards items={[{label:"Teams charted",value:new Set(depth.map(d=>d.team)).size},{label:"Positions",value:new Set(depth.map(d=>d.position)).size},{label:"Charted spots",value:depth.length},{label:"Status",value:"sample"}]}/>
  <p className="text-ion-1">Team depth mapped to StatKing role and opportunity, with source lineage on every row.</p>
  <Badge tone="warn">Sample depth — full-league charting expands as roster sources activate.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
