import { Shell, Cards, Badge, BarChart, StatusRibbon, InsightCard } from "../_components";
import { comparePlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Player Compare: Side-by-Side NFL Metrics",
  description: "Compare any two players across usage, efficiency, role, volatility, and fantasy value.",
  alternates: { canonical: "/stats/compare" },
};
export default function Page({ searchParams }: { searchParams?: { a?: string; b?: string; scoring?: string } }) {
  const c = comparePlayers(searchParams?.a ?? "p001", searchParams?.b ?? "p002");

  const insightBody = c.categories.map(x => {
    const winner = x.winner ?? "Tied";
    const label = x.key.replace(/_/g, " ");
    return label.charAt(0).toUpperCase() + label.slice(1) + " edge: " + winner + ".";
  }).slice(0, 3).join(" ");

  return (
    <Shell title="Player Compare">
      <form method="get" className="border border-mineral bg-eclipse p-4 space-y-3">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
          <input name="a" aria-label="Player A ID" defaultValue={searchParams?.a ?? "p001"} placeholder="Player A ID (e.g. p001)" className="border border-mineral bg-eclipse p-2 text-ion-white text-sm rounded focus:border-orbital-cyan focus:outline-none" />
          <input name="b" aria-label="Player B ID" defaultValue={searchParams?.b ?? "p002"} placeholder="Player B ID (e.g. p002)" className="border border-mineral bg-eclipse p-2 text-ion-white text-sm rounded focus:border-orbital-cyan focus:outline-none" />
          <button className="border border-orbital-cyan px-3 py-2 text-orbital-cyan text-sm hover:bg-orbital-cyan hover:text-carbon transition-colors rounded">Compare</button>
        </div>
        <p className="text-xs text-ion-2">Enter player IDs from the Players page.</p>
      </form>
      <StatusRibbon status="fixture" label="Comparison snapshot updated every sync cycle" />
      <Cards items={[
        { label: "Player A", value: c.a.name, note: c.a.position + " · " + c.a.team },
        { label: "Player B", value: c.b.name, note: c.b.position + " · " + c.b.team },
        { label: "Scoring", value: searchParams?.scoring ?? "PPR" },
        { label: "Confidence gap", value: Math.abs(c.a.data_confidence - c.b.data_confidence) + " pts" }
      ]} />
      <div className="grid gap-4 md:grid-cols-2">
        {c.categories.map(x => {
          const aWins = x.winner === c.a.name;
          const bWins = x.winner === c.b.name;
          const aVal = Number(x.a ?? 0);
          const bVal = Number(x.b ?? 0);
          const max = Math.max(aVal, bVal, 1);
          return (
            <div key={x.key} className="border border-mineral bg-eclipse p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-ion-white font-semibold capitalize">{x.key.replace(/_/g, " ")}</p>
                <Badge tone={aWins ? "good" : bWins ? "warn" : "neutral"}>
                  {aWins ? c.a.name : bWins ? c.b.name : "Tied"}
                </Badge>
              </div>
              <BarChart items={[
                { label: c.a.name, value: aVal, max, tone: aWins ? "cyan" : "amber" },
                { label: c.b.name, value: bVal, max, tone: bWins ? "cyan" : "amber" },
              ]} />
            </div>
          );
        })}
      </div>
      <InsightCard
        eyebrow="Key Insights"
        headline={c.a.name + " vs " + c.b.name + ": Side-by-Side"}
        body={insightBody || "No category data available for this comparison."}
      />
    </Shell>
  );
}
