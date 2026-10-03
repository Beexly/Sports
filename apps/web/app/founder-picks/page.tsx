import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { loadFounderPickRecord } from "@/lib/founder-picks/record";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Founder Picks · Owner's board",
  description:
    "Picks entered personally by the owner, sealed at publish, and graded by the same settlement path as every engine pick. Win rate is decided picks only.",
  alternates: { canonical: "/founder-picks" },
};

const RESULT_TONE: Record<string, string> = {
  WIN: "text-orbital-cyan",
  LOSS: "text-alert",
  PUSH: "text-ion-2",
  VOID: "text-ion-3",
  PENDING: "text-ion-1",
};

export default async function FounderPicksPage() {
  const record = await loadFounderPickRecord(50);

  return (
    <div className="flex min-h-screen flex-col bg-obsidian gw-nebula">
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
            Founder picks
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ion-white sm:text-4xl">
            The owner&apos;s board.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
            Entered by the owner, not the model. Sealed at publish. Graded by the same
            settlement path as every engine pick. No auto-generation, no fabricated
            confidence, no silent edits.
          </p>

          <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="founder-record">
            <div className="surface-card p-4">
              <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Record</p>
              <p className="mt-1 font-display text-2xl text-ion-white">
                {record.wins}–{record.losses}
                {record.pushes > 0 ? `–${record.pushes}` : ""}
              </p>
            </div>
            <div className="surface-card p-4">
              <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Win rate</p>
              <p className="mt-1 font-display text-2xl text-orbital-cyan">
                {record.winRatePct === null ? "—" : `${record.winRatePct}%`}
              </p>
            </div>
            <div className="surface-card p-4">
              <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Decided</p>
              <p className="mt-1 font-display text-2xl text-ion-white">{record.decided}</p>
            </div>
            <div className="surface-card p-4">
              <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Pending</p>
              <p className="mt-1 font-display text-2xl text-ion-white">{record.pending}</p>
            </div>
            <div className="surface-card p-4">
              <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">Pushes</p>
              <p className="mt-1 font-display text-2xl text-ion-2">{record.pushes}</p>
            </div>
          </section>

          <p className="mt-3 text-xs leading-5 text-ion-2">
            Win rate is decided picks only (wins over wins + losses). Pushes count in the
            population, not the rate. Past performance does not guarantee future results.
          </p>

          <section className="mt-10">
            <h2 className="font-display text-xl text-ion-white">Every call</h2>
            {record.picks.length === 0 ? (
              <p className="mt-4 text-sm text-ion-2">
                No founder picks yet. The board opens when the owner locks the first one.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {record.picks.map((p) => (
                  <li key={p.id} className="surface-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RESULT_TONE[p.result] ?? "text-ion-2"}`}
                      >
                        {p.result}
                      </span>
                      <span className="text-xs text-ion-2">{p.sport}</span>
                      <span className="text-xs text-ion-1">{p.matchup}</span>
                      <span className="ml-auto text-[10px] text-ion-3">
                        {new Date(p.generatedAt).toISOString().slice(0, 10)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ion-white">
                      {p.selection}
                      <span className="ml-2 text-xs font-normal text-ion-3">
                        {p.pickType} · conf {p.confidence}
                      </span>
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ion-1">{p.reasoning}</p>
                    {p.clvVerdict ? (
                      <p className="mt-2 text-[11px] text-ion-3">Close: {p.clvVerdict}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
