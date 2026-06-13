import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadReadinessScores } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const r=loadReadinessScores(); const avg=Math.round(r.pages.reduce((a,p)=>a+Number(p.readiness_score ?? 0),0)/Math.max(1,r.pages.length)); return <Shell title="Product Readiness"><Cards items={[{label:"Pages scored",value:r.pages.length},{label:"Average readiness",value:avg},{label:"Claude next",value:"UX polish"},{label:"Codex next",value:"live ingestion"}]}/><SimpleTable rows={r.pages}/></Shell> }
