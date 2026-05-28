import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "How Rumor Radar Works — Weak-Signal Classification | Galaxy Sports Edge",
  description:
    "How Galaxy Sports Edge classifies and surfaces weak sports signals: what a rumor is, the five watchlist states, why unverified chatter is never published as fact, and how signals graduate to actionable.",
  alternates: { canonical: "/rumor-radar/how-it-works" },
  openGraph: {
    title: `How Rumor Radar Works — ${BRAND_NAME}`,
    description:
      "Five watchlist states. Unverified chatter is never published as fact. Here is how signals are classified, surfaced, and graduated.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How Rumor Radar Works — Weak-Signal Classification",
  description:
    "Classification methodology for unverified sports signals: five watchlist states, source-tier requirements for graduation, and why Rumor Radar signals are separated from picks.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "How does Galaxy Sports Edge classify and surface weak signals?",
  answer:
    "Rumor Radar is a watchlist, not a picks surface. It collects chatter, beat-reporter speculation, social volume spikes, and other weak signals and assigns each one a state: WATCHLIST (new, unverified), ELEVATED (volume is rising, no contradiction yet), CONTRADICTED (an official source has denied or contradicted it), STALE (not updated within TTL), or GRADUATED (confirmed by a Tier 1 or Tier 2 source and handed off to the picks scoring pipeline). Signals never move from Rumor Radar to published picks without passing through the source-tier verification gate. Unverified signals are never labeled as fact.",
  attribution: "Galaxy Sports Edge Rumor Radar methodology",
  confidence: "HIGH — published methodology, audited by trust-gate guardrails",
};

const STATES = [
  {
    state: "WATCHLIST",
    color: "border-mineral bg-gray-900/20",
    badge: "text-gray-400 border-gray-600",
    trigger: "Signal first observed",
    description: "New signal entered the watchlist. Source tier is unverified or Tier 4–6. No official confirmation. Displayed for awareness — not as actionable intelligence.",
    canGraduate: false,
  },
  {
    state: "ELEVATED",
    color: "border-yellow-700 bg-yellow-950/20",
    badge: "text-yellow-300 border-yellow-700",
    trigger: "Volume spike across 3+ independent sources",
    description: "Multiple independent sources are reporting consistent chatter. No contradiction from primary sources. The signal warrants active monitoring — not yet actionable.",
    canGraduate: false,
  },
  {
    state: "CONTRADICTED",
    color: "border-red-800 bg-red-950/20",
    badge: "text-red-300 border-red-800",
    trigger: "Official denial or primary-source contradiction",
    description: "A Tier 1 or Tier 2 source has specifically denied or contradicted the signal. The signal remains visible for transparency — users can see what was rumored and what contradicted it.",
    canGraduate: false,
  },
  {
    state: "STALE",
    color: "border-mineral bg-gray-900/30",
    badge: "text-gray-500 border-gray-700",
    trigger: "TTL expired with no update",
    description: "The signal has not been updated within its time-to-live window. Displayed as stale — the underlying situation may have resolved or become irrelevant. Not removed: the history is part of the audit trail.",
    canGraduate: false,
  },
  {
    state: "GRADUATED",
    color: "border-emerald-700 bg-emerald-950/20",
    badge: "text-emerald-300 border-emerald-700",
    trigger: "Tier 1 or Tier 2 source confirms",
    description: "An official team report, injury designation, or verified beat reporter (Tier 1–2) has confirmed the signal. Handed off to the picks scoring pipeline for re-scoring. The signal is removed from the watchlist and appears as a scoring factor in affected picks.",
    canGraduate: true,
  },
] as const;

const GRADUATION_GATES = [
  "A Tier 1 source (official team, league, verified league data feed) must explicitly confirm.",
  "The confirmation must be within TTL — outdated confirmations do not graduate a signal.",
  "The signal must not have an active contradiction from a Tier 1 source.",
  "The graduation event is recorded in the signal audit log with the confirming source and timestamp.",
  "After graduation, the picks scoring pipeline re-evaluates any affected markets within 15 minutes.",
];

const CLUSTER_LINKS = [
  { href: "/rumor-radar", label: "Rumor Radar — the live watchlist surface" },
  { href: "/rumor-radar/source-tiers", label: "Rumor Radar Source Tiers — how evidence is graded" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — canonical six-tier taxonomy" },
  { href: "/picks/how-picks-are-scored", label: "How Picks Are Scored — the ten factors and publish gate" },
  { href: "/methodology", label: "Methodology — the full scoring guide" },
];

export default function RumorRadarHowItWorksPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Rumor Radar · Methodology</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              How Rumor Radar works.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Five watchlist states. Unverified signals never become picks. Here is how chatter is classified, surfaced, and graduated to actionable.
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
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Five states</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">How signals are classified.</h2>
            </div>
            <div className="flex flex-col gap-4">
              {STATES.map(({ state, color, badge, trigger, description, canGraduate }) => (
                <div key={state} className={`border p-6 ${color}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] ${badge}`}>
                      {state}
                    </span>
                    {canGraduate && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">→ enters picks pipeline</span>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Trigger: {trigger}</p>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Graduation gate</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              What it takes to become actionable.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              A signal in WATCHLIST or ELEVATED state cannot contribute to a published pick. All five conditions must be met before graduation.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {GRADUATION_GATES.map((gate) => (
                <li key={gate} className="flex items-start gap-3 border border-mineral bg-carbon/60 px-4 py-3">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ion-blue" />
                  <span className="text-sm leading-7 text-gray-300">{gate}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Continue reading</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Rumor Radar methodology cluster</h2>
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
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} Rumor Radar methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />
    </div>
  );
}
