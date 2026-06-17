import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadSources } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const sources=loadSources();
  const mappedRows=sources.slice(0,50).map(s=>{const rec=s as Record<string, unknown>; return { source: String(rec.canonical_name ?? ""), family: String(rec.source_family ?? ""), category: String(rec.source_category ?? ""), mode: String(rec.source_mode ?? ""), priority: Number(rec.priority_score ?? 0) };});
  return <Shell title="Source Graph — Admin" eyebrow="Cockpit · sources"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Sources",value:sources.length},{label:"Families",value:new Set(sources.map(s=>s.source_family)).size},{label:"Categories",value:new Set(sources.map(s=>s.source_category)).size},{label:"Cleared-public",value:sources.filter(s=>String(s.legal_gate_status).includes("approved")).length}]}/>
  <p className="text-ion-1">The full source registry with family, category, mode, and legal gate status on every node.</p>
  <SectionHeader title="Source Graph" /><DataTable rows={mappedRows} maxRows={50} /></Shell>;
}
