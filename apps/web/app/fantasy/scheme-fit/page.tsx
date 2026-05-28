import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /fantasy/scheme-fit
 *
 * GEO-anchor page. Canonical explanation of offensive scheme classification
 * and its effect on skill-position value in fantasy sports intelligence.
 * TechArticle JSON-LD.
 * See `docs/intelligence/ai-search-geo-strategy.md` for the GEO contract.
 */

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Scheme Fit in Fantasy Sports — How Offensive Systems Affect Player Value",
  description:
    "What scheme fit means in fantasy sports intelligence: five offensive system classifications, how each affects target distribution and carry volume, and how Galaxy Sports Edge uses scheme alignment as one of four start/sit inputs.",
  alternates: { canonical: "/fantasy/scheme-fit" },
  openGraph: {
    title: `Scheme Fit — ${BRAND_NAME} Fantasy Intelligence`,
    description:
      "Air Raid, West Coast, Run-Heavy, Spread, Pro-Style — five offensive system classifications and how each shapes fantasy value at WR, RB, and TE.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Scheme Fit in Fantasy Sports — Offensive System Classifications",
  description:
    "Five offensive system classifications (Air Raid, West Coast, Run-Heavy, Spread, Pro-Style) and how each affects skill-position fantasy value.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "What is scheme fit in fantasy sports and why does it matter?",
  answer:
    "Scheme fit describes how well a player's skill set aligns with the offensive coordinator's system. The same receiver who is a consistent top target in an Air Raid spread offense may become a secondary option in a run-heavy West Coast system simply due to formation and route-tree priorities. Galaxy Sports Edge classifies every active coordinator into one of five scheme types and scores how each player's primary skill set — slot speed, inline blocking, seam running, deep-route ability — maps to that scheme's target and carry distribution patterns.",
  attribution: "Galaxy Sports Edge Fantasy Intelligence methodology",
  confidence: "HIGH — scheme classification derived from play-call tendencies via licensed structured data (Tier 2)",
};

const SCHEMES = [
  {
    name: "Air Raid",
    color: "border-cyan-700 bg-cyan-950/20",
    badge: "text-cyan-300 border-cyan-700 bg-cyan-950/30",
    description:
      "Vertical passing attack with four or five receivers on most snaps. Designed to create high throw volumes and spread coverages horizontally and vertically.",
    targetDistribution: "WR-heavy. Slot receiver and Z-receiver target shares are elevated. TE usage depends on coordinator variation — some run TE-heavy Air Raid, most do not.",
    rbImpact: "Reduced. Running backs primarily serve as pass-catchers out of the backfield. Traditional carry volume is lower than league average.",
    benefitedBy: "Slot WR with speed and route polish, any WR facing zone coverage, backfield receivers with route-running ability.",
    limitedBy: "Blocking TEs, traditional power RBs, boundary WRs without deep-route repertoire.",
  },
  {
    name: "West Coast",
    color: "border-blue-700 bg-blue-950/20",
    badge: "text-blue-300 border-blue-700 bg-blue-950/30",
    description:
      "Horizontal route trees, timing-based short passing game, and run-pass balance. Designed to create easy completions, stress linebackers horizontally, and control possession.",
    targetDistribution: "Spread across all skill positions. No single receiver dominates. TE is a consistent contributor in most West Coast variants.",
    rbImpact: "Elevated passing. RBs in West Coast systems often lead the team in receptions in a given week — check-down and flat-route usage is high.",
    benefitedBy: "Receiving RBs, in-line TEs with route polish, slot WRs on crossing routes.",
    limitedBy: "Deep-threat WRs with limited short-area quickness, power backs with no receiving role.",
  },
  {
    name: "Run-Heavy",
    color: "border-amber-700 bg-amber-950/20",
    badge: "text-amber-300 border-amber-700 bg-amber-950/30",
    description:
      "Ground-and-pound philosophy. Games are controlled through the run game, play-action passes, and conservative down-and-distance management.",
    targetDistribution: "Low passing volume overall. When passes occur, they are concentrated on the TE and primary receiver as play-action release valves.",
    rbImpact: "Highest. The lead back in a run-heavy system is one of the most reliable fantasy assets — volume and goal-line opportunity are maximized.",
    benefitedBy: "Feature RBs, TE as play-action option, WR1 on play-action deep shots.",
    limitedBy: "WR2 and WR3 in three-receiver sets, receiving backs who split with a power back.",
  },
  {
    name: "Spread",
    color: "border-violet-700 bg-violet-950/20",
    badge: "text-violet-300 border-violet-700 bg-violet-950/30",
    description:
      "Multiple receiver sets with zone-read and RPO elements. Designed to create conflict for defenses by threatening both the run and the pass on every snap.",
    targetDistribution: "Distributed. RPO concepts create short, immediate targets on one side while spread routes stress coverage on the other. Target share can be volatile week to week.",
    rbImpact: "Variable. In pure RPO-heavy systems the QB is a rushing threat, which reduces RB carries. In run-spread systems the RB is the primary ball carrier in zone-read.",
    benefitedBy: "Dual-threat QBs (own them in superflex), WRs with YAC ability, and zone-read RBs.",
    limitedBy: "Traditional power backs in pure RPO systems, WRs without YAC skills in compressed zones.",
  },
  {
    name: "Pro-Style",
    color: "border-gray-600 bg-gray-950/20",
    badge: "text-gray-300 border-gray-600 bg-gray-900/60",
    description:
      "Balanced, multiple-formation offense that draws from all other systems. Designed to be unpredictable and to keep defensive coordinators from committing to a single scheme.",
    targetDistribution: "Highly context-dependent. Game script, personnel groupings, and matchup dictate whether any given week is pass-heavy or run-heavy.",
    rbImpact: "Moderate and consistent. Pro-Style offenses generally have a defined feature back but also use the backfield in the passing game.",
    benefitedBy: "Complete players at every position — receivers who can run any route, RBs with both carry and receiving roles, TEs who block and route-run.",
    limitedBy: "Specialists. A pure deep-threat WR with no intermediate route package is more dependent on the offense calling his shots in a Pro-Style system.",
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/fantasy", label: "Fantasy Intelligence — the War Room surface" },
  { href: "/fantasy/how-start-sit-works", label: "How Start/Sit Works — the full decision pipeline" },
  { href: "/fantasy/usage-trends", label: "Usage Trends — target share, snap count, route participation" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — how scheme data is sourced and tiered" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/methodology", label: "Methodology — how signals are scored and gated" },
];

export default function SchemeFitPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero with direct-answer block */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Fantasy Intelligence · Scheme Fit
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Scheme fit.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Five offensive system classifications and what each one means for target distribution, carry volume, and skill-position value week to week.
            </p>

            {/* Direct-answer block */}
            <div className="mt-10 border-l-2 border-cyan-700 bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">
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

        {/* Scheme cards */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Five scheme types
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                How each system distributes touches.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                These classifications are sourced from play-call tendency data (Tier 2 licensed). A coordinator&rsquo;s scheme type can shift mid-season — the model re-scores when 3-week play-call tendencies diverge materially from the season baseline.
              </p>
            </div>
            <div className="flex flex-col gap-6">
              {SCHEMES.map(({ name, color, badge, description, targetDistribution, rbImpact, benefitedBy, limitedBy }) => (
                <div key={name} className={`border p-6 ${color}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] ${badge}`}>
                      {name}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">{description}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Target distribution</p>
                      <p className="mt-1 text-xs leading-6 text-gray-300">{targetDistribution}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">RB impact</p>
                      <p className="mt-1 text-xs leading-6 text-gray-300">{rbImpact}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-600">Benefited by</p>
                      <p className="mt-1 text-xs leading-6 text-gray-300">{benefitedBy}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red-700">Limited by</p>
                      <p className="mt-1 text-xs leading-6 text-gray-300">{limitedBy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cluster links */}
        <section className="border-t border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
              Continue reading
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Fantasy intelligence methodology cluster
            </h2>
            <ul className="mt-6 flex flex-col gap-2">
              {CLUSTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-gray-200 hover:border-cyan-700 hover:text-cyan-200"
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
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} Fantasy Intelligence methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }}
      />
    </div>
  );
}
