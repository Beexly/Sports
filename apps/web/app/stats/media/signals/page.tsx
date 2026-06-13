import { Shell, Cards, Badge, SimpleTable } from "../../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "Media Signals — Cross-Source Player Buzz",
  description: "Cross-source media signal candidates surfaced for review.",
  alternates: { canonical: "/stats/media/signals" },
};
export default function Page(){
  const items=loadMediaItems();
  const signals=items.filter(i=>Boolean(i.signal_candidate)&&i.signal_candidate!=="none");
  const rows=signals.slice(0,30).map(i=>({platform:i.platform,source:i.source_name,signal:i.signal_candidate,players:i.detected_players,topics:i.topics,trust:i.source_trust}));
  return <Shell title="Media Signals" eyebrow="Cross-source buzz"><Cards items={[{label:"Metadata items",value:items.length},{label:"Signal candidates",value:signals.length},{label:"Platforms",value:new Set(items.map(i=>i.platform)).size},{label:"Rights",value:"metadata-only"}]}/>
  <p className="text-ion-1">Where the same player or topic is surfacing across platforms — the cross-source agreement that makes a media signal worth a look.</p>
  <Badge tone="warn">Metadata only; article bodies and transcripts are never extracted.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
