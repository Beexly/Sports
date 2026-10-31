import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  formatWindowSlotLabel,
  getActiveUpcomingWriteups,
  getRedactedTeasersForWindowSlot,
  sanitizePlainFootballText,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

export const metadata: Metadata = {
  title: "Week 8 NFL Betting Packs (12 Sunday Games & MNF WAS @ KC) | Galaxy Sports Edge",
  description:
    "TNF official card 14-6 with 1 split (+7.19u). The 31-11 banner is retracted. Week 8 Sunday and MNF board is live.",
};

export default function PackagesPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* High-Contrast Verified Engine Dominance Hero */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-block rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                GALAXY PICKS · WEEK 8 SUNDAY MAIN SLATE (12 GAMES) &amp; MNF (WAS @ KC)
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                TNF card 14-6 with 1 split (+7.19u). The 31-11 banner is retracted. Week 8 Sunday and MNF board is live.
              </h1>
              <p className="mt-4 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Powered by the <strong className="text-amber-300 font-semibold">GSE 10-Layer Autonomous Engine</strong>: <strong className="text-white font-semibold">22,750,000 snap evaluations</strong> (13 games × 10k worlds × 175 snaps), <strong className="text-white font-semibold">581 360-degree markets evaluated</strong> (1Q–4Q, 1H/2H, Kicking B4 23,247-kick hierarchical model, IDP Sacks/Tackles, Touchdown Scorers, Skill &amp; QB Props), <strong className="text-white font-semibold">4,056 research corpus IDs</strong>, <strong className="text-white font-semibold">112 Instagram + 100 X deep-math dossiers</strong>, and <strong className="text-white font-semibold">50 doctoral papers</strong>.
              </p>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300">
                Validated by walk-forward <strong className="text-emerald-300 font-semibold">tau_hat (+11.16pp over WP-max on n=3,988 4th downs)</strong>, the <strong className="text-emerald-300 font-semibold">7-Signal Pack</strong> (PROE, Special Teams Hidden Yards, QB Pressure Escape, Situation-Neutral Pace, Penalty Discipline, WR/CB Archetype, Defensive Havoc), <strong className="text-emerald-300 font-semibold">Romano CQR honest conformal intervals</strong>, and <strong className="text-emerald-300 font-semibold">OpenAI Math live Optimal Transport certificates</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href="#pack-cards"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition-colors shadow-md"
              >
                Jump to Week 8 Packs ↓
              </a>
              <Link
                href="/fantasy/dfs"
                className="inline-flex items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 px-5 py-3 text-sm font-bold text-white hover:border-amber-400 transition-colors"
              >
                Open Week 8 DFS Portfolio →
              </Link>
            </div>
          </div>

          {/* Verified Record & Technical Architecture Scoreboard Strip */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-800 pt-6">
            <div className="rounded-xl border border-emerald-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                PRE-WEEK-8 NEW ENGINE
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                16-5, owner-attested
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Owner-attested. Not combined with the TNF card.
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                CUMULATIVE SEASON RECORD
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                14-6, 1 split, +7.19u
              </div>
              <div className="mt-1 text-xs text-slate-400">
                TNF official card. The 31-11 banner is retracted.
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                10-LAYER AUTONOMOUS ENGINE
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                22,750,000 Snaps · 581 Markets
              </div>
              <div className="mt-1 text-xs text-slate-400">
                13 Games × 10k Worlds × 175 Snaps · 1Q–4Q, 1H/2H, B4 Kicking, IDP
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                CORPUS &amp; CONFORMAL PROOF
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                4,056 IDs · +11.16pp tau_hat
              </div>
              <div className="mt-1 text-xs text-slate-400">
                112 IG + 100 X Dossiers · 50 Papers · Romano CQR &amp; Optimal Transport
              </div>
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
            {getActiveUpcomingWriteups().slice(0, 4).map((writeup) => {
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
