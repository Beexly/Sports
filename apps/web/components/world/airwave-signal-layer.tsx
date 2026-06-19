import Link from "next/link";

/**
 * AirwaveSignalLayer — GSN's media-intelligence pipeline, end to end.
 *
 * Sports-media noise → paraphrased claim → entity tags → human review gate →
 * GSE evidence candidate → GSN studio brief. This is the workflow the
 * Airwave system runs on permissioned transcripts; the stage content here is
 * an illustrative walkthrough and says so. We never claim live broadcast
 * capture or scraping of protected feeds.
 *
 * Server component; the connecting beam is static gradient, no JS.
 */

const STAGES = [
  {
    n: "S1",
    title: "On-air noise",
    tone: "text-plasma",
    border: "border-plasma/30",
    body: "“This team is unbeatable at home, I'm telling you, nobody wants that matchup…” — confident, loud, unaccountable.",
    meta: "permissioned transcript · illustrative quote",
  },
  {
    n: "S2",
    title: "Paraphrased claim",
    tone: "text-white",
    border: "border-white/[0.08]",
    body: "Pundit asserts the home side is materially undervalued in this matchup.",
    meta: "neutral paraphrase · timestamped",
  },
  {
    n: "S3",
    title: "Entity tags",
    tone: "text-ultraviolet",
    border: "border-ultraviolet/30",
    body: "league · team · market type · direction · strength of claim",
    meta: "structured for grading",
  },
  {
    n: "S4",
    title: "Review gate",
    tone: "text-caution",
    border: "border-caution/30",
    body: "A human confirms the paraphrase is fair and the tags are right before anything is graded or published.",
    meta: "no auto-publish — ever",
  },
  {
    n: "S5",
    title: "GSE evidence candidate",
    tone: "text-orbital-cyan",
    border: "border-orbital-cyan/30",
    body: "If the claim is testable, it becomes a checkable hypothesis against priced markets — same gates as any signal.",
    meta: "the engine audits the take",
  },
  {
    n: "S6",
    title: "GSN studio brief",
    tone: "text-white",
    border: "border-white/[0.08]",
    body: "The claim, its grade history, and the market context land in a show-prep brief: story leads with receipts attached.",
    meta: "media made accountable",
  },
] as const;

export function AirwaveSignalLayer(): JSX.Element {
  return (
    <div>
      <div className="relative">
        {/* connecting signal spine */}
        <div
          aria-hidden
          className="absolute left-4 top-6 hidden h-[calc(100%-3rem)] w-px bg-gradient-to-b from-plasma/60 via-caution/50 to-orbital-cyan/70 lg:left-1/2 lg:block"
        />
        <ol className="grid gap-4 lg:grid-cols-2 lg:gap-x-16">
          {STAGES.map((stage, i) => (
            <li
              key={stage.n}
              className={`gw-card-hover relative rounded-ds-md border bg-white/[0.04] p-4 ${stage.border} ${
                i % 2 === 1 ? "lg:translate-y-10" : ""
              }`}
            >
              <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${stage.tone}`}>
                {stage.n} · {stage.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-ion">{stage.body}</p>
              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">{stage.meta}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-14 flex flex-col gap-4 rounded-ds-md border border-white/[0.08] bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-ink-300">
          Workflow shown end-to-end; stage content is illustrative. No live
          broadcast capture is wired — transcripts enter the system only with
          permission, and a human review gate sits before anything public.
        </p>
        <div className="flex shrink-0 flex-wrap gap-x-6 gap-y-2">
          <Link href="/the-beat" className="text-sm font-semibold text-orbital-cyan hover:text-white">
            GSN Studio ▸
          </Link>
          <Link href="/airwave" className="text-sm font-semibold text-ink-300 hover:text-white">
            The Airwave Ledger
          </Link>
        </div>
      </div>
    </div>
  );
}
