import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { feedback, suggestions }=loadOwnedSignals();
  const pending=suggestions.filter(s=>s.reviewed_status!=="approved"&&s.reviewed_status!=="rejected").length;
  const feedbackRows=feedback.map(f=>{const rec=f as Record<string, unknown>; return { id: String(rec.feedback_id ?? rec.id ?? ""), entity: String(rec.entity_id ?? ""), type: String(rec.feedback_type ?? ""), content: String(rec.note ?? rec.feedback_text ?? ""), created_at: String(rec.created_at ?? "") };});
  const suggestionRows=suggestions.map(s=>{const rec=s as Record<string, unknown>; return { submitted_url: String(rec.submitted_url ?? ""), source_type: String(rec.source_type ?? ""), reason: String(rec.reason ?? ""), priority: String(rec.priority ?? ""), status: String(rec.reviewed_status ?? "") };});
  return <Shell title="Signal Import" eyebrow="Cockpit · intake"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"User feedback",value:feedback.length},{label:"Source suggestions",value:suggestions.length},{label:"In review",value:pending},{label:"Gate",value:"rights review"}]}/>
  <p className="text-ink-300">The intake queue — user feedback and suggested sources, every one routed through rights review before it can become active.</p>
  <SectionHeader title="Signal Import Queue" /><DataTable rows={feedbackRows} maxRows={50} />
  <SectionHeader title="Source Suggestions" /><DataTable rows={suggestionRows} maxRows={50} /></Shell>;
}
