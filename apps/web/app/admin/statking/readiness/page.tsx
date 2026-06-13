import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadReadinessScores } from "@/lib/statking/product";
export default function Page(){ const r=loadReadinessScores(); const avg=Math.round(r.pages.reduce((a,p)=>a+Number(p.readiness_score ?? 0),0)/Math.max(1,r.pages.length)); return <Shell title="Product Readiness"><Cards items={[{label:"Pages scored",value:r.pages.length},{label:"Average readiness",value:avg},{label:"Claude next",value:"UX polish"},{label:"Codex next",value:"live ingestion"}]}/><SimpleTable rows={r.pages}/></Shell> }
