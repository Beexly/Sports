import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadSourceTargets, loadExpertRegistry } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const t=loadSourceTargets(); const experts=loadExpertRegistry();
  const partnerExperts=experts.filter(e=>String(e.partner_status).includes("partner"));
  return <Shell title="Partners & Licensing" eyebrow="Cockpit · partners"><Cards items={[{label:"License targets",value:t.top_50_requires_license.length},{label:"Partner experts",value:partnerExperts.length},{label:"Moat sources",value:t.top_50_highest_moat_sources.length},{label:"Status",value:"outreach"}]}/>
  <p className="text-ion-1">Sources and experts that require a license or partnership before activation — the deals that unlock the gated data.</p>
  <h2 className="text-2xl text-ion-white">License-gated sources</h2><SimpleTable rows={t.top_50_requires_license}/>
  <h2 className="text-2xl text-ion-white">Expert partner candidates</h2><SimpleTable rows={partnerExperts}/></Shell>;
}
