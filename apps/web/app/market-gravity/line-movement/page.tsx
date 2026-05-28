import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Line Movement Explained — Spread, Total, Moneyline | Galaxy Sports Edge",
  description:
    "What line movement means across spread, total, and moneyline markets: how each market type moves differently, what opening lines represent, and the five most common causes of movement.",
  alternates: { canonical: "/market-gravity/line-movement" },
  openGraph: {
    title: `Line Movement Explained — ${BRAND_NAME}`,
    description:
      "Spread, total, moneyline — how each market type moves and what drives it. Five causes of movement ranked by informativeness.",
  },
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does line movement mean in sports betting?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Line movement is any change in the price of a betting market between its opening and the current moment. The opening line is the sportsbook's initial assessment of the probabilities; subsequent movement reflects new information (injuries, lineup changes, weather), the balance of betting action, or both. Not all movement is informative — public betting loading on a popular team moves lines without carrying any new information about the game itself.",
      },
    },
    {
      "@type": "Question",
      name: "How does spread line movement differ from total movement?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Spread movement reflects changing opinions about the relative margin of victory — 'by how much will the favorite win?' Total movement reflects changing opinions about scoring volume — 'how many points will be scored?' They respond differently to news. An injury to a starting quarterback moves the spread dramatically but may move the total in either direction depending on whether the backup is more or less likely to keep the game close. Weather affects totals more directly than spreads. The two markets should be read together, not in isolation.",
      },
    },
    {
      "@type": "Question",
      name: "What moves a moneyline compared to a spread?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Moneyline movement reflects changing opinions about win probability. Because moneyline prices are expressed in implied probability terms (e.g. -150 = 60% implied probability), even small movements represent meaningful probability shifts. A moneyline moving from -130 to -160 is a 3.2 percentage point shift in implied probability — larger than it looks in raw price terms. Moneyline and spread movement usually correlate but can diverge when sharp action targets one market specifically.",
      },
    },
    {
      "@type": "Question",
      name: "What are the five most common causes of line movement?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "1. Injury or lineup news (most informative — Tier 1 source). 2. Coordinated sharp-money placement across multiple books (informative — confirmed only when movement is uniform and fast across high-depth markets). 3. Public money loading on a popular team or narrative (least informative — common near game time as casual bettors enter). 4. Weather update for an outdoor game (informative for totals, less so for spreads). 5. Opening-line correction (sportsbook adjusts an apparent mistake in its own opening price — the correction itself is not directional information about the game).",
      },
    },
    {
      "@type": "Question",
      name: "What is a steam move?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A steam move is a rapid, coordinated line movement triggered by large bets placed almost simultaneously across multiple sportsbooks. Steam moves are the clearest observable signal of organized sharp-money activity. Galaxy Sports Edge does not label any movement as a steam move unless the movement is fast (sub-30-minute window), large (at least 1.5 points on a spread or 3+ points on a total), and uniform across 6+ books simultaneously. Movements that meet only some of these criteria are surfaced as WATCH or VOLATILE rather than confirmed steam.",
      },
    },
  ],
} as const;

const MOVEMENT_CAUSES = [
  {
    rank: "01",
    cause: "Injury or lineup news",
    informativeness: "HIGH",
    color: "text-emerald-300",
    timing: "Any point in the game week",
    description: "Official injury designation, practice report change, or confirmed lineup news. The most reliable cause of informative movement because it has a Tier 1 source that can be verified directly.",
  },
  {
    rank: "02",
    cause: "Sharp-money placement",
    informativeness: "HIGH (when confirmed)",
    color: "text-emerald-300",
    timing: "Typically early in the week or within 2 hours of game time",
    description: "Large, coordinated bets placed across multiple books in a short window. Informative only when movement is fast, large, and uniform. Galaxy Sports Edge does not assert sharp money without specific market data meeting all three criteria.",
  },
  {
    rank: "03",
    cause: "Weather update",
    informativeness: "MODERATE",
    color: "text-yellow-300",
    timing: "24–72 hours before game time",
    description: "Wind speed, precipitation, or temperature change for an outdoor game. Affects totals more directly than spreads. Only relevant for outdoor venues — domes are excluded.",
  },
  {
    rank: "04",
    cause: "Public money loading",
    informativeness: "LOW",
    color: "text-orange-300",
    timing: "Concentrated near game time (Thursday–Sunday for NFL)",
    description: "Casual bettors entering the market on a popular team or well-publicized narrative. This is the most common cause of late-week movement. It is the least informative — public bettors do not have an information edge, they have a preference.",
  },
  {
    rank: "05",
    cause: "Opening-line correction",
    informativeness: "LOW (non-directional)",
    color: "text-gray-400",
    timing: "First 1–4 hours after market opens",
    description: "A sportsbook corrects an apparent error in its opening price. The movement itself is not directional information about the game — it is the book fixing its own mistake. Common in early-posted markets.",
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/market-gravity", label: "Market Gravity — the live surface" },
  { href: "/market-gravity/how-it-works", label: "How Market Gravity Works — four scored inputs" },
  { href: "/market-gravity/book-disagreement", label: "Book Disagreement — what divergence between books means" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — how odds data is tiered" },
  { href: "/methodology", label: "Methodology — how line movement feeds picks" },
];

export default function LineMovementPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Market Gravity · Line Movement</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Line movement explained.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              What moves spread, total, and moneyline markets — and how to read the difference between informative movement and noise.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Five causes</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                What actually moves lines — ranked by informativeness.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                Informativeness here means: does this movement carry new information about the game&rsquo;s probabilities, or does it reflect something else?
              </p>
            </div>
            <ol className="flex flex-col gap-4">
              {MOVEMENT_CAUSES.map(({ rank, cause, informativeness, color, timing, description }) => (
                <li key={rank} className="border border-mineral bg-gray-900/60 p-6">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span className="font-mono text-sm text-ion-blue">{rank}</span>
                    <h3 className="text-lg font-bold text-white">{cause}</h3>
                    <span className={`font-mono text-xs ${color}`}>{informativeness}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Typical timing: {timing}</p>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Common questions</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Line movement FAQ</h2>
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
            <h2 className="mt-2 text-2xl font-bold text-white">Market intelligence methodology cluster</h2>
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
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} Market Gravity methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
    </div>
  );
}
