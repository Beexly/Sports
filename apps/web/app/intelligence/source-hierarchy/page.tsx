import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /intelligence/source-hierarchy
 *
 * Public exposition of the canonical six-tier source taxonomy.
 * Mirrors `docs/brain/source-hierarchy.md` doctrine for AI-search /
 * GEO authority and human transparency.
 *
 * Every claim across Galaxy Sports Edge carries a source tier. This
 * page is the canonical definition AI engines and users can cite.
 */

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Source Hierarchy — Six-Tier Sports Intelligence Taxonomy | Galaxy Sports Edge",
  description:
    "The six-tier source taxonomy that governs every claim on Galaxy Sports Edge. Tier 1 official, Tier 2 licensed, Tier 3 trusted secondary, Tier 4 market signals, Tier 5 community chatter, Tier 6 synthetic / AI.",
  alternates: { canonical: "/intelligence/source-hierarchy" },
  openGraph: {
    title: `Source Hierarchy — ${BRAND_NAME}`,
    description:
      "Six tiers, declared on every claim. The canonical sports intelligence source taxonomy.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Sports OS Source Hierarchy — Six-Tier Taxonomy",
  description:
    "Six tiers of sports intelligence sources, with TTL, public-safety, and citation rules for each.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

interface Tier {
  tier: number;
  name: string;
  shortName: string;
  definition: string;
  examples: ReadonlyArray<string>;
  ttl: string;
  publicSafe: "yes" | "conditional" | "no";
  publicNote: string;
  pickEvidence: "yes" | "supporting" | "no";
  color: string;
  border: string;
  bg: string;
}

const TIERS: ReadonlyArray<Tier> = [
  {
    tier: 1,
    name: "Official / Primary",
    shortName: "Official",
    definition:
      "Direct statements from the authoritative entity — teams, leagues, coaches, players, and on-site credentialed reporters.",
    examples: [
      "Official NFL injury report",
      "Team press release",
      "On-record coach press conference",
      "League transaction wire",
    ],
    ttl: "15 min standard · 5 min game-day injury",
    publicSafe: "yes",
    publicNote: "All surfaces. Must cite source and timestamp.",
    pickEvidence: "yes",
    color: "text-emerald-300",
    border: "border-emerald-900",
    bg: "bg-emerald-950/30",
  },
  {
    tier: 2,
    name: "Licensed / Structured Data",
    shortName: "Licensed",
    definition:
      "Data received under a formal API agreement or data license.",
    examples: [
      "The Odds API (odds and lines)",
      "Licensed stats providers",
      "League-sanctioned advanced stats feeds",
    ],
    ttl: "2 min live · 5 min pre-game · 24 hr historical",
    publicSafe: "conditional",
    publicNote: "Subject to license redistribution terms. Display as derived intelligence, not raw data.",
    pickEvidence: "yes",
    color: "text-cyan-300",
    border: "border-cyan-900",
    bg: "bg-cyan-950/30",
  },
  {
    tier: 3,
    name: "Trusted Secondary",
    shortName: "Trusted secondary",
    definition:
      "Reporting from credentialed journalists and established outlets with a verifiable track record. Not primary — subject to verification.",
    examples: [
      "ESPN, The Athletic, major-market beat coverage",
      "Credentialed analysts with verifiable history",
      "Aggregated consensus from Tier 1 / Tier 2 with named primaries",
    ],
    ttl: "2 hr standard · 30 min breaking",
    publicSafe: "yes",
    publicNote: "With source attribution and freshness disclosure.",
    pickEvidence: "supporting",
    color: "text-blue-300",
    border: "border-blue-900",
    bg: "bg-blue-950/30",
  },
  {
    tier: 4,
    name: "Market Signals",
    shortName: "Market",
    definition:
      "Price action and consensus signals from betting markets. Informative about perceived probability — not a direct information source.",
    examples: [
      "Line movement (open vs. current)",
      "Book consensus and disagreement",
      "Implied probability shifts",
    ],
    ttl: "2 min live · 10 min pre-game",
    publicSafe: "conditional",
    publicNote: "Describe as 'market movement' or 'line context' — never as sharp-money confirmation without supporting Tier 1–2 evidence.",
    pickEvidence: "supporting",
    color: "text-yellow-300",
    border: "border-yellow-900",
    bg: "bg-yellow-950/30",
  },
  {
    tier: 5,
    name: "Community / Weak Signal",
    shortName: "Community",
    definition:
      "Unverified information from social media, forums, and unconfirmed reports.",
    examples: [
      "Reddit, fan forums, team subreddits",
      "Unverified social-media posts",
      "Fan accounts and unofficial insiders",
      "Keyword and sentiment spikes",
    ],
    ttl: "30 min watchlist only",
    publicSafe: "no",
    publicNote: "Never appears on a public surface as a standalone claim. Cockpit watchlist only.",
    pickEvidence: "no",
    color: "text-orange-300",
    border: "border-orange-900",
    bg: "bg-orange-950/30",
  },
  {
    tier: 6,
    name: "Synthetic / AI / Low Trust",
    shortName: "Synthetic",
    definition:
      "AI-generated content, aggregator summaries, unattributed articles, or model outputs (including our own Claude API responses used in the pipeline).",
    examples: [
      "AI-generated sports recaps",
      "Aggregator sites without primary sourcing",
      "Unattributed articles",
      "Sports OS internal model output (Claude API)",
    ],
    ttl: "Not a valid evidence source",
    publicSafe: "no",
    publicNote: "Never cited as evidence. Internal drafting tool only, with human review before publication.",
    pickEvidence: "no",
    color: "text-red-300",
    border: "border-red-900",
    bg: "bg-red-950/30",
  },
];

const STALENESS_OK = [
  "Based on information retrieved [N] hours ago — may have changed",
  "This data was last verified at [timestamp]",
  "Check official sources for the latest status",
];

const STALENESS_FORBIDDEN = [
  "\"Current\" or \"live\" when data is stale",
  "\"Confirmed\" without a recent Tier 1 check",
  "Omitting the timestamp entirely",
];

const CLUSTER_LINKS = [
  { href: "/intelligence/how-it-works", label: "How it works — the full pipeline" },
  { href: "/intelligence/glossary", label: "Intelligence glossary — canonical terminology" },
  { href: "/methodology", label: "Methodology — scoring and gating" },
  { href: "/rumor-radar", label: "Rumor Radar — source tiers in action" },
];

function safetyBadge(state: Tier["publicSafe"]): JSX.Element {
  if (state === "yes") {
    return (
      <span className="border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
        Public ✓
      </span>
    );
  }
  if (state === "conditional") {
    return (
      <span className="border border-yellow-800 bg-yellow-950/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-yellow-300">
        Conditional
      </span>
    );
  }
  return (
    <span className="border border-red-900 bg-red-950/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300">
      Never standalone
    </span>
  );
}

export default function SourceHierarchyPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero with direct answer */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_70%_0%,rgba(122,92,255,0.10),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Source hierarchy · six-tier taxonomy
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Six tiers. Declared on every claim.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              No claim leaves Galaxy Sports Edge without a declared source tier and timestamp. Higher tiers override lower tiers on the same claim. Tier 5 and Tier 6 never reach a public surface as standalone fact.
            </p>

            <div className="mt-10 border-l-2 border-cyan-700 bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                Direct answer
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                What source tiers does Galaxy Sports Edge use?
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                Six tiers, from official primary sources (Tier 1) down through licensed structured data (Tier 2), trusted secondary reporting (Tier 3), market signals (Tier 4), community chatter (Tier 5), and synthetic / AI content (Tier 6). Each tier has a defined freshness TTL, public-safety rating, and citation rule.
              </p>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Source</p>
                  <p className="mt-1 text-gray-300">{BRAND_NAME} doctrine</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Confidence</p>
                  <p className="mt-1 text-emerald-300">HIGH — canonical taxonomy</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Last updated</p>
                  <p className="mt-1 text-gray-300">{LAST_UPDATED}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The six tiers */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                The taxonomy
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Tier by tier.
              </h2>
            </div>
            <div className="flex flex-col gap-5">
              {TIERS.map((t) => (
                <article key={t.tier} className={`border ${t.border} ${t.bg} p-6`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-4">
                      <span className={`font-mono text-2xl font-black ${t.color}`}>T{t.tier}</span>
                      <h3 className="text-xl font-bold text-white">{t.name}</h3>
                    </div>
                    {safetyBadge(t.publicSafe)}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-gray-300">{t.definition}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
                        Examples
                      </p>
                      <ul className="mt-2 flex flex-col gap-1 text-xs text-gray-300">
                        {t.examples.map((ex) => (
                          <li key={ex} className="flex gap-2">
                            <span className="text-gray-600">·</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
                          Freshness TTL
                        </p>
                        <p className="mt-1 text-xs text-gray-300">{t.ttl}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
                          Public use
                        </p>
                        <p className="mt-1 text-xs text-gray-300">{t.publicNote}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Staleness language */}
        <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Staleness policy
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                When data ages out.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-gray-400">
                When a source exceeds its TTL, the language around it changes — and stale Tier 1 or Tier 2 data is withheld from picks until refreshed, or surfaced only with a STALE flag in the cockpit.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-emerald-900 bg-emerald-950/20 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                  Approved language
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-emerald-200">
                  {STALENESS_OK.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span>✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-red-900 bg-red-950/20 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red-300">
                  Forbidden language
                </p>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-red-200">
                  {STALENESS_FORBIDDEN.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span>✕</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cluster links */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
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
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} source-tier doctrine
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
