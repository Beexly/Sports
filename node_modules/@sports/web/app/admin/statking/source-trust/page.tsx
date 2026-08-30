import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadSourceTargets } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const t=loadSourceTargets();
  const mappedRows=t.top_50_easiest_wins.map(s=>{const rec=s as Record<string, unknown>; return { source: String(rec.name ?? ""), category: String(rec.category ?? ""), ease_score: Number(rec.ease_score ?? 0), value_score: Number(rec.value_score ?? 0), rights_clarity: Number(rec.rights_clarity_score ?? 0), action: String(rec.recommended_next_action ?? "") };});
  return <Shell title="Source Trust"><StatusRibbon status="fixture" label="Admin view — fixture snapshot" /><Cards items={[{label:"Top wins",value:t.top_50_easiest_wins.length},{label:"Moat",value:t.top_50_highest_moat_sources.length},{label:"License",value:t.top_50_requires_license.length},{label:"Priority",value:t.top_50_easiest_wins[0]?.activation_priority ?? "—"}]}/><SectionHeader title="Source Trust Ranking" /><DataTable rows={mappedRows} maxRows={50} /></Shell>;
}
