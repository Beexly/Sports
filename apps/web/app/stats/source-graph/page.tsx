import { Shell, Cards, DataTable, BarChart, StatusRibbon, SectionHeader } from "../_components";
import { loadSources, loadSourceTargets } from "@/lib/statking/product";
export const metadata = {
  title: "Source Graph: Where Galaxy Stats Data Comes From",
  description: "The candidate source graph and lineage behind Galaxy Stats intelligence.",
  alternates: { canonical: "/stats/source-graph" },
};
export default function Page() {
  const sources = loadSources();
  const t = loadSourceTargets();

  return (
    <Shell title="Source Graph" eyebrow="Data lineage">
      <StatusRibbon status="fixture" label="Source graph updated regularly" />
      <Cards items={[
        { label: "Nodes", value: sources.length },
        { label: "Top targets", value: t.top_50_easiest_wins.length },
        { label: "Moat targets", value: t.top_50_highest_moat_sources.length },
        { label: "License targets", value: t.top_50_requires_license.length }
      ]} />
      <p className="max-w-3xl text-ion-1">
        The candidate source graph and lineage behind Galaxy Stats intelligence. Prioritized by activation difficulty and impact.
      </p>
      <div className="border border-mineral bg-eclipse p-4">
        {/* "Highest moat" is a strategic attribute, not a warning — neutral tone.
            "License-gated" is a genuine permission gate — caution, not alert. */}
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Source distribution by category</p>
        <BarChart items={[
          { label: "Easiest wins", value: t.top_50_easiest_wins.length, max: 50, tone: "cyan" },
          { label: "Highest moat", value: t.top_50_highest_moat_sources.length, max: 50, tone: "neutral" },
          { label: "License-gated", value: t.top_50_requires_license.length, max: 50, tone: "amber" }
        ]} />
      </div>
      <div className="space-y-4">
        <SectionHeader title="Top 25 easiest wins" />
        <DataTable
          rows={t.top_50_easiest_wins.slice(0, 25).map((s: Record<string, unknown>) => ({
            source: String(s.name ?? ""),
            category: String(s.category ?? ""),
            ease: Number(s.ease_score ?? 0),
            value: Number(s.value_score ?? 0),
            priority: Number(s.activation_priority ?? 0)
          }))}
          maxRows={25}
          caption="Top 25 easiest-win source candidates with category, ease score, value score, and activation priority"
        />
      </div>
    </Shell>
  );
}
