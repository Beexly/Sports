import Link from "next/link";

/**
 * Shown when the sealed card is past its shelf life. It replaces the rows
 * rather than sitting above them: a stale row is not a live play, and the page
 * must not offer one next to an apology for offering it.
 */
export function CardStaleNotice({ ageDays, generatedAt }: { ageDays: number; generatedAt: string | null }) {
  const age = Number.isFinite(ageDays) ? `${ageDays} days old` : "undated";
  return (
    <section
      data-testid="sealed-card-stale-notice"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-8"
    >
      <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">No live card</p>
      <h2 className="mt-3 font-display text-3xl uppercase text-[#EDE8E0]">
        The sealed card is {age}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C4BFB6]">
        A card is sealed for one slate. This one was sealed
        {generatedAt ? ` on ${generatedAt.slice(0, 10)}` : " without a date"}, so its rows are
        settled history and every game on it has already kicked off. Showing them as today&apos;s
        plays would take money for games that are over, so the rows are withheld until the next
        card is sealed.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/slate/nfl"
          className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-extrabold text-black transition-colors hover:bg-emerald-400"
        >
          Live NFL slate →
        </Link>
        <Link
          href="/packages"
          className="rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-[#EDE8E0] transition-colors hover:border-emerald-400"
        >
          Galaxy Picks packs →
        </Link>
        <Link
          href="/fantasy/dfs"
          className="rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-[#EDE8E0] transition-colors hover:border-emerald-400"
        >
          DFS optimizer →
        </Link>
      </div>
    </section>
  );
}
