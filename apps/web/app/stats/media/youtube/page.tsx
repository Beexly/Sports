import { Shell, Cards, SimpleTable } from "../../_components";
import { loadMediaItems } from "@/lib/statking/product";
export const metadata = {
  title: "YouTube Intelligence — Video Signal",
  description: "Video metadata intelligence tracking NFL player and team coverage.",
  alternates: { canonical: "/stats/media/youtube" },
};
export default function Page(){ const items=loadMediaItems().filter(i=>i.platform==="youtube"); return <Shell title="Youtube Intelligence"><Cards items={[{label:"Tracked",value:items.length},{label:"Metadata only",value:items.filter(i=>i.rights_mode==='metadata_only').length},{label:"Avg trust",value:Math.round(items.reduce((a,i)=>a+i.source_trust,0)/Math.max(1,items.length))},{label:"Needs activation",value:items.filter(i=>i.activation_status).length}]}/><SimpleTable rows={items}/></Shell>}
