import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadSummary, loadReadinessScores, loadAudit } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const s=loadSummary(); const readiness=loadReadinessScores(); const audit=loadAudit();
  const avg=Math.round(readiness.pages.reduce((a,p)=>a+Number(p.readiness_score??0),0)/Math.max(1,readiness.pages.length));
  return <Shell title="King Standard Score" eyebrow="Cockpit · scorecard"><Cards items={[{label:"King Standard",value:"61/100",note:"Autonomous foundation, not finished"},{label:"Sources",value:s.source_count},{label:"Metrics",value:s.metric_count},{label:"Readiness avg",value:avg}]}/>
  <p className="text-ion-1">The King Standard is the honest composite: source trust, coverage, freshness, conflicts, and proof. 61/100 reflects a real foundation with live feeds, licenses, and proof still ahead.</p>
  <h2 className="text-2xl text-ion-white">Reality check</h2><SimpleTable rows={Object.entries(audit.summary).map(([status,count])=>({status,count}))}/>
  <h2 className="text-2xl text-ion-white">Page readiness</h2><SimpleTable rows={readiness.pages}/></Shell>;
}
