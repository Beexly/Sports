import { Shell, Cards, Badge, SimpleTable } from "../../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "Trending — What's Moving in NFL Media",
  description: "The players and teams gaining media attention right now.",
  alternates: { canonical: "/stats/media/trending" },
};
export default function Page(){
  const items=loadMediaItems();
  const trending=[...items].sort((a,b)=>b.source_trust-a.source_trust).slice(0,30);
  const rows=trending.map(i=>({platform:i.platform,source:i.source_name,title:i.title,players:i.detected_players,topics:i.topics,trust:i.source_trust}));
  const mentions=new Map();
  items.forEach(i=>i.detected_players.forEach(p=>mentions.set(p,(mentions.get(p)||0)+1)));
  const top=[...mentions.entries()].sort((a,b)=>b[1]-a[1])[0];
  return <Shell title="Trending" eyebrow="What's moving"><Cards items={[{label:"Items",value:items.length},{label:"Top mention",value:top?top[0]:"—"},{label:"Platforms",value:new Set(items.map(i=>i.platform)).size},{label:"Rights",value:"metadata-only"}]}/>
  <p className="text-ion-1">The players and teams gaining media attention right now, ranked by source trust.</p>
  <Badge tone="warn">Metadata only — headlines and mentions, not full content.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
