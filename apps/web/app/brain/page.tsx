import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Research Brain — Sports Intelligence Q&A | Galaxy Sports Edge",
  description:
    "Ask the Research Brain a structured sports intelligence question. Source-traceable, confidence-weighted answers — not fabricated outputs.",
  alternates: { canonical: "/brain" },
  openGraph: {
    title: `Research Brain — ${BRAND_NAME}`,
    description:
      "Structured sports intelligence answers with confidence, sources, and what's missing shown — not hidden.",
  },
};

const DEMO_ANSWERS = [
  {
    question: "How has the Patriots offense performed in road games with a short week this season?",
    answer: "Insufficient data to make a confident claim. Three qualifying games this season — too small a sample for statistical confidence. Current signal: mixed, trending slightly negative on early-down efficiency.",
    confidence: 34,
    sources: ["Schedule data", "Team DVOA (partial)"],
    missing: "Need 6+ games minimum for statistical confidence.",
    status: "LOW CONFIDENCE",
    publicSafe: true,
  },
  {
    question: "Is the Thunder over-valued against the spread this season relative to line movement?",
    answer: "The Thunder have covered in 7 of 10 home games when closing as a favorite of 4.5 or fewer. The market has not adjusted the line significantly in 4 of those covers, suggesting possible price inefficiency. Watchlist signal, not actionable without additional matchup context.",
    confidence: 61,
    sources: ["ATS record (current season)", "Book closing lines", "Movement data"],
    missing: "Opponent rest-adjusted pace data would strengthen or weaken this signal.",
    status: "WATCHLIST",
    publicSafe: true,
  },
] as const;

const ANATOMY = [
  { label: "Direct answer", desc: "The best-available answer given current evidence." },
  { label: "Confidence score", desc: "0–100. Below 50 is exploratory, not actionable. Below 35 is surfaced for transparency only." },
  { label: "Evidence used", desc: "What data sources and observations fed the answer." },
  { label: "What's missing", desc: "What additional data would move confidence up or down." },
  { label: "Market / pick implication", desc: "Whether the answer has any pick or fantasy relevance, clearly labeled as such." },
  { label: "Public-safe status", desc: "Whether this answer meets our standard for public publication without additional human review." },
] as const;

export default function BrainPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_50%_0%,rgba(122,92,255,0.14),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 inline-flex items-center gap-2 border border-purple-900 bg-purple-950/40 px-3 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-purple-300">Beta · Gated</span>
              <span className="text-xs text-purple-200">Evidence governance required before public access</span>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Research Brain</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Sports intelligence that shows its work.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Ask a structured sports intelligence question. Get a confidence-weighted answer with the evidence, sources, and gaps shown — not hidden.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
              Research Brain is in beta and requires evidence governance before unrestricted public access. Elite-tier subscribers get early access when the governance layer is ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
                Get Elite access
              </Link>
              <Link href="/methodology" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300">
                Evidence standards
              </Link>
            </div>
          </div>
        </section>

        {/* Answer anatomy */}
        <section className="border-b border-gray-800 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Answer anatomy</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Every Brain answer shows its structure.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ANATOMY.map(({ label, desc }) => (
                <div key={label} className="border border-gray-800 bg-gray-900/60 p-5">
                  <h3 className="text-sm font-bold text-cyan-200">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo answers */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-purple-300">Demo · Illustrative only</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Sample Brain answers</h2>
              </div>
              <p className="max-w-xs text-sm text-gray-500 sm:text-right">
                These are illustrative examples. No real data is used. Not picks or recommendations.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {DEMO_ANSWERS.map((a) => (
                <article key={a.question} className="border border-gray-800 bg-gray-900/60 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Question</p>
                  <p className="mt-2 text-lg font-semibold text-white">{a.question}</p>

                  <div className="mt-5 border-l-2 border-purple-700 pl-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-purple-300">Answer</p>
                    <p className="mt-2 text-sm leading-7 text-gray-300">{a.answer}</p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="border border-gray-800 bg-gray-950/50 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">Confidence</p>
                      <p className="mt-1 text-xl font-bold text-white">{a.confidence}</p>
                    </div>
                    <div className="border border-gray-800 bg-gray-950/50 p-3 sm:col-span-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">Sources used</p>
                      <p className="mt-1 text-sm text-gray-300">{a.sources.join(", ")}</p>
                    </div>
                    <div className="border border-gray-800 bg-gray-950/50 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500">Public safe</p>
                      <p className="mt-1 text-sm font-bold text-emerald-300">{a.publicSafe ? "YES" : "NO"}</p>
                    </div>
                  </div>

                  <div className="mt-4 border border-yellow-900 bg-yellow-950/20 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-yellow-300">Missing data</p>
                    <p className="mt-1 text-sm text-yellow-200">{a.missing}</p>
                  </div>

                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
                    DEMO · Illustrative only
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="border-t border-gray-800 bg-gray-900/35 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Refusal rules</p>
            <h2 className="mt-2 text-2xl font-bold text-white">What the Brain will not claim</h2>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-400">
              {[
                "Injury status not confirmed by official team report",
                "Win-rate claims not backed by settled-pick dataset",
                "Sharp-money action without specific movement data",
                "Rumors or social-media reports as facts",
                "Anything the source tier does not support",
              ].map((r) => (
                <li key={r} className="flex gap-3">
                  <span className="mt-0.5 text-red-400">✕</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
