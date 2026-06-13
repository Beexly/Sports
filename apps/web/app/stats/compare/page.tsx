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
          const tone = x.winner === c.a.name ? "cyan" : x.winner === c.b.name ? "amber" : "neutral";
          return (
            <div key={x.key} className="border border-mineral bg-eclipse p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-ion-white font-semibold">{x.key}</p>
                <Badge tone={tone === "cyan" ? "good" : tone === "amber" ? "warn" : "neutral"}>
                  {x.winner === c.a.name ? c.a.name : x.winner === c.b.name ? c.b.name : "Tied"}
                </Badge>
              </div>
              <p className="text-sm text-ion-1">
                {c.a.name}: {x.a} · {c.b.name}: {x.b}
              </p>
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
