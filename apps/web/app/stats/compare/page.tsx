import { Shell, Cards, Badge, BarChart, StatusRibbon } from "../_components";
import { comparePlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Player Compare — Side-by-Side NFL Metrics",
  description: "Compare any two players across usage, efficiency, role, volatility, and fantasy value.",
  alternates: { canonical: "/stats/compare" },
};
export default function Page({ searchParams }: { searchParams?: { a?: string; b?: string; scoring?: string } }) {
  const c = comparePlayers(searchParams?.a ?? "p001", searchParams?.b ?? "p002");

  return (
    <Shell title="Player Compare">
      <StatusRibbon status="fixture" label="Comparison snapshot updated every sync cycle" />
      <Cards items={[
        { label: "Player A", value: c.a.name, note: c.a.position + " · " + c.a.team },
        { label: "Player B", value: c.b.name, note: c.b.position + " · " + c.b.team },
        { label: "Scoring", value: searchParams?.scoring ?? "PPR" },
        { label: "Confidence gap", value: Math.abs(c.a.data_confidence - c.b.data_confidence) }
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
      <div className="border border-mineral bg-eclipse p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Key Insights</p>
        <p className="text-sm text-ion-1">
          {c.categories[1]?.winner} wins usage; {c.categories[2]?.winner} is more efficient; lower volatility wins risk.
          Confidence is limited where licensed tracking and grades are missing.
        </p>
      </div>
    </Shell>
  );
}
