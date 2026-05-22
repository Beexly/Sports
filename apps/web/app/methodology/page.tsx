import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { MethodologySection } from "@/components/ui/methodology-section";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

export const metadata: Metadata = {
  title: "Methodology - Deterministic Scoring, Open Framework",
  description:
    "How Galaxy Sports Edge reads the board, scores the math, and gates the slate without publishing proprietary weights or constants.",
  alternates: { canonical: "/methodology" },
};

const FACTORS = [
  "Market consensus",
  "Book depth",
  "Line movement",
  "Volatility",
  "Head-to-head context",
  "Venue form",
  "Schedule stress",
  "Rest differential",
  "Cross-market agreement",
  "Data quality",
] as const;

const STACK = [
  {
    title: "Read the board",
    body: "The engine starts with observable market data: spread, total, moneyline, book count, price freshness, and line movement.",
  },
  {
    title: "Score the math",
    body: "A deterministic factor model scores the market and matchup context. The framework is public; weights, constants, and aggregation formula stay proprietary.",
  },
  {
    title: "Gate the slate",
    body: "Publish thresholds, freshness checks, and data-quality gates decide whether a pick reaches the board. Thin slates can produce zero picks.",
  },
] as const;

const CHANGELOG = [
  ["v5.0", "Bootstrap-canonical gating and settled-only learning policy."],
  ["v4.0", "Expanded factor snapshot storage for public audit trails."],
  ["v3.0", "Added schedule stress, rest, and cross-market checks."],
] as const;

export default function MethodologyPage(): JSX.Element {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-gray-800 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Published framework
            </p>
            <h1 className="mt-4 max-w-4xl break-words text-4xl font-black tracking-tight text-white sm:text-5xl">
              Deterministic scoring. Open method. Protected weights.
            </h1>
            <p className="mt-6 max-w-2xl break-words text-lg leading-8 text-gray-300">
              Galaxy Sports Edge publishes the factors and decision philosophy behind the model.
              The exact weights, constants, and aggregation formula remain proprietary.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {STACK.map((item, index) => (
              <article key={item.title} className="border border-gray-800 bg-gray-900/65 p-6">
                <span className="font-mono text-xs text-cyan-300">0{index + 1}</span>
                <h2 className="mt-3 text-2xl font-bold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
                  Factor inventory
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">What the model can read</h2>
              </div>
              <p className="max-w-sm text-sm text-gray-500 sm:text-right">
                Factors are visible. Exact scoring weights are not published.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {FACTORS.map((factor) => (
                <div key={factor} className="min-h-20 border border-gray-800 bg-gray-950/70 p-4">
                  <p className="text-sm font-semibold text-white">{factor}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MethodologySection />

        <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Version changelog
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">Model changes are named.</h2>
            <div className="mt-8 overflow-hidden border border-gray-800">
              {CHANGELOG.map(([version, note]) => (
                <div key={version} className="grid gap-2 border-b border-gray-800 px-4 py-4 last:border-b-0 sm:grid-cols-[120px_1fr]">
                  <span className="font-mono text-sm text-cyan-200">{version}</span>
                  <span className="text-sm text-gray-400">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <h2 className="text-3xl font-black text-white">See the framework on today&apos;s board.</h2>
            <p className="text-sm leading-6 text-gray-400">
              The public board shows every published pick and every free Edge Index.
              Pro keeps the detailed factor breakdown.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/board" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950">
                Open today&apos;s board
              </Link>
              <Link href="/performance" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100">
                View calibration
              </Link>
            </div>
            <RiskDisclosure variant="compact" className="text-center" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
