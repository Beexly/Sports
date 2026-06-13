import { Shell, Cards, SimpleTable } from "../_components";
import { loadSources } from "@/lib/statking/product";
export const metadata = {
  title: "Source Universe — Tracked Data Sources",
  description: "Every tracked data source with its rights status and activation state.",
  alternates: { canonical: "/stats/sources" },
};
export default function Page(){ const sources=loadSources(); return <Shell title="Source Universe"><Cards items={[{label:"Sources",value:sources.length},{label:"Active/open",value:sources.filter(s=>s.source_mode.includes("active")).length},{label:"License/review",value:sources.filter(s=>s.legal_gate_status.includes("license")||s.legal_gate_status.includes("review")).length},{label:"Next actions",value:sources.filter(s=>s.next_action).length}]}/><SimpleTable rows={sources.slice(0,50)}/></Shell>}
