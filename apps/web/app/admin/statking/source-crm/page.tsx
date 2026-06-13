import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadSourceTargets } from "@/lib/statking/product";
export default function Page(){ const t=loadSourceTargets(); return <Shell title="Source CRM"><Cards items={[{label:"Outreach targets",value:t.top_50_easiest_wins.length},{label:"License targets",value:t.top_50_requires_license.length},{label:"Partner path",value:"ready"},{label:"Next",value:"owner"}]}/><SimpleTable rows={t.top_50_easiest_wins}/></Shell> }
