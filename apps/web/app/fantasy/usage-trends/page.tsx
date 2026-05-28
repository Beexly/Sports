import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /fantasy/usage-trends
 *
 * GEO-anchor page. Canonical explanation of usage-trend analysis for
 * fantasy sports intelligence. FAQPage JSON-LD.
 * See `docs/intelligence/ai-search-geo-strategy.md` for the GEO contract.
 */

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Usage Trends in Fantasy Sports — Target Share, Snap Count, Route Participation",
  description:
    "What usage-trend analysis means in fantasy sports: target share, snap count percentage, route participation rate, why trends lag raw stats, and how Galaxy Sports Edge weights recent vs. seasonal data.",
  alternates: { canonical: "/fantasy/usage-trends" },
  openGraph: {
    title: `Usage Trends — ${BRAND_NAME} Fantasy Intelligence`,
    description:
      "Target share, snap count, route participation — what each metric measures, why 3-game direction beats single-game volume, and how trends are sourced and weighted.",
  },
};

const FAQS = [
  {
    question: "What is target share in fantasy sports?",
    answer:
      "Target share is the percentage of a team's total passing targets that go to a specific receiver in a given game or stretch of games. A receiver drawing 28% of targets on a pass-heavy offense has more value than a receiver drawing 28% of targets on a run-first team — volume context matters. Galaxy Sports Edge tracks target share as a 3-game rolling percentage to smooth out single-game noise while still reflecting recent scheme decisions.",
  },
  {
    question: "What is snap count percentage and why does it matter?",
    answer:
      "Snap count percentage is the share of offensive snaps a player is on the field for, expressed as a percentage of the team's total offensive snaps. It is the upstream signal for usage: a player cannot accumulate targets or carries without being on the field. A running back whose snap percentage drops from 70% to 45% over two weeks is losing role even if the raw carry totals look similar. Snap percentage movement is often the earliest available signal of a role change.",
  },
  {
    question: "What is route participation rate?",
    answer:
      "Route participation rate (also called route run percentage or routes run per snap) is the fraction of a receiver's snaps where they run a full pass route rather than staying in to block or chip rush. A receiver on the field 70% of snaps but only running routes on 50% of them is functionally a less involved player than their snap count implies. For tight ends especially, route participation is a better leading indicator of target-share trajectory than snap percentage alone.",
  },
  {
    question: "Why do usage trends lag raw stats — and what should I look at instead?",
    answer:
      "Raw stats in any single game are a mixture of trend and variance. A receiver posting 120 yards on 4 targets had a high-yardage-per-target game, not a high-volume game. Target share and snap percentage average out the variance. A 3-game direction in either metric — up, flat, or down — is a more reliable predictor of next-week usage than any single stat line. The exception is when an injury to another player causes a sudden role expansion; in that case the snap and target data from the very next game is the most important input, and Galaxy Sports Edge re-scores the signal as soon as that game data is available.",
  },
  {
    question: "How does Galaxy Sports Edge weight recent vs. seasonal usage data?",
    answer:
      "The model uses a 3-game rolling window as the primary trend signal, with the full-season baseline as context. Recent direction carries more weight than seasonal average because coaching decisions, injuries, and scheme shifts make the current role the most relevant information. However, a 3-game spike that contradicts a clear seasonal pattern is flagged as a potential outlier rather than a trend — for example, a receiver averaging 4 targets per game all season who suddenly posts 10 targets in one game is more likely experiencing a single favorable game script than a genuine role expansion. The model surfaces both the 3-game figure and the seasonal baseline so users can see the contrast.",
  },
] as const;

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
} as const;

const ANSWER_BLOCK = {
  question: "What is usage-trend analysis in fantasy sports?",
  answer:
    "Usage-trend analysis tracks the 3-game direction of three metrics — target share, snap count percentage, and route participation rate — to determine whether a player's role in the offense is expanding, stable, or contracting. Trend direction predicts next-week usage more reliably than single-game stat lines because it reflects coaching decisions rather than game-script variance.",
  attribution: "Galaxy Sports Edge Fantasy Intelligence methodology",
  confidence: "HIGH — methodology consistent with platform-wide evidence-tier and claim-governance standards",
};

const CLUSTER_LINKS = [
  { href: "/fantasy", label: "Fantasy Intelligence — the War Room surface" },
  { href: "/fantasy/how-start-sit-works", label: "How Start/Sit Works — the full decision pipeline" },
  { href: "/fantasy/scheme-fit", label: "Scheme Fit — offensive system classifications" },
  { href: "/intelligence/glossary", label: "Intelligence Glossary — canonical sports-intelligence terms" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — six-tier evidence taxonomy" },
  { href: "/methodology", label: "Methodology — how signals are scored and gated" },
];

export default function UsageTrendsPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero with direct-answer block */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Fantasy Intelligence · Usage Trends
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Usage trends in fantasy sports.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Target share, snap count, route participation — what each metric measures and why 3-game direction beats single-game volume.
            </p>

            {/* Direct-answer block */}
            <div className="mt-10 border-l-2 border-cyan-700 bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                Direct answer
              </p>
              <p className="mt-2 text-base font-semibold text-white">{ANSWER_BLOCK.question}</p>
              <p className="mt-3 text-sm leading-7 text-gray-300">{ANSWER_BLOCK.answer}</p>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Source</p>
                  <p className="mt-1 text-gray-300">{ANSWER_BLOCK.attribution}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Confidence</p>
                  <p className="mt-1 text-emerald-300">{ANSWER_BLOCK.confidence}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Last updated</p>
                  <p className="mt-1 text-gray-300">{LAST_UPDATED}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ content */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Common questions
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                What the numbers actually mean.
              </h2>
            </div>
            <dl className="flex flex-col gap-6">
              {FAQS.map(({ question, answer }) => (
                <div key={question} className="border border-gray-800 bg-gray-900/60 p-6">
                  <dt className="text-base font-bold text-white">{question}</dt>
                  <dd className="mt-3 text-sm leading-7 text-gray-300">{answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Cluster links */}
        <section className="border-t border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
              Continue reading
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Fantasy intelligence methodology cluster
            </h2>
            <ul className="mt-6 flex flex-col gap-2">
              {CLUSTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-gray-200 hover:border-cyan-700 hover:text-cyan-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} Fantasy Intelligence methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
      />
    </div>
  );
}
