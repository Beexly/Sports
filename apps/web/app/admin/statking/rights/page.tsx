import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadRightsLedger, loadRightsGateReport } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const ledger=loadRightsLedger(); const report=loadRightsGateReport() as {metadata_only_count?:number; blocked_count?:number}; return <Shell title="Rights Ledger"><Cards items={[{label:"Sources in ledger",value:ledger.rights_count},{label:"Metadata-only",value:report.metadata_only_count ?? 0},{label:"Blocked",value:report.blocked_count ?? 0},{label:"Policy",value:"gated"}]}/><p className="text-ion-1">Rights gates prevent metadata-only, license-required, partner-required, and blocked sources from feeding active metrics.</p><SimpleTable rows={ledger.rights.slice(0,50) as Array<Record<string, unknown>>}/></Shell> }
