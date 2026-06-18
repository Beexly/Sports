import Link from "next/link";
import { Shell, Cards, DataTable, BarChart, StatusRibbon, SectionHeader } from "../_components";
import { loadComps, playerNameMap } from "@/lib/statking/product";
export const metadata = {
  title: "Player Comps — Statistical Similarity Scores",
  description: "Find a player's closest statistical comparables by shared usage and production features.",
  alternates: { canonical: "/stats/comps" },
};
export default function Page() {
  const names = playerNameMap();
  const comps = loadComps();
  const withComp = comps.filter(c => c.comparisons.length > 0);
  const avg = Math.round(withComp.reduce((a, c) => a + (c.comparisons[0]?.similarity_score ?? 0), 0) / Math.max(1, withComp.length) * 100) / 100;

  return (
    <Shell title="Player Comps" eyebrow="Statistical similarity">
      <StatusRibbon status="fixture" label="Comps updated with each player snapshot sync" />
      <Cards items={[
        { label: "Players with comps", value: comps.length },
        { label: "Avg top similarity", value: avg },
        { label: "Compared on", value: "usage · role · efficiency" },
        { label: "Method", value: "shared-feature score" }
      ]} />
      <p className="text-ink-300">
        Each player's closest statistical neighbor, scored on shared usage and production features — a fast way to frame an unknown by a known.
      </p>
      <SectionHeader eyebrow="By statistical similarity" title="Top Player Comparisons" />
      <div className="grid gap-4 md:grid-cols-2">
        {withComp.slice(0, 6).map(c => {
          const comp = c.comparisons[0];
          const sharedFeatures = Array.isArray(comp?.shared_features)
            ? (comp.shared_features as unknown[]).map(String).join(" · ")
            : String(comp?.shared_features ?? "");
          return (
            <div key={c.player_id} className="border border-white/[0.08] bg-white/[0.04] p-4">
              <Link href={"/stats/player/" + c.player_id}>
                <p className="text-white font-semibold mb-2">{names.get(c.player_id) ?? c.player_id}</p>
              </Link>
              <p className="text-sm text-ink-300 mb-3">Closest comp: {comp?.name}</p>
              <BarChart items={[
                { label: "Similarity", value: Number(comp?.similarity_score ?? 0), max: 100, tone: "cyan" }
              ]} />
              <p className="mt-2 text-xs text-ink-400">Features: {sharedFeatures}</p>
            </div>
          );
        })}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">All Player Comps</h2>
        <DataTable
          rows={withComp.slice(0, 40).map(c => {
            const t = c.comparisons[0];
            return {
              player: names.get(c.player_id) ?? String(c.player_id),
              closest_comp: String(t?.name ?? ""),
              similarity: Number(t?.similarity_score ?? 0),
              shared_features: String(t?.shared_features ?? "")
            };
          })}
          maxRows={40}
        />
      </div>
    </Shell>
  );
}
