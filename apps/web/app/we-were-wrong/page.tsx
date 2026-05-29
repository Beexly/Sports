import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MODEL_AUTOPSY_ENTRIES } from "@/lib/we-were-wrong/entries";

export const metadata: Metadata = {
  title: "We were wrong — Galaxy Sports Edge",
  description:
    "Public model autopsy. The methodology decisions, calibration drift, and individual calls Galaxy got wrong — with what we changed in response.",
};

const KIND_LABEL: Record<string, string> = {
  methodology: "Methodology",
  calibration: "Calibration",
  "single-call": "Single call",
  "version-bump": "Version bump",
};

const KIND_ACCENT: Record<string, string> = {
  methodology: "text-amber-400 border-amber-700/40",
  calibration: "text-rose-400 border-rose-700/40",
  "single-call": "text-cyan-400 border-cyan-700/40",
  "version-bump": "text-emerald-400 border-emerald-700/40",
};

export default function WeWereWrongPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-400">
            Public model autopsy
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            We were wrong.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            When a methodology decision, calibration assumption, or specific call turns out to be wrong, we publish what we said, what actually happened, and what we changed.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
            Append-only. We do not edit history. The first three entries below reflect bootstrap-period methodology limits — written before any canonical history accumulates. Future entries will track specific calls.
          </p>
        </header>

        {/* ── Entries ───────────────────────────────────────────────────── */}
        <ol className="space-y-12">
          {MODEL_AUTOPSY_ENTRIES.map((entry) => (
            <li
              key={entry.id}
              className={["border-l-2 pl-6", KIND_ACCENT[entry.kind] ?? ""].join(" ")}
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
                  {KIND_LABEL[entry.kind]}
                </p>
                <p className="font-mono text-[10px] text-gray-500">{entry.publishedAt}</p>
              </div>
              <h2 className="mt-2 text-xl font-bold leading-tight text-white sm:text-2xl">
                {entry.headline}
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <article>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
                    What we said
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">{entry.whatWeSaid}</p>
                </article>
                <article>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-amber-500">
                    What actually happened
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {entry.whatActuallyHappened}
                  </p>
                </article>
                <article>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-400">
                    What we changed
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">{entry.whatWeChanged}</p>
                </article>
              </div>
            </li>
          ))}
        </ol>

        {/* ── Closing ────────────────────────────────────────────────────── */}
        <section className="border-t border-mineral pt-10 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/manifesto"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Read the manifesto
            </Link>
            <Link
              href="/stream"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              See the decision stream
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
