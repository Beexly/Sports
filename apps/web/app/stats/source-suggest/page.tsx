import { Shell, Cards, Badge, DataTable, StatusRibbon, SectionHeader } from "../_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export const metadata = {
  title: "Suggest a Source — Help Grow the Atlas",
  description: "Suggest a data source for lawful evaluation and rights review.",
  alternates: { canonical: "/stats/source-suggest" },
};
export default function Page() {
  const { suggestions } = loadOwnedSignals();
  const pending = suggestions.filter(s => String(s.reviewed_status ?? "") !== "approved" && String(s.reviewed_status ?? "") !== "rejected").length;

  return (
    <Shell title="Suggest a Source" eyebrow="Grow the atlas">
      <StatusRibbon status="active" label="Source suggestions accepted and reviewed" />
      <Cards items={[
        { label: "Suggestions", value: suggestions.length },
        { label: "In review", value: pending },
        { label: "Process", value: "rights-gated" },
        { label: "Who can submit", value: "anyone" }
      ]} />
      <p className="text-ion-1">
        Suggest a data source and it enters lawful evaluation. Every source is rights-reviewed before any automation touches it.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Submissions are reviewed, never auto-ingested.</Badge>
      </div>
      <SectionHeader title="Submit a Source" />
      <form className="mb-6 space-y-4 border border-mineral bg-eclipse p-4 rounded">
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-ion-2 mb-2">Source URL</label>
          <input
            type="url"
            placeholder="https://..."
            className="w-full border border-mineral bg-carbon p-3 text-ion-white placeholder-ion-2 rounded"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-ion-2 mb-2">Source Type</label>
          <select className="w-full border border-mineral bg-carbon p-3 text-ion-white rounded">
            <option>API</option>
            <option>Web Scrape</option>
            <option>Feed</option>
            <option>Manual Data</option>
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-ion-2 mb-2">Why This Source?</label>
          <textarea
            placeholder="Describe the data and why it matters..."
            className="w-full border border-mineral bg-carbon p-3 text-ion-white placeholder-ion-2 rounded"
            rows={4}
          />
        </div>
        <button className="border border-orbital-cyan px-4 py-2 text-orbital-cyan hover:bg-orbital-cyan hover:text-carbon transition-colors rounded">
          Submit for Review
        </button>
      </form>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Recent Suggestions</h2>
        <DataTable
          rows={suggestions.slice(0, 40).map((s: Record<string, unknown>) => ({
            url: String(s.submitted_url ?? ""),
            type: String(s.source_type ?? ""),
            reason: String(s.reason ?? ""),
            priority: String(s.priority ?? ""),
            status: String(s.reviewed_status ?? "")
          }))}
          maxRows={40}
        />
      </div>
    </Shell>
  );
}
