import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadSources } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const sources=loadSources();
  return <Shell title="Source Graph — Admin" eyebrow="Cockpit · sources"><Cards items={[{label:"Sources",value:sources.length},{label:"Families",value:new Set(sources.map(s=>s.source_family)).size},{label:"Categories",value:new Set(sources.map(s=>s.source_category)).size},{label:"Cleared-public",value:sources.filter(s=>String(s.legal_gate_status).includes("approved")).length}]}/>
  <p className="text-ion-1">The full source registry with family, category, mode, and legal gate status on every node.</p>
  <SimpleTable rows={sources.slice(0,50)}/></Shell>;
}
