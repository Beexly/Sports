import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { StateBadge } from "@/components/ui/state-badge";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Market Gravity — Line Movement Intelligence | Galaxy Sports Edge",
  description:
    "Watch opening-to-current line movement, sportsbook disagreement, volatility, and risk-adjustment signals — not sharp-money theater.",
  alternates: { canonical: "/market-gravity" },
  openGraph: {
    title: `Market Gravity — ${BRAND_NAME}`,
    description:
      "Opening vs. current price, movement speed, book disagreement, volatility. Line movement you can read.",
  },
};

const DEMO_GAMES = [
  {
    matchup: "Eagles vs. Cowboys",
    sport: "NFL",
    open: "PHI -3.5",
    current: "PHI -5.5",
    movement: "+2.0",
    direction: "away",
    speed: "FAST",
    books: 12,
    disagreement: "LOW",
    signal: "WATCH",
    note: "Uniform movement across 12 books. Speed exceeds normal injury-news pace. Timing does not correlate to a public news event.",
    status: "DEMO",
  },
  {
    matchup: "Clippers vs. Thunder",
    sport: "NBA",
    open: "OKC -2.5",
    current: "OKC -1.0",
    movement: "-1.5",
    direction: "toward",
    speed: "SLOW",
    books: 10,
    disagreement: "HIGH",
    signal: "VOLATILE",
    note: "Three books moved against consensus. Possible sharp/public split. High disagreement warrants caution.",
    status: "DEMO",
  },
  {
    matchup: "Red Sox vs. Yankees",
    sport: "MLB",
    open: "u8.5",
    current: "u8.0",
    movement: "-0.5",
    direction: "under",
    speed: "MOD",
    books: 14,
    disagreement: "LOW",
    signal: "LEAN",
    note: "Total compressed before lineup release. Weather forecast shows 12 mph wind, slightly suppressive.",
    status: "DEMO",
  },
] as const;

const CONCEPTS = [
  ["Opening vs. current line", "The first posted price reflects the book's opening opinion. Distance from current price measures how much the market has moved."],
  ["Movement speed", "Fast moves on low public volume suggest non-retail pressure. Slow moves on high public volume are expected consensus drift."],
  ["Book disagreement", "When books disagree on direction, it signals a contested market — useful for identifying volatility, not direction."],
  ["Market risk classification", "Watch, Lean, Avoid, and Volatile are operational labels — not picks. They describe line health and decision confidence."],
  ["What we do not claim", "We do not claim sharp money or syndicate action without specific supporting data. Movement analysis is observational."],
  ["Timing relative to news", "Lines move around injury reports, weather, and lineup news. Separating news-driven from non-news movement is a key input."],
] as const;

const SPEED_COLORS: Record<string, string> = {
  FAST: "text-red-300",
  MOD: "text-yellow-300",
  SLOW: "text-emerald-300",
};
const SIGNAL_COLORS: Record<string, string> = {
  WATCH: "text-ion-blue border-cyan-700 bg-cyan-950/30",
  LEAN: "text-emerald-300 border-emerald-800 bg-emerald-950/30",
  VOLATILE: "text-yellow-300 border-yellow-800 bg-yellow-950/30",
  AVOID: "text-red-300 border-red-900 bg-red-950/30",
};

export default function MarketGravityPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_80%_20%,rgba(122,92,255,0.12),transparent_35%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4">
              <StateBadge state="preview" detail="Live data integration in progress" />
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Market Gravity</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Line movement you can read.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Opening price, current price, speed, direction, book disagreement — scored and classified without sharp-money theater.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
              We do not claim sharp-money action without data. Market Gravity is a movement-observation and risk-classification system. Watch, Lean, Volatile, Avoid — operational labels, not picks.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
                Access Market Gravity
              </Link>
              <Link href="/methodology" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300">
                Methodology
              </Link>
            </div>
          </div>
        </section>

        {/* Demo cards */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-purple-300">Demo · Illustrative samples only</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Market Gravity demo</h2>
              </div>
              <p className="max-w-xs text-sm text-gray-500 sm:text-right">
                Sample data. No real odds or lines. Not picks.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {DEMO_GAMES.map((g) => (
                <article key={g.matchup} className="border border-mineral bg-gray-900/60 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">{g.sport}</p>
                      <h3 className="mt-1 text-xl font-bold text-white">{g.matchup}</h3>
                    </div>
                    <span className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${SIGNAL_COLORS[g.signal] ?? ""}`}>
                      {g.signal}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="border border-mineral bg-carbon/50 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Open</p>
                      <p className="mt-1 font-bold text-white">{g.open}</p>
                    </div>
                    <div className="border border-mineral bg-carbon/50 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Current</p>
                      <p className="mt-1 font-bold text-white">{g.current}</p>
                    </div>
                    <div className="border border-mineral bg-carbon/50 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Movement</p>
                      <p className={`mt-1 font-bold ${g.movement.startsWith("+") ? "text-ion-blue" : "text-red-300"}`}>{g.movement}</p>
                    </div>
                    <div className="border border-mineral bg-carbon/50 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">Speed</p>
                      <p className={`mt-1 font-bold ${SPEED_COLORS[g.speed] ?? "text-white"}`}>{g.speed}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-400">{g.note}</p>
                  <div className="mt-3 flex gap-4 text-xs text-gray-600">
                    <span>{g.books} books</span>
                    <span>Disagreement: {g.disagreement}</span>
                    <span className="font-mono uppercase text-gray-700">DEMO</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Framework */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Framework</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What Market Gravity measures</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CONCEPTS.map(([title, body]) => (
                <div key={title} className="border border-mineral bg-carbon/60 p-5">
                  <h3 className="text-base font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Live data integration</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Market Gravity goes live with the Pro plan.</h2>
            <p className="mt-4 text-base text-gray-400">
              Real-time line movement across 14 books, scored and classified. Available to Pro and Elite subscribers.
            </p>
            <Link href="/pricing" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
              See pricing
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
