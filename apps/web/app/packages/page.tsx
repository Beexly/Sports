import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LIVE_PACKAGE_CATALOG, WEEK8_SPECIALTY_PACK_TIERS } from "@/lib/packages/catalog";
import {
  formatWindowSlotLabel,
  getActiveUpcomingWriteups,
  getRedactedTeasersForWindowSlot,
  sanitizePlainFootballText,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

export const metadata: Metadata = {
  title: "NFL Betting Packs, Player Props, Parlays & DFS | Galaxy Sports Edge",
  description:
    "Plain-English NFL matchup breakdowns, official game picks, player props, correlated Same-Game Parlays, and DraftKings/FanDuel DFS lineups.",
};

export default function PackagesPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Clean Human Football Hero */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-block rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                GALAXY PICKS · WEEK 9 TNF (JAX @ BAL) &amp; FULL NFL SLATE
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Real football film, trench matchups, and disciplined numbers.
              </h1>
              <p className="mt-4 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                We break down every game the way coaches and real bettors watch football: offensive line protection, defensive blitz and coverage tendencies, active injuries, and how the game script actually plays out across all four quarters.
              </p>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300">
                When a spread or total is already steamed past its fair number, we pass and tell you why. Every pack below gives you our highest-conviction sides, totals, player props, Same-Game Parlays, and DraftKings/FanDuel lineups in plain English.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href="#pack-cards"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition-colors shadow-md"
              >
                View This Week&apos;s Packs ↓
              </a>
              <Link
                href="/fantasy/dfs"
                className="inline-flex items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 px-5 py-3 text-sm font-bold text-white hover:border-amber-400 transition-colors"
              >
                Open DFS Lineups →
              </Link>
            </div>
          </div>

          {/* Clean 4-Card Football & Record Strip */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-800 pt-6">
            <div className="rounded-xl border border-emerald-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                VERIFIED SEASON RECORD
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                62-23-1 · +26.50u
              </div>
              <div className="mt-1 text-xs text-slate-400">
                72.9% Win Rate · Entering Week 9 TNF (JAX @ BAL) &amp; Sunday/MNF Slate (Week 8 Settled).
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                PASS DISCIPLINE
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                Never Force a Side
              </div>
              <div className="mt-1 text-xs text-slate-400">
                If a line moves past our number, we pass and attack the props.
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                EVERY MARKET COVERED
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                Sides, Props &amp; SGPs
              </div>
              <div className="mt-1 text-xs text-slate-400">
                1Q/1H derivatives, rushing &amp; receiving props, defensive tackles/sacks &amp; TDs.
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-slate-950/90 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                DAILY FANTASY (DFS)
              </div>
              <div className="mt-1 text-2xl font-extrabold text-white">
                DK &amp; FanDuel Optimals
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Cash cores, Showdown Captain builds &amp; tournament stacks with injury pivots.
              </div>
            </div>
          </div>
        </div>

        {/* Free Matchup & Game-Environment Analytics Strip / Table (Week 9 TNF: JAX @ BAL) */}
        <section
          data-testid="packages-free-game-environment-analytics"
          className="mt-8 rounded-2xl border-2 border-amber-500/40 bg-slate-900/95 p-6 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="inline-block rounded bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                FREE GAME-SCRIPT INTELLIGENCE · WEEK 9 TNF (JAX @ BAL)
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-white">
                Free Matchup &amp; Game-Environment Analytics: Jacksonville Jaguars @ Baltimore Ravens
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Full offensive pace, play-call splits, and trench protection tendencies for Thursday Night Football. All 9 remaining top-confidence TNF plays (88/100), the 3-Leg SGP, and Showdown Captain lineups are locked inside the packs below.
              </p>
            </div>
            <span className="rounded-md bg-emerald-500/20 border border-emerald-400/50 px-3 py-1.5 text-xs font-extrabold text-emerald-300">
              Free Teaser: Mark Andrews OVER 2.5 Rec (88/100) · Spread PASS at -7.5
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <th className="py-2.5 pr-4">Matchup &amp; Game-Environment Metric</th>
                  <th className="py-2.5">Week 9 TNF (JAX @ BAL) Film &amp; Script Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    Projected Offensive Plays
                  </th>
                  <td className="py-3">
                    Baltimore <strong className="text-white">61.3</strong> median (<strong className="text-white">61.9</strong> mean; <strong className="text-white">57–66</strong> IQR across <strong className="text-white">11</strong> drives) vs Jacksonville <strong className="text-white">63.5</strong> plays
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    Baltimore Play-Call Split
                  </th>
                  <td className="py-3">
                    <strong className="text-white">25.5</strong> Rush Attempts (<strong className="text-white">18.6</strong> Derrick Henry) + <strong className="text-white">33.3</strong> Pass Attempts + <strong className="text-white">3.1</strong> Sacks Taken (<strong className="text-white">54%</strong> run in 1H -&gt; <strong className="text-white">62%</strong> pass trailing in 2H)
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    Jacksonville Play-Call Split
                  </th>
                  <td className="py-3">
                    <strong className="text-white">31.4</strong> Rush Attempts + <strong className="text-white">29.5</strong> Pass Attempts + <strong className="text-white">2.6</strong> Sacks (<strong className="text-white">26.2 sec/snap</strong> pace)
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    Projected Pass Completions
                  </th>
                  <td className="py-3">
                    Baltimore <strong className="text-white">18.0</strong> median (<strong className="text-white">18.1</strong> mean on <strong className="text-white">33.3</strong> attempts; <strong className="text-white">54.1%</strong> comp rate, <strong className="text-white">15–21</strong> IQR, <strong className="text-white">188.0</strong> pass yds) vs Jacksonville <strong className="text-white">19.2</strong> completions (on <strong className="text-white">29.3</strong> attempts; <strong className="text-white">65.8%</strong> comp rate, <strong className="text-white">218.0</strong> pass yds)
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    Trench &amp; Coverage Keys
                  </th>
                  <td className="py-3">
                    Baltimore <strong className="text-white">59.5%</strong> Two-High Safety Shell &amp; <strong className="text-white">78.0%</strong> Light Boxes (<strong className="text-white">&lt;=5</strong> in box) | Jacksonville <strong className="text-white">30.9%</strong> Blitz Rate (<strong className="text-white">34.8%</strong> on Play-Action) vs Baltimore <strong className="text-white">36.5%</strong> Clean-Pocket Rate.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

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

        {/* Specialty Pack Tiers (Defense/IDP, Anytime TD, Parlay/SGP, Kicking & 1Q/1H, Sun-Mon Expanded DFS) */}
        <section id="specialty-pack-cards" className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <span className="inline-block rounded-md bg-emerald-500/20 border border-emerald-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                WEEK 9 TNF (JAX @ BAL) &amp; SUNDAY–MONDAY EXPANDED SLATE
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
                Specialty Betting &amp; Expanded Week 9 DFS Packs
              </h2>
              <p className="mt-1 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Target a specific edge across the Week 9 slate: Defense &amp; IDP Tackles/Sacks, Goal-Line Anytime Touchdowns, Correlated Parlays &amp; SGPs, Kicking &amp; 1Q/1H Derivatives, or our Expanded Week 9 DFS Core (Showdown Captain + 2 Sunday Optimal Lineups + 14-Player Core Pool).
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {WEEK8_SPECIALTY_PACK_TIERS.map((pkg) => (
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
                Read how each matchup sets up in the trenches and secondary, then unlock a pack above to reveal our official spread call, over/under call, and player prop bets.
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
