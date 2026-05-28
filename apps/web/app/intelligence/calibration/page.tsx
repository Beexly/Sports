import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Calibration Report — ${BRAND_NAME}`,
  description:
    "What calibration means, how the 30-settled-pick gate works, and why the Calibration Report stays gated until the number is defensible. No fabricated win-rates.",
  alternates: { canonical: "/intelligence/calibration" },
  openGraph: {
    title: `Calibration Report — ${BRAND_NAME}`,
    description:
      "The calibration gate: why a public win-rate stays hidden until 30+ settled signals per model version exist to back it.",
  },
};

const CALIBRATION_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Calibration Report — How the Gate Works",
  description:
    "What calibration means at Galaxy Sports Edge: the 30-settled-pick gate, how confidence scores are evaluated post-settlement, and why the report stays locked until the number is statistically defensible.",
  url: "https://galaxysportsedge.com/intelligence/calibration",
  dateModified: "2026-05-28",
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://galaxysportsedge.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Intelligence",
        item: "https://galaxysportsedge.com/intelligence",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Calibration",
        item: "https://galaxysportsedge.com/intelligence/calibration",
      },
    ],
  },
} as const;

const GATE_RULES = [
  {
    number: "01",
    title: "30 settled picks per model version",
    body: "The minimum sample before any public accuracy number is published. Below 30, variance dominates. A 70% win-rate on 10 picks is statistically meaningless — the confidence interval spans the entire 0–100 range.",
  },
  {
    number: "02",
    title: "Settlement lag enforced",
    body: "A pick isn't settled until the game result is official and the margin is confirmed. Pushes and voids are excluded from win-rate calculations. A pick cannot be counted until at least 24 hours post-game.",
  },
  {
    number: "03",
    title: "Model version isolation",
    body: "Every time the scoring model changes materially, the counter resets to zero for that version. A 65% accuracy rate from version 1.0 cannot be applied to version 2.0. Each version earns its own number from scratch.",
  },
  {
    number: "04",
    title: "Confidence band accuracy tracked separately",
    body: "High-confidence picks (80–100) are tracked separately from Moderate-confidence picks (50–64). A blended win-rate that mixes calibration bands can hide that the high-confidence picks are under-performing. The report shows each band separately.",
  },
] as const;

const CALIBRATION_CONCEPTS = [
  {
    term: "Calibration",
    definition:
      "A model is well-calibrated when its confidence scores match real-world frequencies. A pick scored at 70% confidence should win approximately 70 times out of 100. Calibration is measured by comparing predicted confidence to observed win rates across settled picks.",
  },
  {
    term: "Brier Score",
    definition:
      "The mean squared error between predicted probabilities and actual outcomes. A Brier score of 0 is perfect; 0.25 is equivalent to random chance. Lower is better. This is the primary calibration metric tracked internally.",
  },
  {
    term: "Confidence Band",
    definition:
      "Four bands group picks by confidence level: High (80–100), Strong (65–79), Moderate (50–64), Exploratory (40–49). The Calibration Report shows accuracy by band, not just overall — so over-confident or under-confident ranges are visible.",
  },
  {
    term: "Model Version",
    definition:
      "A tagged release of the scoring logic. Version numbers increment when factor weights, gate thresholds, or source tier logic change materially. Each version starts a fresh calibration counter so historical accuracy never bleeds into a new model's record.",
  },
] as const;

export default function CalibrationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Intelligence · Calibration</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              The Calibration Report is gated — here&apos;s why.
            </h1>
            <p className="mt-5 text-lg text-ink-300">
              Publishing a win-rate before the sample size is defensible is how
              tout services work. {BRAND_NAME} holds the Calibration Report
              behind a gate until the number means something.
            </p>
          </div>
        </section>

        {/* Direct-answer block */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="surface-lifted rounded-2xl p-6 sm:p-8">
              <p className="eyebrow">Direct answer</p>
              <p className="mt-3 font-display text-xl font-semibold text-white">
                The Calibration Report unlocks when 30 settled picks have been
                logged for the current model version.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                Until that gate clears, no accuracy number is published — not
                even internally. Every pick logged after that threshold
                contributes to a rolling confidence-band accuracy table. The
                report is updated on settlement, not on a fixed schedule.
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  href="/picks/confidence-scores"
                  className="btn btn-primary text-sm"
                >
                  How confidence scores work →
                </Link>
                <Link
                  href="/performance"
                  className="btn btn-ghost text-sm"
                >
                  Performance page
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Gate rules */}
        <section className="border-t border-ink-800/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Gate rules</p>
            <h2 className="mt-3 font-display text-display-lg text-white">
              Four conditions that must hold before the report opens.
            </h2>
            <ol className="mt-8 flex flex-col gap-4">
              {GATE_RULES.map((rule) => (
                <li
                  key={rule.number}
                  className="surface-card flex gap-4 p-6"
                >
                  <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-700 font-mono text-sm font-bold text-accent-300">
                    {rule.number}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">
                      {rule.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-300">
                      {rule.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Concepts */}
        <section className="border-t border-ink-800/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Calibration concepts</p>
            <h2 className="mt-3 font-display text-display-lg text-white">
              Terms used in the Calibration Report.
            </h2>
            <dl className="mt-8 flex flex-col gap-4">
              {CALIBRATION_CONCEPTS.map((item) => (
                <div
                  key={item.term}
                  className="surface-card p-5"
                >
                  <dt className="font-display text-base font-semibold text-white">
                    {item.term}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink-300">
                    {item.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Cluster links */}
        <section className="border-t border-ink-800/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Related</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { href: "/picks/confidence-scores", label: "Confidence scores" },
                { href: "/picks/how-picks-are-scored", label: "How picks are scored" },
                { href: "/intelligence/how-it-works", label: "Intelligence pipeline" },
                { href: "/intelligence/source-hierarchy", label: "Source hierarchy" },
                { href: "/performance", label: "Performance (gated)" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-300 transition-colors hover:border-accent-700 hover:text-accent-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Last updated: 2026-05-28 · Calibration methodology canon
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(CALIBRATION_LD) }}
      />
    </div>
  );
}
