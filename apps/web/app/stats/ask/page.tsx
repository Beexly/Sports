import { Shell, SectionHeader, DataTable } from "../_components";
import { askStatKing } from "@/lib/statking/product";
export const metadata = {
  title: "Ask StatKing: Grounded NFL Stat Answers",
  description: "Ask about players, teams, usage, and matchups and get answers backed by source lineage, never fabricated.",
  alternates: { canonical: "/stats/ask" },
};
const TEMPLATES = [
  "best QB by fantasy edge",
  "best RB by usage",
  "most volatile WR",
  "hidden value players",
  "mirage players",
  "sources needing activation",
  "top YouTube sources",
];
export default function Page({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q ?? "best players";
  const answer = askStatKing(q);

  return (
    <Shell title="Ask StatKing">
      <div className="flex flex-wrap gap-2 mb-6">
        {TEMPLATES.map(t => (
          <a
            key={t}
            href={"?q=" + encodeURIComponent(t)}
            className="inline-block border border-mineral bg-eclipse px-3 py-1.5 text-xs text-ion-1 hover:border-orbital-cyan hover:text-orbital-cyan transition-colors rounded-full"
          >
            {t}
          </a>
        ))}
      </div>
      <form className="mb-6">
        <input
          name="q"
          aria-label="Ask StatKing a question"
          defaultValue={q}
          placeholder="best QB by fantasy edge, most volatile WR, hidden value RB..."
          className="w-full border border-mineral bg-eclipse p-3 text-ion-white placeholder-ion-2 rounded focus:border-orbital-cyan focus:outline-none"
        />
        <button className="mt-3 border border-orbital-cyan px-4 py-2 text-orbital-cyan hover:bg-orbital-cyan hover:text-carbon transition-colors rounded">
          Ask
        </button>
      </form>
      <SectionHeader eyebrow="Ask StatKing results" title={answer.title} />
      {answer.rows.length === 0 ? (
        <p className="text-sm text-ion-1 py-4">No results matched for this query in the current snapshot.</p>
      ) : (
        <DataTable
          rows={answer.rows as Array<Record<string, unknown>>}
          maxRows={50}
        />
      )}
    </Shell>
  );
}
