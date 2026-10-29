import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SignalDecode } from "@/components/motion/signal-decode";
import { GalaxyCursor } from "@/components/ui/galaxy-cursor";
import { FieldCinematicIntro } from "@/components/landing/field-cinematic-intro";
import { FieldHeroCanvas } from "@/components/landing/field-hero-canvas";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
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
  title: { absolute: "Galaxy Sports Edge" },
  description:
    "Plain-English NFL Picks, Player Props & Parlays — Written so you know exactly what to bet and why in 30 seconds.",
  alternates: { canonical: "/" },
};

export default async function HomePage(): Promise<JSX.Element> {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      <FieldCinematicIntro />
      <Nav />
      <main id="main-content">
        {/* HERO */}
        <section
          className="relative isolate overflow-hidden border-b border-mineral"
          style={{ background: "#08090C", minHeight: "min(82vh, 720px)" }}
        >
          <FieldHeroCanvas />
          <div
            aria-hidden="true"
            className="grain-overlay absolute inset-0 -z-10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 55% 40% at 70% 18%, rgba(255,77,46,0.09), transparent 58%), linear-gradient(180deg, #08090Cdd 0%, #08090C88 42%, #08090C 100%)",
            }}
          />
          <div className="relative mx-auto flex min-h-[inherit] max-w-5xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-2.5 border border-mineral bg-eclipse/70 px-3.5 py-1.5 text-xs uppercase tracking-wider text-ion-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-plasma"
                  style={{ animation: "pp-live-pulse 2s ease-in-out infinite" }}
                />
                Live now · GALAXY PICKS &amp; DFS
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1
                className="max-w-5xl font-display font-semibold leading-[0.9] tracking-tight text-ion-white"
                style={{ fontSize: "clamp(3.5rem, 10vw, 7.5rem)" }}
              >
                The market is full of <span className="text-plasma">noise</span>.
                <br />
                We find the <span className="text-plasma">signal</span>.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-2xl text-lg sm:text-[19px] leading-relaxed text-[#F3EFE6]">
                Plain-English NFL Picks, Player Props &amp; Parlays — Written so you know
                exactly what to bet and why in 30 seconds.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                <Link href="/packages" className="btn-primary min-h-12 px-7 py-3 text-base font-bold">
                  GALAXY PICKS (PAID) — Unlock TNF &amp; Week 8
                </Link>
                <Link href="/fantasy/dfs" className="btn-secondary min-h-12 px-7 py-3 text-base font-bold">
                  DFS Optimizer &amp; Stacks
                </Link>
                <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center border border-mineral px-7 py-3 text-base font-semibold text-ion-1 hover:text-white">
                  See pricing
                </Link>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-8 font-mono text-xs uppercase tracking-[0.24em] text-ion-2">
                <SignalDecode speed={28}>We detect. You decide.</SignalDecode>
              </p>
            </Reveal>
          </div>
        </section>

        {/* GALAXY PICKS & DFS STOREFRONT SECTION */}
        <section
          id="revenue-pillars"
          data-testid="five-pillar-revenue-section"
          className="border-b border-mineral bg-eclipse/40 px-4 py-12 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mineral pb-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-plasma font-semibold">
                    Galaxy Picks (Pay-Per-Slate Packs) · DFS Optimizer
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
                    Plain-English NFL Picks, Player Props &amp; Parlays
                  </h2>
                </div>
                <Link
                  href="/packages"
                  className="btn-primary min-h-10 px-5 py-2 text-sm font-semibold whitespace-nowrap"
                >
                  Explore Slate Packages →
                </Link>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Link
                href="/packages"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma font-bold">01</span>
                    <span className="border border-mineral px-2 py-0.5 text-[10px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      GALAXY PICKS
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    GALAXY PICKS (PAID)
                  </h3>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#F3EFE6]">
                    Our highest-confidence spread and total bets with plain-English explanations and verified receipts.
                  </p>
                </div>
                <span className="mt-4 font-mono text-xs text-ion-2 group-hover:text-ion-white">
                  Open Galaxy Picks →
                </span>
              </Link>

              <Link
                href="/packages#slate-dossiers"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma font-bold">02</span>
                    <span className="border border-mineral px-2 py-0.5 text-[10px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      SLATE DOSSIERS
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Week 8 Game Dossiers
                  </h3>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#F3EFE6]">
                    Simple, clear game-by-game breakdowns showing why each matchup favors our side, total, and player props.
                  </p>
                </div>
                <span className="mt-4 font-mono text-xs text-ion-2 group-hover:text-ion-white">
                  Open Game Dossiers →
                </span>
              </Link>

              <Link
                href="/packages"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma font-bold">03</span>
                    <span className="border border-mineral px-2 py-0.5 text-[10px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      SAME-GAME PARLAYS
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Correlated SGP Packs
                  </h3>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#F3EFE6]">
                    3-leg Same-Game Parlays built from plays that naturally help each other hit in the same game script.
                  </p>
                </div>
                <span className="mt-4 font-mono text-xs text-ion-2 group-hover:text-ion-white">
                  Open SGP Packs →
                </span>
              </Link>

              <Link
                href="/fantasy/dfs"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma font-bold">04</span>
                    <span className="border border-mineral px-2 py-0.5 text-[10px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      DAILY FANTASY
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    DFS Writeups &amp; Lineups
                  </h3>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#F3EFE6]">
                    Plain-English game environment writeups and ready-to-play cash and tournament DFS lineups.
                  </p>
                </div>
                <span className="mt-4 font-mono text-xs text-ion-2 group-hover:text-ion-white">
                  Open DFS Writeup →
                </span>
              </Link>

              <Link
                href="/packages"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma font-bold">05</span>
                    <span className="border border-mineral px-2 py-0.5 text-[10px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      STOREFRONT
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Instant Packages
                  </h3>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#F3EFE6]">
                    Buy individual slates with no subscription required and unlock every pick immediately on your screen.
                  </p>
                </div>
                <span className="mt-4 font-mono text-xs text-ion-2 group-hover:text-ion-white">
                  Open Packages →
                </span>
              </Link>
            </div>

            {/* FREE GAME DOSSIER BREAKDOWNS WITH HIGH-CONTRAST ACTION BADGES */}
            <div id="slate-dossiers" className="mt-12 border-t border-mineral pt-10">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-plasma font-semibold">
                    Live Football Intelligence · Week 8
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
                    Coaching Matchups &amp; Free Game Dossiers
                  </h3>
                  <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                    Every game is broken down from coaching tendencies, trench matchups, and active injuries. Read our plain-English football analysis below.
                  </p>
                </div>
                <Link
                  href="/packages"
                  className="inline-flex items-center border border-mineral bg-carbon px-4 py-2 text-sm font-semibold text-ion-1 hover:border-plasma hover:text-white"
                >
                  View All Packages →
                </Link>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {LIVE_SLATE_COACH_WRITEUPS.slice(0, 2).map((w) => {
                  const sidePlay = w.sideTotalCall.sideDecision === "PLAY";
                  const totalPlay = w.sideTotalCall.totalDecision === "PLAY";
                  return (
                    <div
                      key={w.id}
                      className="flex flex-col justify-between border-2 border-slate-800 bg-slate-900/90 p-6 rounded-xl shadow-lg"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold uppercase text-amber-300">
                            {w.windowSlot}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-300">
                            Kickoff: {new Date(w.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <h4 className="mt-3 text-xl font-bold text-white">{w.matchup}</h4>

                        {/* Dossier Body Copy */}
                        <div className="mt-3 space-y-2">
                          <p className="text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                            {sanitizePlainFootballText(w.schemeMatchup.coverageShell)}
                          </p>
                          <p className="text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                            {sanitizePlainFootballText(w.paceOfPlay.notes)}
                          </p>
                        </div>

                        {/* Action Badges & Tabular Numerals */}
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 border-t border-slate-800 pt-4">
                          <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                SPREAD CALL
                              </span>
                              {sidePlay ? (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-2 py-0.5 rounded text-xs">
                                  PLAY
                                </span>
                              ) : (
                                <span className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold tracking-wide px-2 py-0.5 rounded text-xs">
                                  PASS — NO BET
                                </span>
                              )}
                            </div>
                            <div className="mt-2 font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                              {sidePlay ? w.sideTotalCall.sideSelection : "No Edge — Market Fair"}
                            </div>
                            <div className="mt-1 text-xs text-slate-300 font-mono">
                              Rating: <span className="font-mono text-base font-bold text-white tabular-nums">{w.sideTotalCall.sideConfidence}</span>
                            </div>
                          </div>

                          <div className="rounded-lg bg-slate-950 p-3.5 border border-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                TOTAL CALL
                              </span>
                              {totalPlay ? (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold tracking-wide shadow-sm px-2 py-0.5 rounded text-xs">
                                  PLAY
                                </span>
                              ) : (
                                <span className="bg-amber-500/20 text-amber-200 border border-amber-400/50 font-semibold tracking-wide px-2 py-0.5 rounded text-xs">
                                  PASS — NO BET
                                </span>
                              )}
                            </div>
                            <div className="mt-2 font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                              {totalPlay ? w.sideTotalCall.totalSelection : "No Edge — Market Fair"}
                            </div>
                            <div className="mt-1 text-xs text-slate-300 font-mono">
                              Rating: <span className="font-mono text-base font-bold text-white tabular-nums">{w.sideTotalCall.totalConfidence}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-800 pt-3 flex items-center justify-between">
                        <Link
                          href={`/games/${w.gameId}`}
                          className="text-sm font-bold text-amber-300 hover:text-amber-200"
                        >
                          View Full Game Dossier →
                        </Link>
                        <span className="text-xs font-semibold text-slate-300">
                          {w.topProps.length} Player Props Analyzed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* A-LA-CARTE SLATE PACKAGES & INSTANT CHECKOUT BRICKS ON HOMEPAGE */}
            <div className="mt-12 border-t border-mineral pt-10" data-testid="homepage-wagertalk-storefront">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-plasma font-semibold">
                    Galaxy Picks · Pay-Per-Slate Packs
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
                    Pick Your Slate. See Why We Like the Bet. Unlock Instantly.
                  </h3>
                  <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
                    Read our free game preview on every card below. When you unlock a pack, your official spread bet, total bet, player props, and Same-Game Parlay appear right on this screen.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/packages"
                    className="inline-flex items-center border border-mineral bg-carbon px-4 py-2 text-xs font-mono text-ion-1 hover:border-plasma hover:text-ion-white"
                  >
                    View All {LIVE_PACKAGE_CATALOG.length} Slate Packs →
                  </Link>
                </div>
              </div>

              {/* Galaxy Picks paywall cards */}
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {LIVE_PACKAGE_CATALOG.map((pkg) => (
                  <PaywallRevealCard
                    key={pkg.slug}
                    pkg={pkg}
                    teasers={getRedactedTeasersForWindowSlot(pkg.windowSlot)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          data-testid="homepage-responsible-close"
          className="gw-nebula px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl border border-mineral bg-eclipse p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-ion-white">
              The math can point. The decision stays yours.
            </h2>
            <p className="mt-3 text-base sm:text-[17px] leading-relaxed text-[#F3EFE6]">
              This product is research, not certainty. We get better by adding settled
              rows and clearer uncertainty, not by making louder claims.
            </p>
            <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ion-1" />
          </div>
        </section>
      </main>
      <GalaxyCursor />
      <Footer />
    </div>
  );
}
