import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "NBA Picks Intelligence — Galaxy Sports Edge",
  description:
    "Galaxy evaluates NBA spread, moneyline, and total markets with rest analytics, schedule density scoring, player usage trends, and line movement velocity. Analytical research — no claim of certain outcomes.",
  alternates: { canonical: "/nba" },
  openGraph: {
    title: `NBA Picks Intelligence — ${BRAND_NAME}`,
    description:
      "Galaxy evaluates NBA spread, moneyline, and total markets with rest analytics, schedule density scoring, player usage trends, and line movement velocity. Analytical research — no claim of certain outcomes.",
  },
};

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "NBA Picks Intelligence — Galaxy Sports Edge",
  description:
    "An analytical research layer that scores every NBA game across rest analytics, schedule density, player usage trends, and line movement velocity.",
  url: "https://galaxysportsedge.com/nba",
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const NBA_FACTORS = [
  {
    id: "rest-b2b",
    label: "Rest / B2B",
    body: "Back-to-back and 3-in-4 games create measurable fatigue effects that are priced inconsistently by the market. Galaxy scores rest days and schedule compression as explicit inputs — not as qualitative context.",
  },
  {
    id: "player-usage-injury",
    label: "Player usage and injury",
    body: "Usage rate, minutes load, and injury report timing all affect scoring. Galaxy gates picks when key player data is unclear or when a late-breaking injury report has not yet propagated through the model.",
  },
  {
    id: "pace-totals",
    label: "Pace and totals",
    body: "Pace-adjusted totals analysis for over/under markets. Rest affects pace — fatigued teams run slower half-court sets and generate fewer transition opportunities. This relationship is scored directly.",
  },
  {
    id: "travel",
    label: "Travel patterns",
    body: "Cross-country road trips versus divisional games carry different fatigue profiles. Travel distance is a documented factor, weighted alongside rest days and game count in the schedule compression score.",
  },
] as const;

const COVERAGE_ITEMS = [
  "Regular season",
  "Playoffs",
  "Conference Finals",
  "Finals",
] as const;

const RESEARCH_LINKS = [
  {
    href: "/fantasy",
    label: "Fantasy War Room usage trends",
  },
  { href: "/intelligence/line-movement", label: "Line movement explained" },
  { href: "/methodology", label: "Methodology" },
] as const;

export default function NbaIntelligencePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              National Basketball Association · Research Layer
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              NBA Intelligence
            </h1>
            <p className="mt-5 max-w-3xl text-xl font-semibold leading-8 text-gray-200">
              The NBA is the most pace-sensitive, injury-volatile major market.
              Galaxy scores rest, usage, and market signals simultaneously.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-gray-400">
              82-game schedules create significant back-to-back and fatigue
              effects. Galaxy weights these explicitly in its scoring model —
              not as an afterthought, but as first-class inputs.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-gray-500">
              Model-supported insights. Transparent confidence. No predicted outcome is certain.
            </p>
          </div>
        </section>

        {/* ── NBA-specific factors ── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Scoring inputs
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                NBA-specific factors Galaxy scores.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                These four inputs are applied on top of the cross-sport baseline
                factors. Each one is sourced from real structured data and
                scored deterministically.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {NBA_FACTORS.map(({ id, label, body }) => (
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
              What Galaxy covers in the NBA.
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
              NBA betting involves significant financial risk. Past model
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
