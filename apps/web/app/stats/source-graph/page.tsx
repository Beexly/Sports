import { Shell, Cards, DataTable, BarChart, StatusRibbon } from "../_components";
import { loadSources, loadSourceTargets } from "@/lib/statking/product";
export const metadata = {
  title: "Source Graph — Where StatKing Data Comes From",
  description: "The candidate source graph and lineage behind StatKing intelligence.",
  alternates: { canonical: "/stats/source-graph" },
};
export default function Page() {
  const sources = loadSources();
  const t = loadSourceTargets();

  return (
    <Shell title="Source Graph">
      <StatusRibbon status="fixture" label="Source graph updated regularly" />
      <Cards items={[
        { label: "Nodes", value: sources.length },
        { label: "Top targets", value: t.top_50_easiest_wins.length },
        { label: "Moat targets", value: t.top_50_highest_moat_sources.length },
        { label: "License targets", value: t.top_50_requires_license.length }
      ]} />
      <p className="text-ink-300">
        The candidate source graph and lineage behind StatKing intelligence. Prioritized by activation difficulty and impact.
      </p>
      <div className="border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-400 mb-3">Source Distribution by Category</p>
        <BarChart items={[
          { label: "Easiest wins", value: t.top_50_easiest_wins.length, max: 50, tone: "cyan" },
          { label: "Highest moat", value: t.top_50_highest_moat_sources.length, max: 50, tone: "amber" },
          { label: "License-gated", value: t.top_50_requires_license.length, max: 50, tone: "alert" }
        ]} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">Top 25 Easiest Wins</h2>
        <DataTable
          rows={t.top_50_easiest_wins.slice(0, 25).map((s: Record<string, unknown>) => ({
            source: String(s.name ?? ""),
            category: String(s.category ?? ""),
            ease: Number(s.ease_score ?? 0),
            value: Number(s.value_score ?? 0),
            priority: Number(s.activation_priority ?? 0)
          }))}
          maxRows={25}
        />
      </div>
    </Shell>
  );
}
