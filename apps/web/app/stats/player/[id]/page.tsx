import { Shell, Cards, DataTable, Badge, ScoreRing, BarChart, StatusRibbon } from "../../_components";
import { getPlayer, loadWeeklyStats, loadComps, loadArchetypes } from "@/lib/statking/product";
export const metadata = {
  title: "Player Profile — StatKing Metrics & Lineage",
  description: "A full StatKing metric profile with source lineage and data-confidence for an NFL player.",
  alternates: { canonical: "/stats/players" },
};
export default function Page({ params }: { params: { id: string } }) {
  const p = getPlayer(params.id);
  if (!p) return <Shell title="Player not found"><p>No player snapshot exists.</p></Shell>;
  const weeks = loadWeeklyStats().filter(w => w.player_id === p.player_id);
  const comps = loadComps().find(c => c.player_id === p.player_id)?.comparisons ?? [];
  const arch = loadArchetypes().find(a => a.player_id === p.player_id);

  return (
    <Shell title={p.name} eyebrow={`${p.team} · ${p.position}`}>
      <StatusRibbon status="fixture" label="Player metrics updated every sync cycle" />
      <Cards items={[
        { label: "Galaxy Player Index", value: p.galaxy_player_index },
        { label: "Fantasy Edge", value: p.fantasy_edge },
        { label: "Usage", value: p.usage_score },
        { label: "Confidence", value: p.data_confidence + "%" }
      ]} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-mineral bg-eclipse p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Galaxy Player Index</p>
          <div className="flex justify-center">
            <ScoreRing score={Number(p.galaxy_player_index ?? 0)} label="GPI" size={120} />
          </div>
        </div>
        <div className="border border-mineral bg-eclipse p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Efficiency & Usage Scores</p>
          <BarChart items={[
            { label: "Usage", value: Number(p.usage_score ?? 0), max: 100, tone: "cyan" },
            { label: "Efficiency", value: Number(p.efficiency_score ?? 0), max: 100, tone: "amber" }
          ]} />
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-mineral bg-eclipse p-4">
          <h2 className="text-lg font-semibold text-ion-white mb-3">Archetype</h2>
          <p className="text-ion-1">{arch?.archetype}</p>
          <p className="mt-2 text-sm text-ion-1">{arch?.explanation}</p>
        </div>
        <div className="border border-mineral bg-eclipse p-4">
          <h2 className="text-lg font-semibold text-ion-white mb-3">Source & Data</h2>
          <div className="space-y-2 mb-3">
            {p.missing_data && Array.isArray(p.missing_data) && p.missing_data.map(m => (
              <Badge key={String(m)} tone="warn">{String(m ?? "")}</Badge>
            ))}
          </div>
          <p className="text-sm text-ion-1">Sources: {p.source_lineage && Array.isArray(p.source_lineage) ? p.source_lineage.join(", ") : "—"}</p>
        </div>
      </section>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Weekly Trend</h2>
        <DataTable
          rows={weeks.slice(-8).map(w => ({
            week: Number(w.week ?? 0),
            touches: Number(w.touches ?? 0),
            targets: Number(w.targets ?? 0),
            fantasy_points_ppr: Number(w.fantasy_points_ppr ?? 0),
            yards: Number(w.yards ?? 0),
          }))}
          maxRows={8}
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Similar Players</h2>
        <DataTable
          rows={comps.map((c: Record<string, unknown>) => ({
            player: String(c.name ?? ""),
            similarity: Number(c.similarity_score ?? 0),
            shared: Array.isArray(c.shared_features) ? (c.shared_features as unknown[]).join(", ") : ""
          }))}
          maxRows={10}
        />
      </div>
    </Shell>
  );
}
