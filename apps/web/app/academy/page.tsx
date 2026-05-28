import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

export const metadata: Metadata = {
  title: "Galaxy Brain Academy — Sports Betting Education",
  description:
    "Learn the signals behind every pick. From odds basics to advanced market theory — the Academy is how Galaxy Sports turns bettors into informed decision-makers.",
  alternates: { canonical: "/academy" },
};

const TRACKS = [
  {
    id: "foundation",
    name: "Foundation Track",
    subtitle: "Odds, Spreads, Lines",
    description:
      "The vocabulary of betting markets. Understand how lines are set, why spreads exist, and what a moneyline actually prices before you place a single dollar.",
    modules: 5,
    tier: "Free",
    tierColor: "text-emerald-300 border-emerald-900 bg-emerald-950/30",
    accent: "border-emerald-800",
    topics: ["Reading a line", "Spread vs. moneyline", "Juice and vig", "Opening vs. closing price", "How books make money"],
    level: "Beginner",
  },
  {
    id: "signal",
    name: "Signal Track",
    subtitle: "Line Movement, Steam, Sharp Money, CLV, +EV",
    description:
      "The market layer. How and why prices move, what closing line value actually measures, and how to identify positive-expected-value opportunities without noise.",
    modules: 8,
    tier: "Pro",
    tierColor: "text-ion-blue border-cyan-800 bg-cyan-950/30",
    accent: "border-cyan-800",
    topics: ["Line movement anatomy", "What steam means", "Sharp vs. square money", "CLV and why it predicts skill", "+EV identification", "Steam chasing risk", "Market timing", "Book-specific quirks"],
    level: "Intermediate",
  },
  {
    id: "edge",
    name: "Edge Track",
    subtitle: "Bankroll Math, Tilt Detection, Portfolio Approach, No-Bet Doctrine",
    description:
      "The discipline layer. Long-run edge is destroyed faster by bankroll mismanagement and emotional tilting than by bad picks. This track addresses the problems most bettors never name.",
    modules: 5,
    tier: "Elite",
    tierColor: "text-purple-300 border-purple-900 bg-purple-950/30",
    accent: "border-purple-800",
    topics: ["Kelly criterion and variants", "Unit sizing systems", "Tilt detection patterns", "Portfolio diversification across sports", "The no-bet doctrine — when not playing is the edge"],
    level: "Advanced",
  },
] as const;

const CONCEPTS = [
  {
    id: "ev",
    label: "Expected Value (EV)",
    short: "+EV / −EV",
    body: "EV is the average outcome of a bet if it were placed an infinite number of times. A bet with positive expected value wins money over the long run regardless of short-term variance. EV is calculated from the true probability versus the implied market probability.",
  },
  {
    id: "clv",
    label: "Closing Line Value (CLV)",
    short: "Skill Measurement",
    body: "CLV compares the price you got when you bet to where the market closed at tip-off or puck-drop. Consistently beating the closing line is the most reliable evidence of informed betting — the market has processed all available information by close.",
  },
  {
    id: "line-movement",
    label: "Line Movement",
    short: "Price Change",
    body: "Lines move because new information enters the market — injuries, weather, roster changes, or sharp-money pressure. Understanding why a line moved is more valuable than knowing that it moved. Direction and speed both carry signal.",
  },
  {
    id: "market-efficiency",
    label: "Market Efficiency",
    short: "Consensus Pricing",
    body: "Betting markets are efficient but not perfectly so. Inefficiencies concentrate in early lines, obscure markets, and situations where public bias distorts prices. The closer to close, the harder the edge — and the smaller the reward for finding one.",
  },
  {
    id: "bankroll",
    label: "Bankroll System",
    short: "Risk Management",
    body: "A bankroll system defines bet sizing as a function of edge, variance, and unit size — never of confidence alone. Flat betting and Kelly variants both outperform intuition-driven sizing. Ruin is the only outcome that ends the game permanently.",
  },
  {
    id: "no-bet",
    label: "No-Bet Doctrine",
    short: "Discipline",
    body: "Not betting is a position. The no-bet doctrine holds that forcing action when edge is unclear destroys more value than missed opportunities. The discipline to pass is the hardest skill to develop and the most differentiating one to have.",
  },
] as const;

export default function AcademyPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">

        {/* Hero */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_25%_0%,rgba(0,229,255,0.09),transparent_45%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Galaxy Brain Academy
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Academy.
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-light leading-8 text-gray-200">
              Sports betting is information asymmetry. We close the gap.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
              Three structured learning tracks — from reading your first line to understanding why not betting is sometimes the sharpest move in the book. No performance promises. No guru mythology. Signal education only.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                Start learning — free track available
              </Link>
              <Link
                href="/methodology"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                Our methodology
              </Link>
            </div>
          </div>
        </section>

        {/* Learning Tracks */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Curriculum
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Three learning tracks.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                Each track is self-contained. Start at Foundation if you are new to betting markets. Jump to Signal or Edge if you already have the vocabulary.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {TRACKS.map((track) => (
                <article
                  key={track.id}
                  className={`flex flex-col border border-mineral bg-gray-900/60 p-6 ${track.accent} border-t-2`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${track.tierColor}`}
                      >
                        {track.tier}
                      </span>
                      <h3 className="mt-3 text-lg font-bold text-white">{track.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">{track.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">Modules</p>
                      <p className="text-2xl font-black text-white">{track.modules}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-400">{track.description}</p>

                  <ul className="mt-5 flex flex-col gap-1.5">
                    {track.topics.map((topic) => (
                      <li key={topic} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="mt-0.5 font-mono text-ion-blue">—</span>
                        {topic}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 border-t border-mineral pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
                      Level · {track.level}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Core Concepts Grid */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Core Concepts
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                The six ideas that matter most.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                Every pick and signal published on Galaxy traces back to one or more of these concepts. Understanding them is the foundation of reading our output correctly.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CONCEPTS.map((concept) => (
                <div
                  key={concept.id}
                  className="border border-mineral bg-carbon/60 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-white">{concept.label}</h3>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-ion-blue">
                      {concept.short}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{concept.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Galaxy Methodology CTA */}
        <section className="border-b border-mineral px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                  Galaxy Methodology
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  How we score picks — open for inspection.
                </h2>
                <p className="mt-4 text-sm leading-7 text-gray-400">
                  The Academy teaches the concepts. The Methodology page shows how those concepts are implemented inside Galaxy's scoring system — confidence calibration, source hierarchy, claim governance. You can inspect every layer.
                </p>
                <Link
                  href="/methodology"
                  className="mt-6 inline-flex min-h-10 items-center justify-center border border-gray-700 px-5 py-2.5 text-sm font-bold text-gray-100 hover:border-cyan-300"
                >
                  Read the methodology
                </Link>
              </div>
              <div className="border border-mineral bg-gray-900/60 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
                  From the methodology
                </p>
                <blockquote className="mt-3 text-sm leading-7 text-gray-300">
                  "Confidence is the model's stated probability, not a hype score. Below 50 is exploratory; below 35 is surfaced for transparency only. Confidence is shown, never hidden."
                </blockquote>
                <p className="mt-4 font-mono text-[10px] text-gray-600">
                  Source: Galaxy Sports Edge methodology · audit-locked
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Access the full curriculum
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Foundation Track is free. Signal and Edge require a plan.
            </h2>
            <p className="mt-4 text-base text-gray-400">
              Pro subscribers unlock the Signal Track. Elite subscribers unlock everything, including the Edge Track and early-access picks. No performance guarantees — only better information.
            </p>
            <Link
              href="/pricing"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
            >
              See plans and pricing
            </Link>
            <div className="mt-8 mx-auto max-w-lg">
              <RiskDisclosure variant="compact" includePastPerformance />
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
