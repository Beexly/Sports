import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Fantasy Intelligence — Start/Sit, Waiver, Trade | Galaxy Sports Edge",
  description:
    "Fantasy War Room: role changes, usage trends, injury risk, matchup context, and scheme fit — all in one intelligence view. Preview launching soon.",
  alternates: { canonical: "/fantasy" },
};

const DEMO_PLAYERS = [
  {
    name: "Marcus Thompson",
    pos: "WR",
    team: "LAR",
    signal: "LEAN START",
    confidence: 74,
    tags: ["CB2 matchup", "3+ targets last 3", "Scheme fit"],
    note: "Slot role expanded with Moore out. CB2 shadow is beatable by release.",
    risk: "LOW",
  },
  {
    name: "Devon Carr",
    pos: "RB",
    team: "DEN",
    signal: "WATCHLIST",
    confidence: 51,
    tags: ["Unclear role", "Handcuff concern", "Weather TBD"],
    note: "Practice report has two days remaining. Volume split unresolved.",
    risk: "MOD",
  },
  {
    name: "Caleb Rivers",
    pos: "TE",
    team: "KC",
    signal: "SIT",
    confidence: 82,
    tags: ["Strong safety bracket", "Low target share", "Tough zone"],
    note: "Coverage profile this week suppresses seam access. Low floor.",
    risk: "HIGH",
  },
  {
    name: "Jalen Howell",
    pos: "QB",
    team: "PHI",
    signal: "LEAN START",
    confidence: 68,
    tags: ["Pace matchup", "o/u 51+", "Home"],
    note: "Opponent allows 4th-highest pass DVOA. Game script favors volume.",
    risk: "LOW",
  },
] as const;

const DIMENSIONS = [
  ["Role clarity", "Is this player the clear starter or competing for snaps? Role changes move confidence fast."],
  ["Usage trend", "3-game direction on targets, carries, or routes run. Direction matters more than volume."],
  ["Injury risk", "Practice report, snap percent trend, and supporting-cast disruption all factor in."],
  ["Matchup context", "Positional coverage grade, defensive scheme, and expected game script."],
  ["Scheme fit", "Does the coordinator use this player type well? Route tree, formation alignment."],
  ["Weather / venue", "Outdoor games over 20 mph wind or below 30°F suppress aerial totals."],
] as const;

const SIGNAL_COLORS: Record<string, string> = {
  "LEAN START": "text-cyan-300 border-cyan-700 bg-cyan-950/30",
  WATCHLIST: "text-yellow-300 border-yellow-800 bg-yellow-950/30",
  SIT: "text-red-300 border-red-900 bg-red-950/30",
};
const RISK_COLORS: Record<string, string> = {
  LOW: "text-emerald-300",
  MOD: "text-yellow-300",
  HIGH: "text-red-400",
};

export default function FantasyPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.10),transparent_35%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 inline-flex items-center gap-2 border border-cyan-900 bg-cyan-950/40 px-3 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Preview</span>
              <span className="text-xs text-cyan-200">Early access launching soon</span>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Fantasy Intelligence</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Fantasy War Room.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Role changes, usage trends, injury risk, matchup context, and scheme fit — separated and scored before your decision window closes.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
              Not a projection system. Not a consensus ranking. This is the signal layer behind the decision — what changed, what the market missed, and what the injury report actually implies.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
                Get early access
              </Link>
              <Link href="/methodology" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300">
                How signals are scored
              </Link>
            </div>
          </div>
        </section>

        {/* Demo Cards */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Demo · Sample data only</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">War Room demo</h2>
              </div>
              <p className="max-w-xs text-sm text-gray-500 sm:text-right">
                These are illustrative samples. No real player data is used. No picks are implied.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {DEMO_PLAYERS.map((p) => (
                <article key={p.name} className="border border-gray-800 bg-gray-900/60 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">{p.pos} · {p.team}</p>
                      <h3 className="mt-1 text-xl font-bold text-white">{p.name}</h3>
                    </div>
                    <span className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${SIGNAL_COLORS[p.signal] ?? ""}`}>
                      {p.signal}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{p.note}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="border border-gray-700 bg-gray-800/50 px-2 py-0.5 text-xs text-gray-300">{t}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-500">Confidence {p.confidence}</span>
                    <span className={`font-mono text-xs ${RISK_COLORS[p.risk] ?? ""}`}>Risk {p.risk}</span>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-600">
              DEMO — Sample names and data only. Not real players or recommendations.
            </p>
          </div>
        </section>

        {/* Dimensions */}
        <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Framework</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What Fantasy War Room scores</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DIMENSIONS.map(([title, body]) => (
                <div key={title} className="border border-gray-800 bg-gray-950/60 p-5">
                  <h3 className="text-base font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Early access</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Fantasy War Room is in preview.</h2>
            <p className="mt-4 text-base text-gray-400">
              Subscribers on the Pro and Elite tiers get first access when Fantasy War Room launches. Sign up now to hold your spot.
            </p>
            <Link href="/pricing" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
              See pricing and get access
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
