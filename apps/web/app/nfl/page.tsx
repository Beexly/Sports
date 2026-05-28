import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "NFL Picks Intelligence — Galaxy Sports Edge",
  description:
    "Galaxy's NFL scoring engine evaluates spread, moneyline, and total markets using 10+ deterministic factors: line movement, schedule density, rest, ATS form, and data quality. Research tool — not outcome guarantees.",
  alternates: { canonical: "/nfl" },
  openGraph: {
    title: `NFL Picks Intelligence — ${BRAND_NAME}`,
    description:
      "Galaxy's NFL scoring engine evaluates spread, moneyline, and total markets using 10+ deterministic factors. Research tool — not outcome guarantees.",
  },
};

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "NFL Picks Intelligence — Galaxy Sports Edge",
  description:
    "An analytical research layer that scores every NFL game across 10+ deterministic factors including line movement, schedule density, rest, ATS form, and data quality.",
  url: "https://galaxysportsedge.com/nfl",
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const NFL_FACTORS = [
  {
    id: "schedule-rest",
    label: "Schedule density / Rest",
    body: "NFL rest advantages are statistically significant. Short-week teams and back-to-back scheduling patterns are scored directly as contextual inputs — the model does not treat all games as equivalent effort.",
  },
  {
    id: "line-movement",
    label: "Line movement",
    body: "NFL lines move fast and reflect sharp money quickly. Galaxy tracks velocity, direction, and uniformity across tracked books. Fast, uniform, multi-book movement is weighted differently than slow or scattered movement.",
  },
  {
    id: "ats-form",
    label: "ATS form",
    body: "Against-the-spread tendencies by team and situation. Recent and situationally relevant games are weighted more heavily than older results in the same calendar year.",
  },
  {
    id: "market-depth",
    label: "Market depth",
    body: "How many books are active and aligned on a number. Low-depth lines carry more structural uncertainty and are scored conservatively. Signals in deep markets carry more weight than shallow ones.",
  },
] as const;

const COVERAGE_ITEMS = [
  "Regular season",
  "Playoffs",
  "Super Bowl",
  "Draft impact on futures",
] as const;

const RESEARCH_LINKS = [
  { href: "/picks/how-picks-are-scored", label: "How picks are scored" },
  { href: "/intelligence/line-movement", label: "Line movement explained" },
  { href: "/methodology", label: "Methodology" },
] as const;

export default function NflIntelligencePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              National Football League · Research Layer
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              NFL Intelligence
            </h1>
            <p className="mt-5 max-w-3xl text-xl font-semibold leading-8 text-gray-200">
              The NFL market is the most analyzed in sports. Finding edge
              requires going where the public isn't.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-gray-400">
              Galaxy scores every NFL game on 10+ factors. Published picks have
              cleared a freshness gate, confidence threshold, and factor review.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-gray-500">
              Model-supported insights. Transparent confidence. No predicted outcome is certain.
            </p>
          </div>
        </section>

        {/* ── NFL-specific factors ── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Scoring inputs
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                NFL-specific factors Galaxy scores.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                These four inputs are applied on top of the cross-sport baseline
                factors. Each one is deterministic — sourced from real data, not
                editorial judgment.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {NFL_FACTORS.map(({ id, label, body }) => (
                <div
                  key={id}
                  className="border border-mineral bg-gray-900/60 p-6"
                >
                  <h3 className="text-base font-bold text-white">{label}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Coverage grid ── */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Coverage
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              What Galaxy covers in the NFL.
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              {COVERAGE_ITEMS.map((item) => (
                <span
                  key={item}
                  className="border border-mineral bg-carbon/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-gray-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Research links ── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Research
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Understand the model.
            </h2>
            <ul className="mt-6 flex flex-col gap-2">
              {RESEARCH_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block border border-mineral bg-carbon/60 px-4 py-3 text-sm text-gray-200 hover:border-cyan-700 hover:text-ion-blue"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <section className="border-t border-mineral bg-gray-900/35 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Disclaimer
            </p>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              NFL betting involves significant financial risk. Past model
              performance does not guarantee future results. {BRAND_NAME} is an
              analytical research tool, not a sportsbook. Research responsibly.
            </p>
            <div className="mt-4">
              <RiskDisclosure variant="card" includePastPerformance={true} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_LD) }}
      />
    </div>
  );
}
