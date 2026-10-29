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
import { getRedactedTeasersForWindowSlot } from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";

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
              <p className="mb-6 inline-flex items-center gap-2.5 border border-mineral bg-eclipse/70 px-3.5 py-1.5 text-[11px] uppercase tracking-wider text-ion-2">
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
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ion-1">
                Plain-English NFL Picks, Player Props &amp; Parlays — Written so you know
                exactly what to bet and why in 30 seconds.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                <Link href="/packages" className="btn-primary min-h-12 px-7 py-3 text-base">
                  GALAXY PICKS (PAID) — Unlock TNF &amp; Week 8
                </Link>
                <Link href="/fantasy/dfs" className="btn-secondary min-h-12 px-7 py-3 text-base">
                  DFS Optimizer &amp; Stacks
                </Link>
                <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center border border-mineral px-7 py-3 text-base font-semibold text-ion-1">
                  See pricing
                </Link>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-ion-2">
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
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
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
                    <span className="text-plasma">01</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      GALAXY PICKS
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    GALAXY PICKS (PAID)
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    Our highest-confidence spread and total bets with plain-English explanations and verified receipts.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open Galaxy Picks →
                </span>
              </Link>

              <Link
                href="/packages#slate-dossiers"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">02</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      SLATE DOSSIERS
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Week 8 Game Dossiers
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    Simple, clear game-by-game breakdowns showing why each matchup favors our side, total, and player props.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open Game Dossiers →
                </span>
              </Link>

              <Link
                href="/packages"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">03</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      SAME-GAME PARLAYS
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Correlated SGP Packs
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    3-leg Same-Game Parlays built from plays that naturally help each other hit in the same game script.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open SGP Packs →
                </span>
              </Link>

              <Link
                href="/fantasy/dfs"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">04</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      DAILY FANTASY
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    DFS Writeups &amp; Lineups
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    Plain-English game environment writeups and ready-to-play cash and tournament DFS lineups.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open DFS Writeup →
                </span>
              </Link>

              <Link
                href="/packages"
                className="group flex flex-col justify-between border border-mineral bg-carbon p-5 transition-colors hover:border-plasma"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-plasma">05</span>
                    <span className="border border-mineral px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ion-2 group-hover:border-plasma/40 group-hover:text-plasma">
                      STOREFRONT
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ion-white group-hover:text-plasma transition-colors">
                    Instant Packages
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-ion-1">
                    Buy individual slates with no subscription required and unlock every pick immediately on your screen.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[11px] text-ion-2 group-hover:text-ion-white">
                  Open Packages →
                </span>
              </Link>
            </div>

            {/* A-LA-CARTE SLATE PACKAGES & INSTANT CHECKOUT BRICKS ON HOMEPAGE */}
            <div className="mt-12 border-t border-mineral pt-10" data-testid="homepage-wagertalk-storefront">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
                    Galaxy Picks · Pay-Per-Slate Packs
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-ion-white">
                    Pick Your Slate. See Why We Like the Bet. Unlock Instantly.
                  </h3>
                  <p className="mt-1 text-sm text-ion-1">
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
          <div className="mx-auto max-w-5xl border border-mineral bg-eclipse p-5 sm:p-7">
            <h2 className="text-2xl font-semibold text-ion-white">
              The math can point. The decision stays yours.
            </h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
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
