import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadBacktests } from "@/lib/statking/product";
export default function Page(){ const b=loadBacktests(); return <Shell title="Backtests"><Cards items={[{label:"Runs",value:b.runs.length},{label:"State",value:"fixture"},{label:"Proof",value:"partial"},{label:"Need",value:"history"}]}/><SimpleTable rows={b.runs as any}/></Shell> }
