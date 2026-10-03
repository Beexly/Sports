import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { notes }=loadOwnedSignals();
  const mappedRows=notes.map(n=>{const rec=n as Record<string, unknown>; return { id: String(rec.note_id ?? rec.id ?? ""), entity: String(rec.entity_name ?? rec.entity_id ?? ""), note: String(rec.note_text ?? rec.content ?? rec.note ?? ""), display_approved: String(rec.approved_for_display ?? ""), model_approved: String(rec.approved_for_model ?? ""), created_at: String(rec.created_at ?? "") };});
  return <Shell title="Manual Charting" eyebrow="Cockpit · first-party"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Notes",value:notes.length},{label:"Display-approved",value:notes.filter(n=>n.approved_for_display).length},{label:"Model-approved",value:notes.filter(n=>n.approved_for_model).length},{label:"Source",value:"first-party"}]}/>
  <p className="text-ion-1">First-party charting notes with explicit display and model approval flags — the owned signal layer, rights-clean by construction.</p>
  <SectionHeader title="Manual Charting Notes" /><DataTable rows={mappedRows} maxRows={50} /></Shell>;
}
