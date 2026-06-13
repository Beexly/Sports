import { Shell, Cards, Badge, SimpleTable } from "../_components";
import { loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "StatKing Alerts — Usage, Role & Market Movement",
  description: "Configurable alerts on usage, role, injury, and market moves across the StatKing player universe.",
  alternates: { canonical: "/stats/alerts" },
};
export default function Page(){
  const players=loadPlayers();
  const risers=[...players].sort((a,b)=>b.trend_score-a.trend_score).slice(0,15);
  const rows=risers.map(p=>({player:p.name,team:p.team,pos:p.position,trend:p.trend_score,usage:p.usage_score,role:p.role_score,status:p.status}));
  return <Shell title="Alerts" eyebrow="Movement watch"><Cards items={[{label:"Players watched",value:players.length},{label:"Rising now",value:risers.length},{label:"High volatility",value:players.filter(p=>p.volatility_score>=60).length},{label:"Status flags",value:players.filter(p=>p.status!=="Active").length}]}/>
  <p className="text-ion-1">Alerts surface the players whose role, usage, or trend is moving most — the changes worth acting on before the market catches up.</p>
  <Badge tone="warn">Real-time email &amp; push delivery is an Elite feature and owner-gated; this is the underlying signal layer.</Badge>
  <h2 className="text-2xl text-ion-white">Biggest risers by trend score</h2>
  <SimpleTable rows={rows}/></Shell>;
}
