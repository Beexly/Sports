import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadActivationRoi } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const roi=loadActivationRoi(); const targets=roi.top_25_activate_now ?? [];
  const mappedRows=targets.map(r=>{const rec=r as Record<string, unknown>; return { source: String(rec.source_name ?? ""), roi_score: Number(rec.activation_roi_score ?? 0), effort: String(rec.effort_estimate ?? ""), coverage_gain: Number(rec.coverage_gain ?? 0), action: String(rec.recommended_action ?? "") };});
  return <Shell title="Outreach & Activation priority"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Activate now",value:targets.length},{label:"Low-cost wins",value:(roi.top_25_zero_low_cost_wins ?? []).length},{label:"License targets",value:(roi.top_25_license_targets ?? []).length},{label:"Expert/partner",value:(roi.top_25_expert_partner_targets ?? []).length}]}/><SectionHeader title="Top Activation Targets" /><DataTable rows={mappedRows} maxRows={50} /></Shell>;
}
