import { Shell, Cards } from "../_components";
import { comparePlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Player Compare — Side-by-Side NFL Metrics",
  description: "Compare any two players across usage, efficiency, role, volatility, and fantasy value.",
  alternates: { canonical: "/stats/compare" },
};
export default function Page({ searchParams }: { searchParams?: { a?: string; b?: string; scoring?: string } }){ const c=comparePlayers(searchParams?.a ?? "p001", searchParams?.b ?? "p002"); return <Shell title="Player Compare"><Cards items={[{label:"Player A",value:c.a.name,note:c.a.position+" · "+c.a.team},{label:"Player B",value:c.b.name,note:c.b.position+" · "+c.b.team},{label:"Scoring",value:searchParams?.scoring ?? "PPR"},{label:"Confidence gap",value:Math.abs(c.a.data_confidence-c.b.data_confidence)}]}/><div className="grid gap-4 md:grid-cols-2">{c.categories.map(x=><div key={x.key} className="border border-mineral bg-eclipse p-4"><p className="text-ion-white">{x.key}</p><p className="text-sm text-ion-1">{c.a.name}: {x.a} · {c.b.name}: {x.b}</p><p className="mt-2 text-orbital-cyan">Winner: {x.winner}</p></div>)}</div><p className="text-ion-1">Explanation: {c.categories[1]?.winner} wins usage; {c.categories[2]?.winner} is more efficient; lower volatility wins risk. Confidence is limited where licensed tracking and grades are missing.</p></Shell>}
