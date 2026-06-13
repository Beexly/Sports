import { Shell, Cards, SimpleTable } from "../_components";
import { loadBacktests } from "@/lib/statking/product";
export const metadata = {
  title: "Proof & Backtests — How StatKing Is Validated",
  description: "Backtests, metric reliability, and the honest proof layer behind StatKing metrics.",
  alternates: { canonical: "/stats/proof" },
};
export default function Page(){ const b=loadBacktests(); return <Shell title="Proof & Backtests"><Cards items={[{label:"Runs",value:b.runs.length},{label:"Proof state",value:"fixture"},{label:"Production archive",value:"missing"},{label:"Next",value:"store predictions"}]}/><SimpleTable rows={b.runs as any}/></Shell>}
