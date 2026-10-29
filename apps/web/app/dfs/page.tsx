import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatWindowSlotLabel,
  sanitizePlainFootballText,
} from "@/lib/writeups/coach-writeup-engine";

export const metadata: Metadata = {
  title: "DFS Lineup Optimizer & Stacks | Galaxy Sports Edge",
  description:
    "Plain-English NFL DFS environment breakdowns, cash cores, tournament stacks, and captain leverage writeups for Week 8.",
};

export default function DfsPage(): JSX.Element {
  const dfsPackage = LIVE_PACKAGE_CATALOG.find((p) => p.includesDfs) || LIVE_PACKAGE_CATALOG[0];

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-block rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                DAILY FANTASY FOOTBALL · WEEK 8 BLUEPRINT
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                DFS Optimizer, Cash Cores &amp; Tournament Stacks
              </h1>
              <p className="mt-4 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Football is never played on a spreadsheet. We break down every matchup from coaching play-calls, offensive line protection, and injury cascades to identify high-floor cash plays and tournament leverage.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/packages"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-lg transition-colors"
              >
                Unlock Week 8 DFS Slate Pack →
              </Link>
            </div>
          </div>
        </div>

        {/* Methodology & Football Breakdown */}
        <section className="mt-10 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              How We Build Winning DFS Rosters
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-200">
              Coaching schemes first, volume concentration second, salary leverage last.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                01 · SCHEME &amp; TRENCH LEVERAGE
              </span>
              <h3 className="mt-2 text-lg font-bold text-white">
                Coaching Tendencies &amp; Protection
              </h3>
              <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                We study defensive coverage rotation, pressure-to-sack rates, and offensive line mismatches to forecast game scripts before public ownership forms.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                02 · TEMPO &amp; INJURY CONCENTRATION
              </span>
              <h3 className="mt-2 text-lg font-bold text-white">
                Pace &amp; First-Read Target Share
              </h3>
              <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                When key players are ruled out, target trees condense dramatically. We measure exact opportunity redistribution for backup runners and slot receivers.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                03 · CORRELATED TOURNAMENT STACKS
              </span>
              <h3 className="mt-2 text-lg font-bold text-white">
                High-Ceiling GPP Stacks &amp; Pivots
              </h3>
              <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Pairing a quarterback with his primary receiver and an opposing bring-back creates correlated upside that wins large-field tournaments.
              </p>
            </div>
          </div>
        </section>

        {/* Game-by-Game DFS Blueprints */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Week 8 Game-by-Game DFS Blueprints
              </h2>
              <p className="mt-1 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Captain leverage, high-floor cash cores, and tournament stacks for every game on the slate.
              </p>
            </div>
            <Link
              href="/packages"
              className="inline-flex items-center rounded-lg border-2 border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:border-amber-400 transition-colors"
            >
              Unlock All DFS Lineups in Packages →
            </Link>
          </div>

          <div className="space-y-6">
            {LIVE_SLATE_COACH_WRITEUPS.slice(0, 4).map((writeup) => (
              <div
                key={writeup.id}
                className="rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold uppercase text-amber-300">
                      {formatWindowSlotLabel(writeup.windowSlot, writeup.matchup)}
                    </span>
                    <h3 className="mt-2 text-2xl font-bold text-white">{writeup.matchup}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-3 py-1 rounded-md text-xs sm:text-sm">
                      PLAY: DFS CORE READY
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Game Environment &amp; Pace
                    </h4>
                    <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                      {sanitizePlainFootballText(writeup.paceOfPlay.notes)}
                    </p>
                    <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                      {sanitizePlainFootballText(writeup.schemeMatchup.coverageShell)}
                    </p>
                  </div>

                  {writeup.dfsStacks && (
                    <div className="space-y-4">
                      {/* Captain & Leverage */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Showdown Captain / Top Target
                        </span>
                        {writeup.dfsStacks.captainPicks.slice(0, 2).map((c, i) => (
                          <div key={i} className="mt-2 flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-white text-base">
                                {c.player} ({c.position})
                              </div>
                              <p className="text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                                {sanitizePlainFootballText(c.leverageNote)}
                              </p>
                            </div>
                            <span className="font-mono text-base sm:text-lg font-bold text-white tabular-nums whitespace-nowrap">
                              ${c.salary ? c.salary.toLocaleString() : "9,500"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Cash Core */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          High-Floor Cash Core
                        </span>
                        {writeup.dfsStacks.cashCore.slice(0, 2).map((c, i) => (
                          <div key={i} className="mt-2 flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-white text-base">
                                {c.player} ({c.position})
                              </div>
                              <p className="text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                                {sanitizePlainFootballText(c.floorNote)}
                              </p>
                            </div>
                            <span className="font-mono text-base sm:text-lg font-bold text-white tabular-nums whitespace-nowrap">
                              ${c.salary ? c.salary.toLocaleString() : "6,200"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/games/${writeup.gameId}`}
                    className="text-sm font-bold text-amber-300 hover:text-amber-200"
                  >
                    Read Matchup Storyline &amp; Preview →
                  </Link>
                  <Link
                    href="/packages"
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    🔒 Official Spread, Total &amp; Prop Picks Locked in Pack →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Access CTA */}
        {dfsPackage && (
          <div className="mt-12 rounded-2xl border-2 border-emerald-500/60 bg-slate-900 p-6 sm:p-10 text-center shadow-2xl">
            <span className="inline-block rounded-md bg-emerald-500/20 border border-emerald-400/50 px-3 py-1 text-xs font-bold uppercase text-emerald-300">
              WEEK 8 DFS ALL-ACCESS
            </span>
            <h3 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
              Unlock Ready-to-Play Cash &amp; GPP Lineups
            </h3>
            <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6] max-w-2xl mx-auto">
              Get our complete player pool projections, correlated stacks, and instant lineup builds for every Week 8 contest.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                href="/packages"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-8 py-3.5 text-base font-bold text-slate-950 shadow-lg transition-colors"
              >
                Get Week 8 DFS Lineups Now →
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
