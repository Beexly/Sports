import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { StateBadge, type StateBadgeState } from "@/components/ui/state-badge";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /intelligence — The Sports OS Intelligence Network landing.
 *
 * One ecosystem. Six surfaces. Source-traceable end to end.
 *
 * Every Galaxy Sports Edge surface is part of one governed intelligence
 * network. This page is the visitor's map of that network. It exists
 * so a visitor never sees the product as a stack of disconnected
 * features — they see one system, and they leave knowing which
 * surface answers which question.
 */

export const metadata: Metadata = {
  title: "The Sports OS Intelligence Network — Galaxy Sports Edge",
  description:
    "One ecosystem. Six surfaces. Source-traceable end to end. Picks, Fantasy, Market Gravity, Research Brain, Rumor Radar, and Developer — mapped so you know which surface answers which question.",
  alternates: { canonical: "/intelligence" },
  openGraph: {
    title: `The Sports OS Intelligence Network — ${BRAND_NAME}`,
    description:
      "One governed sports intelligence ecosystem. Six surfaces. Source-traceable end to end.",
  },
};

interface NetworkSurface {
  name: string;
  href: string;
  state: StateBadgeState;
  stateLabel?: string;
  tagline: string;
  blurb: string;
  question: string;
  decision: string;
}

const NETWORK: ReadonlyArray<NetworkSurface> = [
  {
    name: "Picks Intelligence",
    href: "/board",
    state: "live",
    tagline: "Read the board. Score the math. Gate the slate.",
    blurb:
      "Deterministic scoring across 10+ market and matchup factors. Published picks ship with the full factor trail attached.",
    question: "Which games cleared the gate today, and why?",
    decision: "What to pay attention to right now.",
  },
  {
    name: "Fantasy Intelligence",
    href: "/fantasy",
    state: "preview",
    stateLabel: "Preview",
    tagline: "Role, usage, injury, matchup, scheme.",
    blurb:
      "Fantasy War Room: role clarity, usage direction, injury risk, matchup context, and scheme fit — separated and scored.",
    question: "Should I start this player, sit them, or watchlist?",
    decision: "Where to spend your fantasy decision time.",
  },
  {
    name: "Market Gravity",
    href: "/market-gravity",
    state: "preview",
    stateLabel: "Preview",
    tagline: "Line movement you can read.",
    blurb:
      "Opening vs. current price, movement speed, book disagreement, volatility — classified without sharp-money theater.",
    question: "Has the market moved, how fast, and do books agree?",
    decision: "Whether the line is stable or contested.",
  },
  {
    name: "Research Brain",
    href: "/brain",
    state: "beta",
    stateLabel: "Beta · Gated",
    tagline: "Sports intelligence that shows its work.",
    blurb:
      "Confidence-weighted, source-traceable answers with evidence, gaps, and refusal rules shown — not hidden.",
    question: "What does the evidence actually say, and how strong is it?",
    decision: "Whether a claim is supported, or still missing data.",
  },
  {
    name: "Rumor Radar",
    href: "/rumor-radar",
    state: "preview",
    stateLabel: "Preview",
    tagline: "Rumors separated from facts.",
    blurb:
      "Source-tiered weak-signal watchlist. Tier 1 official, Tier 2 beat-verified, Tier 3 national unverified, Tier 4 social chatter.",
    question: "Is this rumor confirmed, contradicted, or just chatter?",
    decision: "How much weight to give a developing story.",
  },
  {
    name: "Developer & API",
    href: "/developer",
    state: "waitlist",
    tagline: "Intelligence layer. Structured. Source-traceable.",
    blurb:
      "Programmatic access to the full ecosystem for approved partners — picks, market gravity, ledger, weak signals, brain queries.",
    question: "Can I build my product on this intelligence?",
    decision: "Where to integrate Galaxy Sports Edge as a data layer.",
  },
];

interface EvidenceTier {
  tier: string;
  label: string;
  example: string;
  weight: string;
  textColor: string;
}

const EVIDENCE_TIERS: ReadonlyArray<EvidenceTier> = [
  {
    tier: "Tier 1",
    label: "Official",
    example: "Team press release, official injury report, on-record manager comment",
    weight: "Highest evidence weight",
    textColor: "text-emerald-300",
  },
  {
    tier: "Tier 2",
    label: "Beat verified",
    example: "Credentialed beat reporter with direct access, on record",
    weight: "Strong evidence weight",
    textColor: "text-ion-blue",
  },
  {
    tier: "Tier 3",
    label: "National unverified",
    example: "National report without primary-source attribution",
    weight: "Requires Tier 1/2 confirmation",
    textColor: "text-yellow-300",
  },
  {
    tier: "Tier 4",
    label: "Social / chatter",
    example: "Social media, forums, podcasts without sourcing",
    weight: "Watchlist only — never published as fact",
    textColor: "text-red-300",
  },
];

const ROUTING: ReadonlyArray<readonly [string, string, string]> = [
  ["Which games are worth my attention tonight?", "Picks Intelligence", "/board"],
  ["Should I start, sit, or watchlist a fantasy player?", "Fantasy Intelligence", "/fantasy"],
  ["Why did this line move and do the books agree?", "Market Gravity", "/market-gravity"],
  ["Is this rumor real, contradicted, or just chatter?", "Rumor Radar", "/rumor-radar"],
  ["What does the evidence actually say about this question?", "Research Brain", "/brain"],
  ["How do I integrate this intelligence into my product?", "Developer & API", "/developer"],
  ["How does the model decide what to publish?", "Methodology", "/methodology"],
  ["How am I supposed to use this responsibly?", "Responsible Use", "/responsible-play"],
];

export default function IntelligencePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_20%_10%,rgba(0,229,255,0.12),transparent_38%),radial-gradient(circle_at_80%_30%,rgba(122,92,255,0.10),transparent_32%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">
              The Sports OS Intelligence Network
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              One ecosystem. Six surfaces.<br />
              <span className="text-ion-blue">Source-traceable end to end.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">
              Galaxy Sports Edge is not a stack of disconnected features.
              It is one governed intelligence network — picks, fantasy,
              market movement, research, weak signals, and a developer
              layer — sharing one source-tier framework and one
              public-claim standard.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              Every claim is traceable to its source tier. Every demo
              card is labeled. Every refusal rule is published. The
              moat is honesty.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/board"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                See today&apos;s board
              </Link>
              <Link
                href="/methodology"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                Read the methodology
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Network grid */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                  Six surfaces
                </p>
                <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  The intelligence network, mapped.
                </h2>
              </div>
              <p className="max-w-xs text-sm text-gray-500 sm:text-right">
                Each surface answers one question and feeds the others.
                State badges show what is live today, what is in preview,
                and what is on the waitlist.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {NETWORK.map((surface) => (
                <article
                  key={surface.name}
                  data-testid={`network-surface-${surface.name.toLowerCase().replace(/\W+/g, "-")}`}
                  className="flex h-full flex-col justify-between border border-mineral bg-gray-900/60 p-6 transition hover:border-cyan-700"
                >
                  <div>
                    <StateBadge state={surface.state} label={surface.stateLabel} />
                    <h3 className="mt-4 text-xl font-bold text-white">{surface.name}</h3>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-blue">
                      {surface.tagline}
                    </p>
                    <p className="mt-4 text-sm leading-6 text-gray-400">{surface.blurb}</p>
                    <div className="mt-5 border-l-2 border-cyan-800 pl-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
                        Question answered
                      </p>
                      <p className="mt-1 text-sm text-gray-300">{surface.question}</p>
                    </div>
                    <div className="mt-3 border-l-2 border-purple-800 pl-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
                        Decision supported
                      </p>
                      <p className="mt-1 text-sm text-gray-300">{surface.decision}</p>
                    </div>
                  </div>
                  <Link
                    href={surface.href}
                    className="mt-6 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
                  >
                    Open {surface.name} →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Evidence chain */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Evidence chain
              </p>
              <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                Every surface shares one source-tier framework.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                Raw inputs are labeled by source tier before they reach
                any pick, signal, or answer. A Tier 4 social rumor is
                never published alongside a Tier 1 official confirmation
                without clear separation — across the entire network.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {EVIDENCE_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  className="flex flex-col gap-3 border border-mineral bg-carbon/60 p-5 sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="sm:min-w-[160px]">
                    <p className={`font-mono text-sm font-bold ${tier.textColor}`}>
                      {tier.tier} — {tier.label}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{tier.example}</p>
                  </div>
                  <div className="sm:min-w-[220px] sm:text-right">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gray-500">
                      {tier.weight}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Routing table */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Which surface for which question
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Start with the question. End on the right surface.
              </h2>
            </div>

            <div className="overflow-hidden border border-mineral">
              {ROUTING.map(([question, surface, href], idx) => (
                <Link
                  key={question}
                  href={href}
                  className={`grid grid-cols-1 items-center gap-2 px-4 py-4 transition hover:bg-gray-900/60 sm:grid-cols-[1fr_auto_auto] sm:gap-6 ${
                    idx < ROUTING.length - 1 ? "border-b border-mineral" : ""
                  }`}
                >
                  <p className="text-sm text-gray-200">{question}</p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ion-blue">
                    {surface}
                  </p>
                  <span className="text-sm font-semibold text-cyan-200">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Refusal rules */}
        <section className="border-t border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Network-wide refusal rules
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                What the network will not say — on any surface.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                The same governance applies whether the surface is a
                pick card, a fantasy lean, a market signal, a brain
                answer, a rumor entry, or an API response.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-emerald-900 bg-emerald-950/20 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                  We publish
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-emerald-200">
                  <li>Confidence with sample size shown</li>
                  <li>Source tier on every signal</li>
                  <li>What changed since the last refresh</li>
                  <li>What data is missing</li>
                  <li>Settled outcomes, win and loss</li>
                </ul>
              </div>
              <div className="border border-red-900 bg-red-950/20 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red-300">
                  We never publish
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-red-200">
                  <li>Win-rate claims without settled-pick backing</li>
                  <li>Unverified rumor as confirmed news</li>
                  <li>Sharp-money claims without movement data</li>
                  <li>Injury status not confirmed by official source</li>
                  <li>Anything outside our source-tier framework</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Methodology cluster — GEO authority hub links */}
        <section className="border-t border-mineral px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Methodology cluster
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                The canon, in three pages.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                Stable URLs. Source-attributed. Updated with a visible timestamp on every page. Cite freely.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Link
                href="/intelligence/how-it-works"
                className="block border border-mineral bg-gray-900/60 p-5 hover:border-cyan-700"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-blue">
                  How it works
                </p>
                <h3 className="mt-2 text-lg font-bold text-white">The pipeline, end to end</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Six steps from raw signal to public-safe intelligence, with the rule governing each step.
                </p>
              </Link>
              <Link
                href="/intelligence/source-hierarchy"
                className="block border border-mineral bg-gray-900/60 p-5 hover:border-cyan-700"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-blue">
                  Source hierarchy
                </p>
                <h3 className="mt-2 text-lg font-bold text-white">Six tiers, declared on every claim</h3>
                <p className="mt-2 text-sm text-gray-400">
                  The canonical six-tier source taxonomy with TTL, public-safety, and citation rules per tier.
                </p>
              </Link>
              <Link
                href="/intelligence/glossary"
                className="block border border-mineral bg-gray-900/60 p-5 hover:border-cyan-700"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-blue">
                  Glossary
                </p>
                <h3 className="mt-2 text-lg font-bold text-white">One term, one definition</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Canonical sports intelligence terminology with FAQPage schema for AI-search extraction.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Start anywhere
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              The network is open. The methodology is published. The reasoning is attached.
            </h2>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                See pricing and plans
              </Link>
              <Link
                href="/methodology"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                Read the methodology
              </Link>
            </div>
            <RiskDisclosure variant="compact" className="mt-10 text-center" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
