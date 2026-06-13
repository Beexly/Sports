import { Shell, Cards, Badge, SimpleTable } from "../_components";
import { loadArchetypes, loadPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Watchlist — Your Tracked Players",
  description: "Track players and surface their StatKing signals in one place.",
  alternates: { canonical: "/stats/watchlist" },
};
export default function Page(){
  const arch=loadArchetypes(); const players=loadPlayers();
  const archMap=new Map(arch.map(a=>[a.player_id,a]));
  const watch=[...players].sort((a,b)=>b.hidden_value_score-a.hidden_value_score).slice(0,20);
  const rows=watch.map(p=>{const a=archMap.get(p.player_id); return {player:p.name,team:p.team,pos:p.position,hidden_value:p.hidden_value_score,trend:p.trend_score,archetype:a?a.archetype:"—"};});
  return <Shell title="Watchlist" eyebrow="Highest-signal players"><Cards items={[{label:"Archetyped players",value:arch.length},{label:"On watch",value:watch.length},{label:"Personal lists",value:"owner-gated"},{label:"Sort",value:"hidden value"}]}/>
  <p className="text-ion-1">The system's highest-signal players right now — strong hidden value and trend before the market reprices them.</p>
  <Badge tone="warn">Saving your own watchlist is an account feature and owner-gated.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
