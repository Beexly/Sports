import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { notes, suggestions }=loadOwnedSignals();
  const noteRows=notes.map(n=>{const rec=n as Record<string, unknown>; return { id: String(rec.note_id ?? rec.id ?? ""), entity: String(rec.entity_name ?? rec.entity_id ?? ""), note: String(rec.note_text ?? rec.content ?? rec.note ?? ""), display_approved: String(rec.approved_for_display ?? ""), model_approved: String(rec.approved_for_model ?? ""), created_at: String(rec.created_at ?? "") };});
  const suggestionRows=suggestions.map(s=>{const rec=s as Record<string, unknown>; return { source: String(rec.source_name ?? rec.source ?? ""), url: String(rec.url ?? ""), status: String(rec.reviewed_status ?? rec.status ?? ""), suggested_by: String(rec.suggested_by ?? ""), created_at: String(rec.created_at ?? "") };});
  return <Shell title="Scouting" eyebrow="Cockpit · owned signals"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Notes",value:notes.length},{label:"Suggestions",value:suggestions.length},{label:"Display-approved",value:notes.filter(n=>n.approved_for_display).length},{label:"Source",value:"first-party"}]}/>
  <p className="text-ink-300">The owned-signal desk: first-party scouting notes plus inbound source suggestions awaiting rights review.</p>
  <SectionHeader title="Scouting Notes — Admin" /><DataTable rows={noteRows} maxRows={50} />
  <SectionHeader title="Source Suggestions" /><DataTable rows={suggestionRows} maxRows={50} /></Shell>;
}
