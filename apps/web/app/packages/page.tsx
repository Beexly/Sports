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
  const activePackages = LIVE_PACKAGE_CATALOG.filter((pkg) => pkg.forSale !== false);
  const activeSpecialtyPacks = WEEK8_SPECIALTY_PACK_TIERS.filter((pkg) => pkg.forSale !== false);
  const upcomingSundayMondayWriteups = getActiveUpcomingWriteups()
    .filter((w) => w.windowSlot !== "TNF" && !/JAX\s*@\s*BAL|Jacksonville|Baltimore/i.test(w.matchup))
    .slice(0, 4);

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Clean Human Football Hero */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-block rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                GALAXY PICKS · WEEK 9 SUNDAY MAIN SLATE (DET @ GB, MIA @ BUF, IND @ MIN) &amp; MNF (TB @ KC)
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
                aria-label="View this week's Week 9 Sunday Main Slate and Monday Night Football packs"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition-colors shadow-md"
              >
                View This Week&apos;s Packs ↓
              </a>
              <Link
                href="/fantasy/dfs"
                aria-label="Open Daily Fantasy Sports optimal lineups and player pool"
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
                Verified 72.9% Win Rate · Entering Week 9 Sunday Main Slate &amp; Monday Night Football (Week 8 Settled).
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
                Cash cores, Sunday main-slate builds &amp; tournament stacks with injury pivots.
              </div>
            </div>
          </div>
        </div>

        {/* Free Matchup & Game-Environment Analytics Strip / Table (Week 9 Sunday Main Slate & MNF) */}
        <section
          data-testid="packages-free-game-environment-analytics"
          className="mt-8 rounded-2xl border-2 border-amber-500/40 bg-slate-900/95 p-6 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="inline-block rounded bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                FREE GAME-SCRIPT INTELLIGENCE · WEEK 9 SUNDAY MAIN SLATE &amp; MNF
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-white">
                Week 9 Sunday Main Slate (DET @ GB, MIA @ BUF, IND @ MIN) &amp; Monday Night Football (TB @ KC) Free Game-Environment Preview
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Film-room neutral pace, trench pressure rates, coverage shell tendencies, and red-zone play-calling splits across our featured Week 9 Sunday and Monday matchups. Official sides, totals, player props, and Same-Game Parlay legs stay locked inside the packs below.
              </p>
            </div>
            <span className="rounded-md bg-emerald-500/20 border border-emerald-400/50 px-3 py-1.5 text-xs font-extrabold text-emerald-300">
              Official Sides, Totals, Props &amp; SGPs Locked Below · 62-23-1 (+26.50u)
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <caption className="sr-only">
                Week 9 Sunday Main Slate (DET @ GB, MIA @ BUF, IND @ MIN) and Monday Night Football (TB @ KC) Free Game-Environment Preview covering neutral pace, trench pressure rates, and red-zone tendencies.
              </caption>
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <th scope="col" className="py-2.5 pr-4">Week 9 Matchup &amp; Window</th>
                  <th scope="col" className="py-2.5 pr-4">Projected Neutral Pace &amp; Play Volume</th>
                  <th scope="col" className="py-2.5 pr-4">Trench Pressure &amp; Pass-Protection Split</th>
                  <th scope="col" className="py-2.5">Coverage Shell &amp; Red-Zone Environment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    DET @ GB · Sun 3:25 PM CT (Lambeau)
                  </th>
                  <td className="py-3 pr-4">
                    <strong className="text-white">27.4 sec/snap</strong> neutral pace · Projected <strong className="text-white">63.0</strong> Detroit plays vs <strong className="text-white">61.5</strong> Green Bay plays on outdoor grass
                  </td>
                  <td className="py-3 pr-4">
                    Detroit interior OL <strong className="text-white">71.5%</strong> clean-pocket rate vs Green Bay <strong className="text-white">31.8%</strong> simulated-pressure and stunt rate
                  </td>
                  <td className="py-3">
                    Green Bay <strong className="text-white">58.0%</strong> two-high quarters/palms shell; Detroit <strong className="text-white">61.0%</strong> red-zone heavy-personnel rush &amp; play-action split
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    MIA @ BUF · Sun 12:00 PM CT (Highmark)
                  </th>
                  <td className="py-3 pr-4">
                    <strong className="text-white">26.6 sec/snap</strong> neutral pace · Miami <strong className="text-white">68.2%</strong> pre-snap motion rate to force coverage rotation before the snap
                  </td>
                  <td className="py-3 pr-4">
                    Miami quick-release timing (<strong className="text-white">2.34s</strong> time-to-throw) vs Buffalo four-man edge rush (<strong className="text-white">35.4%</strong> pressure rate without blitzing)
                  </td>
                  <td className="py-3">
                    Buffalo <strong className="text-white">61.5%</strong> two-high nickel shell; compressed red-zone spacing elevates inside-the-20 field-goal stall tendencies
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    IND @ MIN · SNF 7:20 PM CT (U.S. Bank)
                  </th>
                  <td className="py-3 pr-4">
                    <strong className="text-white">25.8 sec/snap</strong> fast indoor turf track · Projected <strong className="text-white">64.5</strong> combined scripts per side in climate-controlled dome
                  </td>
                  <td className="py-3 pr-4">
                    Minnesota <strong className="text-white">38.4%</strong> blitz &amp; zero-look drop-eight disguise rate vs Indianapolis six-man slide pass protection
                  </td>
                  <td className="py-3">
                    High-frequency pre-snap safety rotation forces hot-read intermediate throws and early-down RPO adjustments inside the 20
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-3 pr-4 font-bold text-white whitespace-nowrap">
                    TB @ KC · MNF 7:15 PM CT (Arrowhead)
                  </th>
                  <td className="py-3 pr-4">
                    <strong className="text-white">27.9 sec/snap</strong> methodical ball-control pace · Kansas City <strong className="text-white">69.0%</strong> third-down conversion &amp; drive sustain rate
                  </td>
                  <td className="py-3 pr-4">
                    Kansas City <strong className="text-white">34.2%</strong> third-down exotic corner/safety blitz rate vs Tampa Bay RB/TE hot-read checkdown outlets
                  </td>
                  <td className="py-3">
                    Kansas City <strong className="text-white">38.5%</strong> 12- and 13-personnel usage; heavy middle-of-field tight-end &amp; goal-line motion tendencies inside the 10
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
            {activePackages.map((pkg) => (
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
                WEEK 9 SUNDAY MAIN SLATE (DET @ GB, MIA @ BUF, IND @ MIN) &amp; MONDAY NIGHT FOOTBALL (TB @ KC)
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
                Specialty Betting &amp; Expanded Week 9 DFS Packs
              </h2>
              <p className="mt-1 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                Target a specific edge across the Week 9 Sunday and Monday slate: Defense &amp; IDP Tackles/Sacks, Goal-Line Anytime Touchdowns, Correlated Parlays &amp; SGPs, Kicking &amp; 1Q/1H Derivatives, or our Expanded Week 9 DFS Core (2 Sunday Optimal Lineups + 14-Player Core Pool + SNF/MNF Builds).
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {activeSpecialtyPacks.map((pkg) => (
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
            {upcomingSundayMondayWriteups.map((writeup) => {
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
                      aria-label={`Read matchup preview for ${writeup.matchup}`}
                      className="text-sm font-bold text-amber-300 hover:text-amber-200"
                    >
                      Read Matchup Preview →
                    </Link>
                    <a
                      href="#pack-cards"
                      aria-label={`Unlock official picks for ${writeup.matchup}`}
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
