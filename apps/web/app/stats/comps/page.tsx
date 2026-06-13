import { Shell, Cards, SimpleTable } from "../_components";
import { loadComps, playerNameMap } from "@/lib/statking/product";
export const metadata = {
  title: "Player Comps — Statistical Similarity Scores",
  description: "Find a player's closest statistical comparables by shared usage and production features.",
  alternates: { canonical: "/stats/comps" },
};
export default function Page(){
  const names=playerNameMap(); const comps=loadComps();
  const withComp=comps.filter(c=>c.comparisons.length>0);
  const rows=withComp.slice(0,40).map(c=>{const t=c.comparisons[0]!; return {player:names.get(c.player_id)??c.player_id,closest_comp:t.name,similarity:t.similarity_score,shared_features:t.shared_features};});
  const avg=Math.round(withComp.reduce((a,c)=>a+(c.comparisons[0]?.similarity_score??0),0)/Math.max(1,withComp.length)*100)/100;
  return <Shell title="Player Comps" eyebrow="Statistical similarity"><Cards items={[{label:"Players with comps",value:comps.length},{label:"Avg top similarity",value:avg},{label:"Compared on",value:"usage · role · efficiency"},{label:"Method",value:"shared-feature score"}]}/>
  <p className="text-ion-1">Each player's closest statistical neighbor, scored on shared usage and production features — a fast way to frame an unknown by a known.</p>
  <SimpleTable rows={rows}/></Shell>;
}
