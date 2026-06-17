import { Shell, Cards, DataTable, InsightCard, SectionHeader, StatusRibbon } from "../_components";
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
      <InsightCard
        eyebrow="Data Rights System"
        headline="Every source is rights-classified before any ingestion"
        body="approved_api = licensed commercial access. approved_public_logged_off = public facts, no login. permission_required = written consent needed before automation. blocked_technical_controls = anti-bot active. vendor_candidate = under evaluation."
        tone="neutral"
      />
      <Cards items={[
        { label: "Sources", value: sources.length },
        { label: "Active/open", value: sources.filter(s => String(s.source_mode ?? "").includes("active")).length },
        { label: "License/review", value: sources.filter(s => String(s.legal_gate_status ?? "").includes("license") || String(s.legal_gate_status ?? "").includes("review")).length },
        { label: "Next actions", value: sources.filter(s => s.next_action).length }
      ]} />
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Filter by legal gate status</p>
        <FilterBar
          options={[
            { label: "All", value: "all" },
            { label: "Open", value: "open" },
            { label: "License", value: "license" },
            { label: "Review", value: "review" },
            { label: "Blocked", value: "blocked" },
          ]}
          active={status}
          paramName="status"
        />
      </div>
      <div>
        <SectionHeader title="Source Registry" />
        <DataTable
          rows={filtered.slice(0, 100).map(s => {
            const gate = String(s.legal_gate_status ?? "");
            const rights_clarity = gate.includes("approved")
              ? "✓ cleared"
              : gate.includes("blocked")
              ? "✗ blocked"
              : gate.includes("permission")
              ? "⚠ permission needed"
              : "— review";
            return {
              source_name: String(s.canonical_name ?? ""),
              source_mode: String(s.source_mode ?? ""),
              legal_gate_status: gate,
              rights_clarity,
              next_action: String(s.next_action ?? ""),
              priority_score: Number(s.priority_score ?? 0)
            };
          })}
          maxRows={100}
        />
      </div>
    </Shell>
  );
}
