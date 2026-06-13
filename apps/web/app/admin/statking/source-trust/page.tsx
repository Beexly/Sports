import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadSourceTargets } from "@/lib/statking/product";
export default function Page(){ const t=loadSourceTargets(); return <Shell title="Source Trust"><Cards items={[{label:"Top wins",value:t.top_50_easiest_wins.length},{label:"Moat",value:t.top_50_highest_moat_sources.length},{label:"License",value:t.top_50_requires_license.length},{label:"Priority",value:t.top_50_easiest_wins[0]?.activation_priority ?? "—"}]}/><SimpleTable rows={t.top_50_easiest_wins}/></Shell> }
