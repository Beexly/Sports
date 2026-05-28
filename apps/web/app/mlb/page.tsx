import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "MLB Picks Intelligence — Galaxy Sports Edge",
  description:
    "Galaxy evaluates MLB run lines, moneylines, and totals with starting pitcher data, bullpen usage, park factors, and weather. Analytical research — no claim of certain outcomes.",
  alternates: { canonical: "/mlb" },
  openGraph: {
    title: `MLB Picks Intelligence — ${BRAND_NAME}`,
    description:
      "Galaxy evaluates MLB run lines, moneylines, and totals with starting pitcher data, bullpen usage, park factors, and weather. Analytical research — no claim of certain outcomes.",
  },
};

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "MLB Picks Intelligence — Galaxy Sports Edge",
  description:
    "An analytical research layer that scores every MLB game across starting pitcher quality, bullpen usage, park factors, and pre-game weather data.",
  url: "https://galaxysportsedge.com/mlb",
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const MLB_FACTORS = [
  {
    id: "starting-pitcher",
    label: "Starting pitcher",
    body: "ERA, WHIP, and recent form are weighted by park and opposing lineup. Pitcher changes void Galaxy's scoring entirely — freshness gates catch this before a stale pick reaches the board.",
  },
  {
    id: "bullpen-depth",
    label: "Bullpen depth",
    body: "High-leverage bullpen usage in recent days affects late-game reliability. A closer or primary setup man used in back-to-back games is scored as a depth reduction — a factor that market prices often lag on.",
  },
  {
    id: "park-factors",
    label: "Park factors",
    body: "Run-scoring environments differ significantly across MLB stadiums. Coors Field and Petco Park represent opposite ends of the spectrum. Galaxy applies park-adjusted scoring to all run line and total markets.",
  },
  {
    id: "weather",
    label: "Weather",
    body: "Wind speed, direction, and temperature are statistically significant for totals. Galaxy monitors pre-game weather data as a real-time input — the pick is held if weather conditions are still unsettled.",
  },
] as const;

const COVERAGE_ITEMS = [
  "Regular season",
  "Playoffs",
  "World Series",
  "Trade deadline signals",
] as const;

const RESEARCH_LINKS = [
  { href: "/vault", label: "Evidence Vault" },
  { href: "/intelligence/line-movement", label: "Line movement explained" },
  { href: "/methodology", label: "Methodology" },
] as const;

export default function MlbIntelligencePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Major League Baseball · Research Layer
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              MLB Intelligence
            </h1>
            <p className="mt-5 max-w-3xl text-xl font-semibold leading-8 text-gray-200">
              MLB totals are the most weather-sensitive, pitcher-dependent
              market in professional sports.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-gray-400">
              Galaxy scores starting pitcher quality, bullpen usage, park
              factors, and weather indicators before publishing any total or run
              line. All four inputs must clear freshness gates before a pick
              reaches the board.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-gray-500">
              Model-supported insights. Transparent confidence. No predicted outcome is certain.
            </p>
          </div>
        </section>

        {/* ── MLB-specific factors ── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Scoring inputs
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                MLB-specific factors Galaxy scores.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                These four inputs are applied on top of the cross-sport baseline
                factors. In MLB, pitcher and weather data carry outsized weight
                relative to other markets — the model reflects this.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {MLB_FACTORS.map(({ id, label, body }) => (
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
              What Galaxy covers in MLB.
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
              MLB betting involves significant financial risk. Past model
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
