import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Roster Shock Index — Lineup Change Impact | ${BRAND_NAME}`,
  description:
    "When a starter is ruled out hours before tip, the market takes 15–30 minutes to reprice. Galaxy's Roster Shock Index scores the impact before the line settles.",
  alternates: { canonical: "/roster-shock" },
  openGraph: {
    title: `Roster Shock Index | ${BRAND_NAME}`,
    description:
      "Lineup changes are the market's most exploitable moment. Model-supported impact scoring before the line catches up.",
  },
};

const IMPACT_CATEGORIES = [
  {
    icon: "↑",
    title: "Starter Impact",
    body: "Primary contributor out. Usage shifts, role elevation, production floor drops. The market typically prices replacement-level; role-adjusted impact is often larger.",
  },
  {
    icon: "⇄",
    title: "Usage Redistribution",
    body: "Who absorbs the minutes? The second player, not the starter's backup, often absorbs the highest share of usage. Prop markets are slow to reprice.",
  },
  {
    icon: "⏩",
    title: "Pace Effect",
    body: "Lineup changes alter rotation depth and foul trouble dynamics. Teams with shorter benches see pace changes that affect totals even when the spread is accurately repriced.",
  },
  {
    icon: "⏱",
    title: "Line Timing",
    body: "The gap between announcement and line reprice is the window. First-mover advantage exists in this window. After 20 minutes, assume the market has adjusted.",
  },
  {
    icon: "📊",
    title: "Market Depth",
    body: "Thin markets (alt props, specific books) restake slowest. Consensus books (DraftKings, FanDuel, BetMGM) move fastest. Shopping across depth matters.",
  },
] as const;

const TIMING_STEPS = [
  {
    window: "0–15 min after announcement",
    status: "Market is forming. Line is likely stale.",
    color: "text-emerald-300",
    barWidth: "w-1/4",
    barColor: "bg-emerald-500",
  },
  {
    window: "15–45 min",
    status: "Major books have adjusted. Props still catching up.",
    color: "text-yellow-300",
    barWidth: "w-2/3",
    barColor: "bg-yellow-500",
  },
  {
    window: "45+ min",
    status: "Line is priced in. Value window has closed.",
    color: "text-red-300",
    barWidth: "w-full",
    barColor: "bg-red-500",
  },
] as const;

const WATCHLIST_SIGNALS = [
  "Back-to-back fatigue elevation",
  "Late scratch (within 90 min of game)",
  "Load management (announced vs. game-time decisions)",
  "Return from injury (first game back, minutes restriction)",
  "Role change (lineup shake-up without injury)",
] as const;

const CROSS_LINKS = [
  { label: "Today's Board", href: "/today" },
  { label: "Fantasy", href: "/fantasy" },
  { label: "Picks", href: "/picks" },
  { label: "Market Gravity", href: "/market-gravity" },
  { label: "Rumor Radar", href: "/rumor-radar" },
  { label: "Methodology", href: "/methodology" },
] as const;

export default function RosterShockPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_70%_30%,rgba(0,229,255,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Roster Shock Index
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Lineup changes are the market&apos;s most exploitable moment.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              When a starter is ruled out 2 hours before tip, the market takes
              15–30 minutes to reprice. Galaxy&apos;s Roster Shock Index scores the
              impact before the line settles.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
              Model-supported analysis. No predicted outcome is certain.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/picks"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                View Today&apos;s Picks
              </Link>
              <Link
                href="/market-gravity"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-mineral px-5 py-3 text-sm font-bold text-gray-100 hover:border-ion-blue"
              >
                Market Gravity
              </Link>
            </div>
          </div>
        </section>

        {/* Five Impact Categories */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Impact Framework
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Five categories of roster shock
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                The model scores each of these dimensions independently, then
                combines them into a single Roster Shock Index score (0–100)
                per affected game.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {IMPACT_CATEGORIES.map((cat) => (
                <div
                  key={cat.title}
                  className="border border-mineral bg-carbon/60 p-6 hover:border-ion-blue/40 transition-colors"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded border border-mineral bg-gray-900 text-lg text-ion-blue">
                    {cat.icon}
                  </div>
                  <h3 className="text-base font-bold text-white">{cat.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{cat.body}</p>
                </div>
              ))}
              {/* Spacer card for odd count */}
              <div className="hidden border border-mineral/20 bg-carbon/20 p-6 lg:block" />
            </div>
          </div>
        </section>

        {/* Timing Guide */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Timing Guide
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                The reprice window
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
                After a roster announcement, the market moves in stages. The
                window is objective — not a claim about outcomes.
              </p>
            </div>
            <div className="flex flex-col gap-6">
              {TIMING_STEPS.map((step, idx) => (
                <div key={step.window} className="border border-mineral bg-carbon/60 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                        Step {idx + 1}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-white">
                        {step.window}
                      </h3>
                    </div>
                    <span className={`font-mono text-sm font-bold ${step.color}`}>
                      {step.status}
                    </span>
                  </div>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full ${step.barColor} ${step.barWidth}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Watchlist Section */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Signal Watchlist
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Types of roster signals to monitor
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
                Not all roster news is equal. These signal types carry the
                highest Roster Shock potential by historical line movement
                magnitude.
              </p>
            </div>
            <div className="border border-mineral bg-carbon/50">
              {WATCHLIST_SIGNALS.map((signal, idx) => (
                <div
                  key={signal}
                  className={`flex items-center gap-4 px-6 py-4 ${
                    idx < WATCHLIST_SIGNALS.length - 1 ? "border-b border-mineral" : ""
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ion-blue" />
                  <p className="text-sm leading-6 text-gray-200">{signal}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-600">
              Signal types are structural categories, not picks or position recommendations.
            </p>
          </div>
        </section>

        {/* Risk Disclosure */}
        <section className="border-t border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <RiskDisclosure variant="card" includePastPerformance />
          </div>
        </section>

        {/* Cross-links */}
        <section className="border-t border-mineral bg-gray-900/20 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Related surfaces
            </p>
            <div className="flex flex-wrap gap-3">
              {CROSS_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1 border border-mineral px-4 py-2 text-sm font-medium text-gray-300 hover:border-ion-blue hover:text-ion-blue transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
