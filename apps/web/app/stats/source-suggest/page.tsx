import { Shell, Cards, Badge, SimpleTable } from "../_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export const metadata = {
  title: "Suggest a Source — Help Grow the Atlas",
  description: "Suggest a data source for lawful evaluation and rights review.",
  alternates: { canonical: "/stats/source-suggest" },
};
export default function Page(){
  const { suggestions }=loadOwnedSignals();
  const rows=suggestions.slice(0,40).map(s=>({url:s.submitted_url,type:s.source_type,reason:s.reason,priority:s.priority,status:s.reviewed_status}));
  const pending=suggestions.filter(s=>s.reviewed_status!=="approved"&&s.reviewed_status!=="rejected").length;
  return <Shell title="Suggest a Source" eyebrow="Grow the atlas"><Cards items={[{label:"Suggestions",value:suggestions.length},{label:"In review",value:pending},{label:"Process",value:"rights-gated"},{label:"Who can submit",value:"anyone"}]}/>
  <p className="text-ion-1">Suggest a data source and it enters lawful evaluation. Every source is rights-reviewed before any automation touches it.</p>
  <Badge tone="warn">Submissions are reviewed, never auto-ingested.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
