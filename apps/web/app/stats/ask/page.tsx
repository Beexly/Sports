import { Shell, SectionHeader, DataTable } from "../_components";
import { askStatKing } from "@/lib/statking/product";
export const metadata = {
  title: "Ask StatKing — Grounded NFL Stat Answers",
  description: "Ask about players, teams, usage, and matchups and get answers backed by source lineage — never fabricated.",
  alternates: { canonical: "/stats/ask" },
};
export default function Page({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q ?? "best players";
  const answer = askStatKing(q);

  return (
    <Shell title="Ask StatKing">
      <form className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="best QB by fantasy edge, most volatile WR, hidden value RB..."
          className="w-full border border-mineral bg-eclipse p-3 text-ion-white placeholder-ion-2 rounded focus:border-orbital-cyan focus:outline-none"
        />
        <button className="mt-3 border border-orbital-cyan px-4 py-2 text-orbital-cyan hover:bg-orbital-cyan hover:text-carbon transition-colors rounded">
          Ask
        </button>
      </form>
      <SectionHeader title={answer.title} />
      <p className="text-ion-1 mb-6">
        Supported templates: best QB by fantasy edge, best RB by usage, most volatile WR, hidden value players, mirage players, sources needing activation, top YouTube sources.
      </p>
      <DataTable
        rows={answer.rows.map((r: Record<string, unknown>) => ({
          entity: String(r.entity ?? ""),
          metric: String(r.metric ?? ""),
          value: Number(r.value ?? 0),
          source: String(r.source ?? "")
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
