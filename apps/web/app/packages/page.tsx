import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  getRedactedTeasersForWindowSlot,
} from "@/lib/writeups/coach-writeup-engine";
import {
  PaywallRevealCard,
  sanitizePlainFootballText,
} from "@/components/packages/paywall-reveal-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NFL Betting Packs | Galaxy Sports Edge",
  description:
    "Plain-English NFL Picks, Player Props & Parlays — Written so you know exactly what to bet and why in 30 seconds.",
};

export default function PackagesPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* High-Contrast Simple Hero */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-block rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                GALAXY PICKS · PAY-PER-SLATE STOREFRONT
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Plain-English NFL Picks, Player Props &amp; Parlays — Written so you know exactly what to bet and why in 30 seconds.
              </h1>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-100">
                No monthly subscription required and zero confusing math jargon. We break down every NFL game snap-by-snap to find where the Vegas line is off — then explain in plain English{" "}
                <strong className="text-amber-300 font-semibold">what to bet and why</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/fantasy/dfs"
                className="inline-flex items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 px-5 py-3 text-sm font-bold text-white hover:border-amber-400 transition-colors"
              >
                Open DFS Lineup Optimizer →
              </Link>
            </div>
          </div>
        </div>

        {/* Free Plain-English Game Previews */}
        <section id="slate-dossiers" className="mt-10 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Free Football Matchup Previews: Why We Like These Games
              </h2>
              <p className="mt-1 text-sm md:text-base text-slate-200">
                Read our plain-English game breakdown below, then unlock a pack to see the exact team and number to bet.
              </p>
            </div>
            <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300">
              Plain-English Football Breakdowns
            </span>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LIVE_SLATE_COACH_WRITEUPS.slice(0, 4).map((writeup) => (
              <div
                key={writeup.id}
                className="flex flex-col justify-between rounded-xl border-2 border-slate-700/80 bg-slate-950 p-5 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold uppercase text-amber-300">
                      {writeup.windowSlot === "TNF" ? "TONIGHT · TNF" : "SUNDAY SLATE"}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {writeup.topProps.length} Player Props Ready
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white">{writeup.matchup}</h3>
                  <p className="mt-2 text-sm md:text-base leading-relaxed text-slate-100">
                    {sanitizePlainFootballText(writeup.schemeMatchup.coverageShell)}
                  </p>
                  <p className="mt-2 text-sm md:text-base leading-relaxed text-slate-100">
                    {sanitizePlainFootballText(writeup.paceOfPlay.notes)}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-800 pt-3 flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">
                    Spread Rating: {writeup.sideTotalCall.sideConfidence}
                  </span>
                  <span className="text-amber-300">
                    Total Rating: {writeup.sideTotalCall.totalConfidence}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Wide, High-Contrast 2-Column Pack Cards */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Choose Your Betting Pack
              </h2>
              <p className="mt-1 text-base text-slate-200">
                One-time purchase. Your picks unlock immediately right inside the card below.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {LIVE_PACKAGE_CATALOG.map((pkg) => (
              <div key={pkg.slug} id={pkg.slug}>
                <PaywallRevealCard
                  pkg={pkg}
                  teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
                />
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
