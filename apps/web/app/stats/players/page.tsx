import { Shell, Cards, PlayerTable } from "../_components";
import { rankPlayers, loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Player Database — Every Tracked NFL Player",
  description: "Browse the full StatKing player universe with usage, efficiency, role, and fantasy edge.",
  alternates: { canonical: "/stats/players" },
};
export default function Page(){ const players=rankPlayers(); const all=loadPlayers(); return <Shell title="Player Database"><Cards items={[{label:"Players",value:all.length},{label:"Teams",value:new Set(all.map(p=>p.team)).size},{label:"Positions",value:new Set(all.map(p=>p.position)).size},{label:"Avg confidence",value:Math.round(all.reduce((a,p)=>a+p.data_confidence,0)/all.length)+"%"}]}/><p className="text-ion-1">Search/filter controls are next; this working table is sorted by Galaxy Player Index and links to player cards.</p><PlayerTable players={players.slice(0,50)}/></Shell>}
