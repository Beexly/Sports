import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadExpertRegistry } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const experts=loadExpertRegistry();
  const mappedRows=experts.map(e=>{const rec=e as Record<string, unknown>; return { name: String(rec.expert_name ?? rec.name ?? ""), specialty: String(rec.specialty ?? ""), platform: String(rec.platform ?? ""), signal_rights: String(rec.signal_rights ?? ""), display_rights: String(rec.display_rights ?? "") };});
  return <Shell title="Expert Registry" eyebrow="Cockpit · experts"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Experts",value:experts.length},{label:"Specialties",value:new Set(experts.map(e=>e.specialty)).size},{label:"Organizations",value:new Set(experts.map(e=>e.organization)).size},{label:"Partner-gated",value:experts.filter(e=>String(e.partner_status).includes("partner")).length}]}/>
  <p className="text-ink-300">The full expert registry with partner, signal, and display rights per analyst.</p>
  <SectionHeader title="Expert Registry" /><DataTable rows={mappedRows} maxRows={50} /></Shell>;
}
