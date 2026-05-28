import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "How the Research Brain Works — Sports Intelligence Q&A | Galaxy Sports Edge",
  description:
    "How Galaxy Sports Edge Research Brain answers sports intelligence questions: structured claim lookup, evidence-vault sourcing, source-tier citations, and the rules that prevent fabrication.",
  alternates: { canonical: "/brain/how-brain-works" },
  openGraph: {
    title: `How the Research Brain Works — ${BRAND_NAME}`,
    description:
      "Structured Q&A backed by tiered evidence. The Brain cites source tiers, displays confidence, and refuses to answer when evidence is insufficient.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How the Research Brain Works — Sports Intelligence Q&A",
  description:
    "Architecture of the Galaxy Sports Edge Research Brain: claim lookup, evidence-vault sourcing, source-tier citations, and fabrication-prevention rules.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "How does the Galaxy Sports Edge Research Brain answer questions?",
  answer:
    "The Research Brain is a structured sports intelligence Q&A surface. It does not generate free-form answers from a general language model. Instead, it queries the Evidence Vault — a structured store of observed, tiered intelligence facts — and assembles a response from the evidence it finds. Every claim in a Brain response is linked to a source tier, a freshness timestamp, and a confidence indicator. When the Evidence Vault does not contain sufficient evidence to answer a question, the Brain surfaces a low-confidence or insufficient-evidence response rather than fabricating a plausible answer.",
  attribution: "Galaxy Sports Edge Research Brain methodology",
  confidence: "HIGH — published methodology, audited by trust-gate guardrails",
};

const PIPELINE_STEPS = [
  {
    step: "01",
    name: "Query parsing",
    description: "The Brain parses the user's question into a structured intent: entity (player, team, game), claim type (injury status, matchup rating, line movement, usage trend), and time window.",
    rule: "Ambiguous queries surface a disambiguation prompt rather than guessing intent. The Brain does not assume entities.",
  },
  {
    step: "02",
    name: "Evidence Vault lookup",
    description: "The parsed intent is used to query the Evidence Vault for matching evidence items. Items are filtered by entity, claim type, freshness (TTL), and public-safety flag. Only items with publicSafe=true are surfaced in Brain responses.",
    rule: "Evidence items past their TTL are not included in responses. Stale evidence does not fill the gap — the response reflects the absence instead.",
  },
  {
    step: "03",
    name: "Source-tier assembly",
    description: "Retrieved evidence items are ranked by source tier. The highest-tier evidence drives the primary claim; lower-tier items are shown as supporting or contradicting context.",
    rule: "No claim is stated as fact from Tier 5–6 sources. Tier 5–6 items are labeled as 'reported' or 'circulating' — not 'confirmed.'",
  },
  {
    step: "04",
    name: "Confidence scoring",
    description: "The response confidence is derived from the source-tier mix, freshness, and contradiction state. A response backed by fresh Tier 1 evidence receives HIGH confidence; a response backed only by Tier 4 sources receives MODERATE or SPECULATIVE.",
    rule: "Confidence is shown to the user for every Brain response. It is never omitted.",
  },
  {
    step: "05",
    name: "Claim governance check",
    description: "The assembled response is scanned by the claim governance layer before display. Any language matching the banned-phrase list (casino-certainty terms, fabricated win rates, unqualified guarantees) triggers suppression.",
    rule: "A response that fails the governance check is replaced with an insufficient-evidence response. The failure is logged for audit.",
  },
  {
    step: "06",
    name: "Surface and cite",
    description: "The validated response is displayed with source tier, freshness timestamp, and a direct link to the evidence item where available. Users can trace every Brain claim back to its source.",
    rule: "Brain responses never assert claims without displayed citations. 'Source: unknown' is not a valid citation — that item would not have reached this step.",
  },
];

const CLUSTER_LINKS = [
  { href: "/brain", label: "Research Brain — the live Q&A surface" },
  { href: "/brain/evidence-vault-explained", label: "Evidence Vault Explained — how intelligence facts are stored" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — the six-tier taxonomy" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/methodology", label: "Methodology — the full scoring guide" },
];

export default function BrainHowItWorksPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Research Brain · Methodology</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              How the Research Brain works.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Structured evidence lookup. Tiered citations. The Brain refuses to answer when evidence is insufficient — it does not fabricate.
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
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Six-step pipeline</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">From question to verified response.</h2>
            </div>
            <ol className="flex flex-col gap-4">
              {PIPELINE_STEPS.map(({ step, name, description, rule }) => (
                <li key={step} className="border border-mineral bg-gray-900/60 p-6">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="font-mono text-sm text-ion-blue">{step}</span>
                    <h3 className="text-lg font-bold text-white">{name}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{description}</p>
                  <p className="mt-3 border-l-2 border-cyan-800 pl-3 text-xs leading-6 text-cyan-200">
                    <span className="font-mono uppercase tracking-[0.14em] text-ion-blue">Rule:</span>{" "}
                    {rule}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Continue reading</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Research Brain methodology cluster</h2>
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
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} Research Brain methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />
    </div>
  );
}
