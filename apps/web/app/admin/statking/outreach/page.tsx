import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadActivationRoi } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const roi=loadActivationRoi(); const targets=roi.top_25_activate_now ?? []; return <Shell title="Outreach & Activation ROI"><Cards items={[{label:"Activate now",value:targets.length},{label:"Low-cost wins",value:(roi.top_25_zero_low_cost_wins ?? []).length},{label:"License targets",value:(roi.top_25_license_targets ?? []).length},{label:"Expert/partner",value:(roi.top_25_expert_partner_targets ?? []).length}]}/><SimpleTable rows={targets}/></Shell> }
