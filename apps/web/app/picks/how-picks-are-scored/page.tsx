import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "How Picks Are Scored — The Factor Trail | Galaxy Sports Edge",
  description:
    "How Galaxy Sports Edge scores a pick: ten deterministic factors, the gate that decides what publishes, what a factor trail shows, and why most evaluated games do not reach the board.",
  alternates: { canonical: "/picks/how-picks-are-scored" },
  openGraph: {
    title: `How Picks Are Scored — ${BRAND_NAME}`,
    description:
      "Ten factors. A publish gate. A factor trail for every pick that ships. Most evaluated games do not publish — here is why.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "How Picks Are Scored — The Factor Trail",
  description:
    "Ten deterministic scoring factors, the publish gate, and the factor trail attached to every pick that ships on Galaxy Sports Edge.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "How does Galaxy Sports Edge decide which picks to publish?",
  answer:
    "Every evaluated game is scored across ten deterministic factors — market signals, contextual inputs, and data quality checks. The raw score is converted to a 0–100 confidence value. A pick only reaches the public board if it clears the publish gate: confidence must meet the current readiness threshold, data freshness must be within TTL, and the factor trail must be complete. Most evaluated games do not publish. The board is not a firehose — it is the filtered output of a gate that refuses to publish when the math does not support it.",
  attribution: "Galaxy Sports Edge picks methodology",
  confidence: "HIGH — published methodology, audited by trust-gate guardrails",
};

const FACTORS = [
  {
    n: "01",
    group: "Market signals",
    name: "Line movement",
    body: "Opening-to-current price movement across tracked books, scored by size, speed, and uniformity. Movement that is fast, large, and uniform across high-depth markets contributes positively. Slow, scattered movement does not.",
  },
  {
    n: "02",
    group: "Market signals",
    name: "Book disagreement",
    body: "Variance in current pricing across books. High disagreement after a rapid move is surfaced as a directional signal when paired with low-noise movement; high disagreement in a stable market is flagged as volatile.",
  },
  {
    n: "03",
    group: "Market signals",
    name: "Market depth",
    body: "Number of books pricing the market. Signals in deep markets (10+ books) carry more weight than shallow markets (3–5 books). Shallow markets are more susceptible to single-book outliers.",
  },
  {
    n: "04",
    group: "Market signals",
    name: "Consensus direction",
    body: "Whether multiple independent market signals (spread, total, moneyline) point in the same direction. Convergence across market types increases confidence; divergence is a caution flag.",
  },
  {
    n: "05",
    group: "Contextual inputs",
    name: "Injury and lineup context",
    body: "Official injury designations and confirmed lineup changes (Tier 1 source). A Doubtful or Out designation for a key player triggers a re-score. Lineup context is time-sensitive — the pick is not published until the practice report is final.",
  },
  {
    n: "06",
    group: "Contextual inputs",
    name: "Rest and travel",
    body: "Days of rest for each team and travel direction (east-to-west vs. west-to-east). Rest disadvantages and long west-to-east travel days have historically small but consistent effects at the margins.",
  },
  {
    n: "07",
    group: "Contextual inputs",
    name: "Venue and weather",
    body: "Home/away designation and, for outdoor games, current weather forecast. Wind speed above 20 mph and temperatures below 30°F suppress aerial scoring and are factored into total-related signals.",
  },
  {
    n: "08",
    group: "Contextual inputs",
    name: "Schedule context",
    body: "Divisional vs. non-divisional games, playoff implications, and back-to-back or compressed schedule patterns. These affect motivation and roster management in ways that market prices do not always capture.",
  },
  {
    n: "09",
    group: "Data quality checks",
    name: "Data freshness",
    body: "Each input has a maximum age (TTL) defined by its source tier. Stale data does not contribute to the score — the pick is held until fresh data is available or marked as data-insufficient.",
  },
  {
    n: "10",
    group: "Data quality checks",
    name: "Volatility flag",
    body: "Whether the market itself is in a volatile state (rapidly moving, high book disagreement, or recently suspended and reopened). Volatile markets do not receive picks — they receive a VOLATILE surface flag instead.",
  },
] as const;

const GATE_RULES = [
  "Confidence score must meet the current readiness threshold (threshold rises as settled history accumulates).",
  "All data freshness checks must pass — no stale inputs allowed in a published pick.",
  "The factor trail must be complete — every factor must have a recorded value and source tier.",
  "The volatility flag must be clear — no pick is published into a volatile market.",
  "The trust-gate guardrail must pass — no casino-certainty language in any generated rationale.",
];

const CLUSTER_LINKS = [
  { href: "/picks", label: "Picks — today's board" },
  { href: "/picks/confidence-scores", label: "Confidence Scores — what 0–100 means and how it is calibrated" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/methodology", label: "Methodology — the full scoring and gating guide" },
  { href: "/performance", label: "Performance — settled-pick ledger" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — evidence tiers" },
];

export default function HowPicksScoredPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Picks Intelligence · Methodology</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              How picks are scored.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Ten factors. A publish gate. A factor trail attached to every pick that ships. Most games never make the board.
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
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">The ten factors</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What the model reads.</h2>
            </div>
            <ol className="flex flex-col gap-3">
              {FACTORS.map(({ n, group, name, body }) => (
                <li key={n} className="border border-mineral bg-gray-900/60 p-5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-mono text-sm text-ion-blue">{n}</span>
                    <h3 className="text-base font-bold text-white">{name}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">{group}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-gray-300">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">The publish gate</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Why most games never make the board.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              A positive score is not enough. The gate applies five rules that must all pass before a pick is published. Failing any one of them produces a withheld pick, not a published one.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {GATE_RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-3 border border-mineral bg-carbon/60 px-4 py-3">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ion-blue" />
                  <span className="text-sm leading-7 text-gray-300">{rule}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-7 text-gray-400">
              The pass list — games that were evaluated but did not publish, with the reason — is visible on the board surface. A skipped game is not a hidden pick; it is a declined one, with the reason attached.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Continue reading</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Picks intelligence methodology cluster</h2>
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
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} picks methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />
    </div>
  );
}
