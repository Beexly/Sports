import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadSourceTargets } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const t=loadSourceTargets();
  const mappedRows=t.top_50_highest_moat_sources.map(s=>{const rec=s as Record<string, unknown>; return { source: String(rec.name ?? ""), category: String(rec.category ?? ""), moat_score: Number(rec.moat_score ?? 0), value_score: Number(rec.value_score ?? 0), activation_path: String(rec.activation_path ?? ""), action: String(rec.recommended_next_action ?? "") };});
  return <Shell title="Competitive Intelligence" eyebrow="Cockpit · moat"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Moat sources",value:t.top_50_highest_moat_sources.length},{label:"Easy wins",value:t.top_50_easiest_wins.length},{label:"License-gated",value:t.top_50_requires_license.length},{label:"View",value:"highest moat"}]}/>
  <p className="text-ion-1">The highest-moat sources — the data that, once activated lawfully, is hardest for a competitor to replicate.</p>
  <SectionHeader title="Competitive Source Landscape" /><DataTable rows={mappedRows} maxRows={50} /></Shell>;
}
