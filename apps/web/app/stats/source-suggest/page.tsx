import { Shell, Cards, Badge, DataTable, StatusRibbon, SectionHeader } from "../_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export const metadata = {
  title: "Suggest a Source: Help Grow the Atlas",
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
      <p className="max-w-3xl text-ion-1">
        Suggest a data source and it enters lawful evaluation. Every source is rights-reviewed before any automation touches it.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Submissions are reviewed, never auto-ingested.</Badge>
      </div>
      <SectionHeader title="Submit a source" />
      <form className="space-y-4 border border-mineral bg-eclipse p-4 rounded">
        <div>
          <label htmlFor="src-url" className="block font-mono text-xs uppercase tracking-[0.2em] text-ion-2 mb-2">Source URL</label>
          <input
            id="src-url"
            type="url"
            placeholder="https://..."
            className="w-full border border-mineral bg-carbon p-3 text-ion-white placeholder:text-ion-3 rounded focus:border-orbital-cyan focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="src-type" className="block font-mono text-xs uppercase tracking-[0.2em] text-ion-2 mb-2">Source type</label>
          <select id="src-type" className="w-full border border-mineral bg-carbon p-3 text-ion-white rounded focus:border-orbital-cyan focus:outline-none">
            <option>API</option>
            <option>Web Scrape</option>
            <option>Feed</option>
            <option>Manual Data</option>
          </select>
        </div>
        <div>
          <label htmlFor="src-reason" className="block font-mono text-xs uppercase tracking-[0.2em] text-ion-2 mb-2">Why this source?</label>
          <textarea
            id="src-reason"
            placeholder="Describe the data and why it matters..."
            className="w-full border border-mineral bg-carbon p-3 text-ion-white placeholder:text-ion-3 rounded focus:border-orbital-cyan focus:outline-none"
            rows={4}
          />
        </div>
        <button className="border border-orbital-cyan px-4 py-2 text-orbital-cyan hover:bg-orbital-cyan hover:text-carbon transition-colors rounded">
          Submit for Review
        </button>
      </form>
      <div className="space-y-4">
        <SectionHeader title="Recent suggestions" />
        <DataTable
          rows={suggestions.slice(0, 40).map((s: Record<string, unknown>) => ({
            url: String(s.submitted_url ?? ""),
            type: String(s.source_type ?? ""),
            reason: String(s.reason ?? ""),
            priority: String(s.priority ?? ""),
            status: String(s.reviewed_status ?? "")
          }))}
          maxRows={40}
          caption="Recent source suggestions with URL, source type, reason, priority, and review status"
        />
      </div>
    </Shell>
  );
}
