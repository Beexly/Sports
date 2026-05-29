import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadAdrIndex } from "@/lib/decisions/adr-index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Architecture Decisions — Galaxy Sports Edge",
  description:
    "Every architectural decision Galaxy has made, with the trade-offs that drove it. Public ADR archive.",
};

const STATUS_ACCENT: Record<string, string> = {
  Accepted: "text-emerald-400 border-emerald-700/40",
  Proposed: "text-amber-400 border-amber-700/40",
  Deprecated: "text-gray-500 border-gray-700/40",
};

export default async function DecisionsPage(): Promise<JSX.Element> {
  const entries = await loadAdrIndex();

  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Architecture Decision Records
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            Why we chose what we chose.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            Every significant architectural decision Galaxy has made, with the context that motivated it, the trade-offs we accepted, and the alternatives we rejected.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
            These are the records engineers and operators read. Visible publicly so the reasoning is auditable, not because we expect every visitor to follow.
          </p>
        </header>

        {/* ── Entries ───────────────────────────────────────────────────── */}
        {entries.length === 0 ? (
          <section className="rounded-2xl border border-mineral bg-gray-900/40 p-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Index unavailable
            </p>
            <p className="mt-3 text-sm text-gray-400">
              ADR files could not be read at request time. Source files live in docs/adr/.
            </p>
          </section>
        ) : (
          <ol className="space-y-6">
            {entries.map((adr) => {
              const accent = adr.status ? STATUS_ACCENT[adr.status] ?? "text-gray-400 border-gray-700" : "text-gray-400 border-gray-700";
              return (
                <li key={adr.slug} className={["rounded-xl border bg-gray-900/55 p-5", accent].join(" ")}>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
                      ADR-{adr.id.padStart(3, "0")}
                    </span>
                    {adr.status && (
                      <span className={["font-mono text-[10px] uppercase tracking-widest", accent.split(" ")[0]].join(" ")}>
                        {adr.status}
                      </span>
                    )}
                    {adr.date && (
                      <span className="font-mono text-[10px] text-gray-500">{adr.date}</span>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-white">{adr.title}</h2>
                  {adr.decisionSentence && (
                    <p className="mt-3 text-sm leading-6 text-gray-300">
                      {adr.decisionSentence}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {/* ── Closing ────────────────────────────────────────────────────── */}
        <section className="border-t border-mineral pt-10 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Read the methodology
            </Link>
            <Link
              href="/we-were-wrong"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              See what we got wrong
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
