import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /market-gravity/how-it-works
 *
 * GEO-anchor page. Explains the Market Gravity methodology:
 * what line movement means, how it is measured, and what makes
 * a signal actionable vs. noise. TechArticle JSON-LD.
 */

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "How Market Gravity Works — Line Movement Intelligence | Galaxy Sports Edge",
  description:
    "What Market Gravity measures: opening-to-current price movement, movement speed, book disagreement, and market depth — and why most line movement is noise, not signal.",
  alternates: { canonical: "/market-gravity/how-it-works" },
  openGraph: {
    title: `How Market Gravity Works — ${BRAND_NAME}`,
    description:
      "Four inputs (movement size, speed, book disagreement, market depth), why most line movement is noise, and what makes a Market Gravity signal actionable.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How Market Gravity Works — Galaxy Sports Edge",
  description:
    "Market Gravity methodology: four scored inputs (movement size, speed, book disagreement, market depth) and the distinction between informative and noisy line movement.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "How does Galaxy Sports Edge measure market gravity?",
  answer:
    "Market Gravity scores four inputs for every active market: the size of the opening-to-current price movement, the speed at which that movement happened relative to normal game-week pacing, the level of disagreement between sportsbooks (high disagreement often indicates new information hitting the market unevenly), and the market depth (how many books have priced this market). A large, fast, uniform movement across high-depth markets is informative. A large movement in a low-depth market with high book disagreement is potentially volatile and flagged differently.",
  attribution: "Galaxy Sports Edge Market Gravity methodology",
  confidence: "HIGH — methodology derived from licensed odds data (Tier 2) with platform-wide claim-governance constraints",
};

const INPUTS = [
  {
    step: "01",
    name: "Movement size",
    source: "Tier 2 (Licensed odds data)",
    body: "The difference between the opening line and the current consensus price. A 2-point movement on a spread is materially different from a 0.5-point movement — the absolute size matters, but it is interpreted in the context of the other three inputs.",
    rule: "Movement size alone is never sufficient to label a signal actionable. A large movement in a thin market is not the same as a large movement in a deep one.",
  },
  {
    step: "02",
    name: "Movement speed",
    source: "Tier 2 (Licensed odds data, timestamped)",
    body: "How quickly the movement occurred relative to normal game-week pricing cadence. A 1.5-point movement in 20 minutes at 9 AM on a Tuesday is anomalous — the market is usually stable then. The same movement over 48 hours into the weekend is typical public money loading. Speed contextualizes whether the movement is reactive (news, injury) or gradual (public flow).",
    rule: "Movement speed requires timestamped odds data. Any movement speed claim must cite a specific time window.",
  },
  {
    step: "03",
    name: "Book disagreement",
    source: "Tier 2 (Multi-book consensus)",
    body: "The variance in current price across the tracked sportsbooks. When 11 of 12 books have moved to -5.5 and one is still at -4.5, the outlier book is either slow to update or sees different action. High disagreement can mean new information hitting the market unevenly — some books have exposure the others do not yet.",
    rule: "Book disagreement is measured as a variance metric, not a subjective judgment. No sharp-money assertion is made without specific market evidence.",
  },
  {
    step: "04",
    name: "Market depth",
    source: "Tier 2 (Licensed odds data)",
    body: "The number of books that have priced this market. A signal in a 12-book market carries more weight than the same signal in a 3-book market. Low-depth markets are more susceptible to manipulation and single-book outliers. Depth is used as a weighting factor, not a binary gate.",
    rule: "Markets with fewer than 4 books are marked as shallow and surfaced with a caveat.",
  },
] as const;

const NOISE_VS_SIGNAL = [
  {
    label: "Informative movement",
    color: "border-emerald-700 bg-emerald-950/20",
    badge: "text-emerald-300 border-emerald-700",
    items: [
      "Large, fast, uniform movement across 8+ books",
      "Timing correlated with an injury report or lineup change",
      "Low book disagreement after movement settles",
      "Market depth of 10+ books",
    ],
  },
  {
    label: "Noisy movement",
    color: "border-yellow-700 bg-yellow-950/20",
    badge: "text-yellow-300 border-yellow-700",
    items: [
      "Large movement in a shallow (3–5 book) market",
      "Slow movement over several days into the weekend (public loading)",
      "High book disagreement that has not resolved",
      "Movement timing coincides with a promotional offer or media coverage",
    ],
  },
  {
    label: "Volatile / caution",
    color: "border-red-800 bg-red-950/20",
    badge: "text-red-300 border-red-800",
    items: [
      "Rapid back-and-forth movement (market is unsettled)",
      "Opening line itself appears to be a hook (set to attract public money)",
      "Conflicting moves across books with no news catalyst",
      "Market reopened after a suspension",
    ],
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/market-gravity", label: "Market Gravity — the live surface" },
  { href: "/market-gravity/line-movement", label: "Line Movement Explained — spread, total, moneyline" },
  { href: "/market-gravity/book-disagreement", label: "Book Disagreement — what it means when books diverge" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — how odds data is tiered" },
  { href: "/methodology", label: "Methodology — how Market Gravity feeds picks" },
];

export default function MarketGravityHowItWorksPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Market Gravity · Methodology
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              How Market Gravity works.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Four scored inputs. Most line movement is noise. Here is how the model tells the difference.
            </p>

            <div className="mt-10 border-l-2 border-cyan-700 bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-blue">Direct answer</p>
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

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">The four inputs</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What the model measures.</h2>
            </div>
            <ol className="flex flex-col gap-4">
              {INPUTS.map(({ step, name, source, body, rule }) => (
                <li key={step} className="border border-mineral bg-gray-900/60 p-6">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="font-mono text-sm text-ion-blue">{step}</span>
                    <h3 className="text-lg font-bold text-white">{name}</h3>
                    <span className="font-mono text-xs text-gray-500">{source}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{body}</p>
                  <p className="mt-3 border-l-2 border-cyan-800 pl-3 text-xs leading-6 text-cyan-200">
                    <span className="font-mono uppercase tracking-[0.14em] text-ion-blue">Rule:</span>{" "}
                    {rule}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Signal classification</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Noise vs. signal vs. volatile.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              These are the pattern clusters the model uses to classify a movement. No single input determines the classification — all four are scored together.
            </p>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {NOISE_VS_SIGNAL.map(({ label, color, badge, items }) => (
                <div key={label} className={`border p-5 ${color}`}>
                  <span className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] ${badge}`}>
                    {label}
                  </span>
                  <ul className="mt-4 flex flex-col gap-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs leading-6 text-gray-300">
                        <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-gray-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Continue reading</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Market intelligence methodology cluster</h2>
            <ul className="mt-6 flex flex-col gap-2">
              {CLUSTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="block border border-mineral bg-carbon/60 px-4 py-3 text-sm text-gray-200 hover:border-cyan-700 hover:text-ion-blue">
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
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} Market Gravity methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />
    </div>
  );
}
