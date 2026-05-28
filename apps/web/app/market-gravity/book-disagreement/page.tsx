import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Book Disagreement in Sports Markets — What Divergence Between Sportsbooks Means",
  description:
    "What it means when sportsbooks price the same market differently: why disagreement happens, what high vs. low disagreement signals, and how Galaxy Sports Edge uses it as one of four Market Gravity inputs.",
  alternates: { canonical: "/market-gravity/book-disagreement" },
  openGraph: {
    title: `Book Disagreement — ${BRAND_NAME} Market Gravity`,
    description:
      "High book disagreement after a rapid move often signals new information hitting the market unevenly. Here is how to read the variance.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Book Disagreement — What Divergence Between Sportsbooks Means",
  description:
    "Why sportsbooks price the same market differently, what high vs. low disagreement signals, and how it is used as a Market Gravity input.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "What does book disagreement mean in sports markets?",
  answer:
    "Book disagreement is the variance in current pricing for the same market across tracked sportsbooks. When books are in close agreement (low variance), the market has reached a consensus — all books have seen similar action and reached similar conclusions. When books diverge significantly (high variance after a rapid move), it often means new information hit some books before others, or that different books are seeing different action profiles. High disagreement immediately after a rapid movement is one of the more informative Market Gravity signals.",
  attribution: "Galaxy Sports Edge Market Gravity methodology",
  confidence: "HIGH — derived from licensed multi-book odds data (Tier 2)",
};

const SCENARIOS = [
  {
    scenario: "Low disagreement, steady movement",
    signal: "CONSENSUS",
    color: "border-emerald-700 bg-emerald-950/20",
    badge: "text-emerald-300 border-emerald-700",
    meaning: "Books are moving in the same direction at a similar pace. Typical pattern for injury news that all books received simultaneously. The movement carries the most weight in this configuration.",
  },
  {
    scenario: "High disagreement after rapid movement",
    signal: "UNEVEN INFO",
    color: "border-cyan-700 bg-cyan-950/20",
    badge: "text-ion-blue border-cyan-700",
    meaning: "A fast move hit some books first. The outlier books either have different exposure or have not yet received the same information. Often resolves to consensus within 1–2 hours. Watching resolution direction is more informative than the initial snapshot.",
  },
  {
    scenario: "High disagreement, no clear movement direction",
    signal: "VOLATILE",
    color: "border-yellow-700 bg-yellow-950/20",
    badge: "text-yellow-300 border-yellow-700",
    meaning: "Books are pricing materially differently with no clear consensus direction. This can indicate a market that is genuinely uncertain, or one where different books are seeing very different action profiles. Galaxy Sports Edge surfaces these with a VOLATILE flag rather than a directional signal.",
  },
  {
    scenario: "One outlier book, rest in agreement",
    signal: "STALE OUTLIER",
    color: "border-mineral bg-gray-900/20",
    badge: "text-gray-400 border-gray-600",
    meaning: "A single book is significantly off consensus. Most often this means the outlier has not yet updated its line — it is stale, not more informed. If the outlier has high betting volume and still differs, it warrants attention; if it is a low-volume book, it is likely slow.",
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/market-gravity", label: "Market Gravity — the live surface" },
  { href: "/market-gravity/how-it-works", label: "How Market Gravity Works — four scored inputs" },
  { href: "/market-gravity/line-movement", label: "Line Movement — causes and informativeness" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — how multi-book data is tiered" },
  { href: "/methodology", label: "Methodology — how Market Gravity feeds picks" },
];

export default function BookDisagreementPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Market Gravity · Book Disagreement</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Book disagreement.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              When sportsbooks price the same market differently — what it means and how to read the variance.
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
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Four patterns</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">How to read disagreement.</h2>
            </div>
            <div className="flex flex-col gap-5">
              {SCENARIOS.map(({ scenario, signal, color, badge, meaning }) => (
                <div key={scenario} className={`border p-6 ${color}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-bold text-white">{scenario}</h3>
                    <span className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] ${badge}`}>
                      {signal}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{meaning}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
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
