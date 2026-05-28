import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Rumor Radar Source Tiers — How Evidence is Graded | Galaxy Sports Edge",
  description:
    "How Galaxy Sports Edge grades the sources behind sports rumors and signals: the six-tier taxonomy applied to Rumor Radar, what each tier means for signal weight, and why Tier 5–6 sources never graduate to picks.",
  alternates: { canonical: "/rumor-radar/source-tiers" },
  openGraph: {
    title: `Rumor Radar Source Tiers — ${BRAND_NAME}`,
    description:
      "Tier 1–6 applied to rumor sources: official designations, verified reporters, aggregators, social, and synthetic. Only Tier 1–2 can graduate a signal.",
  },
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What source tiers does Rumor Radar use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rumor Radar applies the same six-tier source hierarchy used across the full intelligence platform. Tier 1 is official primary sources (team injury reports, league data feeds, official player statements). Tier 2 is verified reliable sources (accredited beat reporters at established outlets, licensed odds feeds). Tier 3 is corroborated secondary sources (multiple independent reports from established media). Tier 4 is single-source secondary (a single reporter at an established outlet, uncorroborated). Tier 5 is aggregated or social (non-accredited media, social media, podcasters, aggregate sites). Tier 6 is synthetic or AI-generated. Only Tier 1 and Tier 2 sources can graduate a Rumor Radar signal to the picks pipeline.",
      },
    },
    {
      "@type": "Question",
      name: "Why can't a Tier 5 social source graduate a signal?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Social and non-accredited sources have no verification accountability. A post on a fan forum or a tweet from an anonymous account cannot be attributed to an authoritative source — there is no mechanism to validate that the claim is based on privileged or direct knowledge. High social volume can elevate a signal from WATCHLIST to ELEVATED, indicating the rumor is spreading, but volume itself is not evidence. Signals require a Tier 1 or Tier 2 confirmation to become actionable because those tiers have accountability structures: official team designations carry legal disclosure obligations, and accredited beat reporters are professionally accountable for the accuracy of their reporting.",
      },
    },
    {
      "@type": "Question",
      name: "What happens when sources from different tiers contradict each other?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "When sources contradict, the higher tier takes precedence. If a Tier 1 official injury designation contradicts a Tier 4 beat-reporter rumor, the official designation wins and the signal moves to CONTRADICTED. If a Tier 2 reporter contradicts a Tier 5 social source, the Tier 2 source wins. The one exception is when multiple Tier 2 sources contradict a single Tier 1 source — this triggers a VOLATILE flag and prevents any graduation until the contradiction resolves.",
      },
    },
    {
      "@type": "Question",
      name: "How quickly does a source-tier change affect a signal's state?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Source-tier updates are processed in near-real-time. The data ingestion layer polls Tier 1 official feeds continuously during game-week hours. When a new Tier 1 or Tier 2 source is linked to a signal, the state machine re-evaluates the signal within minutes. Graduation or CONTRADICTED status can resolve within 5–15 minutes of a new source being ingested, depending on data freshness and TTL constraints.",
      },
    },
  ],
} as const;

const TIERS = [
  {
    tier: "01",
    name: "Official / Primary",
    examples: "Official team injury reports, league data feeds, verified player statements via official channels",
    weight: "Full",
    color: "border-emerald-700 bg-emerald-950/20",
    badge: "text-emerald-300 border-emerald-700",
    canGraduate: true,
    note: "Only source type with sufficient authority to graduate a signal unilaterally.",
  },
  {
    tier: "02",
    name: "Verified Reliable",
    examples: "Accredited beat reporters at established outlets (ESPN, The Athletic, etc.), licensed odds feeds",
    weight: "High",
    color: "border-cyan-700 bg-cyan-950/20",
    badge: "text-ion-blue border-cyan-700",
    canGraduate: true,
    note: "Can graduate a signal when the report is specific, attributed, and within TTL. Multiple Tier 2 sources increase confidence.",
  },
  {
    tier: "03",
    name: "Corroborated Secondary",
    examples: "Multiple independent reports from established media outlets reporting the same claim",
    weight: "Moderate",
    color: "border-yellow-700 bg-yellow-950/20",
    badge: "text-yellow-300 border-yellow-700",
    canGraduate: false,
    note: "Elevates a signal from WATCHLIST to ELEVATED. Cannot graduate without a Tier 1 or Tier 2 confirmation.",
  },
  {
    tier: "04",
    name: "Single-Source Secondary",
    examples: "A single reporter at an established outlet, uncorroborated. Podcast hosts with media credentials",
    weight: "Low",
    color: "border-mineral bg-gray-900/20",
    badge: "text-gray-400 border-gray-600",
    canGraduate: false,
    note: "Moves a signal from unobserved to WATCHLIST. Does not elevate without corroboration.",
  },
  {
    tier: "05",
    name: "Aggregated / Social",
    examples: "Fan sites, aggregate news apps, Twitter/X posts, Reddit threads, podcasters without media credentials",
    weight: "Volume only",
    color: "border-mineral bg-gray-900/30",
    badge: "text-gray-500 border-gray-700",
    canGraduate: false,
    note: "High volume across multiple Tier 5 sources can move a signal to ELEVATED — not because the sources are authoritative, but because volume is itself a signal. Content is not verified.",
  },
  {
    tier: "06",
    name: "Synthetic / AI-Generated",
    examples: "AI-written articles, LLM-generated summaries of unverified claims, scraped recaps without attribution",
    weight: "None",
    color: "border-red-900 bg-red-950/10",
    badge: "text-red-400 border-red-900",
    canGraduate: false,
    note: "Never contributes to signal state. Synthetic sources are identified and excluded from the signal pipeline.",
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/rumor-radar", label: "Rumor Radar — the live watchlist surface" },
  { href: "/rumor-radar/how-it-works", label: "How Rumor Radar Works — five signal states" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — canonical six-tier taxonomy" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/methodology", label: "Methodology — how signals feed picks" },
];

export default function RumorRadarSourceTiersPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Rumor Radar · Source Tiers</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              How evidence is graded.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Six source tiers applied to every signal. Only Tier 1 and Tier 2 can graduate a rumor to the picks pipeline.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Six tiers</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Source tiers in the signal pipeline.</h2>
            </div>
            <div className="flex flex-col gap-4">
              {TIERS.map(({ tier, name, examples, weight, color, badge, canGraduate, note }) => (
                <div key={tier} className={`border p-6 ${color}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-2xl font-black text-white">{tier}</span>
                    <h3 className="text-base font-bold text-white">{name}</h3>
                    <span className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] ${badge}`}>
                      Weight: {weight}
                    </span>
                    {canGraduate && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">can graduate</span>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Examples: {examples}</p>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Common questions</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Source tier FAQ</h2>
            <dl className="mt-8 flex flex-col gap-5">
              {(FAQ_LD.mainEntity as unknown as Array<{ name: string; acceptedAnswer: { text: string } }>).map(({ name, acceptedAnswer }) => (
                <div key={name} className="border border-mineral bg-carbon/60 p-5">
                  <dt className="text-base font-bold text-white">{name}</dt>
                  <dd className="mt-3 text-sm leading-7 text-gray-300">{acceptedAnswer.text}</dd>
                </div>
              ))}
            </dl>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
    </div>
  );
}
