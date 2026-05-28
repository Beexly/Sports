import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /fantasy/how-start-sit-works
 *
 * GEO-anchor page. Explains the start/sit recommendation methodology in
 * structured, citeable form. TechArticle JSON-LD + direct-answer block.
 * See `docs/intelligence/ai-search-geo-strategy.md` for the GEO contract.
 */

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "How Start/Sit Recommendations Work — Galaxy Sports Edge Fantasy Intelligence",
  description:
    "How Galaxy Sports Edge produces start/sit recommendations: four scored inputs (injury status, matchup grade, usage trend, scheme fit), evidence tier requirements, and what it means when a signal is in watchlist rather than start or sit.",
  alternates: { canonical: "/fantasy/how-start-sit-works" },
  openGraph: {
    title: `How Start/Sit Works — ${BRAND_NAME} Fantasy Intelligence`,
    description:
      "Four scored inputs. Source-tier evidence requirements. Watchlist vs. start vs. sit — what each signal state means and when the model refuses to give one.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How Start/Sit Recommendations Work — Galaxy Sports Edge",
  description:
    "Four scored inputs (injury status, matchup grade, usage trend, scheme fit), source-tier evidence requirements, and the watchlist signal state for unresolved situations.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "How does Galaxy Sports Edge decide whether to start or sit a player?",
  answer:
    "The system scores four inputs — official injury designation, matchup grade against the opposing coverage unit, the player's 3-game usage trend (targets, carries, or routes run), and scheme-fit alignment for the current game script. Each input is sourced from a declared evidence tier. If the inputs conflict or are unresolved (e.g. practice report still open), the signal is placed in WATCHLIST rather than START or SIT. The model does not force a recommendation when the data does not support one.",
  attribution: "Galaxy Sports Edge Fantasy Intelligence methodology",
  confidence: "HIGH — published methodology, consistent with platform-wide claim-governance rules",
};

const PIPELINE = [
  {
    step: "01",
    name: "Injury status",
    source: "Tier 1 (Official)",
    body: "The official injury designation from the team's practice report and game-status listing is the first gate. A player marked Doubtful or Out produces a SIT signal with high confidence regardless of other inputs. A player with no designation, or a Questionable listing with two consecutive full-practice days, clears this gate.",
    rule: "No start recommendation is issued until the practice report for that week is final. If it is still open, the signal stays WATCHLIST.",
  },
  {
    step: "02",
    name: "Matchup grade",
    source: "Tier 2 (Licensed data)",
    body: "The opposing coverage unit is graded by positional DVOA and coverage scheme (man, zone, bracket). A WR facing a CB2 in a weak zone defense is a materially different situation than the same receiver against a press-man scheme with bracket safety help. The matchup grade adjusts base confidence up or down.",
    rule: "Matchup grades use licensed structured data only. No subjective pundit assessment is included.",
  },
  {
    step: "03",
    name: "Usage trend",
    source: "Tier 2 (Licensed data)",
    body: "The 3-game direction of snap percentage, target share (WR/TE), or carry percentage (RB) is more predictive than single-game volume. A receiver trending from 4 to 7 to 11 targets over three weeks is being integrated into the offense; a receiver trending the other direction is being phased out. Direction matters more than any single number.",
    rule: "Trend requires at minimum 3 data points. A single large-usage game does not override a declining trend.",
  },
  {
    step: "04",
    name: "Scheme fit",
    source: "Tier 1–3 (Official + licensed + reporting)",
    body: "The offensive coordinator's scheme history, formation tendencies, and player utilization patterns determine how well a given player's skill set translates to this week's game script. An Air Raid coordinator concentrates targets differently than a run-heavy West Coast system. Scheme fit is the adjustment that makes the same player a different asset week to week.",
    rule: "Scheme-fit analysis cites specific coordinator tendencies, not generic 'good matchup' language.",
  },
] as const;

const SIGNAL_STATES = [
  {
    state: "START",
    color: "border-emerald-700 bg-emerald-950/30 text-emerald-300",
    meaning: "All four inputs align. Injury gate cleared, matchup favorable, usage trending up or stable, scheme fits. Confidence typically 65+.",
  },
  {
    state: "LEAN START",
    color: "border-cyan-700 bg-cyan-950/30 text-cyan-300",
    meaning: "Three of four inputs align. One input is neutral or slightly unfavorable. Worth starting in most formats but with context.",
  },
  {
    state: "WATCHLIST",
    color: "border-yellow-700 bg-yellow-950/30 text-yellow-300",
    meaning: "One or more inputs are unresolved — practice report open, usage split unclear, or contradicting signals between tiers. The model does not force a verdict.",
  },
  {
    state: "SIT",
    color: "border-red-800 bg-red-950/30 text-red-300",
    meaning: "Multiple inputs unfavorable, or a clear negative signal (Doubtful designation, scheme mismatch, sharp usage decline). Confidence for sitting typically 70+.",
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/fantasy", label: "Fantasy Intelligence — the War Room surface" },
  { href: "/fantasy/usage-trends", label: "Usage Trends — target share, snap count, route participation" },
  { href: "/fantasy/scheme-fit", label: "Scheme Fit — offensive system classifications" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — six-tier evidence taxonomy" },
  { href: "/methodology", label: "Methodology — how signals are scored and gated" },
];

export default function HowStartSitWorksPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero with direct-answer block */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Fantasy Intelligence · Methodology
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              How start/sit works.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Four scored inputs. Source-tier evidence requirements at each step. A WATCHLIST state when the data is genuinely unresolved.
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

        {/* Four-step pipeline */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                The four inputs
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                What the model actually scores.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                Each input has a minimum evidence-tier requirement. Inputs without qualifying evidence do not contribute a score — they contribute a WATCHLIST flag instead.
              </p>
            </div>
            <ol className="flex flex-col gap-4">
              {PIPELINE.map(({ step, name, source, body, rule }) => (
                <li key={step} className="border border-gray-800 bg-gray-900/60 p-6">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="font-mono text-sm text-cyan-300">{step}</span>
                    <h3 className="text-lg font-bold text-white">{name}</h3>
                    <span className="font-mono text-xs text-gray-500">{source}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{body}</p>
                  <p className="mt-3 border-l-2 border-cyan-800 pl-3 text-xs leading-6 text-cyan-200">
                    <span className="font-mono uppercase tracking-[0.14em] text-cyan-300">Rule:</span>{" "}
                    {rule}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Signal states */}
        <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
              Signal states
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              What each recommendation label means.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              Every start/sit output carries one of four states. WATCHLIST is not a hedge — it is an accurate description of the data situation.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {SIGNAL_STATES.map(({ state, color, meaning }) => (
                <div key={state} className="border border-gray-800 bg-gray-950/60 p-5">
                  <span className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] ${color}`}>
                    {state}
                  </span>
                  <p className="mt-3 text-sm leading-6 text-gray-300">{meaning}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cluster links */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }}
      />
    </div>
  );
}
