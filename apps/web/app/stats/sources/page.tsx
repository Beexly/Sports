import { Shell, Cards, DataTable, Badge, StatusRibbon } from "../_components";
import { FilterBar } from "../_client";
import { loadSources } from "@/lib/statking/product";
export const metadata = {
  title: "Source Universe — Tracked Data Sources",
  description: "Every tracked data source with its rights status and activation state.",
  alternates: { canonical: "/stats/sources" },
};
export default function Page({ searchParams }: { searchParams?: { status?: string } }) {
  const sources = loadSources();
  const status = searchParams?.status ?? "all";
  const filtered = status === "all" ? sources : sources.filter(s => String(s.legal_gate_status ?? "").includes(status));

  return (
    <Shell title="Source Universe">
      <StatusRibbon status="fixture" label="Source registry updated regularly" />
      <Cards items={[
        { label: "Sources", value: sources.length },
        { label: "Active/open", value: sources.filter(s => String(s.source_mode ?? "").includes("active")).length },
        { label: "License/review", value: sources.filter(s => String(s.legal_gate_status ?? "").includes("license") || String(s.legal_gate_status ?? "").includes("review")).length },
        { label: "Next actions", value: sources.filter(s => s.next_action).length }
      ]} />
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Filter by status</p>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Sources</h2>
        <DataTable
          rows={filtered.slice(0, 50).map(s => ({
            source_name: String(s.canonical_name ?? ""),
            source_mode: String(s.source_mode ?? ""),
            legal_gate_status: String(s.legal_gate_status ?? ""),
            next_action: String(s.next_action ?? ""),
            priority_score: Number(s.priority_score ?? 0)
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
