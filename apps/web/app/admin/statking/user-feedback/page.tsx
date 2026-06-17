import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { feedback }=loadOwnedSignals();
  const mappedRows=feedback.map(f=>{const rec=f as Record<string, unknown>; return { id: String(rec.feedback_id ?? rec.id ?? ""), entity: String(rec.entity_id ?? ""), type: String(rec.feedback_type ?? ""), content: String(rec.feedback_text ?? rec.content ?? ""), created_at: String(rec.created_at ?? "") };});
  return <Shell title="User Feedback" eyebrow="Cockpit · intake"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Feedback items",value:feedback.length},{label:"Entities",value:new Set(feedback.map(f=>f.entity_id)).size},{label:"Types",value:new Set(feedback.map(f=>f.feedback_type)).size},{label:"Use",value:"review only"}]}/>
  <p className="text-ion-1">Inbound user feedback on players and metrics — a review input, not an automatic model signal.</p>
  <SectionHeader title="User Feedback Signals" /><DataTable rows={mappedRows} maxRows={50} /></Shell>;
}
