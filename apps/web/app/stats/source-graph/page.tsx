import { Shell, Cards, SimpleTable } from "../_components";
import { loadSources, loadSourceTargets } from "@/lib/statking/product";
export const metadata = {
  title: "Source Graph — Where StatKing Data Comes From",
  description: "The candidate source graph and lineage behind StatKing intelligence.",
  alternates: { canonical: "/stats/source-graph" },
};
export default function Page(){ const sources=loadSources(); const t=loadSourceTargets(); return <Shell title="Source Graph"><Cards items={[{label:"Nodes",value:sources.length},{label:"Top targets",value:t.top_50_easiest_wins.length},{label:"Moat targets",value:t.top_50_highest_moat_sources.length},{label:"License targets",value:t.top_50_requires_license.length}]}/><SimpleTable rows={t.top_50_easiest_wins.slice(0,25)}/></Shell>}
