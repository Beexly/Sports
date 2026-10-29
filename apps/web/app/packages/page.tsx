import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatWindowSlotLabel,
  getRedactedTeasersForWindowSlot,
  sanitizePlainFootballText,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

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
                No monthly subscription and zero confusing math jargon. We study every offensive and defensive line matchup, injury report, and coaching tendency across the slate — then unlock our{" "}
                <strong className="text-amber-300 font-semibold">official spread calls, over/under calls, player props, and parlays</strong>{" "}
                right on this page.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href="#pack-cards"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition-colors shadow-md"
              >
                Jump to Betting Packs ↓
              </a>
              <Link
                href="/fantasy/dfs"
                className="inline-flex items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 px-5 py-3 text-sm font-bold text-white hover:border-amber-400 transition-colors"
              >
                Open DFS Lineup Optimizer →
              </Link>
            </div>
          </div>
        </div>

        {/* Wide, High-Contrast 2-Column Pack Cards */}
        <section id="pack-cards" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Choose Your Football Pack
              </h2>
              <p className="mt-1 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                One-time purchase. Your official picks, player props, and parlays unlock immediately right inside the card below.
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

        {/* Free Football Matchup Storylines (Teaser Only — Zero Free Picks or Confidence Numbers) */}
        <section id="slate-dossiers" className="mt-12 rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Free Football Matchup Previews &amp; Storylines
              </h2>
              <p className="mt-1 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Read how each matchup sets up in the trenches and secondary — then unlock a pack above to reveal our official spread call, over/under call, and player prop bets.
              </p>
            </div>
            <span className="rounded-md bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300">
              Official Picks Locked in Packs Above
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {LIVE_SLATE_COACH_WRITEUPS.slice(0, 4).map((writeup) => {
              const slotLabel = formatWindowSlotLabel(writeup.windowSlot, writeup.matchup);

              return (
                <div
                  key={writeup.id}
                  className="flex flex-col justify-between rounded-xl border-2 border-slate-700/80 bg-slate-950 p-6 shadow-md"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold uppercase text-amber-300">
                        {slotLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {writeup.topProps.length} Player Prop Reads Locked
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-bold text-white">{writeup.matchup}</h3>

                    {/* Storyline & Tempo Preview Copy (Zero Leaked Picks) */}
                    <div className="mt-3 space-y-2">
                      <p className="text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                        {sanitizePlainFootballText(writeup.schemeMatchup.coverageShell)}
                      </p>
                      <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                        {sanitizePlainFootballText(writeup.paceOfPlay.notes)}
                      </p>
                    </div>

                    {/* Locked Official Pick Badges — Teases That Picks Exist Without Revealing Side, Total, or Confidence */}
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 border-t border-slate-800 pt-4">
                      <div className="rounded-lg bg-slate-900 p-3.5 border border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            OFFICIAL SPREAD CALL
                          </span>
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold tracking-wide px-2.5 py-0.5 rounded text-xs">
                            🔒 LOCKED
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          Side Verdict &amp; Rating Inside Pack
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Unlock above to reveal exact side or pass call
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-3.5 border border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            OFFICIAL TOTAL CALL
                          </span>
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold tracking-wide px-2.5 py-0.5 rounded text-xs">
                            🔒 LOCKED
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white">
                          Over/Under Verdict Inside Pack
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Includes {writeup.topProps.length} player props &amp; parlay ticket
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-800 pt-3 flex items-center justify-between">
                    <Link
                      href={`/games/${writeup.gameId}`}
                      className="text-sm font-bold text-amber-300 hover:text-amber-200"
                    >
                      Read Matchup Preview →
                    </Link>
                    <a
                      href="#pack-cards"
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                    >
                      Unlock Official Picks ↑
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
