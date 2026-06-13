import Link from "next/link";
import { Shell, Cards, SimpleTable } from "../_components";
import { loadMediaItems } from "@/lib/statking/product";
export default function Page(){ const items=loadMediaItems(); return <Shell title="Media Intelligence"><Cards items={[{label:"Metadata items",value:items.length},{label:"YouTube",value:items.filter(i=>i.platform==='youtube').length},{label:"Reddit",value:items.filter(i=>i.platform==='reddit').length},{label:"Podcasts/RSS",value:items.filter(i=>i.platform==='podcasts'||i.platform==='rss').length}]}/><div className="flex gap-3">{['youtube','reddit','podcasts','rss'].map(p=><Link key={p} className="border border-mineral px-3 py-2" href={`/stats/media/${p}`}>{p}</Link>)}</div><SimpleTable rows={items.slice(0,25)}/></Shell>}
