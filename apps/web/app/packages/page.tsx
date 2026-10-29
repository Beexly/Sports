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
              <p className="mt-4 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                No monthly subscription required and zero confusing math jargon. We break down every NFL game play-by-play to find where the Vegas line is off — then explain in plain English{" "}
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
              <p className="mt-1 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Read our plain-English game breakdown below, then unlock a pack to see the exact team and number to bet.
              </p>
            </div>
            <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300">
              Plain-English Football Breakdowns
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {LIVE_SLATE_COACH_WRITEUPS.slice(0, 4).map((writeup) => {
              const sidePlay = writeup.sideTotalCall.sideDecision === "PLAY";
              const totalPlay = writeup.sideTotalCall.totalDecision === "PLAY";

              return (
                <div
                  key={writeup.id}
                  className="flex flex-col justify-between rounded-xl border-2 border-slate-700/80 bg-slate-950 p-6 shadow-md"
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

                    <h3 className="mt-3 text-xl font-bold text-white">{writeup.matchup}</h3>

                    {/* Dossier Body Copy */}
                    <div className="mt-3 space-y-2">
                      <p className="text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                        {sanitizePlainFootballText(writeup.schemeMatchup.coverageShell)}
                      </p>
                      <p className="text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                        {sanitizePlainFootballText(writeup.paceOfPlay.notes)}
                      </p>
                    </div>

                    {/* High-Contrast Action Badges & Tabular Numerals */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 border-t border-slate-800 pt-4">
                      <div className="rounded-lg bg-slate-900 p-3.5 border border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            SPREAD CALL
                          </span>
                          {sidePlay ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-2.5 py-0.5 rounded text-xs">
                              PLAY
                            </span>
                          ) : (
                            <span className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold tracking-wide px-2.5 py-0.5 rounded text-xs">
                              PASS — NO BET
                            </span>
                          )}
                        </div>
                        <div className="mt-2 font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                          {sidePlay ? writeup.sideTotalCall.sideSelection : "No Edge — Market Fair"}
                        </div>
                        <div className="mt-1 text-xs text-slate-300 font-mono">
                          Confidence: <span className="font-mono text-base font-bold text-white tabular-nums">{writeup.sideTotalCall.sideConfidence}</span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-3.5 border border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            TOTAL CALL
                          </span>
                          {totalPlay ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-2.5 py-0.5 rounded text-xs">
                              PLAY
                            </span>
                          ) : (
                            <span className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold tracking-wide px-2.5 py-0.5 rounded text-xs">
                              PASS — NO BET
                            </span>
                          )}
                        </div>
                        <div className="mt-2 font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                          {totalPlay ? writeup.sideTotalCall.totalSelection : "No Edge — Market Fair"}
                        </div>
                        <div className="mt-1 text-xs text-slate-300 font-mono">
                          Confidence: <span className="font-mono text-base font-bold text-white tabular-nums">{writeup.sideTotalCall.totalConfidence}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-800 pt-3 flex items-center justify-between">
                    <Link
                      href={`/games/${writeup.gameId}`}
                      className="text-sm font-bold text-amber-300 hover:text-amber-200"
                    >
                      Read Full Game Dossier →
                    </Link>
                    <span className="text-xs font-semibold text-slate-300">
                      Kickoff: {new Date(writeup.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Wide, High-Contrast 2-Column Pack Cards */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Choose Your Betting Pack
              </h2>
              <p className="mt-1 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
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
