import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadSourceTargets, loadExpertRegistry } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const t=loadSourceTargets(); const experts=loadExpertRegistry();
  const partnerExperts=experts.filter(e=>String(e.partner_status).includes("partner"));
  const sourceRows=t.top_50_requires_license.map(s=>{const rec=s as Record<string, unknown>; return { source: String(rec.name ?? ""), category: String(rec.category ?? ""), moat_score: Number(rec.moat_score ?? 0), ease_score: Number(rec.ease_score ?? 0), activation_path: String(rec.activation_path ?? ""), action: String(rec.recommended_next_action ?? "") };});
  const expertRows=partnerExperts.map(e=>{const rec=e as Record<string, unknown>; return { name: String(rec.expert_name ?? rec.name ?? ""), specialty: String(rec.specialty ?? ""), platform: String(rec.platform ?? ""), signal_rights: String(rec.signal_rights ?? ""), display_rights: String(rec.display_rights ?? "") };});
  return <Shell title="Partners & Licensing" eyebrow="Cockpit · partners"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"License targets",value:t.top_50_requires_license.length},{label:"Partner experts",value:partnerExperts.length},{label:"Moat sources",value:t.top_50_highest_moat_sources.length},{label:"Status",value:"outreach"}]}/>
  <p className="text-ink-300">Sources and experts that require a license or partnership before activation — the deals that unlock the gated data.</p>
  <SectionHeader title="Partnership Targets" /><DataTable rows={sourceRows} maxRows={50} />
  <SectionHeader title="Expert Partner Candidates" /><DataTable rows={expertRows} maxRows={50} /></Shell>;
}
