import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../stats/_components";
import { loadSummary, loadAudit, loadActiveMetricManifest } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const s=loadSummary(); const a=loadAudit(); const m=loadActiveMetricManifest(); return <Shell title="StatKing Admin"><Cards items={[{label:"Sources",value:s.source_count},{label:"Active metrics",value:m.active_calculated_count},{label:"Real systems",value:a.summary.real_working ?? 0},{label:"Stub systems",value:a.summary.stub_only ?? 0}]}/><SimpleTable rows={a.items}/></Shell> }
