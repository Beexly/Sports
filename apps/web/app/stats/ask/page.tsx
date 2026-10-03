import { Shell, SectionHeader, DataTable, StatusRibbon } from "../_components";
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
    <Shell title="Ask StatKing" eyebrow="Grounded Q&A">
      <StatusRibbon status="fixture" label="Answers computed from the current fixture snapshot, never generated" />
      <div className="border border-mineral bg-eclipse p-4 space-y-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            name="q"
            aria-label="Ask StatKing a question"
            defaultValue={q}
            placeholder="best QB by fantasy edge, most volatile WR, hidden value RB..."
            className="w-full border border-mineral bg-carbon p-3 text-sm text-ion-white placeholder:text-ion-3 rounded focus:border-orbital-cyan focus:outline-none"
          />
          <button className="border border-orbital-cyan px-4 py-2 text-sm text-orbital-cyan hover:bg-orbital-cyan hover:text-carbon transition-colors rounded">
            Ask
          </button>
        </form>
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ion-2">Try a question</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <a
                key={t}
                href={"?q=" + encodeURIComponent(t)}
                className="inline-block border border-mineral bg-carbon px-3 py-1.5 text-xs text-ion-1 hover:border-orbital-cyan hover:text-orbital-cyan transition-colors rounded-full"
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
      <SectionHeader eyebrow="Ask StatKing results" title={answer.title} />
      {answer.rows.length === 0 ? (
        <p className="border border-mineral bg-eclipse/40 px-4 py-6 text-center text-sm text-ion-1">
          No results matched this query in the current snapshot. Try one of the template questions above.
        </p>
      ) : (
        <DataTable
          caption={"Ask StatKing results for: " + q}
          rows={answer.rows as Array<Record<string, unknown>>}
          maxRows={50}
        />
      )}
    </Shell>
  );
}
