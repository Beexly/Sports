import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { TrustStrip } from "@/components/trust";
import { loadDecisionStream } from "@/lib/stream/decision-stream";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Decision Stream — Galaxy Sports Edge",
  description:
    "Append-only public timeline of every Galaxy decision: picks published, picks settled, games gated, model version transitions.",
};

const ACCENT_CLASS: Record<string, string> = {
  "ion-blue": "border-ion-blue/50 text-ion-blue",
  amber: "border-amber-500/60 text-amber-400",
  emerald: "border-emerald-500/60 text-emerald-400",
  cyan: "border-cyan-500/60 text-cyan-300",
  rose: "border-rose-500/60 text-rose-400",
  gray: "border-gray-700 text-gray-400",
};

export default async function StreamPage(): Promise<JSX.Element> {
  const stream = await loadDecisionStream(75);
  const isEmpty = stream.events.length === 0;

  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        <TrustStrip
          surfaceId="stream"
          source="galaxy-model"
          freshness={isEmpty ? "unknown" : "fresh"}
          surfaceKind="decision-quality"
          tier="all"
          uncertainty={isEmpty ? "sample" : "live"}
          showMethodology
          showResponsiblePlay
        />

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Append-only timeline
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Decision Stream
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            Every decision Galaxy has made, in order. Picks published. Games gated. Picks settled. Model versions updated.
            We do not edit this stream. We do not hide entries. This is the auditable record.
          </p>
        </header>

        {/* ── Stream ─────────────────────────────────────────────────────── */}
        {isEmpty ? (
          <section className="rounded-2xl border border-mineral bg-gray-900/40 p-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Stream is empty
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-400">
              No canonical decisions have been made yet. The stream begins when the model evaluates its first live
              slate and a pick or a pass is logged.
            </p>
          </section>
        ) : (
          <ol className="space-y-0">
            {stream.events.map((event, i) => (
              <li
                key={event.id}
                className={[
                  "border-l-2 py-5 pl-5",
                  ACCENT_CLASS[event.accent] ?? "border-gray-700 text-gray-400",
                  i === stream.events.length - 1 ? "border-b-0" : "",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em]">
                    {event.kind.replace(/-/g, " ")}
                  </p>
                  <p className="font-mono text-[10px] text-gray-500">
                    {event.at.slice(0, 19).replace("T", " ")}Z
                  </p>
                </div>
                <h3 className="mt-2 text-base font-semibold text-white">{event.headline}</h3>
                <p className="mt-1 text-sm text-gray-400">{event.sub}</p>
              </li>
            ))}
          </ol>
        )}

        {/* ── Closing ────────────────────────────────────────────────────── */}
        <section className="border-t border-mineral pt-10 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ledger/canonical"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Open the canonical ledger
            </Link>
            <Link
              href="/we-were-wrong"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              Read what we got wrong
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
