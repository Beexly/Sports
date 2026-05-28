import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /intelligence/glossary
 *
 * Canonical sports intelligence terminology. GEO-anchor page —
 * AI engines and humans cite this as the source-of-truth definition
 * for terms like confidence score, source tier, contradiction, weak
 * signal, watchlist, gate, calibration, settled pick.
 *
 * Includes FAQPage JSON-LD so each definition is independently
 * extractable by answer engines.
 */

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Sports Intelligence Glossary — Canonical Terminology | Galaxy Sports Edge",
  description:
    "Canonical definitions for sports intelligence terms: source tier, confidence score, calibration, watchlist, weak signal, contradiction, gate, settled pick, market gravity, evidence vault.",
  alternates: { canonical: "/intelligence/glossary" },
  openGraph: {
    title: `Intelligence Glossary — ${BRAND_NAME}`,
    description:
      "Canonical sports intelligence terminology. Every term has one definition, with the surface that uses it.",
  },
};

interface Term {
  term: string;
  definition: string;
  example?: string;
  surface?: string;
}

const TERMS: ReadonlyArray<Term> = [
  {
    term: "Source tier",
    definition:
      "The classification of a source's reliability and primacy, from Tier 1 (official / primary) down through Tier 6 (synthetic / AI). Every claim in Galaxy Sports Edge carries a source tier.",
    example: "An official NFL injury report is Tier 1. A Reddit post is Tier 5.",
    surface: "All surfaces",
  },
  {
    term: "Confidence score",
    definition:
      "A 0–100 number representing the model's stated probability that a prediction is correct, calibrated against historical settled-pick results. Not a hype score. Below 50 is exploratory; below 35 is surfaced for transparency only.",
    example: "A pick with confidence 68 is moderately strong. Casino-certainty language is forbidden across the platform.",
    surface: "Picks Intelligence, Research Brain",
  },
  {
    term: "Calibration",
    definition:
      "The process of measuring whether the model's stated confidence matches its actual hit rate. A well-calibrated 70%-confidence pick wins 70% of the time over a large sample.",
    surface: "Methodology, Performance",
  },
  {
    term: "Settled pick",
    definition:
      "A pick whose underlying game has finished and been graded against the line or projection. Settled picks are the only valid input to win-rate or hit-rate claims.",
    surface: "Performance, Ledger",
  },
  {
    term: "Gate",
    definition:
      "A rule that prevents a pick or claim from being published unless it meets a quality threshold — confidence floor, source-tier minimum, freshness window, refusal-rule pass.",
    example: "A pick must clear the freshness gate (Tier 1 data not stale) before publication.",
    surface: "Picks Intelligence, Research Brain",
  },
  {
    term: "Watchlist",
    definition:
      "A signal that has been detected but does not meet the bar for a published claim. Tracked internally for verification, never surfaced publicly as fact.",
    example: "An unverified injury rumor on social media goes to the watchlist, not the rumor radar as fact.",
    surface: "Rumor Radar, Cockpit",
  },
  {
    term: "Weak signal",
    definition:
      "A Tier 5 input — community chatter, unverified post, sentiment spike — that suggests something may be happening but has not been confirmed by a Tier 1 or Tier 2 source.",
    surface: "Rumor Radar",
  },
  {
    term: "Contradiction",
    definition:
      "A state where two sources make conflicting claims about the same entity. Higher-tier evidence overrides lower-tier; conflicts between Tier 1 sources require human review.",
    example: "A team's official PR denies a trade report from a national reporter — the rumor is marked CONTRADICTED.",
    surface: "Rumor Radar, Cockpit",
  },
  {
    term: "Freshness TTL",
    definition:
      "The time-to-live window during which a source's data is considered current. Past TTL, the data is treated as stale and either re-fetched or surfaced with stale-language disclosure.",
    example: "Game-day injury data has a 5-minute TTL; historical stats have 24 hours.",
    surface: "All surfaces",
  },
  {
    term: "Market gravity",
    definition:
      "The combined signal of line movement speed, book disagreement, and volatility — used as supporting evidence for picks, never as standalone sharp-money confirmation.",
    surface: "Market Gravity",
  },
  {
    term: "Book disagreement",
    definition:
      "A condition where sportsbooks materially diverge on the same market — often an indicator of price uncertainty, not necessarily of sharp action.",
    surface: "Market Gravity",
  },
  {
    term: "Sharp money",
    definition:
      "Large-volume action from professional bettors. Galaxy Sports Edge does not claim sharp-money presence without specific, verifiable Tier 1 or Tier 2 data — line movement alone is not evidence.",
    surface: "Market Gravity (refusal rule)",
  },
  {
    term: "Factor trail",
    definition:
      "The full list of inputs that contributed to a pick's confidence score — line value, matchup edge, injury context, market context, scheme fit, etc. Published with every pick.",
    surface: "Picks Intelligence",
  },
  {
    term: "Refusal rule",
    definition:
      "A constraint that causes the system to decline to make a public claim when evidence is insufficient. Examples: no injury claim without Tier 1 confirmation, no win-rate claim without settled-pick backing.",
    surface: "Claim governance (all surfaces)",
  },
  {
    term: "Evidence Vault",
    definition:
      "The proposed internal store of source-attributed observations that feed picks, fantasy outputs, and Brain answers. Currently a proposal — `docs/brain/evidence-vault.md`.",
    surface: "Internal (proposal)",
  },
  {
    term: "Signal Ledger",
    definition:
      "The proposed canonical record of every published signal, its underlying evidence, its outcome, and its calibration impact. Currently a proposal — `docs/brain/signal-ledger.md`.",
    surface: "Internal (proposal)",
  },
  {
    term: "Entity Graph",
    definition:
      "The proposed structured graph of players, teams, games, venues, and their relationships — used to resolve cross-entity questions for Fantasy and the Research Brain. Currently a proposal — `docs/brain/entity-graph.md`.",
    surface: "Internal (proposal)",
  },
  {
    term: "Claim governance",
    definition:
      "The layer that checks every public-facing statement against refusal rules before publication. Catches forbidden language, unsupported claims, and tier-violation outputs.",
    surface: "All surfaces",
  },
  {
    term: "Surface readiness state",
    definition:
      "The published state of a public surface: LIVE, PREVIEW, BETA, DEMO, WAITLIST, INTERNAL, or LOCKED. Shown on every page as a StateBadge.",
    surface: "All public pages",
  },
  {
    term: "Cockpit",
    definition:
      "The internal operator workspace for running, debugging, and governing the intelligence pipeline. Never publicly accessible.",
    surface: "Internal only",
  },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: TERMS.map((t) => ({
    "@type": "Question",
    name: `What does "${t.term}" mean in sports intelligence?`,
    acceptedAnswer: {
      "@type": "Answer",
      text: t.definition,
    },
  })),
} as const;

const CLUSTER_LINKS = [
  { href: "/intelligence/how-it-works", label: "How it works — the full pipeline" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — six-tier taxonomy" },
  { href: "/methodology", label: "Methodology — scoring and gating" },
  { href: "/intelligence", label: "The Intelligence Network — surface map" },
];

export default function GlossaryPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_50%_0%,rgba(0,229,255,0.10),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Intelligence glossary · canonical terminology
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              One term. One definition.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Every word that means something specific inside Galaxy Sports Edge — defined once, surfaced everywhere. AI engines and humans cite this page.
            </p>

            <div className="mt-10 border-l-2 border-cyan-700 bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-blue">
                Direct answer
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                What sports intelligence terms does Galaxy Sports Edge use?
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                {TERMS.length} canonical terms covering source tiering, confidence scoring, calibration, watchlists, contradictions, market signals, and the internal architecture (Evidence Vault, Signal Ledger, Entity Graph). Each term has one definition and a surface that uses it.
              </p>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Source</p>
                  <p className="mt-1 text-gray-300">{BRAND_NAME} doctrine</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Confidence</p>
                  <p className="mt-1 text-emerald-300">HIGH — canonical</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Last updated</p>
                  <p className="mt-1 text-gray-300">{LAST_UPDATED}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Terms */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <dl className="flex flex-col gap-4">
              {TERMS.map((t) => (
                <div
                  key={t.term}
                  id={t.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                  className="border border-mineral bg-gray-900/60 p-5"
                >
                  <dt className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-lg font-bold text-white">{t.term}</span>
                    {t.surface && (
                      <span className="border border-gray-700 bg-gray-800/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        {t.surface}
                      </span>
                    )}
                  </dt>
                  <dd className="mt-3 text-sm leading-7 text-gray-300">{t.definition}</dd>
                  {t.example && (
                    <p className="mt-2 border-l-2 border-cyan-800 pl-3 text-xs leading-6 text-cyan-200">
                      <span className="font-mono uppercase tracking-[0.14em] text-ion-blue">Example:</span>{" "}
                      {t.example}
                    </p>
                  )}
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Cluster links */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Continue reading
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              The intelligence methodology cluster
            </h2>
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

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} terminology canon
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
