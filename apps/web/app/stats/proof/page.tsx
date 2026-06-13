import { Shell, Cards, SimpleTable } from "../_components";
import { loadBacktests } from "@/lib/statking/product";
export default function Page(){ const b=loadBacktests(); return <Shell title="Proof & Backtests"><Cards items={[{label:"Runs",value:b.runs.length},{label:"Proof state",value:"fixture"},{label:"Production archive",value:"missing"},{label:"Next",value:"store predictions"}]}/><SimpleTable rows={b.runs as any}/></Shell>}
