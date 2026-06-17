import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadSources } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const rows = loadSources().slice(0, 50).map(s => ({
    source: s.canonical_name,
    mode: s.source_mode,
    status: s.legal_gate_status.includes("review") ? "review_required" : "freshness_unknown",
    next_action: s.next_action,
  }));
  return (
    <Shell title="Freshness SLAs">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[{label:"Sources sampled",value:rows.length},{label:"Needs review",value:rows.filter(r=>r.status.includes("review")).length},{label:"SLA",value:"modeled"},{label:"Next",value:"ingest timestamps"}]}/>
      <SectionHeader title="Source Freshness" />
      <DataTable rows={rows} maxRows={50} />
    </Shell>
  );
}
