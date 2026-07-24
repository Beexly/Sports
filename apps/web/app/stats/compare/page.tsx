import Link from "next/link";
import { Shell, Cards, Badge, BarChart, StatusRibbon, InsightCard } from "../_components";
import { comparePlayers } from "@/lib/statking/product";

/** Name the slots that fell back, so the notice is specific rather than vague. */
function unresolvedLabel(c: ReturnType<typeof comparePlayers>): string {
  const missing: string[] = [];
  if (!c.aResolved) missing.push(`Player A "${c.requestedAId}"`);
  if (!c.bResolved) missing.push(`Player B "${c.requestedBId}"`);
  return `${missing.join(" and ")} ${missing.length > 1 ? "were" : "was"} not found`;
}

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
      <StatusRibbon status="fixture" label="Comparison snapshot updated every sync cycle" />

      {(!c.aResolved || !c.bResolved) && (
        <InsightCard
          tone="warn"
          eyebrow="Not the comparison you asked for"
          headline={`${unresolvedLabel(c)} — showing a stand-in instead`}
          body="The comparison below is real, but it is not the one you requested. Rather than quietly swapping in a different player and presenting that as your request, we are telling you."
        >
          <Link
            href="/stats/players"
            className="text-sm text-orbital-cyan underline hover:text-ion-white"
          >
            Find the right player ID →
          </Link>
        </InsightCard>
      )}

      <form method="get" className="border border-mineral bg-eclipse p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="a" aria-label="Player A ID" defaultValue={searchParams?.a ?? "p001"} placeholder="Player A ID (e.g. p001)" className="border border-mineral bg-carbon p-2 text-ion-white placeholder:text-ion-3 text-sm rounded focus:border-orbital-cyan focus:outline-none" />
          <input name="b" aria-label="Player B ID" defaultValue={searchParams?.b ?? "p002"} placeholder="Player B ID (e.g. p002)" className="border border-mineral bg-carbon p-2 text-ion-white placeholder:text-ion-3 text-sm rounded focus:border-orbital-cyan focus:outline-none" />
          <button className="border border-orbital-cyan px-3 py-2 text-orbital-cyan text-sm hover:bg-orbital-cyan hover:text-carbon transition-colors rounded">Compare</button>
        </div>
        <p className="text-xs text-ion-2">Enter player IDs from the Players page.</p>
      </form>
      <Cards items={[
        { label: "Player A", value: c.a.name, note: c.a.position + " · " + c.a.team },
        { label: "Player B", value: c.b.name, note: c.b.position + " · " + c.b.team },
        { label: "Scoring", value: searchParams?.scoring ?? "PPR" },
        {
          // A bare "12 pts" told the reader nothing: not which player is better
          // evidenced, not whether higher is better, not whether 12 is a lot.
          // Naming the direction makes it a fact instead of a decoration.
          label: "Better-evidenced",
          value:
            c.a.data_confidence === c.b.data_confidence
              ? "Even"
              : c.a.data_confidence > c.b.data_confidence
                ? c.a.name
                : c.b.name,
          note:
            c.a.data_confidence === c.b.data_confidence
              ? "Same data-confidence score"
              : `by ${Math.abs(c.a.data_confidence - c.b.data_confidence)} pts of data confidence`,
        },
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
                <Badge tone={aWins || bWins ? "good" : "neutral"}>
                  {aWins ? c.a.name : bWins ? c.b.name : "Tied"}
                </Badge>
              </div>
              <BarChart items={[
                { label: c.a.name, value: aVal, max, tone: aWins ? "cyan" : "neutral" },
                { label: c.b.name, value: bVal, max, tone: bWins ? "cyan" : "neutral" },
              ]} />
            </div>
          );
        })}
      </div>
      <InsightCard
        eyebrow="Key Insights"
        headline={c.a.name + " vs " + c.b.name + ": side-by-side read"}
        body={insightBody || "No category data available for this comparison."}
      />
    </Shell>
  );
}
