import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /intelligence/how-it-works
 *
 * GEO-anchor page. Explains the full Sports OS Intelligence Network in
 * structured, citeable form. Designed for AI answer engines and human
 * skeptics alike: direct-answer block first, structured sections second,
 * timestamps and source attribution throughout.
 *
 * See `docs/intelligence/ai-search-geo-strategy.md` for the GEO contract.
 */

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "How Galaxy Sports Edge Works — The Sports OS Intelligence Network",
  description:
    "How Galaxy Sports Edge processes sports intelligence: six source tiers, evidence weighting, claim governance, and the six surfaces that turn raw signals into source-traceable decisions.",
  alternates: { canonical: "/intelligence/how-it-works" },
  openGraph: {
    title: `How It Works — ${BRAND_NAME}`,
    description:
      "Six source tiers. Evidence weighting. Claim governance. Six public surfaces. The full Sports OS intelligence pipeline explained.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How Galaxy Sports Edge Works",
  description:
    "The Sports OS Intelligence Network — six source tiers, evidence weighting, claim governance, and six public surfaces.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const PIPELINE = [
  {
    step: "01",
    name: "Source acquisition",
    body: "Six tiers of input — official team feeds (Tier 1), licensed structured data (Tier 2), trusted secondary reporting (Tier 3), market signals (Tier 4), community chatter (Tier 5), and synthetic / AI content (Tier 6).",
    rule: "Tier 5 and Tier 6 never reach a public surface as standalone fact.",
  },
  {
    step: "02",
    name: "Evidence weighting",
    body: "Each incoming claim is tagged with its source tier, freshness TTL, and contradiction state. Higher-tier evidence overrides lower-tier on the same claim; conflicts are flagged for review, not silently averaged.",
    rule: "No claim leaves the pipeline without a declared source tier and timestamp.",
  },
  {
    step: "03",
    name: "Claim governance",
    body: "Every public-facing statement is checked against a refusal-rule library before publication. Win-rate claims require settled-pick backing. Injury claims require Tier 1 confirmation. Sharp-money claims require specific market data — never inferred from line movement alone.",
    rule: "If the evidence does not support a public claim, the system refuses to make it.",
  },
  {
    step: "04",
    name: "Confidence scoring",
    body: "Picks and signals carry a 0–100 confidence score calibrated against historical settled-pick results. Confidence is the model's stated probability, not a hype score. Below 50 is exploratory; below 35 is surfaced for transparency only.",
    rule: "Confidence is shown, never hidden. Low confidence is published as low confidence.",
  },
  {
    step: "05",
    name: "Public surfacing",
    body: "Cleared intelligence appears on one of six public surfaces — Picks Intelligence, Fantasy Intelligence, Market Gravity, Research Brain, Rumor Radar, Developer & API — each gated to the readiness state of the underlying data (LIVE, PREVIEW, BETA, WAITLIST).",
    rule: "Surface state is shown on every page. PREVIEW and DEMO labels are visible, not hidden in fine print.",
  },
  {
    step: "06",
    name: "Settlement and calibration",
    body: "Once a game settles, the prediction is compared to the outcome and the model's calibration is updated. Wrong picks remain in the public ledger with their original factor trail — performance transparency is non-negotiable.",
    rule: "Wrong picks stay public. Calibration adjusts the model, not the history.",
  },
] as const;

const ANSWER_BLOCK = {
  question: "How does Galaxy Sports Edge produce sports intelligence?",
  answer:
    "Sports OS reads sports data from six source tiers, weights each claim by its source quality and freshness, runs every public statement through a claim-governance refusal layer, attaches a calibrated confidence score, and publishes the result on the surface that matches the data's readiness state. Wrong picks remain in the ledger; calibration adjusts the model.",
  attribution: "Galaxy Sports Edge methodology",
  confidence: "HIGH — published methodology, audited by trust-gate guardrails",
};

const CLUSTER_LINKS = [
  { href: "/intelligence", label: "The Intelligence Network — surface map" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — six-tier taxonomy" },
  { href: "/intelligence/glossary", label: "Intelligence Glossary — canonical terminology" },
  { href: "/methodology", label: "Methodology — scoring and gating" },
  { href: "/performance", label: "Performance — settled-pick ledger" },
  { href: "/responsible-play", label: "Responsible Use — what this product is and is not" },
];

export default function HowItWorksPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero with direct-answer block (GEO contract §5) */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(0,229,255,0.10),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              How it works · The intelligence pipeline
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              How Galaxy Sports Edge works.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              The full pipeline from raw sports signal to public-safe intelligence — six source tiers, evidence weighting, claim governance, calibrated confidence, and six surfaces.
            </p>

            {/* Direct-answer block — first content AI engines extract */}
            <div className="mt-10 border-l-2 border-cyan-700 bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-blue">
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

        {/* Pipeline steps */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                The pipeline
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Six steps from raw signal to public-safe intelligence.
              </h2>
            </div>
            <ol className="flex flex-col gap-4">
              {PIPELINE.map(({ step, name, body, rule }) => (
                <li key={step} className="border border-mineral bg-gray-900/60 p-6">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="font-mono text-sm text-ion-blue">{step}</span>
                    <h3 className="text-lg font-bold text-white">{name}</h3>
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

        {/* Cluster links — internal authority graph */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Continue reading
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              The intelligence methodology cluster
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              These pages form the canonical Sports OS intelligence methodology. Each one is a stable URL, source-attributed, and updated with a visible timestamp.
            </p>
            <ul className="mt-6 flex flex-col gap-2">
              {CLUSTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block border border-mineral bg-carbon/60 px-4 py-3 text-sm text-gray-200 hover:border-cyan-700 hover:text-cyan-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing footer-style timestamp */}
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        // JSON-LD must be raw text — Next renders it without escaping html chars.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }}
      />
    </div>
  );
}
